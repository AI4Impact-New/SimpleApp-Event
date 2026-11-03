"""Validation, authorization, transactional quotas and audit helpers."""

import json
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from learning.validation import ApiError, identifier, integer, text


def utcnow():
    return datetime.now(timezone.utc)


def moment(value, name="time"):
    if not isinstance(value, str):
        raise ApiError(400, name + " must be an ISO timestamp with offset")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ApiError(400, name + " must be an ISO timestamp with offset") from None
    if result.tzinfo is None:
        raise ApiError(400, name + " requires a timezone offset")
    return result.astimezone(timezone.utc)


def zone(value):
    value = text(value, "timezone", 100)
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise ApiError(400, "Use a valid IANA timezone") from None
    return value


def https(value, optional=True):
    if optional and not value:
        return ""
    value = text(value, "URL", 2000)
    p = urlparse(value)
    if (
        p.scheme != "https"
        or not p.hostname
        or p.username
        or p.password
        or any(c in value for c in "\r\n")
    ):
        raise ApiError(400, "An HTTPS URL without embedded credentials is required")
    return value


def email(value):
    import re

    value = text(value, "email", 254).lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise ApiError(400, "Valid email required")
    return value


def boolean(value, name):
    if not isinstance(value, bool):
        raise ApiError(400, name + " must be boolean")
    return value


def admin(actor):
    if not actor.get("admin"):
        raise ApiError(403, "Administrator access required")


def staff(cur, actor, course_id):
    if actor.get("admin"):
        return
    cur.execute(
        "SELECT 1 FROM programme_educators WHERE user_id=%s AND course_id=%s AND active=true",
        (actor["id"], course_id),
    )
    if not cur.fetchone():
        raise ApiError(403, "Educator access to this course required")


def enrolled(cur, uid, cid):
    cur.execute(
        "SELECT 1 FROM course_registrations r JOIN courses c ON c.id=r.course_id WHERE r.user_id=%s AND r.course_id=%s AND r.status IN ('registered','completed') AND c.archived=false AND c.status='published'",
        (uid, cid),
    )
    if not cur.fetchone():
        raise ApiError(403, "Active course enrollment required")


def member(cur, uid):
    cur.execute(
        """SELECT 1 FROM course_registrations r JOIN courses c ON c.id=r.course_id LEFT JOIN programme_entitlements e ON e.course_id=r.course_id AND e.user_id=r.user_id
     WHERE r.user_id=%s AND r.status IN ('registered','completed') AND c.status='published' AND c.archived=false AND coalesce(e.active,true)=true AND (e.expires_at IS NULL OR e.expires_at>now()) LIMIT 1""",
        (uid,),
    )
    if not cur.fetchone():
        raise ApiError(
            403, "An active enrolled course with Programme access is required"
        )


def entitlement(cur, uid, cid):
    enrolled(cur, uid, cid)
    cur.execute(
        "INSERT INTO programme_entitlements(user_id,course_id) VALUES(%s,%s) ON CONFLICT DO NOTHING",
        (uid, cid),
    )
    cur.execute(
        "SELECT * FROM programme_entitlements WHERE user_id=%s AND course_id=%s FOR UPDATE",
        (uid, cid),
    )
    e = cur.fetchone()
    if not e["active"] or (e["expires_at"] and e["expires_at"] <= utcnow()):
        raise ApiError(403, "Programme entitlement is inactive or expired")
    for kind, balance in [("handholding", 5), ("ai_interview", 10)]:
        cur.execute(
            "INSERT INTO programme_wallets(user_id,course_id,kind,balance) VALUES(%s,%s,%s,%s) ON CONFLICT DO NOTHING RETURNING balance",
            (uid, cid, kind, balance),
        )
        if cur.fetchone():
            cur.execute(
                "INSERT INTO programme_credit_entries(request_id,user_id,course_id,kind,delta,reason,actor_id) VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                (
                    str(uuid.uuid5(uuid.NAMESPACE_URL, f"included:{uid}:{cid}:{kind}")),
                    uid,
                    cid,
                    kind,
                    balance,
                    "Included course allowance",
                    uid,
                ),
            )


