# AI4Impact assisted enrollment handover

Release: 21 October 2026. Backend/admin ownership: Siddartha. Mobile frontend ownership: app team.

## What changes

Course Enquiries now has a Student onboarding column for guidance enquiries. Open its student workspace to complete the call workflow. Employer hiring enquiries remain separate and cannot create students.

1. Collect full name, email, phone and profile type. Students: university, degree/course, year of study, city and state. Professionals: company and designation (city/state optional). These match the app’s existing profile fields.
2. Record the caller’s authorization to create the account and receive account/quote emails. This is separate from the student accepting the app privacy policy. Marketing must not accept that policy on the student’s behalf.
3. Save details. The Create account button stays disabled while edits are unsaved.
4. Create or link the account. New accounts join Students only and get an app DB profile. Existing accounts retain password/profile and are linked without resetting credentials. Accounts with Admins/Marketing membership are rejected. Identity/email collisions require administrator reconciliation, not silent reassignment.
5. Send a new-account welcome invitation through Cognito’s default sender. Temporary passwords never appear in API responses, database records, logs or staff UI. Cognito asks the student to change the temporary password on first sign-in. Resend requires explicit staff action and only works for a not-yet-activated account created by this flow.
6. Select a published course, personal marked price in INR and discount percentage. The server stores an immutable quote in paise using half-up discount rounding. Public course pricing remains unchanged. A retry with the same request ID/payload returns the same quote. Changed quote details need a new request ID.
7. Download the branded demo/pro forma PDF and copy the owner-protected checkout link. With SES disabled, use Open email draft and attach the downloaded PDF manually. Opening a draft does not mean an email was sent.
8. When SES is enabled, Send quote email submits a separate branded email with the pro forma PDF attached. Its recipient comes from the saved quote, not an arbitrary client address. Activity shows pending/accepted/failed. Accepted means AWS accepted submission, not confirmed inbox delivery.

## What does not change

- Student self-signup, profile completion and existing app screens remain available.
- Existing Admins and Marketing authorization remain separate from AWS IAM access.
- Public enquiry/contact consent still records the website request.
- Changing a lead status to registered does not create enrollment.
- Dummy checkout remains demo only, collects no money and never grants course access.
- Previously issued certificates, enrollment records, public course fees and historic quote snapshots remain intact.
- No existing student’s password is reset by account linking.

## Access and payments

Creating an account lets a student sign in, but does not enroll them in the quoted course. After real gateway integration, only a verified, idempotent payment webhook should mark a real order paid and grant the appropriate entitlement. Browser redirects and demo completion are never payment proof.

Existing explicitly approved free/pilot registration remains unchanged. A paid-launch entitlement policy must remove or restrict that free path before accepting real payments. No new manual 'mark paid' control is introduced in this release.

## Email templates and default sender

The pool-wide default invitation keeps the AI4Impact logo and Welcome to the inner circle design. A single neutral welcome link authenticates the recipient, then routes staff to their console and learners to the landing page. This avoids listing both audiences in one email. It is a default-sender compromise: distinct invitation HTML/direct destination per role requires SES/custom-message configuration.

A second template in `lambdas/learning/assets/quote-email.html` contains the personal quote, clearly labelled demo checkout link and pro forma PDF attachment. It uses the same brand language, with different subject and content.

The SES domain identity/DKIM configuration is Terraform-managed. GoDaddy hosts its DNS. Automatic quote emails stay disabled until domain verification and production sending approval complete. SES production request case 179257518900594 currently reports DENIED. Do not enable `transactional_email_enabled` or promise delivery to arbitrary student emails until AWS approves sending. Default Cognito invitations continue to work independently.

Delivery requests use staff-generated UUIDs. Replaying an accepted delivery request never sends again. A pending or failed request returns conflict rather than automatically resending an unknown email; staff must inspect activity and explicitly send again with a new request. Sending across AWS and PostgreSQL is not an exactly-once transaction. A pending record after a network interruption requires review. New invitation resend can replace an unused temporary password and never resets an activated account.

## Mobile/frontend integration

The new path requires no new self-signup screen. The app must support:

- Sign in using the invited email and temporary password.
- Cognito NEW_PASSWORD_REQUIRED challenge and password validation/retry.
- Profile loading and the student’s own privacy consent. Staff-collected information must not imply the student accepted legal terms.
- A valid signed-in account with zero enrollments: show course discovery / waiting for enrollment, not an error.
- Demo orders in existing `/me/purchases`, `/billing/orders/{id}` and binary `/billing/orders/{id}/invoice` contracts. The personalized server quote is authoritative.
- Owner-protected checkout links: authenticate before loading an order. Native deep links need app-team configuration. Do not put JWTs in links.
- A future enrollment refresh after verified payment, once a real provider exists. No local success flag grants access.

Review of e407663: the latest mobile code clears React Query cache on sign-out and includes temporary-password change UI. This release makes one small recovery fix: transient exam-resume errors preserve saved answers. Native device acceptance and app-store release remain the mobile team’s responsibility.

## API service codes / configuration

Public API: `https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com`
Region: `ap-south-1`
Cognito pool: `ap-south-1_kc1sfOoEG`
Public app client: `40faprqjpcc6q0pfkdkcrd8p5v`
Admin: `https://admin.ai4impact.in`
Landing: `https://www.ai4impact.in`
AWS account: `767491588787`

Every assisted endpoint requires the authenticated ID token and Admins or Marketing membership. Do not expose staff endpoints to the mobile student UI. Prefix: `/admin/enquiries/{enquiry_id}/assisted`.

Method | Suffix | Purpose
--- | --- | ---
GET | (none) | Lead, saved profile, linked account, quotes, delivery activity
PUT | (none) | Validate/save profile and account authorization
POST | `/account` | Create/link student without enrollment
POST | `/invitation` | Send/resend eligible new-account invite; body `request_id`
POST | `/quotes` | Personal quote with `request_id`, `course_id`, `marked_price_paise`, `discount_percentage`
GET | `/quotes/{order_id}/invoice` | Enquiry-bound binary pro forma PDF
POST | `/quotes/{order_id}/email` | SES quote delivery; body `request_id`; 503 while disabled

Profile example:

```json
{"name":"Example Learner","email":"learner@example.com","phone":"+919000000000","user_type":"student","university":"Example University","course":"BTech","year_of_study":"3","city":"Pune","state":"Maharashtra","account_authorized":true}
```

```bash
curl "$API/admin/enquiries/$LEAD/assisted" -H "Authorization: Bearer $ID_TOKEN"
curl -X POST "$API/admin/enquiries/$LEAD/assisted/quotes" \
  -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"request_id":"REPLACE_UUID","course_id":"REPLACE_UUID","marked_price_paise":5000000,"discount_percentage":10}'
```

The example quote is INR 50,000 marked, 10% discount, INR 45,000 total. Use real UUIDs and locally obtained ID tokens. No AWS secret belongs in frontend configuration.

## Remaining work / decisions

- AWS SES production approval and DKIM success before enabling automatic quote/invoice emails. Add bounce/complaint event handling and suppression operations before increasing email volume.
- Real payment provider, signed webhook verification, real paid-order model, refunds, tax/issuer details and paid entitlement policy.
- Native device testing, app links, Expo project UUID and push verification.
- Approved academic content, completion rules and final certificate wording.
- Named marketing users and call-consent procedures.
- Reconcile partial account provisioning explicitly if a Cognito call succeeds but DB write fails. Reopening links an existing account without changing its password. No silent profile rebind or destructive cleanup occurs.
