"""Durable notification relay, isolated SQS channel delivery, and receipt reconciliation."""

import json
import logging
import random
import re
import os
import uuid
from datetime import datetime, timedelta, time, timezone
from zoneinfo import ZoneInfo
import base64
from html import escape
import boto3
import requests
from botocore.config import Config
from shared.db import get_db_cursor
from programme.common import utcnow, limit
from programme import webinars, webhook, messaging
from learning.email_delivery import api_key, DeliveryError

log = logging.getLogger(__name__)
_clients = {}
http = requests.Session()


def client(name):
    if name not in _clients:
        _clients[name] = boto3.client(
            name,
            config=Config(
                connect_timeout=3,
                read_timeout=5,
                retries={"mode": "standard", "total_max_attempts": 2},
            ),
        )
    return _clients[name]


def dispatch(event, context):
    if os.environ.get("PROGRAMME_NOTIFICATIONS_ENABLED") != "true":
        return {"disabled": True}
    with get_db_cursor() as cur:
        webinars.reconcile(cur)
        messaging.fanout(cur)
        batch_size = max(10, min(5000, int(os.environ.get("RELAY_BATCH_SIZE", "1000"))))
        cur.execute(
            "SELECT id FROM notification_events WHERE dispatched_at IS NULL AND available_at<=now() AND expires_at>now() ORDER BY available_at,id LIMIT %s FOR UPDATE SKIP LOCKED",
            (batch_size,),
        )
        event_ids = [str(row["id"]) for row in cur.fetchall()]
        # Inbox creation and external jobs are retried by durable event ID, not a rolling time cutoff.
        cur.execute(
            """INSERT INTO learner_notifications(user_id,course_id,title,body,event_id)
         SELECT e.user_id,e.course_id,e.title,e.body,e.id FROM notification_events e WHERE e.user_id IS NOT NULL AND e.id=ANY(%s::uuid[])
         ON CONFLICT(event_id,user_id) WHERE event_id IS NOT NULL DO NOTHING""",
            (event_ids,),
        )
        cur.execute(
            """INSERT INTO notification_deliveries(event_id,channel,target_key,available_at)
         SELECT e.id,'email',lower(coalesce(e.recipient_email,u.email)),e.available_at FROM notification_events e LEFT JOIN users u ON u.id=e.user_id
         WHERE e.id=ANY(%s::uuid[]) AND coalesce(e.recipient_email,u.email) IS NOT NULL ON CONFLICT DO NOTHING""",
            (event_ids,),
        )
        project = os.environ.get("EXPO_PROJECT_ID", "")
        if project:
            cur.execute(
                """INSERT INTO notification_deliveries(event_id,channel,device_id,target_key,available_at)
              SELECT e.id,'push',d.id,d.id::text,e.available_at FROM notification_events e JOIN push_devices d ON d.user_id=e.user_id
              WHERE e.id=ANY(%s::uuid[]) AND d.project_id::text=%s ON CONFLICT DO NOTHING""",
                (event_ids, project),
            )
        cur.execute(
            "UPDATE notification_events SET dispatched_at=now() WHERE id=ANY(%s::uuid[])",
            (event_ids,),
        )
        cur.execute(
            "UPDATE notification_deliveries d SET status='expired' FROM notification_events e WHERE e.id=d.event_id AND e.expires_at<=now() AND d.status IN ('pending','queued','leased')"
        )
        cur.execute(
            "UPDATE notification_deliveries SET status='pending',lease_token=NULL,lease_until=NULL WHERE status IN ('queued','leased') AND lease_until<now()"
        )
        cur.execute(
            "DELETE FROM programme_rate_limits WHERE window_start<now()-interval '2 days'"
        )
        cur.execute(
            "DELETE FROM notification_daily_admission WHERE local_day<current_date-30"
        )
        cur.execute(
            "DELETE FROM campaign_metrics WHERE created_at<now()-interval '90 days'"
        )
        cur.execute(
            "SELECT id,channel FROM notification_deliveries WHERE status='pending' AND available_at<=now() ORDER BY available_at,id LIMIT %s FOR UPDATE SKIP LOCKED",
            (batch_size,),
        )
        jobs = cur.fetchall()
        lease = str(uuid.uuid4())
        for j in jobs:
            cur.execute(
                "UPDATE notification_deliveries SET status='queued',lease_token=%s,lease_until=now()+interval '10 minutes' WHERE id=%s",
                (lease, str(j["id"])),
            )
    submitted = 0
    for channel in ("email", "push"):
        channel_jobs = [j for j in jobs if j["channel"] == channel]
        queue = os.environ.get(
            "EMAIL_QUEUE_URL" if channel == "email" else "PUSH_QUEUE_URL"
        )
        for offset in range(0, len(channel_jobs), 10):
            if context and context.get_remaining_time_in_millis() < 10000:
                with get_db_cursor() as cur:
                    cur.execute(
                        "UPDATE notification_deliveries SET status='pending',lease_until=NULL WHERE id=ANY(%s::uuid[]) AND status='queued' AND lease_token=%s",
                        ([str(j["id"]) for j in channel_jobs[offset:]], lease),
                    )
                break
            batch = channel_jobs[offset : offset + 10]
            try:
                if not queue:
                    raise ValueError("Queue not configured")
                result = client("sqs").send_message_batch(
                    QueueUrl=queue,
                    Entries=[
                        {
                            "Id": str(i),
                            "MessageBody": json.dumps({"delivery_id": str(j["id"])}),
                        }
                        for i, j in enumerate(batch)
                    ],
                )
                successful = {r["Id"] for r in result.get("Successful", [])}
                failed = [j for i, j in enumerate(batch) if str(i) not in successful]
                submitted += len(successful)
            except Exception:
                log.warning("notification_enqueue_failed")
                failed = batch
            if failed:
                with get_db_cursor() as cur:
                    cur.execute(
                        "UPDATE notification_deliveries SET status='pending',lease_until=NULL WHERE id=ANY(%s::uuid[]) AND status='queued' AND lease_token=%s",
                        ([str(j["id"]) for j in failed], lease),
                    )
    return {"enqueued": submitted}


