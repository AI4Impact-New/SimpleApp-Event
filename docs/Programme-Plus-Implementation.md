# Programme+ implementation and frontend handover

Implementation branch: `feat/programme-platform`. This document describes the code, not a claim that it has been deployed. Real AI integrations and Resend activation are deferred.

## Included scope

- Course-scoped educator assignments, enrollment/entitlement checks, one-time default allowances (five personal sessions; ten AI interview credits reserved for future integration), immutable credit adjustment ledger and staff audit trail.
- Educator/admin group, personal handholding and internship-interview slots; UTC instants plus IANA organizer zone; overlap and capacity checks within PostgreSQL transactions. Personal slots last 30 minutes. Learner cancellations/reschedules require 24 hours for a refund/transfer; staff cancellation refunds confirmed personal bookings. Booking attendance can be completed/no-show after the session.
- Company and job publishing, search and filters, owned applications, consent/profile snapshot and manual stage history. Fields follow the supplied Recruitment Support screenshot: consultancy partner, city, work mode, employment type, experience range, annual salary/currency, skills and application deadline. No synthetic match percentage or automatic AI screening.
- Internship applications, two configured existing screening exams, manual interview/acceptance decisions, assigned course educator as mentor, project/reviews, private completion certificate and staff-written recommendation letter.
- Admin-controlled webinar campaigns, delayed modal/toast on the website, publication window, local frequency cap, consented registration, registration management and deduplicated metrics. Public configuration never returns the private joining URL.
- Durable notification outbox, inbox, preferences, bounded announcement fanout, separate encrypted email/push SQS queues and DLQs, sender leases/retries/rate limits, provider receipts, signed Resend webhooks, bounce/complaint suppression and administrator channel pause controls.
- Connected admin workspace at `/dashboard/programme`. Course educators see sessions/bookings/announcements for assigned courses; other functions require administrator authorization on the server.

## Student frontend work

`mobile-app/src/services/programme.ts` is the typed client for Gayatri. Existing authentication is reused; never send an admin token from student UI. Build student views and wire these methods; this change does not claim the full student mockup has been implemented.

Use the existing configured API origin, without an `/api` suffix. JWT requests use the existing Cognito **ID token** interceptor. API errors return a safe `error` message with HTTP status. Paginated responses use `{items, next_cursor}`; request `after` for the next page. Do not calculate allowances, access rights, application stages or availability solely in UI.

| Workflow | Endpoint / behavior |
|---|---|
| Included benefits | `GET /programme/courses/{course_id}/entitlement` returns wallets and `ai_enabled:false` |
| Availability | `GET /programme/sessions?course_id=...` returns published slots; private meeting link is hidden until the owner books |
| Book | `POST /programme/sessions/{id}/bookings` with UUID `request_id` and `topic` |
| My bookings | `GET /programme/bookings`; `PATCH /programme/bookings/{id}` with `status:cancelled` |
| Reschedule | `POST /programme/bookings/{id}/reschedule` with `session_id` and UUID `request_id`; atomic credit transfer |
| Calendar | `GET /programme/bookings/{id}/calendar` returns filename/content type/ICS content for authenticated owner |
| Jobs | `GET /programme/jobs?q=...&location=...&work_mode=hybrid&employment_type=full_time` |
| Apply | `POST /programme/jobs/{id}/applications` with UUID `request_id`, `consent:true`, optional `statement`; external-link jobs use their company URL |
| Application history | `GET /programme/applications`; `PATCH /programme/applications/{id}` with `status:withdrawn` |
| Internship | `POST /programme/internships` with UUID `request_id`, `course_id`, `eligible_declaration:true`; `GET /programme/internships` |
| Screening | `GET /programme/courses/{id}/screening`; use existing exam APIs to take the configured exams |
| Mentor feedback | `GET /programme/internships/{id}/reviews` |
| Recommendation | `GET /programme/internships/{id}/letter` returns a short-lived private URL |
| Inbox | `GET /programme/inbox` returns owned items and total unread count; reuse existing read-status API |
| Preferences | `GET/PATCH /programme/preferences`: email/push/marketing, timezone, categories, quiet hours and daily routine-message cap |

Generate a fresh UUID per new action and reuse it on a network retry with unchanged input. A changed request must receive a new key. Render UTC timestamps in the viewer's IANA time zone and show that zone. Staff scheduling explicitly chooses the organizer's IANA zone and resolves DST overlaps; nonexistent local times are rejected.

