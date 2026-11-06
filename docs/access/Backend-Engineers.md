# AI4Impact backend engineering access

IAM group: **AI4ImpactBackendEngineers**. Initial member: **AnishAI4**.

The existing identity was imported without changing its console password or access keys. User tags identify `Team=AI4ImpactBackend`, `Role=BackendEngineer`, and `AccessProfile=AI4ImpactBackendEngineers`. A permissions boundary sets a maximum service set and repeats the deletion/privilege-change guardrails. Group policies provide the actual grants.

## Included

- Deploy, configure, publish and invoke `pilearn-*` Lambda functions and layers in ap-south-1. Pass only four existing project Lambda execution roles, only to Lambda.
- Read/update the existing project API routes/integrations and service-specific Lambda invoke permissions.
- Manage users, passwords, app clients, groups and authentication settings in the existing project Cognito pool.
- Read/update project integration secrets (Razorpay, Resend, DB credentials, video signer) and project SSM parameters. No secrets were copied into this repository.
- List/read/upload the three application media/material/certificate buckets. Terraform state is excluded.
- Operate project queues, topics and schedules; inspect logs, traces and metrics; manage project alarms.
- Inspect database/network configuration, read database logs and create project-named DB snapshots. SQL migrations can use the project's existing private-VPC Lambda workflow.
- Trigger deployments for the three existing Amplify apps and invalidate the project media CDN.
- Change own password, register MFA and create/manage own CLI access keys. No access key was created during setup.

## Direct API restrictions

Explicit denies cover direct deletion of Lambda functions, Cognito users/pools/clients, media objects/buckets, secrets, logs, queues/topics, database resources and related project services. Cognito user disabling, queue purges, S3 lifecycle/public-policy changes, DB stop/reboot and KMS disabling/deletion scheduling are denied too.

Anish cannot attach policies, create privileged IAM identities, change role trusts, remove the boundary, change his group membership or assume another role. Role passing cannot select an administrator/unrelated role. Terraform state objects cannot be read or overwritten.

**Important limit:** these are direct IAM API restrictions, not a deletion-proof production environment. Deploying or invoking production Lambda code exposes that function's existing DB/service powers. The learning role includes Cognito deletion for existing app functionality, and DB credentials allow SQL changes. An engineer able to deploy code can therefore indirectly delete or alter application data. Enforcing a stronger guarantee requires separating deployment approval and application/database execution permissions; it cannot be achieved by a deny on this IAM user's direct actions alone. Existing application roles were not changed by this setup.

## Validation and maintenance

AWS Access Analyzer validated all five policy documents with no findings. All 40 IAM principal simulation checks passed for permitted project operations and denied deletion, state access, public Lambda grants, arbitrary role passing and escalation. Simulations do not execute operations or prove network/database connectivity; no destructive request was sent as Anish.

Definitions are in `infra/terraform/backend-access.tf` and `infra/terraform/policies/backend-*.json`. The IAM user has Terraform `prevent_destroy`. Apply only reviewed IAM changes for this profile; do not use this task to apply unrelated production infrastructure drift. Future members need the same boundary on their own IAM identity as well as group membership.