def credit(cur, uid, cid, kind, delta, request_id, reason, actor):
    request_id = identifier(request_id)
    cur.execute(
        "SELECT * FROM programme_credit_entries WHERE request_id=%s", (request_id,)
    )
    old = cur.fetchone()
    if old:
        if (
            str(old["user_id"]),
            str(old["course_id"]),
            old["kind"],
            old["delta"],
            old["reason"],
        ) != (uid, cid, kind, delta, reason):
            raise ApiError(
                409, "Idempotency key already used for another credit operation"
            )
        return
    cur.execute(
        "UPDATE programme_wallets SET balance=balance+%s WHERE user_id=%s AND course_id=%s AND kind=%s AND balance+%s BETWEEN 0 AND 10000 RETURNING balance",
        (delta, uid, cid, kind, delta),
    )
    if not cur.fetchone():
        raise ApiError(409, "Insufficient credits or invalid balance")
    cur.execute(
        "INSERT INTO programme_credit_entries(request_id,user_id,course_id,kind,delta,reason,actor_id) VALUES(%s,%s,%s,%s,%s,%s,%s)",
        (request_id, uid, cid, kind, delta, reason, actor["id"]),
    )


def audit(cur, actor, action, eid, detail=None):
    cur.execute(
        "INSERT INTO programme_audit(actor_id,action,entity_id,detail) VALUES(%s,%s,%s,%s::jsonb)",
        (actor["id"], action, eid, json.dumps(detail or {})),
    )


def emit(
    cur,
    key,
    uid,
    cid,
    category,
    title,
    body,
    entity_type,
    eid,
    expires,
    available=None,
    recipient=None,
):
    cur.execute(
        """INSERT INTO notification_events(event_key,user_id,recipient_email,course_id,category,title,body,entity_type,entity_id,expires_at,available_at)
      VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(event_key) DO NOTHING""",
        (
            key,
            uid,
            recipient,
            cid,
            category,
            title,
            body,
            entity_type,
            eid,
            expires,
            available or utcnow(),
        ),
    )


def limit(cur, key, count=20, seconds=60):
    cur.execute(
        """INSERT INTO programme_rate_limits(key) VALUES(%s) ON CONFLICT DO NOTHING""",
        (key,),
    )
    cur.execute(
        """UPDATE programme_rate_limits SET count=CASE WHEN window_start<now()-(%s*interval '1 second') THEN 1 ELSE count+1 END,
       window_start=CASE WHEN window_start<now()-(%s*interval '1 second') THEN now() ELSE window_start END WHERE key=%s RETURNING count""",
        (seconds, seconds, key),
    )
    if cur.fetchone()["count"] > count:
        raise ApiError(429, "Too many requests; try again later")


def page(query):
    query = query or {}
    size = (
        int(query.get("limit", "30")) if str(query.get("limit", "30")).isdigit() else 0
    )
    integer(size, 1, 100, "limit")
    after = query.get("after")
    return size, identifier(after) if after else None


def mutation(cur, actor, operation, body):
    import hashlib

    rid = identifier(body.get("request_id"))
    digest = hashlib.sha256(
        json.dumps(body, sort_keys=True, default=str).encode()
    ).hexdigest()
    cur.execute(
        "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", ("request:" + rid,)
    )
    cur.execute("SELECT * FROM programme_mutations WHERE request_id=%s", (rid,))
    old = cur.fetchone()
    if old:
        if (
            str(old["actor_id"]) != actor["id"]
            or old["operation"] != operation
            or old["payload_hash"] != digest
        ):
            raise ApiError(
                409, "Request ID has already been used for another operation"
            )
        return (rid, digest, old["response"])
    return (rid, digest, None)


def remember(cur, actor, operation, mark, response):
    def encode(value):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, uuid.UUID):
            return str(value)
        raise TypeError(type(value).__name__)

    cur.execute(
        "INSERT INTO programme_mutations(request_id,actor_id,operation,payload_hash,response) VALUES(%s,%s,%s,%s,%s::jsonb)",
        (
            mark[0],
            actor["id"],
            operation,
            mark[1],
            json.dumps(response, default=encode),
        ),
    )
