from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import Mock
import pytest
from learning import assisted, handler
from learning.validation import ApiError
ID='00000000-0000-0000-0000-000000000001'
OTHER='00000000-0000-0000-0000-000000000002'
STAFF={'id':ID,'admin':False,'marketing':True}
PROFILE={'name':'QA Learner','email':'qa@example.invalid','phone':'+919000000000','user_type':'student','university':'QA University','course':'BTech','year_of_study':'3','city':'Pune','state':'MH','account_authorized':True}

@pytest.mark.parametrize('key,value',[('account_authorized',False),('account_authorized','true'),('email','bad'),('email','a"b@example.com'),('phone','123'),('user_type','admin'),('university',''),('course',''),('year_of_study',''),('city',''),('state','')])
def test_profile_rejects_incomplete_or_unconsented_data(key,value):
    with pytest.raises(ApiError):assisted.validate_profile({**PROFILE,key:value})

def test_profiles_match_student_and_professional_fields():
    assert assisted.validate_profile(PROFILE)['university']=='QA University'
    assert assisted.validate_profile({**PROFILE,'user_type':'professional','designation':'Engineer','company':'QA Co','university':''})['company']=='QA Co'

@pytest.mark.parametrize('path,method',[('', 'GET'),('', 'PUT'),('/account','POST'),('/invitation','POST'),('/quotes','POST'),('/quotes/'+OTHER+'/email','POST'),('/quotes/'+OTHER+'/invoice','GET')])
def test_student_cannot_use_any_assisted_route(monkeypatch,path,method):
    monkeypatch.setattr(handler,'_actor',lambda e:{'id':ID,'admin':False,'marketing':False})
    assert handler.handler({'rawPath':'/admin/enquiries/'+ID+'/assisted'+path,'httpMethod':method,'body':'{}'},None)['statusCode']==403


def cursor(monkeypatch,values):
    cur=Mock();cur.fetchone.side_effect=values
    @contextmanager
    def ctx():yield cur
    monkeypatch.setattr(assisted,'get_db_cursor',ctx)
    return cur


def test_marketing_profile_save_has_audit_and_does_not_enroll(monkeypatch):
    c=cursor(monkeypatch,[{'kind':'guidance'},None,{'profile':PROFILE}])
    assisted.save_profile(STAFF,ID,PROFILE)
    sql=' '.join(x.args[0] for x in c.execute.call_args_list)
    assert 'assisted_actions' in sql and 'course_registrations' not in sql


def test_employer_cannot_become_student(monkeypatch):
    cursor(monkeypatch,[{'kind':'employer'}])
    with pytest.raises(ApiError) as e:assisted.save_profile(STAFF,ID,PROFILE)
    assert e.value.status==409


def test_existing_link_is_idempotent_and_does_not_call_cognito(monkeypatch):
    cursor(monkeypatch,[{'kind':'guidance'},{'account_authorized':True,'user_id':OTHER}])
    cg=Mock();monkeypatch.setattr(assisted,'cognito',cg);monkeypatch.setenv('COGNITO_USER_POOL_ID','pool')
    assert assisted.create_account(STAFF,ID)['user_id']==OTHER
    cg.admin_create_user.assert_not_called()


def test_existing_staff_identity_cannot_be_converted(monkeypatch):
    cursor(monkeypatch,[{'kind':'guidance'},{'account_authorized':True,'user_id':None,'profile':assisted.validate_profile(PROFILE)}])
    cg=Mock();cg.list_users.return_value={'Users':[{'Username':'employee'}]};cg.admin_list_groups_for_user.return_value={'Groups':[{'GroupName':'Admins'}]}
    monkeypatch.setattr(assisted,'cognito',cg);monkeypatch.setenv('COGNITO_USER_POOL_ID','pool')
    with pytest.raises(ApiError):assisted.create_account(STAFF,ID)
    cg.admin_add_user_to_group.assert_not_called()


def test_identity_collision_never_rebinds_existing_profile(monkeypatch):
    cursor(monkeypatch,[{'kind':'guidance'},{'account_authorized':True,'user_id':None,'profile':assisted.validate_profile(PROFILE)},{'id':ID,'cognito_id':'old-sub'}])
    cg=Mock();cg.list_users.return_value={'Users':[{'Username':'learner','Enabled':True,'Attributes':[{'Name':'sub','Value':'new-sub'}]}]};cg.admin_list_groups_for_user.return_value={'Groups':[]}
    monkeypatch.setattr(assisted,'cognito',cg);monkeypatch.setenv('COGNITO_USER_POOL_ID','pool')
    with pytest.raises(ApiError):assisted.create_account(STAFF,ID)
    cg.admin_add_user_to_group.assert_not_called()


