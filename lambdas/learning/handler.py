"""HTTP API routes for admin and learner learning workflows."""
import base64
import json
import logging
import os
from urllib.parse import quote
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from shared.auth import get_current_user, _normalize_groups
from shared.user_repository import get_or_create_user_from_claims
from shared.db import execute_query
from learning import service, exams, certificates, devices, enquiries, billing, access_windows, staff, operations
from learning.validation import ApiError, identifier

logger = logging.getLogger(__name__)


def _json(value):
    if isinstance(value,(datetime,date)): return value.isoformat()
    if isinstance(value,Decimal): return float(value)
    if isinstance(value,UUID): return str(value)
    raise TypeError(type(value).__name__)


def _response(status, value):
    return {"statusCode":status,"headers":{"Content-Type":"application/json","Cache-Control":"no-store",
            "Access-Control-Allow-Origin":"*"},"body":json.dumps(value,default=_json)}


def _body(event):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        try: raw = base64.b64decode(raw,validate=True).decode()
        except (ValueError,UnicodeError): raise ApiError(400,"Invalid body encoding")
    if isinstance(raw,str):
        if len(raw.encode()) > 200000: raise ApiError(413,"Request body is too large")
        try: raw = json.loads(raw)
        except ValueError: raise ApiError(400,"Invalid JSON")
    if not isinstance(raw,dict): raise ApiError(400,"JSON body must be an object")
    return raw


def _actor(event):
    claims = get_current_user(event)
    if not claims: raise ApiError(401,"Authentication required")
    user = get_or_create_user_from_claims(claims)
    if not user: raise ApiError(401,"User identity could not be resolved")
    groups = {str(g).lower() for g in _normalize_groups(claims.get("cognito:groups"))}
    return {"id":str(user.id),"name":user.name,"admin":"admins" in groups,"marketing":"marketing" in groups}


