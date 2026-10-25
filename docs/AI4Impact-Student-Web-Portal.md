# AI4Impact student web portal

The same Expo application now serves native mobile and browser students.

Student web URL: https://main.d26ztc5gxt79re.amplifyapp.com
AWS Amplify app: d26ztc5gxt79re. Branch: main. Region: ap-south-1.

## Deployment

Hosting, SPA fallback and response headers are managed in `infra/terraform/student-portal.tf`. No custom domain is required for this release. The existing API and Cognito student accounts are shared with the native application. Email/password sign-in uses the Cognito SDK directly, so the portal does not need an OAuth callback entry.

This app uses artifact deployments rather than a GitHub connection. Infrastructure changes use the existing Terraform plan/apply procedure. To publish web code from a tested checkout:

```bash
cd mobile-app
npm ci
npm run typecheck
npm run export:web
cd ..
python3 scripts/deploy_student_portal.py --profile jm --region ap-south-1 --wait
```

The export writes public `release.json` provenance. The deployment script rejects an export from a dirty or different commit before contacting Amplify. `--wait` checks the job result and confirms the hosted manifest matches the deployed commit. If local Terraform state/output access is unavailable, explicitly pass the existing app ID with `--app-id d26ztc5gxt79re`.

GitHub CI checks TypeScript, resilience tests, the web export and browser regressions for profile refresh and exam confirmation. It does not automatically publish the portal: after merging, rebuild from the clean merged commit, publish it, and verify `https://main.d26ztc5gxt79re.amplifyapp.com/release.json`. An admin/landing deployment does not update the separately deployed student app. Deployment credentials and artifact-upload URLs are never bundled in the website or checked into Git.

The public build configuration uses `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_APP_CLIENT_ID` and `EXPO_PUBLIC_COGNITO_REGION`. These identifiers are public configuration. Never add AWS credentials to an EXPO_PUBLIC variable.

## Student journey

Landing-page Student Login opens the portal. Students can use an existing password or their invitation's temporary password. Invited students choose a new password, review the prefilled profile and accept the privacy policy themselves. A new account starts with no course enrollment. Demo checkout never grants access.

The admin welcome page sends authenticated learners to this portal and staff to the dashboard. Personal quotes appear in the student's purchase history. PDF downloads use authenticated browser fetches on web and the native share sheet on devices.

## Account email verification

Invited accounts can be confirmed while their email attribute is still unverified. Profile now offers Send verification code and Verify email using Cognito directly. Students must enter the code from their own inbox to enable email-based password recovery. Staff authorization is not email ownership verification, and the app does not mark an email verified administratively.

## Tested scope and limits

The QA report records four real landing enquiries, two student and two professional profiles, Cognito account/group checks, browser login/password challenges, profile/consent persistence, quotes/PDFs and authorization checks. Synthetic QA accounts remain available until Siddartha requests deletion.

Browser QA does not replace Android/iOS device acceptance. Native camera, native video background behavior and push delivery need device testing and the Expo project UUID. SES automatic quote mail remains disabled pending identity verification, production approval and feedback testing. Real payments remain deferred.

Valid verification-code entry and password-reset completion require a real inbox. QA simulator addresses do not expose OTP messages. Code submission and invalid-code handling were tested against Cognito; do not report those as proof of inbox delivery or completed recovery.
