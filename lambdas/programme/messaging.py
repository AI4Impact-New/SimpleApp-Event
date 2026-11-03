"""Owned preferences, paginated inbox and operator delivery controls."""

from shared.db import get_db_cursor
from programme.common import *


def preferences(actor, body=None):
    with get_db_cursor() as cur:
        cur.execute(
            "INSERT INTO notification_preferences(user_id) VALUES(%s) ON CONFLICT DO NOTHING",
            (actor["id"],),
        )
        if body is not None:
            if set(body) - {
                "email_enabled",
                "push_enabled",
                "marketing_enabled",
                "timezone",
                "categories",
                "quiet_start",
                "quiet_end",
                "daily_limit",
            }:
                raise ApiError(400, "Unknown preference field")
            cur.execute(
                "SELECT * FROM notification_preferences WHERE user_id=%s FOR UPDATE",
                (actor["id"],),
            )
            old = cur.fetchone()
            email_on = boolean(
                body.get("email_enabled", old["email_enabled"]), "email_enabled"
            )
            push_on = boolean(
                body.get("push_enabled", old["push_enabled"]), "push_enabled"
            )
            marketing = boolean(
                body.get("marketing_enabled", old["marketing_enabled"]),
                "marketing_enabled",
            )
            tz = zone(body.get("timezone", old["timezone"]))
            import json
            from programme.common import integer

            categories = body.get("categories", old["categories"])
            if (
                not isinstance(categories, dict)
                or set(categories) - {"booking", "webinar", "career", "announcement"}
                or any(not isinstance(v, bool) for v in categories.values())
            ):
                raise ApiError(400, "Use boolean settings for known categories")
            quiet_start = integer(
                body.get("quiet_start", old["quiet_start"]), 0, 23, "quiet_start"
            )
            quiet_end = integer(
                body.get("quiet_end", old["quiet_end"]), 0, 23, "quiet_end"
            )
            daily_limit = integer(
                body.get("daily_limit", old["daily_limit"]), 1, 20, "daily_limit"
            )
            cur.execute(
                "UPDATE notification_preferences SET categories=%s::jsonb,quiet_start=%s,quiet_end=%s,daily_limit=%s WHERE user_id=%s",
                (
                    json.dumps(categories),
                    quiet_start,
                    quiet_end,
                    daily_limit,
                    actor["id"],
                ),
            )
            cur.execute(
                "UPDATE notification_preferences SET email_enabled=%s,push_enabled=%s,marketing_enabled=%s,timezone=%s WHERE user_id=%s",
                (email_on, push_on, marketing, tz, actor["id"]),
            )
        cur.execute(
            "SELECT email_enabled,push_enabled,marketing_enabled,timezone,categories,quiet_start,quiet_end,daily_limit FROM notification_preferences WHERE user_id=%s",
            (actor["id"],),
        )
        return cur.fetchone()


def inbox(actor, query):
    size, after = page(query)
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT id,course_id,title,body,read_at,created_at FROM learner_notifications WHERE user_id=%s AND (%s::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM learner_notifications WHERE id=%s::uuid AND user_id=%s)) ORDER BY created_at DESC,id DESC LIMIT %s",
            (actor["id"], after, after, actor["id"], size + 1),
        )
        rows = cur.fetchall()
        cur.execute(
            "SELECT count(*) AS count FROM learner_notifications WHERE user_id=%s AND read_at IS NULL",
            (actor["id"],),
        )
        count = cur.fetchone()["count"]
        return {
            "items": rows[:size],
            "unread_count": count,
            "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
        }


def delivery_status(actor, query):
    import os

    admin(actor)
    size, after = page(query)
    with get_db_cursor() as cur:
        cur.execute(
            """SELECT d.id,d.event_id,d.channel,d.status,d.attempts,d.error_code,d.available_at,d.created_at,e.title,e.category
          FROM notification_deliveries d JOIN notification_events e ON e.id=d.event_id WHERE (%s::uuid IS NULL OR d.id>%s::uuid) ORDER BY d.id LIMIT %s""",
            (after, after, size + 1),
        )
        rows = cur.fetchall()
        cur.execute(
            "SELECT channel,status,count(*) AS count FROM notification_deliveries GROUP BY channel,status"
        )
        counts = cur.fetchall()
        cur.execute(
            "SELECT channel,paused,reason,updated_at FROM notification_controls ORDER BY channel"
        )
        controls = cur.fetchall()
        return {
            "items": rows[:size],
            "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
            "counts": counts,
            "controls": controls,
            "email_enabled": os.environ.get("TRANSACTIONAL_EMAIL_ENABLED") == "true",
            "push_enabled": bool(os.environ.get("EXPO_PROJECT_ID")),
            "ai_enabled": False,
        }


