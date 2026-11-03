# Notification system: implementation and scaling

AI4Impact | Backend and frontend handover | 31 October 2026

## 1. Decision and readiness

Use the existing PostgreSQL inbox, AWS Lambda on-demand workers, SQS Standard queues and Expo Push Service. Keep a scheduled outbox relay and receipt checker. Expo connects our native application to Android FCM and Apple APNs; AWS handles durable work, retries and monitoring. Direct APNs/FCM integration would duplicate provider-specific work already supported by our Expo application. SNS and a new event bus are not required for this first implementation.

Notifications should run automatically when a relevant event occurs or a reminder becomes due. Do not repeatedly notify the same person forever. Send once per logical event/device, retry transient failures within a deadline, respect consent and stop obsolete reminders.

**The backend foundation exists, but production push is not ready.** This document proposes the remaining implementation; it does not enable it or change infrastructure.

### Verified current state

| Area | What exists / observed |
| --- | --- |
| Durable inbox | `learner_notifications`, authenticated list and mark-read APIs; independent of push |
| Staff announcement | Admin course announcement inserts an inbox row for each registered/completed learner |
| Devices | User-owned registration/list/removal, project validation and ten-device limit |
| Delivery worker | `pilearn-notifications`, 256 MB, 60-second timeout, reserved concurrency 1 |
| Trigger | Enabled EventBridge rule `pilearn-push-outbox`, once each minute |
| Delivery handling | Expo ticket and receipt checking, bounded retry logic, invalid-device cleanup |
| Activation | `EXPO_PROJECT_ID` is empty on learning and notification Lambdas; device registration returns 503 and worker skips push |
| Queue | No `pilearn` SQS queues returned and no SQS event-source mapping on this worker |
| Frontend foundation | Expo permissions, token registration/rotation, opt-out, inbox, foreground handling and notification-tap navigation already exist |

Source check: local baseline `2fe5b7b`; fetched main `38adb83`. The intervening diff changes landing content/components, not the notification implementation. Live CLI inspection performed 31 October 2026 in AWS account 767491588787, ap-south-1. Token values and customer message contents were not read. APNs/FCM credential readiness is unverified.

### Channel scope

- Native Android/iOS: inbox plus Expo push is the first release.
- Student web: authenticated inbox works; this native token implementation explicitly skips web. Browser push requires a separate service-worker/Web Push design.
- Email: optional separate Resend worker later, using verified sending setup and delivery events. Cognito account emails remain separate. SMS/WhatsApp are separate scope.

<!-- page -->

## 2. Architecture and delivery workflow

### Recommended path

Business event or due reminder -> database transaction -> inbox and durable outbox -> scheduled relay -> SQS -> push worker -> Expo -> APNs/FCM -> device.

A separate receipt checker records provider results. The app refreshes the inbox and marks messages read when the learner opens them. The inbox remains usable when push permission is denied or a provider is down.

### Why each component exists

| Component | Responsibility |
| --- | --- |
| PostgreSQL | Authoritative inbox, preferences, event IDs, delivery jobs and audit state |
| Outbox relay Lambda | Claims committed pending work and submits small IDs to SQS |
| SQS Standard + DLQ | Buffers spikes, redelivers unfinished work and isolates repeatedly failing messages |
| Push Lambda | Rechecks eligibility, reserves provider capacity, sends batches and persists tickets |
| Receipt Lambda | Polls due tickets and records provider handoff results |
| Existing minute rule | Wakes relay and due-reminder dispatcher; minute-level scheduling is sufficient initially |
| EventBridge Scheduler, later if needed | Optional managed scheduling for independently scheduled campaigns; not required per recipient |
| Secrets Manager / CloudWatch | Protect provider credential; record metrics, logs, alarms and operator evidence |

The closest simpler alternative is the current database-only polling worker. It is adequate for a small pilot after hardening, but its fixed drain rate and lack of queue isolation make it a weak basis for larger broadcasts. SQS is the recommended production buffer; it does not replace the database outbox.

### Example: new recording announcement

