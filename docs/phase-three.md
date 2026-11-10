## Phase 3 – PiLearn EdTech Platform

This document describes the **presidency (execution) order** for Phase 3, with micromanaged steps across backend (lambdas), admin dashboard, mobile app, data model, infra, and docs. Follow the order as closely as possible; do not start work in a later phase until the prerequisites are done and deployed.

---

## 0. Grounding and Discovery (Prerequisite)

- **0.1 Review existing docs and architecture**
  - Read `docs/MASTER_SYSTEM_DOC.md`, `docs/README.md`, `docs/schema.sql`, and migrations (`docs/migrations/*.sql`), plus `Architecture_Pics/Courses.png`.
  - Skim `shared/models.py`, `shared/engagement/*`, and `lambdas/courses`, `lambdas/events`, `lambdas/attendance`, `lambdas/materials`, `lambdas/polls`.
- **0.2 Inventory current course/event flows**
  - From `admin-dashboard`, confirm current flows:
    - Events CRUD and QR attendance: `dashboard/events`.
    - Materials: `dashboard/materials`.
    - Analytics: `dashboard/analytics`.
    - Courses: `dashboard/courses` (list, create, edit, view).
  - From `mobile-app`, confirm:
    - Events listing and join: `HomeScreen`, `EventScreen`, `QRScannerScreen`.
    - Courses listing and detail: `CoursesScreen`, `CourseDetailScreen`.
    - Materials and polls on `EventScreen`.
- **0.3 Decide rollout strategy**
  - Decide if Phase 3 is single big deployment or split into **Phase 3A (courses + interest + categories)**, **3B (attendance + .ics + notifications)**, **3C (exams + certificates + third-party integration)**.
  - Create tracking issues per sub-phase (Jira/Notion/GitHub) and link to this document.

---

## 1. Data Model Extensions for Courses & Certifications

Goal: extend the existing course schema to support **third-party certifications**, **course categories (recorded/online/in‑person)**, **class-level scheduling**, and **exam centers** while keeping compatibility with current code.

- **1.1 Review existing course schema and models**
  - Open `docs/migrations/003_courses.sql` and identify:
    - Tables: `courses`, `course_highlights`, `course_phases`, `course_benefits`, `course_audience`, `course_career_outcomes`, and any `course_certificate`/similar table.
  - Open `shared/models.py` and identify all `Course*` dataclasses, including:
    - Core `Course` model.
    - Models for highlights, phases/modules, benefits, audience, outcomes, and certificate configuration.
  - Open `lambdas/courses/repository.py` and `lambdas/courses/service.py` to see how nested structures are loaded/saved.

- **1.2 Add course-level certification metadata**
  - Decide fields needed for course certifications (in-house + third-party), e.g.:
    - Provider name (e.g. `AWS`, `Google`, `Samagyaan Data solutions`).
    - Certification type / code (e.g. `AWS-CLF-C02`).
    - Issuer URL / portal link.
    - Whether the certificate is auto-issued or requires manual verification.
    - Minimum completion criteria (percent of classes attended, exams passed, etc.) – may be stored as JSON configuration.
  - Update DB schema:
    - Add/extend a `course_certificates` (or equivalent) table via a new migration (e.g. `005_course_certificates.sql`).
    - Ensure it can reference future third-party integrations (e.g., a `provider` enum and an `external_config` JSON column).
  - Update models and repositories:
    - Extend `CourseCertificate` (or equivalent) dataclass in `shared/models.py`.
    - Update `CourseRepository` to:
      - Load certificate configuration when fetching courses.
      - Save certificate configuration on create/update.
    - Keep existing API responses backward-compatible (same top-level shape returned to admin dashboard and mobile).

