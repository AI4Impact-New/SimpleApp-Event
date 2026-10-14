CREATE TABLE IF NOT EXISTS website_enquiries (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    interest VARCHAR(255) NOT NULL,
    consent BOOLEAN NOT NULL CHECK (consent),
    consent_version VARCHAR(80) NOT NULL,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_page VARCHAR(255) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','registered','dropped')),
    notes TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS website_enquiries_status_created_idx ON website_enquiries(status, created_at DESC);
