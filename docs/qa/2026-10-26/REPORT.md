# AI4Impact browser and backend QA — 26 October 2026

> Historical baseline captured before the remediation PR. Deployment and retest results are recorded on that PR.

Source: `main` at `5180020ceec36a9374adc164b3aea5e33f1e1253`.
Environment: AWS account `767491588787`, `ap-south-1`, profile `jm`.

## Outcome

Broad browser, API and regression validation completed. Two functional defects are confirmed: the hosted student app cannot submit an exam through its confirmation action, and the current-source profile screen does not refresh immediately after saving edits. There are also dependency-audit findings, expired marketing content and non-blocking video promise errors. This is not an assertion that every possible screen state or endpoint edge case has been tested.

No application code, existing user credentials, Terraform resources or hosting deployments were changed. Temporary QA infrastructure and records were created and removed as described below. This report and its evidence are new local files; they have not been committed or pushed.

## Tested environments

| Surface | Target | Method |
|---|---|---|
| Admin | https://main.d16744ddqs159z.amplifyapp.com | Real Cognito login and real API reads; existing regression tests intercept API mutations |
| Student, hosted | https://main.d26ztc5gxt79re.amplifyapp.com | Real Cognito login, API calls, MP4 playback, progress, exam-start and submit reproduction |
| Student, current source | Local production web export at `http://127.0.0.1:8765` | Real Cognito login and AWS APIs; disposable course used for recordings, exam and certificate |
| Public website | https://www.ai4impact.in | Desktop/mobile page sweep; certificate verification against real API; contact-form requests intercepted |
| Backend | https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com | Anonymous/admin/marketing/two-student authorization and disposable-fixture HTTP checks |

Playwright used headless Chromium on macOS, including desktop width 1440 and mobile width 390. A resized browser is not a physical iPhone or Android device.

## Confirmed findings

### 1. High — hosted student exam submission is blocked

Reproduction: sign in as a learner, open an enrolled course and its assessment, start/resume the exam, choose an answer, then click `Submit (1/1 answered)`.

Observed: the screen stays on the question; no confirmation dialog appears and no `/learning/attempts/{id}/submit` request is sent. A second dedicated reproduction recorded zero dialog events, zero submission requests and a still-visible Submit button. See `hosted-exam-repro` in [results.json](results.json) and [the hosted screenshot](hosted-exam-submit-blocked.png).

The deployed student script is `AppEntry-902785af3c26491cd0753e919c74182f.js`. It lacks the named-action browser-alert implementation and `clock_offset_ms` code present in this checkout. Amplify's most recent student job was successful on 21 October, but its artifact deployment does not record a commit. Admin and landing deployments match the 23 October checkout; student deployment success does not prove source parity.

The freshly exported current source, against the same Cognito pool, backend and QA course, successfully displayed confirmation, submitted answers, received `Passed`, issued a certificate and navigated to My certificates. The existing `mobile-app/src/utils/webAlert.ts` shim is present in that build.

Next action: publish the validated current-source student artifact using the existing deployment procedure, then repeat hosted acceptance checks. No deployment was performed during this QA task.

### 2. Medium — profile displays old details immediately after saving

Environment: current-source local production export with live AWS API.

Reproduction: Profile → Edit Profile → change name → Save Profile. The update succeeds and returns to Profile, but the displayed name remains the previous value. Reloading and reopening Profile displays the saved value. The behavior was reproduced, and the backend profile read confirmed persistence.

`ProfileScreen.tsx` loads data on mount, while the retained navigation screen remains mounted during editing; `EditProfile`'s `onSaved` callback only goes back. Refresh the profile on navigation focus or propagate saved profile state to the retained screen. Keep the existing unsaved-change confirmation behavior: both cancellation and confirmed discard passed.

Evidence: `profile-results` in [results.json](results.json) and [post-save screenshot](profile-stale-after-save.png). The screenshot uses a disposable QA identity, not a customer.

### 3. Dependency audit — review before the next release

`npm audit --omit=dev --json` against the checked-in lockfiles reported:

| Package workspace | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|
| Admin | 1 | 0 | 0 | 0 |
| Student | 1 | 18 | 8 | 1 |

Admin's flagged direct dependency is Next.js 15.5.27. The registry associates it with [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) and [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r). Student findings include Axios and transitive Expo tooling; the critical student package is `shell-quote`.

These are registry audit findings, not demonstrated exploitation. Even with `--omit=dev`, Expo's dependency graph includes build tooling; this does not establish that every flagged package executes in the exported browser bundle. Review applicability and compatible patched versions, update lockfiles, then rerun builds and regression tests. No forced dependency upgrades or exploit probes were performed.

### 4. Medium — expired homepage promotion and placeholder support phone

The live public banner still advertises `Free webinar this Sunday · Sun, 11 Oct, 11:00 AM – 1:00 PM IST` on 26 October. The text is in `landing-page/src/content/site.ts`.

The guidance section exposes `+91 00000 00000` as a telephone link, matching the source's temporary-number TODO in `GuidanceSection.tsx`. Update these with approved current marketing/contact details.

### 5. Low — uncaught media play promise errors

Opening/playing each QA recording emitted `The play() request was interrupted by a new load request` page errors in both hosted and current-source exports. Playback, range fetching, watched credit, sequential unlocking and completion still worked. Investigate source-replacement/play promise handling in the Expo web player; do not interpret the passing media checks as a zero-console-error result.

