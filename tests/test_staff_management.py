from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from learning import staff
from learning.validation import ApiError

ACTOR={'id':'operator-db-id','sub':'operator-sub','admin':True}
TARGET={'Username':'target-name','UserAttributes':[{'Name':'sub','Value':'target-sub'},{'Name':'email','Value':'target@example.invalid'}]}

@pytest.fixture
def setup(monkeypatch):
    client=Mock()
    class Missing(Exception):pass
    client.exceptions=SimpleNamespace(UserNotFoundException=Missing)
    client.admin_get_user.return_value=TARGET
    client.admin_list_groups_for_user.return_value={'Groups':[{'GroupName':'Admins'},{'GroupName':'Marketing'}]}
    client.get_paginator.return_value.paginate.return_value=[{'Users':[{'Username':'other-admin','Enabled':True,'UserStatus':'CONFIRMED'}]}]
    cur=Mock()
    @contextmanager
    def cursor():yield cur
    monkeypatch.setattr(staff,'client',client);monkeypatch.setattr(staff,'get_db_cursor',cursor);monkeypatch.setenv('COGNITO_USER_POOL_ID','test-pool')
    return client,cur

def body(action='remove_role',role='Marketing'):
    return {'username':'target-name','action':action,'role':role,'confirmation_email':'target@example.invalid'}

def test_removing_marketing_preserves_other_roles(setup):
    client,cur=setup
    result=staff.account_action(ACTOR,body())
    client.admin_remove_user_from_group.assert_called_once_with(UserPoolId='test-pool',Username='target-name',GroupName='Marketing')
    client.admin_delete_user.assert_not_called();client.admin_disable_user.assert_not_called()
    assert 'Other roles' in result['message']
    assert 'pg_advisory_xact_lock' in cur.execute.call_args.args[0]

@pytest.mark.parametrize('action,role',[('delete_account',None),('remove_role','Admins')])
def test_self_delete_and_self_admin_removal_blocked(setup,action,role):
    client,_=setup
    with pytest.raises(ApiError) as e:staff.account_action({**ACTOR,'sub':'target-sub'},body(action,role))
    assert e.value.status==409
    client.admin_remove_user_from_group.assert_not_called();client.admin_delete_user.assert_not_called()

@pytest.mark.parametrize('other',[[],[{'Username':'disabled','Enabled':False,'UserStatus':'CONFIRMED'}],[{'Username':'pending','Enabled':True,'UserStatus':'FORCE_CHANGE_PASSWORD'}]])
def test_last_usable_admin_is_protected(setup,other):
    client,_=setup;client.get_paginator.return_value.paginate.return_value=[{'Users':other}]
    with pytest.raises(ApiError) as e:staff.account_action(ACTOR,body('remove_role','Admins'))
    assert e.value.status==409
    client.admin_remove_user_from_group.assert_not_called()

def test_last_admin_search_includes_later_pages(setup):
    client,_=setup
    client.get_paginator.return_value.paginate.return_value=[{'Users':[]},{'Users':[{'Username':'other','Enabled':True,'UserStatus':'CONFIRMED'}]}]
    staff.account_action(ACTOR,body('remove_role','Admins'))
    client.admin_remove_user_from_group.assert_called_once()

def test_delete_revokes_disables_then_deletes_without_erasing_business_data(setup):
    client,cur=setup
    staff.account_action(ACTOR,body('delete_account',None))
    calls=[c[0] for c in client.mock_calls]
    assert calls.index('admin_user_global_sign_out')<calls.index('admin_disable_user')<calls.index('admin_delete_user')
    assert cur.execute.call_count==1
    assert cur.execute.call_args.args[0].startswith('SELECT ')

def test_mistyped_confirmation_email_cannot_delete(setup):
    client,_=setup
    with pytest.raises(ApiError) as e:staff.account_action(ACTOR,{**body('delete_account',None),'confirmation_email':'wrong@example.invalid'})
    assert e.value.status==400
    client.admin_delete_user.assert_not_called();client.admin_disable_user.assert_not_called()

def test_student_identity_cannot_be_deleted_through_staff_controls(setup):
    client,_=setup;client.admin_list_groups_for_user.return_value={'Groups':[{'GroupName':'Students'}]}
    with pytest.raises(ApiError) as e:staff.account_action(ACTOR,body('delete_account',None))
    assert e.value.status==403
    client.admin_delete_user.assert_not_called()

def test_role_removal_retry_is_safe(setup):
    client,_=setup;client.admin_list_groups_for_user.return_value={'Groups':[{'GroupName':'Admins'}]}
    assert 'already removed' in staff.account_action(ACTOR,body())['message']
    client.admin_remove_user_from_group.assert_not_called()

@pytest.mark.parametrize('actor',[{'id':'x','sub':'x','admin':False,'marketing':True},{'id':'x','admin':True}])
def test_unprivileged_or_unidentified_actor_denied_before_aws(setup,actor):
    client,cur=setup
    with pytest.raises(ApiError) as e:staff.account_action(actor,body())
    assert e.value.status==403
    client.admin_get_user.assert_not_called();cur.execute.assert_not_called()

def test_unknown_roles_and_fields_rejected(setup):
    client,_=setup
    for invalid in [{**body(),'role':'Students'},{**body(),'other':'injected'}]:
        with pytest.raises(ApiError) as e:staff.account_action(ACTOR,invalid)
        assert e.value.status==400
    client.admin_get_user.assert_not_called()

def test_missing_cognito_user_is_not_reported_deleted(setup):
    client,_=setup;client.admin_get_user.side_effect=client.exceptions.UserNotFoundException()
    with pytest.raises(ApiError) as e:staff.account_action(ACTOR,body())
    assert e.value.status==404

def test_partial_delete_failure_propagates_for_retry(setup):
    client,_=setup;client.admin_delete_user.side_effect=RuntimeError('AWS unavailable')
    with pytest.raises(RuntimeError):staff.account_action(ACTOR,body('delete_account',None))
    client.admin_disable_user.assert_called_once()
