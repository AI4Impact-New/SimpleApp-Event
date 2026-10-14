"""Enrollment-gated lectures, server-measured progress, and admin operations."""
import json
import uuid
from datetime import datetime, timezone

from shared.db import execute_query, get_db_cursor
from shared.entitlements import enrolled
from learning.validation import ApiError, identifier, integer, number, text, watched_update


def course(course_id):
    row = execute_query("SELECT * FROM courses WHERE id=%s", (identifier(course_id),), fetch="one")
    if not row:
        raise ApiError(404, "Course not found")
    return row


def access(actor, course_id):
    row = course(course_id)
    if not actor["admin"] and (row["status"] != "published" or not enrolled(actor["id"], course_id)):
        raise ApiError(403, "Registration is required to access this course")
    return row


def class_row(class_id):
    row = execute_query("SELECT * FROM course_classes WHERE id=%s", (identifier(class_id),), fetch="one")
    if not row:
        raise ApiError(404, "Class not found")
    return row


def admin(actor):
    if not actor["admin"]:
        raise ApiError(403, "Admin access is required")


def classes(actor, course_id):
    access(actor, course_id)
    rows = execute_query("""SELECT c.*, a.id AS asset_id, a.status AS video_status, a.duration_seconds,
        coalesce(p.watched_seconds,0) AS watched_seconds, coalesce(p.completed,false) AS completed,
        coalesce(p.position_seconds,0) AS resume_seconds,
        ca.minutes_attended
        FROM course_classes c LEFT JOIN video_assets a ON a.class_id=c.id
        LEFT JOIN lecture_progress p ON p.asset_id=a.id AND p.user_id=%s
        LEFT JOIN class_attendance ca ON ca.class_id=c.id AND ca.user_id=%s
        WHERE c.course_id=%s ORDER BY c.sort_order,c.id""", (actor["id"], actor["id"], course_id), fetch="all")
    return rows or []


def save_class(actor, course_id, body, class_id=None):
    admin(actor)
    course(course_id)
    if class_id:
        old = class_row(class_id)
        if str(old["course_id"]) != course_id:
            raise ApiError(404, "Class not found in this course")
        body = {**old, **body}
    kind = body.get("class_type", "recorded")
    if kind not in ("recorded", "online", "in_person"):
        raise ApiError(400, "class_type must be recorded, online, or in_person")
    title = text(body.get("title"), "title", 255)
    duration = integer(body.get("duration_minutes") or 1, 1, 720, "duration_minutes")
    sort_order = integer(body.get("sort_order", 0), 0, 10000, "sort_order")
    for key in ("start_time", "end_time"):
        if body.get(key) and isinstance(body[key], str):
            try:
                body[key] = datetime.fromisoformat(body[key].replace("Z", "+00:00"))
                if body[key].tzinfo is None:
                    raise ValueError()
            except ValueError:
                raise ApiError(400, key + " must be an ISO timestamp with a timezone")
    if body.get("start_time") and body.get("end_time") and body["end_time"] <= body["start_time"]:
        raise ApiError(400, "end_time must be after start_time")
    for key in ("description", "zoom_link", "location"):
        if body.get(key) is not None and (not isinstance(body[key], str) or len(body[key]) > 4000):
            raise ApiError(400, key + " must be text of at most 4000 characters")
    if body.get("zoom_link") and not body["zoom_link"].startswith("https://"):
        raise ApiError(400, "zoom_link must use HTTPS")
    cid = class_id or str(uuid.uuid4())
    row = execute_query("""INSERT INTO course_classes(id,course_id,title,description,class_type,duration_minutes,
        sort_order,start_time,end_time,zoom_link,location) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,
        class_type=excluded.class_type,duration_minutes=excluded.duration_minutes,sort_order=excluded.sort_order,
        start_time=excluded.start_time,end_time=excluded.end_time,zoom_link=excluded.zoom_link,location=excluded.location
        RETURNING *""", (cid,course_id,title,body.get("description"),kind,duration,sort_order,body.get("start_time"),
                               body.get("end_time"),body.get("zoom_link"),body.get("location")), fetch="one")
    return row


def delete_class(actor, course_id, class_id):
    admin(actor)
    row = class_row(class_id)
    if str(row["course_id"]) != course_id:
        raise ApiError(404, "Class not found in this course")
    execute_query("DELETE FROM course_classes WHERE id=%s", (class_id,), fetch="none")
    return {"deleted": True}


