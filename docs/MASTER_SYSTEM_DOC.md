# PayIntelli Academy Master System Document

## Purpose

This is the single reference for what the project currently has, what is deployed, what data model exists, what was fixed recently, and what is still important to know.

Last updated: 2026-11-05

## System Overview

PayIntelli Academy is a serverless event-engagement platform with:

- Admin dashboard for admins to manage events, polls, materials, analytics, and users
- Mobile app for students and working professionals
- AWS Lambda backend
- API Gateway HTTP API
- PostgreSQL on RDS
- Cognito for authentication
- S3 for materials

## Main Workspaces

- `admin-dashboard/`
- `mobile-app/`
- `lambdas/`
- `shared/`
- `infra/terraform/`
- `docs/`

## Live AWS Components

Current live environment is in:

- AWS profile: `jm`
- Region: `ap-south-1`

Main live resources:

- API Gateway HTTP API: `pilearn-api`
- API ID: `ke8dywmhil`
- Base URL: `https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com`
- Cognito User Pool ID: `ap-south-1_kc1sfOoEG`
- RDS host: `pilearn-postgres.c766w0kgwlwi.ap-south-1.rds.amazonaws.com`
- Database name: `PiLearn`
- Materials bucket: `pilearn-materials-767491588787`

## Backend Architecture

Each backend domain generally follows:

- `handler.py`: route dispatch and request/response handling
- `service.py`: business logic
- `repository.py`: DB access

Shared modules:

- `shared/auth.py`
- `shared/db.py`
- `shared/models.py`
- `shared/user_repository.py`
- `shared/engagement/*`

## Lambda Functions

### `payintelli-events`

Responsibilities:

- Create event
- List events
- Get event
- Update event
- Delete event

Source:

- `lambdas/events/`

### `payintelli-attendance`

Responsibilities:

- Join event
- List current user attendance
- List attendance for a given event

Source:

- `lambdas/attendance/`

### `payintelli-polls`

Responsibilities:

- Create poll
- List polls by event
- Get poll
- Update poll status
- Delete poll
- Vote
- Get results

Source:

- `lambdas/polls/`

### `payintelli-materials`

Responsibilities:

- Create material record
- Generate upload URL
- List materials by event
- Get material
- Generate download URL
- Delete material

Source:

- `lambdas/materials/`

### `payintelli-analytics`

Responsibilities:

- Event analytics
- Overview analytics
- Student analytics

Source:

- `lambdas/analytics/`

### `payintelli-users`

Responsibilities:

- `GET /admin-users`
- `POST /admin-users`
- `GET /users`
- `GET /users/me`
- `PUT /users/me`

Source:

- `lambdas/users/`

### `payintelli-cognito-post-confirm`

Responsibilities:

- Post-signup Cognito hook

Source:

- `lambdas/cognito_post_confirm/`

## Live API Routes

### Events

- `POST /events`
- `GET /events`
- `GET /events/{event_id}`
- `PUT /events/{event_id}`
- `DELETE /events/{event_id}`
- `POST /events/{event_id}/join`
- `GET /events/{event_id}/analytics`
- `GET /events/{event_id}/calendar.ics` (Phase 3: .ics calendar download)

### Attendance

- `GET /attendance`
- `GET /attendance/event/{event_id}`

### Polls

- `POST /polls`
- `GET /polls`
- `GET /polls/{poll_id}`
- `PUT /polls/{poll_id}`
- `DELETE /polls/{poll_id}`
- `POST /polls/{poll_id}/vote`
- `GET /polls/{poll_id}/results`

### Materials

- `POST /materials`
- `GET /materials`
- `GET /materials/{material_id}`
- `DELETE /materials/{material_id}`
- `POST /materials/{material_id}/download`

### Analytics

- `GET /analytics/overview`
- `GET /analytics/student/{student_id}`

### Courses (Phase 3 additions)

