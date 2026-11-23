-- Keep existing finance batch IDs and primary trainer references.
ALTER TABLE fee_batches
    ADD COLUMN name text,
    ADD COLUMN ends_on date,
    ADD COLUMN archived_at timestamptz,
    ADD CONSTRAINT fee_batches_id_course_unique UNIQUE (id, course_id),
    ADD CONSTRAINT fee_batches_dates CHECK (ends_on IS NULL OR ends_on >= starts_on);

CREATE TABLE batch_assistant_trainers (
    batch_id uuid NOT NULL REFERENCES fee_batches(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id),
    PRIMARY KEY (batch_id, user_id)
);

ALTER TABLE course_registrations
    ADD COLUMN batch_id uuid,
    ADD CONSTRAINT registration_batch_course_fk
        FOREIGN KEY (batch_id, course_id) REFERENCES fee_batches(id, course_id);

CREATE INDEX registration_batch_idx ON course_registrations (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX fee_batches_course_idx ON fee_batches (course_id, starts_on DESC);

CREATE TABLE batch_assignment_history (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id uuid NOT NULL REFERENCES course_registrations(id) ON DELETE CASCADE,
    previous_batch_id uuid REFERENCES fee_batches(id),
    batch_id uuid REFERENCES fee_batches(id),
    changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX batch_assignment_history_registration_idx
    ON batch_assignment_history (registration_id, id DESC);

-- Import only unambiguous, open live fee agreements for enrolled students.
WITH existing_assignments AS (
    SELECT a.user_id, a.course_id, (array_agg(DISTINCT a.batch_id))[1] AS batch_id
    FROM fee_accounts a
    JOIN fee_batches b ON b.id=a.batch_id AND b.course_id=a.course_id
    WHERE a.mode='live' AND a.closed_at IS NULL AND a.batch_id IS NOT NULL
    GROUP BY a.user_id, a.course_id
    HAVING count(DISTINCT a.batch_id)=1
)
UPDATE course_registrations r
SET batch_id=a.batch_id
FROM existing_assignments a
WHERE r.user_id=a.user_id AND r.course_id=a.course_id
  AND r.status IN ('registered','completed');
