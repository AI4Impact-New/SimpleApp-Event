-- Non-AI Programme+ services. Additive: existing learning/payment data is untouched.
CREATE TABLE IF NOT EXISTS programme_educators (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 active boolean NOT NULL DEFAULT true, PRIMARY KEY(user_id,course_id)
);
CREATE TABLE IF NOT EXISTS programme_entitlements (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 active boolean NOT NULL DEFAULT true, expires_at timestamptz,
 PRIMARY KEY(user_id,course_id)
);
CREATE TABLE IF NOT EXISTS programme_wallets (
 user_id uuid NOT NULL, course_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('handholding','ai_interview')),
 balance integer NOT NULL CHECK(balance BETWEEN 0 AND 10000),
 PRIMARY KEY(user_id,course_id,kind),
 FOREIGN KEY(user_id,course_id) REFERENCES programme_entitlements(user_id,course_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS programme_credit_entries (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), request_id uuid NOT NULL UNIQUE,
 user_id uuid NOT NULL,course_id uuid NOT NULL,kind text NOT NULL,
 delta integer NOT NULL CHECK(delta<>0), reason text NOT NULL, actor_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(user_id,course_id,kind) REFERENCES programme_wallets(user_id,course_id,kind)
);
CREATE TABLE IF NOT EXISTS programme_sessions (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),request_id uuid NOT NULL UNIQUE,
 course_id uuid NOT NULL REFERENCES courses(id),educator_id uuid NOT NULL REFERENCES users(id),
 kind text NOT NULL CHECK(kind IN ('group','handholding','internship_interview')),
 title varchar(200) NOT NULL,description text NOT NULL DEFAULT '',
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, timezone text NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 500),
 version integer NOT NULL DEFAULT 1,meeting_url text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'published' CHECK(status IN ('published','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(ends_at>starts_at),
 CHECK(kind='group' OR capacity=1)
);
CREATE INDEX IF NOT EXISTS programme_sessions_calendar ON programme_sessions(course_id,starts_at,id);
CREATE TABLE IF NOT EXISTS programme_bookings (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), request_id uuid NOT NULL UNIQUE,
 session_id uuid NOT NULL REFERENCES programme_sessions(id),user_id uuid NOT NULL REFERENCES users(id),
 topic varchar(200) NOT NULL, note varchar(2000) NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','completed','no_show')),
 credit_refunded boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,user_id)
);
CREATE INDEX IF NOT EXISTS programme_bookings_user ON programme_bookings(user_id,created_at DESC,id);
CREATE TABLE IF NOT EXISTS programme_companies (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),name varchar(200) NOT NULL,website text NOT NULL DEFAULT '',description text NOT NULL DEFAULT '',active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS programme_jobs (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), company_id uuid NOT NULL REFERENCES programme_companies(id),
 title varchar(200) NOT NULL,description text NOT NULL,location varchar(200) NOT NULL,remote boolean NOT NULL DEFAULT false,
 skills jsonb NOT NULL DEFAULT '[]',partner varchar(200) NOT NULL DEFAULT '',work_mode text NOT NULL DEFAULT 'onsite' CHECK(work_mode IN ('onsite','hybrid','remote')),employment_type text NOT NULL DEFAULT 'full_time' CHECK(employment_type IN ('full_time','contract','internship')),experience_min integer NOT NULL DEFAULT 0 CHECK(experience_min>=0),experience_max integer NOT NULL DEFAULT 0 CHECK(experience_max>=experience_min),salary_min integer CHECK(salary_min>=0),salary_max integer CHECK(salary_max>=salary_min),salary_currency varchar(3) NOT NULL DEFAULT 'INR',apply_url text NOT NULL DEFAULT '',
 deadline timestamptz NOT NULL,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS programme_jobs_search ON programme_jobs(status,deadline,id);