- **1.3 Model course delivery categories and structure**
  - Clarify and model **Recorded, Online, In‑Person** categories:
    - At **course level**: a course may support one or more delivery modes (e.g. fully recorded, mixed recorded+live, fully in-person).
    - At **class/session level**: each class within the course has a specific type and duration.
  - Schema changes:
    - Add a `delivery_modes` column to `courses` (e.g. Postgres `text[]` or JSON array of `recorded|online|in_person`).
    - Create or extend a `course_classes` / `course_sessions` table (if not already present) with at least:
      - `id`, `course_id`, `title`, `description`, `class_type` enum (`recorded|online|in_person`), `duration_minutes`, `start_time`, `end_time`, optional `zoom_link`, optional `location` (for in-person), optional `recording_material_id` (links to `materials`), sort `order`.
    - Add migration `006_course_classes.sql` (or extend existing class table).
  - Models and repositories:
    - Add `CourseClass`/`CourseSession` dataclass to `shared/models.py`.
    - Extend `CourseRepository`:
      - When fetching a course (for admin and mobile), load associated classes in order.
      - Support create/update/delete of classes as part of course create/update operations.

- **1.4 Model course registration and enrollment state**
  - Confirm current registration schema:
    - Inspect `docs/migrations/003_courses.sql` and `lambdas/courses/repository.py` for any `course_registrations`/`course_participants` table.
  - If missing or incomplete:
    - Add `course_registrations` table with fields:
      - `id`, `course_id`, `user_id`, `status` (`interested`, `applied`, `registered`, `completed`, `dropped`), `created_at`, `updated_at`, `notes`, `source` (e.g. `mobile`, `admin`, `offline`).
    - Migration `007_course_registrations.sql`.
  - Extend `shared/models.py` with `CourseRegistration`.
  - Update `CourseRepository` and `CourseService`:
    - Ensure `register_course(course_id, user_id)`:
      - Creates or updates a `CourseRegistration` row (idempotent by `(course_id, user_id)`).
      - Can set initial status as `interested` or `registered` depending on entry point.
    - Add methods for:
      - Listing registrations per course.
      - Listing registrations per user.
      - Updating registration status (admin-only).

- **1.5 Model exam centers**
  - Define exam center needs:
    - Global exam centers not tied to a single event (e.g. city-based centers).
    - Or events flagged as “exam sessions” associated with courses.
  - Schema:
    - Option A (simpler): Reuse `events` for exam sessions:
      - Add `is_exam` boolean to `events` table with migration `008_event_exam_flag.sql`.
      - Add `course_id` nullable FK to `events`, allowing an event to be tagged as a course exam session.
    - Option B: Dedicated `exam_centers` + `course_exams` tables (if more complex needs).
  - Models:
    - Extend `Event` dataclass to include `is_exam` and `course_id` (if chosen).
    - Or create dedicated `ExamCenter` and `CourseExam` dataclasses.
  - Repositories and services:
    - Update `EventRepository` and `EventService` to:
      - Accept and persist `is_exam` and `course_id` for exam sessions.
      - Support listing exam events per course.

---

## 2. Third-Party Certification Integration (Course-Centric)

Goal: create a **pluggable integration layer** for third-party certifications that sits on top of course completion and attendance/exam data.

- **2.1 Define abstraction for certification providers**
  - Design a provider interface in `shared/`:
    - e.g. `shared/certification/providers.py` with a base class/protocol:
      - `issue_certificate(user, course, completion_context) -> CertificateIssueResult`.
      - `revoke_certificate()`, `get_status()`, etc. (optional for v1).
  - Implement a default **internal provider** (`SamagyaanCertificateProvider`) that:
    - Generates certificate IDs and stores them in a `course_certificates_issued` table.
    - Renders PDFs using a template (see Section 11) or records as a DB row for now.
  - Design a config model:
    - In `CourseCertificate` model, include:
      - `provider` (`pi_internal`, `aws`, `coursera`, etc.).
      - `external_config` JSON for provider-specific settings (API keys, template IDs, etc.).

- **2.2 Extend backend for certificate lifecycle**
  - Create a new Lambda or extend an existing one:
    - Option A: Reuse `lambdas/courses` to include certificate issuance endpoints.
    - Option B: Separate `lambdas/certificates` for clarity.
  - Endpoints (initial version):
    - `POST /courses/{course_id}/certificates/preview`:
      - Accepts `user_id` (or uses current user), fetches course + completion metrics, and returns eligibility + likely certificate metadata.
    - `POST /courses/{course_id}/certificates/issue`:
      - Admin-only or system-only endpoint to actually issue a certificate for a user.
      - Stores entry in `course_certificates_issued` with:
        - `id`, `course_id`, `user_id`, `provider`, `certificate_id`, `issued_at`, `metadata` (JSON).
    - `GET /courses/{course_id}/certificates/{user_id}`:
      - Returns current status and download URL if available.
  - Implement service layer:
    - In `CourseService` (or `CertificateService`):
      - Resolve course certificate config.
      - Call appropriate provider.
      - Check eligibility using completion data (see Section 9 and 10).

