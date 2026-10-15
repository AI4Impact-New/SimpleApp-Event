"""Demo-only pricing, authenticated payment links and immutable purchase snapshots.

No endpoint accepts payment credentials, settles money, or grants enrolment.
"""
import io
import os
import uuid
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import datetime, timezone
from pathlib import Path

from shared.db import execute_query, get_db_cursor
from learning.service import admin
from learning.validation import ApiError, identifier, integer


def discount_basis_points(value):
    if isinstance(value,bool) or not isinstance(value,(int,float,str,Decimal)):
        raise ApiError(400,'discount_percentage must be between 0 and 100 with at most two decimals')
    try:
        amount=Decimal(str(value))
        if not amount.is_finite() or not 0 <= amount <= 100 or amount*100 != (amount*100).to_integral_value():
            raise ValueError()
        return int(amount*100)
    except (InvalidOperation,ValueError):
        raise ApiError(400,'discount_percentage must be between 0 and 100 with at most two decimals')


def amounts(marked, bps):
    marked=integer(marked,0,1000000000,'marked_price_paise')
    bps=integer(bps,0,10000,'discount_bps')
    discount=int((Decimal(marked)*bps/10000).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
    return {'marked_price_paise':marked,'discount_bps':bps,'discount_percentage':bps/100,
            'discount_paise':discount,'total_paise':marked-discount,'currency':'INR'}


def catalog(actor):
    rows=execute_query('SELECT id,title,slug,marked_price_paise,discount_bps FROM courses WHERE archived=false AND status=\'published\' ORDER BY display_order,id',fetch='all') or []
    return [{**r,**amounts(int(r['marked_price_paise']),r['discount_bps'])} for r in rows]


def set_price(actor,cid,body):
    admin(actor);cid=identifier(cid)
    if set(body)-{'marked_price_paise','discount_percentage'}: raise ApiError(400,'Unknown pricing field')
    marked=integer(body.get('marked_price_paise'),0,1000000000,'marked_price_paise')
    bps=discount_basis_points(body.get('discount_percentage',0))
    row=execute_query('UPDATE courses SET marked_price_paise=%s,discount_bps=%s,updated_at=now() WHERE id=%s AND archived=false RETURNING id,title',
                      (marked,bps,cid),fetch='one')
    if not row: raise ApiError(404,'Active course not found')
    return {**row,**amounts(marked,bps)}


def order_response(row):
    return {**row,'demo':True,'checkout_url':os.environ.get('CHECKOUT_PAGE_URL','https://main.d16744ddqs159z.amplifyapp.com/checkout')+'?order='+str(row['id']),
            'invoice_url':'/billing/orders/'+str(row['id'])+'/invoice','payment_provider':'Paintly (demo)',
            'notice':'Demo only. No money is collected and no course access is granted.'}


def create_order(actor,body,as_admin=False):
    if as_admin: admin(actor)
    if set(body)-({'course_id','request_id','buyer_email'} if as_admin else {'course_id','request_id'}): raise ApiError(400,'Unknown order field')
    cid=identifier(body.get('course_id'));request=identifier(body.get('request_id'))
    with get_db_cursor() as cur:
        if as_admin:
            email=body.get('buyer_email')
            if not isinstance(email,str) or not email.strip() or len(email)>254: raise ApiError(400,'buyer_email is required')
            cur.execute('SELECT id,name,email FROM users WHERE lower(email)=%s',(email.strip().lower(),))
        else: cur.execute('SELECT id,name,email FROM users WHERE id=%s',(actor['id'],))
        buyer=cur.fetchone()
        if not buyer: raise ApiError(404,'Student account not found; ask the student to sign up first')
        uid=str(buyer['id'])
        cur.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',('order:'+uid+request,))
        cur.execute('SELECT * FROM demo_orders WHERE user_id=%s AND request_id=%s',(uid,request))
        existing=cur.fetchone()
        if existing:
            if str(existing['course_id'])!=cid: raise ApiError(409,'Request ID was already used for another course')
            return order_response(existing)
        cur.execute("SELECT * FROM courses WHERE id=%s AND archived=false AND status='published' FOR SHARE",(cid,))
        course=cur.fetchone()
        if not course: raise ApiError(404,'Published course not found')
        price=amounts(int(course['marked_price_paise']),course['discount_bps'])
        cur.execute('''INSERT INTO demo_orders(id,request_id,user_id,course_id,course_title,buyer_name,buyer_email,
            marked_price_paise,discount_bps,discount_paise,total_paise,created_by)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
            (str(uuid.uuid4()),request,uid,cid,course['title'],buyer['name'] or 'Learner',buyer['email'],
             price['marked_price_paise'],price['discount_bps'],price['discount_paise'],price['total_paise'],actor['id']))
        return order_response(cur.fetchone())


def listing(actor,as_admin=False):
    if as_admin: admin(actor)
    rows=execute_query('SELECT * FROM demo_orders '+('' if as_admin else 'WHERE user_id=%s ')+ 'ORDER BY created_at DESC LIMIT 200',
                       () if as_admin else (actor['id'],),fetch='all') or []
    return [order_response(r) for r in rows]


def get_order(actor,oid):
    row=execute_query('SELECT * FROM demo_orders WHERE id=%s',(identifier(oid),),fetch='one')
    if not row or (not actor['admin'] and str(row['user_id'])!=actor['id']): raise ApiError(404,'Order not found')
    return order_response(row)


def finish(actor,oid,body):
    if set(body)!={'action'} or body['action'] not in ('complete_demo','cancel'): raise ApiError(400,'action must be complete_demo or cancel')
    with get_db_cursor() as cur:
        cur.execute('SELECT *,now() AS server_now FROM demo_orders WHERE id=%s FOR UPDATE',(identifier(oid),))
        row=cur.fetchone()
        if not row or str(row['user_id'])!=actor['id']: raise ApiError(404,'Order not found')
        target='demo_completed' if body['action']=='complete_demo' else 'cancelled'
        if row['status']==target: return order_response(row)
        if row['status']!='pending': raise ApiError(409,'Order is already finalised')
        if row['expires_at']<=row['server_now']: raise ApiError(410,'This demo payment link expired; create a new order')
        cur.execute("UPDATE demo_orders SET status=%s,completed_at=CASE WHEN %s='demo_completed' THEN now() ELSE NULL END WHERE id=%s RETURNING *",(target,target,row['id']))
        return order_response(cur.fetchone())


def invoice_pdf(actor,oid):
    row=get_order(actor,oid)
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.utils import simpleSplit
    out=io.BytesIO();pdf=canvas.Canvas(out,pagesize=A4);w,h=A4
    pdf.setTitle('AI4Impact Demo Invoice '+str(row['id']));pdf.setAuthor('AI4Impact')
    pdf.drawImage(str(Path(__file__).parent/'assets'/'logo.png'),40,h-90,48,48,mask='auto')
    pdf.setFillColor(colors.HexColor('#081328'));pdf.setFont('Helvetica-Bold',24);pdf.drawString(100,h-72,'AI4Impact')
    pdf.setFont('Helvetica-Bold',20);pdf.drawString(40,h-130,'DEMO / PRO FORMA INVOICE')
    pdf.setFont('Helvetica',10)
    lines=['Reference: '+str(row['id']),'Date: '+row['created_at'].strftime('%d %B %Y'),
           'Bill to: '+row['buyer_name'],'Email: '+row['buyer_email'],'Status: '+row['status']]
    y=h-160
    for line in lines:
        for wrapped in simpleSplit(line,'Helvetica',10,w-80):pdf.drawString(40,y,wrapped);y-=16
    y-=25;pdf.setFont('Helvetica-Bold',12)
    for line in simpleSplit(row['course_title'],'Helvetica-Bold',12,w-80):pdf.drawString(40,y,line);y-=18
    def money(paise):return 'INR '+format(Decimal(paise)/100,',.2f')
    y-=25;pdf.setFont('Helvetica',12)
    for label,value in [('Marked price',money(row['marked_price_paise'])),('Discount ('+str(Decimal(row['discount_bps'])/100)+'%)','- '+money(row['discount_paise'])),('Total',money(row['total_paise']))]:
        pdf.drawString(40,y,label);pdf.drawRightString(w-40,y,value);y-=28
    pdf.setStrokeColor(colors.HexColor('#cbd5e1'));pdf.line(40,y,w-40,y)
    pdf.setFont('Helvetica-Bold',11);pdf.setFillColor(colors.HexColor('#9a3412'))
    y-=35
    for line in ['DEMO ONLY - NO MONEY COLLECTED','Not a tax invoice or proof of payment.','Checkout provider integration and tax details are pending.','Demo completion does not grant course access.']:
        pdf.drawString(40,y,line);y-=18
    pdf.showPage();pdf.save();return out.getvalue()
