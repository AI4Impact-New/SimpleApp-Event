-- Separate real provider records from historical demo quotes.
CREATE TABLE IF NOT EXISTS payment_orders (
 id UUID PRIMARY KEY, request_id UUID NOT NULL,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
 course_title TEXT NOT NULL, buyer_name TEXT NOT NULL, buyer_email TEXT NOT NULL,
 marked_price_paise BIGINT NOT NULL, discount_bps INTEGER NOT NULL,
 discount_paise BIGINT NOT NULL, total_paise BIGINT NOT NULL CHECK(total_paise>=100),
 currency TEXT NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 mode TEXT NOT NULL CHECK(mode IN ('test','live')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','partially_refunded','refunded')),
 provider_order_id TEXT UNIQUE, provider_payment_id TEXT UNIQUE,
 refunded_paise BIGINT NOT NULL DEFAULT 0 CHECK(refunded_paise>=0),
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '7 days',
 completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id), CHECK(total_paise=marked_price_paise-discount_paise),
 CHECK(discount_paise>=0 AND discount_paise<=marked_price_paise), CHECK(refunded_paise<=total_paise)
);
CREATE INDEX IF NOT EXISTS payment_orders_pending ON payment_orders(created_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS payment_orders_user ON payment_orders(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS payment_webhook_events (
 event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, body_sha256 TEXT NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS payment_events_pending ON payment_webhook_events(next_attempt_at) WHERE processed_at IS NULL;