The separate 94-check page sweep did not encounter these errors because it did not play recordings.

## Validation results

| Suite | Result | Evidence boundary |
|---|---|---|
| Python backend tests | 202 passed | Local tests; no production DB assertions implied |
| Existing admin Playwright regressions | 11 passed | Hosted UI, intercepted API/Cognito responses and synthetic JWTs; covers embedded sign-in/recovery, routing, enquiry workspace, video analytics and staff controls |
| Student resilience tests | 8 passed | Local tests for offline recovery, browser alerts, push-token handling, identity storage, date display, links and exam clock offset |
| Student TypeScript | Passed | Current checkout |
| Admin production build | Passed | Current checkout, correct API URL provided |
| Student static web export | Passed | Current checkout; this export was then browser-tested locally |
| Landing static production build | Passed | `AMPLIFY_LANDING_EXPORT=true` |
| Desktop/mobile page sweep | 94 checks; no JS errors, failed HTTP responses or root horizontal overflow detected | Public site, staff routes, course detail/edit/learning screens and anonymous/Marketing guards; not a visual design audit |
| Basic live API assertions | 86 passed | Authentication, role restrictions, validation, purchases, invoice isolation, demo-order retries and no enrollment from demo checkout |
| Disposable learning/media checks | 25 passed | Course/class/exam setup, role boundaries, private upload, signed range 206, unsigned 403, sequential lock and early-certificate denial |
| Event/poll checks | 19 passed | Event lifecycle/calendar, attendance and duplicate rejection, poll/vote/results, admin analytics, denied student deletion and fixture deletion |
| Certificate checks | 14 passed | Issue idempotency, PDF download signature, cross-user denial, public verification without email, revocation and revoked-download denial; includes public browser views |
| Current-source student journey | 11 steps passed | Real login, tabs, enrolled course, both recordings/progress, timed exam, passing score, certificate issue/navigation |
| Extra profile/purchase journeys | 3 passed, 1 failed | Confirm/discard edits, persistence after reload and purchase-history notice pass; immediate refresh fails |
| Public form journeys | 2 passed | Consent gating, recoverable failure, stable retry UUID and success; API responses intercepted, so no live leads or messages created |

Additional live checks confirmed anonymous dashboards redirect to login, Marketing is redirected away from administrator pages, student/Marketing APIs cannot manage staff, an administrator cannot delete their own sign-in, and another learner cannot read or finalize a learner's demo order. API Gateway CORS preflight works without a token.

The disposable MP4s were generated locally. Their real CloudFront delivery and playback were tested; no existing course videos were replaced. A certificate PDF returned HTTP 200 and a valid `%PDF` signature; PDF page layout was not separately rendered or certified by this QA run.

Screenshots: [current-source certificate screen](student-certificate-current-source.png), [public revoked-certificate screen](certificate-revoked-public.png). Their QA certificate IDs have been removed during cleanup and are not real qualifications.

## Cleanup — verified

Four run-specific Cognito identities were created with suppressed invitations: administrator, Marketing, learner and a second learner for isolation checks. No real account password was changed and no invitation, recovery message, quote email or push notification was sent by this run.

Cleanup removed and verified:

- Four Cognito accounts, globally signed out before deletion.
- Four corresponding database user profiles and their dependent QA records.
- One disposable demo order and the disposable course/classes/exam/progress/certificate records.
- Three owned S3 object versions: two MP4s and one certificate PDF, including version checks.
- The temporary event and poll through their own delete APIs (HTTP 204).
- A narrowly scoped temporary VPC cleanup Lambda and its log group.
- Local credential and browser-session files.

A second database-cleanup invocation found zero remaining QA users/orders. See [cleanup.json](cleanup.json). Existing catalog content, retained QA accounts from earlier releases and real staff/customer records were preserved.

## Limits and remaining acceptance work

- Native Android/iOS builds, camera permissions/QR scanning, APNs/FCM, background playback, native calendar/share sheets and physical-device layout remain untested.
- Real inbox OTP receipt, password-reset delivery and invitation delivery were not tested. Existing admin browser recovery tests use intercepted Cognito responses.
- Native push lacks the configured Expo project ID; automatic quote delivery is disabled. No Resend delivery acceptance was attempted.
- Real payment processing is not implemented; demo checkout tests do not demonstrate real settlement.
- No load/stress test, exhaustive accessibility audit, penetration test, database restore rehearsal or Terraform drift plan was performed.
- No production account deletion or role mutation was tested against real staff. Dangerous success paths are covered by the existing intercepted browser tests and backend tests.

## Reproduction commands

From repository root, using Python 3.12 and a Node runtime compatible with the lockfiles:

```bash
python -m pytest tests -q
cd admin-dashboard
npm ci
QA_ADMIN_URL=https://main.d16744ddqs159z.amplifyapp.com npx playwright test tests/assisted-enrollment.spec.ts tests/video-analytics.spec.ts tests/embedded-login.spec.ts tests/workspace-staff.spec.ts --workers=2
NEXT_PUBLIC_API_URL=https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com npm run build
npm audit --omit=dev
cd ../mobile-app
npm ci
npm run typecheck
npm run test:resilience
npm run export:web
npm audit --omit=dev
cd ../landing-page
npm ci
AMPLIFY_LANDING_EXPORT=true npm run build
```

The authenticated fixture checks require newly provisioned disposable accounts and records. This report deliberately contains no passwords, JWTs, AWS credentials, presigned URLs or reusable authenticated sessions.
