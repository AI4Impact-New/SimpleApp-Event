# Programme+ deployment and live QA

Release: PR #41, merge commit `90287d40f6530c9fa7b30bd78aa6d49c25632cb4`.

## Deployment

- Applied additive database migration `021_programme_platform.sql` through a temporary VPC-connected Lambda using the existing Secrets Manager database credential reference.
- Verified RDS point-in-time recovery and created snapshot `pilearn-pre-programme-20261103` (available).
- Applied the reviewed Terraform plan: 43 additions, 10 updates, and replacement of the local Lambda packaging marker. The existing RDS instance was retained.
- Enabled the Programme notification relay, queue consumers and receipt schedule. The legacy dispatcher exits when this relay is enabled.
- Real transactional email remains disabled. No Resend API or webhook secret values were supplied or changed.
- Admin Amplify deployment 41 and landing deployment 37 succeeded for the merge commit. Student portal deployment 6 succeeded and its hosted release manifest matched that commit.
- Follow-up Terraform plan reported no changes.

Live origins:

- Admin: https://admin.ai4impact.in
- Landing: https://www.ai4impact.in
- Student: https://main.d26ztc5gxt79re.amplifyapp.com
- API: https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com

## Test boundaries

The live suite uses real Cognito authentication, live HTTP APIs, PostgreSQL, notification schedules/SQS, private S3 documents, and the deployed browser applications. It does not mock API responses. Five synthetic accounts and a temporary QA course isolate the writes. Account creation suppresses Cognito invitation emails and uses `example.invalid` addresses.

The webinar QA campaign uses a one-hour display delay and a five-minute publication window. A browser-only timer accelerator makes that campaign visible in the QA browser; other website visitors cannot reach its display delay before expiry. The campaign is cancelled in a `finally` block. Existing public campaigns cause this test to skip rather than replacing their configuration.

The suite requires both `QA_LIVE_CONFIG` (a protected local JSON file) and `QA_LIVE_WRITES=1`. CI does not provision production fixtures or enable these writes. Use a fresh isolated course and accounts for a complete run; internship completion and immutable exam history deliberately persist until QA cleanup.

The fixture JSON contains `run`, `course_id`, and `accounts` entries for `admin`, `teacher`, `student`, `other`, and `outsider`. Each account needs an email, password, real Cognito token set (`tokens.IdToken`), and backend profile ID. The run identifier must be unique. Never commit that file, copy its contents into chat, or attach unredacted browser traces. The course name is `QA Programme validation <run>` and the teacher must be assigned to that course. Profiles may be new: the student browser test completes its profile and privacy-consent flow.

Run from the repository root, using the installed Playwright CLI:

```sh
QA_LIVE_CONFIG=/secure/local/qa-fixture.json QA_LIVE_WRITES=1 \
  node admin-dashboard/node_modules/@playwright/test/cli.js test \
  admin-dashboard/tests/programme-live.spec.ts --workers=1 --reporter=json
```

Use a protected output destination. Test accounts, data and private objects must be cleaned after a live run. SQL cleanup must validate the unique run prefix, synthetic account domain and QA course ID before deleting any rows. If any real learner enrolled in the QA course, preserve that course and investigate rather than deleting their enrollment.

## Coverage

| Scenario | Evidence checked |
|---|---|
| Authentication and authorization | Anonymous request rejected; student administrator access rejected; unenrolled access rejected; course-scoped educator access accepted |
| Admin session authoring | Real browser sign-in, saved form, UTC conversion, reload persistence, private meeting link |
| Educator workspace | Real sign-in; administrator-only sections hidden; scoped booking tools available |
| Last seat | Concurrent learners produce one booking and one conflict; duplicate request returns the same booking |
| Ownership and refunds | Another learner cannot export a booking calendar; cancellation refunds once; UTC calendar content |
| Rescheduling | Atomic credit transfer and stable replay of the reschedule request |
| Invalid scheduling input | Educator overlap, missing timezone offset, unsafe meeting URL and student modification rejected |
| Recruitment | City/mode/type filters, explicit sharing consent, duplicate application, ownership, manual stage history, withdrawal and archive |
| Programme access | Administrator revocation/restoration enforced by the API; student credit adjustment rejected |
| Notification preferences | Email opt-out, quiet hours, marketing opt-out and disabled external email reflected in live responses |
| Webinar | Deployed overlay and registration form, private join URL excluded, deduplicated registration, pause/cancel and closed registration |
| Scheduled inbox | Queued announcement reaches enrolled QA learner through the live dispatcher; outsider inbox excludes it |
| QR attendance | Admin renders an actual QR PNG and matching payload; live check-in succeeds; duplicate, unknown and future-event check-ins rejected |
| Student/internship | Student sign-in/profile/consent, exam UI submission and server scoring, screening prerequisites, mentor review/replay conflict, private certificate and letter PDFs, document ownership |
| Credit/cancellation edges | Concurrent requests for the final credit; cancellation inside 24 hours consumes the credit; staff cancellation refunds it; booking too close to start rejected |

Final live run: **14 passed, 0 failed, 0 skipped, 0 flaky** in 94.3 seconds. The sanitized Playwright result summary is stored in `PR41-live-results.json`. The release also passed 249 backend tests and 18 existing admin/landing browser regressions before deployment. Earlier test-harness assertions were corrected for legitimate HTTP 201 creation/204 deletion responses and React Navigation's hidden cached screens. These were test assumptions, not production defects.

## Cleanup and observation

- Removed the QA course, bookings, credits, applications, employers/jobs, exam attempts, internships, notification records, webinar registrations, certificates and recommendation letters.
- Removed the five synthetic backend profiles and Cognito users, QA document object versions, and the temporary migration/cleanup Lambda and its log group. The production schema and infrastructure remain.
- Sampled the three notification workers over a 30-minute window: no Lambda errors or throttles. No API Gateway 5xx access-log entries were found in the sampled window.
- Test-only fixes covered correct API status codes, hidden React Navigation screens and deterministic slot dates; the final production run required no application-code hotfix.

## Limits

This is bounded regression evidence, not a guarantee covering every possible edge case, device or load level. Production email delivery/bounce/complaint handling still needs Resend access, verified sender/Reply-To, webhook signing secret and an authorized recipient. Native device push, physical camera scanning, external AI services, real payment collection and sustained load testing are outside this live run. Provider failure/retry/webhook-signature behavior is covered by isolated backend tests without sending real email.