- **2.3 Capture minimal third-party integration hooks**
  - For now:
    - Model external providers in DB and code but **keep integration mostly manual**, e.g.:
      - Record an `external_certificate_id` and a `verification_url` for each issued certificate.
    - When ready, extend provider to:
      - Call external APIs (e.g., vendor’s REST APIs) with proper secrets in environment variables / AWS Secrets Manager.

---

## 3. Course Interest and Registration Flow (App → Admin Dashboard)

Goal: implement the **“Interested” → admin review → registration → material access** pipeline.

- **3.1 Define registration and interest API contracts**
  - Decide final endpoints (likely under `payintelli-courses`):
    - `POST /courses/{course_id}/interest` – mark current user as interested.
    - `POST /courses/{course_id}/register` – convert to registered.
    - `GET /courses/{course_id}/registrations` – list all registrations (admin-only).
    - `GET /me/courses` – list current user’s registrations and statuses.
  - Update `lambdas/courses/handler.py` to route these paths.

- **3.2 Implement course interest flag logic in backend**
  - In `CourseService`:
    - Add `mark_interest(course_id, user_id)`:
      - Create or update a `CourseRegistration` row with `status='interested'`.
      - Track engagement event (e.g. `engagement_service.track_course_interest`).
    - Add `register_course(course_id, user_id)`:
      - If existing registration with `interested` or `applied`, update to `registered`.
      - If none, create new row with `registered`.
    - Add `list_registrations(course_id)` and `list_user_registrations(user_id)`.
  - Update `CourseRepository` to support these operations with proper constraints and indexes.

- **3.3 Expose course interest to admin dashboard**
  - API changes:
    - Extend `admin-dashboard/src/services/api.ts`:
      - `getCourseRegistrations(courseId)`.
      - Optionally filter by `status` (`interested`, `registered`, etc.).
  - Admin UI:
    - In `admin-dashboard/src/app/dashboard/courses/[id]/page.tsx`:
      - Add a **“Registrations & Interests”** section:
        - Table with columns: `Name`, `Email`, `User Type (student/professional)`, `Status`, `Created At`, `Last Updated`, `Notes`.
        - Filters on status.
    - Optionally add a dedicated **“Course Enquiries”** page:
      - `admin-dashboard/src/app/dashboard/course-enquiries/page.tsx` listing all `interested` registrations across courses.

- **3.4 Implement interest action in mobile app**
  - API client:
    - In `mobile-app/src/services/api.ts`:
      - Add `markCourseInterest(courseId)` calling `POST /courses/{course_id}/interest`.
      - Add `registerCourse(courseId)` calling `POST /courses/{course_id}/register`.
  - Hooks:
    - In `mobile-app/src/hooks/useCourses.ts`:
      - Add React Query mutations for interest and register.
  - UI:
    - In `CourseDetailScreen`:
      - Show an **“I’m Interested”** button when user is not yet registered:
        - On tap, call `markCourseInterest`.
        - Update local state to reflect `Interested` status (disable or change button label).
      - Optionally show **“Register Now”** button when admin has processed interest and user is allowed to register (future enhancement).

- **3.5 Admin tracking and manual outreach**
  - Extend admin course registrations UI:
    - Add a column for `Contact Status` or `Notes`:
      - Simple textarea or tags field (e.g. `Contacted`, `Call Scheduled`, `Completed Registration`, `No Response`).
    - Allow admin to:
      - Update registration status from `interested` → `registered` or `dropped`.
      - Add notes about communication.
  - This aligns with:
    - **User flow**: Course shown in app → Interested → flag appears in admin → admin looks up profile → contacts user → updates status.

---

## 4. Course Categories and Class-Level Flags (Recorded / Online / In-Person)

Goal: show and manage course **delivery modes** and **per-class flags** in both admin and mobile.

