-- Durable push outbox. The inbox is always retained independently of push delivery.
CREATE TABLE IF NOT EXISTS push_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
    project_id UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_devices_user ON push_devices(user_id);
CREATE TABLE IF NOT EXISTS push_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES learner_notifications(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ticket','provider_accepted','failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    ticket_id TEXT,
    ticket_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    error_code TEXT,
    UNIQUE(notification_id,device_id)
);
CREATE INDEX IF NOT EXISTS idx_push_jobs_pending ON push_jobs(status,next_attempt_at);
