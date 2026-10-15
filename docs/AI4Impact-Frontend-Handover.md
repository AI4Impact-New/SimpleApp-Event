# AI4Impact frontend integration handover

Release: 14 October 2026. AWS account **767491588787**, Mumbai **ap-south-1**. This release covers learning, enrollment, assessments, attendance, certificates and notifications. **Payments are excluded.** The student app source has not been modified; this document is the implementation contract for its frontend team.

## 1. Environment and authentication

```dotenv
EXPO_PUBLIC_API_URL=https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com
EXPO_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_kc1sfOoEG
EXPO_PUBLIC_COGNITO_APP_CLIENT_ID=40faprqjpcc6q0pfkdkcrd8p5v
EXPO_PUBLIC_COGNITO_REGION=ap-south-1
```

Use the new account values above; the old proposal's AWS account, pool and API URL are obsolete. API paths start directly at `/courses`, `/learning`, etc. Do not append `/api` or a stage name.

Sign up/sign in through Cognito using the existing Amplify auth integration. Send the **Cognito ID token** as `Authorization: Bearer <idToken>` on every request except public certificate verification. ID tokens last one hour; use Amplify `fetchAuthSession()` to refresh and retry once on 401. Keep credentials/tokens out of logs, analytics and Git. `Admins` is the staff group; normal app users use `Students`. A profile's `student`/`professional` type is independent of its authorization role.

All timestamps use ISO 8601 with timezone; render them in the device's timezone. IDs are UUID strings. New learning routes return JSON directly (arrays or objects); existing routes may use wrapper objects as specified below. Treat the server as authoritative for enrollment, progress, exam scores and certificate eligibility.

## 2. Screen-to-API map

| App screen / action | API | Integration behavior |
|---|---|---|
| Course catalog | `GET /courses?full=true&limit=50` | Only published courses are visible to students. Maximum limit 200. Use `learning_access` to choose Register/Open course. |
| Course detail | `GET /courses/{course_id}` | Unenrolled users can view catalog content; private Zoom and recording references are withheld. |
| Interest | `POST /courses/{course_id}/interest` | Records interest, without unlocking learning. Repeat interest does not downgrade an enrolled/completed user. |
| Register | `POST /courses/{course_id}/register` | Free registration for this release. No checkout, transaction or payment success screen. |
| My courses | `GET /me/learning` | Direct array of enrolled/completed courses and recorded lecture counts. Legacy funnel endpoint `GET /me/courses` returns `{courses:[...]}` including interest. |
| Learning home | `GET /learning/courses/{course_id}` | Returns `{course,classes,completion}`; 403 when not enrolled or course unavailable. |
| Recorded lecture | `GET /learning/classes/{class_id}/playback` | Obtain temporary signed MP4 URL, playback session ID and resume position. |
| Lecture progress | `POST /learning/classes/{class_id}/progress` | Send playback session and current player position during actual playback. |
| Progress overview | `GET /learning/courses/{course_id}/progress` | Returns `{classes,completion}`; refresh on player exit and app foreground. |
| Online/in-person class | Learning home `classes` | Render date, duration, Zoom link or location. Course calendar is `GET /courses/{course_id}/calendar.ics`. |
| Assessments | `GET /learning/courses/{course_id}/exams` | Only published exams. Show time limit, max attempts, attempts used and pass threshold. |
| Start/resume exam | `POST /learning/exams/{exam_id}/attempts` | Returns a new or existing active attempt and its questions. |
| Restore attempt | `GET /learning/attempts/{attempt_id}` | Owner only; resume after navigation or app restart. |
| Submit answers | `POST /learning/attempts/{attempt_id}/submit` | Scores on the server; display `status`, `score`, `max_score`, `percentage`, `expired`. |
| Completion | `GET /learning/courses/{course_id}/completion` | Show each missing requirement. Only enable certificate request when `eligible=true`. |
| Issue certificate | `POST /learning/courses/{course_id}/certificate` | Idempotently issue one completion certificate. Does not email it. |
| My certificates | `GET /me/certificates` | Direct array; show title, issue date and revocation status. |
| Download/share certificate | `GET /certificates/{certificate_id}/download` | Returns a five-minute URL. Download PDF locally, then use the native share sheet. |
| Public verification | `GET /certificates/{certificate_id}/verify` | No login. Displays valid/revoked result without email or PDF access. |
| Notification inbox | `GET /me/notifications` | Latest 100 entries, each with ID/title/body/course_id/read_at. |
| Mark notification read | `PATCH /me/notifications/{notification_id}` | Owner only; body `{}`. Navigate to its course when course_id is supplied. |
| Register push device | `POST /me/devices` | Expo project setup required; contract below. |
| Remove push device | `DELETE /me/devices/{device_id}` | Remove on logout/notifications opt-out. |
| List devices | `GET /me/devices` | Owned device metadata; push tokens are not returned. |

