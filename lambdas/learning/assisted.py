"""Marketing-assisted student profiles, Cognito invitations and individual demo quotes.

No password is returned, logged or stored. No demo operation grants course access.
"""
import hashlib
import json
import os
import re
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from shared.db import execute_query, get_db_cursor
from learning import billing
from learning.enquiries import staff
from learning.validation import ApiError, identifier, text

CONFIG = Config(connect_timeout=3, read_timeout=8, retries={'total_max_attempts': 1})
cognito = boto3.client('cognito-idp', config=CONFIG)
ses = boto3.client('sesv2', config=CONFIG)
FIELDS = {'name','email','phone','user_type','university','course','year_of_study','city','state','designation','company'}


def validate_profile(body):
    if set(body) - (FIELDS | {'account_authorized'}):
        raise ApiError(400, 'Unknown student profile field')
    values = {k: text(body.get(k), k, 254 if k == 'email' else 120) for k in ['name','email','phone','user_type']}
    values['email'] = values['email'].lower()
    if not re.fullmatch(r'[^\s@"\\]+@[^\s@"\\]+\.[^\s@"\\]+', values['email']):
        raise ApiError(400, 'Enter a valid email')
    values['phone'] = re.sub(r'[\s()\-]', '', values['phone'])
    if not re.fullmatch(r'\+?\d{10,15}', values['phone']):
        raise ApiError(400, 'Enter a valid phone number')
    if len(values['name']) < 2 or values['user_type'] not in ('student','professional'):
        raise ApiError(400, 'Provide full name and student or professional profile type')
    for key in FIELDS - set(values):
        values[key] = text(body.get(key), key, 120) if body.get(key) else ''
    required = ['university','course','year_of_study','city','state'] if values['user_type']=='student' else ['designation','company']
    if any(not values[k] for k in required):
        raise ApiError(400, 'Complete required fields: '+', '.join(required))
    if body.get('account_authorized') is not True:
        raise ApiError(400, 'Confirm the student authorized account creation and these details')
    return values


def _lead(cur, eid):
    cur.execute('SELECT * FROM website_enquiries WHERE id=%s FOR UPDATE', (identifier(eid),))
    row=cur.fetchone()
    if not row: raise ApiError(404, 'Enquiry not found')
    if row['kind']!='guidance': raise ApiError(409, 'Employer enquiries cannot create student accounts')
    return row


def detail(actor, eid):
    staff(actor)
    with get_db_cursor() as cur:
        lead=_lead(cur,eid)
        cur.execute('SELECT * FROM assisted_enrollments WHERE enquiry_id=%s',(eid,))
        enrollment=cur.fetchone()
        cur.execute('SELECT * FROM demo_orders WHERE enquiry_id=%s ORDER BY created_at DESC',(eid,))
        quotes=[billing.order_response(r) for r in cur.fetchall()]
        cur.execute('SELECT action,state,details,created_at,updated_at FROM assisted_actions WHERE enquiry_id=%s ORDER BY created_at DESC LIMIT 30',(eid,))
        actions=cur.fetchall()
    return {'lead':lead,'enrollment':enrollment,'quotes':quotes,'actions':actions,
            'quote_email_enabled':bool(os.environ.get('TRANSACTIONAL_EMAIL_ENABLED')=='true'),
            'notice':'Account creation and demo checkout do not grant course access.'}


def save_profile(actor,eid,body):
    staff(actor);profile=validate_profile(body)
    with get_db_cursor() as cur:
        _lead(cur,eid)
        cur.execute('SELECT * FROM assisted_enrollments WHERE enquiry_id=%s FOR UPDATE',(eid,))
        old=cur.fetchone()
        if old and old['user_id'] and profile['email']!=old['profile']['email']:
            raise ApiError(409,'Linked account email cannot be changed from an enquiry')
        cur.execute('''INSERT INTO assisted_enrollments(enquiry_id,profile,account_authorized,authorized_by,authorized_at)
            VALUES(%s,%s::jsonb,true,%s,now()) ON CONFLICT(enquiry_id) DO UPDATE SET profile=excluded.profile,
            account_authorized=true,authorized_by=excluded.authorized_by,authorized_at=now(),updated_at=now() RETURNING *''',
            (eid,json.dumps(profile),actor['id']))
        result=cur.fetchone()
        cur.execute('INSERT INTO assisted_actions(enquiry_id,actor_id,action,request_id,state) VALUES(%s,%s,\'profile_saved\',%s,\'accepted\')',(eid,actor['id'],str(uuid.uuid4())))
    return result