- `GET /courses`
- `POST /courses`
- `GET /courses/{course_id}`
- `PUT /courses/{course_id}`
- `DELETE /courses/{course_id}`
- `POST /courses/{course_id}/register`
- `GET /courses/enquiries` (admin: list all interested registrations)
- `GET /me/courses` (auth: current user's course registrations)
- `POST /courses/{course_id}/interest` (auth: mark interested)
- `GET /courses/{course_id}/registrations` (admin: list registrations for course)
- `PUT /courses/{course_id}/registrations` (admin: update registration status/notes)
- `GET /courses/{course_id}/calendar.ics` (Phase 3: .ics for course classes)

### Users

- `GET /admin-users`
- `POST /admin-users`
- `GET /users`
- `GET /users/me`
- `PUT /users/me`
- `POST /users/me/privacy-consent` (Phase 3: record privacy policy acceptance)

## Authentication and Roles

Authentication is handled by Cognito JWT authorizer in API Gateway and verified again in Lambda logic.

### Access roles

- `Admins` Cognito group maps to backend role `admin`
- Non-admin app users are treated as app users for mobile-facing functionality

### Profile types

These are stored in the DB profile, independently of Cognito groups:

- `student`
- `professional`

This means a user can be:

- Admin with professional profile
- Admin with student profile
- App user with student profile
- App user with professional profile

## Data Model

## `users`

Important fields:

- `id` UUID primary key
- `cognito_id`
- `email`
- `name`
- `role`
- `user_type`
- `university`
- `course`
- `year_of_study`
- `city`
- `state`
- `designation`
- `company`
- `created_at`

Meaning:

- `id` is the internal app DB identifier
- `cognito_id` is the Cognito `sub`
- `user_type` is `student` or `professional`

## `events`

Important fields:

- `id`
- `name`
- `description`
- `location`
- `event_type`
- `start_time`
- `end_time`
- `created_by`
- `status`
- `qr_code`
- `max_attendees`
- `visibility`
- `created_at`

Enums:

- `event_type`: `offline`, `online`, `hybrid`
- `status`: `draft`, `published`, `ongoing`, `completed`, `cancelled`
- `visibility`: `global`, `private`

## `attendance`

Important fields:

- `id`
- `user_id`
- `event_id`
- `timestamp`

Important detail:

- `attendance.user_id` references `users.id`, not Cognito `sub`

## `polls`

Important fields:

- `id`
- `event_id`
- `question`
- `created_by`
- `status`
- `created_at`

Enum:

- `draft`, `active`, `closed`

## `poll_options`

- `id`
- `poll_id`
- `option_text`

## `votes`

- `id`
- `poll_id`
- `option_id`
- `user_id`
- `created_at`

## `materials`

- `id`
- `event_id`
- `title`
- `file_url`
- `file_type`
- `uploaded_by`
- `created_at`

## Frontend State

## Admin dashboard

Important pages:

- `admin-dashboard/src/app/dashboard/events/page.tsx`
- `admin-dashboard/src/app/dashboard/polls/page.tsx`
- `admin-dashboard/src/app/dashboard/materials/page.tsx`
- `admin-dashboard/src/app/dashboard/analytics/page.tsx`
- `admin-dashboard/src/app/dashboard/users/page.tsx`
- `admin-dashboard/src/app/dashboard/admin-users/page.tsx`

Current users UI now supports:

- Access filter: `All`, `Students`, `Admins`
- Profile type filter: `All`, `Student`, `Working Professional`, `Admin`
- Distinguishes access role from profile type

## Mobile app

Important user profile flow:

- `mobile-app/src/screens/CompleteProfileScreen.tsx`
- `mobile-app/src/screens/ProfileScreen.tsx`

Current profile flow supports:

- Student onboarding
- Working professional onboarding
- Writes profile via `PUT /users/me`
- Reads server-truth profile via `GET /users/me`
- Uses local secure storage as fallback cache, not the primary source of truth

## What Was Fixed Recently

## 1. Attendance lambda runtime failures

Problem:

- `payintelli-attendance` imported `events.repository`
- Each lambda zip is packaged independently
- `attendance.zip` did not contain `events/`

Result:

- Live runtime error: `ModuleNotFoundError: No module named 'events'`

Fix:

- Removed cross-lambda dependency
- Moved event lookup into attendance repository/service logic

## 2. Attendance route dispatch bugs

Problem:

- `/attendance/event/{event_id}` was shadowed by the broader `/attendance` route
- Handler function signatures did not match how they were being called

Fix:

- Reordered route matching
- Standardized path parameter handling

## 3. DB user identity mismatch

Problem:

- Several lambdas were using Cognito `sub` directly where DB schema expects `users.id`

Impact:

- Attendance writes could fail
- Event/poll/material ownership data could be wrong
- Profile-linked reads were inconsistent

Fix:

- Added shared user resolution in `shared/user_repository.py`
- Backend now resolves Cognito claims to real DB users before writes

## 4. Events update crash

Problem:

- Event update path could leave enum-like fields as strings
- Repository expected enum `.value`

Fix:

- Normalized enum/string handling in events update flow

## 5. Users lambda Cognito timeout

Problem:

- `payintelli-users` was put in VPC
- It needed Cognito public API access for admin listing
- Without outbound public path, `/admin-users` and `/users` timed out at 30s

Fix:

- Removed users lambda from VPC live
- Updated Terraform so users lambda stays out of VPC

## 6. Admin dashboard users model mismatch

Problem:

- Dashboard still thought in terms of only `Students` vs `Admins`
- Backend profile model now supports `student` and `professional`

Fix:

- Added richer user payload fields
- Added access role + profile type separation
- Updated dashboard filters and tables

## Current Live Validation Status

The following were live-tested after deployment:

### Working

- `PUT /users/me`
- `GET /admin-users`
- `GET /users?group=Admins`
- `GET /users?group=All`
- `POST /events`
- `GET /events`
- `GET /events/{event_id}`
- `PUT /events/{event_id}`
- `DELETE /events/{event_id}`
- `GET /analytics/overview`
- `GET /events/{event_id}/analytics`
- `POST /polls`
- `GET /polls?event_id=...`
- `GET /polls/{poll_id}`
- `GET /polls/{poll_id}/results`
- `DELETE /polls/{poll_id}`
- `POST /materials`
- `GET /materials?event_id=...`
- `GET /materials/{material_id}`
- `POST /materials/{material_id}/download`
- `DELETE /materials/{material_id}`
- `GET /attendance`
- `GET /attendance/event/{event_id}`
- `POST /events/{event_id}/join`

### Edge cases checked

- Joining a future event returns handled `400`, not `500`
- Invalid poll vote option returns handled client error, not crash
- Admin/user listing returns enriched profile data

## Known Caveats

## API Gateway access logs

Access logging was enabled on the live API Gateway stage and Terraform was updated, but log streams were not yet observed in `/aws/apigateway/payintelli` during the last check.

This does not block the API itself.

## Users without DB profile

Some Cognito users may exist without a corresponding row in `users`.

Current behavior:

- They still appear in all-users/admin-users listing
- Enriched profile fields are empty until they submit profile data or are created in DB-backed flow

## Terraform vs live state

Some fixes were applied live immediately with AWS CLI so production would recover first.

Terraform files were also updated, but a proper `terraform plan` and `terraform apply` should still be run to fully converge infrastructure state.

## Most Important Source Files

Backend:

- `lambdas/events/handler.py`
- `lambdas/events/service.py`
- `lambdas/events/repository.py`
- `lambdas/attendance/handler.py`
- `lambdas/attendance/service.py`
- `lambdas/attendance/repository.py`
- `lambdas/polls/handler.py`
- `lambdas/polls/service.py`
- `lambdas/materials/handler.py`
- `lambdas/users/handler.py`
- `lambdas/users/service.py`
- `shared/user_repository.py`
- `shared/models.py`
- `shared/auth.py`
- `shared/db.py`

Infra:

- `infra/terraform/apigateway.tf`
- `infra/terraform/lambda.tf`
- `infra/terraform/iam.tf`
- `infra/terraform/rds.tf`
- `infra/terraform/cognito.tf`

Frontend:

- `admin-dashboard/src/app/dashboard/users/page.tsx`
- `admin-dashboard/src/app/dashboard/admin-users/page.tsx`
- `admin-dashboard/src/services/api.ts`
- `admin-dashboard/src/hooks/useUsers.ts`
- `admin-dashboard/src/types/user.ts`
- `mobile-app/src/screens/CompleteProfileScreen.tsx`

## Recommended Next Steps

1. Run `terraform plan` and `terraform apply` for infra convergence.
2. Verify API Gateway access log delivery permissions so log streams appear.
3. Add more DB profile enrichment for non-admin Cognito users as they onboard.
4. Add automated smoke tests for the full event -> poll -> materials -> attendance flow.
