-- Assisted enrolment never treats demo completion as payment or enrolment.
CREATE TABLE IF NOT EXISTS assisted_enrollments (
 enquiry_id UUID PRIMARY KEY REFERENCES website_enquiries(id) ON DELETE RESTRICT,
 profile JSONB NOT NULL DEFAULT '{}'::jsonb,
 account_authorized BOOLEAN NOT NULL DEFAULT false,
 authorized_by UUID REFERENCES users(id),
 authorized_at TIMESTAMPTZ,
 user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
 cognito_username TEXT,
 account_created_here BOOLEAN NOT NULL DEFAULT false,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE demo_orders ADD COLUMN IF NOT EXISTS enquiry_id UUID REFERENCES website_enquiries(id) ON DELETE RESTRICT;
ALTER TABLE demo_orders ADD COLUMN IF NOT EXISTS quote_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_demo_orders_enquiry ON demo_orders(enquiry_id,created_at DESC);
CREATE TABLE IF NOT EXISTS assisted_actions (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 enquiry_id UUID NOT NULL REFERENCES website_enquiries(id) ON DELETE RESTRICT,
 actor_id UUID REFERENCES users(id),
 action TEXT NOT NULL,
 request_id UUID NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','failed')),
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(enquiry_id,action,request_id)
);