Application stages are manual: submitted → reviewing → shortlisted → forwarded/interview → offered/rejected; learner may withdraw from a nonterminal stage. Display returned history rather than implying an AI review occurred. Salary values are annual currency units (for example INR 600000), not a preformatted LPA string. Job results are ordered by posting time, not AI skill match.

## Notification operation

Business state and logical notification event commit together. The minute dispatcher materializes inbox/deliveries in bounded batches. Each SQS message holds a delivery UUID, not contact details or message content. Sender reloads current data, checks consent/access/suppression and claims a lease before provider submission. Resend uses a stable delivery idempotency key; provider acceptance, delivery and inbox read status remain separate. Ambiguous email outcomes stop at `uncertain` after the retry budget rather than claiming failure or retrying indefinitely.

Routine career/announcement/marketing messages honor category preferences, quiet hours (default 21:00–08:00 in the user's zone), and a default three-logical-events-per-day cap shared across channels. Booking and webinar confirmations/reminders remain transactional and bypass the routine cap. Both respect channel opt-out and suppression. Opting out of marketing does not subscribe the user to marketing later.

Current bounded defaults are relay batch 1000/minute, email admission 2/second and two SQS consumer instances per channel. This is not a throughput guarantee: database capacity, provider quota and Lambda duration must be load-tested. Increase `programme_relay_batch_size`, `programme_sender_concurrency` and `programme_email_rate` only after checking backlog age, provider quota and RDS connections. The database is the durable source if queue publication fails. Do not change visibility timeout below six times the sender timeout plus the batching window.

CloudWatch alarms cover queue age, DLQ messages, Lambda errors and provider failure transitions. Use the delivery dashboard to pause a channel, inspect error codes and retry/investigate the underlying condition; do not blindly replay uncertain or suppressed mail. Existing operations SNS alarm recipients must be confirmed by the operator.

## Deployment and safe activation

1. Run backend unit/regression tests, isolated PostgreSQL integration tests, admin browser regressions, frontend builds/type checks, Lambda packaging and Terraform validation. Integration tests destroy/recreate their own schema and **require a database name ending `_test`**.
2. Review the Terraform plan for this environment and take/verify a database recovery point. Apply additive migration `021_programme_platform.sql` through the repository migration/bootstrap process before routing traffic to the new code. It creates no replacement auth/database stack.
3. Deploy backend/API/workers/queues and admin/landing code. Keep `transactional_email_enabled=false`. `programme_notifications_enabled` gates the new relay and disables the old scheduled notification tick to prevent competing dispatchers; switch only after migration and smoke tests. Defaults remain false.
4. Test with authorized QA users: scoped educator assignment, entitlement denial, last-seat race, credit refund/reschedule, manual application stages, webinar publishing/registration and inbox/preferences. Clear QA data after validation. No email-provider calls are required for these checks.
5. Activate real email separately after Resend access is provided and verified. Check sending-domain verification and the intended sender/Reply-To; configure secrets, signed webhook and only an authorized QA recipient first. Verify delivered/bounced/complained handling before broader rollout.
6. Roll back application code/flags if necessary; retain the additive tables and delivery state. Stop the new relay before restoring the old notification scheduler. Do not drop ledger/audit data to roll back a release.

## Resend details needed later

- Access to the relevant Resend workspace and a verified **sending** domain.
- A domain-scoped **sending-only** API key in AWS Secrets Manager, using the existing `RESEND_API_KEY_SECRET_ARN` container. Never put the key in frontend code, Terraform values, Git or chat.
- Verified sender address, Reply-To and an authorized QA inbox.
- A Resend webhook for `/webhooks/resend`, with its signing secret stored in the new webhook secret container. Subscribe to the delivery/failure/bounce/complaint lifecycle events supported by the handler.

A sending service does not itself create an inbound `support@ai4impact.in` mailbox. Inbound support mail needs valid domain MX records and a mailbox provider or explicitly configured inbound-routing service. Do not replace the domain's MX records merely to enable outbound Resend.

## Deferred

AI CV creation/rewrite, AI self-assessment narratives/recommendations, AI mock interviews/transcripts/evaluation and AI recruitment matching/screening await an external-provider decision. Real payment collection, tax invoices and instalment reconciliation also require a confirmed commercial/payment-provider scope; existing demo checkout is not proof of paid enrollment. Recurring availability/holiday calendars and automatic external meeting-provider creation are separate extensions; staff currently publish explicit slots and supply an HTTPS meeting link.
