# Razorpay checkout

This release adds Standard Checkout for one-time INR course purchases. It does not activate live payments. Existing demo orders remain separate and cannot grant access.

## Payment flow

1. Signed-in student selects Checkout. Backend snapshots the published course fee and discount in integer paise. A request UUID and per-buyer/course lock prevent duplicate order creation on retry. Unexpired pending orders are reused.
2. Backend creates/retrieves the Razorpay order using the local UUID as receipt. Only the public key and checkout configuration are returned to the browser. Secrets stay in Secrets Manager.
3. Razorpay hosts payment entry. Dismissal and failed attempts leave the local order pending; neither means payment was captured.
4. Backend checks the checkout HMAC using the persisted provider order ID, then fetches the payment from Razorpay and checks order, amount, INR currency and captured status.
5. Capture and enrollment update in the same database transaction. Replays and concurrent callbacks cannot create duplicate grants. Authorization alone grants no access.
6. Signed webhook bodies are durably recorded before acknowledgement. A worker drains the inbox and reconciles pending orders every two minutes, including abandoned browser callbacks and late captures. It uses bounded batches, row locks and retry backoff.
7. Partial refunds retain access. A full refund drops only the registration originally granted by that order; manual/pre-existing access is preserved. Refunds are initiated in Razorpay Dashboard, not this release's admin UI.

The student UI provides a labelled test checkout, verified success, pending-payment guidance, manual status checks and order receipts. Admin → Fees & payment links manages prices, creates buyer-specific links, and shows provider IDs, payment mode and status. Native clients open the authenticated web checkout in the system browser; an embedded native Razorpay SDK is not bundled.

## Configuration and deployment

- Install PyYAML in the local deployment Python environment; it is not a Lambda runtime dependency.
- Run `scripts/configure_razorpay.py --qa-email <authorized-email>` after configuring matching test API credentials with `razorpay configure`. This script supports test keys only and never prints a key or webhook secret. Retain its existing webhook secret on reruns.
- Import the already-created Secrets Manager secret `pilearn/razorpay` into Terraform's `aws_secretsmanager_secret.razorpay` before apply. No secret value is stored in Terraform.
- Apply additive migration `022_razorpay.sql` before the learning Lambda/frontend release. Deploy the learning Lambda and the courses Lambda (legacy paid registration now returns HTTP 402).
- Terraform supplies the secret ARN, webhook route and reconciliation schedule. Enable `razorpay_enabled` only after credentials validate. Default false preserves the existing environment until activation.
- Test buyer emails are explicitly allowlisted in the secret. Ordinary students cannot buy test orders. There is no wildcard email allowlist.
- Do not change domain routing or activate `learn.ai4impact.in` as part of this release.

### Razorpay Dashboard action

The CLI does not provide webhook-management commands. In **Test Mode → Developers → Webhooks**, add:

- URL: `https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com/webhooks/razorpay`
- Secret: the `webhook_secret` stored in `pilearn/razorpay` (enter locally; never paste into chat).
- Events: `payment.captured`, `order.paid`, `refund.processed`.
- Alert email: a business owner-monitored email, supplied by the owner.

Keep Razorpay automatic capture enabled. If a payment remains authorized, the app deliberately remains pending. Test dashboard-delivered webhooks after activation; simulated signed requests alone do not prove dashboard delivery.

## Validation

- Real PostgreSQL regressions cover concurrent verification, immutable quote retry, amount/currency mismatch, authorization/failed status, buyer authorization, signature rejection, test allowlist, webhook raw-body/replay and refund monotonicity/manual grants.
- Browser regressions cover successful capture, authorization still pending, modal dismissal and provider failure. Synthetic tokens and mocked APIs do not reach real payment services.
- Before production: complete a real test-mode checkout, close-before-callback recovery, Razorpay-delivered webhook and refund tests. Check records in admin and access in My learning.
- Live activation additionally needs live keys, approved course fees/tax treatment, business support details, refund/terms URLs and invoice/GST requirements. Receipts here are explicitly not GST tax invoices.

## Test rollout status (6 November 2026)

The corrected test credentials authenticate successfully. Migration 022 is applied, the learning/courses functions are updated, and the webhook route, reconciliation schedule, secret permissions and backlog alarm are provisioned. Test checkout remains explicitly restricted to the allowlisted owner/QA accounts; live keys are not configured.

Actual Standard Checkout was exercised with an official Razorpay test card and its mock bank page: failure left the order pending and access denied (403); the successful retry produced a captured payment, verified enrollment and a course in My learning. Duplicate verification, another user's access (404), unallowlisted test checkout (403), invalid signatures (400), paid-registration bypass (402), signed webhook replay and worker processing were checked against the deployed backend. Phone/desktop UI and all four CI jobs passed before rollout.

The owner configured the Test Mode Dashboard webhook. An independent actual test payment was then completed with its browser verification request intentionally blocked. Razorpay delivered both `payment.captured` and `order.paid`; both durable events were processed and the independent student became registered. This verifies genuine Dashboard delivery and recovery when the browser callback is lost. Duplicate signed requests and invalid signatures were also tested.

Direct test refund requests using the documented API returned HTTP 400 (`invalid request sent`) even for the full INR 1 captured payment. Provider-side refunds remain unverified; transactional partial/full refund handling and protection of manual grants are covered by PostgreSQL regressions. Check this with Razorpay before live activation. This release does not expose a refund-initiation button.

Synthetic test payment records are retained as test-mode audit evidence; temporary Cognito credentials are removed. The owner's existing account, enrollment and watch progress are preserved. App-generated email receipts await the separately pending Resend sender activation.

## Official references reviewed

- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices/
- https://razorpay.com/docs/payments/payments/capture-settings/
- https://razorpay.com/docs/api/orders/create/
- https://razorpay.com/docs/webhooks/validate-test/
- https://razorpay.com/docs/webhooks/best-practices/