- **4.1 Admin – course-level categories**
  - In `admin-dashboard/src/types/course.ts`:
    - Add `deliveryModes?: ('recorded' | 'online' | 'in_person')[]`.
  - In `CourseForm`:
    - Add a multi-select or checkbox group for delivery modes.
    - Ensure data is sent to the backend as `delivery_modes` field.
  - In `Course` list view:
    - Add a column to show delivery modes summary (e.g. badges for Recorded/Online/In-Person).

- **4.2 Admin – class/session-level flags**
  - Extend `CourseForm` to manage **Classes** or **Sessions**:
    - Allow admin to add/edit/delete class entries:
      - Fields: `Title`, `Class Type (Recorded/Online/In-Person)`, `Duration (minutes or HH:MM)`, `Start Time`, `End Time`, `Zoom Link` (for online), `Location` (for in-person), `Linked Material` (for recorded).
    - Persist this structure via the updated course API (see Section 1.3).
  - Ensure backend validation:
    - `class_type` is restricted to defined enum.
    - For `recorded` type, `recording_material_id` is optional but recommended.
    - For `online` type, `zoom_link` is optional but used when available.
    - For `in_person`, `location` is required.

- **4.3 Mobile app – course and class display**
  - Update `mobile-app/src/types/course.ts`:
    - Add `deliveryModes` and `classes` (or `sessions`) aligned with backend.
  - In `CoursesScreen`:
    - Show icons/badges summarizing course delivery modes on each card.
  - In `CourseDetailScreen`:
    - Under the course description, render a **Class Schedule** section:
      - List of classes:
        - Leading icon/flag for `Recorded`, `Online`, `In-Person`.
        - Title text.
        - Duration at the end of the line (e.g. `60 min`).
      - If `start_time`/`end_time` present, show localized date/time.

---

## 5. Attendance Management Across Modes (Online, In-Person, Recorded)

Goal: unify attendance recording logic so that **events/classes linked to a course** drive course-level attendance and completion.

- **5.1 Extend attendance model for mode and course association**
  - Add columns to `attendance` table via migration (e.g. `009_attendance_mode_and_course.sql`):
    - `mode` enum (`recorded`, `online`, `in_person`) – optional for existing records.
    - `course_id` nullable FK (if attendance is part of a course).
    - `class_id`/`session_id` nullable FK (if referencing `course_classes`).
  - Update `Attendance` dataclass in `shared/models.py` accordingly.

- **5.2 In-person attendance via QR**
  - Existing flow:
    - Admin creates an event with QR.
    - Mobile `QRScannerScreen` reads QR (event ID) and navigates to event; user taps **Join**; backend writes to `attendance`.
  - Enhancements:
    - When creating an **in-person class** that belongs to a course:
      - Admin dashboard should:
        - Either: automatically create a backing `Event` with `event_type='offline'`, `is_exam=false`, and `course_id` set.
        - Or: provide UI to link the class to an existing event.
      - Store the mapping so that `AttendanceService.join_event` can backfill `course_id` and `class_id` on the attendance row.
    - On course details in admin dashboard:
      - Show in-person classes with a quick link to **View QR** (re-using `Event` QR feature).

- **5.3 Online attendance via Zoom / virtual sessions**
  - Decide how to ingest Zoom (or other platform) attendance:
    - Start with **CSV upload** via admin dashboard:
      - After each online class, export Zoom participant list as CSV.
      - In admin dashboard:
        - Add a page/section under **Attendance** or inside each online class:
          - Form to upload CSV and select:
            - Associated course.
            - Associated class/session (online).
      - Backend lambda (could reuse `attendance` or create `attendance-import` endpoint):
        - Parse CSV and map to users by email (or display name → email mapping rule).
        - For each matched user:
          - Create or update attendance row with `mode='online'`, `course_id`, `class_id`, and `event_id` (if event exists).
  - Optional future automation:
    - Use Zoom webhooks / APIs integrated in a dedicated lambda, but keep Phase 3 v1 manual via CSV.

