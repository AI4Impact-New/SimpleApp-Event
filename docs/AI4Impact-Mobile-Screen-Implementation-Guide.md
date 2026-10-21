# AI4Impact mobile app — page-by-page implementation guide

Updated 15 October 2026. Audience: the mobile frontend team. Backend/admin/landing ownership: Siddartha. Mobile code is deliberately unchanged by this release. This document describes the screens and connections the app team must build, not a claim that those screens are shipped.

Use this guide with `AI4Impact-Frontend-Handover.md` for curl examples and complete learning contracts. Repository implementation is the source of truth if a sample differs. Payments remain a clearly labelled demo; do not collect card/bank details or promise paid enrollment.

## 1. Build configuration — do this first

Set these **public configuration values** in development and release/EAS environments:

```dotenv
EXPO_PUBLIC_API_URL=https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com
EXPO_PUBLIC_COGNITO_REGION=ap-south-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_kc1sfOoEG
EXPO_PUBLIC_COGNITO_APP_CLIENT_ID=40faprqjpcc6q0pfkdkcrd8p5v
```

The current source defaults in `mobile-app/src/config/amplify.ts` and `mobile-app/src/services/api.ts` still reference the earlier account. Confirm the compiled build uses these new values; a developer's local environment does not prove the release build does. Do not copy AWS keys, database credentials, or Secrets Manager values into the app. The user pool app client is public, without a client secret.

Update visible app branding/permission copy from PiLearn to AI4Impact as part of the mobile release. Keep installed application identifiers stable unless the store owner explicitly requests a new app identity. No EAS project UUID is supplied by the backend; the mobile team must provide its real one.

## 2. Navigation and page inventory

Recommended primary navigation: **Home · Courses · My Learning · Inbox · Profile**. Keep existing QR/event/poll/material screens reachable from Home and event details. Certificates and purchase history can be shortcuts from My Learning/Profile.

| Screen | Existing mobile source | App-team work |
| --- | --- | --- |
| Login/signup/confirmation | Existing auth screens | Point to new Cognito account; test recovery and onboarding |
| Profile/consent | Existing profile screens | Confirm backend UUID and profile validation |
| Course catalog/detail | CoursesScreen, CourseDetailScreen | Use six-course catalog, current prices and correct access state |
| My Learning | New | Show registered/completed courses and progress |
| Course workspace | New | Lessons, live sessions, assessments, completion and certificate |
| Video player | New | Signed playback, serialized progress, seven-day windows |
| Exam introduction/player/result | New | Timed owned attempt, recovery and server result |
| Certificates/detail | New | Eligibility, private download/share and public verification |
| Notification inbox/detail | New | Course announcements and read state |
| Demo checkout/order/history | New | Price quote, demonstration completion/cancel and invoice download |
| Event/QR/polls/materials | Existing screens | Regression test against the new account |
| Settings/support | Existing/new | Logout, notification opt-out, access-expiry help and version |

## 3. Shared networking and state rules

- Send `Authorization: Bearer <Cognito ID token>`; do not substitute the access token. Public certificate JSON, public prices, guidance and employer submission do not require authentication.
- On 401, use Amplify `fetchAuthSession` to refresh, then retry once. If authentication still fails, return to login while retaining a safe intended destination (course, exam attempt or order). Avoid refresh loops.
- Centralize API parsing. Learning endpoints commonly return bare arrays/objects; the existing course/user/event APIs may have wrappers. Inspect the existing service methods and actual response before binding a list.
- Store UUIDs as strings. Backend profile `id` is the database user UUID; Cognito `sub` is a different identifier. Never send another user's UUID to owner APIs.
- Prices are integer **paise** in INR; divide by 100 only for display. Do not submit client-calculated prices. Dates are ISO timestamps; render in local time with the timezone clear.
- Show loading, empty, retry/error and success states on every data page. Preserve filled forms/answers after transient failure. Clear private caches and per-user attempt state on logout/account switch.
- Keep tokens and full signed media URLs out of logs, analytics and error reports. Push links and QR data are navigation input, never proof of access.

### Error handling map

| HTTP | App behavior |
| --- | --- |
| 400 | Show a useful field/message; do not silently retry invalid payloads |
| 401 | Refresh once; otherwise sign in and resume intended page |
| 403 | Show enrollment/previous-video restriction; do not retry as another user |
| 404 | Record unavailable or not owned; show safe back navigation |
| 409 | Show not-ready, attempt limit, stale/session or state conflict message; refetch relevant state |
| 410 | Expired video/order or revoked certificate; explain next action |
| 429 | Wait/back off, keep form/request UUID, retry without duplicate creation |
| 5xx/network | Retry affordance; preserve user work; do not show a false success |

