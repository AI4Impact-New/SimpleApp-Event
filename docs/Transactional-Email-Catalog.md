# AI4Impact transactional email catalogue

Sender: **AI4Impact <noreply@ai4impact.in>**. Reply-To: **support@ai4impact.in**.

The single source of record is `email-templates/catalog.json`; the adjacent HTML/text files are the exact provider template bodies. `published.json` records the published Resend IDs and immutable v1 aliases. Subjects and event-specific content come from the committed outbox event; TITLE/TEXT/BODY variables are populated by the server, with explicit HTML escaping and bounded variable sizes. Each workflow is tagged separately in Resend.

## Delivery and audit

Business transitions insert durable notification events in the same database transaction. The dispatcher creates email jobs; SQS workers send with stable idempotency keys; signed Resend webhooks reconcile accepted/delivered/failed/suppressed states. Failed delivery does not undo enrollment or payment capture. The existing preference, suppression and pause controls remain active. Existing records are not backfilled: activating this release does not resend historical enrollments/payments/certificates.

Course registration, completion and manual access removal are covered at the database transition boundary, including legacy/admin callers. Verified Razorpay payments generate a confirmation and PDF summary; partial/full refunds generate their own emails and updated PDF summary. Paid enrollments do not also generate a duplicate free/manual enrollment email. Test-mode payments are explicitly labeled TEST. Outdated payment notices are suppressed if a more recent refund supersedes them. Existing payment in-app notifications remain deduplicated.

Bookings cover group clarification and personal handholding: confirmation, reschedule, cancellation, 24-hour/one-hour reminders and outcome. Webinars cover confirmation, updates, cancellation and reminders. Applicable calendar invitations are preserved. Recruitment application received/status changes, internship status changes, course announcements, issued certificates and staff-requested quote/PDF emails are included.

## Authentication and scope

Account verification, staff invitations and password recovery continue through **Cognito + Amazon SES**, not Resend. No password or verification code is put into the notification queue. Resend templates are not falsely presented as the active authentication sender. Authentication custom/default wording is controlled by Cognito configuration.

This catalogue does not claim AI interview/provider emails, job-alert marketing campaigns, abandoned-cart messages, automatic meeting-provider invitations, or tax/GST invoices. Those workflows are not implemented by adding email templates. Quote PDFs remain clearly demo/pro forma. Payment summaries are not GST tax invoices.

Resend's current plan is 100 emails/day and 3,000/month. Provider test messages consume that allowance. Monitor usage and delivery backlog before scaling; do not automatically upgrade a paid plan.

## Validation and rollback

Run the real-PostgreSQL lifecycle integration tests, the complete backend suite and CI. Test aliases against Resend's official delivered test address; send only explicitly authorized QA emails to real people. Verify one actual enrollment event through the application queue and delivery webhook.

Migration 023 is additive and installs transaction-local outbox triggers without updating historical business rows. Deploy worker support before applying it. To pause all outbound mail, use the email delivery control or set TRANSACTIONAL_EMAIL_ENABLED=false; to revert provider template rendering only, set RESEND_TEMPLATES_ENABLED=false. Retain outbox and delivery audit rows. Do not drop payment/enrollment data as a rollback.