1. Backend confirms that the recording is ready and commits a unique business event/outbox entry with the publication update.
2. A fan-out worker processes eligible enrolled users in keyset-paginated chunks. Each chunk atomically creates inbox rows, delivery jobs and relay entries, then advances its durable checkpoint.
3. Relay claims due rows using a short lease, publishes delivery IDs to SQS and marks them enqueued only after SQS confirms acceptance. A crash may enqueue duplicates; it must not lose work.
4. Sender checks the stored job, expiry, current recipient eligibility, current device ownership and push preference. It skips terminal or ineligible jobs.
5. Sender obtains a project-wide rate-limit permit, releases database locks, calls Expo, then records the result using a lease/attempt token.
6. Receipt checker updates provider status. Notification tap opens the signed-in app; the backend authorizes the target course again.

Use a campaign parent and resumable chunks for large audiences. Define the audience as eligible enrollments at campaign creation, with a final access/opt-out check at sending. Do not perform a huge synchronous fan-out in an API request. Return a campaign ID and expose progress. The transactional-outbox pattern prevents a successful content update from losing its notification because a queue call failed [1].

<!-- page -->

## 3. Backend work before production

### Fix the current reliability limits

| Current limitation | Required change |
| --- | --- |
| Worker discovers inbox rows only from the last 15 minutes | Persist outbox work transactionally; scan pending state/checkpoints without a rolling creation cutoff. Explicitly expire stale reminders. |
| At most 50 send jobs per scheduled minute | Separate relay, sender and receipts; use a bounded SQS worker pool |
| Database transaction stays open during external HTTP | Claim with a lease, commit, call provider outside locks, then finalize conditionally |
| Repeating admin POST creates fresh inbox rows | Add a required idempotency key and campaign record; replay returns the original campaign |
| No job expiry or recipient preferences in send query | Add expiry, category settings and a final eligibility/ownership check |
| Same-token frontend cache skips server registration | Revalidate periodically/on authenticated start so deleted or invalidated server registrations recover |
| Opt-out/delete failures are best-effort client calls | Persist backend preference; retry device cleanup and block sends even while deletion is pending |
| A deleted device cascades delivery history away | Retain minimal redacted audit/tombstone information with an agreed retention policy |

A single announcement to 10,000 devices takes at least 200 minutes at the current 50/minute send ceiling, excluding retries. That is a code-derived capacity estimate, not a load-test result.

### Data model additions (proposed, not present APIs/schema)

- `notification_events`: stable event ID, event type, entity/version, campaign ID, audience timestamp, creation time, available/expiry times, fan-out checkpoint and status. Unique logical event key prevents repeated publication requests from duplicating a campaign.
- Inbox additions: event ID, category, target type/ID, expiry and unique `(event_id, user_id)`. Preserve the existing notification ID and ownership checks.
- Delivery additions: channel, device ID/generation, lease owner/expiry, attempt counter, next attempt, enqueue state, provider ticket, terminal reason and expiry. Retain unique `(notification_id, device_id)` for push.
- Preferences: durable per-user category/channel settings and IANA time zone. Define an explicit master push switch independent of inbox retention.
- Index pending work by status/due time, inbox by `(user_id, created_at, id)`, and receipts by status/check time. Add retention jobs and review query plans with representative data.

### Status and retry contract

Keep existing meanings: `pending`, `ticket`, `provider_accepted`, `failed`. Introduce leased/queued, suppressed and expired states through a migration and compatible rollout. A push ticket means Expo accepted a request; a successful receipt means provider handoff, not proof that a phone displayed it or a student read it [2,3]. `read_at` is a separate application action.

Retry network failures, rate limits and transient provider errors with exponential backoff and jitter. Use a bounded attempt/time budget (starting proposal: five application send attempts, always subject to expiry). Invalid devices are disabled; invalid credentials pause sending and alert; oversized payloads fail validation. Do not exhaust the SQS redrive budget by confusing a deliberately delayed retry with a poison message.

No architecture can guarantee exactly one visible push. If Expo accepts a request and the response/DB update is lost, a retry can duplicate it. Leases, stable event IDs and terminal-state checks reduce duplicates; mobile UI deduplicates inbox entries by notification ID. Do not advertise exactly-once device delivery.

<!-- page -->

## 4. Events, reminders and user experience rules

### Initial notification catalogue (proposed)

| Use case | Trigger / audience | Suggested delivery policy |
| --- | --- | --- |
| Staff course announcement | Authorized admin submits; eligible course learners | Inbox plus one push; default expiry 24 hours |
| Recording available | Recording becomes ready/published | Enrolled learners; once per publication version |
| Live class reminder | Due at 24 hours and 1 hour before start | Only if enrollment/class still valid; expire at class start |
| Class rescheduled/cancelled | Schedule version changes | Cancel stale reminders; one update for the new version |
| Exam reminder | Due before an assessment deadline | Exclude students already submitted; expire at deadline |
| Certificate available | Eligibility/issuance event, according to product decision | One message; no score/private certificate data on lock screen |
| Poll/material update | Explicit publish event | Course/event participants, category preference applies |

