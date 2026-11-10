"""Transactional course-scoped availability and booking services."""

from datetime import timedelta
import uuid
from shared.db import get_db_cursor
from programme.common import *


def summary(actor, cid):
    cid = identifier(cid)
    with get_db_cursor() as cur:
        entitlement(cur, actor["id"], cid)
        cur.execute(
            "SELECT kind,balance FROM programme_wallets WHERE user_id=%s AND course_id=%s ORDER BY kind",
            (actor["id"], cid),
        )
        return {
            "course_id": cid,
            "wallets": cur.fetchall(),
            "ai_enabled": False,
            "billing_mode": "included",
        }


def adjust(actor, cid, body):
    admin(actor)
    cid = identifier(cid)
    uid = identifier(body.get("user_id"))
    kind = body.get("kind")
    if kind not in ("handholding", "ai_interview"):
        raise ApiError(400, "Invalid wallet kind")
    delta = integer(body.get("delta"), -1000, 1000, "delta")
    if not delta:
        raise ApiError(400, "Nonzero delta required")
    reason = text(body.get("reason"), "reason", 500)
    rid = identifier(body.get("request_id"))
    with get_db_cursor() as cur:
        entitlement(cur, uid, cid)
        credit(cur, uid, cid, kind, delta, rid, reason, actor)
        audit(
            cur,
            actor,
            "credit.adjust",
            uid,
            {"course_id": cid, "kind": kind, "delta": delta, "reason": reason},
        )
    return {"updated": True}


def educators(actor, cid, for_staff=False):
    cid = identifier(cid)
    with get_db_cursor() as cur:
        if for_staff:
            staff(cur, actor, cid)
        elif not actor.get("admin"):
            enrolled(cur, actor["id"], cid)
        cur.execute(
            "SELECT e.user_id,u.name,e.active FROM programme_educators e JOIN users u ON u.id=e.user_id WHERE e.course_id=%s ORDER BY u.name,e.user_id",
            (cid,),
        )
        return cur.fetchall()


def set_educator(actor, cid, body):
    admin(actor)
    cid = identifier(cid)
    uid = identifier(body.get("user_id"))
    active = boolean(body.get("active", True), "active")
    with get_db_cursor() as cur:
        cur.execute("SELECT 1 FROM users WHERE id=%s", (uid,))
        if not cur.fetchone():
            raise ApiError(404, "User not found")
        cur.execute(
            "INSERT INTO programme_educators(user_id,course_id,active) VALUES(%s,%s,%s) ON CONFLICT(user_id,course_id) DO UPDATE SET active=excluded.active",
            (uid, cid, active),
        )
        audit(
            cur, actor, "educator.assignment", uid, {"course_id": cid, "active": active}
        )
    return {"updated": True}


def staff_access(actor):
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT e.course_id,c.title FROM programme_educators e JOIN courses c ON c.id=e.course_id WHERE e.user_id=%s AND e.active=true ORDER BY c.title",
            (actor["id"],),
        )
        return {"admin": actor.get("admin", False), "courses": cur.fetchall()}


def sessions(actor, query, for_staff=False):
    size, after = page(query)
    cid = identifier((query or {}).get("course_id"))
    with get_db_cursor() as cur:
        if for_staff:
            staff(cur, actor, cid)
        else:
            entitlement(cur, actor["id"], cid)
        cur.execute(
            """SELECT s.id,s.course_id,s.educator_id,u.name AS educator_name,s.kind,s.title,s.description,s.starts_at,s.ends_at,s.timezone,s.capacity,s.status,s.version,
           (SELECT count(*) FROM programme_bookings b WHERE b.session_id=s.id AND b.status IN ('confirmed','completed','no_show')) AS booked,
           CASE WHEN %s OR EXISTS(SELECT 1 FROM programme_bookings b WHERE b.session_id=s.id AND b.user_id=%s AND b.status='confirmed') THEN s.meeting_url ELSE NULL END AS meeting_url
           FROM programme_sessions s JOIN users u ON u.id=s.educator_id WHERE s.course_id=%s AND (%s OR (s.status='published' AND s.ends_at>now()))
           AND (%s::uuid IS NULL OR (s.starts_at,s.id)>(SELECT starts_at,id FROM programme_sessions WHERE id=%s::uuid)) ORDER BY s.starts_at,s.id LIMIT %s""",
            (for_staff, actor["id"], cid, for_staff, after, after, size + 1),
        )
        rows = cur.fetchall()
    return {
        "items": rows[:size],
        "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
    }