## 4. Authentication and onboarding pages

### Login / Sign up / Confirm email / Forgot password

Use the existing Amplify auth service and screens. Sign-up requires real email ownership verification. Handle duplicate account, weak password, wrong code, expired code and resend. Do not silently confirm users or hardcode temporary passwords. A successful Cognito login is not sufficient to skip backend profile loading.

After authentication call `GET /users/me`. If required profile/consent data is missing, route to Complete Profile; otherwise restore the user's intended destination or Home. Normal students must never be routed into the admin dashboard because they have a valid token.

### Complete Profile / Edit Profile / Privacy

Use `GET /users/me`, `PUT /users/me`, and `POST /users/me/privacy-consent`, preserving the existing payload contracts. Display and validate the existing student/professional profile fields. User type is a profile property, not an administrator role. Never let a profile form assign Admins/Marketing groups. Store the returned profile UUID for existing analytics calls only.

Acceptance: signup → email confirmation → profile → relaunch; password reset; token expiry; account switch; error with profile save must not lose form input.

## 5. Home page

Show the user's name, a Continue Learning card, unread inbox shortcut, current/upcoming events and course discovery. Use `GET /me/learning` for owned course progress and `GET /me/notifications` for inbox state. Keep independent cards recoverable if one request fails. Do not treat zero enrolled courses as an error: show Explore Courses. Fetch on focus or after an enrollment/completion change rather than assuming local state is authoritative.

Continue Learning navigates to a course workspace and then to an **available** unfinished lesson. Never automatically start/open a lesson merely to prefetch every signed URL or create playback sessions.

## 6. Course catalog page

Use `GET /courses?full=true&limit=50` for current course content and `GET /billing/catalog` for authoritative current fees, joining by course `id` (or by slug only when necessary for website links). There are six current career tracks. Archived earlier courses should not be added back from a local hardcoded list.

Cards: title, short description, duration/level, marked price, discount and final amount; show current enrollment/interest state if known. Search/filter may operate on the fetched small catalog. Handle a missing pricing response independently: show a retry or “View current fee” rather than inventing a zero price.

Selecting a card opens Course Detail with the course UUID, not its display title.

## 7. Course detail / interest / enrollment

Call `GET /courses/{course_id}`. Render description, highlights, phase/week headings, outcomes and certificate/provider details when present. Do not assume every optional section has content.

Actions:

- **I'm interested:** `POST /courses/{id}/interest` with `{}`. Show confirmed success only after response; this creates a signed-in course interest visible to authorized staff. It does not give lesson access.
- **Continue learning:** for a registered/completed course, open its workspace.
- **Demo checkout:** create an owner order as described below. This does not enroll the user.
- **Pilot/free enrollment:** `POST /courses/{id}/register` with `{"source":"mobile"}` is the current prototype registration contract. Only expose this button for the approved pilot/free workflow. Do not present it as payment confirmation or infer an entitlement from price/order state. Final launch enrollment policy needs backend/product approval before real payments.

Refresh My Learning after registration, but do not downgrade a completed registration when a user taps Interested again. A learner cannot access recordings simply because they can view a course's public outline.

## 8. My Learning page

`GET /me/learning` returns owned registered/completed courses, including `id`, `title`, `status`, `registration_status`, `completed_lectures` and `total_recorded_lectures`.

Show title, completed/total recordings, enrollment state and Continue/View Certificate action. Recorded progress is not the same as overall eligibility: exams and attendance can still be required. Show a sensible empty state and pull-to-refresh. Do not calculate completion by counting video cards the user opened.

## 9. Course workspace page

`GET /learning/courses/{id}` returns `course`, `classes` and `completion`. Use `GET /learning/courses/{id}/exams` for published assessment summaries. Suggested sub-tabs: Lessons, Live sessions, Assessments and Completion.

Recorded class row fields: `id`, `title`, `sort_order`, `asset_id`, `video_status`, `duration_seconds`, `watched_seconds`, `resume_seconds`, `completed`, `access_state`, `unlocked_at`, `access_expires_at`, `prerequisite_class_id` and `access_days`.

