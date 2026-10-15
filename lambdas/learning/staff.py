"""Admin-controlled Marketing membership; never creates accounts or sends mail."""
import os,re
import boto3
from botocore.config import Config
from learning.service import admin
from learning.validation import ApiError
client=boto3.client('cognito-idp',config=Config(connect_timeout=3,read_timeout=8,retries={'total_max_attempts':2,'mode':'standard'}))

def members(actor,params):
    admin(actor)
    token=params.get('next_token');kwargs={'UserPoolId':os.environ['COGNITO_USER_POOL_ID'],'GroupName':'Marketing','Limit':60}
    if token:kwargs['NextToken']=token
    r=client.list_users_in_group(**kwargs)
    users=[]
    for u in r.get('Users',[]):
        a={v['Name']:v['Value'] for v in u.get('Attributes',[])}
        users.append({'username':u['Username'],'email':a.get('email'),'name':a.get('name'),'enabled':u['Enabled']})
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
