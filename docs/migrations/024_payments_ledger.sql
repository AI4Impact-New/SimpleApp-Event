-- Fees are obligations, not the current catalog price. Amounts are integer INR paise.
CREATE TABLE IF NOT EXISTS fee_batches (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), code varchar(100) NOT NULL UNIQUE,
 course_id uuid NOT NULL REFERENCES courses(id), trainer_id uuid REFERENCES users(id), starts_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fee_accounts (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), request_id uuid NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES users(id),course_id uuid NOT NULL REFERENCES courses(id),batch_id uuid REFERENCES fee_batches(id),
 mode text NOT NULL CHECK(mode IN ('test','live')),currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 marked_price_paise bigint NOT NULL CHECK(marked_price_paise>=0),discount_bps integer NOT NULL CHECK(discount_bps BETWEEN 0 AND 10000),
 total_paise bigint NOT NULL CHECK(total_paise>0),billed_on date NOT NULL,source_order_id uuid UNIQUE REFERENCES payment_orders(id),
 version integer NOT NULL DEFAULT 1,closed_at timestamptz,created_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fee_account_plan_unique ON fee_accounts(user_id,course_id,mode) WHERE source_order_id IS NULL AND closed_at IS NULL;
CREATE TABLE IF NOT EXISTS fee_plans (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),account_id uuid NOT NULL REFERENCES fee_accounts(id),version integer NOT NULL,
 effective_on date NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),created_by uuid REFERENCES users(id),UNIQUE(account_id,version)
);
CREATE TABLE IF NOT EXISTS fee_installments (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),plan_id uuid NOT NULL REFERENCES fee_plans(id),number integer NOT NULL,
 amount_paise bigint NOT NULL CHECK(amount_paise>0),due_on date NOT NULL,UNIQUE(plan_id,number)
);
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS fee_account_id uuid REFERENCES fee_accounts(id);
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS fee_installment_id uuid REFERENCES fee_installments(id);
CREATE TABLE IF NOT EXISTS fee_entries (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),account_id uuid NOT NULL REFERENCES fee_accounts(id),
 kind text NOT NULL CHECK(kind IN ('payment','refund','fee_adjustment','reversal')),
 amount_paise bigint NOT NULL CHECK(amount_paise<>0),source_key text NOT NULL UNIQUE,
 payment_order_id uuid REFERENCES payment_orders(id),reference text NOT NULL DEFAULT '',effective_at timestamptz NOT NULL,
 created_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),note varchar(1000) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS fee_entries_account_date ON fee_entries(account_id,effective_at);
