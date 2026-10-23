# AI4Impact — master frontend handover

**Baseline: 21 October 2026.** Start here; this supersedes historical status statements in earlier handovers. Backend/admin console: Siddartha. Native frontend integration/device acceptance: mobile team. The student web portal is the shared Expo application, not a separate backend.

## Applications and environment

| Application | URL | Source |
|---|---|---|
| Public website | https://www.ai4impact.in | `landing-page` |
| Staff console | https://admin.ai4impact.in | `admin-dashboard` |
| Student web portal | https://main.d26ztc5gxt79re.amplifyapp.com | `mobile-app` |
| Android/iOS | Shared Expo source; device acceptance pending | `mobile-app` |

```dotenv
EXPO_PUBLIC_API_URL=https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com
EXPO_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_kc1sfOoEG
EXPO_PUBLIC_COGNITO_APP_CLIENT_ID=40faprqjpcc6q0pfkdkcrd8p5v
EXPO_PUBLIC_COGNITO_REGION=ap-south-1
```

No `/api` prefix/stage suffix. Send Cognito **ID token** as `Authorization: Bearer <idToken>` on authenticated requests. Use Amplify session refresh; retry authentication once on 401, never loop. Logout clears user-specific query caches and removes registered devices. Profile type (`student`/`professional`) is not permission role. Cognito groups are `Admins`, `Marketing`, `Students`.

## Current implementation and remaining frontend work

These are source/integration statuses, not native-device certification. Review the existing screens before building duplicates.

| Journey / existing screens | Backend | What exists | Frontend work remaining |
|---|---|---|---|
| Landing enquiry | `POST /enquiries`, `POST /employer-enquiries` | Live forms persist to marketing inbox | Preserve consent, request UUID on retry, loading/error/success; no automatic booking promise |
| Assisted onboarding | `/admin/enquiries/{id}/assisted` and account/invite/quote actions | Staff collect details/authorization, create/link Cognito account; default invitation works | Student frontend handles invited first-login; no staff account controls in student app |
| Signup/confirmation | Amplify Cognito signup/confirm/resend | `SignUpScreen`, `ConfirmSignUpScreen`; self-service preserved | Native code entry, retries, wrong/expired codes |
| Login/temporary password | Cognito sign-in, `NEW_PASSWORD_REQUIRED` | `LoginScreen`: forced own-password challenge | Native keyboard/password validation; neutral incorrect-credential error |
| Password recovery | Cognito reset/confirm reset | `ForgotPasswordScreen`; real-inbox successful reset tested on web | Native flow/expired codes and navigation |
| Profile/consent | `GET/PUT /users/me`, `POST /users/me/privacy-consent` | `CompleteProfileScreen`, `ProfileScreen`, `EditProfileScreen`; staff details prefilled, own consent required | Student/professional conditional fields, no cross-user cache leakage |
| Email ownership | Amplify fetch/send/confirm attribute verification | `VerifyEmailNotice` on Profile; real verification/recovery tested | Native resend/error/verified state; never assume ownership from staff-entered email |
| Catalog/detail/interest | `GET /courses?full=true&limit=50`, `GET /courses/{id}`, `POST /courses/{id}/interest` | `CoursesScreen`, `CourseDetailScreen`; signed-in interest separate from public lead | Correct price/access CTAs, empty/error/loading, idempotent interest |
| My learning/course | `GET /me/learning`, `GET /learning/courses/{id}` | `MyLearningScreen`, `CourseLearningScreen` | Native locked/expired lessons, live links/location and refresh |
| Recorded video | Playback/progress below | `LecturePlayerScreen`: saved position, signed URLs, progress heartbeats, renewal | Real-media device matrix below; no local fake completion |
| Exams | Published exams and owned attempt APIs | `ExamScreen`; server scores and enforces attempt lifecycle | Interrupt/resume/deadline/network cases on native |
| Certificates | Eligibility/issue/list/download/public verify | `CertificatesScreen`, `VerifyCertificateScreen`, course completion controls | Native authenticated PDF share, camera/QR, invalid/revoked states |
| Notification inbox | `GET /me/notifications`, `PATCH /me/notifications/{id}` | `NotificationsScreen`, `NotificationDetailScreen` | Native read state and course navigation; inbox does not prove push |
| Push devices | `POST/GET /me/devices`, `DELETE /me/devices/{id}` | Backend registration contracts available | **Real EAS UUID missing**; permissions/token registration, background/cold-start and logout cleanup |
| Demo checkout | Owned order endpoints below | `CheckoutScreen`; explicit demo result, web cancellation | Native acceptance; real gateway deferred |
| Purchase history/PDF | `GET /me/purchases`, invoice endpoint | `PurchasesScreen`; browser Blob download/native sharing | Native share acceptance; demo is never represented as paid/access-granting |

