ALTER TABLE website_enquiries ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'guidance' CHECK(kind IN ('guidance','employer'));
ALTER TABLE website_enquiries ADD COLUMN IF NOT EXISTS organisation VARCHAR(255);
ALTER TABLE website_enquiries ADD COLUMN IF NOT EXISTS hiring_roles VARCHAR(2000);
CREATE INDEX IF NOT EXISTS idx_website_enquiries_kind_created ON website_enquiries(kind,created_at DESC);
CREATE TABLE IF NOT EXISTS enquiry_audit (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 enquiry_id UUID NOT NULL REFERENCES website_enquiries(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 old_status TEXT NOT NULL,new_status TEXT NOT NULL,
 changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
