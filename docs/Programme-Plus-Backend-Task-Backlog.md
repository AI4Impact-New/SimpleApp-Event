# Programme+, webinars and notifications: backend task backlog

Prepared 3 November 2026 as the original planning review. Subsequent implementation was authorized by the user; see [implementation and frontend handover](Programme-Plus-Implementation.md) for the implemented scope and activation steps. This backlog preserves the original design review.

## Evidence and scope

Compared the shared v0 Programme+ design and the team's meeting notes with repository main `0281071` (PR #40 merged). The v0 chat describes a student portal with six modules; it explicitly calls its accounts, jobs, schedules and interview feedback mock data. Its AI CV rewrite is described as unverified. Those statements describe a prototype, not working production backend capabilities.

Browser review used headless Chromium and a synthetic `example.invalid` login in the prototype. Confirmed the student overview and visited the six module entry pages; all showed the Programme+ registration gate. The opt-in dialog was inspected: it displays a fee, a no-guarantee acknowledgement, invoice email and full/instalment payment wording. Registration was not confirmed. No purchase, CV generation, job application or booking was submitted. Detailed unlocked-module behavior is described by the v0 project summary, not independently verified end to end. Local text/screenshot evidence is saved under `programme-review-2026-11-03/` beside the repository.

The existing AWS application supplies Cognito authentication, user profiles, courses/enrollments, recordings, exams, attendance, certificates, an inbox, device registration, an Expo delivery worker, enquiries and demo checkout. These should be extended; a new database/authentication stack suggested by generated prototype text is not a requirement.

No dedicated Programme+ entitlements, career/interview service, job/application service, booking system, educator permission role, or admin-managed webinar campaign service was found in the inspected backend handlers/migrations. Existing course classes/events can be reused where appropriate but do not establish these complete workflows.

Current design discrepancies to resolve before implementing commercial/access rules:

- User requirement: ten AI mock interviews included with the course. Prototype description: 3-5 scheduled mock sessions and a separate paid Programme+ opt-in. Use ten AI attempts as the planning baseline; do not silently substitute 3-5 or make the included benefit payable.
- User requirement: five personal sessions by default. Define entitlement scope (per course/bundle), validity, cancellation/no-show and failed-provider refund rules before coding quota consumption.
- Prototype adds internship screening, application tracking and skill matching beyond the initial short notes. These are listed separately; presence in a mock does not approve them for the first release.
- Existing marketing says weekly group clarification; current request says educator/admin schedules it when needed. Support ad-hoc scheduling; recurrence is optional and explicit.
- The preview still displays six tracks and an expired 11 October webinar. Treat it as a UX reference, not authoritative release content; the current repository has seven tracks.
- “Optimization strategies” is not yet a precise screen/API specification. Track CV/interview improvement recommendations and technical performance work separately until its exact intended scope is confirmed.

## Foundation tasks

### F01. Programme+ entitlements and feature access — P0

- Link benefits to existing user and course/enrollment records. Provide a backend summary of enabled modules, validity and remaining allowances.
- Implement a quota ledger: grant, reserve, consume, release/refund and audited admin adjustment. Ten AI interview attempts and five personal sessions are configurable benefit values, not frontend counters.
- Define exactly when attempts/sessions are consumed; ensure refresh, duplicate submissions and concurrent requests cannot overspend the allowance. Failed AI runs must follow a defined refund policy.
- Keep paid enrollment and real payments separate from current demo checkout. Demo completion cannot grant paid access. Confirm the course-included versus add-on model before wiring payments.
- Acceptance: two concurrent requests for the last credit allow one reservation; retries return the same result; balances persist across devices and account relogin.

### F02. Educator access, ownership and audit — P0

- Add or formally define a course-scoped educator role. Existing Admins/Marketing/Students groups do not supply a dedicated trainer workflow.
- Separate permissions for managing availability, viewing own bookings, publishing sessions, posting jobs, screening applications and adjusting student quotas.
- Enforce ownership and course scope in every endpoint; log actor, action, entity and timestamp for staff changes.
- Acceptance: an educator cannot modify another educator's slots or access unrelated learner CVs; students cannot call staff endpoints.

### F03. Shared scheduling and time-zone engine — P0