def announce(actor, cid, body):
    from programme.common import admin, identifier, text, audit

    cid = identifier(cid)
    rid = identifier(body.get("request_id"))
    title = text(body.get("title"), "title", 200)
    content = text(body.get("body"), "body", 2000)
    with get_db_cursor() as cur:
        from programme.common import staff

        staff(cur, actor, cid)
        cur.execute(
            "INSERT INTO notification_campaigns(request_id,course_id,title,body,actor_id) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(request_id) DO NOTHING RETURNING *",
            (rid, cid, title, content, actor["id"]),
        )
        c = cur.fetchone()
        if not c:
            cur.execute(
                "SELECT * FROM notification_campaigns WHERE request_id=%s", (rid,)
            )
            c = cur.fetchone()
            if (str(c["actor_id"]), str(c["course_id"]), c["title"], c["body"]) != (
                actor["id"],
                cid,
                title,
                content,
            ):
                raise ApiError(409, "Request key already used for another announcement")
        return {
            "campaign_id": str(c["id"]),
            "queued": True,
            "notifications_created": c["recipient_count"],
        }


def fanout(cur):
    from programme.common import emit

    cur.execute(
        "SELECT * FROM notification_campaigns WHERE status='pending' AND expires_at>now() ORDER BY created_at,id LIMIT 5 FOR UPDATE SKIP LOCKED"
    )
    for campaign in cur.fetchall():
        cur.execute(
            "SELECT user_id FROM course_registrations WHERE course_id=%s AND status IN ('registered','completed') AND created_at<=%s AND (%s::uuid IS NULL OR user_id>%s::uuid) ORDER BY user_id LIMIT 200",
            (
                campaign["course_id"],
                campaign["created_at"],
                campaign["cursor_user_id"],
                campaign["cursor_user_id"],
            ),
        )
        users = cur.fetchall()
        for row in users:
            emit(
                cur,
                f"announcement:{campaign['id']}:{row['user_id']}",
                str(row["user_id"]),
                str(campaign["course_id"]),
                "announcement",
                campaign["title"],
                campaign["body"],
                "course",
                str(campaign["course_id"]),
                campaign["expires_at"],
            )
        cur.execute(
            "UPDATE notification_campaigns SET cursor_user_id=coalesce(%s,cursor_user_id),recipient_count=recipient_count+%s,status=%s WHERE id=%s",
            (
                users[-1]["user_id"] if users else None,
                len(users),
                "pending" if len(users) == 200 else "completed",
                campaign["id"],
            ),
        )


def announcements(actor, query, cid=None, body=None):
    from programme.common import staff, audit, identifier, text

    with get_db_cursor() as cur:
        if cid:
            cid = identifier(cid)
            cur.execute(
                "SELECT * FROM notification_campaigns WHERE id=%s FOR UPDATE", (cid,)
            )
            c = cur.fetchone()
            if not c:
                raise ApiError(404, "Announcement not found")
            staff(cur, actor, str(c["course_id"]))
            if body.get("status") != "cancelled":
                raise ApiError(400, "Only cancellation is supported")
            reason = text(body.get("reason"), "reason", 500)
            cur.execute(
                "UPDATE notification_campaigns SET status='cancelled' WHERE id=%s",
                (cid,),
            )
            cur.execute(
                "UPDATE notification_events SET expires_at=now() WHERE event_key LIKE %s",
                ("announcement:" + cid + ":%",),
            )
            audit(cur, actor, "announcement.cancel", cid, {"reason": reason})
            return {"cancelled": True}
        course = identifier(query.get("course_id"))
        staff(cur, actor, course)
        cur.execute(
            "SELECT id,title,status,created_at,expires_at,recipient_count FROM notification_campaigns WHERE course_id=%s ORDER BY created_at DESC LIMIT 100",
            (course,),
        )
        return cur.fetchall()


def controls(actor, body):
    from programme.common import admin, text, boolean, audit
    import uuid

    admin(actor)
    channel = body.get("channel")
    if channel not in ("email", "push"):
        raise ApiError(400, "Invalid channel")
    paused = boolean(body.get("paused"), "paused")
    reason = text(body.get("reason"), "reason", 500)
    with get_db_cursor() as cur:
        cur.execute(
            "INSERT INTO notification_controls(channel,paused,reason) VALUES(%s,%s,%s) ON CONFLICT(channel) DO UPDATE SET paused=excluded.paused,reason=excluded.reason,updated_at=now()",
            (channel, paused, reason),
        )
        audit(
            cur,
            actor,
            "delivery.control",
            str(uuid.uuid5(uuid.NAMESPACE_URL, "channel:" + channel)),
            {"channel": channel, "paused": paused, "reason": reason},
        )
    return {"updated": True}
