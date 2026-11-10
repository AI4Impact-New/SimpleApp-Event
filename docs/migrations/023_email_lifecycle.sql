-- Durable, transactional lifecycle mail; existing rows are intentionally not backfilled.
ALTER TABLE notification_events DROP CONSTRAINT IF EXISTS notification_events_category_check;
ALTER TABLE notification_events ADD CONSTRAINT notification_events_category_check CHECK(category IN ('booking','webinar','career','announcement','marketing','enrollment','payment','certificate'));

CREATE OR REPLACE FUNCTION queue_enrollment_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE course_name text; heading text; message text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF NEW.status NOT IN ('registered','completed','dropped') THEN RETURN NEW; END IF;
 IF NEW.status='registered' AND coalesce(NEW.source,'') LIKE 'razorpay:%' THEN RETURN NEW; END IF;
 IF NEW.status='dropped' AND EXISTS(SELECT 1 FROM payment_orders p WHERE NEW.source='razorpay:'||p.id AND p.status='refunded') THEN RETURN NEW; END IF;
 SELECT title INTO course_name FROM courses WHERE id=NEW.course_id;
 heading := CASE NEW.status WHEN 'registered' THEN 'Course enrollment confirmed' WHEN 'completed' THEN 'Course completed' ELSE 'Course access updated' END;
 message := CASE NEW.status WHEN 'registered' THEN 'Your enrollment in '||course_name||' is confirmed. Open My learning to get started.' WHEN 'completed' THEN 'Your course '||course_name||' is marked complete. Open your course workspace to review your progress and certificate eligibility.' ELSE 'Your enrollment in '||course_name||' is no longer active. Contact support if this was unexpected.' END;
 INSERT INTO notification_events(event_key,user_id,course_id,category,title,body,entity_type,entity_id,expires_at)
 VALUES('enrollment:'||NEW.id||':'||NEW.status||':'||txid_current(),NEW.user_id,NEW.course_id,'enrollment',heading,left(message,2000),'enrollment',NEW.id,now()+interval '7 days') ON CONFLICT(event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS course_enrollment_email ON course_registrations;
CREATE TRIGGER course_enrollment_email AFTER INSERT OR UPDATE OF status ON course_registrations FOR EACH ROW EXECUTE FUNCTION queue_enrollment_email();

CREATE OR REPLACE FUNCTION queue_payment_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE heading text; message text; prefix text;
BEGIN
 IF NEW.status NOT IN ('paid','partially_refunded','refunded') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.refunded_paise IS NOT DISTINCT FROM OLD.refunded_paise THEN RETURN NEW; END IF;
 prefix := CASE WHEN NEW.mode='test' THEN '[TEST] ' ELSE '' END;
 heading := prefix||CASE NEW.status WHEN 'paid' THEN 'Payment confirmed' WHEN 'partially_refunded' THEN 'Partial refund confirmed' ELSE 'Refund confirmed' END;
 message := prefix||'Course: '||NEW.course_title||E'\nOrder reference: '||NEW.id||E'\nOrder total: INR '||to_char(NEW.total_paise::numeric/100,'FM9999999990.00')||E'\n'||CASE NEW.status WHEN 'paid' THEN 'Your course access is ready.' ELSE 'Total refunded: INR '||to_char(NEW.refunded_paise::numeric/100,'FM9999999990.00')||'. '||CASE NEW.status WHEN 'refunded' THEN 'Access granted by this payment has been removed; separate manual grants are preserved.' ELSE 'Your course access remains active.' END END||CASE WHEN NEW.mode='test' THEN E'\nTest transaction only. No real money was collected or refunded.' ELSE '' END;
 INSERT INTO notification_events(event_key,user_id,course_id,category,title,body,entity_type,entity_id,expires_at)
 VALUES('payment:'||NEW.id||':'||NEW.status||':'||NEW.refunded_paise,NEW.user_id,NEW.course_id,'payment',heading,left(message,2000),'payment',NEW.id,now()+interval '7 days') ON CONFLICT(event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_lifecycle_email ON payment_orders;
CREATE TRIGGER payment_lifecycle_email AFTER INSERT OR UPDATE OF status,refunded_paise ON payment_orders FOR EACH ROW EXECUTE FUNCTION queue_payment_email();

CREATE OR REPLACE FUNCTION queue_certificate_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO notification_events(event_key,user_id,course_id,category,title,body,entity_type,entity_id,expires_at)
 VALUES('certificate:'||NEW.id,NEW.user_id,NEW.course_id,'certificate','Your certificate is ready','A '||NEW.certificate_type||' certificate has been issued. Sign in to the student portal and open your certificates to view it.','certificate',NEW.id,now()+interval '7 days') ON CONFLICT(event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS certificate_issued_email ON certificates_issued;
CREATE TRIGGER certificate_issued_email AFTER INSERT ON certificates_issued FOR EACH ROW EXECUTE FUNCTION queue_certificate_email();