- Store appointment instants in UTC, plus organizer IANA time zone and local recurrence rules when used. Accept explicit time zones/offsets; reject ambiguous input rather than guessing.
- Manage educator availability, exceptions, holidays, duration/buffers, booking lead time, cutoffs, rescheduling and cancellations.
- Prevent overlapping educator/student bookings atomically. Group capacity and personal quota reservations must be checked inside transactions.
- Handle daylight-saving ambiguous/nonexistent local times and time-zone changes. Calendar invites must carry the correct instants and update/cancel semantics.
- Acceptance: India/UK/US viewers see one appointment correctly; DST boundary tests, concurrent bookings and cancelled reminders behave consistently.

### F04. Programme+ registration, billing and invoices — conditional P1

- If a paid add-on remains part of the approved model: persist registration/consent, order state, pricing snapshot and invoice/pro-forma document; define instalment schedule, payment reconciliation, cancellation/refund and access-expiry rules.
- Real collection requires a payment provider and verified server-side payment events. Reuse existing billing where compatible, but current demo orders are not proof of payment or a tax invoice.
- Add invoice/registration email events only after successful durable registration; retry idempotently. Do not unlock access from a frontend confirmation or payment redirect.
- If the user's included-course model replaces the paid opt-in for the ten AI interviews/five sessions, remove that paid gate for those benefits. Keep this decision explicit rather than duplicating contradictory rules.
- Acceptance: duplicate confirm requests produce one registration/order; provider failure does not silently grant paid access or send duplicate invoices.

## Student modules

### P01. AI CV builder — P1

- Private CV PDF/text upload or paste, validation/size limits, safe extraction and version history; protected download/export with ownership checks.
- Save target roles and template choice. Prototype describes up to four roles; confirm that limit before enforcing it.
- Build trusted context from the student's real completed courses/projects. Generate an editable CV draft asynchronously through a server-side AI provider integration.
- No invented employers, dates, qualifications or achievements. Treat uploaded text as untrusted data, not model/tool instructions. Preserve original and generated versions for review.
- Persist run status, errors, model/prompt version, cost/usage and final output. Define consent, retention and deletion for personal CV data. Never expose AI credentials to frontend.
- Acceptance: upload > processing > edit > export > refresh retains the same owned draft; failures recover safely; another learner cannot download it.

### P02. Self-assessment and optimization recommendations — P1

- Define assessment questions, rubric, target-role skill matrix and versioned scores. Reuse the existing exam engine where semantics fit.
- Persist assessment history and improvement actions, linked to observable evidence and relevant courses/projects.
- Keep skill-match percentages explainable; do not publish arbitrary percentages as validated hiring predictions.
- Recalculate recommendations when new evidence arrives; distinguish deterministic score calculation from AI narrative advice.
- Acceptance: the same inputs/rubric produce the same score; progress/history survive refresh; recommendations use the correct learner's evidence.

### P03. Ten AI mock interviews — P1

- Define interview format first: text, recorded voice or real-time voice. Their infrastructure, consent, costs and failure handling differ; a booked human mock is a separate delivery mode.
- Create interview session/question/transcript/answer/evaluation/result entities. Reserve an entitlement before starting and complete/restore it under the agreed policy.
- Implement authenticated start/resume/submit/feedback APIs, asynchronous evaluation and rubric-based history. Prototype shows six scoring measures; agree their definitions.
- Add timeouts, rate limits, provider spending caps and prompt/version tracking. Voice mode needs media storage/transcription and recording consent if approved.
- Acceptance: repeated start/submit does not duplicate charges or attempts; interrupted sessions follow a defined resume policy; ten-session allowance is enforced server-side.

### P04. Recruitment: companies and job board — P1

- Staff CRUD for companies/jobs: role, description, skills, location/remote policy, experience, application URL/method, deadlines and publish/archive status.
- Student API for active jobs with search, filters and cursor pagination. Expired/draft jobs must not remain actionable.
- Validate external URLs and sanitize content. CSV/bulk import and company logos are optional extensions with validation/preview rather than a prerequisite.
- Acceptance: admin posts/publishes/edits/archives a job; corresponding student results update correctly and persist.

### P05. Job applications, screening and skill matching — P2 / mock-driven extension

- Decide external application links versus platform-owned applications. If owned: persist application ID, submitted profile/CV snapshot, status timeline, staff notes and stage changes.
- Prevent accidental duplicate applications; establish visibility/consent before sharing profiles with companies/recruitment partners.
- Implement explainable matching against an agreed skills taxonomy; refresh when student/job evidence changes.
- Acceptance: apply > refresh > staff stage update > student status/notification; no cross-student access; job closure prevents new applications.

### P06. Group clarification — P1

