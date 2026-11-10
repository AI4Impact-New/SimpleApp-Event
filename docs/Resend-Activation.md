# Resend activation — 9 November 2026

Sender: `AI4Impact <noreply@ai4impact.in>`. Reply-To: `support@ai4impact.in`. QA recipient: `siddartha.yadav@payintelli.com`.

## GoDaddy DNS records

Add the following records in the ai4impact.in zone. TTL: 30 minutes. Host values below are relative; GoDaddy appends ai4impact.in. Preserve Google MX at @, root SPF, SES DKIM, DMARC and all existing website/certificate records. Outbound verification does not create a support mailbox.

| Type | Host | Priority | Value |
|---|---|---|---|
| TXT | `resend._domainkey` | — | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9pReVAdvJLwbPmd4ooQFEsI19NJEbpsyvqsf5pYGImrOK6XnbS2CGtx1Hr2rde85LjksbHa9fDr3v3qWj359dr5UCdIEZVI3Y2vu/qWAmzZuh4aLkljS1EazSSTaif8VXkq1ARbTuawGB6Wa1lnBgp27iJ1+QseFfNRGVl0L1oQIDAQAB` |
| MX | `send` | 10 | `feedback-smtp.ap-northeast-1.amazonses.com` |
| TXT | `send` | — | `v=spf1 include:amazonses.com ~all` |
| CNAME | `rsend` | — | `send.forge.rmta.net` |

## Current setup

- Resend domain ID: `5483a80d-38ec-410a-a6b9-bac8edc50c8f`; Tokyo sending region; sending enabled, receiving disabled.
- Domain-scoped sending-only API key stored in `pilearn/resend-api-key`; no credentials in source or Terraform.
- Webhook ID: `8740468f-234c-4b5e-b790-93031d8a8f79`, endpoint `https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com/webhooks/resend`. Signing secret in `pilearn/resend-webhook`.
- Events: sent, delivered, bounced, complained, failed, suppressed. Unsigned requests verified to return 401.
- Learning and all three Programme workers have support@ai4impact.in as Reply-To. Production email flag remains false until DNS and an authorized QA delivery pass. Delivery dashboard currently has no backlog.
- Current Resend quota: 100 emails/day and 3,000/month; provider API rate limit 10 requests/second. Application sender rate is 2/second. Daily/monthly limits still require monitoring or a plan upgrade before growth.

## Existing email flows

- Programme booking confirmations, reschedules/cancellations and reminders; webinar confirmations/reminders; career/application updates and announcements use the durable outbox/SQS workers and Resend transport. Preferences, suppressions and delivery status are enforced.
- Assisted-enrollment quote email uses Resend with a PDF and idempotency key; Reply-To is now consistent with queued mail.
- Login verification, invitations and password reset use the existing Cognito + Amazon SES configuration. SES production sending is enabled (50,000/day, 14/second); do not change domain MX to route these through Resend. Configuration health alone does not prove inbox delivery.
- Payment success/refund currently writes an in-app notification. Automatic payment receipt/refund emails are not yet implemented; coordinate that addition with the payment integration owner. PDF receipts can already be downloaded.

## Activation after DNS is saved

1. Run `resend domains verify 5483a80d-38ec-410a-a6b9-bac8edc50c8f` and verify all required DNS checks and domain status.
2. Send one authorized QA message from the actual sender and confirm delivered webhook reconciliation. Test bounce/complaint handling with provider test recipients, never by emailing random or nonexistent real users.
3. Verify quote PDF, booking/webinar templates and timezone links. Confirm support mailbox receives replies.
4. Inspect the delivery dashboard before enabling broad sending; expire stale test reminders instead of replaying them.
5. Set Terraform transactional_reply_to to support@ai4impact.in and enable transactional_email_enabled only after these checks. Apply a scoped reviewed plan and monitor quotas, failures and queue age.
6. Keep marketing opt-in separate; provider acceptance/delivery does not guarantee inbox placement.
