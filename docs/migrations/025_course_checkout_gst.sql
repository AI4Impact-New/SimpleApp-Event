BEGIN;

ALTER TABLE payment_orders
    ADD COLUMN IF NOT EXISTS gst_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_bps INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_check;
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_gst_total;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_gst_total CHECK (
    gst_bps BETWEEN 0 AND 10000
    AND gst_paise = round((marked_price_paise - discount_paise)::numeric * gst_bps / 10000)
    AND total_paise = marked_price_paise - discount_paise + gst_paise
);

COMMIT;
