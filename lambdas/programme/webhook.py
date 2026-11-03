"""Resend raw-body signature validation and idempotent, monotonic delivery updates."""

import base64
import hashlib
import hmac
import json
import os
import time
import boto3
from botocore.config import Config
from shared.db import get_db_cursor
from learning.validation import ApiError

_client = None
_cache = None


def secret():
    global _client, _cache
    arn = os.environ.get("RESEND_WEBHOOK_SECRET_ARN")
    if not arn:
        raise ApiError(503, "Email webhook is not configured")
    if _cache and _cache[0] == arn and _cache[2] > time.monotonic():
        return _cache[1]
    if _client is None:
        _client = boto3.client(
            "secretsmanager",
            config=Config(
                connect_timeout=3,
                read_timeout=5,
                retries={"mode": "standard", "total_max_attempts": 2},
            ),
        )
    try:
        value = json.loads(_client.get_secret_value(SecretId=arn)["SecretString"])[
            "webhook_secret"
        ]
    except (
        _client.exceptions.ResourceNotFoundException,
        _client.exceptions.InvalidRequestException,
        KeyError,
        ValueError,
    ):
        raise ApiError(503, "Email webhook secret is not ready") from None
    _cache = (arn, value, time.monotonic() + 300)
    return value


def verify(raw, headers, key, now=None):
    headers = {str(k).lower(): v for k, v in headers.items()}
    eid = headers.get("svix-id", "")
    timestamp = headers.get("svix-timestamp", "")
    signatures = headers.get("svix-signature", "")
    if (
        not isinstance(eid, str)
        or not eid
        or len(eid) > 200
        or not isinstance(timestamp, str)
        or len(timestamp) > 20
        or not timestamp.isdigit()
        or not isinstance(signatures, str)
    ):
        raise ApiError(401, "Invalid webhook signature")
    if abs((now if now is not None else time.time()) - int(timestamp)) > 300:
        raise ApiError(401, "Webhook timestamp expired")
    try:
        decoded = base64.b64decode(key.removeprefix("whsec_"), validate=True)
    except (ValueError, AttributeError):
        raise ApiError(503, "Webhook signing secret is invalid") from None
    if len(decoded) < 16:
        raise ApiError(503, "Webhook signing secret is invalid")
    expected = base64.b64encode(
        hmac.new(
            decoded, (eid + "." + timestamp + ".").encode() + raw, hashlib.sha256
        ).digest()
    ).decode()
    if not any(
        hmac.compare_digest(expected, s.split(",", 1)[1])
        for s in signatures.split()
        if s.startswith("v1,")
    ):
        raise ApiError(401, "Invalid webhook signature")
    return eid


def receive(event):
    raw = event.get("body") or ""
    try:
        raw = (
            base64.b64decode(raw, validate=True)
            if event.get("isBase64Encoded")
            else raw.encode()
        )
    except (ValueError, AttributeError):
        raise ApiError(400, "Invalid webhook body") from None
    if len(raw) > 200000:
        raise ApiError(413, "Webhook is too large")
    eid = verify(raw, event.get("headers") or {}, secret())
    try:
        payload = json.loads(raw)
        kind = payload["type"]
        data = payload["data"]
        provider = data["email_id"]
        stamp = payload.get("created_at")
    except (ValueError, KeyError, TypeError):
        raise ApiError(400, "Invalid webhook event") from None
    from programme.common import moment

    occurred = moment(stamp, "created_at")
    if not isinstance(kind, str) or not isinstance(provider, str):
        raise ApiError(400, "Invalid event identifiers")
    states = {
        "email.sent": "accepted",
        "email.delivered": "delivered",
        "email.bounced": "failed",
        "email.complained": "failed",
        "email.failed": "failed",
        "email.suppressed": "suppressed",
    }
    with get_db_cursor() as cur:
        cur.execute(
            "INSERT INTO email_webhook_events(id,kind,provider_id) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING RETURNING id",
            (eid, kind, provider),
        )
        if not cur.fetchone():
            return {"received": True}
        # Durable staging also handles a webhook racing ahead of the sender's provider-ID commit.
        cur.execute(
            "UPDATE email_webhook_events SET payload=%s::jsonb,occurred_at=%s WHERE id=%s",
            (json.dumps({"to": data.get("to", [])}), occurred, eid),
        )
        apply(cur, provider, kind, occurred, data.get("to", []), states)
    return {"received": True}


def apply(cur, provider, kind, occurred, addresses, states=None):
    states = states or {
        "email.sent": "accepted",
        "email.delivered": "delivered",
        "email.bounced": "failed",
        "email.complained": "failed",
        "email.failed": "failed",
        "email.suppressed": "suppressed",
    }
    state = states.get(kind)
    if not state:
        return
    cur.execute(
        """UPDATE notification_deliveries SET status=%s,error_code=%s,last_provider_at=%s WHERE channel='email' AND provider_id=%s
      AND (last_provider_at IS NULL OR last_provider_at<=%s) AND (status NOT IN ('delivered','failed','suppressed') OR %s IN ('failed','suppressed'))""",
        (
            state,
            None if state in ("accepted", "delivered") else kind,
            occurred,
            provider,
            occurred,
            state,
        ),
    )
    if kind in ("email.bounced", "email.complained", "email.suppressed"):
        from programme.common import email

        if not isinstance(addresses, list):
            return
        for address in addresses[:10]:
            try:
                address = email(address)
            except ApiError:
                continue
            cur.execute(
                "INSERT INTO email_suppressions(email,reason) VALUES(%s,%s) ON CONFLICT(email) DO UPDATE SET reason=excluded.reason",
                (address, kind),
            )
