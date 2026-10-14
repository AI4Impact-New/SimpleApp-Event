# PiLearn frontend integration handover

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

Certificate issue returns `{id,issued_at,download_path}` with HTTP 201, including repeated requests. It marks enrollment completed and adds an inbox notification. Download requires the owner or an admin, returns `{url,expires_in:300}`, and is an authenticated request separate from public verification. Use `expo-file-system` and `expo-sharing` versions compatible with the existing SDK. Public verification returns `{id,valid:true,recipient_name,course_title,provider,issued_at,certificate_type}`; revoked certificates return `{id,valid:false,reason:"revoked"}`. A missing certificate returns 404, and authenticated download of a revoked certificate returns 410. The PDF QR code targets public API verification; the admin site also provides `/verify/{certificate_id}` as a human-readable verification screen.

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

Admin frontend code is in `admin-dashboard/`; the AWS console is separate from the PiLearn admin portal. Staff must be a Cognito `Admins` group member to enter the portal; AWS IAM hosting access alone does not grant PiLearn app-admin access.

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

AWS Amplify app: **pilearn-admin**, ID **d16744ddqs159z**. Git repository: `AI4Impact-New/SimpleApp-Event`. App root: `admin-dashboard`; build command `npm run build`; SSR artifacts `.next`; repository build specification `amplify.yml`; hosting role `AI4Impact-AmplifyHosting`.

Production target: `https://main.d16744ddqs159z.amplifyapp.com`. This becomes live only after company GitHub connection and successful Amplify build. Terraform configures the app, branches, API/auth environment and Cognito callback/logout URLs. The PR branch is `feat/pilearn-learning-platform`; the tested changes are then published to `main` as requested. Do not confuse a provisioned Amplify app with a successful deployment.

GitHub organization authorization must be completed by someone with access to the company repository. The backend is deployed independently using Terraform and additive database migrations. Terraform state is encrypted/versioned in S3 with locking; do not run `terraform init` against a different account/backend.

The machine-readable new-learning API contract is in `PiLearn-Learning-OpenAPI.json`. Deployment and test results are recorded separately in the release report.