## 3. Copyable curl examples

Set placeholders locally. Do not put real JWTs in the handover or shared terminal output.

```bash
export API='https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com'
export ID_TOKEN='<Cognito ID token>'
export COURSE_ID='<course UUID>'
export CLASS_ID='<recorded class UUID>'
export EXAM_ID='<exam UUID>'
export ATTEMPT_ID='<attempt UUID>'
export CERTIFICATE_ID='<certificate UUID>'

curl -sS "$API/courses?full=true&limit=50" -H "Authorization: Bearer $ID_TOKEN"
curl -sS "$API/courses/$COURSE_ID" -H "Authorization: Bearer $ID_TOKEN"
curl -sS -X POST "$API/courses/$COURSE_ID/interest" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{}'
curl -sS -X POST "$API/courses/$COURSE_ID/register" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{"source":"mobile"}'
curl -sS "$API/me/learning" -H "Authorization: Bearer $ID_TOKEN"
curl -sS "$API/learning/courses/$COURSE_ID" -H "Authorization: Bearer $ID_TOKEN"
curl -sS "$API/learning/classes/$CLASS_ID/playback" -H "Authorization: Bearer $ID_TOKEN"
```

Playback response shape (signed URL shortened here):

```json
{"url":"https://<distribution>/<asset>.mp4?Expires=...&Signature=...&Key-Pair-Id=...","session_id":"<UUID>","expires_in":3600,"duration_seconds":900,"resume_seconds":120}
```

```bash
curl -sS -X POST "$API/learning/classes/$CLASS_ID/progress" \
  -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"session_id":"<session UUID>","position_seconds":150}'
curl -sS "$API/learning/courses/$COURSE_ID/progress" -H "Authorization: Bearer $ID_TOKEN"
curl -sS "$API/courses/$COURSE_ID/calendar.ics" -H "Authorization: Bearer $ID_TOKEN" -o course.ics
curl -sS "$API/learning/courses/$COURSE_ID/exams" -H "Authorization: Bearer $ID_TOKEN"
curl -sS -X POST "$API/learning/exams/$EXAM_ID/attempts" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{}'
curl -sS "$API/learning/attempts/$ATTEMPT_ID" -H "Authorization: Bearer $ID_TOKEN"
curl -sS -X POST "$API/learning/attempts/$ATTEMPT_ID/submit" \
  -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"answers":{"<question UUID>":"a","<another question UUID>":"c"}}'
curl -sS "$API/learning/courses/$COURSE_ID/completion" -H "Authorization: Bearer $ID_TOKEN"
curl -sS -X POST "$API/learning/courses/$COURSE_ID/certificate" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{}'
curl -sS "$API/me/certificates" -H "Authorization: Bearer $ID_TOKEN"
curl -sS "$API/certificates/$CERTIFICATE_ID/download" -H "Authorization: Bearer $ID_TOKEN"
curl -sS "$API/certificates/$CERTIFICATE_ID/verify"
curl -sS "$API/me/notifications" -H "Authorization: Bearer $ID_TOKEN"
curl -sS -X PATCH "$API/me/notifications/<notification UUID>" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{}'
```

## 4. Video player and progress behavior

