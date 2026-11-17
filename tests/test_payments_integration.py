"""Payment authorization, transaction races, refunds and webhook replay with real PostgreSQL."""
import hashlib
import hmac
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from test_programme_integration import schema, data, DSN
from learning import billing, payments
from learning.validation import ApiError
from shared.db import execute_query
pytestmark=pytest.mark.skipif(not DSN,reason='Requires isolated PostgreSQL PROGRAMME_TEST_DSN')

@pytest.fixture
def pay(data,monkeypatch):
    execute_query('DELETE FROM course_registrations WHERE user_id=%s',(data['student']['id'],),fetch='none')
    execute_query('UPDATE courses SET marked_price_paise=10000,discount_bps=1000 WHERE id=%s',(data['course'],),fetch='none')
    monkeypatch.setenv('RAZORPAY_ENABLED','true')
    monkeypatch.delenv('COURSE_GST_ENABLED', raising=False)
    cfg={'mode':'test','key_id':'rzp_test_example','key_secret':'test-signature-secret','webhook_secret':'webhook-test','test_buyer_emails':['person1@example.invalid']}
    monkeypatch.setattr(payments,'credentials',lambda:cfg)
    remote={};calls=[]
    def provider(method,path,body=None):
        calls.append((method,path))
        if method=='GET' and path.startswith('orders?'): return {'items':list(remote.values())}
        if method=='POST' and path=='orders':
            oid='order_'+uuid.uuid4().hex
            remote[oid]={**body,'id':oid}; return remote[oid]
        if path.startswith('payments/'): return payment
        if path.endswith('/payments'): return {'items':[payment]}
        raise AssertionError(path)
    monkeypatch.setattr(payments,'provider',provider)
    order=payments.create(data['student'],{'course_id':data['course'],'request_id':str(uuid.uuid4())})
    payment={'id':'pay_'+uuid.uuid4().hex,'order_id':order['provider_order_id'],'status':'captured','captured':True,'amount':9000,'currency':'INR','amount_refunded':0}
    return data,order,payment,cfg,calls


def registration(d):
    return execute_query('SELECT * FROM course_registrations WHERE user_id=%s AND course_id=%s',(d['student']['id'],d['course']),fetch='one')


def test_captured_verified_once_and_unique_enrollment(pay):
    d,o,p,c,calls=pay
    assert registration(d) is None
    signature=hmac.new(c['key_secret'].encode(),(o['provider_order_id']+'|'+p['id']).encode(),hashlib.sha256).hexdigest()
    body={'razorpay_order_id':o['provider_order_id'],'razorpay_payment_id':p['id'],'razorpay_signature':signature}
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda _:payments.verify(d['student'],o['id'],body),range(4)))
    assert all(r['status']=='paid' for r in results)
    assert registration(d)['source']=='razorpay:'+o['id']
    assert sum(1 for m,path in calls if m=='POST')==1

@pytest.mark.parametrize('change',[{'amount':1},{'currency':'USD'}])
def test_amount_currency_tampering_cannot_enroll(pay,change):
    d,o,p,_,_=pay
    with pytest.raises(ApiError):payments.apply_payment({**p,**change})
    assert registration(d) is None


def test_authorized_failed_payment_does_not_grant_access(pay):
    d,o,p,_,_=pay
    for status in ['authorized','failed']:
        assert payments.apply_payment({**p,'status':status,'captured':False})['status']=='pending'
    assert registration(d) is None


def test_invalid_signature_and_wrong_owner_blocked(pay):
    d,o,p,_,_=pay
    body={'razorpay_order_id':o['provider_order_id'],'razorpay_payment_id':p['id'],'razorpay_signature':'invalid'}
    with pytest.raises(ApiError):payments.verify(d['student'],o['id'],body)
    with pytest.raises(ApiError):payments.get(d['other'],o['id'])
    with pytest.raises(ApiError):payments.checkout(d['admin'],o['id'])
    assert registration(d) is None


def test_refunds_monotonic_and_preserve_manual_grants(pay):
    d,o,p,_,_=pay
    payments.apply_payment(p)
    assert payments.apply_payment({**p,'amount_refunded':100})['status']=='partially_refunded'
    assert registration(d)['status']=='registered'
    assert payments.apply_payment({**p,'amount_refunded':9000,'status':'refunded'})['status']=='refunded'
    assert registration(d)['status']=='dropped'
    assert payments.apply_payment(p)['status']=='refunded'
    assert registration(d)['status']=='dropped'
    execute_query("UPDATE course_registrations SET status='registered',source='admin' WHERE user_id=%s AND course_id=%s",(d['student']['id'],d['course']),fetch='none')
    payments.apply_payment({**p,'amount_refunded':9000,'status':'refunded'})
    assert registration(d)['status']=='registered'


