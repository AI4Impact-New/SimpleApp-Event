-- Learning APIs: private video assets, measured progress, assessments and certificates.
CREATE TABLE IF NOT EXISTS video_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL UNIQUE REFERENCES course_classes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    object_key TEXT NOT NULL UNIQUE,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 43200),
    size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 2147483648),
    status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'ready')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lecture_progress (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    watched_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
    position_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
    watched_ranges JSONB NOT NULL DEFAULT '[]',
    completed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, asset_id)
);
CREATE TABLE IF NOT EXISTS playback_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    last_position NUMERIC NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '4 hours'
);
CREATE INDEX IF NOT EXISTS idx_playback_user_asset ON playback_sessions(user_id, asset_id);
CREATE TABLE IF NOT EXISTS class_attendance (
    class_id UUID NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minutes_attended NUMERIC NOT NULL CHECK (minutes_attended >= 0),
    source TEXT NOT NULL DEFAULT 'admin',
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, user_id)
);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER NOT NULL DEFAULT 1800 CHECK (time_limit_seconds BETWEEN 60 AND 10800);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 20);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS pass_percentage INTEGER NOT NULL DEFAULT 70 CHECK (pass_percentage BETWEEN 0 AND 100);
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_id TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1 CHECK (points BETWEEN 1 AND 100),
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_exam_questions_order ON exam_questions(exam_id, sort_order);
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id);
ALTER TABLE certificates_issued ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_completion_certificate ON certificates_issued(user_id, course_id) WHERE certificate_type = 'completion';
CREATE TABLE IF NOT EXISTS learner_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learner_notifications_user ON learner_notifications(user_id, created_at DESC);