| Access state | What to show/action |
| --- | --- |
| available | Play/Resume; display access expiry |
| locked | Lock icon and “Complete the previous recording”; disable Play |
| expired | Expired badge; “Contact course staff to reopen access” |
| not_ready | “Recording not published yet”; disable Play |

The first recorded lesson's seven-day window starts when an enrolled student first requests course content. Later windows start on prior completion/publication, not on each login. Communicate this clearly before the user opens a course. Never create all playback sessions in the background.

Live/in-person rows use `start_time`, `end_time`, `zoom_link` or `location`. Add calendar using `GET /courses/{id}/calendar.ics`. Opening a meeting link does not mark attendance; staff imports the attendance report.

## 10. Recorded video player page

1. Request `GET /learning/classes/{id}/playback` only when the user enters the player. It returns `url`, `session_id`, `expires_in`, `access_expires_at`, `duration_seconds` and `resume_seconds`.
2. Play the entire signed URL unchanged. Do not append the API JWT to CloudFront or remove its signing query parameters. Use a player compatible with the app's Expo SDK and MP4 byte-range seeking.
3. Resume from the returned position. Keep maximum playback speed at 1.5×. Serialize progress heartbeats every 15–30 seconds **while playing**, using `POST /learning/classes/{id}/progress` with `{"session_id":"UUID","position_seconds":150}`.
4. Pause heartbeats when paused, backgrounded or disconnected. Do not claim offline watch time. On return, refetch/renew playback if needed and use the new session. One active session per learner/asset prevents parallel credit.
5. Completion is backend-authoritative at 90% unique watched intervals. Seeking to the end or replaying a segment does not manufacture completion. Use the response `completed` and `progress_percentage`; do not set these from a local timer.
6. A 409 session-expired response needs a new playback request; a 410 access-window expiry needs staff help, not endless URL refresh. Signed URLs may last less than one hour near the seven-day deadline.
7. After completion refetch the course progress (`GET /learning/courses/{id}/progress`) and next lesson state. A next-video button must use returned access state, not just index + 1.

Acceptance: pause/resume; kill/relaunch; seek-to-end; repeated segment; token expiry; simultaneous player session; expired window; staff reopening; next lesson unlock; interrupted upload/not-ready asset. Do not cache a signed URL as permanent access.

## 11. Assessments list and introduction

`GET /learning/courses/{id}/exams` returns published exam summaries. Show title, time limit, pass percentage and attempt limits; avoid promising another attempt until the backend permits it. An empty list is valid while content staff prepares assessments.

Before starting, explain duration, connection requirement and that server time decides expiry. `POST /learning/exams/{exam_id}/attempts` with `{}` starts or resumes an owned attempt. Do not call it in background list prefetching: starting can consume an attempt. On 409 show the maximum-attempt/not-ready reason and allow back navigation.

## 12. Exam attempt and result pages

The start/get response includes `id`, `exam_id`, `status`, `started_at`, `expires_at`, `submitted_at`, `pass_percentage`, `max_score`, `score`, `questions`, `percentage` and `expired`. Questions contain server-generated UUIDs and `options:[{id,label}]`; answer keys are not returned.

Persist `{attempt_id, answers}` per user. Derive a countdown from `expires_at`, then correct it by refetching `GET /learning/attempts/{attempt_id}` on resume. The server is authoritative if device time changes. Submission body:

```json
{"answers":{"RETURNED_QUESTION_UUID":"RETURNED_OPTION_ID"}}
```

Submit to `POST /learning/attempts/{id}/submit`; disable while pending, retain the exact attempt ID for safe retry. If connection drops after submit, fetch/retry the same attempt rather than starting a new one. Duplicate submission returns the stored result. Unanswered questions earn zero; expired attempts fail and count toward limits.

Result page shows passed/failed, score/max, percentage and expired reason. Retry calls the start endpoint only after explicit user action; an existing pending attempt resumes. Refetch completion on a pass. Never score in the app or use admin-authored question IDs that were replaced by backend-generated IDs.

## 13. Completion / attendance summary

`GET /learning/courses/{id}/completion` returns `eligible`, `missing_requirements`, `rules`, recorded/live/exam totals and progress. Render each requirement separately. Recorded progress percentage does not include exam or attendance weighting.

Show “Certificate available” only when `eligible=true`. Otherwise explain missing recordings, published exams or live attendance. An empty/unconfigured course cannot issue a certificate. If attendance is missing, explain staff must reconcile/import it; do not fabricate attendance after clicking a Zoom link.