def _session_values(body):
    start = moment(body.get("starts_at"), "starts_at")
    end = moment(body.get("ends_at"), "ends_at")
    if start <= utcnow() or not timedelta(minutes=5) <= end - start <= timedelta(
        hours=8
    ):
        raise ApiError(
            400, "Future start and duration between 5 minutes and 8 hours required"
        )
    tz = zone(body.get("timezone"))
    kind = body.get("kind")
    if kind not in ("group", "handholding", "internship_interview"):
        raise ApiError(400, "Invalid session kind")
    if kind == "handholding" and end - start != timedelta(minutes=30):
        raise ApiError(400, "Handholding sessions must be 30 minutes")
    capacity = integer(body.get("capacity", 1), 1, 500, "capacity")
    if kind != "group" and capacity != 1:
        raise ApiError(400, "Individual slots have capacity one")
    return (
        kind,
        text(body.get("title"), "title", 200),
        str(body.get("description", ""))[:2000],
        start,
        end,
        tz,
        capacity,
        https(body.get("meeting_url", "")),
    )


def save_session(actor, body, sid=None):
    cid = identifier(body.get("course_id"))
    eid = identifier(body.get("educator_id"))
    rid = identifier(body.get("request_id"))
    values = _session_values(body)
    updating = bool(sid)
    sid = identifier(sid) if sid else str(uuid.uuid4())
    with get_db_cursor() as cur:
        staff(cur, actor, cid)
        operation = "session.save:" + str(sid if updating else rid)
        mark = mutation(cur, actor, operation, body)
        if mark[2] is not None:
            return mark[2]
        if not actor.get("admin") and actor["id"] != eid:
            raise ApiError(403, "Educators manage only their own slots")
        cur.execute(
            "SELECT 1 FROM programme_educators WHERE user_id=%s AND course_id=%s AND active=true",
            (eid, cid),
        )
        if not cur.fetchone():
            raise ApiError(400, "Assign an active educator to the course first")
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", ("educator:" + eid,)
        )
        cur.execute("SELECT * FROM programme_sessions WHERE request_id=%s", (rid,))
        prior = cur.fetchone()
        if prior:
            expected = (cid, eid, *values)
            actual = (
                str(prior["course_id"]),
                str(prior["educator_id"]),
                prior["kind"],
                prior["title"],
                prior["description"],
                prior["starts_at"],
                prior["ends_at"],
                prior["timezone"],
                prior["capacity"],
                prior["meeting_url"],
            )
            if actual != expected:
                raise ApiError(409, "Request key already used for another session")
            return prior
        if body.get("status", "published") not in ("published", "cancelled"):
            raise ApiError(400, "Invalid session status")
        # Share the student booking lock with bookings on other educators/courses.
        cur.execute(
            "SELECT user_id FROM programme_bookings WHERE session_id=%s AND status='confirmed' ORDER BY user_id",
            (sid,),
        )
        for booked in cur.fetchall():
            cur.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
                ("student:" + str(booked["user_id"]),),
            )
        cur.execute("SELECT * FROM programme_sessions WHERE id=%s FOR UPDATE", (sid,))
        old = cur.fetchone()
        if old:
            if str(old["course_id"]) != cid or str(old["educator_id"]) != eid:
                raise ApiError(
                    409,
                    "Course and educator cannot change; cancel and create a new slot",
                )
            if old["kind"] != values[0]:
                raise ApiError(409, "Session kind cannot change")
            cur.execute(
                "SELECT count(*) AS count FROM programme_bookings WHERE session_id=%s AND status<>'cancelled'",
                (sid,),
            )
            if cur.fetchone()["count"] > values[6]:
                raise ApiError(409, "Capacity is below current bookings")
        elif updating:
            raise ApiError(404, "Session not found")
        if old:
            cur.execute(
                """SELECT 1 FROM programme_bookings current JOIN programme_bookings other ON other.user_id=current.user_id AND other.session_id<>current.session_id
              JOIN programme_sessions occupied ON occupied.id=other.session_id WHERE current.session_id=%s AND current.status='confirmed' AND other.status='confirmed'
              AND occupied.status='published' AND occupied.starts_at<%s AND occupied.ends_at>%s LIMIT 1""",
                (sid, values[4], values[3]),
            )
            if cur.fetchone():
                raise ApiError(
                    409, "Rescheduling would overlap an existing learner booking"
                )
        if body.get("status", "published") == "published":
            cur.execute(
                "SELECT 1 FROM programme_sessions WHERE educator_id=%s AND id<>%s AND status='published' AND starts_at<%s AND ends_at>%s",
                (eid, sid, values[4], values[3]),
            )
            if cur.fetchone():
                raise ApiError(409, "Educator already has an overlapping session")
        status = body.get("status", "published")
        cur.execute(
            """INSERT INTO programme_sessions(id,request_id,course_id,educator_id,kind,title,description,starts_at,ends_at,timezone,capacity,meeting_url,status)
           VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET request_id=excluded.request_id,title=excluded.title,
           description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,capacity=excluded.capacity,
           meeting_url=excluded.meeting_url,status=excluded.status,version=programme_sessions.version+1 RETURNING *""",
            (sid, rid, cid, eid, *values, status),
        )
        result = cur.fetchone()
        if old:
            cur.execute(
                "UPDATE notification_events SET expires_at=now() WHERE entity_type='session' AND entity_id=%s",
                (sid,),
            )
            cur.execute(
                "SELECT * FROM programme_bookings WHERE session_id=%s AND status='confirmed' ORDER BY user_id",
                (sid,),
            )
            for booking in cur.fetchall():
                if status == "cancelled":
                    _cancel(cur, actor, booking, result, True)
                else:
                    _booking_events(cur, booking, result, "rescheduled")
        audit(cur, actor, "session.save", sid, {"status": status})
        remember(cur, actor, operation, mark, result)
        return result