def create_account(actor,eid):
    staff(actor);pool=os.environ['COGNITO_USER_POOL_ID']
    with get_db_cursor() as cur:
        _lead(cur,eid)
        cur.execute('SELECT * FROM assisted_enrollments WHERE enquiry_id=%s FOR UPDATE',(eid,))
        assisted=cur.fetchone()
        if not assisted or not assisted['account_authorized']: raise ApiError(409,'Save the complete authorized profile first')
        if assisted['user_id']: return {'user_id':assisted['user_id'],'created':False,'message':'Account already linked; no new invitation sent'}
        p=assisted['profile'];email=p['email'];created=False
        matches=cognito.list_users(UserPoolId=pool,Filter='email = "'+email+'"',Limit=2).get('Users',[])
        if len(matches)>1: raise ApiError(409,'Multiple identities found; administrator reconciliation required')
        if matches:
            identity=matches[0]
            groups=cognito.admin_list_groups_for_user(UserPoolId=pool,Username=identity['Username']).get('Groups',[])
            if any(g['GroupName'] in ('Admins','Marketing') for g in groups):
                raise ApiError(409,'Staff accounts cannot be converted through a student enquiry')
            if not identity.get('Enabled',True): raise ApiError(409,'This account is disabled; contact an administrator')
        else:
            try:
                identity=cognito.admin_create_user(UserPoolId=pool,Username=email,MessageAction='SUPPRESS',
                    UserAttributes=[{'Name':'email','Value':email},{'Name':'name','Value':p['name']}])['User']
                created=True
            except cognito.exceptions.UsernameExistsException:
                raise ApiError(409,'Account changed during creation; reload and retry')
        attrs={a['Name']:a['Value'] for a in identity['Attributes']};sub=attrs['sub'];username=identity['Username']
        cur.execute('SELECT id,cognito_id FROM users WHERE lower(email)=%s FOR UPDATE',(email,))
        user=cur.fetchone()
        if user and user['cognito_id']!=sub:
            raise ApiError(409,'Profile identity mismatch; administrator reconciliation required. No existing profile was overwritten.')
        uid=str(user['id']) if user else str(uuid.uuid4())
        if not user:
            cur.execute('INSERT INTO users(id,cognito_id,email,name,role) VALUES(%s,%s,%s,%s,\'attendee\')',(uid,sub,email,p['name']))
        # Existing self-service accounts retain their profile. Staff-collected details stay in the enquiry.
        if created:
            cur.execute('''UPDATE users SET name=%s,phone=%s,user_type=%s,university=%s,course=%s,year_of_study=%s,
                city=%s,state=%s,designation=%s,company=%s WHERE id=%s''',
                tuple(p[k] for k in ['name','phone','user_type','university','course','year_of_study','city','state','designation','company'])+(uid,))
        cognito.admin_add_user_to_group(UserPoolId=pool,Username=username,GroupName='Students')
        cur.execute('''UPDATE assisted_enrollments SET user_id=%s,cognito_username=%s,account_created_here=%s,updated_at=now()
            WHERE enquiry_id=%s''',(uid,username,created,eid))
        cur.execute('''INSERT INTO assisted_actions(enquiry_id,actor_id,action,request_id,state,details)
            VALUES(%s,%s,'account_linked',%s,'accepted',%s::jsonb)''',(eid,actor['id'],str(uuid.uuid4()),json.dumps({'created':created,'user_id':uid})))
    return {'user_id':uid,'created':created,'invitation_required':created,'message':'Account linked. Send the invitation next.' if created else 'Existing account linked; password unchanged.'}


