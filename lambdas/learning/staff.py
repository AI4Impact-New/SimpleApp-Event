"""Admin-controlled Marketing membership; never creates accounts or sends mail."""
import os,re,logging
import boto3
from botocore.config import Config
from learning.service import admin
from learning.validation import ApiError
from shared.db import get_db_cursor
client=boto3.client('cognito-idp',config=Config(connect_timeout=3,read_timeout=8,retries={'total_max_attempts':2,'mode':'standard'}))

def members(actor,params):
    admin(actor)
    token=params.get('next_token');kwargs={'UserPoolId':os.environ['COGNITO_USER_POOL_ID'],'GroupName':'Marketing','Limit':60}
    if token:kwargs['NextToken']=token
    r=client.list_users_in_group(**kwargs)
    users=[]
    for u in r.get('Users',[]):
        a={v['Name']:v['Value'] for v in u.get('Attributes',[])}
        users.append({'username':u['Username'],'sub':a.get('sub'),'email':a.get('email'),'name':a.get('name'),'enabled':u['Enabled'],'status':u.get('UserStatus'),'created_at':u.get('UserCreateDate'),'groups':['Marketing']})
    return {'users':users,'next_token':r.get('NextToken')}

def membership(actor,body):
    admin(actor)
    if set(body)!={'email','enabled'} or not isinstance(body['enabled'],bool):raise ApiError(400,'Provide email and boolean enabled')
    email=body['email']
    if not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[^\s@"\\]+@[^\s@"\\]+\.[^\s@"\\]+',email):raise ApiError(400,'Enter a valid account email')
    pool=os.environ['COGNITO_USER_POOL_ID'];email=email.strip().lower()
    r=client.list_users(UserPoolId=pool,Filter='email = "'+email+'"',Limit=2)
    if len(r.get('Users',[]))!=1:raise ApiError(404,'Existing Cognito account not found; the person must sign up first')
    username=r['Users'][0]['Username']
    action=client.admin_add_user_to_group if body['enabled'] else client.admin_remove_user_from_group
    action(UserPoolId=pool,Username=username,GroupName='Marketing')
    return {'email':email,'marketing_access':body['enabled'],'message':'Membership updated. The user must sign out and sign in to refresh their group claims.'}


def account_action(actor, body):
    """Manage staff identities, preserving all historical application records."""
    admin(actor)
    if not actor.get('sub'):
        raise ApiError(403, 'Your sign-in identity could not be confirmed')
    if set(body) - {'username','action','role','confirmation_email'}:
        raise ApiError(400, 'Unknown staff action field')
    username, action, role = body.get('username'), body.get('action'), body.get('role')
    if not isinstance(username,str) or not username.strip() or len(username)>128:
        raise ApiError(400, 'A valid account username is required')
    if action not in ('remove_role','delete_account'):
        raise ApiError(400, 'Choose remove_role or delete_account')
    if action=='remove_role' and role not in ('Admins','Marketing'):
        raise ApiError(400, 'Only Admins and Marketing roles can be managed here')
    pool=os.environ['COGNITO_USER_POOL_ID']
    # Serialize last-admin checks across Lambda instances. The lock is released
    # on any AWS failure; an interrupted disabled account remains visible for retry.
    with get_db_cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended('ai4impact-staff-management',0))")
        try:
            target=client.admin_get_user(UserPoolId=pool,Username=username.strip())
            attrs={a['Name']:a['Value'] for a in target.get('UserAttributes',[])}
            if not attrs.get('sub'):
                raise ApiError(409, 'Account identity is incomplete; contact your administrator')
            confirmed=body.get('confirmation_email')
            if not isinstance(confirmed,str) or not attrs.get('email') or confirmed.strip().casefold()!=attrs['email'].casefold():
                raise ApiError(400, 'Confirm the exact email address of this account')
            username=target['Username']
            groups={g['GroupName'] for g in client.admin_list_groups_for_user(UserPoolId=pool,Username=username).get('Groups',[])}
            if action=='remove_role' and role not in groups:
                return {'username':username,'message':'This role is already removed.'}
            if not groups.intersection({'Admins','Marketing'}):
                raise ApiError(403, 'Only staff accounts can be managed from this page')
            if attrs.get('sub')==actor['sub'] and (action=='delete_account' or role=='Admins'):
                raise ApiError(409, 'You cannot delete your own account or remove your own administrator access')
            removes_admin='Admins' in groups and (action=='delete_account' or role=='Admins')
            if removes_admin:
                others=client.get_paginator('list_users_in_group').paginate(UserPoolId=pool,GroupName='Admins')
                available=any(u['Username']!=username and u.get('Enabled') and u.get('UserStatus') in ('CONFIRMED','EXTERNAL_PROVIDER') for page in others for u in page.get('Users',[]))
                if not available:
                    raise ApiError(409, 'Keep at least one other enabled, confirmed administrator')
            if action=='remove_role':
                client.admin_remove_user_from_group(UserPoolId=pool,Username=username,GroupName=role)
                message=f'{role} access removed. Other roles and the sign-in account are unchanged.'
            else:
                client.admin_user_global_sign_out(UserPoolId=pool,Username=username)
                client.admin_disable_user(UserPoolId=pool,Username=username)
                client.admin_delete_user(UserPoolId=pool,Username=username)
                message='Sign-in account deleted. Historical application records are retained.'
        except client.exceptions.UserNotFoundException:
            raise ApiError(404, 'Account no longer exists; refresh the staff list')
    logging.getLogger(__name__).info('Staff action %s role=%s actor=%s subject=%s',action,role,actor['id'],attrs.get('sub'))
    return {'username':username,'action':action,'message':message+' Existing tokens may retain access until expiry.'}
