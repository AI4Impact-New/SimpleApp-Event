"""Public guidance requests and admin-only marketing follow-up."""
import hashlib
import json
import re
from shared.db import execute_query, get_db_cursor
from learning.validation import ApiError, identifier, text
def staff(actor):
    if not (actor.get('admin') or actor.get('marketing')):raise ApiError(403,'Marketing or admin access is required')

STATUSES = {'new', 'contacted', 'registered', 'dropped'}
CONSENT_VERSION = 'guidance-contact-v1'


def submit(body, employer=False):
    extra={'organisation','roles'} if employer else set()
    if set(body) - ({'request_id','name','email','phone','interest','consent','website','source_page'} | extra):
        raise ApiError(400, 'Unknown enquiry field')
    if len(json.dumps(body).encode()) > 6000:
        raise ApiError(413, 'Enquiry is too large')
    request_id = identifier(body.get('request_id'))
    # Hidden anti-bot field. Never retain contact details from a filled honeypot.
    if body.get('website'):
        return {'id':request_id, 'message':'Request received'}
    if body.get('consent') is not True:
        raise ApiError(400, 'Contact consent is required')
    name = text(body.get('name'), 'name', 120)
    if len(name) < 2: raise ApiError(400, 'Enter your full name')
    email = text(body.get('email'), 'email', 254).lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise ApiError(400, 'Enter a valid email address')
    phone = re.sub(r'[\s()\-]', '', text(body.get('phone'), 'phone', 30))
    if not re.fullmatch(r'\+?\d{10,15}', phone): raise ApiError(400, 'Enter a phone number with 10 to 15 digits')
    organisation=text(body.get('organisation'),'organisation',255) if employer else None
    roles=text(body.get('roles'),'roles',2000) if employer else None
    interest = 'Hiring candidates' if employer else text(body.get('interest'), 'interest', 255)
    kind='employer' if employer else 'guidance'
    consent_version='employer-contact-v1' if employer else CONSENT_VERSION
    source = body.get('source_page', '/')
    if not isinstance(source, str) or len(source) > 255 or not source.startswith('/') or source.startswith('//'):
        raise ApiError(400, 'Invalid source page')
    digest_values=[name,email,phone,interest,source,consent_version]
    if employer:digest_values += [organisation,roles]
    digest = hashlib.sha256(json.dumps(digest_values,ensure_ascii=False).encode()).hexdigest()
    with get_db_cursor() as cur:
        cur.execute('''INSERT INTO website_enquiries(id,name,email,phone,interest,consent,consent_version,source_page,kind,organisation,hiring_roles,payload_hash)
            VALUES (%s,%s,%s,%s,%s,true,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING RETURNING id''',
            (request_id,name,email,phone,interest,consent_version,source,kind,organisation,roles,digest))
        created = cur.fetchone()
        if not created:
            cur.execute('SELECT payload_hash FROM website_enquiries WHERE id=%s', (request_id,))
            existing = cur.fetchone()
            if not existing or existing['payload_hash'] != digest:
                raise ApiError(409, 'This request ID was already used for different details')
    # Public endpoint never discloses stored contact details or exposes a lead list.
    return {'id':request_id, 'message':'Request received'}


def listing(actor, params):
    staff(actor)
    kind=params.get('kind')
    if kind and kind not in ('guidance','employer'):raise ApiError(400,'Invalid enquiry kind')
    status = params.get('status')
    if status and (not isinstance(status,str) or status not in STATUSES): raise ApiError(400, 'Invalid enquiry status')
    search = params.get('search', '')
    if not isinstance(search, str) or len(search) > 120: raise ApiError(400, 'Search is too long')
    query = '%' + search.strip() + '%'
    try: offset = int(params.get('offset', 0))
    except (ValueError,TypeError): raise ApiError(400, 'Invalid page offset')
    if not 0 <= offset <= 100000: raise ApiError(400, 'Invalid page offset')
    with get_db_cursor() as cur:
        where = '''WHERE (%s::text IS NULL OR status=%s) AND (name ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR interest ILIKE %s OR organisation ILIKE %s OR hiring_roles ILIKE %s) AND (%s::text IS NULL OR kind=%s)'''
        values = (status or None,status or None,query,query,query,query,query,query,kind or None,kind or None)
        cur.execute('SELECT count(*) AS total FROM website_enquiries ' + where, values)
        total = cur.fetchone()['total']
        cur.execute('''SELECT id,name,email,phone,interest,consent,consent_version,consent_at,source_page,status,notes,created_at,updated_at,kind,organisation,hiring_roles
            FROM website_enquiries ''' + where + ' ORDER BY created_at DESC,id LIMIT 50 OFFSET %s', (*values,offset))
        rows = cur.fetchall()
    return {'enquiries':rows,'total':total,'offset':offset,'limit':50}


def update(actor, enquiry_id, body):
    staff(actor)
    if set(body) - {'status','notes'} or not body: raise ApiError(400, 'Provide status and/or notes')
    status = body.get('status')
    if status is not None and (not isinstance(status,str) or status not in STATUSES): raise ApiError(400, 'Invalid enquiry status')
    notes = body.get('notes')
    if notes is not None and (not isinstance(notes,str) or len(notes) > 2000): raise ApiError(400, 'Notes must be at most 2000 characters')
    with get_db_cursor() as cur:
        cur.execute('SELECT status FROM website_enquiries WHERE id=%s FOR UPDATE',(identifier(enquiry_id),))
        old=cur.fetchone()
        if not old:raise ApiError(404,'Enquiry not found')
        cur.execute('''UPDATE website_enquiries SET status=coalesce(%s,status),notes=coalesce(%s,notes),updated_by=%s,updated_at=now()
            WHERE id=%s RETURNING id,status,notes,updated_at''', (status,notes,actor['id'],identifier(enquiry_id)))
        row=cur.fetchone()
        cur.execute('INSERT INTO enquiry_audit(enquiry_id,actor_id,old_status,new_status) VALUES(%s,%s,%s,%s)',(enquiry_id,actor['id'],old['status'],row['status']))
    return row


def student_interests(actor):
    staff(actor)
    return {'enquiries':execute_query('''SELECT r.id,r.course_id,r.user_id,r.status,r.notes,r.created_at,
        c.title AS course_title,u.name,u.email,u.phone,u.user_type
        FROM course_registrations r JOIN courses c ON c.id=r.course_id JOIN users u ON u.id=r.user_id
        WHERE r.status='interested' AND c.archived=false ORDER BY r.created_at DESC LIMIT 200''',fetch='all') or []}