def test_no_invitation_or_reset_for_existing_self_service_accounts(monkeypatch):
    monkeypatch.setattr(assisted,'execute_query',lambda *a,**k:{'user_id':OTHER,'account_created_here':False})
    cg=Mock();monkeypatch.setattr(assisted,'cognito',cg)
    with pytest.raises(ApiError):assisted.invite(STAFF,ID,{'request_id':OTHER})
    cg.admin_create_user.assert_not_called()


def test_activated_account_password_is_never_reset(monkeypatch):
    monkeypatch.setattr(assisted,'execute_query',lambda *a,**k:{'user_id':OTHER,'account_created_here':True,'cognito_username':'learner'})
    cg=Mock();cg.admin_get_user.return_value={'UserStatus':'CONFIRMED'};monkeypatch.setattr(assisted,'cognito',cg);monkeypatch.setenv('COGNITO_USER_POOL_ID','pool')
    with pytest.raises(ApiError):assisted.invite(STAFF,ID,{'request_id':OTHER})
    cg.admin_create_user.assert_not_called()


def test_quote_retry_rejects_changed_price(monkeypatch):
    cursor(monkeypatch,[{'kind':'guidance'},{'user_id':OTHER},{'quote_hash':'different'}])
    with pytest.raises(ApiError) as e:assisted.quote(STAFF,ID,{'request_id':ID,'course_id':OTHER,'marked_price_paise':10000,'discount_percentage':10})
    assert e.value.status==409


def test_quote_delivery_disabled_is_explicit_and_never_calls_ses(monkeypatch):
    monkeypatch.setattr(assisted,'quote_order',lambda *a:{'status':'pending'})
    monkeypatch.delenv('TRANSACTIONAL_EMAIL_ENABLED',raising=False);client=Mock();monkeypatch.setattr(assisted,'ses',client)
    with pytest.raises(ApiError) as e:assisted.send_quote(STAFF,ID,OTHER,{'request_id':ID})
    assert e.value.status==503
    client.send_email.assert_not_called()


def test_quote_pdf_is_bound_to_the_enquiry(monkeypatch):
    monkeypatch.setattr(assisted,'execute_query',lambda *a,**k:None)
    with pytest.raises(ApiError):assisted.quote_invoice(STAFF,ID,OTHER)


def test_quote_html_escapes_contact_course_and_url():
    row={'buyer_name':'<script>','course_title':'<b>course</b>','marked_price_paise':10000,'discount_bps':1000,'total_paise':9000,'checkout_url':'https://example.invalid/?x="bad"'}
    subject,plain,html=assisted.quote_email(row)
    assert '<script>' not in html and '&lt;script&gt;' in html and '&quot;bad&quot;' in html
    assert 'No money is collected' in plain and 'pro forma' in plain


def test_delivery_request_is_not_repeated_after_unknown_or_failed_submission(monkeypatch):
    cursor(monkeypatch,[{'kind':'guidance'},None,{'state':'pending','details':{}}])
    with pytest.raises(ApiError) as e:assisted._begin_action(STAFF,ID,'invitation',OTHER,{})
    assert e.value.status==409


def test_invitation_resend_uses_email_in_email_username_pool(monkeypatch):
    monkeypatch.setattr(assisted,'execute_query',lambda *a,**k:{'user_id':OTHER,'account_created_here':True,'cognito_username':'opaque-sub','profile':{'email':'qa@example.invalid'}})
    cg=Mock();cg.admin_get_user.return_value={'UserStatus':'FORCE_CHANGE_PASSWORD'}
    monkeypatch.setattr(assisted,'cognito',cg);monkeypatch.setenv('COGNITO_USER_POOL_ID','pool')
    monkeypatch.setattr(assisted,'_begin_action',lambda *a:ID);monkeypatch.setattr(assisted,'_finish_action',lambda *a:None)
    assert assisted.invite(STAFF,ID,{'request_id':OTHER})['state']=='accepted'
    assert cg.admin_create_user.call_args.kwargs['Username']=='qa@example.invalid'
