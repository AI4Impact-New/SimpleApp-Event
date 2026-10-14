"""Public guidance requests and admin-only marketing follow-up."""
import hashlib
import json
import re
from shared.db import execute_query, get_db_cursor
from learning.validation import ApiError, identifier, text
from learning.service import admin

STATUSES = {'new', 'contacted', 'registered', 'dropped'}
CONSENT_VERSION = 'guidance-contact-v1'


def submit(body):
    if set(body) - {'request_id','name','email','phone','interest','consent','website','source_page'}:
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
    interest = text(body.get('interest'), 'interest', 255)
    source = body.get('source_page', '/')
    if not isinstance(source, str) or len(source) > 255 or not source.startswith('/') or source.startswith('//'):
        raise ApiError(400, 'Invalid source page')
    digest = hashlib.sha256(json.dumps([name,email,phone,interest,source,CONSENT_VERSION],ensure_ascii=False).encode()).hexdigest()
    with get_db_cursor() as cur:
        cur.execute('''INSERT INTO website_enquiries(id,name,email,phone,interest,consent,consent_version,source_page,payload_hash)
            VALUES (%s,%s,%s,%s,%s,true,%s,%s,%s) ON CONFLICT(id) DO NOTHING RETURNING id''',
            (request_id,name,email,phone,interest,CONSENT_VERSION,source,digest))
        created = cur.fetchone()
        if not created:
            cur.execute('SELECT payload_hash FROM website_enquiries WHERE id=%s', (request_id,))
            existing = cur.fetchone()
            if not existing or existing['payload_hash'] != digest:
                raise ApiError(409, 'This request ID was already used for different details')
    # Public endpoint never discloses stored contact details or exposes a lead list.
    return {'id':request_id, 'message':'Request received'}


def listing(actor, params):
    admin(actor)
    status = params.get('status')
    if status and (not isinstance(status,str) or status not in STATUSES): raise ApiError(400, 'Invalid enquiry status')
    search = params.get('search', '')
    if not isinstance(search, str) or len(search) > 120: raise ApiError(400, 'Search is too long')
    query = '%' + search.strip() + '%'
    try: offset = int(params.get('offset', 0))
    except (ValueError,TypeError): raise ApiError(400, 'Invalid page offset')
    if not 0 <= offset <= 100000: raise ApiError(400, 'Invalid page offset')
    with get_db_cursor() as cur:
        where = '''WHERE (%s::text IS NULL OR status=%s) AND (name ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR interest ILIKE %s)'''
        values = (status or None,status or None,query,query,query,query)
        cur.execute('SELECT count(*) AS total FROM website_enquiries ' + where, values)
        total = cur.fetchone()['total']
        cur.execute('''SELECT id,name,email,phone,interest,consent,consent_version,consent_at,source_page,status,notes,created_at,updated_at
            FROM website_enquiries ''' + where + ' ORDER BY created_at DESC,id LIMIT 50 OFFSET %s', (*values,offset))
        rows = cur.fetchall()
    return {'enquiries':rows,'total':total,'offset':offset,'limit':50}


def update(actor, enquiry_id, body):
    admin(actor)
    if set(body) - {'status','notes'} or not body: raise ApiError(400, 'Provide status and/or notes')
    status = body.get('status')
    if status is not None and (not isinstance(status,str) or status not in STATUSES): raise ApiError(400, 'Invalid enquiry status')
    notes = body.get('notes')
    if notes is not None and (not isinstance(notes,str) or len(notes) > 2000): raise ApiError(400, 'Notes must be at most 2000 characters')
    row = execute_query('''UPDATE website_enquiries SET status=coalesce(%s,status),notes=coalesce(%s,notes),updated_by=%s,updated_at=now()
        WHERE id=%s RETURNING id,status,notes,updated_at''', (status,notes,actor['id'],identifier(enquiry_id)), fetch='one')
    if not row: raise ApiError(404, 'Enquiry not found')
    return row