## 14. Certificates list, detail and sharing

Use `GET /me/certificates`. To issue after eligibility, `POST /learning/courses/{id}/certificate` with `{}`; repeated requests return the same record. On 409 refresh missing requirements. Successful issuance marks enrollment completed and adds an inbox item.

Authenticated `GET /certificates/{id}/download` returns a short-lived private PDF URL. Download then share/save with Expo-compatible file/sharing APIs. Refresh the URL when expired; do not store it as a permanent link. Another student's certificate is unavailable; a revoked download returns 410.

Show title/provider/date, certificate ID and verification action. Public QR/browser verification: `https://main.d3revsgd6isklp.amplifyapp.com/verify/?id={certificate_id}`. Native verification may call `GET /certificates/{id}/verify` with `Accept: application/json`; default browser HTML links can redirect to the friendly landing page. Render valid, revoked, missing, malformed and service-error states distinctly. Do not expose learner email or the private PDF URL on a public verification page.

## 15. Notification inbox and detail

`GET /me/notifications` returns owned inbox items with title/body/course ID, created time and read state. Course announcements appear here even while native push is not configured.

Show unread indicator, date and message preview. Opening an item sends `PATCH /me/notifications/{notification_id}` with `{}` and navigates to the course if available. Handle deleted/unavailable courses safely. Another user's notification must never be readable/updatable. Clear this cache on logout.

Native push is a separate delivery channel, not the inbox database. It does not send email, SMS or WhatsApp.

## 16. Device notification setup and settings

The mobile team must provide the actual Expo/EAS project UUID and a physical-device development/release build. Configure notification permission and Android channel; retrieve a real Expo push token with that project ID.

- `POST /me/devices`: `{platform:"android"|"ios",project_id:"UUID",token:"ExponentPushToken[...]"}`.
- `GET /me/devices`: own registered devices.
- `DELETE /me/devices/{device_id}`: remove on opt-out/logout/account switch when possible.

Until the project is configured, registration returns 503. Show inbox normally and a clear push-unavailable state; do not repeatedly prompt for permission. Register changed tokens and deduplicate per device. Notification tap payloads contain navigation IDs; always fetch authorized data after login. Test permission denied, revoked permission, token rollover, logged-out tap, account switch, provider failure and device unregistration. Backend retries/receipt handling exist, but actual delivery is not verified until a real device/project is supplied.

## 17. Demo checkout and payment-link entry

Payments are excluded from the real release. Provide an obvious **DEMO — no charge** banner. Do not request card/bank/UPI data or use a success animation that implies real payment.

From course detail: `POST /billing/orders` with `{"course_id":"UUID","request_id":"NEW_UUID"}`. Keep one request UUID for retries of the same intentional order. The backend returns an immutable title/buyer/marked price/discount/total, status, expiry and checkout URL. Reusing a UUID for a different course returns 409. Do not send customer identity or any price in this body.

A pay-by-link URL is `/checkout?order=UUID` on the web preview. For native deep links, configure approved app linking and route to an owned order after authentication; otherwise open the web preview in the browser and let Cognito authenticate there. **Do not put JWTs in URLs** or assume a browser shares the native login session.

Fetch `GET /billing/orders/{id}`. Show marked price, discount percentage/amount, total INR, status and link expiry. To simulate completion: `POST /billing/orders/{id}/demo-checkout` with `{"action":"complete_demo"}`; cancellation uses `{"action":"cancel"}`. Disable submit while pending; retry the same action/order after uncertain network results. A finalised state cannot be reversed; pending expired links return 410.

A `demo_completed` order does not prove payment and does not grant learning access. Refresh My Learning separately; never force-create enrollment because this response says completed.

## 18. Purchase history / order detail / invoice PDF

`GET /me/purchases` returns the latest 200 owned demo orders, including pending/cancelled/demo-completed records. Show course, date, quoted total and explicit demo status. Open order detail by UUID. Empty history is normal. Current price edits do not rewrite these original quotes.

Invoice download is **binary PDF**, not JSON: `GET /billing/orders/{id}/invoice` with the ID token, then save/share the response bytes. The PDF includes the landing logo, buyer, course, reference, marked price, discount and total. It is marked DEMO/PRO FORMA, not a tax invoice or proof of payment. Do not send an authenticated API URL to an unauthenticated browser and expect a download; use native authenticated fetch/file handling.

