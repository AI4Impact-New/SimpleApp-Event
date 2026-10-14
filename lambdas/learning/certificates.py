"""Idempotent, eligibility-gated certificates and public verification."""
import json
import uuid

from shared.db import execute_query, get_db_cursor
from learning.service import admin, completion
from learning.validation import ApiError, identifier, text


def public_verify(certificate_id):
    row = execute_query("""SELECT c.id,c.issued_at,c.revoked_at,c.provider,c.certificate_type,coalesce(c.metadata->>'recipient_name',u.name) AS name,
        coalesce(c.metadata->>'course_title',co.title) AS course_title
        FROM certificates_issued c JOIN users u ON u.id=c.user_id LEFT JOIN courses co ON co.id=c.course_id
        WHERE c.id=%s""",(identifier(certificate_id),),fetch="one")
    if not row: raise ApiError(404,"Certificate not found")
    if row["revoked_at"]:
        return {"id":str(row["id"]),"valid":False,"reason":"revoked"}
    return {"id":str(row["id"]),"valid":True,"recipient_name":row["name"] or "Learner",
            "course_title":row["course_title"],"provider":row["provider"],"issued_at":row["issued_at"],"certificate_type":row["certificate_type"]}


def issue(actor, course_id):
    status = completion(actor,course_id)
    if not status["eligible"]:
        raise ApiError(409,"Completion requirements have not been met: " + ", ".join(status["missing_requirements"]))
    from learning.media import certificate_pdf, store_certificate
    with get_db_cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",(actor["id"]+course_id+"certificate",))
        cur.execute("SELECT * FROM certificates_issued WHERE user_id=%s AND course_id=%s AND certificate_type='completion'",(actor["id"],course_id))
        existing = cur.fetchone()
        if existing:
            if existing["revoked_at"]: raise ApiError(409,"This certificate was revoked; contact an administrator")
            return {"id":str(existing["id"]),"issued_at":existing["issued_at"],"download_path":f"/certificates/{existing['id']}/download"}
        cur.execute("SELECT c.title,cc.provider FROM courses c LEFT JOIN course_certificate cc ON cc.course_id=c.id WHERE c.id=%s FOR SHARE OF c",(course_id,))
        course = cur.fetchone()
        if not course: raise ApiError(404,"Course no longer exists")
        cur.execute("SELECT now() AS issued_at")
        issued_at = cur.fetchone()["issued_at"]
        cid = str(uuid.uuid4())
        key = f"certificates/{course_id}/{actor['id']}/{cid}.pdf"
        provider = course["provider"] or "AI4Impact"
        name = actor["name"] or "Learner"
        pdf = certificate_pdf(name,course["title"],provider,cid,issued_at)
        store_certificate(key,pdf)
        metadata = {"course_title":course["title"],"recipient_name":name,"completion":status}
        cur.execute("INSERT INTO certificates_issued(id,user_id,course_id,certificate_type,provider,certificate_url,issued_at,metadata) VALUES (%s,%s,%s,'completion',%s,%s,%s,%s::jsonb)",
                    (cid,actor["id"],course_id,provider,key,issued_at,json.dumps(metadata)))
        cur.execute("UPDATE course_registrations SET status='completed',updated_at=now() WHERE user_id=%s AND course_id=%s",(actor["id"],course_id))
        cur.execute("INSERT INTO learner_notifications(user_id,course_id,title,body) VALUES (%s,%s,'Your certificate is ready',%s)",(actor["id"],course_id,"You completed "+course["title"]+". Download your certificate from your profile."))
    return {"id":cid,"issued_at":issued_at,"download_path":f"/certificates/{cid}/download"}


def listing(actor, for_admin=False):
    if for_admin: admin(actor)
    return execute_query("""SELECT c.id,c.user_id,c.course_id,c.certificate_type,c.provider,c.issued_at,c.revoked_at,
        coalesce(c.metadata->>'course_title',co.title) AS course_title,u.name AS recipient_name
        FROM certificates_issued c JOIN users u ON u.id=c.user_id LEFT JOIN courses co ON co.id=c.course_id
        WHERE (%s OR c.user_id=%s) ORDER BY c.issued_at DESC LIMIT 500""",(for_admin,actor["id"]),fetch="all") or []


def download(actor, certificate_id):
    row = execute_query("SELECT * FROM certificates_issued WHERE id=%s",(identifier(certificate_id),),fetch="one")
    if not row or (not actor["admin"] and str(row["user_id"]) != actor["id"]): raise ApiError(404,"Certificate not found")
    if row["revoked_at"]: raise ApiError(410,"Certificate revoked")
    if not row["certificate_url"] or not row["certificate_url"].startswith("certificates/"):
        raise ApiError(409,"Certificate PDF is not available")
    from learning.media import certificate_download
    return {"url":certificate_download(row["certificate_url"]),"expires_in":300}


def revoke(actor, certificate_id, body):
    admin(actor)
    reason = text(body.get("reason"),"reason",1000)
    row = execute_query("""UPDATE certificates_issued SET revoked_at=coalesce(revoked_at,now()),
        metadata=coalesce(metadata,'{}'::jsonb) || %s::jsonb WHERE id=%s RETURNING id,revoked_at""",
        (json.dumps({"revocation_reason":reason,"revoked_by":actor["id"]}),identifier(certificate_id)),fetch="one")
    if not row: raise ApiError(404,"Certificate not found")
    return row
