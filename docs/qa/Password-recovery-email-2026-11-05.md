# Password recovery investigation — 5 November 2026

## Findings

The student portal calls Amplify `resetPassword`, which invokes Cognito `ForgotPassword`. There is no Resend custom email sender in the user pool. Resend application notifications and Cognito account recovery are separate paths.

- Siddartha's account is enabled and CONFIRMED, but its Cognito attributes omit `email_verified` (therefore it is not verified). Password sign-in remains valid; email password recovery requires a verified recovery address. The account owner must sign in, open Profile and use the existing email verification control to prove mailbox ownership. Do not set `email_verified=true` administratively merely to bypass recovery checks.
- The CEO account is enabled, has a verified email and is in FORCE_CHANGE_PASSWORD. CloudTrail records successful ForgotPassword calls with EMAIL delivery details on 5 November. Acceptance by Cognito is not evidence that the recipient inbox received the email.
- At investigation time the pool used COGNITO_DEFAULT without a source identity. These messages use AWS-managed sending resources; delivery details/suppression for that sender are not visible through our SES account. The recipient is not suppressed in our own SES account, but this cannot exclude suppression in AWS-managed sending.
- Our Mumbai SES account has production access, sending enabled and the ai4impact.in identity and DKIM verified. SES reported zero sends in the prior 24 hours, consistent with Cognito bypassing this account. Recipient-domain MX includes Google Workspace and an additional lower-priority SES inbound record. No DNS change is justified by the current evidence.

## Change

Use the existing verified SES domain for Cognito authentication mail: `AI4Impact <noreply@ai4impact.in>`, with a dedicated `pilearn-auth` configuration set and CloudWatch delivery/failure metrics. This gives control of sending and suppression and avoids the default Cognito sending quota. No Resend secret, application-email flag, user password, verification attribute, recovery policy or DNS record is changed.

The Terraform plan is scoped to two new SES resources and one in-place user-pool email configuration update. No user pool replacement or database migration is required. Rollback restores the previous `email_configuration` and applies the user-pool resource.

## Validation and boundaries

Terraform formatting and validation pass. Before applying, inspect the plan for only the stated email change. After applying, check the pool's email configuration and issue one authorized reset to the CEO mailbox. Check SES delivery/failure metrics and ask the recipient to complete the existing reset flow privately. Never record reset codes, passwords or email bodies in diagnostics.

The old missing-mail event's final SMTP outcome cannot be reconstructed from the available default-sender records. Do not claim a confirmed bounce, spam filtering or a Resend failure without delivery evidence. SES delivery means acceptance by the recipient mail server, not guaranteed inbox placement.

References: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html and https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-recover-a-user-account.html.