def _claim(did):
    lease = str(uuid.uuid4())
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT d.*,e.user_id,e.recipient_email,e.course_id,e.category,e.title,e.body,e.expires_at,e.entity_type,e.entity_id,e.event_key,e.available_at AS event_due FROM notification_deliveries d JOIN notification_events e ON e.id=d.event_id WHERE d.id=%s FOR UPDATE OF d",
            (did,),
        )
        j = cur.fetchone()
        if not j or j["status"] not in ("queued", "pending", "leased"):
            return None
        if j["status"] == "leased" and j["lease_until"] and j["lease_until"] > utcnow():
            raise RuntimeError("Delivery is leased")
        if j["available_at"] > utcnow() or j["event_due"] > utcnow():
            raise RuntimeError("Delivery is not due")
        reason = None
        if j["expires_at"] <= utcnow():
            reason = "expired"
        elif j["attempts"] >= 5:
            reason = "uncertain" if j["channel"] == "email" else "failed"
        if j["user_id"]:
            cur.execute(
                "SELECT * FROM notification_preferences WHERE user_id=%s",
                (str(j["user_id"]),),
            )
            pref = cur.fetchone()
            if pref and (
                (pref["categories"].get(j["category"]) is False)
                or not pref[j["channel"] + "_enabled"]
                or (j["category"] == "marketing" and not pref["marketing_enabled"])
            ):
                reason = "suppressed"
            if j["category"] == "marketing" and not pref:
                reason = "suppressed"
        if j["course_id"] and not j["event_key"].endswith(":cancelled"):
            cur.execute(
                "SELECT 1 FROM course_registrations WHERE user_id=%s AND course_id=%s AND status IN ('registered','completed')",
                (j["user_id"], j["course_id"]),
            )
            if not cur.fetchone():
                reason = "suppressed"
        cur.execute(
            "SELECT paused FROM notification_controls WHERE channel=%s", (j["channel"],)
        )
        control = cur.fetchone()
        if control and control["paused"]:
            cur.execute(
                "UPDATE notification_deliveries SET status='pending',available_at=now()+interval '5 minutes',lease_until=NULL WHERE id=%s",
                (did,),
            )
            return None
        if j["entity_type"] == "webinar":
            cur.execute(
                "SELECT status FROM webinar_campaigns WHERE id=%s", (j["entity_id"],)
            )
            campaign = cur.fetchone()
            cancellation = ":cancelled" in j["event_key"]
            if not campaign or (campaign["status"] == "cancelled" and not cancellation):
                reason = "suppressed"
            if campaign and campaign["status"] == "paused" and not cancellation:
                cur.execute(
                    "UPDATE notification_deliveries SET status='pending',available_at=now()+interval '5 minutes',lease_until=NULL WHERE id=%s",
                    (did,),
                )
                return None
            if not cancellation:
                cur.execute(
                    "SELECT 1 FROM webinar_registrations WHERE campaign_id=%s AND email=%s AND status='registered'",
                    (j["entity_id"], j["target_key"]),
                )
                if not cur.fetchone():
                    reason = "suppressed"
        if j["entity_type"] == "session" and j["category"] == "booking":
            # Cancelled sessions may send a cancellation notice, but no old reminder can survive explicit expiry.
            cur.execute(
                "SELECT status,starts_at FROM programme_sessions WHERE id=%s",
                (j["entity_id"],),
            )
            s = cur.fetchone()
            if not s:
                reason = "suppressed"
            if not j["event_key"].endswith((":cancelled", ":completed", ":no_show")):
                parts = j["event_key"].split(":")
                cur.execute(
                    "SELECT 1 FROM programme_bookings WHERE id=%s AND user_id=%s AND status='confirmed'",
                    (parts[1] if len(parts) > 1 else None, j["user_id"]),
                )
                if not cur.fetchone() or (s and s["status"] != "published"):
                    reason = "suppressed"
        if j["channel"] == "email":
            cur.execute(
                "SELECT 1 FROM email_suppressions WHERE email=%s", (j["target_key"],)
            )
            if cur.fetchone():
                reason = "suppressed"
            if j["user_id"] and not j["recipient_email"]:
                cur.execute("SELECT email FROM users WHERE id=%s", (j["user_id"],))
                u = cur.fetchone()
                if not u or u["email"].lower() != j["target_key"]:
                    reason = "suppressed"
            if os.environ.get("TRANSACTIONAL_EMAIL_ENABLED") != "true":
                cur.execute(
                    "UPDATE notification_deliveries SET status='pending',available_at=now()+interval '5 minutes',lease_until=NULL WHERE id=%s",
                    (did,),
                )
                return None
        else:
            cur.execute(
                "SELECT token,user_id,project_id FROM push_devices WHERE id=%s",
                (j["device_id"],),
            )
            device = cur.fetchone()
            if (
                not device
                or str(device["user_id"]) != str(j["user_id"])
                or str(device["project_id"]) != os.environ.get("EXPO_PROJECT_ID")
            ):
                reason = "suppressed"
            elif device:
                j["token"] = device["token"]
            if not os.environ.get("EXPO_PROJECT_ID"):
                reason = "suppressed"
        if reason:
            cur.execute(
                "UPDATE notification_deliveries SET status=%s,lease_until=NULL WHERE id=%s",
                (reason, did),
            )
            return None
        if j["user_id"] and j["category"] in ("career", "announcement", "marketing"):
            cur.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
                ("daily-notification:" + str(j["user_id"]),),
            )
            local = utcnow().astimezone(
                ZoneInfo(pref["timezone"] if pref else "Asia/Kolkata")
            )
            start = pref["quiet_start"] if pref else 21
            end = pref["quiet_end"] if pref else 8
            quiet = (start < end and start <= local.hour < end) or (
                start > end and (local.hour >= start or local.hour < end)
            )
            target_day = local.date() + (
                timedelta(days=1)
                if local.hour >= start and start > end
                else timedelta()
            )
            due = None
            if quiet:
                due = datetime.combine(target_day, time(end), local.tzinfo)
            cur.execute(
                "SELECT 1 FROM notification_daily_admission WHERE user_id=%s AND local_day=%s AND event_id=%s",
                (j["user_id"], local.date(), j["event_id"]),
            )
            already = cur.fetchone()
            cur.execute(
                "SELECT count(*) AS count FROM notification_daily_admission WHERE user_id=%s AND local_day=%s",
                (j["user_id"], local.date()),
            )
            count = cur.fetchone()["count"]
            if not already and count >= (pref["daily_limit"] if pref else 3):
                due = datetime.combine(
                    local.date() + timedelta(days=1), time(end), local.tzinfo
                )
            if due:
                # Round-trip through UTC to move nonexistent DST wall times forward safely.
                due = due.astimezone(timezone.utc).astimezone(local.tzinfo)
                cur.execute(
                    "UPDATE notification_deliveries SET status='pending',available_at=%s,lease_until=NULL WHERE id=%s",
                    (due.astimezone(timezone.utc), did),
                )
                return None
            cur.execute(
                "INSERT INTO notification_daily_admission(user_id,local_day,event_id) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING",
                (j["user_id"], local.date(), j["event_id"]),
            )
        # A shared, committed project-wide admission counter bounds all sender Lambda instances.
        cur.execute(
            "INSERT INTO programme_rate_limits(key) VALUES(%s) ON CONFLICT DO NOTHING",
            ("provider:" + j["channel"],),
        )
        cur.execute(
            "UPDATE programme_rate_limits SET count=CASE WHEN window_start<now()-interval '1 second' THEN 1 ELSE count+1 END,window_start=CASE WHEN window_start<now()-interval '1 second' THEN now() ELSE window_start END WHERE key=%s RETURNING count",
            ("provider:" + j["channel"],),
        )
        cap = int(
            os.environ.get("EMAIL_RATE_PER_SECOND", "2")
            if j["channel"] == "email"
            else os.environ.get("PUSH_RATE_PER_SECOND", "50")
        )
        if cur.fetchone()["count"] > cap:
            cur.execute(
                "UPDATE notification_deliveries SET status='pending',available_at=now()+interval '10 seconds',lease_until=NULL WHERE id=%s",
                (did,),
            )
            return None
        cur.execute(
            "UPDATE notification_deliveries SET status='leased',lease_token=%s,lease_until=now()+interval '2 minutes',attempts=attempts+1 WHERE id=%s",
            (lease, did),
        )
        j["lease_token"] = lease
        return j