Implement a recorded lecture screen using `expo-video`, selecting the version compatible with the project's Expo SDK. Obtain a playback URL each time a player session is opened. Load the entire returned URL, including its signature query. Seek to `resume_seconds` after the player is ready. Support pause, seeking, buffering, playback speed, orientation changes and a visible error/retry state.

Send heartbeat approximately every 15–30 seconds while actively playing, plus a final heartbeat when pausing, backgrounding, reaching the end or leaving the player. Serialize heartbeat requests so older positions cannot arrive after newer ones. Use the player's position in seconds, not an accumulated client-side duration. If offline, stop sending and refresh progress when connected; do not replay a backlog of heartbeats or promise offline progress credit. On 409 request a fresh playback URL/session and re-read progress. Renew URL before its one-hour expiry or on CloudFront 403. Opening a new playback session invalidates the previous active session for that same learner/asset.

The backend credits unique watched timeline intervals. Forward seeks do not grant credit for skipped content, repeated watching does not double count, and long disconnected gaps grant no more than one minute per heartbeat. A lecture completes at **90% unique watched duration**. Supported forward movement for one heartbeat is at most elapsed server time × 1.5 + two seconds; playback above 1.5× can produce uncredited intervals. For predictable progress, limit the playback speed selector to 1.5×. Completion stays true once enough unique content has been watched. Display the returned `completed`/`watched_seconds`; never send `completed:true`, a score or claimed elapsed seconds.

This release streams MP4 using signed CloudFront URLs and byte ranges. It has no DRM, transcoding pipeline or offline download entitlement. Staff must upload a valid browser-playable MP4 (H.264/AAC recommended). Show “Recording not available yet” on 409 when a class has no ready recording.

Class response fields include `id`, `course_id`, `title`, `description`, `class_type`, `duration_minutes`, `sort_order`, `start_time`, `end_time`, `zoom_link`, `location`, `asset_id`, `video_status`, `duration_seconds`, `watched_seconds`, `completed`, `resume_seconds`, `minutes_attended`. Do not assume every class has a recording or timestamps.

## 5. Exams

Starting an attempt returns `id`, `exam_id`, `status`, `score`, `max_score`, `pass_percentage`, `started_at`, `expires_at`, `submitted_at`, `questions`, `percentage`, `expired`. Each question contains `id`, `question`, `options:[{id,label}]`, `points`. Correct answer IDs and private grading metadata are never returned to students. Question UUIDs are generated by the server; submit the UUIDs returned in the attempt, not IDs sent during admin authoring.

Persist the active attempt ID and selected answer map per signed-in user. Derive a countdown from `expires_at`; backend time decides expiry. Make answers keyed by **question UUID**, with values equal to **option ID**. Unanswered questions score zero. Submit once, disable the button while pending and safely retry after connection errors; resubmitting a finalized attempt returns its existing score. Starting again resumes a pending attempt or consumes the next permitted attempt. Expired attempts fail and count toward max attempts; invalid question/option IDs return 400. Course staff edits do not change an attempt's question snapshot.

Use independent MCQ exam screens. Existing live event polls remain available and are not a substitute for these certification attempts.

## 6. Completion and certificates

Completion response:

```json
{"course_id":"<UUID>","eligible":false,"missing_requirements":["recorded_lectures","exam"],"rules":{"require_recorded":true,"require_attendance":false,"require_exam":true,"attendance_percentage":80},"recorded_total":4,"recorded_completed":3,"live_total":1,"live_attended":0,"exams_total":1,"exams_passed":0,"progress_percentage":75}
```

Staff selects required recorded lectures, live attendance and/or exams. All configured requirements must pass. Required exams and recorded/live activities must actually exist; an empty course cannot issue a certificate. By default all recorded lectures and all published exams are required, live attendance is optional. If required, live attendance is evaluated per class against its duration and attendance percentage. The course progress percentage specifically reflects completed recorded lectures; render separate attendance/exam indicators.

