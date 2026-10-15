import base64
from datetime import datetime,timedelta,timezone
from contextlib import contextmanager
from unittest.mock import Mock
import pytest
from learning import billing,access_windows,handler
from learning.validation import ApiError
UID='00000000-0000-0000-0000-000000000001'
CID='00000000-0000-0000-0000-000000000002'
OTHER='00000000-0000-0000-0000-000000000003'
ACTOR={'id':UID,'admin':False}
ADMIN={'id':UID,'admin':True}
NOW=datetime.now(timezone.utc)

@pytest.mark.parametrize('v',[True,None,{},-1,101,'NaN','Infinity','0.001'])
def test_discount_invalid(v):
    with pytest.raises(ApiError):billing.discount_basis_points(v)

@pytest.mark.parametrize('marked,bps,total',[(6999900,1000,6299910),(100,10000,0),(0,500,0),(1,5000,0),(101,5000,50)])
def test_money_rounds_discount_half_up(marked,bps,total):
    assert billing.amounts(marked,bps)['total_paise']==total

@pytest.mark.parametrize('v',[-1,True,1.5,1000000001])
def test_price_invalid(v):
    with pytest.raises(ApiError):billing.amounts(v,0)

def test_student_cannot_edit_prices_or_list_admin_orders():
    for action in [lambda:billing.set_price(ACTOR,CID,{'marked_price_paise':0}),lambda:billing.listing(ACTOR,True)]:
        with pytest.raises(ApiError) as e:action()
        assert e.value.status==403

def test_order_cannot_be_read_by_other_user(monkeypatch):
    monkeypatch.setattr(billing,'execute_query',lambda *a,**k:{'user_id':OTHER})
    with pytest.raises(ApiError) as e:billing.get_order(ACTOR,CID)
    assert e.value.status==404

def test_create_rejects_client_price_and_student_impersonation():
    for extra in [{'total_paise':1},{'buyer_email':'other@example.com'},{'user_id':OTHER}]:
        with pytest.raises(ApiError) as e:billing.create_order(ACTOR,{'course_id':CID,'request_id':OTHER,**extra})
        assert e.value.status==400

def cursor(monkeypatch,module,rows):
    cur=Mock();cur.fetchone.side_effect=rows
    @contextmanager
    def context():yield cur
    monkeypatch.setattr(module,'get_db_cursor',context)
    return cur

@pytest.mark.parametrize('status,action,expected',[('cancelled','complete_demo',409),('demo_completed','cancel',409),('pending','complete_demo',410)])
def test_final_or_expired_order_not_modified(monkeypatch,status,action,expected):
    cur=cursor(monkeypatch,billing,[{'id':CID,'user_id':UID,'status':status,'expires_at':NOW-timedelta(seconds=1),'server_now':NOW}])
    with pytest.raises(ApiError) as e:billing.finish(ACTOR,CID,{'action':action})
    assert e.value.status==expected
    assert not any(call.args[0].lstrip().startswith('UPDATE') for call in cur.execute.call_args_list)

def test_checkout_retry_safe_and_no_enrollment(monkeypatch):
    row={'id':CID,'user_id':UID,'status':'demo_completed'}
    cur=cursor(monkeypatch,billing,[row])
    assert billing.finish(ACTOR,CID,{'action':'complete_demo'})['status']=='demo_completed'
    assert len(cur.execute.call_args_list)==1

def test_checkout_completion_only_updates_order(monkeypatch):
    row={'id':CID,'user_id':UID,'status':'pending','expires_at':NOW+timedelta(days=1),'server_now':NOW}
    cur=cursor(monkeypatch,billing,[row,{**row,'status':'demo_completed'}])
    assert billing.finish(ACTOR,CID,{'action':'complete_demo'})['demo'] is True
    assert all('course_registrations' not in c.args[0] for c in cur.execute.call_args_list)

def test_order_retry_uses_original_snapshot(monkeypatch):
    old={'id':CID,'course_id':CID,'total_paise':123,'user_id':UID}
    cur=cursor(monkeypatch,billing,[{'id':UID,'name':'Test','email':'test@example.invalid'},old])
    assert billing.create_order(ACTOR,{'course_id':CID,'request_id':OTHER})['total_paise']==123
    assert not any('INSERT' in c.args[0] for c in cur.execute.call_args_list)