def video_upload(actor, class_id, body):
    admin(actor)
    lecture = class_row(class_id)
    if lecture["class_type"] != "recorded":
        raise ApiError(400, "Video uploads require a recorded class")
    duration = integer(body.get("duration_seconds"), 1, 43200, "duration_seconds")
    size = integer(body.get("size_bytes"), 1, 2147483648, "size_bytes")
    from learning.media import upload_form
    aid = str(uuid.uuid4())
    key = f"courses/{lecture['course_id']}/classes/{class_id}/{aid}.mp4"
    upload = upload_form(key, size)
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM video_assets WHERE class_id=%s", (class_id,))
        cur.execute("INSERT INTO video_assets(id,class_id,course_id,object_key,duration_seconds,size_bytes) VALUES (%s,%s,%s,%s,%s,%s)",
                    (aid,class_id,lecture["course_id"],key,duration,size))
    return {"asset_id": aid, "upload": upload, "expires_in": 900}


def video_confirm(actor, class_id, body):
    admin(actor)
    asset = execute_query("SELECT * FROM video_assets WHERE class_id=%s AND id=%s", (identifier(class_id),identifier(body.get("asset_id"))), fetch="one")
    if not asset:
        raise ApiError(404, "Video upload not found")
    from learning.media import confirm_upload
    confirm_upload(asset["object_key"], asset["size_bytes"])
    execute_query("UPDATE video_assets SET status='ready' WHERE id=%s", (asset["id"],), fetch="none")
    return {"asset_id": str(asset["id"]), "status": "ready"}


def playback(actor, class_id):
    lecture = class_row(class_id)
    access(actor, str(lecture["course_id"]))
    asset = execute_query("SELECT * FROM video_assets WHERE class_id=%s AND status='ready'", (class_id,), fetch="one")
    if not asset:
        raise ApiError(409, "A published recording is not available for this class")
    from learning.media import playback_url
    url = playback_url(asset["object_key"])
    with get_db_cursor() as cur:
        # Serialize session renewal per learner and asset; one active session prevents parallel credit.
        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", (actor["id"] + str(asset["id"]),))
        cur.execute("UPDATE playback_sessions SET expires_at=now() WHERE user_id=%s AND asset_id=%s AND expires_at>now()", (actor["id"],asset["id"]))
        cur.execute("SELECT position_seconds FROM lecture_progress WHERE user_id=%s AND asset_id=%s", (actor["id"],asset["id"]))
        progress = cur.fetchone()
        resume = float(progress["position_seconds"]) if progress else 0
        sid = str(uuid.uuid4())
        cur.execute("INSERT INTO playback_sessions(id,user_id,asset_id,last_position) VALUES (%s,%s,%s,%s)", (sid,actor["id"],asset["id"],resume))
    return {"url": url, "session_id": sid, "expires_in": 3600, "duration_seconds": asset["duration_seconds"], "resume_seconds": resume}