- **5.4 Recorded attendance via video completion**
  - Implementation strategy:
    - For recorded content, rely on:
      - Either: a video player inside the app (e.g. using `react-native-video`) to track progress.
      - Or: a timer-based heuristic (e.g. pressing a “Mark Complete” button after playback).
  - Backend integration:
    - Add an endpoint, e.g. `POST /courses/{course_id}/classes/{class_id}/complete`:
      - Marks attendance with `mode='recorded'` for current user.
      - Optional: store `progress_percent` in a separate table or JSON column.
  - Mobile UI:
    - For recorded classes in `CourseDetailScreen`:
      - Show a **“Start Video”** action that opens material.
      - On completion (or manual “Mark Complete”):
        - Call the completion endpoint.
      - Show a checkmark/“Completed” label when attendance exists.

- **5.5 Attendance query APIs**
  - Backend:
    - Add endpoints:
      - `GET /courses/{course_id}/attendance` – admin-only summary across classes and modes.
      - `GET /me/courses/{course_id}/attendance` – user-specific attendance breakdown.
  - Use these endpoints later for:
    - Course completion logic (Section 9).
    - Admin dashboards (attendance per course/class).

---

## 6. .ics Calendar Generation and Notifications

Goal: generate **.ics files** for events/classes and wire basic in-app notifications/reminders.

- **6.1 Identify use cases for .ics**
  - For events:
    - Allow users to add an event/class to their personal calendar.
  - For courses:
    - Provide a **course calendar** (.ics) including all upcoming classes (online and in-person).

- **6.2 Backend – .ics generation**
  - Add a small utility in `shared/` (e.g. `shared/calendar/ics.py`) to:
    - Accept event/class/course schedule data.
    - Generate minimal RFC 5545-compliant `.ics` content (VEVENT entries with `DTSTART`, `DTEND`, `SUMMARY`, `DESCRIPTION`, `LOCATION`).
  - Expose endpoints:
    - `GET /events/{event_id}/calendar.ics` – returns `text/calendar` content.
    - `GET /courses/{course_id}/calendar.ics` – builds ICS from all associated events/classes.
  - Wire `lambdas/events` and/or `lambdas/courses` handlers to serve these.

- **6.3 Mobile app – calendar integration**
  - In `EventScreen` and `CourseDetailScreen`:
    - Add **“Add to Calendar”** actions:
      - Either: use `Linking.openURL` to download the `.ics` file and hand off to OS.
      - Or: use an Expo module (`expo-calendar`) to create native calendar events (requires permissions; can be Phase 3B).
  - Handle both cases:
    - For now, at least support `.ics` file download/open.

- **6.4 Notifications architecture in app**
  - Decide notification layer:
    - Option A: Local scheduled notifications only (no backend push) using `expo-notifications`.
    - Option B: Full push notifications (requires FCM/APNs config and backend token storage).
  - v1 (recommended): Local notifications:
    - When user registers for a course or joins an event, schedule:
      - A reminder X hours before `start_time`.
    - Implement helper in mobile app:
      - `scheduleEventReminder(event)` and `scheduleClassReminders(course)` using local scheduling.
  - Add minimal backend fields if needed:
    - E.g. `reminder_offset_minutes` in course/events schemas for default reminder times.

---

## 7. Admin Dashboard Enhancements for Courses & Attendance

Goal: give admins full visibility over **course interest, registrations, attendance, and certification readiness**.

- **7.1 Course enquiries and interested list**
  - Implement a **“Course Enquiries”** page (`/dashboard/course-enquiries`):
    - Fetches all `CourseRegistration` rows with `status='interested'`.
    - Columns: `Course Title`, `User Name`, `Email`, `User Type`, `Created At`, `Status`, `Notes`.
    - Allow filtering by course and date.
  - From each row:
    - Provide quick link to `User` profile page.
    - Provide quick action to update status (`interested` → `registered` or `dropped`).

- **7.2 Course detail view – registrations & attendance**
  - Enhance `courses/[id]/page.tsx`:
    - Add subtabs:
      - `Overview`: existing detail view.
      - `Registrations`: list of all `CourseRegistration` entries.
      - `Attendance`: per class breakdown.
      - `Certificates` (future).
  - `Registrations` tab:
    - Table with inline status changing and notes editing.
  - `Attendance` tab:
    - Aggregate stats per class and per user:
      - Class rows with counts of present/absent by mode.
      - Option to drill down to a per-user table.