def handler(event, context):
    try:
        path = (event.get("rawPath") or event.get("path") or "/").rstrip("/")
        method = event.get("httpMethod") or (event.get("requestContext") or {}).get("http",{}).get("method","GET")
        if method == "OPTIONS": return {"statusCode":204,"body":""}
        parts = path.strip("/").split("/")
        if len(parts)==3 and parts[0]=="certificates" and parts[2]=="verify" and method=="GET":
            result = certificates.public_verify(parts[1])
            headers = event.get("headers") or {}
            accept = (headers.get("accept") or headers.get("Accept") or "").lower()
            page = os.environ.get("CERTIFICATE_VERIFY_PAGE_URL")
            if page and "text/html" in accept and "application/json" not in accept:
                return {"statusCode":302,"headers":{"Location":page.rstrip("/") + "/?id=" + quote(result["id"],safe=""),
                        "Cache-Control":"no-store","Access-Control-Allow-Origin":"*"},"body":""}
            return _response(200,result)
        if path == "/enquiries" and method == "POST":
            return _response(202,enquiries.submit(_body(event)))
        if path == "/billing/catalog" and method == "GET":
            return _response(200,billing.catalog(None))
        if path == "/employer-enquiries" and method == "POST":
            return _response(202,enquiries.submit(_body(event),True))
        actor = _actor(event)
        marketing_route=(path=="/admin/enquiries" or (len(parts)==3 and parts[:2]==['admin','enquiries']) or path=="/admin/marketing/interests")
        if parts[0]=="admin":
            enquiries.staff(actor) if marketing_route else service.admin(actor)
        body = _body(event) if method in ("POST","PUT","PATCH") else {}
        result, status = None, 200
        if path=="/admin/operations/readiness" and method=="GET":result=operations.readiness(actor)
        elif path=="/admin/marketing/users" and method=='GET':result=staff.members(actor,event.get('queryStringParameters') or {})
        elif path=="/admin/marketing/users" and method=='PUT':result=staff.membership(actor,body)
        elif path=="/admin/marketing/interests" and method=="GET": result=enquiries.student_interests(actor)
        elif path=="/billing/catalog" and method=="GET": result=billing.catalog(actor)
        elif path=="/admin/billing/courses" and method=="GET": result=billing.catalog(actor)
        elif len(parts)==4 and parts[:3]==['admin','billing','courses'] and method=='PUT': result=billing.set_price(actor,parts[3],body)
        elif path=="/admin/billing/orders" and method=="GET": result=billing.listing(actor,True)
        elif path=="/admin/billing/orders" and method=="POST": result=billing.create_order(actor,body,True); status=201
        elif path=="/me/purchases" and method=="GET": result=billing.listing(actor)
        elif path=="/billing/orders" and method=="POST": result=billing.create_order(actor,body); status=201
        elif len(parts)>=3 and parts[:2]==['billing','orders']:
            if len(parts)==3 and method=='GET':result=billing.get_order(actor,parts[2])
            elif len(parts)==4 and parts[3]=='demo-checkout' and method=='POST':result=billing.finish(actor,parts[2],body)
            elif len(parts)==4 and parts[3]=='invoice' and method=='GET':
                contents=billing.invoice_pdf(actor,parts[2])
                return {'statusCode':200,'isBase64Encoded':True,'headers':{'Content-Type':'application/pdf','Cache-Control':'no-store','Content-Disposition':'attachment; filename="AI4Impact-demo-invoice.pdf"'},'body':base64.b64encode(contents).decode()}
        elif len(parts)==4 and parts[:2]==['admin','classes'] and parts[3]=='access-reset' and method=='POST': result=access_windows.reset(actor,parts[2],body)
        elif path=="/admin/enquiries" and method=="GET": result=enquiries.listing(actor,event.get("queryStringParameters") or {})
        elif len(parts)==3 and parts[:2]==["admin","enquiries"] and method=="PATCH": result=enquiries.update(actor,parts[2],body)
        elif path=="/admin/learning/overview" and method=="GET": result=service.overview(actor)
        elif path=="/me/learning" and method=="GET":
            result=execute_query("""SELECT c.id,c.title,c.status,r.status AS registration_status,
                (SELECT count(*) FROM lecture_progress p JOIN video_assets a ON a.id=p.asset_id WHERE a.course_id=c.id AND p.user_id=r.user_id AND p.completed=true) AS completed_lectures,
                (SELECT count(*) FROM course_classes cc WHERE cc.course_id=c.id AND cc.class_type='recorded') AS total_recorded_lectures
                FROM courses c JOIN course_registrations r ON r.course_id=c.id WHERE c.archived=false AND r.user_id=%s AND r.status IN ('registered','completed') ORDER BY r.created_at DESC""",(actor["id"],),fetch="all") or []
        elif path=="/me/devices" and method=="GET": result=devices.listing(actor)
        elif path=="/me/devices" and method=="POST": result=devices.register(actor,body); status=201
        elif len(parts)==3 and parts[:2]==["me","devices"] and method=="DELETE": result=devices.delete(actor,parts[2])
        elif path=="/me/certificates" and method=="GET": result=certificates.listing(actor)
        elif path=="/me/notifications" and method=="GET": result=service.notifications(actor)
        elif len(parts)==3 and parts[:2]==["me","notifications"] and method=="PATCH": result=service.notifications(actor,parts[2])
        elif path=="/admin/certificates" and method=="GET": result=certificates.listing(actor,True)
        elif len(parts)==4 and parts[:2]==["admin","certificates"] and parts[3]=="revoke" and method=="POST": result=certificates.revoke(actor,parts[2],body)
        elif len(parts)==3 and parts[0]=="certificates" and parts[2]=="download" and method=="GET": result=certificates.download(actor,parts[1])
        elif len(parts)>=3 and parts[:2]==["admin","courses"]:
            cid=identifier(parts[2]); suffix=parts[3] if len(parts)>3 else ""
            if suffix=="classes" and len(parts)==4:
                if method=="GET": result=service.classes(actor,cid)
                elif method=="POST": result=service.save_class(actor,cid,body); status=201
            elif suffix=="classes" and len(parts)==5:
                if method=="PUT": result=service.save_class(actor,cid,body,identifier(parts[4]))
                elif method=="DELETE": result=service.delete_class(actor,cid,identifier(parts[4]))
            elif len(parts)==4 and suffix=="learners" and method=="GET": result=service.learners(actor,cid)
            elif len(parts)==4 and suffix=="completion-rules":
                if method=="GET": service.course(cid); result=service.rules(cid)
                elif method=="PUT": result=service.save_rules(actor,cid,body)
            elif len(parts)==4 and suffix=="exams":
                if method=="GET": result=exams.list_exams(actor,cid,True)
                elif method=="POST": result=exams.save_exam(actor,cid,body); status=201
            elif len(parts)==4 and suffix=="notifications" and method=="POST": result=service.notify_course(actor,cid,body); status=201
        elif len(parts)==4 and parts[:2]==["admin","classes"]:
            cid=identifier(parts[2])
            if parts[3]=="video-upload" and method=="POST": result=service.video_upload(actor,cid,body); status=201
            elif parts[3]=="video-confirm" and method=="POST": result=service.video_confirm(actor,cid,body)
            elif parts[3]=="attendance" and method=="GET": result=service.attendance(actor,cid)
        elif len(parts)==5 and parts[:2]==["admin","classes"] and parts[3:]==["attendance","import"] and method=="POST": result=service.import_attendance(actor,identifier(parts[2]),body)
        elif len(parts)==3 and parts[:2]==["admin","exams"]:
            eid=identifier(parts[2])
            if method=="GET": result=exams.get_exam(actor,eid)
            elif method=="PUT": result=exams.save_exam(actor,str(exams.exam_row(eid)["course_id"]),body,eid)
            elif method=="DELETE": result=exams.delete_exam(actor,eid)
        elif len(parts)>=3 and parts[:2]==["learning","courses"]:
            cid=identifier(parts[2]); suffix=parts[3] if len(parts)>3 else ""
            if len(parts)==3 and method=="GET": result={"course":service.access(actor,cid),"classes":service.classes(actor,cid),"completion":service.completion(actor,cid)}
            elif len(parts)==4 and suffix=="progress" and method=="GET": result={"classes":service.classes(actor,cid),"completion":service.completion(actor,cid)}
            elif len(parts)==4 and suffix=="exams" and method=="GET": result=exams.list_exams(actor,cid)
            elif len(parts)==4 and suffix=="completion" and method=="GET": result=service.completion(actor,cid)
            elif len(parts)==4 and suffix=="certificate" and method=="POST": result=certificates.issue(actor,cid); status=201
        elif len(parts)==4 and parts[:2]==["learning","classes"]:
            cid=identifier(parts[2])
            if parts[3]=="playback" and method=="GET": result=service.playback(actor,cid)
            elif parts[3]=="progress" and method=="POST": result=service.progress_heartbeat(actor,cid,body)
        elif len(parts)==4 and parts[:2]==["learning","exams"] and parts[3]=="attempts" and method=="POST": result=exams.start_attempt(actor,identifier(parts[2])); status=201
        elif len(parts)>=3 and parts[:2]==["learning","attempts"]:
            aid=identifier(parts[2])
            if len(parts)==3 and method=="GET": result=exams.get_attempt(actor,aid)
            elif len(parts)==4 and parts[3]=="submit" and method=="POST": result=exams.submit_attempt(actor,aid,body)
        if result is None: raise ApiError(404,"Endpoint not found")
        return _response(status,result)
    except ApiError as error:
        return _response(error.status,{"error":str(error)})
    except Exception:
        logger.exception("Learning API request failed")
        return _response(500,{"error":"Internal server error"})