def progress_heartbeat(actor, class_id, body):
    lecture = class_row(class_id)
    access(actor, str(lecture["course_id"]))
    sid = identifier(body.get("session_id"))
    with get_db_cursor() as cur:
        cur.execute("""SELECT s.*, a.duration_seconds, now() AS server_now FROM playback_sessions s
            JOIN video_assets a ON a.id=s.asset_id WHERE s.id=%s AND s.user_id=%s AND a.class_id=%s
            AND a.status='ready' FOR UPDATE OF s""", (sid,actor["id"],class_id))
        session = cur.fetchone()
        if not session or session["expires_at"] <= session["server_now"]:
            raise ApiError(409, "Playback session expired; request a new playback URL")
        cur.execute("INSERT INTO lecture_progress(user_id,asset_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (actor["id"],session["asset_id"]))
        cur.execute("SELECT * FROM lecture_progress WHERE user_id=%s AND asset_id=%s FOR UPDATE", (actor["id"],session["asset_id"]))
        saved = cur.fetchone()
        elapsed = (session["server_now"] - session["last_seen_at"]).total_seconds()
        # Long gaps represent a paused/disconnected player, not hours of watched content.
        ranges, watched, completed = watched_update(saved["watched_ranges"],float(session["last_position"]),body.get("position_seconds"),min(elapsed,60),session["duration_seconds"])
        position = float(body["position_seconds"])
        cur.execute("UPDATE playback_sessions SET last_position=%s,last_seen_at=now() WHERE id=%s", (position,sid))
        cur.execute("UPDATE lecture_progress SET watched_ranges=%s::jsonb,watched_seconds=%s,position_seconds=%s,completed=%s,updated_at=now() WHERE user_id=%s AND asset_id=%s",
                    (json.dumps(ranges),watched,position,completed,actor["id"],session["asset_id"]))
    return {"class_id":class_id,"watched_seconds":watched,"duration_seconds":session["duration_seconds"],"completed":completed,
            "progress_percentage":round(watched * 100 / session["duration_seconds"],2)}


def rules(course_id):
    row = execute_query("SELECT completion_rules FROM course_certificate WHERE course_id=%s", (course_id,), fetch="one")
    defaults = {"require_recorded":True,"require_attendance":False,"require_exam":True,"attendance_percentage":80}
    saved = (row or {}).get("completion_rules") or {}
    for key in defaults:
        if key in saved:
            if key == "attendance_percentage":
                if isinstance(saved[key],int) and not isinstance(saved[key],bool) and 1 <= saved[key] <= 100: defaults[key] = saved[key]
            elif isinstance(saved[key],bool): defaults[key] = saved[key]
    return defaults


def save_rules(actor, course_id, body):
    admin(actor)
    course(course_id)
    allowed = {"require_recorded","require_attendance","require_exam","attendance_percentage"}
    if set(body) - allowed:
        raise ApiError(400, "Unknown completion rule")
    value = {"require_recorded":True,"require_attendance":False,"require_exam":True,"attendance_percentage":80,**body}
    for key in ("require_recorded","require_attendance","require_exam"):
        if not isinstance(value[key],bool): raise ApiError(400,key + " must be a boolean")
    integer(value["attendance_percentage"],1,100,"attendance_percentage")
    if not any(value[key] for key in ("require_recorded","require_attendance","require_exam")):
        raise ApiError(400,"At least one completion requirement must be enabled")
    execute_query("""INSERT INTO course_certificate(course_id,title,provider,completion_rules)
        VALUES (%s,'Certificate of Completion','AI4Impact',%s::jsonb)
        ON CONFLICT(course_id) DO UPDATE SET completion_rules=excluded.completion_rules""", (course_id,json.dumps(value)),fetch="none")
    return value


def completion(actor, course_id):
    access(actor,course_id)
    cfg = rules(course_id)
    rows = classes(actor,course_id)
    recorded = [r for r in rows if r["class_type"] == "recorded"]
    live = [r for r in rows if r["class_type"] != "recorded"]
    finished = sum(bool(r["completed"]) and r["video_status"] == "ready" for r in recorded)
    attendance_threshold = cfg.get("attendance_percentage",80) / 100
    attended = sum(float(r["minutes_attended"] or 0) >= max(1,(r["duration_minutes"] or 1)) * attendance_threshold for r in live)
    exam_rows = execute_query("""SELECT e.id, EXISTS(SELECT 1 FROM exam_attempts a WHERE a.exam_id=e.id AND a.user_id=%s AND a.status='passed') AS passed
        FROM exams e WHERE e.course_id=%s AND e.published=true""", (actor["id"],course_id),fetch="all") or []
    missing = []
    if cfg.get("require_recorded",True) and (not recorded or finished != len(recorded)): missing.append("recorded_lectures")
    if cfg.get("require_attendance",False) and (not live or attended != len(live)): missing.append("live_attendance")
    if cfg.get("require_exam",True) and (not exam_rows or not all(r["passed"] for r in exam_rows)): missing.append("exam")
    # Never issue a completion certificate for an empty course or disabled requirements.
    activity = (cfg.get("require_recorded",True) and bool(recorded)) or (cfg.get("require_attendance",False) and bool(live)) or (cfg.get("require_exam",True) and bool(exam_rows))
    if not activity: missing.append("configured_learning_activities")
    return {"course_id":course_id,"eligible":not missing,"missing_requirements":missing,"rules":cfg,
            "recorded_total":len(recorded),"recorded_completed":finished,"live_total":len(live),"live_attended":attended,
            "exams_total":len(exam_rows),"exams_passed":sum(r["passed"] for r in exam_rows),
            "progress_percentage":round(finished * 100 / len(recorded),2) if recorded else 0}


def learners(actor, course_id):
    admin(actor)
    course(course_id)
    return execute_query("""SELECT r.user_id,u.name,u.email,r.status,r.created_at,
        (SELECT count(*) FROM lecture_progress p JOIN video_assets a ON a.id=p.asset_id WHERE p.user_id=r.user_id AND a.course_id=r.course_id AND p.completed=true) AS lectures_completed,
        (SELECT count(*) FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.user_id=r.user_id AND e.course_id=r.course_id AND a.status='passed') AS exams_passed,
        EXISTS(SELECT 1 FROM certificates_issued c WHERE c.user_id=r.user_id AND c.course_id=r.course_id AND c.certificate_type='completion' AND c.revoked_at IS NULL) AS certified
        FROM course_registrations r JOIN users u ON u.id=r.user_id WHERE r.course_id=%s ORDER BY r.created_at DESC LIMIT 500""", (course_id,),fetch="all") or []


def import_attendance(actor, class_id, body):
    admin(actor)
    lecture = class_row(class_id)
    if lecture["class_type"] == "recorded": raise ApiError(400,"Recorded lectures use playback progress")
    rows = body.get("attendees")
    if not isinstance(rows,list) or not 1 <= len(rows) <= 500: raise ApiError(400,"attendees must contain between 1 and 500 entries")
    accepted = []
    with get_db_cursor() as cur:
        for entry in rows:
            if not isinstance(entry,dict): raise ApiError(400,"Each attendee must be an object")
            uid = identifier(entry["user_id"]) if entry.get("user_id") else None
            email = entry.get("email")
            if not uid and not isinstance(email,str): raise ApiError(400,"Each attendee needs user_id or email")
            minutes = number(entry.get("minutes_attended"),0,1440,"minutes_attended")
            cur.execute("SELECT u.id FROM users u JOIN course_registrations r ON r.user_id=u.id WHERE r.course_id=%s AND r.status IN ('registered','completed') AND (u.id=%s OR (%s IS NULL AND lower(u.email)=lower(%s)))", (lecture["course_id"],uid,uid,email))
            row = cur.fetchone()
            if not row: raise ApiError(400,"An attendee is not enrolled in this course")
            cur.execute("""INSERT INTO class_attendance(class_id,user_id,minutes_attended,source,recorded_by)
                VALUES (%s,%s,%s,%s,%s) ON CONFLICT(class_id,user_id) DO UPDATE SET minutes_attended=greatest(class_attendance.minutes_attended,excluded.minutes_attended),source=excluded.source,recorded_by=excluded.recorded_by,recorded_at=now()""",
                (class_id,row["id"],minutes,text(body.get("source","admin"),"source",50),actor["id"]))
            accepted.append(str(row["id"]))
    return {"imported":len(accepted),"user_ids":accepted}


def attendance(actor, class_id):
    admin(actor)
    class_row(class_id)
    return execute_query("SELECT a.*,u.name,u.email FROM class_attendance a JOIN users u ON u.id=a.user_id WHERE class_id=%s ORDER BY recorded_at DESC",(class_id,),fetch="all") or []


def overview(actor):
    admin(actor)
    return execute_query("""SELECT (SELECT count(*) FROM courses) AS courses,
        (SELECT count(*) FROM course_registrations WHERE status IN ('registered','completed')) AS enrolled_learners,
        (SELECT count(*) FROM video_assets WHERE status='ready') AS published_recordings,
        (SELECT count(*) FROM lecture_progress WHERE completed=true) AS completed_lectures,
        (SELECT count(*) FROM exams WHERE published=true) AS published_exams,
        (SELECT count(*) FROM exam_attempts WHERE status='passed') AS passed_attempts,
        (SELECT count(*) FROM certificates_issued WHERE revoked_at IS NULL) AS valid_certificates""",fetch="one")


def notify_course(actor, course_id, body):
    admin(actor)
    course(course_id)
    title_value, body_value = text(body.get("title"),"title",200), text(body.get("body"),"body",2000)
    rows = execute_query("""INSERT INTO learner_notifications(user_id,course_id,title,body)
        SELECT user_id,course_id,%s,%s FROM course_registrations WHERE course_id=%s AND status IN ('registered','completed') RETURNING id""",(title_value,body_value,course_id),fetch="all")
    return {"notifications_created":len(rows or [])}


def notifications(actor, notification_id=None):
    if notification_id:
        row = execute_query("UPDATE learner_notifications SET read_at=coalesce(read_at,now()) WHERE id=%s AND user_id=%s RETURNING id,read_at",(identifier(notification_id),actor["id"]),fetch="one")
        if not row: raise ApiError(404,"Notification not found")
        return row
    return execute_query("SELECT id,course_id,title,body,created_at,read_at FROM learner_notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 100",(actor["id"],),fetch="all") or []