- **7.3 Attendance import UI**
  - Add UI to upload CSV for online classes:
    - On `Attendance` tab, for online classes:
      - Upload button for Zoom CSV.
      - Show import history and any errors (e.g., unmatched emails).
  - Backend:
    - Extend `attendance` lambda to handle CSV ingestion (Section 5.3).

- **7.4 Certification readiness indications**
  - On `Attendance` tab and `Registrations` tab:
    - Compute for each registered user:
      - Attendance percentage (across required classes).
      - Exam status (see Section 10).
      - Eligibility flag for certificate (true/false).
  - Show summary counts:
    - `Eligible for Certificate`, `At Risk`, `Not Eligible`.

---

## 8. Course Materials Linked to Classes and Learning Paths

Goal: connect the existing **event materials** system to courses and per-class learning paths.

- **8.1 Extend materials to support course/class relations**
  - Schema:
    - Add `course_id` and `class_id` nullable columns to `materials` via migration (e.g. `010_materials_course_link.sql`).
    - Ensure existing event-based usage remains valid (nullable and backwards compatible).
  - Model:
    - Update `Material` dataclass in `shared/models.py` with `course_id` and `class_id`.

- **8.2 Backend logic for materials in a course context**
  - In `MaterialService`:
    - On `create_material`, allow passing `course_id` and `class_id` in request body.
    - Add method to list materials:
      - By event: existing behavior.
      - By course: `GET /materials?course_id=...`.
      - By class: `GET /materials?class_id=...`.
  - Decide how class → material mapping works:
    - For recorded classes:
      - Set `class.recording_material_id` to the created material.
    - For live/online classes:
      - Optional additional resources as separate materials.

- **8.3 Admin dashboard – materials per course/class**
  - Extend materials page:
    - Add filters for `By Event` and `By Course`.
  - In `Course` detail view:
    - For each class, show linked materials.
    - Provide inline actions to:
      - Upload / attach materials for that class (re-using `MaterialUploader` with course/class context).

- **8.4 Mobile app – materials per course/class**
  - In `CourseDetailScreen`:
    - Within class list, show icons/links for associated materials.
    - When a user taps a material:
      - Use existing download flow (`getDownloadUrl`) and open it.
      - Optionally trigger recorded attendance completion (Section 5.4).

---

## 9. Attendance–Completion–Certification Synchronization

Goal: define and implement **course completion logic** that uses attendance and exams to determine when to issue certificates.

- **9.1 Define completion rules per course**
  - For each course, allow admin to configure:
    - Required attendance percentage (e.g. 75% of in-person + online classes).
    - Required recorded classes completion percentage (e.g. 100% of recorded content).
    - Required exam(s) (see Section 10) and passing criteria.
  - Schema:
    - Add a `completion_rules` JSON column to `courses` or `course_certificates` table with structure:
      - `minAttendancePercent`, `minRecordedCompletionPercent`, `requiredExams: [exam_ids]`, etc.
  - Model and admin UI:
    - In `CourseForm`, add a **Completion Rules** section:
      - Simple sliders/inputs for percentages.
      - Multi-select for required exams (once exams are modeled).

- **9.2 Implement completion evaluator in backend**
  - Add a `CourseCompletionService` in `lambdas/courses` or `shared/`:
    - Methods:
      - `get_user_progress(course_id, user_id)`:
        - Aggregates attendance across classes:
          - `in_person` + `online` vs total scheduled required.
        - Aggregates recorded completion events.
        - Aggregates exam attempts and scores.
      - `is_completed(course_id, user_id)`:
        - Compares aggregated data with `completion_rules`.
        - Returns boolean + breakdown.
  - Expose endpoints:
    - `GET /courses/{course_id}/progress` (admin; with `user_id` param).
    - `GET /me/courses/{course_id}/progress` (current user).

- **9.3 Integrate completion with certificate issuance**
  - In certificate issuance endpoint (Section 2.2):
    - Before issuing, always call `is_completed(course_id, user_id)`.
    - If not completed:
      - Return HTTP 400 with explanation.
  - Optionally:
    - Add a background or scheduled job (outside Phase 3 if necessary) to auto-issue certificates when users cross thresholds.

