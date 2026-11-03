"""Admin-controlled acquisition campaigns; no meeting URL leaks in public configuration."""

import hashlib
import uuid
from datetime import timedelta
from shared.db import get_db_cursor
from programme.common import *

PUBLIC_FIELDS = "id,title,body,speakers,starts_at,ends_at,timezone,display_until,delay_seconds,variant,frequency_hours,version"


def public(query=None):
    with get_db_cursor() as cur:
        cur.execute(
            f"SELECT {PUBLIC_FIELDS} FROM webinar_campaigns WHERE status='published' AND display_from<=now() AND display_until>now() AND ends_at>now() ORDER BY starts_at,id LIMIT 1"
        )
        return {"campaign": cur.fetchone()}


def campaigns(actor, body=None, cid=None):
    admin(actor)
    with get_db_cursor() as cur:
        if body is None:
            cur.execute(
                """SELECT c.*,(SELECT count(*) FROM webinar_registrations r WHERE r.campaign_id=c.id) AS registrations,
            (SELECT count(*) FROM campaign_metrics m WHERE m.campaign_id=c.id AND event='impression') AS impressions,
            (SELECT count(*) FROM campaign_metrics m WHERE m.campaign_id=c.id AND event='click') AS clicks
            FROM webinar_campaigns c ORDER BY c.created_at DESC,c.id LIMIT 100"""
            )
            return cur.fetchall()
        operation = "campaign.save:" + str(cid or body.get("request_id"))
        mark = mutation(cur, actor, operation, body)
        if mark[2] is not None:
            return mark[2]
        cid = identifier(cid or body.get("request_id"))
        title = text(body.get("title"), "title", 200)
        content = text(body.get("body"), "body", 2000)
        speakers = str(body.get("speakers", ""))[:500]
        start = moment(body.get("starts_at"))
        end = moment(body.get("ends_at"))
        tz = zone(body.get("timezone"))
        show = moment(body.get("display_from"))
        hide = moment(body.get("display_until"))
        delay = integer(body.get("delay_seconds", 15), 0, 3600, "delay_seconds")
        frequency = integer(body.get("frequency_hours", 24), 1, 720, "frequency_hours")
        variant = body.get("variant", "modal")
        state = body.get("status", "draft")
        url = https(body.get("meeting_url", ""))
        if (
            end <= start
            or end - start > timedelta(hours=12)
            or hide <= show
            or hide > end
        ):
            raise ApiError(400, "Invalid webinar/display dates")
        if variant not in ("modal", "toast") or state not in (
            "draft",
            "published",
            "paused",
            "cancelled",
        ):
            raise ApiError(400, "Invalid variant or status")
        if state == "published" and start <= utcnow():
            raise ApiError(400, "Publish webinars before their start")
        cur.execute("SELECT * FROM webinar_campaigns WHERE id=%s FOR UPDATE", (cid,))
        old = cur.fetchone()
        cur.execute(
            """INSERT INTO webinar_campaigns(id,title,body,speakers,starts_at,ends_at,timezone,display_from,display_until,delay_seconds,variant,frequency_hours,meeting_url,status)
         VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,speakers=excluded.speakers,
         starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,display_from=excluded.display_from,display_until=excluded.display_until,
         delay_seconds=excluded.delay_seconds,variant=excluded.variant,frequency_hours=excluded.frequency_hours,meeting_url=excluded.meeting_url,status=excluded.status,
         version=webinar_campaigns.version+1 RETURNING *""",
            (
                cid,
                title,
                content,
                speakers,
                start,
                end,
                tz,
                show,
                hide,
                delay,
                variant,
                frequency,
                url,
                state,
            ),
        )
        result = cur.fetchone()
        # No synchronous recipient fan-out: worker reconciles registration versions in bounded chunks.
        if old:
            cur.execute(
                "UPDATE notification_events SET expires_at=now() WHERE entity_type='webinar' AND entity_id=%s",
                (cid,),
            )
        audit(cur, actor, "campaign.save", cid, {"status": state})
        remember(cur, actor, operation, mark, result)
        return result


def register(cid, body, ip):
    cid = identifier(cid)
    rid = identifier(body.get("request_id"))
    if body.get("website"):
        return {"request_id": rid, "message": "Registration received"}
    if body.get("consent") is not True:
        raise ApiError(400, "Registration contact consent is required")
    name = text(body.get("name"), "name", 120)
    address = email(body.get("email"))
    phone = str(body.get("phone", ""))[:30]
    source = str(body.get("utm_source", ""))[:200]
    with get_db_cursor() as cur:
        limit(cur, "registration-ip:" + hashlib.sha256(ip.encode()).hexdigest(), 10, 60)
        cur.execute("SELECT * FROM webinar_campaigns WHERE id=%s FOR SHARE", (cid,))
        c = cur.fetchone()
        if (
            not c
            or c["status"] != "published"
            or c["starts_at"] <= utcnow()
            or c["display_from"] > utcnow()
            or c["display_until"] <= utcnow()
        ):
            raise ApiError(409, "Webinar registration is closed")
        if body.get("version") is not None and body["version"] != c["version"]:
            raise ApiError(409, "Webinar details changed; refresh before registering")
        cur.execute("SELECT * FROM webinar_registrations WHERE request_id=%s", (rid,))
        old = cur.fetchone()
        if old:
            if (
                str(old["campaign_id"]) != cid
                or old["email"] != address
                or old["name"] != name
            ):
                raise ApiError(409, "Request key already used")
            return {"request_id": rid, "message": "Registration received"}
        cur.execute(
            """INSERT INTO webinar_registrations(campaign_id,name,email,phone,request_id,consent_at,utm_source)
        VALUES(%s,%s,%s,%s,%s,now(),%s) ON CONFLICT(campaign_id,email) DO NOTHING RETURNING *""",
            (cid, name, address, phone, rid, source),
        )
        r = cur.fetchone()
        if r:
            _registration_events(cur, r, c, "confirmed")
            cur.execute(
                "UPDATE webinar_registrations SET notified_version=%s WHERE id=%s",
                (c["version"], str(r["id"])),
            )
    return {"request_id": rid, "message": "Registration received"}


