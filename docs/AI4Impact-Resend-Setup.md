# AI4Impact Resend setup

## Scope

The application quote/PDF email now uses Resend instead of SES. It keeps the current HTML/plain-text design, prices, discount, demo checkout link and pro forma PDF. No payment or enrolment behavior changes. Cognito invitations, verification and password-reset messages continue through COGNITO_DEFAULT; they do not depend on our SES domain/production approval. Moving those authentication messages to Resend would be a separate Cognito custom-sender integration, not an SMTP setting.

## Ask the account/domain owner for

1. A company-owned Resend account/team.
2. Add and verify `ai4impact.in` in Resend. Use the exact DNS records shown there; the GoDaddy/domain owner publishes them. Do not replace website records or existing mailbox MX records. Do not add a second SPF TXT record at the same DNS name. The application From address is `AI4Impact <noreply@ai4impact.in>`.
3. Create an API key named `AI4Impact production`, with **Sending access**, restricted to that verified domain. Do not give the key to frontend/mobile developers or put it in a browser environment variable, chat, Git or Terraform variables.
4. An inbox address for one authorized delivery test. No bulk send or historical email replay is performed during migration.

## Store the key locally

After Terraform provisions the empty Secrets Manager secret, run from the repository:

```bash
python3 scripts/configure_resend_key.py
```

The terminal prompts without echoing the key. It writes JSON `{ "api_key": "..." }` to Secrets Manager secret `pilearn/resend-api-key` in `ap-south-1` using AWS profile `jm`, with a protected temporary file that is removed on completion. It does not enable delivery. The Lambda receives only the secret ARN and can read only this secret through its dedicated email policy. Secret material is deliberately excluded from Terraform state.

## Activate and verify

- Verify the sender domain in Resend before enabling.
- Set `transactional_email_enabled = true` in the deployment's persistent Terraform configuration, review the plan, then apply. Default remains false until the key/domain are ready.
- Send one consented test quote through Course Enquiries. Confirm the exact recipient, subject, branded body, PDF attachment, fee/discount, demo warning and working link.
- Check the Resend dashboard and recipient inbox. An accepted API request is not delivery confirmation.
- Confirm no Cognito login/invitation/recovery regression. Remove the test delivery flag via Terraform if readiness fails.

## Delivery and failure semantics

- Each send uses an idempotency key derived from the persisted action ID. Resend retains idempotency keys for 24 hours; the application's action record separately prevents an accepted request ID from being sent again.
- Network failures, provider 5xx responses or malformed success responses are uncertain. The audit action remains pending with `delivery_uncertain=true`; the API does not report success. Review the Resend dashboard before explicitly making another send request. No automatic replay of old pending/failed actions occurs.
- A rejected request (such as invalid API key or rate limiting) is marked failed. Provider response bodies and keys are not logged or returned.
- Monitor bounces/complaints in Resend and stop sending to affected contacts. The legacy SES/SNS feedback resources are retained but do not receive Resend events. No Resend webhook-to-CloudWatch integration is claimed by this release.
- For rotation, run the storage command with the replacement key; warm workers cache credentials for up to five minutes. Keep the old key valid during that overlap, then revoke it.

## References

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/api-keys/introduction
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/emails/idempotency-keys