- **9.4 Surface completion status in UI**
  - Admin dashboard:
    - Show completion and eligibility in course `Registrations` and `Certificates` tabs.
  - Mobile app:
    - On `CourseDetailScreen`, show:
      - Progress bar (completed vs required).
      - Badge for `Completed` when criteria met.
      - When completed and certificate exists, show **“View Certificate”** (Section 11).

---

## 10. Exam Center and Assessment Flows

Goal: provide **exam centers** and **assessment flows** that feed into course completion and certification.

- **10.1 Model exams**
  - Schema:
    - Create tables (migration `011_exams.sql`):
      - `exams`: `id`, `course_id`, `title`, `description`, `type` (`online_mcq`, `offline_written`, `practical`), `max_score`, `pass_score`, `is_proctored`, `created_at`.
      - `exam_attempts`: `id`, `exam_id`, `user_id`, `score`, `status` (`pending`, `passed`, `failed`), `attempted_at`, `metadata` JSON (raw responses, etc.).
  - Model:
    - Add `Exam` and `ExamAttempt` dataclasses in `shared/models.py`.
  - Repository + service:
    - New `lambdas/exams` or extend `lambdas/courses`:
      - CRUD for exams.
      - Record exam attempts and compute pass/fail.

- **10.2 Integrate with events as exam centers**
  - Using `events` with `is_exam` and `course_id`:
    - When an exam event is scheduled:
      - Link to an `Exam` record.
    - Attendance at exam events:
      - Combined with attempt records to mark participation.
  - Admin dashboard:
    - In course detail, add **Exams** section:
      - List exams and associated events (exam centers/logistics).

- **10.3 MCQ exams using existing poll infrastructure**
  - Reuse `polls`:
    - Use `polls` for **single-question or multi-question MCQ**-style quizzes.
    - For structured exams:
      - Use `polls` + `poll_options` + `votes` as the answer storage.
  - Extend `polls` model:
    - Add fields:
      - `is_exam` boolean.
      - `correct_option_id` (or a mapping for multi-correct).
      - `score` per poll.
  - Backend logic:
    - After user votes in exam polls:
      - Compute score by comparing chosen option with `correct_option_id`.
      - Aggregate per exam and store in `exam_attempts`.

- **10.4 Mobile app exam experience**
  - Add exam flow in mobile:
    - For MCQ-style exams:
      - Dedicated screen (or reuse `PollScreen` with exam mode).
      - Show timer/countdown if needed (future).
    - After exam submission:
      - Show score and pass/fail status.
  - Wire results into `CourseCompletionService` (Section 9.2).

---

## 11. Certificate of Attendance and Event Certificates

Goal: automatically generate **certificates of attendance** for events and courses, using a Samagyaan Data solutions template.

- **11.1 Define certificate templates**
  - Create a base **Samagyaan Data solutions certificate template**:
    - PDF/HTML template with placeholders:
      - `{user_name}`, `{course_name}`, `{event_name}`, `{date}`, `{hours}`, `{certificate_id}`, `{issuer}`.
  - Store template assets:
    - Either in a `templates/` directory in repo.
    - Or in an S3 bucket with a known key.

- **11.2 Implement certificate generation service**
  - In backend (new `lambdas/certificates` or inside `lambdas/courses`):
    - Use a Python templating approach to generate PDFs:
      - Option A: HTML + headless browser (Puppeteer) – heavier.
      - Option B: pure Python PDF lib (e.g. ReportLab) – simpler but more code.
    - Minimal v1:
      - Generate a PDF file in S3 under `certificates/{course_id}/{user_id}/{certificate_id}.pdf`.
  - Model:
    - `CertificatesIssued` table:
      - `id`, `user_id`, `course_id` (nullable for event-only certificates), `event_id` (nullable), `certificate_type` (`attendance`, `completion`), `provider`, `certificate_url`, `issued_at`, `metadata` JSON.

- **11.3 Attendance-based certificates for events**
  - Logic:
    - For selected events (flag `issue_attendance_certificate=true` in `events` table):
      - Attendance count/time threshold can determine eligibility (e.g., must have joined and not left early – Phase 3 may only rely on attendance presence).
    - Admin triggers:
      - Add admin dashboard action: **“Generate Attendance Certificates”** on event page.
      - Backend:
        - Fetch all attendees.
        - For each, create a certificate entry and generate PDF.
  - Mobile / web:
    - Surface certificates in **My Certificates** (later) or `EventScreen` if relevant.