def _booking_events(cur, b, s, action):
    bid = str(b["id"])
    uid = str(b["user_id"])
    sid = str(s["id"])
    cid = str(s["course_id"])
    version = s["version"]
    label = f"{s['title']} - {action}"
    body = f"Session starts {s['starts_at'].astimezone(__import__('zoneinfo').ZoneInfo(s['timezone'])).isoformat()} ({s['timezone']}). Open your bookings for details."
    emit(
        cur,
        f"booking:{bid}:{version}:{action}",
        uid,
        cid,
        "booking",
        label,
        body,
        "session",
        sid,
        max(s["ends_at"], utcnow() + timedelta(days=1)),
    )
    if action not in ("cancelled", "completed", "no_show"):
        for hours in (24, 1):
            due = s["starts_at"] - timedelta(hours=hours)
            if due > utcnow():
                emit(
                    cur,
                    f"booking:{bid}:{version}:reminder:{hours}",
                    uid,
                    cid,
                    "booking",
                    "Upcoming session: " + s["title"],
                    body,
                    "session",
                    sid,
                    s["starts_at"],
                    due,
                )


def book(actor, sid, body):
    sid = identifier(sid)
    rid = identifier(body.get("request_id"))
    topic = text(body.get("topic"), "topic", 200)
    note = str(body.get("note", ""))
    if len(note) > 2000:
        raise ApiError(400, "Note is too long")
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
            ("student:" + actor["id"],),
        )
        cur.execute("SELECT * FROM programme_bookings WHERE request_id=%s", (rid,))
        prior = cur.fetchone()
        if prior:
            if (
                str(prior["user_id"]) != actor["id"]
                or str(prior["session_id"]) != sid
                or prior["topic"] != topic
                or prior["note"] != note
            ):
                raise ApiError(409, "Request key already used")
            return prior
        cur.execute("SELECT * FROM programme_sessions WHERE id=%s FOR UPDATE", (sid,))
        s = cur.fetchone()
        if not s:
            raise ApiError(404, "Session not found")
        if s["status"] != "published" or s["starts_at"] <= utcnow() + timedelta(
            minutes=5
        ):
            raise ApiError(409, "This slot is no longer bookable")
        entitlement(cur, actor["id"], str(s["course_id"]))
        cur.execute(
            "SELECT 1 FROM programme_bookings WHERE session_id=%s AND user_id=%s",
            (sid, actor["id"]),
        )
        if cur.fetchone():
            raise ApiError(
                409, "This session already has a booking for you; choose another slot"
            )
        cur.execute(
            "SELECT count(*) AS count FROM programme_bookings WHERE session_id=%s AND status<>'cancelled'",
            (sid,),
        )
        if cur.fetchone()["count"] >= s["capacity"]:
            raise ApiError(409, "Session is full")
        cur.execute(
            "SELECT 1 FROM programme_bookings b JOIN programme_sessions s ON s.id=b.session_id WHERE b.user_id=%s AND b.status='confirmed' AND s.status='published' AND s.starts_at<%s AND s.ends_at>%s",
            (actor["id"], s["ends_at"], s["starts_at"]),
        )
        if cur.fetchone():
            raise ApiError(409, "You already have an overlapping booking")
        if s["kind"] == "handholding":
            credit(
                cur,
                actor["id"],
                str(s["course_id"]),
                "handholding",
                -1,
                rid,
                "Booking reservation",
                actor,
            )
        cur.execute(
            "INSERT INTO programme_bookings(request_id,session_id,user_id,topic,note) VALUES(%s,%s,%s,%s,%s) RETURNING *",
            (rid, sid, actor["id"], topic, note),
        )
        b = cur.fetchone()
        _booking_events(cur, b, s, "confirmed")
        audit(cur, actor, "booking.create", str(b["id"]))
        return b


