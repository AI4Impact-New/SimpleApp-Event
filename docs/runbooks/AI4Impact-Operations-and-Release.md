# AI4Impact operations and release runbook

Backend owner: Siddartha. Region: ap-south-1. Account: 767491588787. Payments remain demo-only. Mobile implementation/release belongs to the mobile team.

## Daily checks and incident triage

1. Open Admin → Launch readiness. Confirm database OK, review missing recordings/empty courses, failed push jobs and new enquiries.
2. Open CloudWatch dashboard `pilearn-operations`. The Terraform-managed alarms cover errors on all ten Lambdas, learning throttles, HTTP API 5xx, RDS CPU/free storage/free memory and notification-schedule failures.
3. Alarm notifications publish to SNS `pilearn-operations`. No human recipient is automatically subscribed. Add the approved recipient, have them confirm the AWS subscription, then validate receipt with an agreed test. A topic without a confirmed subscriber is not a paging system.
4. For API failures, correlate the response/request ID with `/aws/api-gateway/...` access logs and `/aws/lambda/pilearn-{service}` logs. Never paste JWTs, passwords, signed media URLs or customer contact details into shared incident messages.
5. For Lambda throttling, inspect concurrency, duration, database connections and request rate before raising limits. For RDS pressure, inspect current load/storage before changing size. For push failures, inspect job error codes and Expo receipts; do not send repeated real notifications as a test.

Current starting thresholds are intentionally explicit in `infra/terraform/operations.tf`: sustained Lambda errors, learning throttles, API server errors, RDS CPU >80%, storage <2 GiB, memory <64 MiB and EventBridge failed invocations. Tune them using actual launch traffic and the agreed service objectives; an OK alarm is not proof of sufficient peak capacity.

## Marketing staff access

Admins use Admin Users → Marketing-only access to add/remove an **existing Cognito account** by email. No account or invitation is created by this control. Marketing allows website guidance/employer contacts, follow-up status/notes and read-only signed-in student interests. It does not allow enrollment, courses, fees, operations, user management or infrastructure changes.

Only named people approved by the owner should be assigned. An existing Admin remains an Admin even if Marketing membership is removed. Group-claim changes require a new sign-in/token refresh; existing issued tokens can retain old claims until expiry. For urgent account compromise, use the Cognito incident process in addition to removing membership. Marketing-role follow-up changes write actor/time/status records to `enquiry_audit`.

## Employer enquiry operation

The public `/hire-from-us` form calls `POST /employer-enquiries`. It saves organisation, hiring roles, contact details, source, consent version/time and a retry-safe request UUID. Admin/Marketing → Course Enquiries shows both employer and guidance requests, with type/status filters and contact search. Staff contacts the person manually. No interview/calendar booking, email, SMS or WhatsApp is sent by this form.

## Deployment procedure

1. Branch, implement, validate payload/role boundaries, update the mobile/API handover and open a PR.
2. Run backend tests, admin build, landing static build, Terraform fmt/validate and a reviewed plan.
3. Apply additive SQL migrations before deploying code that reads new columns. Track each in `schema_migrations`, use a transaction/advisory lock, and keep the previous application version compatible where possible.
4. Apply Terraform only after reviewing resource replacements. Do not publish `tfstate`, saved plans, secrets or tokens in Git or chat.
5. Merge after checks. Verify both Amplify jobs against the actual main commit. A build/provisioned app alone is not a completed deployment.
6. Run live QA with suppressed-invitation temporary accounts and clearly labelled fixtures. Check signed-out and cross-user boundaries, failure/retry paths and responsive layout. Remove test rows, object versions, accounts and helper functions afterwards.
7. Verify the existing retained DEMO ONLY certificate still resolves; do not delete it with temporary QA fixtures.

## Backup restoration rehearsal

Production RDS `pilearn-postgres` is private, encrypted, deletion-protected and retains seven days of automated backups. A backup being listed is not the same as a successful restore.

The October 15 rehearsal restored automated snapshot `rds:pilearn-postgres-2026-10-15-03-09` into **a separate private instance** `pilearn-restore-rehearsal-20261015`, using the existing private subnet group and DB security group. Through a temporary VPC Lambda, it verified database connectivity, applied migrations 017–019, read 34 public tables and six active courses, then performed an isolated write/delete. Production DB routing and credentials were not changed. The temporary validation function and restored DB were then removed.

For the next rehearsal:

```bash
aws rds describe-db-snapshots --db-instance-identifier pilearn-postgres \
  --snapshot-type automated --profile jm --region ap-south-1
# Select an available snapshot and a NEW rehearsal identifier.
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pilearn-restore-rehearsal-YYYYMMDD \
  --db-snapshot-identifier SNAPSHOT_ID --db-instance-class db.t4g.micro \
  --db-subnet-group-name pilearn-subnet-group \
  --vpc-security-group-ids sg-0e26cb29878ef4fc2 \
  --no-publicly-accessible --no-multi-az --no-deletion-protection \
  --profile jm --region ap-south-1
```

Wait for availability, validate the **new endpoint** through an IAM-protected VPC helper using a scoped DB secret, replay pending migrations and execute disposable fixtures. Confirm credentials match the selected snapshot if they were rotated since backup. Never use the production endpoint for a destructive restore test. Capture snapshot timestamp, start/ready/validation times and application checks to establish recovery objectives with stakeholders. Then delete only the identified rehearsal DB/helper and their temporary logs; no final snapshot is required for this disposable clone.

This is an **ephemeral restored-database rehearsal**, not a permanent staging environment. A long-lived frontend staging stack needs its own approved operating budget, isolated data/auth/media and deployment ownership. Do not point a staging app at production and call it isolated.

## Bounded traffic validation

October 15 baseline: 60 read-only current-price requests, three concurrent clients, 60 HTTP 200 responses. Measured p50 0.103 s and p95 0.196 s for that short run. This tests a small read baseline only. It is not a peak-load, video-concurrency or launch-capacity guarantee. Before a public launch, agree expected concurrent learners/API rate, video bandwidth and success/latency targets, then test an isolated environment to that workload without stressing production users.

## Push activation — requires mobile inputs

Backend inbox, device registration, durable retries and Expo receipts exist. `EXPO_PROJECT_ID` remains unset until the mobile team supplies the real project UUID. `/me/devices` then returns 503 by design; inbox announcements continue to work. Provide the project through Terraform `expo_project_id`; if enhanced push security is enabled, enter its token locally using the sensitive variable, never chat/Git.

After configuration, the mobile team registers a real physical-device token. Test one explicitly authorized QA recipient: delivery, tap routing, expiry/auth, opt-out and unregistration. Provider success/receipts do not prove the UI handled the tap correctly. Do not mark native push complete without physical-device evidence.

## Custom admin/student domain

Gayathri can attach domains through Amplify/Route 53. Landing domains alone do not change Cognito. Once an admin/student domain is chosen, add its HTTPS origin to `admin_custom_origins`, apply Terraform, then verify Cognito login/logout on that exact origin. The admin app initiates OAuth on its current origin. Preserve existing callback/logout origins until they are deliberately retired.

## Remaining stakeholder inputs

- Real course recordings/questions, completion/attendance/retry rules and final certificate wording.
- Named Marketing staff and lead retention/follow-up ownership.
- Real Expo project and physical-device builds, plus approved operational alert recipient.
- Final admin/student hostname, release date and expected launch workload.
- Whether to fund/operate a persistent isolated staging stack.

These inputs are not replaced with fabricated users, course content, project IDs or capacity claims.