These automatic triggers are not all implemented today. The current course-announcement operation is the starting producer. Product should approve message wording, audience, expiry and reminder frequency before adding each trigger.

### Scheduling design

Store UTC due times and the user's IANA time zone. Use a minute dispatcher to claim due rows; an example reminder key is `(class_id, schedule_version, offset, user_id)`. Rescheduling increments the version and invalidates old reminders. Recheck completion/enrollment/cancellation immediately before sending. A crashed dispatcher must be able to resume from stored state.

For future independently scheduled campaigns, EventBridge Scheduler can wake the dispatcher. Turn flexible windows off for time-sensitive reminders; even then do not promise exact-second device arrival [4]. Avoid creating one AWS schedule per student when one campaign plus paginated recipients is sufficient.

### Frequency and preference rules

Proposed defaults for product approval: quiet hours 21:00-08:00 in the user's time zone; defer routine pushes until the next allowed window, provided they are still relevant. Cap routine pushes at three per user per day and combine excess routine updates into a digest. Class changes may have a separately defined urgent category; marketing always needs its own preference. Inbox creation can continue independently of external push opt-out.

Use durable preferences, not just a phone-local switch. Recheck settings before sending and retain the reason for suppression. Define what happens for unknown time zones rather than assuming every learner is in India. An in-flight provider request may still arrive immediately after opt-out; acknowledge that race in acceptance criteria.

### Operational kill switches

Provide global push pause, campaign cancel, category pause, provider-project pause and per-user opt-out. Pausing stops new sends while retaining pending jobs until their expiry; the inbox stays available. Resuming must not replay expired reminders or broadcast an accumulated week of irrelevant updates. Never clear the inbox to stop push.

<!-- page -->

## 5. Frontend handover for Gayatri

### Existing API contract: keep compatible

| Endpoint | Frontend responsibility |
| --- | --- |
| `GET /me/notifications` | Load inbox; currently returns newest 100 rows as an array, not cursor pagination |
| `PATCH /me/notifications/{id}` with `{}` | Mark own notification read; repeated calls are safe |
| `POST /me/devices` | Submit Expo token, `platform` (`ios`/`android`) and matching `project_id` UUID |
| `GET /me/devices` | List own device IDs/platform/project/update time; tokens are not returned |
| `DELETE /me/devices/{id}` | Remove own device on logout or opt-out |
| `POST /admin/courses/{id}/notifications` | Staff-only announcement; current response is `notifications_created` |

Existing registration body: `{"platform":"android","project_id":"<EAS project UUID>","token":"ExpoPushToken[...]"}`. Returns `id`, `platform`, `project_id`; 503 means backend project is not configured, 400 invalid project/token/platform, 409 device/account conflict or ten-device cap. Authentication uses the current Cognito ID-token contract; do not trust a client-supplied user ID.

### Required frontend tasks

1. Create/configure the real EAS project; share its UUID with backend. Set `extra.eas.projectId` or the supported app build variable. Configure FCM v1/APNs credentials with the app owner and produce signed development/release builds [5].
2. Use existing push service and navigator handlers; do not rebuild these flows independently. Explain the benefit before requesting OS permission and allow the inbox to work after denial.
3. Register on authenticated start; handle token rotation, account switching, server-side registration removal and login after logout. Reconcile cached registrations with the backend.
4. Build notification settings with durable backend preferences once that API ships. Show denied permission and disabled-server states without an error loop. Keep cleanup retries across app restarts.
5. Refresh unread/inbox state on foreground and notification receipt. Current unread count only covers loaded rows; add a server unread count with pagination before treating it as a global total.
6. Handle foreground, background and cold-start taps. If logged out, retain only a safe navigation hint until login, then fetch authorized data. Never open arbitrary URLs from push data or grant access based on it.
7. Deduplicate by notification ID. For deleted/inaccessible courses or old messages, fall back to inbox with a clear explanation. Show content from authenticated APIs.
8. Test physical Android and iPhone builds. Browser automation cannot establish OS push delivery or camera/device behavior. Browser push is separate scope.

### Proposed contract extensions: coordinate before use