CREATE TABLE IF NOT EXISTS programme_applications (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),request_id uuid NOT NULL UNIQUE,
 job_id uuid NOT NULL REFERENCES programme_jobs(id),user_id uuid NOT NULL REFERENCES users(id),
 statement varchar(2000) NOT NULL DEFAULT '',consent_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','shortlisted','forwarded','interview','offered','rejected','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(job_id,user_id)
);
CREATE TABLE IF NOT EXISTS programme_internships (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),request_id uuid NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES users(id),course_id uuid NOT NULL REFERENCES courses(id),
 eligible_declaration boolean NOT NULL CHECK(eligible_declaration),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','screening','interview','accepted','rejected','completed')),
 project text NOT NULL DEFAULT '',mentor_id uuid REFERENCES users(id),review_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,course_id)
);
CREATE TABLE IF NOT EXISTS webinar_campaigns (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),title varchar(200) NOT NULL,body varchar(2000) NOT NULL,
 speakers varchar(500) NOT NULL DEFAULT '',starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,timezone text NOT NULL,
 display_from timestamptz NOT NULL,display_until timestamptz NOT NULL,
 delay_seconds integer NOT NULL DEFAULT 15 CHECK(delay_seconds BETWEEN 0 AND 3600),
 variant text NOT NULL DEFAULT 'modal' CHECK(variant IN ('modal','toast')),
 frequency_hours integer NOT NULL DEFAULT 24 CHECK(frequency_hours BETWEEN 1 AND 720),
 meeting_url text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','paused','cancelled')),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at),CHECK(display_until>display_from),CHECK(display_until<=ends_at)
);
CREATE TABLE IF NOT EXISTS webinar_registrations (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),campaign_id uuid NOT NULL REFERENCES webinar_campaigns(id),
 name varchar(120) NOT NULL,email varchar(254) NOT NULL,phone varchar(30) NOT NULL DEFAULT '',
 request_id uuid NOT NULL UNIQUE,notified_version integer NOT NULL DEFAULT 0,consent_at timestamptz NOT NULL,utm_source varchar(200) NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'registered' CHECK(status IN ('registered','cancelled','attended','no_show')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(campaign_id,email)
);
CREATE TABLE IF NOT EXISTS campaign_metrics (
 campaign_id uuid NOT NULL REFERENCES webinar_campaigns(id),event text NOT NULL CHECK(event IN ('impression','dismiss','click')),
 event_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(campaign_id,event_id)
);
CREATE TABLE IF NOT EXISTS programme_audit (
 id bigserial PRIMARY KEY,actor_id uuid REFERENCES users(id),action text NOT NULL,entity_id uuid NOT NULL,
 detail jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notification_preferences (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 email_enabled boolean NOT NULL DEFAULT true,push_enabled boolean NOT NULL DEFAULT true,
 marketing_enabled boolean NOT NULL DEFAULT false,timezone text NOT NULL DEFAULT 'Asia/Kolkata'
);
CREATE TABLE IF NOT EXISTS notification_events (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),event_key text NOT NULL UNIQUE,
 user_id uuid REFERENCES users(id) ON DELETE CASCADE,recipient_email varchar(254),course_id uuid REFERENCES courses(id),
 category text NOT NULL CHECK(category IN ('booking','webinar','career','announcement','marketing')),
 title varchar(200) NOT NULL,body varchar(2000) NOT NULL,
 available_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,
 entity_type text NOT NULL,entity_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(user_id IS NOT NULL OR recipient_email IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS notification_events_due ON notification_events(available_at,id);
ALTER TABLE learner_notifications ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES notification_events(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS learner_notification_event ON learner_notifications(event_id,user_id) WHERE event_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS notification_deliveries (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('email','push')),device_id uuid REFERENCES push_devices(id) ON DELETE SET NULL,
 target_key text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','queued','leased','ticket','accepted','delivered','suppressed','expired','failed','uncertain')),
 attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),lease_until timestamptz,lease_token uuid,
 provider_id text,error_code text,last_provider_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id,channel,target_key)
);
CREATE INDEX IF NOT EXISTS notification_deliveries_due ON notification_deliveries(status,available_at);
CREATE INDEX IF NOT EXISTS notification_deliveries_provider ON notification_deliveries(provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS email_suppressions (email varchar(254) PRIMARY KEY,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS email_webhook_events (id text PRIMARY KEY,kind text NOT NULL,provider_id text,payload jsonb NOT NULL DEFAULT '{}',occurred_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS programme_rate_limits (key text PRIMARY KEY,window_start timestamptz NOT NULL DEFAULT now(),count integer NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS programme_application_history (
 id bigserial PRIMARY KEY,application_id uuid NOT NULL REFERENCES programme_applications(id) ON DELETE CASCADE,
 status text NOT NULL,note varchar(2000) NOT NULL DEFAULT '',actor_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notification_campaigns (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),request_id uuid NOT NULL UNIQUE,
 course_id uuid NOT NULL REFERENCES courses(id),title varchar(200) NOT NULL,body varchar(2000) NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),cursor_user_id uuid,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',recipient_count integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS programme_mutations (
 request_id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES users(id),operation text NOT NULL,payload_hash text NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE programme_applications ADD COLUMN IF NOT EXISTS profile_snapshot jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS programme_screening_rules (
 course_id uuid PRIMARY KEY REFERENCES courses(id),aptitude_exam_id uuid REFERENCES exams(id),technical_exam_id uuid REFERENCES exams(id),CHECK(aptitude_exam_id<>technical_exam_id)
);
CREATE TABLE IF NOT EXISTS programme_mentor_reviews (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),request_id uuid NOT NULL UNIQUE,internship_id uuid NOT NULL REFERENCES programme_internships(id),mentor_id uuid NOT NULL REFERENCES users(id),
 note varchar(2000) NOT NULL,rating integer NOT NULL CHECK(rating BETWEEN 0 AND 100),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE certificates_issued DROP CONSTRAINT IF EXISTS certificates_issued_certificate_type_check;
ALTER TABLE certificates_issued ADD CONSTRAINT certificates_issued_certificate_type_check CHECK(certificate_type IN ('attendance','completion','internship'));
CREATE UNIQUE INDEX IF NOT EXISTS programme_one_internship_certificate ON certificates_issued((metadata->>'internship_id')) WHERE certificate_type='internship';
CREATE TABLE IF NOT EXISTS programme_letters (
 internship_id uuid PRIMARY KEY REFERENCES programme_internships(id),body text NOT NULL,signer varchar(200) NOT NULL,object_key text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz,issued_by uuid NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notification_controls (channel text PRIMARY KEY CHECK(channel IN ('email','push')),paused boolean NOT NULL DEFAULT false,reason varchar(500) NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE notification_events ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
CREATE INDEX IF NOT EXISTS notification_events_pending ON notification_events(available_at,id) WHERE dispatched_at IS NULL;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '{}';
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_start integer NOT NULL DEFAULT 21 CHECK(quiet_start BETWEEN 0 AND 23);
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_end integer NOT NULL DEFAULT 8 CHECK(quiet_end BETWEEN 0 AND 23);
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS daily_limit integer NOT NULL DEFAULT 3 CHECK(daily_limit BETWEEN 1 AND 20);
CREATE TABLE IF NOT EXISTS notification_daily_admission (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,local_day date NOT NULL,event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,local_day,event_id)
);
