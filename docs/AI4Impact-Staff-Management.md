# AI4Impact staff access and viewing metrics

The staff console keeps the white/blue sign-in design throughout navigation, dashboard and staff management. Dashboard totals come from `GET /admin/learning/overview`; attendee, engagement and poll placeholders have been removed. Enrolments count course registrations, not unique people. Learners started counts distinct registered learners with positive video credit; minutes sum unique credited segments across registered learners, including historical registrations.

## Find video metrics

Dashboard → course → **Video metrics**, or Learning Studio → course → **Video metrics**. The earlier Learners view also retains its analytics panel. A direct link is `/dashboard/learning/{course_id}?tab=metrics`. Metrics appear once recordings are published and learners watch them; an empty course correctly reports no published recordings. The player already restores the last saved position. Pause, periodic heartbeat and exit saves were verified on the hosted student portal; force-kill/offline recovery uses the last successful server save.

## Staff directory

Admin Users combines loaded Admins and Marketing membership pages into one searchable directory. Role chips describe staff roles, independently of student/professional profile type. Additional membership pages have explicit Load more buttons; counts describe loaded records, not an assumed total pool size. Administrator invitation and Marketing grants remain separate actions. Temporary passwords are masked.

Admins can remove a specific Admins/Marketing role or delete a staff sign-in account. Role removal does not delete the account or change other roles. Deletion requires typing the target email; it globally signs out/disables and removes the Cognito identity, while preserving database profiles and historical course, invoice, certificate and enquiry records. It is not a data-erasure/anonymisation workflow. Recreating the same email may require explicit profile reconciliation; no silent identity rebind is performed.

Both client and server protect the signed-in administrator from self-deletion or self-removal of Admins. The server serializes checks with a PostgreSQL advisory transaction lock and requires another enabled, confirmed administrator before removing/deleting an Admins account. Student-only identities cannot be deleted through this staff endpoint. Marketing cannot administer staff. Confirmation email is checked against the canonical Cognito identity, not only against submitted UI data.

Existing signed JWTs can remain valid in services that validate them offline until expiry, including after role changes or account deletion. Cognito disable/global sign-out prevents new sessions/refresh, but this release does not add a global JWT denylist. The confirmation UI and responses disclose that limit. A failed delete after disabling leaves a disabled account available for administrator review/retry. Success is reported only after the Cognito delete call succeeds. Account actions log actor and subject IDs to CloudWatch; CloudTrail records AWS operations.

## New staff action API

`POST /admin/staff/actions` requires an authenticated Admins ID token. Remove a role:

```json
{"username":"CANONICAL_COGNITO_USERNAME","action":"remove_role","role":"Marketing","confirmation_email":"colleague@example.com"}
```

Delete the sign-in identity:

```json
{"username":"CANONICAL_COGNITO_USERNAME","action":"delete_account","confirmation_email":"colleague@example.com"}
```

200 returns `{username,action,message}` (already-removed role retries return a message without further mutation). 400 rejects unknown fields, invalid role/action or mismatched email. 401/403 deny unauthenticated/non-admin access and learner-only deletion. 404 means the Cognito identity no longer exists. 409 protects self-access, incomplete identity and the last usable administrator. Other AWS failures must be reviewed/retried; do not claim the account was deleted.

Terraform grants the learning Lambda the Autopilot-derived Cognito actions scoped to the existing company user pool. No new database table, IAM user, authentication pool or student frontend contract is required. No existing staff or retained QA identity is deleted as part of deployment/testing. Destructive success paths use SDK mocks and intercepted browser requests; live tests exercise role removal only on a controlled QA identity plus denied self-deletion and wrong-email confirmation.
