# Student onboarding and batches

The Admin Console uses **Student onboarding** as the entry point for website student enquiries, app course interests and staff-assisted enrolment. The old Course Enquiries URL redirects to onboarding. Employer hiring enquiries remain available in the Employer enquiries tab.

## Staff workflow

1. Select Student pipeline to find an existing website enquiry, or New onboarding for a call received directly. Record the learner's permission to be contacted. Search and stage/status filters run on the server, with 50 leads per page.
2. Select a student. Use Call or Email student, enter call notes and save the follow-up status. Follow-up changes appear in the activity history.
3. Complete Student details and record permission to create the account. Create or link the learner's Cognito account, then send the invitation when applicable. Existing accounts retain their credentials.
4. Prepare the personal quote. It is a pro forma quotation. An administrator agrees the instalment schedule and selects the batch. Marketing can complete contact, account and quote steps. Finance writes remain restricted to Admin.
5. Use the Payments ledger for the actual payment link or cleared offline payment. The first cleared instalment grants course access through the existing payment workflow. A saved quote, follow-up status or fee plan does not grant course access.
6. For an app course interest, select Student app interest and Continue onboarding. The operation reuses a matching website enquiry for the same email and course, or creates one stable onboarding record. It preserves the original interest and enrolment status.

## Batch workflow

Open **Batches & trainers** at `/dashboard/batches`. Select a course, create a named batch, set its dates and optional Batch ID, and add the lead and assistant trainers. The database enforces unique batch codes and course-compatible assignments.

Select an enrolled student from the roster and move them to a batch. The UI passes the previous assignment so a concurrent change produces a conflict. Moves are audited. Archived batches cannot receive new assignments. Batch changes do not create enrolments. New fee agreements can inherit the student's current batch or explicitly use Unassigned.

A finance batch selected before payment is attached to the fee agreement. When the first cleared instalment creates an enrolment, the student inherits the fee agreement's active batch. Existing enrolled students retain their current roster assignment. Later transfers are managed in Batches & trainers and are audited.

## API changes

- `GET /admin/onboarding?stage=progress|plan|complete|all&search=&status=&offset=0` returns 50 enquiry summaries with stage counts, total and pagination metadata. Admin and Marketing can use it. It queries stage summaries in PostgreSQL and loads a detailed workspace only when selected.
- `POST /admin/onboarding/interests/{registration_id}` continues a course interest in the pipeline and returns `{id}`. Retries return the same lead.
- `GET /admin/onboarding/{enquiry_id}/followups` returns staff follow-up status history.
- Existing `PATCH /admin/enquiries/{id}` saves status and notes. Existing `/admin/enquiries/{id}/assisted` routes handle profiles, accounts, invitations and quotes.
- `GET /admin/billing/ledger?user_id={id}` scopes the onboarding finance read to the selected student.
- Existing batch implementation from PR #65 is incorporated into this change, including `/admin/batches` create/edit/list, trainer lookup, roster and audited assignments.

## Release requirements

Apply `025_course_batches.sql` once before deploying the Learning Lambda and Admin build. The isolated dev Lambda uses `BILLING_MODE=test`; this permits fee-plan testing without provider credentials or collection of money. Production continues to select its configured Razorpay mode.

## Review evidence

Playwright inspected the v0 reference. Its conversation described the four-step onboarding workflow; the embedded artifact reported that it could not be loaded. Implementation follows the accessible requirements and the existing Admin components. Functional checks and deployment status are reported in the release handoff.
