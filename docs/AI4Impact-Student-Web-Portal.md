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
python3 scripts/deploy_student_portal.py --profile jm --region ap-south-1
```

The script prints the job ID. Verify its status with `aws amplify get-job`. GitHub CI checks the student TypeScript build and web export, but does not automatically publish the portal. Deployment credentials and artifact-upload URLs are never bundled in the website or checked into Git.

The public build configuration uses `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_APP_CLIENT_ID` and `EXPO_PUBLIC_COGNITO_REGION`. These identifiers are public configuration. Never add AWS credentials to an EXPO_PUBLIC variable.

## Student journey

Landing-page Student Login opens the portal. Students can use an existing password or their invitation's temporary password. Invited students choose a new password, review the prefilled profile and accept the privacy policy themselves. A new account starts with no course enrollment. Demo checkout never grants access.

The admin welcome page sends authenticated learners to this portal and staff to the dashboard. Personal quotes appear in the student's purchase history. PDF downloads use authenticated browser fetches on web and the native share sheet on devices.

## Tested scope and limits

The QA report records four real landing enquiries, two student and two professional profiles, Cognito account/group checks, browser login/password challenges, profile/consent persistence, quotes/PDFs and authorization checks. Synthetic QA accounts remain available until Siddartha requests deletion.

Browser QA does not replace Android/iOS device acceptance. Native camera, native video background behavior and push delivery need device testing and the Expo project UUID. SES automatic quote mail remains disabled pending identity verification, production approval and feedback testing. Real payments remain deferred.