Certificate issue returns `{id,issued_at,download_path}` with HTTP 201, including repeated requests. It marks enrollment completed and adds an inbox notification. Download requires the owner or an admin, returns `{url,expires_in:300}`, and is an authenticated request separate from public verification. Use `expo-file-system` and `expo-sharing` versions compatible with the existing SDK. Public verification returns `{id,valid:true,recipient_name,course_title,provider,issued_at,certificate_type}`; revoked certificates return `{id,valid:false,reason:"revoked"}`. A missing certificate returns 404, and authenticated download of a revoked certificate returns 410. New PDF QR codes open the public landing site at `https://main.d3revsgd6isklp.amplifyapp.com/verify/?id={certificate_id}`. The page also accepts manual certificate IDs. The JSON verification API remains available to apps. Existing QR links pointing to the API redirect ordinary HTML browser requests to the public page; use `Accept: application/json` when explicitly requesting API data. The original admin-site `/verify/{certificate_id}` screen remains available.

## 7. Attendance, materials and existing features

Keep existing QR event join/polls/materials/profile flows. Event QR check-in records event attendance; completion attendance is the class-specific table, populated through the admin Learning Studio attendance import. Do not mark a class complete just because a Zoom URL was opened. Staff uploads Zoom reports with learner email and attended minutes. If attendance is required, enrolled profiles must use the matching email.

Existing endpoints: `GET/PUT /users/me`, `POST /users/me/privacy-consent`, `GET /events`, `GET /events/{id}`, `POST /events/{id}/join`, `GET /events/{id}/calendar.ics`, `GET /attendance`, `GET /attendance/event/{id}`, `GET /polls?event_id={id}`, `GET /polls/{id}`, `POST /polls/{id}/vote`, `GET /polls/{id}/results`, `GET /materials?event_id={id}`, `GET /materials/{id}`, `POST /materials/{id}/download`, `GET /analytics/student/{id}`. Preserve existing payload contracts in the app's API service and repository docs. Materials download linked to a course requires enrollment or admin access. Opening lecture URLs, taking exams, viewing learning details and course calendars require registered/completed enrollment, not interest alone.

## 8. Push notification setup still needed from the app team

Inbox APIs and scheduled delivery infrastructure are implemented. Native push delivery needs the real **Expo EAS project UUID** and device tokens; this release intentionally does not invent a project or send test notifications to real people. Until the backend `expo_project_id` Terraform variable is set, `POST /me/devices` returns 503 while inbox functionality works normally.

App team steps:

1. Configure the existing app's EAS project and install Expo-compatible `expo-notifications`, `expo-device` and `expo-constants`.
2. Request notification permission on a physical device, configure the Android notification channel, and get the Expo push token using the real EAS project ID. Use a native development/release build for supported push behavior.
3. Share the **nonsecret project UUID** with the AWS administrator. If Expo enhanced push security is enabled, enter its access token locally into the sensitive Terraform variable `expo_push_access_token`; never commit or paste it into chat.
4. Register the signed-in device and keep the returned backend device ID; refresh token registration when the Expo token changes. Remove it before logout if possible, and when the user opts out.
5. Handle notification taps by fetching the inbox and navigating to `data.course_id`. Never treat a push payload as authorization.

```bash
curl -sS -X POST "$API/me/devices" \
  -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"platform":"android","project_id":"<real EAS project UUID>","token":"ExponentPushToken[<real device token>]"}'
curl -sS "$API/me/devices" -H "Authorization: Bearer $ID_TOKEN"
curl -sS -X DELETE "$API/me/devices/<backend device UUID>" -H "Authorization: Bearer $ID_TOKEN"
```

A user may register at most ten devices; a token belonging to another account cannot be claimed. The worker polls every minute, creates durable delivery jobs for recent inbox entries, retries provider/transport errors with bounded backoff and checks Expo receipts. Provider acceptance is not proof that a person viewed the notification. Invalid device tokens are removed. Email/SMS and future-event reminders are not configured in this release.

## 9. Admin console and staff responsibilities

