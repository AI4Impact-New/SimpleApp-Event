"""Razorpay orders, captured-payment fulfillment and authenticated webhook ingestion.

Amounts come from persisted quotes, never the browser. Test mode is restricted to
explicit QA recipients. Historical demo orders remain in the demo ledger.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import boto3
from botocore.config import Config
from shared.db import execute_query, get_db_cursor
from learning.validation import ApiError, identifier
from learning.service import admin

_cache = None
_client = None


def enabled():
    return os.environ.get('RAZORPAY_ENABLED', 'false').lower() == 'true'


def credentials():
    global _cache, _client
    arn = os.environ.get('RAZORPAY_SECRET_ARN')
    if not arn or not enabled():
        raise ApiError(503, 'Online checkout is not available yet')
    if _cache and _cache[0] == arn and time.monotonic() < _cache[2]:
        return _cache[1]
    if _client is None:
        _client = boto3.client('secretsmanager', config=Config(connect_timeout=3, read_timeout=5,
            retries={'mode':'standard','total_max_attempts':2}))
    value = json.loads(_client.get_secret_value(SecretId=arn)['SecretString'])
    mode = value.get('mode')
    if mode not in ('test', 'live') or not value.get('key_id', '').startswith('rzp_'+mode+'_') or not value.get('key_secret'):
        raise ApiError(503, 'Payment configuration is unavailable')
    _cache = (arn, value, time.monotonic()+60)
    return value


def provider(method, path, data=None):
    config = credentials()
    auth = base64.b64encode((config['key_id']+':'+config['key_secret']).encode()).decode()
    req = Request('https://api.razorpay.com/v1/'+path, method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Authorization':'Basic '+auth, 'Content-Type':'application/json'})
    try:
        with urlopen(req, timeout=8) as response:
            return json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError):
        # Never log provider bodies, credentials or buyer details.
        raise ApiError(502, 'Payment provider is temporarily unavailable; check your order before retrying') from None


def response(row):
    return {**row, 'demo':False, 'payment_provider':'Razorpay',
        'checkout_url':os.environ.get('STUDENT_CHECKOUT_URL', 'https://main.d26ztc5gxt79re.amplifyapp.com/checkout')+'/'+str(row['id']),
        'invoice_url':'/billing/orders/'+str(row['id'])+'/invoice',
        'notice':'Test payment. No real money is collected.' if row['mode']=='test' else 'Course access is granted after payment capture is verified.'}


def allowed_test_buyer(email, config):
    return email.lower() in [str(x).lower() for x in config.get('test_buyer_emails', [])]


def create(actor, body, as_admin=False):
    from learning.billing import amounts
    if as_admin: admin(actor)
    if set(body)-({'course_id','request_id','buyer_email'} if as_admin else {'course_id','request_id'}):
        raise ApiError(400, 'Unknown order field')
    cid, rid = identifier(body.get('course_id')), identifier(body.get('request_id'))
    config = credentials()
    # Agreed installments override public catalog pricing in the student Buy flow.
    lookup=body.get('buyer_email') if as_admin else actor['id']
    if isinstance(lookup,str):
        clause='lower(u.email)=%s' if as_admin else 'a.user_id=%s'
        plan=execute_query('SELECT a.id FROM fee_accounts a JOIN users u ON u.id=a.user_id WHERE a.course_id=%s AND a.mode=%s AND a.source_order_id IS NULL AND a.closed_at IS NULL AND '+clause,(cid,config['mode'],lookup.strip().lower() if as_admin else lookup),fetch='one')
        if plan:
            from learning.fee_ledger import pay_link
            return pay_link(actor,str(plan['id']),{'request_id':rid})
    with get_db_cursor() as cur:
        if as_admin:
            email = body.get('buyer_email')
            if not isinstance(email,str) or not email.strip() or len(email)>254: raise ApiError(400,'buyer_email is required')
            cur.execute('SELECT id,name,email FROM users WHERE lower(email)=%s',(email.strip().lower(),))
        else:
            cur.execute('SELECT id,name,email FROM users WHERE id=%s',(actor['id'],))
        buyer = cur.fetchone()
        if not buyer: raise ApiError(404, 'Student account not found')
        if config['mode']=='test' and not allowed_test_buyer(buyer['email'],config):
            raise ApiError(403, 'Checkout is currently available to authorized test accounts only')
        cur.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',('payment:'+str(buyer['id'])+cid,))
        cur.execute('SELECT * FROM payment_orders WHERE user_id=%s AND request_id=%s',(buyer['id'],rid))
        row = cur.fetchone()
        if row and str(row['course_id'])!=cid: raise ApiError(409,'Request ID was used for another course')
        if not row:
            cur.execute("SELECT * FROM payment_orders WHERE user_id=%s AND course_id=%s AND mode=%s AND status='pending' AND expires_at>now() ORDER BY created_at DESC LIMIT 1",(buyer['id'],cid,config['mode']))
            row=cur.fetchone()
        if not row:
            cur.execute("SELECT * FROM courses WHERE id=%s AND archived=false AND status='published' FOR SHARE",(cid,))
            course = cur.fetchone()
            if not course: raise ApiError(404,'Published course not found')
            price = amounts(int(course['marked_price_paise']),course['discount_bps'])
            if price['total_paise']<100: raise ApiError(400,'This course does not require online payment')
            cur.execute("SELECT 1 FROM course_registrations WHERE user_id=%s AND course_id=%s AND status IN ('registered','completed')",(buyer['id'],cid))
            if cur.fetchone(): raise ApiError(409,'You already have access to this course')
            cur.execute('''INSERT INTO payment_orders(id,request_id,user_id,course_id,course_title,buyer_name,buyer_email,
                marked_price_paise,discount_bps,discount_paise,total_paise,mode,created_by)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
                (str(uuid.uuid4()),rid,buyer['id'],cid,course['title'],buyer['name'] or 'Learner',buyer['email'],
                 price['marked_price_paise'],price['discount_bps'],price['discount_paise'],price['total_paise'],config['mode'],actor['id']))
            row = cur.fetchone()
    # Persist receipt before the external call. A retry can recover an order whose response was lost.
    return checkout(actor,str(row['id']),as_admin=as_admin)


def get(actor, oid):
    row=execute_query('SELECT * FROM payment_orders WHERE id=%s',(identifier(oid),),fetch='one')
    if row and (actor['admin'] or str(row['user_id'])==actor['id']): return response(row)
    raise ApiError(404,'Order not found')


def checkout(actor, oid, as_admin=False):
    row=get(actor,oid)
    if str(row['user_id'])!=actor['id'] and not as_admin: raise ApiError(403,'Only the buyer can pay this order')
    config=credentials()
    if config['mode']=='test' and not allowed_test_buyer(row['buyer_email'],config): raise ApiError(403,'This account is not authorized for test checkout')
    if row['mode']!=config['mode']: raise ApiError(409,'Order belongs to a different payment mode')
    if row['status']!='pending': return row
    # Serialize provider order creation and recover using the immutable receipt.
    with get_db_cursor() as cur:
        cur.execute('SELECT *,now() AS server_now FROM payment_orders WHERE id=%s FOR UPDATE',(row['id'],))
        row=cur.fetchone()
        if row['status']!='pending': return response(row)
        if row.get('fee_account_id'):
            cur.execute("SELECT a.total_paise+coalesce(sum(e.amount_paise) FILTER (WHERE e.kind='fee_adjustment'),0)-coalesce(sum(e.amount_paise) FILTER (WHERE e.kind<>'fee_adjustment'),0) AS remaining FROM fee_accounts a LEFT JOIN fee_entries e ON e.account_id=a.id WHERE a.id=%s GROUP BY a.id",(row['fee_account_id'],))
            balance=cur.fetchone()
            if balance and int(row['total_paise'])>int(balance['remaining']):raise ApiError(409,'This payment link exceeds the current outstanding balance')
        if row['expires_at']<=row['server_now']: raise ApiError(410,'Payment link expired; create a new order')
        if not row['provider_order_id']:
            existing=provider('GET','orders?receipt='+str(row['id'])+'&count=100').get('items',[])
            matches=[o for o in existing if o.get('receipt')==str(row['id'])]
            order=matches[0] if matches else provider('POST','orders',{'amount':int(row['total_paise']), 'currency':'INR',
                'receipt':str(row['id']), 'notes':{'local_order_id':str(row['id'])}})
            if order.get('amount')!=int(row['total_paise']) or order.get('currency')!='INR' or not re.fullmatch(r'order_[A-Za-z0-9]+',order.get('id','')):
                raise ApiError(502,'Provider order does not match the checkout amount')
            cur.execute('UPDATE payment_orders SET provider_order_id=%s,updated_at=now() WHERE id=%s RETURNING *',(order['id'],row['id']))
            row=cur.fetchone()
        cur.execute('SELECT phone FROM users WHERE id=%s',(row['user_id'],))
        buyer_user=cur.fetchone()
        buyer_phone=(buyer_user['phone'] or '').strip() if buyer_user and buyer_user.get('phone') else ''
    prefill={'name':row['buyer_name'],'email':row['buyer_email']}
    if buyer_phone: prefill['contact']=buyer_phone
    return {**response(row),'checkout':{'key':config['key_id'],'order_id':row['provider_order_id'],
        'amount':int(row['total_paise']),'currency':'INR','name':'AI4Impact','description':row['course_title'],
        'prefill':prefill,'theme':{'color':'#008b78'}}}


def apply_payment(payment):
    """Only captured funds fulfill; delayed and duplicate callbacks are monotonic."""
    if not re.fullmatch(r'pay_[A-Za-z0-9]+',str(payment.get('id',''))): raise ApiError(400,'Invalid payment ID')
    with get_db_cursor() as cur:
        cur.execute('SELECT * FROM payment_orders WHERE provider_order_id=%s FOR UPDATE',(payment.get('order_id'),))
        row=cur.fetchone()
        if not row: return None
        if row['mode']!=credentials()['mode']: raise ApiError(409,'Payment mode mismatch')
        if payment.get('amount')!=int(row['total_paise']) or payment.get('currency')!='INR':
            raise ApiError(409,'Payment amount does not match order')
        captured = payment.get('status') in ('captured','refunded') and payment.get('captured') is True
        from learning import fee_ledger
        fee_ledger.record_attempt(cur,row,payment)
        if not captured: return response(row)
        if row['provider_payment_id'] and row['provider_payment_id']!=payment['id']:
            raise ApiError(409,'Order already has a different payment')
        refunded=max(int(row['refunded_paise']),int(payment.get('amount_refunded') or 0))
        if refunded>row['total_paise']: raise ApiError(409,'Invalid refund amount')
        status='refunded' if refunded==row['total_paise'] else 'partially_refunded' if refunded else 'paid'
        cur.execute('''UPDATE payment_orders SET status=%s,provider_payment_id=%s,refunded_paise=%s,
            completed_at=COALESCE(completed_at,now()),updated_at=now() WHERE id=%s RETURNING *''',(status,payment['id'],refunded,row['id']))
        updated=cur.fetchone()
        # Never revoke pre-existing/manual access. A refund only removes the grant owned by this order.
        plan_payment=fee_ledger.linked_plan(cur,row)
        if plan_payment:
            fee_ledger.sync_access(cur,row['fee_account_id'])
        else:
            source='razorpay:'+str(row['id'])
            if status=='refunded':
                cur.execute("UPDATE course_registrations SET status='dropped',updated_at=now() WHERE user_id=%s AND course_id=%s AND source=%s",(row['user_id'],row['course_id'],source))
            else:
                cur.execute('''INSERT INTO course_registrations(id,user_id,course_id,status,source,updated_at)
                    VALUES(%s,%s,%s,'registered',%s,now()) ON CONFLICT(course_id,user_id) DO UPDATE
                    SET status=CASE WHEN course_registrations.status='completed' THEN 'completed' ELSE 'registered' END,
                    source=CASE WHEN course_registrations.status IN ('registered','completed') THEN course_registrations.source ELSE EXCLUDED.source END,
                    updated_at=now()''',(str(uuid.uuid4()),row['user_id'],row['course_id'],source))
        if row['status']!=status:
            notification_id=str(uuid.uuid5(uuid.NAMESPACE_URL,'ai4impact:payment:'+str(row['id'])+':'+status))
            title='Payment confirmed' if status=='paid' else 'Refund updated'
            message=('Test payment confirmed. ' if row['mode']=='test' else 'Payment confirmed. ')+'Your course access is ready.' if status=='paid' else 'Your payment refund status is '+status.replace('_',' ')+'.'
            if plan_payment and status=='paid':message='Your payment was received. Your installment balance and course access have been updated.'
            cur.execute('INSERT INTO learner_notifications(id,user_id,course_id,title,body) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING',(notification_id,row['user_id'],row['course_id'],title,message))
        return response(updated)


def verify(actor, oid, body):
    row=get(actor,oid)
    if str(row['user_id'])!=actor['id']: raise ApiError(403,'Only the buyer can verify payment')
    if set(body)!={'razorpay_order_id','razorpay_payment_id','razorpay_signature'}: raise ApiError(400,'Invalid verification fields')
    if body['razorpay_order_id']!=row['provider_order_id'] or not isinstance(body['razorpay_payment_id'],str) or not re.fullmatch(r'pay_[A-Za-z0-9]+',body['razorpay_payment_id']):
        raise ApiError(400,'Payment does not belong to this order')
    signature=hmac.new(credentials()['key_secret'].encode(),(row['provider_order_id']+'|'+body['razorpay_payment_id']).encode(),hashlib.sha256).hexdigest()
    if not isinstance(body['razorpay_signature'],str) or not re.fullmatch(r'[a-fA-F0-9]{64}',body['razorpay_signature']) or not hmac.compare_digest(signature,body['razorpay_signature']):
        raise ApiError(400,'Invalid payment signature')
    payment=provider('GET','payments/'+body['razorpay_payment_id'])
    if payment.get('order_id')!=row['provider_order_id']: raise ApiError(409,'Payment order mismatch')
    return apply_payment(payment)


def reconcile(actor, oid):
    row=get(actor,oid)
    if row.get('provider_payment_id'):
        apply_payment(provider('GET','payments/'+row['provider_payment_id']))
    elif row['provider_order_id'] and row['status']=='pending':
        result=provider('GET','orders/'+row['provider_order_id']+'/payments')
        for payment in result.get('items',[]):
            if payment.get('status') in ('captured','refunded'): apply_payment(payment)
    return get(actor,oid)


def webhook(event):
    config=credentials()
    secret=config.get('webhook_secret')
    if not secret: raise ApiError(503,'Payment webhook is not configured')
    raw=event.get('body') or ''
    try: raw=base64.b64decode(raw,validate=True) if event.get('isBase64Encoded') else raw.encode()
    except (ValueError,AttributeError): raise ApiError(400,'Invalid webhook body')
    if len(raw)>200000: raise ApiError(413,'Webhook too large')
    headers={k.lower():v for k,v in (event.get('headers') or {}).items()}
    expected=hmac.new(secret.encode(),raw,hashlib.sha256).hexdigest()
    supplied=str(headers.get('x-razorpay-signature',''))
    if not re.fullmatch(r'[a-fA-F0-9]{64}',supplied) or not hmac.compare_digest(expected,supplied): raise ApiError(400,'Invalid webhook signature')
    try: body=json.loads(raw)
    except ValueError: raise ApiError(400,'Invalid webhook JSON')
    if not isinstance(body,dict): raise ApiError(400,'Webhook must be an object')
    event_id=headers.get('x-razorpay-event-id')
    if not isinstance(event_id,str) or not 1<=len(event_id)<=200: raise ApiError(400,'Webhook event ID is required')
    digest=hashlib.sha256(raw).hexdigest()
    previous=execute_query('SELECT body_sha256 FROM payment_webhook_events WHERE event_id=%s',(event_id,),fetch='one')
    if previous:
        if previous['body_sha256']!=digest: raise ApiError(409,'Webhook event ID conflict')
        return {'received':True,'duplicate':True}
    kind=body.get('event','')
    payload=body.get('payload') or {}
    payment=(payload.get('payment') or {}).get('entity')
    pid=None
    if kind in ('payment.captured','order.paid','payment.failed') and isinstance(payment,dict):
        pid=payment.get('id','')
    elif kind in ('refund.processed','refund.created'):
        pid=((payload.get('refund') or {}).get('entity') or {}).get('payment_id','')
    if pid is not None and not re.fullmatch(r'pay_[A-Za-z0-9]+',str(pid)): raise ApiError(400,'Invalid payment ID')
    stored=execute_query('''INSERT INTO payment_webhook_events(event_id,event_type,body_sha256,payment_id,processed_at)
        VALUES(%s,%s,%s,%s,CASE WHEN %s IS NULL THEN now() ELSE NULL END)
        ON CONFLICT(event_id) DO UPDATE SET event_id=EXCLUDED.event_id RETURNING body_sha256''',
        (event_id,kind,digest,pid,pid),fetch='one')
    if stored['body_sha256']!=digest: raise ApiError(409,'Webhook event ID conflict')
    return {'received':True}


def worker(event, context):
    """Durable webhook inbox plus pending-order reconciliation for missed callbacks."""
    if not enabled(): return {'disabled':True}
    processed=0
    for _ in range(20):
        if context and context.get_remaining_time_in_millis()<12000: break
        with get_db_cursor() as cur:
            cur.execute('''SELECT * FROM payment_webhook_events WHERE processed_at IS NULL AND next_attempt_at<=now()
                ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1''')
            row=cur.fetchone()
            if not row: break
            try:
                apply_payment(provider('GET','payments/'+row['payment_id']))
            except ApiError:
                cur.execute("UPDATE payment_webhook_events SET attempts=attempts+1,next_attempt_at=now()+interval '2 minutes' * LEAST(60,power(2,LEAST(attempts,6))) WHERE event_id=%s",(row['event_id'],))
            else:
                cur.execute('UPDATE payment_webhook_events SET processed_at=now(),attempts=attempts+1 WHERE event_id=%s',(row['event_id'],))
                processed+=1
    rows=execute_query('''SELECT id,user_id FROM payment_orders WHERE status='pending' AND provider_order_id IS NOT NULL
        AND created_at>now()-interval '10 days' ORDER BY updated_at LIMIT 20''',fetch='all') or []
    for row in rows:
        if context and context.get_remaining_time_in_millis()<12000: break
        try:
            reconcile({'id':str(row['user_id']),'admin':False},str(row['id']))
        except ApiError:
            pass  # Remains pending for the next scheduled pass; never assume payment failure.
        execute_query('UPDATE payment_orders SET updated_at=now() WHERE id=%s',(row['id'],),fetch='none')
    backlog=execute_query("SELECT count(*) AS count,COALESCE(EXTRACT(EPOCH FROM now()-min(received_at)),0) AS age FROM payment_webhook_events WHERE processed_at IS NULL",fetch='one')
    print(json.dumps({'_aws':{'Timestamp':int(time.time()*1000),'CloudWatchMetrics':[{'Namespace':'AI4Impact/Payments','Dimensions':[['Service']],'Metrics':[{'Name':'WebhookBacklogAge','Unit':'Seconds'},{'Name':'WebhookBacklog','Unit':'Count'}]}]},
        'Service':'checkout','WebhookBacklogAge':float(backlog['age']),'WebhookBacklog':int(backlog['count'])}))
    return {'processed_events':processed}