def _cancel(cur, actor, b, s, staff_cancel=False):
    refund = staff_cancel or s["starts_at"] - utcnow() >= timedelta(hours=24)
    if s["kind"] == "handholding" and refund and not b["credit_refunded"]:
        # Refund does not require current enrollment: cancellation must not lose a reserved credit.
        credit(
            cur,
            str(b["user_id"]),
            str(s["course_id"]),
            "handholding",
            1,
            str(uuid.uuid5(uuid.NAMESPACE_URL, "refund:" + str(b["id"]))),
            "Booking refund",
            actor,
        )
    cur.execute(
        "UPDATE programme_bookings SET status='cancelled',credit_refunded=%s,updated_at=now() WHERE id=%s",
        (refund, str(b["id"])),
    )
    _booking_events(cur, b, s, "cancelled")


def update_booking(actor, bid, body, for_staff=False):
    bid = identifier(bid)
    state = body.get("status")
    if state not in ("cancelled", "completed", "no_show"):
        raise ApiError(400, "Invalid booking status")
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM programme_bookings WHERE id=%s FOR UPDATE", (bid,))
        b = cur.fetchone()
        if not b:
            raise ApiError(404, "Booking not found")
        cur.execute(
            "SELECT * FROM programme_sessions WHERE id=%s", (str(b["session_id"]),)
        )
        s = cur.fetchone()
        if for_staff:
            staff(cur, actor, str(s["course_id"]))
        elif str(b["user_id"]) != actor["id"]:
            raise ApiError(404, "Booking not found")
        if not for_staff and state != "cancelled":
            raise ApiError(403, "Only staff can mark attendance")
        if b["status"] == state:
            return b
        if b["status"] != "confirmed":
            raise ApiError(409, "Booking is already terminal")
        if not for_staff and s["starts_at"] <= utcnow():
            raise ApiError(409, "Session has started; contact staff")
        if state in ("completed", "no_show") and s["ends_at"] > utcnow():
            raise ApiError(409, "Session must end before recording attendance")
        if state == "cancelled":
            _cancel(cur, actor, b, s, for_staff)
        else:
            cur.execute(
                "UPDATE programme_bookings SET status=%s,updated_at=now() WHERE id=%s",
                (state, bid),
            )
            _booking_events(cur, b, s, state)
        # Expire pending reminders only for this user's booking, preserving notifications for others.
        cur.execute(
            "UPDATE notification_events SET expires_at=now() WHERE entity_type='session' AND entity_id=%s AND user_id=%s AND event_key LIKE %s AND event_key NOT LIKE '%%:cancelled'",
            (str(s["id"]), str(b["user_id"]), f"booking:{bid}:%"),
        )
        audit(cur, actor, "booking." + state, bid)
        cur.execute("SELECT * FROM programme_bookings WHERE id=%s", (bid,))
        return cur.fetchone()