Admin frontend code is in `admin-dashboard/`; the AWS console is separate from the AI4Impact admin portal. Staff must be a Cognito `Admins` group member to enter the portal; AWS IAM hosting access alone does not grant AI4Impact app-admin access.

Use **Learning Studio** → course:

- **Content:** create/order recorded, online and in-person classes; upload MP4 files (up to 2 GiB), confirm publishing and preview protected playback. Replacing a recording resets its learners' progress and does not immediately delete the previous S3 object.
- **Assessments:** author weighted MCQs, correct options, passing threshold, time limit and attempt limit; publish/unpublish. Exams with existing attempts cannot be deleted.
- **Learners:** inspect enrollments/progress, update registration status, import Zoom attendance CSV and send course inbox announcements.
- **Completion:** choose recorded/exam/attendance requirements and attendance threshold.
- **Certificates:** inspect issued certificates, download and revoke with a reason; public verify screen is available without sign-in.

Admin API groups:

| Operation | API |
|---|---|
| Platform stats | `GET /admin/learning/overview` |
| List/create class | `GET/POST /admin/courses/{course_id}/classes` |
| Update/delete class | `PUT/DELETE /admin/courses/{course_id}/classes/{class_id}` |
| Signed video upload form | `POST /admin/classes/{class_id}/video-upload` with `{duration_seconds,size_bytes}` |
| Confirm uploaded video | `POST /admin/classes/{class_id}/video-confirm` with `{asset_id}` |
| Learners | `GET /admin/courses/{course_id}/learners` |
| Completion rules | `GET/PUT /admin/courses/{course_id}/completion-rules` |
| List/create exam | `GET/POST /admin/courses/{course_id}/exams` |
| Exam details/update/delete | `GET/PUT/DELETE /admin/exams/{exam_id}` |
| Attendance list/import | `GET /admin/classes/{class_id}/attendance`, `POST /admin/classes/{class_id}/attendance/import` |
| Course announcement | `POST /admin/courses/{course_id}/notifications` with `{title,body}` |
| Certificate list/revoke | `GET /admin/certificates`, `POST /admin/certificates/{id}/revoke` with `{reason}` |

Signed upload returns `{asset_id,upload:{url,fields},expires_in:900}`. POST multipart to the returned S3 URL with every `fields` entry unchanged and the **file last**; do not JSON-upload or send the Cognito JWT to S3. The object must be `video/mp4` and match the declared bytes. Then call video-confirm. Only confirmed assets can be streamed.

## 10. Error handling and frontend acceptance checks

| HTTP status | App behavior |
|---|---|
| 400 | Display validation message, preserve form/answers. |
| 401 | Refresh auth session once; then return to login. |
| 403 | Show registration/access requirement; do not retry repeatedly. |
| 404 | Missing/private resource; return to list or show unavailable. |
| 409 | Domain conflict: unavailable video, expired playback, max attempts or incomplete certificate requirements. Show `error`, refresh relevant state. |
| 410 | Certificate revoked; disable download and show revocation. |
| 413 | Request too large; reduce upload/import request. Video binary goes straight to S3. |
| 429 | Back off and offer retry. |
| 500/503 | Show service unavailable with retry; push registration 503 specifically means Expo project not configured. |

Before releasing the app, verify two separate users cannot read each other's attempts/certificates/notifications, unenrolled users cannot play lectures, progress resumes across devices, seek-to-end does not complete a lecture, paused/backgrounded time gives no large credit, timed exams recover after app restart, retries do not duplicate certificates, public verification works when signed out, revoked PDFs are blocked, and empty/error states work offline. Test a real physical device for notifications after Expo configuration. Store no AWS keys in frontend code.

## 11. Hosting and release workflow

AWS Amplify app: **AI4Impact Admin**, ID **d16744ddqs159z**. Git repository: `AI4Impact-New/SimpleApp-Event`. App root: `admin-dashboard`; build command `npm run build`; SSR artifacts `.next`; repository build specification `amplify.yml`; hosting role `AI4Impact-AmplifyHosting`.

