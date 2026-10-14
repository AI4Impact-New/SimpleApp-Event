"""Assessment authoring and server-scored, immutable exam attempts."""
import json
import math
import uuid
from datetime import timedelta

from shared.db import execute_query, get_db_cursor
from learning.service import access, admin, course
from learning.validation import ApiError, identifier, integer, questions, score, text


def exam_row(exam_id):
    row = execute_query("SELECT * FROM exams WHERE id=%s", (identifier(exam_id),),fetch="one")
    if not row: raise ApiError(404,"Exam not found")
    return row


def exam_questions(exam_id, include_answers=False):
    columns = "id,question,options,points,sort_order" + (",correct_option_id" if include_answers else "")
    return execute_query(f"SELECT {columns} FROM exam_questions WHERE exam_id=%s ORDER BY sort_order,id",(exam_id,),fetch="all") or []


def get_exam(actor, exam_id):
    admin(actor)
    row = exam_row(exam_id)
    return {**row,"questions":exam_questions(exam_id,True)}


def list_exams(actor, course_id, for_admin=False):
    if for_admin:
        admin(actor)
        course(course_id)
    else:
        access(actor,course_id)
    return execute_query("""SELECT id,course_id,title,description,published,time_limit_seconds,max_attempts,pass_percentage,
        (SELECT count(*) FROM exam_questions q WHERE q.exam_id=e.id) AS question_count,
        (SELECT count(*) FROM exam_attempts a WHERE a.exam_id=e.id AND a.user_id=%s) AS attempts_used
        FROM exams e WHERE course_id=%s AND (%s OR published=true) ORDER BY created_at,id""",(actor["id"],course_id,for_admin),fetch="all") or []


def save_exam(actor, course_id, body, exam_id=None):
    admin(actor)
    course(course_id)
    if exam_id:
        old = get_exam(actor,exam_id)
        if str(old["course_id"]) != course_id: raise ApiError(404,"Exam not found in this course")
        body = {**old,**body}
    title = text(body.get("title"),"title",255)
    description = body.get("description") or ""
    if not isinstance(description,str) or len(description)>4000: raise ApiError(400,"description is too long")
    published = body.get("published",False)
    if not isinstance(published,bool): raise ApiError(400,"published must be a boolean")
    time_limit = integer(body.get("time_limit_seconds",1800),60,10800,"time_limit_seconds")
    maximum_attempts = integer(body.get("max_attempts",3),1,20,"max_attempts")
    threshold = integer(body.get("pass_percentage",70),0,100,"pass_percentage")
    authored = questions(body.get("questions"))
    eid = exam_id or str(uuid.uuid4())
    with get_db_cursor() as cur:
        cur.execute("""INSERT INTO exams(id,course_id,title,description,type,published,time_limit_seconds,max_attempts,pass_percentage,max_score,pass_score)
            VALUES (%s,%s,%s,%s,'mcq',%s,%s,%s,%s,%s,%s)
            ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,published=excluded.published,
            time_limit_seconds=excluded.time_limit_seconds,max_attempts=excluded.max_attempts,pass_percentage=excluded.pass_percentage,
            max_score=excluded.max_score,pass_score=excluded.pass_score""",
            (eid,course_id,title,description,published,time_limit,maximum_attempts,threshold,sum(q["points"] for q in authored),
             math.ceil(sum(q["points"] for q in authored)*threshold/100)))
        cur.execute("DELETE FROM exam_questions WHERE exam_id=%s",(eid,))
        for index,q in enumerate(authored):
            cur.execute("INSERT INTO exam_questions(id,exam_id,question,options,correct_option_id,points,sort_order) VALUES (%s,%s,%s,%s::jsonb,%s,%s,%s)",
                        (q["id"],eid,q["question"],json.dumps(q["options"]),q["correct_option_id"],q["points"],index))
    return get_exam(actor,eid)


def delete_exam(actor, exam_id):
    admin(actor)
    exam_row(exam_id)
    if execute_query("SELECT 1 FROM exam_attempts WHERE exam_id=%s LIMIT 1",(exam_id,),fetch="one"):
        raise ApiError(409,"An exam with attempts cannot be deleted; unpublish it instead")
    execute_query("DELETE FROM exams WHERE id=%s",(exam_id,),fetch="none")
    return {"deleted":True}