Add cursor pagination and a server unread count through a compatible/versioned inbox response. Add `GET/PATCH /me/notification-preferences`; backend validates categories, channels and time zone. Add an admin campaign create/status/cancel API with `Idempotency-Key`, scoped audience, schedule, expiry and progress counters. Return 202 for accepted asynchronous campaigns; this is not a delivery-success claim.

Push data example: `{"v":1,"notification_id":"<uuid>","course_id":"<uuid>"}`. Keep payload small, with generic lock-screen text and no tokens, personal records, scores or signed download URLs. Web/mobile fetch protected details after authentication. Expo documents a 4096-byte overall payload limit [2].

<!-- page -->

## 6. Scaling and cost planning

Measure devices/messages and burst size, not registered-user count alone. One notification to a user with two eligible devices creates two delivery jobs. Each receipt is separate work. Growth in audience fan-out, database rows, provider calls and retries must be budgeted together.

### Starting settings for the proposed SQS design

| Setting | Initial proposal, subject to load tests |
| --- | --- |
| Region / compute | ap-south-1; Lambda on-demand; no always-on application server |
| SQS item / batch | One delivery ID per item; start with 10 items per invocation, 5-second batch window |
| Sender concurrency | New sender reserved concurrency 5, event-source maximum concurrency 2; do not reuse the current reserved-1 setting |
| Function timeout | Start at 60 seconds; finish/checkpoint before timeout |
| Queue visibility | 420 seconds, exceeding six times 60 seconds plus the 5-second batch window [6] |
| Queue retention | 4 days; DLQ 14 days; application expiry can be much shorter |
| Redrive | Start at five receives for unhandled processing failures; inspect reason before replay |
| Provider rate | Start at an aggregate 100 notifications/second/project, enforced across all workers |
| Provider batching | Combine due jobs safely; never exceed 100 messages in one same-project Expo request [2] |

Use Lambda partial batch responses (`ReportBatchItemFailures`) so one failing item does not retry successful items [7]. Keep shared project rate-limiter state with short atomic reservations in PostgreSQL initially; a worker-local limiter is insufficient across concurrent workers. Never hold that lock over HTTP. Move limiter state to a dedicated service only if measurement shows database contention.

Expo currently documents a project ceiling of 600 notifications/second [3]. Start below it, count device messages and account for all senders sharing the project. AWS autoscaling does not increase that ceiling. Increase worker concurrency only when queue age, DB connections and provider headroom support it. Keep connection use bounded; consider RDS Proxy after measuring connection churn/cost. More workers can overload PostgreSQL before they improve throughput.

### Capacity examples, not promises

At a sustained effective 100 device notifications/second: 1,000 devices require at least 10 seconds, 10,000 about 100 seconds, and 100,000 about 17 minutes after sending begins. Add fan-out time, the relay tick, throttling, retries and receipt processing. The initial worker settings must be benchmarked to prove this rate; they do not guarantee it. A one-minute relay already precludes a universal seconds-level end-to-end promise.

For a pilot, target 95% of eligible low-volume pushes submitted to Expo within two minutes of event creation. Define a separate completion window for large broadcasts. Monitor inbox availability independently; device display cannot be guaranteed by this service.

### Cost model

Monthly work = notifications per learner x active learners x eligible devices, plus retries and receipt checks. Example: 10,000 active learners x 20 notifications/month x 1.2 devices = 240,000 initial device jobs. Without batching, a send/receive/delete path is roughly 720,000 SQS operations before retries, empty receives or payload billing units; batching changes that count.

Budget SQS requests, Lambda invocations/GB-seconds, database load/storage, logs, secrets calls and internet egress/NAT. Existing VPC workers need HTTPS egress; incremental fixed networking charges can dominate a small pilot. Expo Push Service currently has no sending charge, but native builds/accounts, other channels and AWS usage have separate costs [3]. Obtain ap-south-1 estimates from current pricing rather than promising a flat amount [8,9].

<!-- page -->

## 7. Infrastructure, security and operations

### Terraform implementation inventory