Production target: `https://main.d16744ddqs159z.amplifyapp.com`. The company GitHub connection is complete and the main release build succeeded. Terraform configures the app, branches, API/auth environment and Cognito callback/logout URLs. The PR branch is `feat/pilearn-learning-platform`; the tested changes are then published to `main` as requested. Do not confuse a provisioned Amplify app with a successful deployment.

GitHub organization authorization must be completed by someone with access to the company repository. The backend is deployed independently using Terraform and additive database migrations. Terraform state is encrypted/versioned in S3 with locking; do not run `terraform init` against a different account/backend.

The machine-readable new-learning API contract is in `AI4Impact-Learning-OpenAPI.json`. Deployment and test results are recorded separately in the release report.

Certified courses cannot be deleted: `DELETE /courses/{course_id}` returns 409 when issued certificates exist. Set status to `draft` to hide the course from discovery while preserving certificate verification history.

## Public landing-page hosting

The public site is deployed separately at https://main.d3revsgd6isklp.amplifyapp.com from `landing-page/`. Its static export keeps Next.js 16 and serves generated HTML from `out/`. The admin app remains https://main.d16744ddqs159z.amplifyapp.com. Staff use Cognito for the admin app; public landing pages require no login. Future branding should use **AI4Impact**. The two apps share a repository and main branch with separate monorepo roots in `amplify.yml`.

## Website marketing enquiries

The landing career-guidance form now saves public enquiries without requiring a student account. `POST /enquiries` accepts `{request_id,name,email,phone,interest,consent,source_page,website}` and returns HTTP 202 `{id,message}`. Generate a UUID request_id and reuse it only for retries of the same details. Consent must be boolean true. The website field is a hidden honeypot and normally empty. The selected track stays a text interest, including “Not sure yet”, rather than an assumed catalog course UUID.

App admins inspect leads through `GET /admin/enquiries?status=new&search=...&offset=0`, returning `{enquiries,total,offset,limit:50}`. `PATCH /admin/enquiries/{id}` accepts `{status,notes}`. Status values are `new`, `contacted`, `registered`, `dropped`. These are marketing follow-up states and never automatically create accounts or grant course enrollment. Public callers cannot list or update contact data. The existing student app interest API and registration flow remain separate.

In the admin Course Enquiries screen, **Website enquiries** shows name, email, phone/WhatsApp, interest, contact consent/time/version, source, submission date and follow-up notes. **Student app interest** retains the existing signed-in course-interest workflow. No automated email, SMS, WhatsApp or appointment booking is configured by this form; authorized staff follow up manually. Stakeholders still need to choose named marketing users, enquiry-only role requirements, lead retention and the contact/booking process.

## Catalog, video windows and demo commerce — October 15 update

The active catalog now matches the six landing career tracks. Earlier courses are archived/draft and hidden from active lists; issued certificate references remain intact. Catalog snapshot: `docs/landing-course-catalog.json`. Fees use integer **paise**, INR only. `marked_price_paise` is the displayed marked/list price; admin `discount_percentage` accepts 0–100 with at most two decimals. Discount paise rounds half up, then total = marked price − discount. No tax is calculated: legal issuer/tax configuration and real Paintly integration are future work.

### Video access

Student class responses include `access_state` (`available`, `locked`, `expired`, `not_ready`), `unlocked_at`, `access_expires_at`, `access_days: 7`, and `prerequisite_class_id`. First recording unlocks when enrolled course content is first requested; subsequent recordings unlock when all prior recordings are completed (existing 90% unique-watch rule). The next seven-day window begins at the previous completion time, or when the next recording was published, whichever is later. It does not reset on login, reload or playback URL renewal. Missing/unpublished earlier recordings block the sequence. Expired completed recordings cannot be replayed, but completion remains credited. Changing lesson order changes prerequisites; staff should finalise ordering before launch. Replacing an MP4 resets watched progress but does not extend its existing window.

Playback and heartbeat enforce deadlines on the server; signed video URLs and sessions cannot extend beyond them. Handle 403 locked, 409 not-ready/session conflict and 410 expired with useful UI. Admin preview bypasses student windows. Admin can `POST /admin/classes/{class_id}/access-reset` with `{"user_id":"UUID"}` to reopen a lesson for seven days, without bypassing prerequisites. The Content tab provides this control; student IDs appear in Learners.