## Video progress and resume — exact integration contract

### Open playback

`GET /learning/classes/{class_id}/playback`:

```json
{"url":"temporary signed MP4 URL","session_id":"UUID","expires_in":3600,"access_expires_at":"ISO timestamp or null","duration_seconds":600,"resume_seconds":123.4}
```

Load signed URL, wait for media readiness, then seek to `resume_seconds`. Current shared player restarts at zero if saved position is within the last two seconds of the end, otherwise restores the saved position. URL lifetime can be shorter than 3600 seconds near window expiry. Never persist signed URLs as permanent course assets.

### Persist progress

`POST /learning/classes/{class_id}/progress` body:

```json
{"session_id":"UUID","position_seconds":143.4}
```

Response:

```json
{"class_id":"UUID","watched_seconds":120,"duration_seconds":600,"completed":false,"progress_percentage":20}
```

- Existing player saves every **20 seconds while playing**, plus pause, exit, background and end. Requests serialize; newest pending position follows an in-flight request.
- Resume position differs from time watched: a learner can have 120 credited seconds and resume at 40 after rewinding.
- Backend merges unique watched ranges and validates elapsed server time. Seeking does not credit skipped segments; replays do not increase unique credit. **90% unique credit** completes the recording.
- One active learner/video session prevents parallel credit. Session 409: get fresh playback and continue at current position. Respect locked/unavailable/expired responses.
- Seven-day lesson windows and sequential unlocking are server-controlled. Refresh `GET /learning/courses/{course_id}/progress` (`{classes,completion}`) after final save/on returning to course. Staff reset reopens a window without bypassing previous-lesson requirements.
- Hard process/browser kill can lose the last unsent interval (normally up to one heartbeat interval, longer offline). Promise resume from the last **successful server save**, not frame-perfect recovery after force kill.
- Recording replacement resets its watch progress. Admin preview is not student completion evidence.

### New admin analytics

**Learning Studio → course → Learners → Video viewing analytics.**

`GET /admin/courses/{course_id}/video-analytics` returns:

- `videos`: each published video's `class_id`, `title`, `duration_seconds`, `students_started`, `students_completed`, `watched_seconds`.
- `students`: empty until a video is selected.
- `total_students`, `student_limit` (500).

`GET /admin/courses/{course_id}/video-analytics?class_id={class_id}` also returns learner rows: `user_id`, `name`, `email`, registration `status`, `watched_seconds`, `resume_seconds`, `progress_percentage`, `completed`, nullable `last_progress_at`, `total_students`.

Started = positive credited watch time, not opening a URL. Summaries cover all progress linked to course registrations; historical dropped registrations remain visible. Detail includes not-started students with zeros, is capped at 500 and displays actual total. Minutes are unique credited video time **per learner**, summed across learners, not replay-inclusive engagement duration. Last saved is not online presence. Refresh metrics to see new saves; no automatic live polling. Course/recording mismatch returns 404. Only Admins can view this contact/progress data; Marketing and Students cannot. Existing proxy routes/DB tables support the endpoint; no new infrastructure/schema.

## Other student API contracts

