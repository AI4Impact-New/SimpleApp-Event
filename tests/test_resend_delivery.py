import base64
from unittest.mock import Mock
import pytest
import requests
from learning import email_delivery as mail

@pytest.fixture(autouse=True)
def setup(monkeypatch):
    monkeypatch.setenv('RESEND_API_KEY_SECRET_ARN','arn:aws:secretsmanager:ap-south-1:767491588787:secret:test')
    monkeypatch.setenv('TRANSACTIONAL_FROM_EMAIL','noreply@ai4impact.in')
    monkeypatch.setattr(mail,'_key_cache',None)
    monkeypatch.setattr(mail,'api_key',lambda:'re_test_only')

def send():return mail.send_quote_email(recipient='learner@example.invalid',subject='Quote',plain='Quote text',html='<p>Quote</p>',pdf=b'%PDF-demo',idempotency_key='quote/action-id')

def test_resend_request_has_pdf_and_idempotency_key(monkeypatch):
    post=Mock(return_value=Mock(status_code=200,json=lambda:{'id':'message-id'}));monkeypatch.setattr(mail.requests,'post',post)
    assert send()=='message-id'
    args=post.call_args.kwargs
    assert post.call_args.args==('https://api.resend.com/emails',)
    assert args['json']['to']==['learner@example.invalid']
    assert args['json']['from']=='AI4Impact <noreply@ai4impact.in>'
    assert base64.b64decode(args['json']['attachments'][0]['content'])==b'%PDF-demo'
    assert args['headers']['Idempotency-Key']=='quote/action-id'
    assert args['allow_redirects'] is False and args['timeout']==(3,10)

@pytest.mark.parametrize('status,uncertain',[(400,False),(401,False),(403,False),(429,False),(500,True),(302,False)])
def test_provider_errors_are_sanitized_without_retry(monkeypatch,status,uncertain):
    post=Mock(return_value=Mock(status_code=status,text='secret and recipient content'));monkeypatch.setattr(mail.requests,'post',post)
    with pytest.raises(mail.DeliveryError) as e:send()
    assert e.value.uncertain==uncertain
    assert 'secret' not in str(e.value)
    assert post.call_count==1

def test_lost_response_does_not_report_success(monkeypatch):
    monkeypatch.setattr(mail.requests,'post',Mock(side_effect=requests.Timeout('private request data')))
    with pytest.raises(mail.DeliveryError) as e:send()
    assert e.value.uncertain and 'private' not in str(e.value)

@pytest.mark.parametrize('response',[{}, {'id':''}, {'id':None}])
def test_missing_message_id_is_uncertain(monkeypatch,response):
    monkeypatch.setattr(mail.requests,'post',Mock(return_value=Mock(status_code=200,json=lambda:response)))
    with pytest.raises(mail.DeliveryError) as e:send()
    assert e.value.uncertain

_REAL_KEY=__import__('learning.email_delivery',fromlist=['api_key']).api_key

def test_key_is_loaded_from_secret_and_cached(monkeypatch):
    monkeypatch.setattr(mail,'api_key',_REAL_KEY)
    get=Mock(return_value={'SecretString':'{"api_key":"re_local_test_only"}'})
    monkeypatch.setattr(mail.secret_client,'get_secret_value',get)
    assert mail.api_key()=='re_local_test_only'
    assert mail.api_key()=='re_local_test_only'
    assert get.call_count==1


def test_empty_secret_does_not_send(monkeypatch):
    monkeypatch.setattr(mail,'api_key',_REAL_KEY)
    monkeypatch.setattr(mail.secret_client,'get_secret_value',Mock(return_value={'SecretString':'{}'}))
    post=Mock();monkeypatch.setattr(mail.requests,'post',post)
    with pytest.raises(mail.DeliveryError) as e:send()
    assert e.value.status==503
    post.assert_not_called()


def test_unknown_delivery_is_preserved_for_review(monkeypatch):
    from learning import assisted
    row={'status':'pending','buyer_name':'QA','buyer_email':'qa@example.invalid','course_title':'QA','marked_price_paise':100,'discount_bps':0,'total_paise':100,'checkout_url':'https://example.invalid/checkout'}
    monkeypatch.setenv('TRANSACTIONAL_EMAIL_ENABLED','true')
    monkeypatch.setattr(assisted,'staff',lambda actor:None)
    monkeypatch.setattr(assisted,'quote_order',lambda *a:row)
    monkeypatch.setattr(assisted,'quote_invoice',lambda *a:b'%PDF')
    monkeypatch.setattr(assisted,'_begin_action',lambda *a:'action-id')
    finish=Mock();monkeypatch.setattr(assisted,'_finish_action',finish)
    monkeypatch.setattr(mail,'send_quote_email',Mock(side_effect=mail.DeliveryError('timeout',uncertain=True)))
    from learning.validation import ApiError
    with pytest.raises(ApiError) as e:assisted.send_quote({},'e','o',{'request_id':'request-id'})
    assert e.value.status==502
    assert finish.call_args.args[1]=='pending'
    assert finish.call_args.args[2]['delivery_uncertain'] is True