CREATE TABLE IF NOT EXISTS fee_receipts (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),request_id uuid NOT NULL UNIQUE,account_id uuid NOT NULL REFERENCES fee_accounts(id),
 mode text NOT NULL CHECK(mode IN ('test','live')),method text NOT NULL CHECK(method IN ('cash','bank','offline_upi','cheque')),
 amount_paise bigint NOT NULL CHECK(amount_paise>0),reference varchar(200) NOT NULL DEFAULT '',received_on date NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','cleared','reversed')),cleared_at timestamptz,reversed_at timestamptz,
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),note varchar(1000) NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS fee_receipt_reference_unique ON fee_receipts(mode,method,lower(reference)) WHERE reference<>'';
CREATE TABLE IF NOT EXISTS fee_audit (
 id bigserial PRIMARY KEY,account_id uuid REFERENCES fee_accounts(id),actor_id uuid REFERENCES users(id),action text NOT NULL,
 request_id uuid UNIQUE,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fee_payment_attempts (
 provider_payment_id text PRIMARY KEY,payment_order_id uuid NOT NULL REFERENCES payment_orders(id),
 status text NOT NULL,reason varchar(200),attempted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fee_sync_razorpay() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aid uuid; plan uuid; paid_when timestamptz; seen_refund bigint; delta bigint; billed bigint; collected bigint; fee_credit bigint;
BEGIN
 IF NEW.status NOT IN ('paid','partially_refunded','refunded') OR NEW.provider_payment_id IS NULL THEN RETURN NEW; END IF;
 aid:=NEW.fee_account_id;
 IF aid IS NULL THEN
  INSERT INTO fee_accounts(request_id,user_id,course_id,mode,marked_price_paise,discount_bps,total_paise,billed_on,source_order_id)
  VALUES(NEW.id,NEW.user_id,NEW.course_id,NEW.mode,NEW.marked_price_paise,NEW.discount_bps,NEW.total_paise,(NEW.created_at AT TIME ZONE 'Asia/Kolkata')::date,NEW.id)
  ON CONFLICT(source_order_id) DO UPDATE SET source_order_id=excluded.source_order_id RETURNING id INTO aid;
  INSERT INTO fee_plans(account_id,version,effective_on) VALUES(aid,1,(NEW.created_at AT TIME ZONE 'Asia/Kolkata')::date)
  ON CONFLICT(account_id,version) DO UPDATE SET version=excluded.version RETURNING id INTO plan;
  INSERT INTO fee_installments(plan_id,number,amount_paise,due_on) VALUES(plan,1,NEW.total_paise,(NEW.created_at AT TIME ZONE 'Asia/Kolkata')::date) ON CONFLICT(plan_id,number) DO NOTHING;
  UPDATE payment_orders SET fee_account_id=aid WHERE id=NEW.id;
 END IF;
 PERFORM 1 FROM fee_accounts WHERE id=aid FOR UPDATE;
 paid_when:=coalesce(NEW.completed_at,NEW.updated_at,now());
 INSERT INTO fee_entries(account_id,kind,amount_paise,source_key,payment_order_id,reference,effective_at,note)
 VALUES(aid,'payment',NEW.total_paise,'razorpay:captured:'||NEW.provider_payment_id,NEW.id,NEW.provider_payment_id,paid_when,'Verified Razorpay capture') ON CONFLICT(source_key) DO NOTHING;
 SELECT coalesce(-sum(amount_paise),0) INTO seen_refund FROM fee_entries WHERE payment_order_id=NEW.id AND kind='refund';
 delta:=NEW.refunded_paise-seen_refund;
 IF delta>0 THEN
  SELECT greatest(0,a.total_paise+coalesce(sum(e.amount_paise) FILTER(WHERE e.kind='fee_adjustment'),0)),coalesce(sum(e.amount_paise) FILTER(WHERE e.kind<>'fee_adjustment'),0)
  INTO billed,collected FROM fee_accounts a LEFT JOIN fee_entries e ON e.account_id=a.id WHERE a.id=aid GROUP BY a.id;
  -- Return overpayment credit first; only the fee portion reduces the obligation.
  fee_credit:=least(billed,greatest(0,delta-greatest(0,collected-billed)));
  -- Returning all collected funds cancels any remaining unpaid obligation.
  IF NEW.status='refunded' AND collected-delta=0 THEN fee_credit:=billed; END IF;
  INSERT INTO fee_entries(account_id,kind,amount_paise,source_key,payment_order_id,reference,effective_at,note)
  VALUES(aid,'refund',-delta,'razorpay:refund:'||NEW.provider_payment_id||':'||NEW.refunded_paise,NEW.id,NEW.provider_payment_id,NEW.updated_at,'Verified cumulative refund; recorded at reconciliation time') ON CONFLICT(source_key) DO NOTHING;
  IF fee_credit>0 THEN
   INSERT INTO fee_entries(account_id,kind,amount_paise,source_key,payment_order_id,reference,effective_at,note)
   VALUES(aid,'fee_adjustment',-fee_credit,'razorpay:fee-credit:'||NEW.provider_payment_id||':'||NEW.refunded_paise,NEW.id,NEW.provider_payment_id,NEW.updated_at,'Refund reduces agreed fee; all collected funds returned cancels remaining dues') ON CONFLICT(source_key) DO NOTHING;
  END IF;
  IF NEW.status='refunded' AND collected-delta=0 THEN UPDATE fee_accounts SET closed_at=coalesce(closed_at,NEW.updated_at) WHERE id=aid; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fee_sync_razorpay_trigger ON payment_orders;
CREATE TRIGGER fee_sync_razorpay_trigger AFTER INSERT OR UPDATE OF status,refunded_paise ON payment_orders FOR EACH ROW EXECUTE FUNCTION fee_sync_razorpay();
-- Import only verified captures, never demo orders or unpaid catalog-price estimates.
-- Temporarily suppress the lifecycle trigger so this backfill never sends historical mail.
ALTER TABLE payment_orders DISABLE TRIGGER payment_lifecycle_email;
UPDATE payment_orders SET status=status WHERE status IN ('paid','partially_refunded','refunded') AND provider_payment_id IS NOT NULL AND fee_account_id IS NULL;
ALTER TABLE payment_orders ENABLE TRIGGER payment_lifecycle_email;
ALTER TABLE notification_events DROP CONSTRAINT IF EXISTS notification_events_category_check;
ALTER TABLE notification_events ADD CONSTRAINT notification_events_category_check CHECK(category IN ('booking','webinar','career','announcement','marketing','enrollment','payment','certificate','fees'));
-- Immutable statement attachments retain the balances that the operator reviewed.
CREATE TABLE IF NOT EXISTS fee_mail_snapshots (
 event_key text PRIMARY KEY,account_id uuid NOT NULL REFERENCES fee_accounts(id),pdf bytea NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);

-- Installment captures/cleared offline receipts already send a payment confirmation.
CREATE OR REPLACE FUNCTION queue_enrollment_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE course_name text; heading text; message text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF NEW.status NOT IN ('registered','completed','dropped') THEN RETURN NEW; END IF;
 IF NEW.status='registered' AND coalesce(NEW.source,'') LIKE 'fee-account:%' THEN RETURN NEW; END IF;
 IF NEW.status='registered' AND coalesce(NEW.source,'') LIKE 'razorpay:%' THEN RETURN NEW; END IF;
 IF NEW.status='dropped' AND EXISTS(SELECT 1 FROM payment_orders p WHERE NEW.source='razorpay:'||p.id AND p.status='refunded') THEN RETURN NEW; END IF;
 SELECT title INTO course_name FROM courses WHERE id=NEW.course_id;
 heading := CASE NEW.status WHEN 'registered' THEN 'Course enrollment confirmed' WHEN 'completed' THEN 'Course completed' ELSE 'Course access updated' END;
 message := CASE NEW.status WHEN 'registered' THEN 'Your enrollment in '||course_name||' is confirmed. Open My learning to get started.' WHEN 'completed' THEN 'Your course '||course_name||' is marked complete. Open your course workspace to review your progress and certificate eligibility.' ELSE 'Your enrollment in '||course_name||' is no longer active. Contact support if this was unexpected.' END;
 INSERT INTO notification_events(event_key,user_id,course_id,category,title,body,entity_type,entity_id,expires_at)
 VALUES('enrollment:'||NEW.id||':'||NEW.status||':'||txid_current(),NEW.user_id,NEW.course_id,'enrollment',heading,left(message,2000),'enrollment',NEW.id,now()+interval '7 days') ON CONFLICT(event_key) DO NOTHING;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION queue_payment_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE heading text; message text; prefix text;
BEGIN
 IF NEW.status NOT IN ('paid','partially_refunded','refunded') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.refunded_paise IS NOT DISTINCT FROM OLD.refunded_paise THEN RETURN NEW; END IF;
 prefix := CASE WHEN NEW.mode='test' THEN '[TEST] ' ELSE '' END;
 heading := prefix||CASE NEW.status WHEN 'paid' THEN 'Payment confirmed' WHEN 'partially_refunded' THEN 'Partial refund confirmed' ELSE 'Refund confirmed' END;
 message := prefix||'Course: '||NEW.course_title||E'\nOrder reference: '||NEW.id||E'\nOrder total: INR '||to_char(NEW.total_paise::numeric/100,'FM9999999990.00')||E'\n'||CASE NEW.status WHEN 'paid' THEN CASE WHEN NEW.fee_account_id IS NOT NULL AND EXISTS(SELECT 1 FROM fee_accounts a WHERE a.id=NEW.fee_account_id AND a.source_order_id IS NULL) THEN 'Your payment was received. Access is available after the first installment is fully cleared.' ELSE 'Your course access is ready.' END ELSE 'Total refunded: INR '||to_char(NEW.refunded_paise::numeric/100,'FM9999999990.00')||'. '||CASE NEW.status WHEN 'refunded' THEN CASE WHEN NEW.fee_account_id IS NOT NULL AND EXISTS(SELECT 1 FROM fee_accounts a WHERE a.id=NEW.fee_account_id AND a.source_order_id IS NULL) THEN 'Your fee agreement and installment balance have been updated. Remaining dues are cancelled when all collected funds are refunded; independent manual grants are preserved.' ELSE 'Access granted by this payment has been removed; separate manual grants are preserved.' END ELSE 'Your course access remains active.' END END||CASE WHEN NEW.mode='test' THEN E'\nTest transaction only. No real money was collected or refunded.' ELSE '' END;
 INSERT INTO notification_events(event_key,user_id,course_id,category,title,body,entity_type,entity_id,expires_at)
 VALUES('payment:'||NEW.id||':'||NEW.status||':'||NEW.refunded_paise,NEW.user_id,NEW.course_id,'payment',heading,left(message,2000),'payment',NEW.id,now()+interval '7 days') ON CONFLICT(event_key) DO NOTHING;
 RETURN NEW;
END $$;