def _attempt_response(row):
    data = row["metadata"] or {}
    private = data.get("snapshot",[])
    return {"id":str(row["id"]),"exam_id":str(row["exam_id"]),"status":row["status"],"score":row["score"],
            "max_score":sum(q["points"] for q in private),"pass_percentage":data.get("pass_percentage",70),
            "percentage":data.get("percentage"),"expired":data.get("expired",False),
            "started_at":row["attempted_at"],"expires_at":row["expires_at"],"submitted_at":row["submitted_at"],
            "questions":[{k:v for k,v in q.items() if k != "correct_option_id"} for q in private]}


def start_attempt(actor, exam_id):
    row = exam_row(exam_id)
    access(actor,str(row["course_id"]))
    if not row["published"]: raise ApiError(404,"Published exam not found")
    with get_db_cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",(actor["id"]+exam_id,))
        cur.execute("SELECT *,now() AS server_now FROM exams WHERE id=%s FOR SHARE",(exam_id,))
        row = cur.fetchone()
        if not row or not row["published"]: raise ApiError(404,"Published exam not found")
        cur.execute("UPDATE exam_attempts SET status='failed',score=0,submitted_at=now() WHERE user_id=%s AND exam_id=%s AND status='pending' AND expires_at<=now()",(actor["id"],exam_id))
        cur.execute("SELECT * FROM exam_attempts WHERE user_id=%s AND exam_id=%s AND status='pending' AND expires_at>now() ORDER BY attempted_at DESC LIMIT 1",(actor["id"],exam_id))
        existing = cur.fetchone()
        if existing: return _attempt_response(existing)
        cur.execute("SELECT count(*) AS count FROM exam_attempts WHERE user_id=%s AND exam_id=%s",(actor["id"],exam_id))
        if cur.fetchone()["count"] >= row["max_attempts"]: raise ApiError(409,"Maximum exam attempts reached")
        cur.execute("SELECT id,question,options,correct_option_id,points FROM exam_questions WHERE exam_id=%s ORDER BY sort_order,id",(exam_id,))
        snapshot = [{**q,"id":str(q["id"])} for q in cur.fetchall()]
        if not snapshot: raise ApiError(409,"This exam has no questions")
        metadata = {"snapshot":snapshot,"pass_percentage":row["pass_percentage"]}
        cur.execute("INSERT INTO exam_attempts(id,exam_id,user_id,status,expires_at,metadata) VALUES (%s,%s,%s,'pending',%s,%s::jsonb) RETURNING *",
                    (str(uuid.uuid4()),exam_id,actor["id"],row["server_now"]+timedelta(seconds=row["time_limit_seconds"]),json.dumps(metadata)))
        created = cur.fetchone()
    return _attempt_response(created)


def get_attempt(actor, attempt_id):
    row = execute_query("SELECT a.*,e.course_id FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=%s AND a.user_id=%s",(identifier(attempt_id),actor["id"]),fetch="one")
    if not row: raise ApiError(404,"Attempt not found")
    access(actor,str(row["course_id"]))
    return _attempt_response(row)


def submit_attempt(actor, attempt_id, body):
    with get_db_cursor() as cur:
        cur.execute("SELECT a.*,e.course_id,now() AS server_now FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=%s AND a.user_id=%s FOR UPDATE OF a",(identifier(attempt_id),actor["id"]))
        row = cur.fetchone()
        if not row: raise ApiError(404,"Attempt not found")
        access(actor,str(row["course_id"]))
        if row["status"] != "pending": return _attempt_response(row)
        metadata = row["metadata"]
        earned,maximum,percentage = score(metadata["snapshot"],body.get("answers",{}))
        expired = row["expires_at"] <= row["server_now"]
        status = "passed" if not expired and earned * 100 >= maximum * metadata["pass_percentage"] else "failed"
        metadata = {**metadata,"answers":body.get("answers",{}),"percentage":0 if expired else percentage,"expired":expired}
        cur.execute("UPDATE exam_attempts SET score=%s,status=%s,submitted_at=now(),metadata=%s::jsonb WHERE id=%s RETURNING *",
                    (0 if expired else earned,status,json.dumps(metadata),attempt_id))
        updated = cur.fetchone()
    return {**_attempt_response(updated),"percentage":metadata["percentage"],"expired":expired}