def _provider(j):
    if j["channel"] == "email":
        sender = os.environ.get("TRANSACTIONAL_FROM_EMAIL", "")
        reply = os.environ.get("TRANSACTIONAL_REPLY_TO", "")
        if not sender:
            raise DeliveryError("sender_not_configured", 503)
        payload = {
            "from": "AI4Impact <" + sender + ">",
            "to": [j["target_key"]],
            "subject": j["title"],
            "text": j["body"],
            "html": "<h2>"
            + escape(j["title"])
            + "</h2><p>"
            + escape(j["body"]).replace("\n", "<br>")
            + "</p>",
        }
        if j["entity_type"] == "session" and j["event_key"].startswith("booking:"):
            from programme.scheduling import calendar

            booking_id = j["event_key"].split(":")[1]
            attachment = calendar({"id": str(j["user_id"]), "admin": False}, booking_id)
            payload["attachments"] = [
                {
                    "filename": attachment["filename"],
                    "content": base64.b64encode(
                        re.sub(
                            r"(?m)^DTSTAMP:[^\r\n]*",
                            "DTSTAMP:" + j["created_at"].strftime("%Y%m%dT%H%M%SZ"),
                            attachment["content"],
                        ).encode()
                    ).decode(),
                }
            ]
        elif j["entity_type"] == "webinar":
            with get_db_cursor() as cur:
                cur.execute(
                    "SELECT * FROM webinar_campaigns WHERE id=%s", (j["entity_id"],)
                )
                c = cur.fetchone()
            if c:
                cancelled = ":cancelled" in j["event_key"]
                title = (
                    c["title"]
                    .replace("\r", "")
                    .replace("\n", " ")
                    .replace(",", r"\,")
                    .replace(";", r"\;")
                )
                lines = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "PRODID:-//AI4Impact//Webinar//EN",
                    "BEGIN:VEVENT",
                    "UID:" + str(c["id"]) + "@ai4impact.in",
                    "SEQUENCE:" + str(c["version"]),
                    "DTSTAMP:" + j["created_at"].strftime("%Y%m%dT%H%M%SZ"),
                    "DTSTART:"
                    + c["starts_at"]
                    .astimezone(timezone.utc)
                    .strftime("%Y%m%dT%H%M%SZ"),
                    "DTEND:"
                    + c["ends_at"].astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
                    "SUMMARY:" + title,
                    "STATUS:" + ("CANCELLED" if cancelled else "CONFIRMED"),
                ]
                if not cancelled and c["meeting_url"]:
                    lines.append("URL:" + c["meeting_url"])
                lines += ["END:VEVENT", "END:VCALENDAR", ""]
                payload["attachments"] = [
                    {
                        "filename": "AI4Impact-webinar.ics",
                        "content": base64.b64encode(
                            "\r\n".join(lines).encode()
                        ).decode(),
                    }
                ]
        if reply:
            payload["reply_to"] = reply
        response = http.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={
                "Authorization": "Bearer " + api_key(),
                "Idempotency-Key": "notification/" + str(j["id"]),
            },
            timeout=(3, 10),
            allow_redirects=False,
        )
        if response.status_code in (401, 403):
            raise DeliveryError("credentials_invalid", 503)
        if response.status_code == 429 or response.status_code >= 500:
            raise DeliveryError(
                "provider_retry", 502, uncertain=response.status_code >= 500
            )
        if not 200 <= response.status_code < 300:
            raise DeliveryError("provider_rejected", 400)
        try:
            pid = response.json()["id"]
        except (ValueError, KeyError, TypeError):
            raise DeliveryError("provider_outcome_unknown", 502, True) from None
        if not isinstance(pid, str) or len(pid) > 200:
            raise DeliveryError("provider_outcome_unknown", 502, True)
        return "accepted", pid
    headers = {"Accept": "application/json"}
    token = os.environ.get("EXPO_ACCESS_TOKEN", "")
    if token:
        headers["Authorization"] = "Bearer " + token
    response = http.post(
        "https://exp.host/--/api/v2/push/send",
        headers=headers,
        json={
            "to": j["token"],
            "title": j["title"],
            "body": j["body"][:700],
            "sound": "default",
            "data": {
                "notification_id": (
                    str(j["notification_id"]) if j.get("notification_id") else None
                ),
                "course_id": str(j["course_id"]) if j["course_id"] else None,
            },
        },
        timeout=(3, 10),
        allow_redirects=False,
    )
    if response.status_code == 429 or response.status_code >= 500:
        raise DeliveryError("provider_retry", 502, True)
    if not 200 <= response.status_code < 300:
        raise DeliveryError("push_credentials_or_payload", 400)
    ticket = response.json().get("data", {})
    if ticket.get("status") == "ok" and ticket.get("id"):
        return "ticket", ticket["id"]
    code = (ticket.get("details") or {}).get("error", "push_rejected")
    raise DeliveryError(code, 502 if code == "MessageRateExceeded" else 400)