def bookings(actor, query, for_staff=False):
    size, after = page(query)
    cid = identifier(query["course_id"]) if for_staff else None
    with get_db_cursor() as cur:
        if for_staff:
            staff(cur, actor, cid)
        cur.execute(
            """SELECT b.*,s.title,s.kind,s.course_id,s.starts_at,s.ends_at,s.timezone,s.educator_id,u.name AS educator_name,
          CASE WHEN b.status='confirmed' AND s.status='published' THEN s.meeting_url ELSE NULL END AS meeting_url
          FROM programme_bookings b JOIN programme_sessions s ON s.id=b.session_id JOIN users u ON u.id=s.educator_id
          WHERE (%s OR b.user_id=%s) AND (%s::uuid IS NULL OR s.course_id=%s) AND (%s::uuid IS NULL OR b.id>%s::uuid) ORDER BY b.id LIMIT %s""",
            (for_staff, actor["id"], cid, cid, after, after, size + 1),
        )
        rows = cur.fetchall()
        return {
            "items": rows[:size],
            "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
        }


def reschedule(actor, bid, body):
    bid = identifier(bid)
    new_sid = identifier(body.get("session_id"))
    rid = identifier(body.get("request_id"))
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
            ("student:" + actor["id"],),
        )
        cur.execute("SELECT * FROM programme_bookings WHERE request_id=%s", (rid,))
        prior = cur.fetchone()
        if prior:
            if (
                str(prior["user_id"]) != actor["id"]
                or str(prior["session_id"]) != new_sid
            ):
                raise ApiError(409, "Request key already used")
            return prior
        cur.execute(
            "SELECT * FROM programme_bookings WHERE id=%s AND user_id=%s FOR UPDATE",
            (bid, actor["id"]),
        )
        old = cur.fetchone()
        if not old:
            raise ApiError(404, "Booking not found")
        if old["status"] != "confirmed":
            raise ApiError(409, "Only confirmed bookings can be rescheduled")
        cur.execute(
            "SELECT * FROM programme_sessions WHERE id=ANY(%s::uuid[]) ORDER BY id FOR UPDATE",
            ([str(old["session_id"]), new_sid],),
        )
        slots = {str(r["id"]): r for r in cur.fetchall()}
        if new_sid not in slots:
            raise ApiError(404, "New session not found")
        previous = slots[str(old["session_id"])]
        new = slots[new_sid]
        if previous["starts_at"] - utcnow() < timedelta(hours=24):
            raise ApiError(
                409, "Contact staff for changes within 24 hours of the session"
            )
        if (
            new["kind"] != previous["kind"]
            or new["course_id"] != previous["course_id"]
            or new_sid == str(old["session_id"])
        ):
            raise ApiError(
                400, "Choose another slot for the same course and session type"
            )
        entitlement(cur, actor["id"], str(new["course_id"]))
        if new["status"] != "published" or new["starts_at"] <= utcnow() + timedelta(
            minutes=5
        ):
            raise ApiError(409, "New slot is unavailable")
        cur.execute(
            "SELECT count(*) AS count FROM programme_bookings WHERE session_id=%s AND status<>'cancelled'",
            (new_sid,),
        )
        if cur.fetchone()["count"] >= new["capacity"]:
            raise ApiError(409, "New slot is full")
        cur.execute(
            "SELECT 1 FROM programme_bookings b JOIN programme_sessions s ON s.id=b.session_id WHERE b.user_id=%s AND b.id<>%s AND b.status='confirmed' AND s.starts_at<%s AND s.ends_at>%s",
            (actor["id"], bid, new["ends_at"], new["starts_at"]),
        )
        if cur.fetchone():
            raise ApiError(409, "You have another overlapping booking")
        cur.execute(
            "UPDATE programme_bookings SET status='cancelled',updated_at=now() WHERE id=%s",
            (bid,),
        )
        cur.execute(
            "INSERT INTO programme_bookings(request_id,session_id,user_id,topic,note) VALUES(%s,%s,%s,%s,%s) RETURNING *",
            (rid, new_sid, actor["id"], old["topic"], old["note"]),
        )
        result = cur.fetchone()
        cur.execute(
            "UPDATE notification_events SET expires_at=now() WHERE entity_type='session' AND entity_id=%s AND user_id=%s AND event_key LIKE %s",
            (str(previous["id"]), actor["id"], f"booking:{bid}:%"),
        )
        _booking_events(cur, result, new, "rescheduled")
        audit(
            cur,
            actor,
            "booking.rescheduled",
            bid,
            {"replacement_booking_id": str(result["id"])},
        )
        return result


