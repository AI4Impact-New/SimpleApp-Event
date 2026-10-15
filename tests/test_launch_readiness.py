from contextlib import contextmanager
from unittest.mock import Mock
import pytest
from learning import enquiries,handler,operations,staff
from learning.validation import ApiError
ID='00000000-0000-0000-0000-000000000001'
MARKETING={'id':ID,'admin':False,'marketing':True}
EMPLOYER={'request_id':ID,'name':'QA Employer','email':'qa@example.invalid','phone':'+919000000000','organisation':'QA Company','roles':'Two data engineers, remote','consent':True,'source_page':'/hire-from-us'}

def test_employer_submission_retains_hiring_details(monkeypatch):
    cur=Mock();cur.fetchone.return_value={'id':ID}
    @contextmanager
    def ctx():yield cur
    monkeypatch.setattr(enquiries,'get_db_cursor',ctx)
    assert enquiries.submit(EMPLOYER,True)['id']==ID
    args=cur.execute.call_args.args[1]
    assert 'QA Company' in args and 'Two data engineers, remote' in args and 'employer' in args
    assert 'employer-contact-v1' in args

@pytest.mark.parametrize('key,value',[('organisation',''),('roles',''),('roles','x'*2001),('consent',False)])
def test_employer_validation(key,value):
    with pytest.raises(ApiError):enquiries.submit({**EMPLOYER,key:value},True)

def test_guidance_cannot_inject_employer_fields():
    with pytest.raises(ApiError):enquiries.submit(EMPLOYER)

def test_marketing_can_follow_up_with_audit_but_not_enroll(monkeypatch):
    cur=Mock();cur.fetchone.side_effect=[{'status':'new'},{'id':ID,'status':'contacted'}]
    @contextmanager
    def ctx():yield cur
    monkeypatch.setattr(enquiries,'get_db_cursor',ctx)
    enquiries.update(MARKETING,ID,{'status':'contacted','notes':'Call back'})
    sql=' '.join(c.args[0] for c in cur.execute.call_args_list)
    assert 'enquiry_audit' in sql and 'course_registrations' not in sql

@pytest.mark.parametrize('path,method',[('/admin/billing/courses','GET'),('/admin/operations/readiness','GET'),('/admin/marketing/users','PUT'),('/admin/learning/overview','GET')])
def test_marketing_cannot_use_other_admin_apis(monkeypatch,path,method):
    monkeypatch.setattr(handler,'_actor',lambda event:MARKETING)
    r=handler.handler({'rawPath':path,'httpMethod':method,'body':'{}'},None)
    assert r['statusCode']==403

def test_marketing_can_read_only_student_interest_contacts(monkeypatch):
    monkeypatch.setattr(handler,'_actor',lambda e:MARKETING)
    monkeypatch.setattr(enquiries,'execute_query',lambda *a,**k:[])
    assert handler.handler({'rawPath':'/admin/marketing/interests','httpMethod':'GET'},None)['statusCode']==200

def test_student_cannot_read_interest_contacts():
    with pytest.raises(ApiError):enquiries.student_interests({'id':ID,'admin':False})

def test_marketing_cannot_assign_access_or_read_operations():
    with pytest.raises(ApiError):staff.membership(MARKETING,{'email':'qa@example.invalid','enabled':True})
    with pytest.raises(ApiError):operations.readiness(MARKETING)

def test_unknown_enquiry_kind_rejected():
    with pytest.raises(ApiError):enquiries.listing(MARKETING,{'kind':'private'})

def test_public_employer_route_does_not_require_login(monkeypatch):
    monkeypatch.setattr(enquiries,'submit',lambda body,employer:{'id':ID})
    assert handler.handler({'rawPath':'/employer-enquiries','httpMethod':'POST','body':'{}'},None)['statusCode']==202