def row(cid,completed=False,start=None,end=None):
    return {'id':cid,'asset_id':cid,'video_status':'ready','published_at':NOW-timedelta(days=1),
            'completed':completed,'completed_at':NOW-timedelta(hours=1) if completed else None,
            'unlocked_at':start,'expires_at':end,'server_now':NOW}

def test_first_unlock_and_next_locked():
    cur=Mock();cur.fetchall.return_value=[row(CID),row(OTHER)]
    result=access_windows._windows(ACTOR,UID,cur)
    assert result[CID]['access_state']=='available' and result[OTHER]['access_state']=='locked'
    assert result[CID]['access_expires_at']==NOW+timedelta(days=7)

def test_next_unlock_starts_at_previous_completion():
    cur=Mock();cur.fetchall.return_value=[row(CID,True,NOW-timedelta(days=2),NOW+timedelta(days=5)),row(OTHER)]
    result=access_windows._windows(ACTOR,UID,cur)
    assert result[OTHER]['unlocked_at']==NOW-timedelta(hours=1)
    assert result[OTHER]['access_expires_at']==NOW+timedelta(days=7,hours=-1)

def test_window_does_not_refresh_on_reload():
    cur=Mock();cur.fetchall.return_value=[row(CID,False,NOW-timedelta(days=8),NOW-timedelta(days=1)),row(OTHER)]
    result=access_windows._windows(ACTOR,UID,cur)
    assert result[CID]['access_state']=='expired' and result[OTHER]['access_state']=='locked'
    assert not any('INSERT' in c.args[0] for c in cur.execute.call_args_list)

@pytest.mark.parametrize('state,code',[('locked',403),('expired',410),('not_ready',409)])
def test_window_enforcement(monkeypatch,state,code):
    monkeypatch.setattr(access_windows,'_windows',lambda *a:{CID:{'access_state':state}})
    with pytest.raises(ApiError) as e:access_windows.require_window(ACTOR,UID,CID,Mock())
    assert e.value.status==code

def test_admin_preview_bypasses_student_window():
    assert access_windows.require_window(ADMIN,UID,CID) is None

def test_unpublished_previous_video_blocks_following():
    cur=Mock();first=row(CID);first['video_status']='uploading';cur.fetchall.return_value=[first,row(OTHER)]
    result=access_windows._windows(ACTOR,UID,cur)
    assert result[CID]['access_state']=='not_ready' and result[OTHER]['access_state']=='locked'

def test_order_endpoints_require_authentication():
    r=handler.handler({'rawPath':'/me/purchases','httpMethod':'GET'},None)
    assert r['statusCode']==401

def test_invoice_ownership_checked_before_render(monkeypatch):
    monkeypatch.setattr(billing,'execute_query',lambda *a,**k:{'user_id':OTHER})
    with pytest.raises(ApiError):billing.invoice_pdf(ACTOR,CID)

def test_invoice_contains_pdf_and_actual_logo(monkeypatch):
    monkeypatch.setattr(billing,'get_order',lambda *a:{'id':CID,'created_at':NOW,'buyer_name':'QA learner','buyer_email':'qa@example.invalid','status':'pending','course_title':'AI Product & Automation Builder','marked_price_paise':3499900,'discount_bps':1000,'discount_paise':349990,'total_paise':3149910})
    pdf=billing.invoice_pdf(ACTOR,CID)
    assert pdf.startswith(b'%PDF-') and b'/Subtype /Image' in pdf
    assert b'AI4Impact Demo Invoice' in pdf

def test_order_request_cannot_be_reused_for_different_course(monkeypatch):
    cursor(monkeypatch,billing,[{'id':UID,'name':'QA','email':'qa@example.invalid'},{'course_id':OTHER}])
    with pytest.raises(ApiError) as e:billing.create_order(ACTOR,{'course_id':CID,'request_id':OTHER})
    assert e.value.status==409

def test_other_student_cannot_complete_order(monkeypatch):
    cur=cursor(monkeypatch,billing,[{'user_id':OTHER}])
    with pytest.raises(ApiError) as e:billing.finish(ACTOR,CID,{'action':'complete_demo'})
    assert e.value.status==404
    assert len(cur.execute.call_args_list)==1

def test_public_catalog_does_not_require_login(monkeypatch):
    monkeypatch.setattr(billing,'catalog',lambda actor:[])
    response=handler.handler({'rawPath':'/billing/catalog','httpMethod':'GET'},None)
    assert response['statusCode']==200