- Staff creates course-linked ad-hoc sessions with educator, title, start/end, capacity, booking rules and meeting details.
- Students view/filter sessions and join/leave; manage capacity atomically. Waitlist promotion/recurrence/recordings are separately configurable features.
- Reuse course/event records when their authorization and attendance semantics fit; add booking relations rather than treating an existing live link as a confirmed booking.
- Connect the approved meeting/calendar provider or permit staff-provided join links; define provider-outage and cancellation behavior.
- Acceptance: the final seat cannot be double-booked; cancellation frees it; schedule changes update confirmations and suppress obsolete reminders.

### P07. Five personal handholding sessions — P1

- Educator directory and available-slot API; student request/book with topic and note. Support direct booking versus educator approval according to the agreed policy.
- Link each booking to educator, student, entitlement, availability slot and meeting reference. Track requested/confirmed/completed/cancelled/no-show states.
- Reserve credits on booking and release/consume under the agreed rules. No double-booking or quota loss on a retried request/provider failure.
- Acceptance: five included sessions survive refresh and multiple devices; a sixth request is refused without further entitlement; cancellations are audited.

### P08. Real-world internship — P2 / explicit scope decision

- Prototype describes fresher eligibility, two timed screening tests and a final interview booking. Define eligibility/evidence and staff review states first.
- Reuse existing assessments where possible; add applications, screening outcomes, interview scheduling and review audit.
- If full delivery is approved: project allocation, mentor assignment/reviews, completion criteria, internship certificate and recommendation-letter workflow are additional tasks.
- Acceptance: no automatic internship guarantee from a marketing/mock opt-in; staff-controlled decisions and eligibility are enforced.

## Webinar marketing and acquisition

### M01. Admin-managed webinar campaigns — P1

- Campaign CRUD and publish/pause/schedule/expire controls. Fields: title/copy, image, speakers, webinar start/end and time zone, eligibility/pages, CTA, display delay, active window and presentation type (modal or toast).
- Public read-only API returns eligible active campaign configuration; protect publish/admin writes. Cache with a defined freshness bound so pause/expiry propagates promptly.
- Store delay in explicit units, enforce bounds, and separate “show after X seconds” from notification/reminder scheduling. Frontend controls rendering, close behavior and accessibility.
- Configure frequency caps/suppression by session/visitor and campaign version; avoid showing both toast and popup repeatedly to the same person.
- Serving stale expired webinar copy is a failure. Include effective expiry in responses so the client can stop display even during a cache outage.
- Acceptance: staff publishes campaign with delay > visitor sees the intended variant once > pause/expiry hides it without a frontend redeploy.

### M02. Webinar registration and follow-up — P1

- Public registration endpoint with validation, rate limits, bot controls, consent and deduplication/idempotency. Persist registration and campaign attribution (UTM/referrer where permitted).
- Confirmation/reschedule/cancellation, calendar file and reminder events; staff list/export registrants with audited access.
- Integrate a webinar provider only if automatic attendee provisioning is required. A landing-page popup does not itself host a webinar.
- Optional attended/no-show reconciliation requires provider events/import and staff visibility; not inferred from clicking Join.
- Acceptance: repeated registration creates one record; confirmations contain the correct webinar/time; a cancelled webinar stops reminders.

### M03. Campaign measurement and performance — P2

- Distinguish eligible view, impression, dismiss, CTA click, registration and attendance. Use bounded, privacy-aware event collection and avoid counting retries as new conversions.
- Provide staff conversion summaries by campaign/version/channel; A/B variant assignment only if requested.
- Index/paginate job, inbox and booking queries; cache public campaign configuration; run CV/interview generation and audience fan-out asynchronously with rate/cost controls.
- This covers acquisition/performance optimization. It is not evidence of an additional “optimization strategies” feature in the prototype.

## Notifications including email

### N01. Shared event/outbox and channel workers — P0

- Build on the existing inbox/Expo design: commit events/outbox state with business actions, then dispatch durable channel jobs through queues. Avoid database transactions held open across provider calls.
- Separate push and Resend email queues/workers and dead-letter handling so one provider outage does not block the other. Use stable event/recipient/channel IDs, leases, retries/backoff and message expiry.
- Add per-channel/category preferences and suppress obsolete/cancelled reminders. Transactional confirmations and marketing opt-ins must have distinct rules.
- Fix the current 15-minute push-discovery cutoff and fixed 50/minute send bottleneck; add durable backlog reconciliation. Provider acceptance is not device display or inbox delivery.
- Acceptance: an outage exceeding 15 minutes recovers non-expired work; duplicate queue messages do not deliberately duplicate notifications; channel failures remain isolated.