- Preserve current inbox and authenticated APIs. Add migrations for event/campaign/outbox/preference/delivery state and indexes with an explicit rollback/compatibility strategy.
- Add encrypted SQS Standard send queue, DLQ, redrive configuration and restrictive queue policies. Do not place notification text, credentials or device tokens in queue bodies when an ID is sufficient.
- Add separate fan-out/relay and send workers, an SQS event-source mapping with partial failures and maximum concurrency, and a receipt-only scheduled worker. Decide how the existing minute rule invokes dispatch/receipt work without double-sending.
- Make the existing worker receipt-only or disable its send branch before enabling the new sender. Two delivery paths must not own the same jobs concurrently. Use versioned leases/generations for cutover.
- Provide VPC/database connectivity for DB workers and verified outbound HTTPS to Expo. The SQS consumer being in a VPC does not by itself supply internet access.
- Store the Expo enhanced-push-security credential in Secrets Manager, enable that protection in Expo and grant only sender/receipt roles permission to retrieve the specific secret. Configure the same non-secret project UUID on learning and notification services.
- Add retention, dashboards, alarms, cancellation controls and an authenticated operator status view. No public unauthenticated notification-send endpoint.

### Access boundaries

Student APIs can operate only on the signed-in user's inbox, settings and devices. Campaign creation/cancellation is staff-only and checks course scope. Relay may publish only to its send queue; consumer can read/delete/change visibility only there. Database permissions and log access should match each worker's responsibilities. Use service-principal source conditions where applicable. Frontend bundles must never contain provider server credentials.

Do not log full tokens, auth headers or message bodies. Log event/campaign/job IDs, state transitions, duration, attempt number and safe provider error codes. Customer-visible counts should distinguish intended recipients, eligible devices, queued, ticketed, provider-accepted, suppressed, expired, failed and read. Avoid labelling a ticket/receipt as "delivered to phone".

### Dashboard and alerts (starting proposals)

Current Lambda-error and schedule-failure alarms exist. Add outbox oldest-due age, SQS oldest-message age/backlog, DLQ count, lease expiries, fan-out progress, retry rate, disabled-worker heartbeat, rate-limit responses, invalid credentials, and overdue receipts. A disabled handler returning success will not trigger a Lambda error alarm.

Suggested pilot triggers: due-work age over two minutes for five minutes, any DLQ item, any invalid-credential error, or heartbeat missing for five minutes. Tune to volume and agreed objectives; broadcast queues need their own age target. Connect alerts to an owned operator channel and verify that route works.

### Incident runbook

1. Check whether the producer, dispatcher, sender or receipt stage stopped; inspect oldest pending work and safe error codes.
2. On credential failures, pause affected project/category and fix credentials. On provider throttling, reduce aggregate rate. On DB pressure, reduce worker concurrency before increasing connections.
3. Repair, then replay only non-expired eligible jobs using the same IDs. Recheck opt-out, ownership and campaign cancellation. Redrive in controlled batches; never blindly resend all terminal jobs.
4. Reconcile outbox/queue/jobs, remove expired work, record backlog recovery and confirm inbox operation. Keep a rollback path that pauses push without disabling learning APIs.

<!-- page -->

## 8. Delivery phases and acceptance

### Implementation order

| Phase | Backend owner | Gayatri / frontend owner |
| --- | --- | --- |
| 1. Shared configuration | Agree event catalogue, API changes, UUID, secret and feature gates | Provide EAS project, app IDs and build/credential readiness |
| 2. Durable delivery | Implement outbox, leases, idempotent fan-out, queue, retries, receipts and expiry | Implement registration reconciliation and durable settings integration |
| 3. Product triggers | Course announcement first; recording/live/exam triggers next | Inbox/count/pagination, safe navigation and device-state UX |
| 4. Acceptance | Integration/load/failure tests, alarms and replay runbook | Physical-device foreground/background/cold-start/permission tests |
| 5. Rollout | QA allowlist > staff > small learner cohort > monitored expansion | Release compatible builds and verify actual installed versions |

Do not simply fill the project UUID and switch on every existing announcement. Define an activation timestamp and allowlist; suppress expired historical jobs. Test on synthetic accounts and owned devices before any learner broadcast.

### Required acceptance paths

