# PiLearn deployment — AI4Impact

Deployed and verified on 14 October 2026.

- Account: `767491588787`
- Region: `ap-south-1` (Mumbai)
- CLI profile: `jm`
- Repository: `AI4Impact-New/SimpleApp-Event`
- Local checkout: `/Users/siddarthayadav/Code/Piresearch/SimpleApp-Event`

## Live backend

| Component | Value |
|---|---|
| API base | https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com/ |
| API ID | `ke8dywmhil` |
| API routes | 42, protected by Cognito JWT authentication |
| Application Lambdas | `pilearn-events`, `pilearn-attendance`, `pilearn-polls`, `pilearn-materials`, `pilearn-analytics`, `pilearn-courses`, `pilearn-users`, `pilearn-cognito-post-confirm` |
| PostgreSQL | `pilearn-postgres`, PostgreSQL 15.17, `db.t4g.micro`, encrypted 20 GB storage |
| Database | `PiLearn`, 22 public tables including migration tracking |
| DB endpoint | `pilearn-postgres.c766w0kgwlwi.ap-south-1.rds.amazonaws.com:5432` |
| Cognito user pool | `ap-south-1_kc1sfOoEG` |
| Cognito client | `40faprqjpcc6q0pfkdkcrd8p5v` |
| Cognito domain | `pilearn-767491588787` |
| Cognito groups | `Admins`, `Students` |
| Materials bucket | `pilearn-materials-767491588787-767491588787` |
| API logs | `/aws/apigateway/pilearn`, retained for 7 days |

## Terraform and networking

Terraform created 109 resources. A separate state bucket was bootstrapped before the application deployment.

- State: `s3://pilearn-terraform-state-767491588787/pilearn/production/terraform.tfstate`
- State bucket has encryption, versioning, public access blocked, and native S3 state locking.
- The state bucket was created with the AWS CLI and is outside the application Terraform resource graph; preserve it during teardown.
- Provider is restricted to account `767491588787`.
- Default VPC: `vpc-0d810a9529b474625`.
- Added two private application subnets, a private route table, and one NAT gateway for outbound AWS/API access.
- PostgreSQL is not publicly accessible. Its security group permits database connections from the Lambda security group.
- `users` Lambda now has VPC configuration for database connectivity.
- Database deletion protection and seven-day backups are enabled.
- Database password was randomly generated; stored in the ignored, permission-restricted `infra/terraform/terraform.tfvars`, encrypted Terraform state, and the Secrets Manager secret `pilearn-db-credentials`.
- Follow-up Terraform plan returned **no changes**.

RDS, the NAT gateway, public IPv4 allocation, and storage incur ongoing charges while deployed.

## Database initialization

Fixed `docs/schema.sql` so `materials` is created before `polls`, which references it.
Applied the base schema, migrations 001–013, and `engagement_schema.sql` in one transaction through a temporary VPC-connected Lambda. Migration names are recorded in `schema_migrations`.
The bootstrap Lambda was deleted after verification. Its reusable handler remains in `scripts/db_bootstrap_handler.py`.
This is a fresh database. Existing courses, users, and files from the old account have not been migrated.

## Verification

Cognito sign-in worked for a temporary admin test account. The checks below were made against the live HTTP API.

| Path | Authentication | Status |
|---|---|---|
| `/events` | None | 401 |
| `/courses` | Cognito JWT | 200 |
| `/events` | Cognito JWT | 200 |
| `/attendance` | Cognito JWT | 200 |
| `/polls?event_id=00000000-0000-0000-0000-000000000001` | Cognito JWT | 200 |
| `/materials?event_id=00000000-0000-0000-0000-000000000001` | Cognito JWT | 200 |
| `/analytics/overview` | Cognito JWT | 200 |
| `/users/me` | Cognito JWT | 200 |
| `/users` | Cognito JWT | 200 |
| `/admin-users` | Cognito JWT | 200 |
| `/courses/enquiries` | Cognito JWT | 200 |
| `/me/courses` | Cognito JWT | 200 |

The temporary Cognito test account and its database profile were removed. These checks verify routing, authentication, imports, database reads, and Cognito administration access; they are not a full test of every write or upload flow.

## App configuration and next work

Created ignored local configuration files targeting the new account:

- `admin-dashboard/.env.local`
- `mobile-app/.env`

The admin portal and student web/mobile app are configured locally; frontend hosting and app-store releases were not part of this backend deployment.
No real admin login has been created yet. Create an admin identity and populate course content before using the platform.

Deployment configuration and schema fixes are tracked in Git. The sanitized `terraform.tfvars.example` records the new account settings; the real password and local app settings remain ignored. Keep credentials and `terraform.tfvars` out of Git.

The AWS access key pasted earlier in chat should be rotated in IAM and the `jm` profile updated locally.