### N02. Resend email lifecycle — P0

- Reuse existing secret-backed Resend integration, but do not equate the current quote/PDF sender with a general notification service.
- Templates: webinar registration/reminder/change/cancel; group/personal booking confirmation/change/cancel/reminder; interview result/credits; relevant job/application updates; approved programme onboarding.
- Store provider message ID, idempotency key, attempt/state and template version. Handle uncertain sends without creating fresh IDs; provider deduplication is time-bounded, so retain our own ledger.
- Implement a Resend webhook endpoint with raw-body signature verification, replay protection and event deduplication. Handle delivered, delayed, bounce, complaint and failed events without overwriting newer terminal state with older events.
- Maintain suppression/preferences and alert on credential/delivery failures. Email opens/clicks are not reliable proof of reading. Do not include private CVs/scores in email or public URLs by default.
- Keep Cognito invitations, verification and reset delivery separate unless an explicit authentication-email migration is approved.
- Provider references: https://resend.com/docs/webhooks/introduction ; https://resend.com/docs/webhooks/verify-webhooks-requests ; https://resend.com/docs/dashboard/emails/idempotency-keys

### N03. Configuration, credentials and controlled activation — P0 dependency

- When company Resend credentials are available: verify sender DNS/domain, securely load the scoped sending key, configure webhook signing secret, and verify sender/Reply-To addresses. No keys in chat/frontend/source control.
- Verify support mailbox/inbound MX separately: sending through Resend does not automatically create `support@ai4impact.in` receiving service.
- Confirm EAS project and native APNs/FCM configuration before push canaries. Use test environments/allowlists, no historical bulk replay, and explicit send/expiry cutoffs.
- Test a small set of authorized real inboxes/devices; verify provider events and actual receipt. Pause delivery if activation tests fail.

## Administration, infrastructure and acceptance

### O01. Admin workspaces and API handover — P1

- Backend APIs for entitlements/adjustments, educator availability, bookings/session status, jobs/applications, internship review, campaigns/registrants and delivery status.
- Give frontend a versioned contract with request/response examples, permissions, validation errors, pagination, idempotency and job/status polling. Do not bind production to frontend sample arrays.
- Define booking availability freshness, conflict responses and payment/entitlement error handling before Gayatri wires UI.

### O02. Infrastructure, observability and privacy — P0/P1

- Terraform queues/DLQs, bounded Lambda concurrency, scheduled dispatch and receipt workers, provider secret permissions and HTTPS/database connectivity. Add private document storage and AI work queues when those modules start.
- Record operational counters and safe IDs, not CV text, passwords, keys, raw device tokens or private interview answers. Set retention/deletion rules for CVs, recordings, transcripts and registrant data.
- Monitor oldest pending work, provider errors, bounces/complaints, campaign send counts, queue/DLQ age, AI spend/latency and booking conflicts. Add pause/cancel/redrive controls and an owned runbook.
- Add load/failure tests: concurrent final-seat/credit booking, idempotent sends, provider timeout, webhook replay/out-of-order events, timezone/DST, async worker recovery and cross-user access.

### O03. End-to-end acceptance — P1

- Entitlement grant > CV upload/generation/export > assessment > AI interview > saved results; quotas persist and failures follow refund rules.
- Admin job publish > student discovery/application > staff stage update > student inbox/email.
- Educator availability > group/personal booking > confirmation/calendar > reminder > reschedule/cancel; no conflicts or stale notifications.
- Campaign publication > delayed landing overlay/toast > registration > email > calendar/reminders > pause/expiry.
- Check Android/iOS native push separately from web inbox/email. Use synthetic data and authorized recipients, then clean up only identified QA records.

## Suggested order for assignment

1. Confirm entitlement/commercial rules and interview format; agree API contracts.
2. F01/F02/F03 plus N01/N02: shared access, quotas, booking/time zones and email/push foundation.
3. M01/M02: admin-controlled webinar campaigns and registration, if go-live acquisition is the first business priority.
4. P04, P06 and P07: jobs, group clarification and personal sessions.
5. P01/P02/P03: AI CV, assessment and ten interviews after provider/format decisions.
6. P05/P08/M03: applications/matching, internships and advanced acquisition reporting when explicitly assigned.
7. Credentials/allowlisted canaries, failure/load testing, staged release and monitoring.

This is a proposed task inventory for the user's selection, not a promise that every mock feature is approved for implementation.
