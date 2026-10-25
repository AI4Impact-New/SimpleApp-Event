# Remediation release

This release addresses the baseline findings in REPORT.md. Hosted acceptance and the exact merged commit/deployment job IDs will be recorded on the pull request after deployment.

## Changes

- Admin: Next.js 15.5.28, patched CSS tooling and consistent current Cognito/API/QR configuration. Full npm audit reports zero findings.
- Backend: PyJWT 2.15.1, Requests 2.34.2 and cryptography 50.0.2. Python 3.12 Lambda packaging accepts the compatible manylinux 2.28 wheels. The production Lambda runtime remains Python 3.12/x86_64.
- Student: refresh profile on navigation focus; handle browser video play cancellation without hiding actual media errors; explicitly preserve paused playback when a session is opened without autoplay.
- Student release: public commit provenance, rejection of stale/dirty exports, explicit existing Amplify app ID support, optional wait and hosted-commit verification. The manually deployed student portal must be released separately after merging.
- Website: replace the expired webinar promotion with existing evergreen course/guidance information and remove the placeholder telephone number. Guidance uses the existing official support email.
- CI: add isolated student browser regressions for immediate profile refresh and exam confirmation, plus dependency audit gates.

## Pre-merge validation

- 212 Python backend/release/JWT tests passed, including actual RSA signatures, audience/issuer/expiry checks and HMAC rejection.
- 11 student resilience/video tests passed; expected browser AbortError/NotAllowedError is consumed, unsupported-media errors remain visible.
- Two new student Playwright regressions passed against the static production export with intercepted APIs and synthetic sessions.
- 11 existing admin Playwright regressions passed against the local production build.
- Admin, landing static build, student typecheck/export and all ten Linux Lambda ZIP builds passed.
- A clean student npm install reapplied both version-specific dependency patches successfully.
- RSA/SHA1 signing compatibility used by CloudFront was verified with the updated cryptography package.

## Audit dispositions

Backend pip-audit reports no known vulnerabilities after excluding `PYSEC-2025-183` / `CVE-2025-45768`: a supplier-disputed HMAC key-strength advisory without a patched release. This service accepts Cognito RS256 only; an explicit regression proves HS256 is rejected. The exclusion is named in CI rather than silently suppressing all findings.

Admin npm audit reports zero findings, including development dependencies. Student npm audit has no critical findings and four high package entries in one remaining upstream chain: Expo CLI/code-signing tooling → node-forge. The registry lists no fixed node-forge release. No incompatible Expo downgrade was applied. These packages belong to the build/development tooling rather than the exported student runtime; the residual audit remains documented and critical findings block CI.

Native-device acceptance, real inbox delivery and real payment integration are outside this release. Existing student/native accounts and real business records are not test fixtures.
