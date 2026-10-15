-- Demo commerce uses integer paise; no card data or real settlement is stored.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS marked_price_paise BIGINT NOT NULL DEFAULT 0 CHECK(marked_price_paise BETWEEN 0 AND 1000000000);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS discount_bps INTEGER NOT NULL DEFAULT 0 CHECK(discount_bps BETWEEN 0 AND 10000);
ALTER TABLE lecture_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
UPDATE lecture_progress SET completed_at=updated_at WHERE completed=true AND completed_at IS NULL;
CREATE TABLE IF NOT EXISTS lecture_access (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 class_id UUID NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
 unlocked_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 reset_by UUID REFERENCES users(id) ON DELETE SET NULL,
 PRIMARY KEY(user_id,class_id), CHECK(expires_at>unlocked_at)
);
CREATE TABLE IF NOT EXISTS demo_orders (
 id UUID PRIMARY KEY,
 request_id UUID NOT NULL,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
 course_title TEXT NOT NULL,
 buyer_name TEXT NOT NULL,
 buyer_email TEXT NOT NULL,
 marked_price_paise BIGINT NOT NULL CHECK(marked_price_paise BETWEEN 0 AND 1000000000),
 discount_bps INTEGER NOT NULL CHECK(discount_bps BETWEEN 0 AND 10000),
 discount_paise BIGINT NOT NULL CHECK(discount_paise>=0),
 total_paise BIGINT NOT NULL CHECK(total_paise>=0),
 currency TEXT NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','demo_completed','cancelled')),
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '7 days',
 completed_at TIMESTAMPTZ,
 UNIQUE(user_id,request_id), CHECK(total_paise=marked_price_paise-discount_paise),
 CHECK(discount_paise<=marked_price_paise)
);
CREATE INDEX IF NOT EXISTS idx_demo_orders_user ON demo_orders(user_id,created_at DESC);
ALTER TABLE video_assets ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
UPDATE video_assets SET published_at=created_at WHERE status='ready' AND published_at IS NULL;
