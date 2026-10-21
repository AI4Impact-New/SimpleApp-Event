# AI4Impact custom domains and email DNS handover

Prepared 21 October 2026. DNS is authoritative at GoDaddy (`ns05.domaincontrol.com`, `ns06.domaincontrol.com`). AWS account 767491588787 has no Route 53 hosted zone. Keep the current nameservers and working www/apex records.

## Records to add in GoDaddy

Type | Name/Host (relative to ai4impact.in) | Value/Target
--- | --- | ---
`CNAME` | `admin` | `dwzlkyhkz6fms.cloudfront.net`
`CNAME` | `_3e1f4263ad3f6a197cf54b5e3033cfb9.admin` | `_c86ef6f13e14a7844d06566fc0ad0e50.wzccmgtwzk.acm-validations.aws`
`CNAME` | `onhf3bmpcfyx6hinfrkc7tuxevsx2uee._domainkey` | `onhf3bmpcfyx6hinfrkc7tuxevsx2uee.dkim.amazonses.com`
`CNAME` | `6k6tcdcmuxombckdha7g5b4pog2j2cei._domainkey` | `6k6tcdcmuxombckdha7g5b4pog2j2cei.dkim.amazonses.com`
`CNAME` | `q6dq3zci3tasuob6lvm5tbzw55xupsfw._domainkey` | `q6dq3zci3tasuob6lvm5tbzw55xupsfw.dkim.amazonses.com`

Use the default TTL. If the same host already exists, compare the target before editing. Do not remove existing www, MX, SPF, DMARC or validation records.

## Deployed AWS configuration

- Existing landing: https://www.ai4impact.in/ is AVAILABLE and Playwright returned HTTP 200.
- New admin: https://admin.ai4impact.in/ has an Amplify association in account 767491588787, app d16744ddqs159z, branch main. Its TLS certificate and routing need the two admin CNAMEs above.
- Cognito callback/logout origins include the new admin origin, preserving existing Amplify origins.
- SES identity ai4impact.in exists in Mumbai. Its three DKIM CNAMEs above must verify before branded transactional delivery. SES currently remains in sandbox. Production sending approval is also needed for arbitrary student recipients.
- Earlier console.ai4impact.in association is FAILED because its DNS validation was absent. It remains untouched.

## Verification after records are published

1. Query all five CNAMEs against the authoritative nameservers and public DNS.
2. Check Amplify domain status AVAILABLE and subdomain verified.
3. Open https://admin.ai4impact.in/login in Playwright, desktop and mobile. Follow Cognito redirect and check the redirect_uri uses the same origin. Existing-user authenticated acceptance requires an authorized sign-in session.
4. Verify SES DKIM SUCCESS/VerifiedForSendingStatus. Request SES production access and configure sender noreply@ai4impact.in only after verification. Do not claim invoice email delivery while sender verification or production approval is pending.

Source: infra/terraform/custom-domains.tf and variables.tf. The Terraform state contains the AWS associations. GoDaddy DNS cannot be changed with this account’s AWS CLI.

## Verification update, 21 October 2026

All five GoDaddy CNAME records were confirmed against ns05.domaincontrol.com after the CEO published them. Amplify admin.ai4impact.in reached AVAILABLE. Playwright loaded /login over HTTPS with HTTP 200 and confirmed Cognito redirect_uri=https://admin.ai4impact.in/callback. No existing-user password or session was altered. SES DKIM remained pending at the last check, and the SES API reports DENIED for production-access case 179257518900594, while AWS correspondence requests further information before a final decision. Automatic transactional quote delivery remains disabled pending AWS approval.