| Action | Endpoint |
|---|---|
| Published exams | `GET /learning/courses/{id}/exams` |
| Start/resume attempt | `POST /learning/exams/{id}/attempts` |
| Restore owned attempt | `GET /learning/attempts/{id}` |
| Submit answers | `POST /learning/attempts/{id}/submit` |
| Completion requirements | `GET /learning/courses/{id}/completion` |
| Issue eligible certificate | `POST /learning/courses/{id}/certificate` |
| Own certificates | `GET /me/certificates` |
| Authenticated PDF URL | `GET /certificates/{id}/download` |
| Public certificate result | `GET /certificates/{id}/verify` |
| Inbox/mark read | `GET /me/notifications`; `PATCH /me/notifications/{id}` |

Server owns scores, deadline/attempt rules, eligibility and access. Never expose answer keys or another learner's resources. Announcements create enrolled learners' inbox entries; native push needs real-device configuration.

## Personal quotes, checkout, invoices and history

| Action | API / body |
|---|---|
| Prices | `GET /billing/catalog` |
| Create owned order | `POST /billing/orders` with `{course_id,request_id}` |
| Saved owned quote | `GET /billing/orders/{id}` |
| Demo action | `POST /billing/orders/{id}/demo-checkout` with `{action:"complete_demo"}` or `{action:"cancel"}` |
| Own history (includes assisted quotes) | `GET /me/purchases` |
| Authenticated binary PDF | `GET /billing/orders/{id}/invoice` |

Amounts use integer paise; preserve backend discount/rounding. Stable request UUID per intentional order, including network retries. Pending/demo-completed/cancelled states are not verified settlement. Changed-payload retry/final-state reversal can return 409; expired pending links 410. Refresh order after action. Web fetches authenticated PDF into Blob; native uses sharing helper. **PDFs are DEMO / PRO FORMA, not final paid/tax invoices; demo checkout never grants enrollment.**

Live gateway/webhooks, refunds and tax/final invoice policy remain deferred. Never grant access based on a browser success redirect. Quote/invoice email remains gated by Resend sender verification and API key setup; default Cognito invitations, verification and recovery are separate and proven through a real inbox.

## Native acceptance checklist

1. Self-signup and invited first login; own password; wrong/expired codes; verified recovery; student/professional fields; own consent.
2. Learner A logout → learner B login: no stale profile, invoice, enrollment or progress.
3. Real MP4: watch ≥40 seconds, pause/exit, reopen at saved point. Compare admin watch credit/resume position with server response.
4. Rewind/replay without inflated credit; seek to end without completing; reach 90%, refresh and verify next unlock.
5. Offline/reconnect, background/foreground, force kill, URL renewal, simultaneous session, access expiry and staff reset. Handle blocked/retry states accurately.
6. Assessment interruption/resume/deadline; certificate eligibility/PDF/QR and invalid/revoked states; real camera permissions.
7. Inbox state/course navigation; after EAS UUID configuration, push open/background/killed and logout token removal.
8. Demo retries, discounts, cancellation/completion/expiry, own history, PDF share and no course unlock from demo.
9. Native safe areas/keyboards/accessibility, loading/empty/error/retry and long content. Retained QA accounts must remain until Siddartha requests cleanup.

## Remaining work and ownership

| Item | Owner/gate |
|---|---|
| Resend domain verification and sending key, enable quote/PDF mail and prove delivery | Backend + domain owner |
| Expo/EAS UUID, native builds and push/device acceptance | Mobile team supplies UUID; backend configuration and team device tests |
| Real gateway, tax/refund policy | CEO/payment stakeholders, then backend/frontend |
| Approved videos, assessments, prices, access and certificate rules | Course owners/CEO; staff configure |
| Portal publishing automation | Artifact publishing is documented/manual; no automatic GitHub portal release configured |

Detailed references: `AI4Impact-Mobile-Screen-Implementation-Guide.md` (page specs), `AI4Impact-Assisted-Enrollment-Handover.md` (staff onboarding), `AI4Impact-Student-Web-Portal.md` (Terraform/export/publish), `AI4Impact-Frontend-Handover.md` (historical API examples). Older statements saying mobile source is unchanged, no checkout exists, the admin preview is the main student portal, or valid real-inbox recovery remains untested are superseded by this baseline.