def _begin_action(actor,eid,action,request_id,details):
    request_id=identifier(request_id)
    with get_db_cursor() as cur:
        _lead(cur,eid)
        cur.execute('''INSERT INTO assisted_actions(enquiry_id,actor_id,action,request_id,details)
            VALUES(%s,%s,%s,%s,%s::jsonb) ON CONFLICT DO NOTHING RETURNING id''',(eid,actor['id'],action,request_id,json.dumps(details)))
        new=cur.fetchone()
        if not new:
            cur.execute('SELECT id,state,details FROM assisted_actions WHERE enquiry_id=%s AND action=%s AND request_id=%s',(eid,action,request_id))
            old=cur.fetchone()
            if any(old['details'].get(k)!=v for k,v in details.items()):raise ApiError(409,'Request ID was used for different details')
            if old['state']=='accepted': return None
            raise ApiError(409,'This delivery request was already attempted. Check its status before explicitly sending again.')
        return str(new['id'])


def _finish_action(action_id,state,details):
    execute_query('UPDATE assisted_actions SET state=%s,details=details||%s::jsonb,updated_at=now() WHERE id=%s',(state,json.dumps(details),action_id),fetch='none')


def invite(actor,eid,body):
    staff(actor)
    if set(body)!={'request_id'}:raise ApiError(400,'Provide request_id')
    row=execute_query('SELECT * FROM assisted_enrollments WHERE enquiry_id=%s',(identifier(eid),),fetch='one')
    if not row or not row['user_id']:raise ApiError(409,'Create the student account first')
    if not row['account_created_here']:raise ApiError(409,'Existing accounts retain their password; the student can use Forgot password')
    identity=cognito.admin_get_user(UserPoolId=os.environ['COGNITO_USER_POOL_ID'],Username=row['cognito_username'])
    if identity['UserStatus']!='FORCE_CHANGE_PASSWORD':raise ApiError(409,'Account is already activated; no password reset or invitation sent')
    action_id=_begin_action(actor,eid,'invitation',body['request_id'],{})
    if action_id:
        try:
            cognito.admin_create_user(UserPoolId=os.environ['COGNITO_USER_POOL_ID'],Username=row['profile']['email'],MessageAction='RESEND',DesiredDeliveryMediums=['EMAIL'])
        except ClientError as exc:
            _finish_action(action_id,'failed',{'error_code':exc.response['Error']['Code']})
            raise ApiError(502,'Cognito could not send the invitation. Check delivery status before sending again.')
        _finish_action(action_id,'accepted',{'provider':'Cognito'})
    return {'state':'accepted','message':'Cognito accepted the invitation email. The student chooses a new password on first sign-in.'}