- **11.4 Course completion certificates**
  - When user completes a course per rules (Section 9):
    - Generate a **Course Completion Certificate** using course-level template (and third-party provider abstraction from Section 2).
  - Admin view:
    - In course `Certificates` tab:
      - Show list of issued certificates per user.
      - Provide download links and status.

---

## 12. Privacy Policy for PiLearn Mobile Application

Goal: create and integrate a **Privacy Policy** for the PiLearn mobile app and platform.

- **12.1 Draft privacy policy content**
  - Create a markdown document (Phase 3 task) e.g. `docs/PILEARN_PRIVACY_POLICY.md` containing:
    - Data collected:
      - Profile info (name, email, university/company, course, year, city/state, designation).
      - App analytics and engagement (events attended, materials downloaded, polls answered).
      - Course registrations and attendance.
    - How data is used:
      - To provide courses, events, certification, analytics, and gamification/leaderboards.
    - Data sharing:
      - With partner institutions and third-party certification providers when needed.
    - Retention, security, user rights, contact information.
  - Have the policy reviewed by legal/compliance where possible.

- **12.2 Expose privacy policy in the mobile app**
  - Add a **“Privacy Policy”** screen:
    - New route in `AppNavigator` under settings/profile area.
    - Render markdown or hard-coded text from the policy.
  - Add link in:
    - Login/signup screens.
    - Profile screen or settings.

- **12.3 Track privacy policy acceptance**
  - Schema:
    - Add `privacy_policy_version` and `privacy_policy_accepted_at` to `users` table via migration.
  - Backend:
    - Add endpoint `POST /users/me/privacy-consent`:
      - Stores acceptance timestamp and version.
  - Mobile UI:
    - During onboarding or first app open after Phase 3:
      - Show a modal or screen summarizing key points with checkbox “I agree”.
      - Call `privacy-consent` endpoint on acceptance.

---

## 13. Cross-Cutting Concerns and Non-Functional Requirements

- **13.1 Security and auth**
  - Ensure all new endpoints:
    - Use Cognito JWT auth via existing `shared/auth.py`.
    - Enforce proper roles:
      - Admin-only routes for managing courses, registrations, attendance imports, certificates, exams.
      - User routes for self-registration, attendance, progress, and certificate viewing.

- **13.2 Observability and logging**
  - Add structured logging in new lambdas for:
    - Certificate issuance.
    - Attendance imports.
    - Exam attempts.
  - Update `docs/MASTER_SYSTEM_DOC.md` with new endpoints and important logs.

- **13.3 Backward compatibility**
  - All schema changes must:
    - Be additive where possible (new columns with defaults).
    - Keep existing mobile and admin clients working even before Phase 3 UI updates.
  - For breaking changes:
    - Coordinate deployments and do feature-flagging where necessary.

- **13.4 Testing**
  - Add unit tests for:
    - Course completion logic.
    - Certificate issuance preconditions.
    - Attendance import parsing.
  - Add end-to-end smoke tests for:
    - Course interest → admin view → registration.
    - Course schedule → attendance per mode → completion → certificate issuance.

---

## 14. Recommended Execution Order (High-Level)

1. **Data and models first**: complete Section 1 (schema and models) so all subsequent features have a solid base.
2. **Interest + registrations**: implement Section 3 to connect app interest with admin view.
3. **Course categories and classes**: implement Section 4 to get structure and flags in place.
4. **Attendance unification**: implement Section 5 so attendance works across recorded/online/in-person.
5. **.ics and basic notifications**: implement Section 6 for user convenience.
6. **Admin dashboards for registrations/attendance**: implement Section 7.
7. **Materials ↔ courses/classes linkage**: implement Section 8 for learning paths.
8. **Completion logic and synchronization**: implement Section 9 for progress and readiness.
9. **Exams and exam centers**: implement Section 10.
10. **Certificates (attendance + course completion)**: implement Section 11 with Samagyaan Data solutions template.
11. **Privacy policy drafting and integration**: implement Section 12.
12. **Security, observability, and testing**: finalize Section 13 and ensure all new flows are stable.

