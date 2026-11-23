"""One paginated marketing pipeline backed by the existing enquiry records."""
import uuid
from learning.enquiries import staff
from learning.validation import ApiError, identifier
from shared.db import get_db_cursor

SUMMARY = """
WITH pipeline AS (
 SELECT e.*,a.user_id,
   CASE WHEN a.enquiry_id IS NULL THEN 0 WHEN a.user_id IS NULL OR (a.account_created_here AND NOT EXISTS (
          SELECT 1 FROM assisted_actions invite WHERE invite.enquiry_id=e.id
            AND invite.action='invitation' AND invite.state='accepted')) THEN 1
        WHEN q.id IS NULL THEN 2 WHEN f.id IS NULL THEN 3 ELSE -1 END AS current,
   q.course_title,q.total_paise AS quote_total_paise,b.code AS batch_code,
   (a.enquiry_id IS NOT NULL) AS details_saved,
   (a.user_id IS NOT NULL AND (NOT a.account_created_here OR EXISTS (
       SELECT 1 FROM assisted_actions invite WHERE invite.enquiry_id=e.id
         AND invite.action='invitation' AND invite.state='accepted'))) AS account_ready,
   (q.id IS NOT NULL) AS has_quote,(f.id IS NOT NULL) AS has_plan
 FROM website_enquiries e
 LEFT JOIN assisted_enrollments a ON a.enquiry_id=e.id
 LEFT JOIN LATERAL (
   SELECT id,course_id,course_title,total_paise FROM demo_orders
   WHERE enquiry_id=e.id ORDER BY created_at DESC,id LIMIT 1
 ) q ON true
 LEFT JOIN LATERAL (
   SELECT f.id,f.batch_id FROM fee_accounts f
   WHERE f.user_id=a.user_id AND f.course_id=q.course_id AND f.closed_at IS NULL
     AND f.source_order_id IS NULL
   ORDER BY f.created_at DESC,f.id LIMIT 1
 ) f ON true
 LEFT JOIN fee_batches b ON b.id=f.batch_id
 WHERE e.kind='guidance'
)
"""


def listing(actor, query):
    staff(actor)
    stage = query.get("stage", "progress")
    if stage not in ("progress", "plan", "complete", "all"):
        raise ApiError(400, "Invalid onboarding stage")
    search = query.get("search", "")
    if not isinstance(search, str) or len(search) > 120:
        raise ApiError(400, "Search must be at most 120 characters")
    try:
        offset = int(query.get("offset", 0))
    except (ValueError, TypeError):
        raise ApiError(400, "Invalid page offset")
    if not 0 <= offset <= 100000:
        raise ApiError(400, "Invalid page offset")
    status = query.get("status", "")
    if status not in ("", "new", "contacted", "registered", "dropped"):
        raise ApiError(400, "Invalid follow-up status")
    needle = search.strip()
    where = """ FROM pipeline WHERE strpos(lower(concat_ws(' ',name,email,phone,interest,course_title,batch_code)),lower(%s))>0
        AND (%s='' OR status=%s)"""
    values = (needle, status, status)
    selection = {
        "progress": " AND current<>-1 AND status<>'dropped'",
        "plan": " AND current=3 AND status<>'dropped'",
        "complete": " AND current=-1",
        "all": "",
    }[stage]
    with get_db_cursor() as cur:
        cur.execute(SUMMARY + """SELECT count(*) AS all,
            count(*) FILTER(WHERE current<>-1 AND status<>'dropped') AS progress,
            count(*) FILTER(WHERE current=3 AND status<>'dropped') AS plan,
            count(*) FILTER(WHERE current=-1) AS complete""" + where, values)
        counts = dict(cur.fetchone())
        cur.execute(SUMMARY + """SELECT id,name,email,phone,interest,status,notes,created_at,source_page,
            consent_at,consent_version,user_id,current,details_saved,account_ready,has_quote,has_plan,
            course_title,quote_total_paise,batch_code""" + where + selection +
            " ORDER BY created_at DESC,id LIMIT 50 OFFSET %s", (*values, offset))
        rows = cur.fetchall()
    return {"enquiries": rows, "counts": counts, "total": counts[stage], "offset": offset, "limit": 50}


def import_interest(actor, registration_id):
    staff(actor)
    with get_db_cursor() as cur:
        cur.execute("""SELECT r.id,c.title,u.name,u.email,u.phone FROM course_registrations r
            JOIN courses c ON c.id=r.course_id JOIN users u ON u.id=r.user_id
            WHERE r.id=%s AND r.status='interested' AND NOT c.archived FOR SHARE OF r""",
            (identifier(registration_id),))
        row = cur.fetchone()
        if not row:
            raise ApiError(404, "Active course interest not found")
        eid = str(uuid.uuid5(uuid.NAMESPACE_URL, "ai4impact:course-interest:" + str(row["id"])))
        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", ("interest:" + row["email"].lower() + row["title"],))
        cur.execute("""SELECT id FROM website_enquiries WHERE kind='guidance' AND lower(email)=lower(%s)
            AND (id=%s OR interest=%s) ORDER BY created_at,id LIMIT 1""", (row["email"],eid,row["title"][:255]))
        existing = cur.fetchone()
        if existing:
            return {"id": str(existing["id"])}
        # An in-app interest records the learner's request for course follow-up.
        cur.execute("""INSERT INTO website_enquiries
            (id,name,email,phone,interest,consent,consent_version,source_page,payload_hash)
            VALUES(%s,%s,%s,%s,%s,true,'student-course-interest-v1','/student/course-interest',%s)
            ON CONFLICT(id) DO NOTHING""", (eid,(row["name"] or row["email"])[:120],row["email"],
            row["phone"] or "",row["title"][:255],str(row["id"]).replace("-", "").ljust(64,"0")))
    return {"id": eid}


def followups(actor, eid):
    staff(actor)
    with get_db_cursor() as cur:
        cur.execute("SELECT id FROM website_enquiries WHERE id=%s", (identifier(eid),))
        if not cur.fetchone():
            raise ApiError(404, "Enquiry not found")
        cur.execute("""SELECT a.old_status,a.new_status,a.changed_at AS created_at,u.name AS actor_name
            FROM enquiry_audit a LEFT JOIN users u ON u.id=a.actor_id
            WHERE a.enquiry_id=%s ORDER BY a.changed_at DESC,a.id DESC LIMIT 50""",(eid,))
        return {"history": cur.fetchall()}