def send(event, context):
    if os.environ.get("PROGRAMME_NOTIFICATIONS_ENABLED") != "true":
        with get_db_cursor() as cur:
            for r in event.get("Records", []):
                did = str(uuid.UUID(json.loads(r["body"])["delivery_id"]))
                cur.execute(
                    "UPDATE notification_deliveries SET status='pending',available_at=now()+interval '5 minutes' WHERE id=%s AND status='queued'",
                    (did,),
                )
        return {"batchItemFailures": []}
    failures = []
    for record in event.get("Records", []):
        try:
            did = str(uuid.UUID(json.loads(record["body"])["delivery_id"]))
            j = _claim(did)
            if not j:
                continue
            with get_db_cursor() as cur:
                cur.execute(
                    "SELECT id FROM learner_notifications WHERE event_id=%s AND user_id=%s",
                    (str(j["event_id"]), j["user_id"]),
                )
                n = cur.fetchone()
                j["notification_id"] = str(n["id"]) if n else None
            try:
                state, pid = _provider(j)
                code = None
            except (
                requests.RequestException,
                DeliveryError,
                ValueError,
                KeyError,
            ) as error:
                code = (
                    error.code
                    if isinstance(error, DeliveryError)
                    else "transport_outcome_unknown"
                )
                pid = None
                terminal = isinstance(error, DeliveryError) and error.status == 400
                ambiguous = not isinstance(error, DeliveryError) or error.uncertain
                state = (
                    ("uncertain" if j["channel"] == "email" and ambiguous else "failed")
                    if terminal or j["attempts"] >= 4
                    else "pending"
                )
                if code == "DeviceNotRegistered":
                    state = "suppressed"
                # Resend deduplication expires after 24h: ambiguous sends are never auto-replayed beyond that window.
                if j["channel"] == "email" and utcnow() - j["created_at"] >= timedelta(
                    hours=23
                ):
                    state = "uncertain"
            with get_db_cursor() as cur:
                cur.execute(
                    """UPDATE notification_deliveries SET status=%s,provider_id=%s,error_code=%s,lease_until=NULL,
                   available_at=now()+(%s*interval '1 second') WHERE id=%s AND status='leased' AND lease_token=%s""",
                    (
                        state,
                        pid,
                        code,
                        (
                            900
                            if state == "ticket"
                            else min(3600, 30 * 2 ** j["attempts"])
                            + random.randint(0, 15)
                        ),
                        did,
                        j["lease_token"],
                    ),
                )
                if code in (
                    "credentials_invalid",
                    "InvalidCredentials",
                    "MismatchSenderId",
                    "push_credentials_or_payload",
                ):
                    cur.execute(
                        "INSERT INTO notification_controls(channel,paused,reason) VALUES(%s,true,%s) ON CONFLICT(channel) DO UPDATE SET paused=true,reason=excluded.reason,updated_at=now()",
                        (j["channel"], code),
                    )
                if code == "DeviceNotRegistered":
                    cur.execute(
                        "DELETE FROM push_devices WHERE id=%s", (j["device_id"],)
                    )
                if pid and j["channel"] == "email":
                    cur.execute(
                        "SELECT * FROM email_webhook_events WHERE provider_id=%s ORDER BY occurred_at",
                        (pid,),
                    )
                    for hook in cur.fetchall():
                        webhook.apply(
                            cur,
                            pid,
                            hook["kind"],
                            hook["occurred_at"],
                            hook["payload"].get("to", []),
                        )
            print(
                json.dumps(
                    {
                        "event": "notification_transition",
                        "channel": j["channel"],
                        "status": state,
                        "job_id": did,
                        "code": code,
                    }
                )
            )
        except Exception:
            log.exception("notification_record_failed")
            failures.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failures}


