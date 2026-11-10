"""Lifecycle outbox events commit with business state and deduplicate retries."""
import uuid
import pytest
from test_programme_integration import schema,data,DSN
from shared.db import get_db_cursor,execute_query
from shared.email_templates import template_key,apply_template

@pytest.mark.skipif(not DSN,reason='Requires isolated PostgreSQL')
def test_enrollment_transition_deduplicates_and_rolls_back(data):
    uid,cid=data['student']['id'],data['course']
    execute_query("UPDATE course_registrations SET status='dropped' WHERE user_id=%s AND course_id=%s",(uid,cid),fetch='none')
    execute_query("UPDATE course_registrations SET status='registered' WHERE user_id=%s AND course_id=%s",(uid,cid),fetch='none')
    execute_query("UPDATE course_registrations SET status='registered' WHERE user_id=%s AND course_id=%s",(uid,cid),fetch='none')
    assert execute_query("SELECT count(*) AS n FROM notification_events WHERE category='enrollment' AND user_id=%s",(uid,),fetch='one')['n']==2
    with pytest.raises(RuntimeError):
        with get_db_cursor() as cur:
            cur.execute("UPDATE course_registrations SET status='completed' WHERE user_id=%s AND course_id=%s",(uid,cid))
            raise RuntimeError('rollback')
    assert execute_query("SELECT count(*) AS n FROM notification_events WHERE category='enrollment' AND user_id=%s",(uid,),fetch='one')['n']==2

@pytest.mark.skipif(not DSN,reason='Requires isolated PostgreSQL')
def test_payment_and_certificate_events(data):
    oid=str(uuid.uuid4());uid=data['student']['id'];cid=data['course']
    execute_query("INSERT INTO payment_orders(id,request_id,user_id,course_id,course_title,buyer_name,buyer_email,marked_price_paise,discount_bps,discount_paise,total_paise,mode) VALUES(%s,%s,%s,%s,'QA Course','QA','qa@example.invalid',500,0,0,500,'test')",(oid,str(uuid.uuid4()),uid,cid),fetch='none')
    for status,refunded in [('paid',0),('paid',0),('partially_refunded',100),('partially_refunded',200),('refunded',500),('refunded',500)]:
        execute_query('UPDATE payment_orders SET status=%s,refunded_paise=%s WHERE id=%s',(status,refunded,oid),fetch='none')
    rows=execute_query("SELECT title FROM notification_events WHERE category='payment' AND entity_id=%s",(oid,),fetch='all')
    assert len(rows)==4 and all(r['title'].startswith('[TEST]') for r in rows)
    execute_query("INSERT INTO certificates_issued(user_id,course_id,certificate_type) VALUES(%s,%s,'completion')",(uid,cid),fetch='none')
    assert execute_query("SELECT count(*) AS n FROM notification_events WHERE category='certificate' AND user_id=%s",(uid,),fetch='one')['n']==1

@pytest.mark.parametrize('event,category,expected',[
 ('payment:x:paid:0','payment','payment-confirmed'),('payment:x:partially_refunded:100','payment','refund-partial'),('payment:x:refunded:500','payment','refund-full'),
 ('enrollment:x:registered:10','enrollment','course-enrolled'),('enrollment:x:completed:10','enrollment','course-completed'),('enrollment:x:dropped:10','enrollment','course-access-updated'),
 ('booking:x:1:reminder:24','booking','session-reminder'),('booking:x:1:cancelled','booking','session-cancelled'),('webinar:x:2:updated','webinar','webinar-updated'),
 ('application:x','career','application-received'),('application:x:shortlisted','career','application-updated'),('internship:x:accepted','career','internship-updated')])
def test_template_routing(event,category,expected):assert template_key(event,category)==expected

def test_template_payload_is_safe_bounded_and_keeps_attachments(monkeypatch):
 monkeypatch.setenv('RESEND_TEMPLATES_ENABLED','true')
 p={'subject':'Title','html':'old','text':'old','attachments':[{'filename':'a.pdf'}]}
 body='<'*2000;apply_template(p,'course-enrolled','<Title>',body)
 assert 'html' not in p and 'text' not in p and len(p['attachments'])==1
 v=p['template']['variables'];assert ''.join(v[f'BODY_{i}'] for i in range(1,7))=='&lt;'*2000
 assert max(map(len,v.values()))<=2000 and v['TEXT']==body and v['TITLE']=='&lt;Title&gt;'


def test_payment_worker_attaches_owner_checked_pdf(monkeypatch):
 from unittest.mock import Mock
 from programme import worker
 from learning import billing
 monkeypatch.setenv('TRANSACTIONAL_FROM_EMAIL','noreply@ai4impact.in')
 monkeypatch.setenv('TRANSACTIONAL_REPLY_TO','support@ai4impact.in')
 monkeypatch.setenv('RESEND_TEMPLATES_ENABLED','true')
 monkeypatch.setattr(worker,'api_key',lambda:'re_local_test')
 pdf=Mock(return_value=b'%PDF-test');monkeypatch.setattr(billing,'invoice_pdf',pdf)
 post=Mock(return_value=Mock(status_code=200,json=lambda:{'id':'provider-id'}));monkeypatch.setattr(worker.http,'post',post)
 job={'id':'delivery','channel':'email','target_key':'qa@example.invalid','title':'Payment confirmed','body':'QA payment body','entity_type':'payment','entity_id':'order','user_id':'owner','category':'payment','event_key':'payment:order:paid:0'}
 assert worker._provider(job)==('accepted','provider-id')
 pdf.assert_called_once_with({'id':'owner','admin':False},'order')
 payload=post.call_args.kwargs['json']
 assert payload['template']['id']=='ai4impact-payment-confirmed-v1'
 assert payload['attachments'][0]['filename']=='AI4Impact-payment-summary.pdf'
 assert 'html' not in payload and payload['reply_to']=='support@ai4impact.in'