def calendar(actor, bid):
    bid = identifier(bid)
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT b.*,s.course_id,s.title,s.description,s.starts_at,s.ends_at,s.version,s.meeting_url FROM programme_bookings b JOIN programme_sessions s ON s.id=b.session_id WHERE b.id=%s AND b.user_id=%s",
            (bid, actor["id"]),
        )
        r = cur.fetchone()
        if not r:
            raise ApiError(404, "Booking not found")
        if r["status"] != "cancelled":
            enrolled(cur, actor["id"], str(r["course_id"]))

    def esc(value):
        return (
            str(value)
            .replace("\\", "\\\\")
            .replace("\r", "")
            .replace("\n", "\\n")
            .replace(";", "\\;")
            .replace(",", "\\,")
        )

    state = "CANCELLED" if r["status"] == "cancelled" else "CONFIRMED"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI4Impact//Programme//EN",
        "BEGIN:VEVENT",
        "UID:" + bid + "@ai4impact.in",
        "SEQUENCE:" + str(r["version"] * 10 + (1 if state == "CANCELLED" else 0)),
        "DTSTAMP:" + utcnow().strftime("%Y%m%dT%H%M%SZ"),
        "DTSTART:"
        + r["starts_at"]
        .astimezone(__import__("datetime").timezone.utc)
        .strftime("%Y%m%dT%H%M%SZ"),
        "DTEND:"
        + r["ends_at"]
        .astimezone(__import__("datetime").timezone.utc)
        .strftime("%Y%m%dT%H%M%SZ"),
        "SUMMARY:" + esc(r["title"]),
        "STATUS:" + state,
    ]
    if state == "CONFIRMED" and r["meeting_url"]:
        lines.append("URL:" + r["meeting_url"])
    lines += ["END:VEVENT", "END:VCALENDAR", ""]
    return {
        "filename": "AI4Impact-session.ics",
        "content_type": "text/calendar",
        "content": "\r\n".join(lines),
    }


def manage_entitlements(actor, cid, body=None):
    admin(actor)
    cid = identifier(cid)
    with get_db_cursor() as cur:
        if body is not None:
            uid = identifier(body.get("user_id"))
            active = boolean(body.get("active"), "active")
            reason = text(body.get("reason"), "reason", 500)
            expires = moment(body["expires_at"]) if body.get("expires_at") else None
            enrolled(cur, uid, cid)
            cur.execute(
                "INSERT INTO programme_entitlements(user_id,course_id,active,expires_at) VALUES(%s,%s,%s,%s) ON CONFLICT(user_id,course_id) DO UPDATE SET active=excluded.active,expires_at=excluded.expires_at",
                (uid, cid, active, expires),
            )
            if active and (expires is None or expires > utcnow()):
                entitlement(cur, uid, cid)
            audit(
                cur,
                actor,
                "entitlement.update",
                uid,
                {"course_id": cid, "active": active, "reason": reason},
            )
        cur.execute(
            """SELECT e.user_id,u.name,u.email,e.active,e.expires_at,
          (SELECT jsonb_object_agg(kind,balance) FROM programme_wallets w WHERE w.user_id=e.user_id AND w.course_id=e.course_id) AS balances
          FROM programme_entitlements e JOIN users u ON u.id=e.user_id WHERE e.course_id=%s ORDER BY u.name,e.user_id LIMIT 500""",
            (cid,),
        )
        return cur.fetchall()