def test_webhook_raw_signature_replay_and_missing_header(pay):
    d,o,p,c,_=pay
    raw=json.dumps({'event':'payment.captured','payload':{'payment':{'entity':p}}})
    event={'body':raw,'headers':{'x-razorpay-event-id':'evt_test','x-razorpay-signature':hmac.new(c['webhook_secret'].encode(),raw.encode(),hashlib.sha256).hexdigest()}}
    assert payments.webhook(event)=={'received':True}
    assert payments.webhook(event)['duplicate']
    assert registration(d) is None
    payments.worker({},None)
    assert registration(d)['status']=='registered'
    with pytest.raises(ApiError):payments.webhook({**event,'body':raw+' '})


def test_test_mode_requires_allowlist_and_idempotent_snapshot(pay):
    d,o,p,c,calls=pay
    row=execute_query('SELECT request_id FROM payment_orders WHERE id=%s',(o['id'],),fetch='one')
    execute_query('UPDATE courses SET marked_price_paise=20000 WHERE id=%s',(d['course'],),fetch='none')
    retry=payments.create(d['student'],{'course_id':d['course'],'request_id':str(row['request_id'])})
    assert retry['id']==o['id'] and retry['total_paise']==9000
    with pytest.raises(ApiError):payments.create(d['teacher'],{'course_id':d['course'],'request_id':str(uuid.uuid4())})
    assert sum(1 for m,path in calls if m=='POST')==1


def test_new_request_reuses_pending_order_and_expiry_blocks_checkout(pay):
    d,o,p,c,calls=pay
    same=payments.create(d['student'],{'course_id':d['course'],'request_id':str(uuid.uuid4())})
    assert same['id']==o['id']
    execute_query("UPDATE payment_orders SET expires_at=now()-interval '1 second' WHERE id=%s",(o['id'],),fetch='none')
    with pytest.raises(ApiError) as e:payments.checkout(d['student'],o['id'])
    assert e.value.status==410
    # A real late capture is still honored after the checkout link expires.
    assert payments.apply_payment(p)['status']=='paid'
    assert registration(d)['status']=='registered'


def test_new_order_adds_gst_and_preserves_existing_payment_snapshot(pay, monkeypatch):
    d, existing, _, _, _ = pay
    monkeypatch.setenv('COURSE_GST_ENABLED', 'true')
    assert billing.checkout_amounts(500, 0)['total_paise'] == 590
    assert billing.checkout_amounts(525, 0)['gst_paise'] == 95
    assert billing.checkout_amounts(500, 10000)['total_paise'] == 0
    pending = payments.create(d['student'], {'course_id': d['course'], 'request_id': str(uuid.uuid4())})
    assert (pending['id'], pending['total_paise'], pending['gst_paise']) == (existing['id'], 9000, 0)

    execute_query("UPDATE payment_orders SET expires_at=now()-interval '1 second' WHERE id=%s",
                  (existing['id'],), fetch='none')
    taxed = payments.create(d['student'], {'course_id': d['course'], 'request_id': str(uuid.uuid4())})
    assert (taxed['discount_paise'], taxed['gst_bps'], taxed['gst_paise']) == (1000, 1800, 1620)
    assert taxed['checkout']['amount'] == taxed['total_paise'] == 10620


def test_worker_provider_failure_keeps_durable_event_for_retry(pay,monkeypatch):
    d,o,p,c,_=pay
    raw=json.dumps({'event':'payment.captured','payload':{'payment':{'entity':p}}})
    event={'body':raw,'headers':{'x-razorpay-event-id':'evt_retry','x-razorpay-signature':hmac.new(c['webhook_secret'].encode(),raw.encode(),hashlib.sha256).hexdigest()}}
    payments.webhook(event)
    def unavailable(*a,**k):raise ApiError(502,'Provider unavailable')
    monkeypatch.setattr(payments,'provider',unavailable)
    payments.worker({},None)
    row=execute_query("SELECT * FROM payment_webhook_events WHERE event_id='evt_retry'",fetch='one')
    assert row['processed_at'] is None and row['attempts']==1
    assert registration(d) is None