def receipts(event, context):
    if os.environ.get("PROGRAMME_NOTIFICATIONS_ENABLED") != "true":
        return {"disabled": True}
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT id,provider_id,created_at,device_id FROM notification_deliveries WHERE channel='push' AND status='ticket' AND available_at<=now() ORDER BY available_at LIMIT 100"
        )
        jobs = cur.fetchall()
    if not jobs:
        return {"checked": 0}
    headers = {}
    token = os.environ.get("EXPO_ACCESS_TOKEN", "")
    if token:
        headers["Authorization"] = "Bearer " + token
    response = http.post(
        "https://exp.host/--/api/v2/push/getReceipts",
        headers=headers,
        json={"ids": [j["provider_id"] for j in jobs]},
        timeout=(3, 10),
    )
    response.raise_for_status()
    data = response.json()["data"]
    with get_db_cursor() as cur:
        for j in jobs:
            r = data.get(j["provider_id"])
            code = (r.get("details") or {}).get("error") if r else None
            state = (
                "accepted"
                if r and r.get("status") == "ok"
                else (
                    "failed"
                    if r or utcnow() - j["created_at"] > timedelta(hours=24)
                    else "ticket"
                )
            )
            cur.execute(
                "UPDATE notification_deliveries SET status=%s,error_code=%s,available_at=now()+interval '5 minutes' WHERE id=%s AND status='ticket'",
                (
                    state,
                    code or ("ReceiptUnavailable" if state == "failed" else None),
                    str(j["id"]),
                ),
            )
            if code == "DeviceNotRegistered":
                cur.execute("DELETE FROM push_devices WHERE id=%s", (j["device_id"],))
    return {"checked": len(jobs)}