| Test | Expected result |
| --- | --- |
| Admin announcement > inbox > queue > Expo > app tap | Correct eligible learner/course; recorded ticket/receipt; authenticated target opens |
| Retried creation with same idempotency key | Same campaign returned; one inbox entry per learner |
| Duplicate SQS item / worker crash | Durable work recovers; terminal jobs are not deliberately resent |
| Provider accepted but response lost | Ambiguous send recorded/retried according to policy; duplicate risk documented |
| Relay outage exceeding 15 minutes | Non-expired outbox work resumes; no permanent time-window loss |
| 429/5xx/timeouts and poison job | Backoff, bounded attempts, successful batch items retained, actionable DLQ |
| Invalid device / replaced token | Sending stops to invalid token; app can recover registration |
| Logout/account switch/opt-out | Future queued sends recheck ownership/preference; no account data leakage |
| Rescheduled/cancelled class or completed exam | Old reminder suppressed; no stale push after event deadline |
| API ownership and spoofed payload | Other user's notification/device rejected; push hint never grants access |
| Physical Android + iPhone | Permission allow/deny; foreground/background/cold-start; signed builds and correct credentials |
| Burst test, then soak | Agreed queue-age objective, shared rate cap, bounded DB connections, no missing inbox rows |
| Pause/rollback and redrive drill | Inbox remains available; replay excludes expired/cancelled/opted-out work |

Test 1,000-, 10,000- and larger synthetic recipient fan-outs in a non-production environment with a stub provider first. Use a small authorized real-device canary to verify Expo integration. Synthetic throughput does not certify phone delivery at that scale. Record event-to-inbox, queue age, provider-submission latency, errors, duplicates and recovery time.

### Definition of backend-ready

Ready means the agreed APIs and trigger semantics are deployed, configuration is present, migrations are applied, queues/workers/receipt handling and cancellation work, privacy/ownership tests pass, throughput is measured, alerts reach an owner, and physical-device end-to-end canaries pass. At the time of this review, that definition has not been met.

No production notifications were sent and no infrastructure or credentials were changed while preparing this document.

<!-- page -->

## 9. Engineering references and setup checklist

### Current implementation files

- `lambdas/learning/service.py`: `notify_course` and `notifications`.
- `lambdas/learning/devices.py`: token registration, project validation, ownership and device cap.
- `lambdas/notifications/handler.py`: scheduled discovery/send/retry/receipt processing.
- `docs/migrations/014_learning_platform.sql` and `015_push_notifications.sql`: inbox and push tables.
- `infra/terraform/notifications.tf`: worker, minute rule, concurrency and permissions.
- `infra/terraform/variables.tf`: `expo_project_id` and `expo_push_access_token`.
- `mobile-app/src/services/push.ts`, `src/services/api.ts`, `src/navigation/AppNavigator.tsx`: current mobile contract and handlers.
- `tests/test_notifications.py`: initial unit tests; not a substitute for the acceptance matrix above.

### Safe configuration sequence

1. Confirm company-owned Expo/EAS, Firebase and Apple developer accounts and appropriate team access. These are separate from AWS IAM.
2. Match bundle/application IDs, environments and EAS UUID; keep test and production tokens/jobs isolated.
3. Configure APNs/FCM credentials in the approved provider flow and build the native application. Never put server credential files or secrets into source control or frontend variables.
4. Complete backend reliability work and deploy infrastructure/migrations through a reviewed change. Supply project UUID and protected server credential through the deployment process.
5. Register owned devices, produce one canary event, inspect inbox/job/ticket/receipt and actual device arrival. Test tapping with the app open, backgrounded and closed.
6. Review metrics, expired-work behavior, support ownership and cancellation before expanding the allowlist. A green Lambda invocation alone is insufficient evidence of delivery.

### Official sources, checked 31 October 2026

[1] AWS transactional outbox pattern: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html

[2] Expo sending, tickets, receipts, limits and errors: https://docs.expo.dev/push-notifications/sending-notifications/

[3] Expo delivery guarantees, rate limit and service cost: https://docs.expo.dev/push-notifications/faq/

[4] EventBridge Scheduler flexible windows: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule-flexible-time-windows.html

[5] Expo push setup and credentials: https://docs.expo.dev/push-notifications/push-notifications-setup/

[6] AWS Lambda SQS configuration, visibility timeout and redrive: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html

[7] AWS SQS partial batch failure handling: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html

[8] Amazon SQS pricing: https://aws.amazon.com/sqs/pricing/

[9] AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/

### Glossary

Inbox: durable messages shown inside the signed-in application. Push: an external device alert that may be delayed or suppressed. Outbox: committed work waiting to be published. Queue: a buffer between producers and consumers. DLQ: dead-letter queue for repeatedly failing work. Idempotency: safe handling of repeated requests. Lease: time-limited ownership of work, recoverable after a crash. Receipt: provider handoff evidence, not a read confirmation. Fan-out: turning one event into many recipient jobs.
