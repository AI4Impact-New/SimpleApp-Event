# Recreated Cognito accounts and retained profiles

Deleting a Cognito account does not delete its application profile, enrolments, invoices or progress. Recreating the same email produces a new subject (`sub`). A matching email alone must not automatically transfer historical records to the new subject.

## API behavior

- Existing subjects continue to resolve to the same application profile.
- A new subject using an email with a retained profile receives HTTP 409 and an identity-link review message. It cannot read that retained profile.
- Concurrent first requests for one subject resolve to the winning profile after a duplicate insert, without creating a second profile.
- Unrelated database errors remain failures rather than being disguised as a successful sign-in.

## Administrator recovery procedure

1. Identify the current Cognito subject with `list-users` / `admin-get-user`. Confirm the intended owner, verified email, enabled state and expected staff groups independently.
2. Read the existing profile by email and record its immutable application ID and old subject. Confirm no profile already uses the new subject.
3. Query the old subject in Cognito. If it still exists or ownership is ambiguous, stop and investigate; email equality is insufficient authorization.
4. With the account owner's administrative recovery authorized, lock the existing profile in a transaction. Update only `cognito_id`, constrained by the exact application ID, old subject and email read above. Assert exactly one row changes. Preserve all other fields and relationships.
5. Recheck the mapping and affected read endpoints. Delete any temporary repair tool. Never reset the user's password, grant extra roles or delete historical records as a shortcut.

The 23 October 2026 incident was repaired with this procedure. The affected read paths returned 200 afterward. These operational checks used a trusted direct-Lambda authorizer context; browser/API Gateway authentication is verified separately with the retained QA staff account.