def _registration_events(cur, r, c, action):
    key = f"webinar:{r['id']}:{c['version']}:{action}"
    body = f"{c['title']} starts {c['starts_at'].astimezone(__import__('zoneinfo').ZoneInfo(c['timezone'])).isoformat()} ({c['timezone']})."
    # Join URLs are sent only to registered addresses, never public campaign configuration.
    if action != "cancelled" and c["meeting_url"]:
        body += " Join: " + c["meeting_url"]
    expiry = max(c["ends_at"], utcnow() + timedelta(days=1))
    emit(
        cur,
        key,
        None,
        None,
        "webinar",
        c["title"] + " - " + action,
        body,
        "webinar",
        str(c["id"]),
        expiry,
        recipient=r["email"],
    )
    if action != "cancelled" and r["status"] == "registered":
        for hours in (24, 1):
            due = c["starts_at"] - timedelta(hours=hours)
            if due > utcnow():
                emit(
                    cur,
                    key + f":reminder:{hours}",
                    None,
                    None,
                    "webinar",
                    "Webinar reminder: " + c["title"],
                    body,
                    "webinar",
                    str(c["id"]),
                    c["starts_at"],
                    due,
                    r["email"],
                )


def reconcile(cur, maximum=100):
    cur.execute(
        """SELECT r.id FROM webinar_registrations r JOIN webinar_campaigns c ON c.id=r.campaign_id
       WHERE r.status='registered' AND r.notified_version<c.version AND (c.ends_at>now() OR c.status='cancelled') ORDER BY r.id LIMIT %s FOR UPDATE OF r SKIP LOCKED""",
        (maximum,),
    )
    for item in cur.fetchall():
        cur.execute(
            "SELECT * FROM webinar_registrations WHERE id=%s", (str(item["id"]),)
        )
        r = cur.fetchone()
        cur.execute(
            "SELECT * FROM webinar_campaigns WHERE id=%s", (str(r["campaign_id"]),)
        )
        c = cur.fetchone()
        if c["status"] == "paused":
            continue
        _registration_events(
            cur, r, c, "cancelled" if c["status"] == "cancelled" else "updated"
        )
        cur.execute(
            "UPDATE webinar_registrations SET notified_version=%s WHERE id=%s",
            (c["version"], str(r["id"])),
        )


def registrations(actor, cid, query, body=None, rid=None):
    admin(actor)
    cid = identifier(cid)
    size, after = page(query)
    with get_db_cursor() as cur:
        if body is not None:
            state = body.get("status")
            rid = identifier(rid)
            if state not in ("cancelled", "attended", "no_show"):
                raise ApiError(400, "Invalid registration status")
            cur.execute(
                "UPDATE webinar_registrations SET status=%s WHERE id=%s AND campaign_id=%s RETURNING *",
                (state, rid, cid),
            )
            r = cur.fetchone()
            if not r:
                raise ApiError(404, "Registration not found")
            if state == "cancelled":
                cur.execute(
                    "UPDATE notification_events SET expires_at=now() WHERE event_key LIKE %s",
                    ("webinar:" + rid + ":%",),
                )
                cur.execute("SELECT * FROM webinar_campaigns WHERE id=%s", (cid,))
                campaign = cur.fetchone()
                _registration_events(cur, r, campaign, "cancelled")
            audit(cur, actor, "registration." + state, rid)
            return {"id": rid, "status": state}
        cur.execute(
            "SELECT * FROM webinar_registrations WHERE campaign_id=%s AND (%s::uuid IS NULL OR id>%s::uuid) ORDER BY id LIMIT %s",
            (cid, after, after, size + 1),
        )
        rows = cur.fetchall()
        return {
            "items": rows[:size],
            "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
        }


def metric(cid, body, ip):
    cid = identifier(cid)
    eid = identifier(body.get("event_id"))
    kind = body.get("event")
    if kind not in ("impression", "click", "dismiss"):
        raise ApiError(400, "Invalid metric")
    with get_db_cursor() as cur:
        limit(cur, "metrics-ip:" + hashlib.sha256(ip.encode()).hexdigest(), 120, 60)
        cur.execute(
            "INSERT INTO campaign_metrics(campaign_id,event,event_id) SELECT id,%s,%s FROM webinar_campaigns WHERE id=%s AND status='published' AND display_until>now() ON CONFLICT DO NOTHING",
            (kind, eid, cid),
        )
    return {"recorded": True}