## Existing event features retained

The older event experience is still in source; it is not replaced by Learning Studio. These paths were not part of this video's native acceptance release and need regression testing when the mobile team ships them.

| Existing screens | Existing client API calls | Team acceptance |
|---|---|---|
| `HomeScreen`, `EventsScreen`, `EventScreen` | `GET /events`, `GET /events/{id}` | Published/visibility filters, navigation and unavailable event |
| `QRScannerScreen`, attendance | `POST /events/{id}/join`, `GET /attendance` | Real camera permissions, valid/invalid event QR, duplicate join; distinct from certificate QR verification |
| `PollScreen` | `GET /polls?event_id=...`, `GET /polls/{id}`, `POST /polls/{id}/vote` with `{option_id}`, `GET /polls/{id}/results` | Open/closed poll, repeated vote, permitted results |
| `MaterialsScreen` | `GET /materials?event_id=...`, `POST /materials/{id}/download` | Authorized material access, signed download expiry and native download |
| `LeaderboardHomeScreen`, `LeaderboardScreen` | Existing event analytics client uses `GET /events/{id}/analytics` | Verify actual learner permissions/data on device; screen presence is not proof of current production acceptance |

Use `mobile-app/src/services/api.ts` and screen hooks for exact response wrappers; event-era APIs may wrap arrays whereas new learning APIs return direct arrays/objects. Do not remove these pages as part of the learning integration without product approval.

## Staff sign-in on the admin domain

The admin console now uses an embedded Amplify/Cognito email/password form at `https://admin.ai4impact.in/login`. Normal sign-in, temporary-password setup, email confirmation, password reset and sign-out stay on that origin. Cognito remains the authentication service; its HTTPS API requests do not change the address bar. Existing Admins/Marketing authorization and student accounts are unchanged. No new DNS, SES approval or AWS resource is needed for this UI change because the existing client already supports SRP sign-in. Legacy OAuth callback handling remains available for previously issued links, but normal sign-in does not initiate hosted login. The student web/mobile login integration is unchanged.

## Staff console refinement and access controls

See `AI4Impact-Staff-Management.md`. The dashboard uses actual learning totals and links straight to each course's Video metrics tab. The Admin Users directory combines administrator/marketing memberships with guarded role removal and typed-email sign-in account deletion. Historical application records are preserved; issued JWTs can retain access until expiry. These are staff-only APIs/UI owned by Siddartha; the student team does not need a duplicate implementation. Playback/resume and student API contracts are unchanged.

### PR 21 — student resilience review

- On a network failure while saving lecture progress, pause playback and show a connection message. Recovery probes are serialized; reconnecting opens a fresh playback session at the paused position and leaves playback paused for the learner to resume. Disconnected time is not replayed as heartbeat credit.
- Browser alerts preserve all named actions, including View certificates / OK, and cancellation does not submit exams or cancel orders.
- Rotated push tokens remove the old registration first. A non-404 cleanup failure keeps the stored registration and reports a retryable error. Live native push still needs the EAS project configuration and device acceptance testing.
- Amplify student builds use the existing typecheck and export:web scripts. The duplicate service storage import forwards to the canonical storage utility.
- `npm run test:resilience` in mobile-app covers offline recovery, browser actions and push rotation failures; it also runs in release CI. Landscape fullscreen still requires physical iOS/Android verification.


### Resend transactional delivery (23 October 2026)

Quote emails now use Resend with the existing branded HTML, plain text, demo link and attached pro forma PDF. The route and request payload are unchanged. The UI shows Resend setup readiness rather than SES approval. Sending stays disabled until configuration and real inbox testing. Welcome/invitation, verification and reset emails remain on Cognito default delivery; this switch does not change authentication.

Provider acceptance is not inbox delivery. A network timeout or invalid success response keeps the action pending/uncertain for review; the UI must not claim it was sent or automatically generate a fresh request ID to resend. See `AI4Impact-Resend-Setup.md` for activation and operator steps.