def quote(actor,eid,body):
    staff(actor)
    if set(body)!={'request_id','course_id','marked_price_paise','discount_percentage'}:raise ApiError(400,'Provide request ID, course, marked price and discount')
    request=identifier(body['request_id']);cid=identifier(body['course_id']);price=billing.amounts(body['marked_price_paise'],billing.discount_basis_points(body['discount_percentage']))
    digest=hashlib.sha256(json.dumps([eid,cid,price],sort_keys=True).encode()).hexdigest()
    with get_db_cursor() as cur:
        _lead(cur,eid)
        cur.execute('SELECT * FROM assisted_enrollments WHERE enquiry_id=%s FOR UPDATE',(eid,));a=cur.fetchone()
        if not a or not a['user_id']:raise ApiError(409,'Link a student account before quoting')
        cur.execute('SELECT * FROM demo_orders WHERE user_id=%s AND request_id=%s',(a['user_id'],request));old=cur.fetchone()
        if old:
            if old['quote_hash']!=digest:raise ApiError(409,'Request ID was already used for a different quote')
            return billing.order_response(old)
        cur.execute("SELECT id,title FROM courses WHERE id=%s AND archived=false AND status='published' FOR SHARE",(cid,));c=cur.fetchone()
        if not c:raise ApiError(404,'Published course not found')
        p=a['profile']
        cur.execute('''INSERT INTO demo_orders(id,request_id,user_id,course_id,course_title,buyer_name,buyer_email,
            marked_price_paise,discount_bps,discount_paise,total_paise,created_by,enquiry_id,quote_hash)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
            (str(uuid.uuid4()),request,a['user_id'],cid,c['title'],p['name'],p['email'],price['marked_price_paise'],price['discount_bps'],price['discount_paise'],price['total_paise'],actor['id'],eid,digest))
        result=billing.order_response(cur.fetchone())
        cur.execute('''INSERT INTO assisted_actions(enquiry_id,actor_id,action,request_id,state,details)
            VALUES(%s,%s,'quote_created',%s,'accepted',%s::jsonb)''',(eid,actor['id'],request,json.dumps({'order_id':str(result['id']),'total_paise':price['total_paise']})))
    return result


def quote_order(actor,eid,oid):
    staff(actor)
    row=execute_query('SELECT * FROM demo_orders WHERE id=%s AND enquiry_id=%s',(identifier(oid),identifier(eid)),fetch='one')
    if not row:raise ApiError(404,'Quote not found for this enquiry')
    return billing.order_response(row)


def quote_invoice(actor,eid,oid):
    row=quote_order(actor,eid,oid)
    # Ownership is checked by the enquiry-bound lookup above, then the standard PDF generator.
    return billing.invoice_pdf({'id':str(row['user_id']),'admin':False},str(row['id']))


def quote_email(row):
    money=lambda v:'INR '+format(v/100,',.2f')
    subject='AI4Impact | Your course quote and demo checkout link'
    plain=f"Hello {row['buyer_name']},\n\nYour quote for {row['course_title']} is {money(row['total_paise'])}.\nMarked price: {money(row['marked_price_paise'])}\nDiscount: {row['discount_bps']/100}%\n\nDemo checkout: {row['checkout_url']}\n\nThis is a demonstration. No money is collected and completing it does not grant course access. The attached PDF is pro forma, not a tax invoice.\n\nThe AI4Impact team"
    html=(Path(__file__).parent/'assets'/'quote-email.html').read_text()
    values={'name':row['buyer_name'],'course':row['course_title'],'marked':money(row['marked_price_paise']),'discount':str(row['discount_bps']/100)+'%','total':money(row['total_paise']),'url':row['checkout_url']}
    for key,value in values.items():html=html.replace('{{'+key+'}}',escape(str(value),quote=True))
    return subject,plain,html


def send_quote(actor,eid,oid,body):
    staff(actor)
    if set(body)!={'request_id'}:raise ApiError(400,'Provide request_id')
    row=quote_order(actor,eid,oid)
    if row['status']!='pending':raise ApiError(409,'Only pending quotes can be emailed')
    if row.get('expires_at') and row['expires_at']<=datetime.now(timezone.utc):raise ApiError(410,'Quote expired; prepare a new quote')
    if os.environ.get('TRANSACTIONAL_EMAIL_ENABLED')!='true':
        raise ApiError(503,'Automatic quote email awaits SES verification and production access. Download the PDF and use the prepared email draft meanwhile.')
    action_id=_begin_action(actor,eid,'quote_email',body['request_id'],{'order_id':oid})
    if action_id:
        subject,plain,html=quote_email(row);sender=os.environ['TRANSACTIONAL_FROM_EMAIL']
        message=EmailMessage();message['From']='AI4Impact <'+sender+'>';message['To']=row['buyer_email'];message['Subject']=subject
        message.set_content(plain);message.add_alternative(html,subtype='html')
        message.add_attachment(quote_invoice(actor,eid,oid),maintype='application',subtype='pdf',filename='AI4Impact-pro-forma.pdf')
        try:
            result=ses.send_email(FromEmailAddress=sender,ConfigurationSetName=os.environ['TRANSACTIONAL_CONFIGURATION_SET'],Destination={'ToAddresses':[row['buyer_email']]},Content={'Raw':{'Data':message.as_bytes()}})
        except ClientError as exc:
            _finish_action(action_id,'failed',{'error_code':exc.response['Error']['Code']})
            raise ApiError(502,'Email submission failed. Check its status before explicitly sending again.')
        _finish_action(action_id,'accepted',{'provider':'SES','message_id':result['MessageId']})
    return {'state':'accepted','message':'AWS accepted the quote email; acceptance does not guarantee inbox delivery.'}
