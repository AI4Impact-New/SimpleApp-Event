from contextlib import contextmanager
from unittest.mock import Mock
import pytest
from learning import enquiries, handler
from learning.validation import ApiError

ID='00000000-0000-0000-0000-000000000001'
BODY={'request_id':ID,'name':'Demo Visitor','email':'demo@example.invalid','phone':'+91 90000 00000','interest':'Not sure yet — help me choose','consent':True,'source_page':'/'}

def cursor(monkeypatch, values):
    cur=Mock();cur.fetchone.side_effect=values
    @contextmanager
    def ctx():yield cur
    monkeypatch.setattr(enquiries,'get_db_cursor',ctx)
    return cur


def test_public_submission_normalizes_contact_and_omits_private_fields(monkeypatch):
    cur=cursor(monkeypatch,[{'id':ID}])
    result=enquiries.submit({**BODY,'email':'Demo@Example.invalid'})
    assert result=={'id':ID,'message':'Request received'}
    args=cur.execute.call_args.args[1]
    assert args[2]=='demo@example.invalid' and args[3]=='+919000000000'
    assert 'guidance-contact-v1' in args


@pytest.mark.parametrize('field,value',[('consent',False),('consent','true'),('email','invalid'),('phone','+91'),('name','X'),('source_page','https://elsewhere.test'),('request_id','bad')])
def test_public_submission_rejects_invalid_or_unconsented_data(field,value):
    with pytest.raises(ApiError):enquiries.submit({**BODY,field:value})


def test_honeypot_does_not_touch_database(monkeypatch):
    cur=Mock();monkeypatch.setattr(enquiries,'get_db_cursor',cur)
    assert enquiries.submit({**BODY,'website':'bot.example'})['id']==ID
    cur.assert_not_called()


def test_duplicate_submission_same_payload_returns_same_id(monkeypatch):
    cur=cursor(monkeypatch,[{'id':ID}]);enquiries.submit(BODY)
    digest=cur.execute.call_args.args[1][-1]
    cursor(monkeypatch,[None,{'payload_hash':digest}])
    assert enquiries.submit(BODY)['id']==ID


def test_reused_request_id_with_changed_data_conflicts(monkeypatch):
    cursor(monkeypatch,[None,{'payload_hash':'different'}])
    with pytest.raises(ApiError) as error:enquiries.submit(BODY)
    assert error.value.status==409


def test_student_cannot_read_or_change_marketing_leads():
    actor={'id':ID,'admin':False}
    with pytest.raises(ApiError):enquiries.listing(actor,{})
    with pytest.raises(ApiError):enquiries.update(actor,ID,{'status':'contacted'})


def test_invalid_followup_status_does_not_write(monkeypatch):
    call=Mock();monkeypatch.setattr(enquiries,'execute_query',call)
    with pytest.raises(ApiError):enquiries.update({'id':ID,'admin':True},ID,{'status':'admin'})
    call.assert_not_called()


def test_public_post_bypasses_login_but_admin_get_requires_login(monkeypatch):
    monkeypatch.setattr(enquiries,'submit',lambda body:{'id':ID,'message':'Request received'})
    assert handler.handler({'path':'/enquiries','httpMethod':'POST','body':'{}'},None)['statusCode']==202
    assert handler.handler({'path':'/admin/enquiries','httpMethod':'GET'},None)['statusCode']==401
