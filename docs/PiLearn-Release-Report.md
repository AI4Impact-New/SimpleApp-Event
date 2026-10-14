# PiLearn release report — 14 October 2026

## Deployed backend

Account **767491588787**, Mumbai **ap-south-1**, CLI profile `jm`.
API: https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com
Cognito pool: `ap-south-1_kc1sfOoEG`; app client: `40faprqjpcc6q0pfkdkcrd8p5v`.

New production services: `pilearn-learning`, `pilearn-notifications`. Existing eight Lambda functions updated. RDS remains private with encryption, backups and deletion protection. Migrations `014_learning_platform.sql` and `015_push_notifications.sql` applied; 30 public tables.

Private videos: `pilearn-videos-767491588787`, delivered through `d2x1ojqj7nx5nq.cloudfront.net`, with CloudFront origin access control and trusted signing key group. Certificates: private bucket `pilearn-certificates-767491588787`. Server signing key lives in Secrets Manager. Database password and Terraform state are excluded from Git.

The remote Terraform state uses encrypted/versioned S3 and locking at `pilearn-terraform-state-767491588787/pilearn/production/terraform.tfstate`. Resource changes were additive; the existing RDS instance was not replaced. A Terraform build provisioner was replaced to track actual source hashes.

## Functionality

- Published-course catalog and free enrollment; draft learning content is withheld.
- Enrollment-gated signed MP4 upload/playback, saved resume position, unique watched interval accounting and 90% lecture completion.
- Server-scored timed MCQ exams, attempt limits, immutable question snapshots and owner-only attempts.
- Course completion requirements including class-specific imported attendance.
- Idempotent certificate issue, private PDF download, public verification and audited revocation.
- Learner inbox, owner-only read updates, registered-device API and scheduled durable Expo outbox with retries/receipt handling.
- Admin Learning Studio: content, assessments, learners, completion rules, certificates and public verification page.

Payments are excluded by request. Student app source is unchanged. Native push needs the app team's real EAS project UUID and physical device integration; device registration returns 503 until configured. This is explicitly covered in the frontend handover.

## Validation

Backend tests: **39 passed**. Live AWS checks verified authentication/role boundaries, course registration, signed video range response 206 and unsigned response 403, learner progress completion, class history surviving catalog edits, exam scoring and idempotent submissions, ownership isolation, attendance import, completion eligibility, certificate issue/idempotency/download, public verification, inbox ownership and preservation of completed enrollment.

The live checks caught and fixed regional S3 signed-download redirects and JWT-protected proxy CORS preflight. Final CORS preflight returns 204 without authentication; protected actions still require JWTs. PDF was downloaded from AWS, rendered and inspected visually.

Admin **Next.js 15.5.27** production build passed. Production dependency audit: **zero vulnerabilities**. Playwright passed against the local production build using the live AWS APIs: overview, class authoring, MP4 upload and protected preview, assessment authoring, learner list, completion-rule saving, certificate management, 390px responsive layout, public verification, anonymous login redirect and student denial. No browser runtime/API errors were observed in the passing run. The hosted Amplify check follows its deployment.

## Amplify admin console

App: `pilearn-admin` / `d16744ddqs159z`. Region Mumbai. Production target: https://main.d16744ddqs159z.amplifyapp.com
Repository `AI4Impact-New/SimpleApp-Event`, branch `main`, root `admin-dashboard`, build `npm run build`, output `.next`, buildspec `amplify.yml`, service role `AI4Impact-AmplifyHosting`.

Terraform provisions app/public environment and Cognito redirects. Company GitHub connection must be completed in Amplify; app existence alone does not confirm a live site. AWS hosting access was added to existing IAM user `GayathriAI4`, independently of PiLearn Cognito admin access.

## Frontend handover

Share `PiLearn-Frontend-Handover.md` plus `PiLearn-Learning-OpenAPI.json` with the app team. The sample PDF is a temporary test certificate; its verification ID is removed during cleanup and must not be treated as a real qualification.