Real Paintly checkout, verified webhooks, tax/issuer configuration, paid enrollment and refunds are intentionally deferred. Do not implement or claim them as part of this frontend handover.

## 19. Existing events, QR, polls, materials and profile

Keep the current screens and API payload contracts. Point them at the new account and regression test them; do not replace live event polls with certification exams.

- Events: `GET /events`, `GET /events/{id}`, `POST /events/{id}/join`, `GET /events/{id}/calendar.ics`.
- Attendance: existing QR check-in routes and `GET /attendance`; event attendance and course-class attendance are separate.
- Polls: `GET /polls?event_id=UUID`, poll detail/vote/results routes already in the app's API service.
- Materials: listing/detail/download contracts already in the service; course-linked materials enforce enrollment.
- Profile: existing `/users/me` contracts. Keep analytics/leaderboard routes compatible and handle empty new-account data.

QR payloads are untrusted input: validate recognized formats/IDs and show a confirmation/error, not arbitrary external navigation or local enrollment. Camera denial should provide an alternative or explanation.

## 20. Screen acceptance matrix — required before release

| Journey | Required proof |
| --- | --- |
| Authentication | Fresh signup/verification, reset, expired-token recovery, logout and account switch |
| Access isolation | Two students; interest-only/unregistered cannot view learning; one cannot read other's attempt, certificate, order or inbox |
| Videos | Signed range playback; resume; seek/replay cannot fake progress; next unlock; expiry; staff reset; no offline credit |
| Exams | Pending resume, local answer recovery, server deadline, invalid input, duplicate submit, failed/pass and max attempts |
| Completion | Recorded/exam/attendance requirements independently shown; empty course blocked |
| Certificates | Idempotent issue, authenticated download/share, signed-out verification and revoked state |
| Inbox/push | Inbox without push; read state; permissions denied; real-device push/tap after project configuration |
| Commerce demo | Server quote, stale price snapshot, retry UUID, cancel/expiry, invoice bytes, no automatic enrollment |
| Recovery/layout | Offline/slow network, 429/5xx, app background/kill, font scaling and small-screen layout |
| Existing features | New-account events, QR attendance, polls, materials and profile regression |

Backend tests are evidence for server behavior, not proof that the mobile UI/device tests passed. Provide screenshots/recording plus device/build/config details with the frontend release report.

## 21. Delivery order and outstanding inputs

1. New AWS build environment and auth/profile recovery.
2. Catalog/detail/My Learning and locked/expired states.
3. Protected video/player/progress and live-session schedule.
4. Assessments, completion and certificates.
5. Inbox, then physical-device push using the real EAS project.
6. Demo purchase history/checkout/invoices, preserving existing event features.
7. Device acceptance and EAS/store release by the mobile team.

Needed from stakeholders/content team: actual recordings/questions; pass/attendance/retry policy; course access/pilot-enrollment policy; final certificate wording; named marketing accounts; final admin/student domain. Needed from mobile/store owners: real Expo project UUID, platform build/signing/store access and physical test devices. None of these are invented by the backend.

## 22. Assisted enrollment from marketing

Marketing can now collect the same profile in Course Enquiries and invite the student. Keep self-signup available. Existing users are linked without resetting passwords. Newly invited accounts require first-login password change and their own privacy acceptance. `GET /users/me` includes `privacy_consent_required`; the existing profile screen now prefills saved fields for review. The account can have zero course enrollments while a quote is pending. Individual demo prices and PDFs use existing order contracts; never replace them with the public catalog price or grant local access after demo completion. See `AI4Impact-Assisted-Enrollment-Handover.md` for staff/backend API details and `AI4Impact-Assisted-Enrollment-Eraser.txt` for journey source. Native device QA remains required.


## Student web release — 21 October 2026

The shared Expo app is now hosted at https://main.d26ztc5gxt79re.amplifyapp.com. Landing Student Login opens this portal. Native and web use the same API, Cognito student accounts and profile/consent contracts. Browser invoice downloads and demo-order cancellation have web-specific handling. See `AI4Impact-Student-Web-Portal.md` for Terraform hosting, export/deployment commands and device-testing limits. Four retained QA student accounts cover both student and professional profiles; the QA workbook records the results.

Profile also provides Cognito email verification for invited learners. Use `fetchUserAttributes`, `sendUserAttributeVerificationCode` and `confirmUserAttribute` from Amplify Auth. Do not mark email ownership verified from staff-supplied profile details. Valid-code completion and password-reset delivery require real-inbox acceptance testing.