### Demo commerce API

All routes except public course pricing require a Cognito **ID token**. All order/invoice retrieval is owner-or-admin; completing/cancelling a checkout requires its owner. No route collects money or grants enrollment.

| Method/path | Purpose / body |
| --- | --- |
| `GET /billing/catalog` | Public active course prices (no customer details) |
| `GET /admin/billing/courses` | Admin pricing list |
| `PUT /admin/billing/courses/{id}` | `{"marked_price_paise":6999900,"discount_percentage":"10"}` |
| `POST /billing/orders` | Owner checkout: `{"course_id":"UUID","request_id":"UUID"}` |
| `POST /admin/billing/orders` | Pay-by-link: same body plus `buyer_email` of an existing student account |
| `GET /admin/billing/orders` | Latest 200 demo orders across students |
| `GET /me/purchases` | Latest 200 own demo orders/history |
| `GET /billing/orders/{id}` | Saved quote, status, expiry and checkout URL |
| `POST /billing/orders/{id}/demo-checkout` | `{"action":"complete_demo"}` or `{"action":"cancel"}` |
| `GET /billing/orders/{id}/invoice` | Binary PDF attachment; authenticated fetch then share/save blob |

Use a fresh UUID per intentional new order. Retry the same request UUID after a network failure; it returns the original immutable quote, even if fees changed. Reusing it for another course returns 409. Order status is `pending`, `demo_completed` or `cancelled`; link expiry is seven days. Repeating the same completed action is safe; reversing a finalised state returns 409. Expired pending links return 410. Client-supplied prices, customer identity and unsupported fields are rejected.

Web preview: `https://main.d16744ddqs159z.amplifyapp.com/student`. Checkout: `/checkout?order=UUID`. Cognito login returns to the selected student/checkout page through a restricted same-origin destination. PDFs embed the landing logo and saved price/discount/total; they are explicitly **DEMO / PRO FORMA**, not paid/tax invoices. Demo completion does not prove settlement. Live webhooks, payment verification, tax details, refunds and actual paid enrollment remain deferred.

```bash
curl -X POST "$API/billing/orders" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"course_id":"COURSE_UUID","request_id":"NEW_UUID"}'
curl "$API/me/purchases" -H "Authorization: Bearer $ID_TOKEN"
curl "$API/billing/orders/ORDER_UUID/invoice" -H "Authorization: Bearer $ID_TOKEN" --output invoice.pdf
```

## Employer enquiries, Marketing access and operations

New public `POST /employer-enquiries` accepts `{request_id,name,email,phone,organisation,roles,consent,source_page,website}`. Hiring roles allow up to 2000 characters, organisation 255; contact/consent and retry rules match guidance. Success is HTTP 202 `{id,message}`. No external message or booking is sent.

`GET /admin/enquiries` now supports `kind=guidance|employer` and returns `kind`, `organisation`, `hiring_roles` alongside existing contact/follow-up fields. Cognito **Marketing** members can list/update these leads and read `GET /admin/marketing/interests`; they cannot change course enrollment or use other admin APIs. Admins manage existing-account membership through `GET/PUT /admin/marketing/users` (PUT `{email,enabled}`). Group changes need refreshed sign-in claims. Follow-up edits write audit records.

Admins can inspect `GET /admin/operations/readiness` for database/content/push readiness. Native push remains disabled without the real EAS project; operational alert delivery also needs an approved, confirmed recipient. See `runbooks/AI4Impact-Operations-and-Release.md` for the actual restore/load evidence and release gates.

**Mobile team:** use `AI4Impact-Mobile-Screen-Implementation-Guide.md` as the page-by-page build specification. It covers 21 sections, navigation, new-account environment values, each screen/API, video windows, exams, certificates, inbox/push, demo checkout/history/invoices and a device acceptance matrix. Mobile source has not been changed by this backend release.
