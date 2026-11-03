"""Real PostgreSQL transactions, access boundaries, races and durable messaging.
Set PROGRAMME_TEST_DSN to an isolated test database; never use production credentials.
"""

import concurrent.futures
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from programme import scheduling, career, webinars, messaging, worker, webhook
from programme.common import ApiError
import shared.db as db

DSN = os.environ.get("PROGRAMME_TEST_DSN")
pytestmark = pytest.mark.skipif(
    not DSN, reason="Requires isolated PostgreSQL PROGRAMME_TEST_DSN"
)


def uid():
    return str(uuid.uuid4())


def future(hours=48):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


@pytest.fixture(scope="module", autouse=True)
def schema():
    if not DSN:
        yield
        return
    cfg = psycopg2.extensions.parse_dsn(DSN)
    if not cfg.get("dbname", "").endswith("_test"):
        raise RuntimeError("Test database name must end in _test")
    conn = psycopg2.connect(DSN)
    with conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
            root = Path(__file__).parents[1]
            for p in [
                root / "docs/schema.sql",
                *sorted((root / "docs/migrations").glob("*.sql")),
            ]:
                cur.execute(p.read_text())
    old = db._connection_pool
    db._connection_pool = ThreadedConnectionPool(1, 20, DSN)
    yield
    db._connection_pool.closeall()
    db._connection_pool = old
    conn.close()


@pytest.fixture
def data():
    with db.get_db_cursor() as cur:
        cur.execute(
            "TRUNCATE users,courses,webinar_campaigns,programme_companies,email_suppressions,email_webhook_events,programme_rate_limits,notification_controls CASCADE"
        )
        users = [uid() for _ in range(4)]
        course = uid()
        for i, user in enumerate(users):
            cur.execute(
                "INSERT INTO users(id,cognito_id,email,name) VALUES(%s,%s,%s,%s)",
                (
                    user,
                    "programme-" + user,
                    f"person{i}@example.invalid",
                    "Person " + str(i),
                ),
            )
        cur.execute(
            "INSERT INTO courses(id,title,status) VALUES(%s,'QA Course','published')",
            (course,),
        )
        for user in users[1:3]:
            cur.execute(
                "INSERT INTO course_registrations(course_id,user_id,status) VALUES(%s,%s,'registered')",
                (course, user),
            )
        cur.execute(
            "INSERT INTO programme_educators(user_id,course_id) VALUES(%s,%s)",
            (users[3], course),
        )
    return {
        "admin": {"id": users[0], "admin": True},
        "student": {"id": users[1], "admin": False},
        "other": {"id": users[2], "admin": False},
        "teacher": {"id": users[3], "admin": False},
        "course": course,
    }


def slot(d, **extra):
    body = {
        "request_id": uid(),
        "course_id": d["course"],
        "educator_id": d["teacher"]["id"],
        "kind": "handholding",
        "title": "Support",
        "starts_at": future(),
        "ends_at": (
            datetime.fromisoformat(future()) + timedelta(minutes=30)
        ).isoformat(),
        "timezone": "Asia/Kolkata",
        "capacity": 1,
        "meeting_url": "https://example.invalid/meeting",
    }
    # Use one exact timestamp pair to avoid microsecond drift in duration checks.
    start = datetime.fromisoformat(body["starts_at"])
    body["ends_at"] = (start + timedelta(minutes=30)).isoformat()
    body.update(extra)
    return scheduling.save_session(d["teacher"], body)


def test_default_credits_are_once_per_course(data):
    for _ in range(3):
        assert {
            w["kind"]: w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
        } == {"ai_interview": 10, "handholding": 5}


def test_non_enrolled_student_denied(data):
    with pytest.raises(ApiError) as e:
        scheduling.summary(data["teacher"], data["course"])
    assert e.value.status == 403


def test_credit_adjustment_idempotency_and_audit(data):
    body = {
        "request_id": uid(),
        "user_id": data["student"]["id"],
        "kind": "handholding",
        "delta": 2,
        "reason": "Approved support",
    }
    for _ in range(2):
        scheduling.adjust(data["admin"], data["course"], body)
    assert (
        next(
            w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
            if w["kind"] == "handholding"
        )
        == 7
    )
    with pytest.raises(ApiError):
        scheduling.adjust(data["teacher"], data["course"], body)


def test_educator_overlap_rejected(data):
    slot(data)
    with pytest.raises(ApiError) as e:
        slot(data)
    assert e.value.status == 409


def test_student_slot_hides_join_link_until_booking(data):
    s = slot(data)
    q = {"course_id": data["course"]}
    assert scheduling.sessions(data["student"], q)["items"][0]["meeting_url"] is None
    scheduling.book(
        data["student"], str(s["id"]), {"request_id": uid(), "topic": "Review"}
    )
    assert (
        scheduling.sessions(data["student"], q)["items"][0]["meeting_url"]
        == "https://example.invalid/meeting"
    )
    assert scheduling.sessions(data["other"], q)["items"][0]["meeting_url"] is None


def test_duplicate_booking_decrements_once(data):
    s = slot(data)
    body = {"request_id": uid(), "topic": "Review"}
    a = scheduling.book(data["student"], str(s["id"]), body)
    b = scheduling.book(data["student"], str(s["id"]), body)
    assert a["id"] == b["id"]
    assert (
        next(
            w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
            if w["kind"] == "handholding"
        )
        == 4
    )


def test_last_seat_race(data):
    s = slot(data)

    def attempt(actor):
        try:
            return scheduling.book(
                actor, str(s["id"]), {"request_id": uid(), "topic": "Review"}
            )["status"]
        except ApiError as e:
            return e.status

    with concurrent.futures.ThreadPoolExecutor(2) as ex:
        r = list(ex.map(attempt, [data["student"], data["other"]]))
    assert sorted(map(str, r)) == ["409", "confirmed"]


def test_student_overlap_race_across_educators(data):
    s = slot(data)
    with db.get_db_cursor() as cur:
        cur.execute(
            "INSERT INTO programme_educators(user_id,course_id) VALUES(%s,%s)",
            (data["admin"]["id"], data["course"]),
        )
    other = scheduling.save_session(
        data["admin"],
        {
            "request_id": uid(),
            "course_id": data["course"],
            "educator_id": data["admin"]["id"],
            "kind": "group",
            "title": "Other",
            "starts_at": s["starts_at"].isoformat(),
            "ends_at": s["ends_at"].isoformat(),
            "timezone": "UTC",
            "capacity": 5,
        },
    )

    def attempt(sid):
        try:
            return scheduling.book(
                data["student"], str(sid), {"request_id": uid(), "topic": "Review"}
            )["status"]
        except ApiError as e:
            return e.status

    with concurrent.futures.ThreadPoolExecutor(2) as ex:
        r = list(ex.map(attempt, [s["id"], other["id"]]))
    assert sorted(map(str, r)) == ["409", "confirmed"]


def test_cancel_refunds_once_and_enforces_ownership(data):
    s = slot(data)
    b = scheduling.book(
        data["student"], str(s["id"]), {"request_id": uid(), "topic": "Review"}
    )
    with pytest.raises(ApiError):
        scheduling.update_booking(data["other"], str(b["id"]), {"status": "cancelled"})
    for _ in range(2):
        scheduling.update_booking(
            data["student"], str(b["id"]), {"status": "cancelled"}
        )
    assert (
        next(
            w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
            if w["kind"] == "handholding"
        )
        == 5
    )


def test_staff_cancel_refunds_even_inside_24h(data):
    start = datetime.now(timezone.utc) + timedelta(hours=2)
    s = slot(
        data,
        starts_at=start.isoformat(),
        ends_at=(start + timedelta(minutes=30)).isoformat(),
    )
    b = scheduling.book(
        data["student"], str(s["id"]), {"request_id": uid(), "topic": "Review"}
    )
    scheduling.update_booking(
        data["teacher"], str(b["id"]), {"status": "cancelled"}, True
    )
    assert (
        next(
            w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
            if w["kind"] == "handholding"
        )
        == 5
    )


def test_educator_cannot_manage_another_course(data):
    body = {
        "request_id": uid(),
        "course_id": uid(),
        "educator_id": data["teacher"]["id"],
        "kind": "group",
        "title": "x",
        "starts_at": future(),
        "ends_at": future(49),
        "timezone": "UTC",
        "capacity": 4,
    }
    with pytest.raises(ApiError) as e:
        scheduling.save_session(data["teacher"], body)
    assert e.value.status == 403


def test_invalid_timezone_and_naive_time(data):
    with pytest.raises(ApiError):
        slot(data, timezone="Fake/Time")
    with pytest.raises(ApiError):
        slot(data, starts_at="2030-01-01T12:00:00")


def create_job(d, **extra):
    c = career.companies(
        d["admin"],
        {
            "request_id": uid(),
            "name": "QA Company",
            "website": "https://example.invalid",
        },
    )
    body = {
        "request_id": uid(),
        "company_id": str(c["id"]),
        "title": "Engineer",
        "description": "Build useful things",
        "location": "Remote",
        "deadline": future(),
        "status": "published",
    }
    body.update(extra)
    return career.save_job(d["admin"], body)


def test_job_publish_archive_and_search(data):
    j = create_job(data)
    assert len(career.jobs(data["student"], {"q": "Engineer"})["items"]) == 1
    body = {
        **j,
        "request_id": uid(),
        "company_id": str(j["company_id"]),
        "deadline": j["deadline"].isoformat(),
        "status": "archived",
    }
    career.save_job(data["admin"], body, str(j["id"]))
    assert career.jobs(data["student"], {})["items"] == []


def test_application_dedupe_and_status_ownership(data):
    j = create_job(data)
    body = {"request_id": uid(), "consent": True, "statement": "My application"}
    a = career.apply(data["student"], str(j["id"]), body)
    assert career.apply(data["student"], str(j["id"]), body)["id"] == a["id"]
    with pytest.raises(ApiError):
        career.update_application(data["other"], str(a["id"]), {"status": "withdrawn"})
    career.update_application(
        data["admin"], str(a["id"]), {"status": "reviewing"}, True
    )
    assert career.applications(data["student"], {})["items"][0]["status"] == "reviewing"


def test_application_requires_consent_and_open_job(data):
    j = create_job(data)
    with pytest.raises(ApiError):
        career.apply(
            data["student"], str(j["id"]), {"request_id": uid(), "consent": False}
        )
    j = create_job(data, apply_url="https://example.invalid/apply")
    with pytest.raises(ApiError):
        career.apply(
            data["student"], str(j["id"]), {"request_id": uid(), "consent": True}
        )


def campaign(d):
    return webinars.campaigns(
        d["admin"],
        {
            "request_id": uid(),
            "title": "QA Webinar",
            "body": "Learn",
            "starts_at": future(),
            "ends_at": future(50),
            "timezone": "Asia/Kolkata",
            "display_from": future(-1),
            "display_until": future(49),
            "status": "published",
            "meeting_url": "https://example.invalid/private",
        },
    )


def test_public_campaign_has_no_join_url(data):
    c = campaign(data)
    public = webinars.public()["campaign"]
    assert str(public["id"]) == str(c["id"])
    assert "meeting_url" not in public


def test_registration_idempotency_and_no_contact_disclosure(data):
    c = campaign(data)
    body = {
        "request_id": uid(),
        "name": "QA Person",
        "email": "qa@example.invalid",
        "consent": True,
    }
    for _ in range(2):
        assert set(webinars.register(str(c["id"]), body, "127.0.0.1")) == {
            "request_id",
            "message",
        }
    assert len(webinars.registrations(data["admin"], str(c["id"]), {})["items"]) == 1
    with db.get_db_cursor() as cur:
        cur.execute(
            "SELECT count(*) AS count FROM notification_events WHERE event_key LIKE 'webinar:%%:confirmed'"
        )
        assert cur.fetchone()["count"] == 1


def test_campaign_pause_and_expiry(data):
    c = campaign(data)
    body = {
        **c,
        "request_id": uid(),
        "starts_at": c["starts_at"].isoformat(),
        "ends_at": c["ends_at"].isoformat(),
        "display_from": c["display_from"].isoformat(),
        "display_until": c["display_until"].isoformat(),
        "status": "paused",
    }
    webinars.campaigns(data["admin"], body, str(c["id"]))
    assert webinars.public()["campaign"] is None
    with pytest.raises(ApiError):
        webinars.register(
            str(c["id"]),
            {
                "request_id": uid(),
                "name": "X",
                "email": "x@example.invalid",
                "consent": True,
            },
            "127.0.0.1",
        )


def test_preferences_are_durable_and_validated(data):
    messaging.preferences(
        data["student"], {"email_enabled": False, "timezone": "America/New_York"}
    )
    assert messaging.preferences(data["student"])["email_enabled"] is False
    assert messaging.preferences(data["other"])["email_enabled"] is True
    with pytest.raises(ApiError):
        messaging.preferences(data["student"], {"email_enabled": "false"})


def test_outbox_survives_long_outage_and_inbox_is_deduplicated(data, monkeypatch):
    from programme.common import emit

    monkeypatch.setenv("PROGRAMME_NOTIFICATIONS_ENABLED", "true")

    class SQS:
        def send_message_batch(self, **kwargs):
            return {"Successful": [{"Id": r["Id"]} for r in kwargs["Entries"]]}

    monkeypatch.setattr(worker, "client", lambda _: SQS())
    with db.get_db_cursor() as cur:
        emit(
            cur,
            "outage",
            data["student"]["id"],
            data["course"],
            "announcement",
            "Hello",
            "World",
            "course",
            data["course"],
            datetime.now(timezone.utc) + timedelta(days=1),
        )
        cur.execute("UPDATE notification_events SET created_at=now()-interval '2 days'")
    worker.dispatch({}, None)
    worker.dispatch({}, None)
    assert len(messaging.inbox(data["student"], {})["items"]) == 1
    assert messaging.inbox(data["other"], {})["unread_count"] == 0


def test_email_paused_does_not_send_or_consume_attempt(data, monkeypatch):
    from programme.common import emit

    monkeypatch.delenv("TRANSACTIONAL_EMAIL_ENABLED", raising=False)
    with db.get_db_cursor() as cur:
        emit(
            cur,
            "pause",
            data["student"]["id"],
            None,
            "career",
            "Hello",
            "World",
            "user",
            data["student"]["id"],
            datetime.now(timezone.utc) + timedelta(days=1),
        )
        cur.execute(
            "INSERT INTO notification_deliveries(event_id,channel,target_key,status) SELECT id,'email','person1@example.invalid','queued' FROM notification_events RETURNING id"
        )
        did = str(cur.fetchone()["id"])
    assert worker._claim(did) is None
    with db.get_db_cursor() as cur:
        cur.execute(
            "SELECT status,attempts FROM notification_deliveries WHERE id=%s", (did,)
        )
        assert dict(cur.fetchone()) == {"status": "pending", "attempts": 0}


def test_webhook_monotonic_status_and_suppression(data):
    from programme.common import emit

    now = datetime.now(timezone.utc)
    with db.get_db_cursor() as cur:
        emit(
            cur,
            "hook",
            data["student"]["id"],
            None,
            "career",
            "Hello",
            "World",
            "user",
            data["student"]["id"],
            now + timedelta(days=1),
        )
        cur.execute(
            "INSERT INTO notification_deliveries(event_id,channel,target_key,status,provider_id) SELECT id,'email','person1@example.invalid','accepted','provider' FROM notification_events"
        )
        webhook.apply(cur, "provider", "email.delivered", now, [])
        webhook.apply(cur, "provider", "email.sent", now - timedelta(minutes=1), [])
        cur.execute("SELECT status FROM notification_deliveries")
        assert cur.fetchone()["status"] == "delivered"
        webhook.apply(
            cur,
            "provider",
            "email.complained",
            now + timedelta(minutes=1),
            ["person1@example.invalid"],
        )
        cur.execute("SELECT reason FROM email_suppressions")
        assert cur.fetchone()["reason"] == "email.complained"


def test_reschedule_transfers_credit_atomically(data):
    first = slot(data)
    later = datetime.fromisoformat(future(96))
    second = slot(
        data,
        starts_at=later.isoformat(),
        ends_at=(later + timedelta(minutes=30)).isoformat(),
    )
    old = scheduling.book(
        data["student"], str(first["id"]), {"request_id": uid(), "topic": "Review"}
    )
    request = {"request_id": uid(), "session_id": str(second["id"])}
    new = scheduling.reschedule(data["student"], str(old["id"]), request)
    assert (
        scheduling.reschedule(data["student"], str(old["id"]), request)["id"]
        == new["id"]
    )
    assert (
        next(
            w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
            if w["kind"] == "handholding"
        )
        == 4
    )
    scheduling.update_booking(data["student"], str(new["id"]), {"status": "cancelled"})
    assert (
        next(
            w["balance"]
            for w in scheduling.summary(data["student"], data["course"])["wallets"]
            if w["kind"] == "handholding"
        )
        == 5
    )


def test_last_credit_cannot_be_overspent(data):
    scheduling.adjust(
        data["admin"],
        data["course"],
        {
            "request_id": uid(),
            "user_id": data["student"]["id"],
            "kind": "handholding",
            "delta": -4,
            "reason": "QA balance",
        },
    )
    for index in range(2):
        when = datetime.fromisoformat(future(48 + index * 24))
        s = slot(
            data,
            starts_at=when.isoformat(),
            ends_at=(when + timedelta(minutes=30)).isoformat(),
        )
        if index == 0:
            scheduling.book(
                data["student"],
                str(s["id"]),
                {"request_id": uid(), "topic": "Last credit"},
            )
        else:
            with pytest.raises(ApiError) as e:
                scheduling.book(
                    data["student"],
                    str(s["id"]),
                    {"request_id": uid(), "topic": "Over quota"},
                )
            assert e.value.status == 409


def test_calendar_uses_utc_and_checks_ownership(data):
    s = slot(data)
    b = scheduling.book(
        data["student"], str(s["id"]), {"request_id": uid(), "topic": "Review"}
    )
    content = scheduling.calendar(data["student"], str(b["id"]))["content"]
    assert (
        "DTSTART:" + s["starts_at"].astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        in content
    )
    with pytest.raises(ApiError):
        scheduling.calendar(data["other"], str(b["id"]))


def test_campaign_idempotency_rejects_changed_payload(data):
    c = campaign(data)
    with db.get_db_cursor() as cur:
        cur.execute("SELECT count(*) AS count FROM programme_mutations")
        assert cur.fetchone()["count"] == 1
    # The same creation ID cannot overwrite a campaign using a different payload.
    with pytest.raises(ApiError):
        webinars.campaigns(
            data["admin"], {"request_id": str(c["id"]), "title": "Changed"}
        )


def test_routine_job_access_requires_enrollment(data):
    create_job(data)
    with pytest.raises(ApiError) as e:
        career.jobs(data["teacher"], {})
    assert e.value.status == 403


def test_scoped_teacher_can_list_course_educators(data):
    assert len(scheduling.educators(data["teacher"], data["course"], True)) == 1


def test_webhook_signature_replay_and_body_tampering():
    import base64, hashlib, hmac, time

    key = base64.b64encode(b"not-a-real-webhook-secret-1234").decode()
    raw = b'{"type":"email.delivered"}'
    stamp = str(int(time.time()))
    eid = "hook-qa"
    sig = base64.b64encode(
        hmac.new(
            base64.b64decode(key),
            (eid + "." + stamp + ".").encode() + raw,
            hashlib.sha256,
        ).digest()
    ).decode()
    headers = {"svix-id": eid, "svix-timestamp": stamp, "svix-signature": "v1," + sig}
    assert webhook.verify(raw, headers, "whsec_" + key) == eid
    with pytest.raises(ApiError):
        webhook.verify(raw + b" ", headers, "whsec_" + key)
    with pytest.raises(ApiError):
        webhook.verify(raw, headers, "whsec_" + key, now=int(stamp) + 301)


def test_announcement_fanout_resumes_and_deduplicates(data):
    rid = uid()
    body = {"request_id": rid, "title": "Update", "body": "New session"}
    a = messaging.announce(data["teacher"], data["course"], body)
    assert messaging.announce(data["teacher"], data["course"], body) == a
    with db.get_db_cursor() as cur:
        messaging.fanout(cur)
        messaging.fanout(cur)
        cur.execute("SELECT count(*) AS count FROM notification_events")
        assert cur.fetchone()["count"] == 2
    messaging.announcements(
        data["teacher"],
        {},
        a["campaign_id"],
        {"status": "cancelled", "reason": "QA stop"},
    )
    with db.get_db_cursor() as cur:
        cur.execute(
            "SELECT count(*) AS count FROM notification_events WHERE expires_at>now()"
        )
        assert cur.fetchone()["count"] == 0


def test_suppressed_email_never_reaches_provider(data, monkeypatch):
    from programme.common import emit

    monkeypatch.setenv("TRANSACTIONAL_EMAIL_ENABLED", "true")
    with db.get_db_cursor() as cur:
        emit(
            cur,
            "suppression",
            data["student"]["id"],
            None,
            "career",
            "Hello",
            "World",
            "user",
            data["student"]["id"],
            datetime.now(timezone.utc) + timedelta(days=1),
        )
        cur.execute(
            "INSERT INTO notification_deliveries(event_id,channel,target_key,status) SELECT id,'email','person1@example.invalid','queued' FROM notification_events RETURNING id"
        )
        did = str(cur.fetchone()["id"])
        cur.execute(
            "INSERT INTO email_suppressions(email,reason) VALUES('person1@example.invalid','email.bounced')"
        )
    assert worker._claim(did) is None
    with db.get_db_cursor() as cur:
        cur.execute("SELECT status FROM notification_deliveries WHERE id=%s", (did,))
        assert cur.fetchone()["status"] == "suppressed"


def queued_email(d, key="send-qa"):
    from programme.common import emit

    with db.get_db_cursor() as cur:
        emit(
            cur,
            key,
            d["student"]["id"],
            None,
            "booking",
            "Hello",
            "World",
            "user",
            d["student"]["id"],
            datetime.now(timezone.utc) + timedelta(days=1),
        )
        cur.execute(
            "INSERT INTO notification_deliveries(event_id,channel,target_key,status) SELECT id,'email','person1@example.invalid','queued' FROM notification_events WHERE event_key=%s RETURNING id",
            (key,),
        )
        return str(cur.fetchone()["id"])


def delivery_record(did):
    return {
        "Records": [
            {"messageId": "qa-message", "body": json.dumps({"delivery_id": did})}
        ]
    }


def test_sender_replay_calls_provider_once(data, monkeypatch):
    monkeypatch.setenv("PROGRAMME_NOTIFICATIONS_ENABLED", "true")
    monkeypatch.setenv("TRANSACTIONAL_EMAIL_ENABLED", "true")
    calls = []
    monkeypatch.setattr(
        worker,
        "_provider",
        lambda job: (calls.append(job["id"]) or ("accepted", "provider-qa")),
    )
    did = queued_email(data)
    assert worker.send(delivery_record(did), None) == {"batchItemFailures": []}
    assert worker.send(delivery_record(did), None) == {"batchItemFailures": []}
    assert len(calls) == 1
    with db.get_db_cursor() as cur:
        cur.execute(
            "SELECT status,attempts,provider_id FROM notification_deliveries WHERE id=%s",
            (did,),
        )
        assert dict(cur.fetchone()) == {
            "status": "accepted",
            "attempts": 1,
            "provider_id": "provider-qa",
        }


def test_invalid_credentials_pause_channel(data, monkeypatch):
    from learning.email_delivery import DeliveryError

    monkeypatch.setenv("PROGRAMME_NOTIFICATIONS_ENABLED", "true")
    monkeypatch.setenv("TRANSACTIONAL_EMAIL_ENABLED", "true")

    def reject(job):
        raise DeliveryError("credentials_invalid", 503)

    monkeypatch.setattr(worker, "_provider", reject)
    did = queued_email(data)
    worker.send(delivery_record(did), None)
    with db.get_db_cursor() as cur:
        cur.execute("SELECT paused FROM notification_controls WHERE channel='email'")
        assert cur.fetchone()["paused"] is True
        cur.execute(
            "SELECT status,error_code FROM notification_deliveries WHERE id=%s", (did,)
        )
        assert dict(cur.fetchone()) == {
            "status": "pending",
            "error_code": "credentials_invalid",
        }


def test_ambiguous_email_stops_after_budget(data, monkeypatch):
    import requests

    monkeypatch.setenv("PROGRAMME_NOTIFICATIONS_ENABLED", "true")
    monkeypatch.setenv("TRANSACTIONAL_EMAIL_ENABLED", "true")

    def timeout(job):
        raise requests.Timeout("synthetic timeout")

    monkeypatch.setattr(worker, "_provider", timeout)
    did = queued_email(data)
    with db.get_db_cursor() as cur:
        cur.execute("UPDATE notification_deliveries SET attempts=4 WHERE id=%s", (did,))
    worker.send(delivery_record(did), None)
    with db.get_db_cursor() as cur:
        cur.execute("SELECT status FROM notification_deliveries WHERE id=%s", (did,))
        assert cur.fetchone()["status"] == "uncertain"


def test_routine_quiet_hours_defer_without_attempt(data, monkeypatch):
    monkeypatch.setenv("TRANSACTIONAL_EMAIL_ENABLED", "true")
    messaging.preferences(
        data["student"], {"timezone": "Asia/Kolkata", "quiet_start": 21, "quiet_end": 8}
    )
    monkeypatch.setattr(
        worker, "utcnow", lambda: datetime(2026, 11, 3, 17, 0, tzinfo=timezone.utc)
    )
    did = queued_email(data)
    with db.get_db_cursor() as cur:
        cur.execute(
            "UPDATE notification_events SET category='career',available_at='2026-11-01',expires_at='2027-01-01'"
        )
        cur.execute("UPDATE notification_deliveries SET available_at='2026-11-01'")
    assert worker._claim(did) is None
    with db.get_db_cursor() as cur:
        cur.execute(
            "SELECT status,attempts,available_at FROM notification_deliveries WHERE id=%s",
            (did,),
        )
        r = cur.fetchone()
        assert r["status"] == "pending" and r["attempts"] == 0
        assert r["available_at"] == datetime(2026, 11, 4, 2, 30, tzinfo=timezone.utc)


def test_internship_screening_mentor_certificate_and_letter(data, monkeypatch):
    from learning import media
    monkeypatch.setenv('CERTIFICATE_VERIFY_BASE_URL','https://example.invalid')

    uploads = []
    monkeypatch.setattr(
        media, "store_certificate", lambda key, pdf: uploads.append((key, pdf))
    )
    monkeypatch.setattr(
        media, "certificate_download", lambda key: "https://example.invalid/" + key
    )
    intern = career.internships(
        data["student"],
        {},
        {
            "request_id": uid(),
            "course_id": data["course"],
            "eligible_declaration": True,
        },
    )
    iid = str(intern["id"])
    career.internships(data["admin"], {}, {"status": "screening"}, True, iid)
    with pytest.raises(ApiError):
        career.internships(data["admin"], {}, {"status": "interview"}, True, iid)
    exams = [uid(), uid()]
    with db.get_db_cursor() as cur:
        for exam in exams:
            cur.execute(
                "INSERT INTO exams(id,course_id,title,published) VALUES(%s,%s,'Screening',true)",
                (exam, data["course"]),
            )
    career.screening(
        data["admin"],
        data["course"],
        dict(zip(["aptitude_exam_id", "technical_exam_id"], exams)),
    )
    with pytest.raises(ApiError):
        career.internships(data["admin"], {}, {"status": "interview"}, True, iid)
    with db.get_db_cursor() as cur:
        for exam in exams:
            cur.execute(
                "INSERT INTO exam_attempts(exam_id,user_id,status) VALUES(%s,%s,'passed')",
                (exam, data["student"]["id"]),
            )
    career.internships(data["admin"], {}, {"status": "interview"}, True, iid)
    with pytest.raises(ApiError):
        career.internships(
            data["admin"],
            {},
            {
                "status": "accepted",
                "mentor_id": data["other"]["id"],
                "project": "QA project",
            },
            True,
            iid,
        )
    career.internships(
        data["admin"],
        {},
        {
            "status": "accepted",
            "mentor_id": data["teacher"]["id"],
            "project": "QA project",
        },
        True,
        iid,
    )
    review = {"request_id": uid(), "note": "Good project", "rating": 85}
    assert len(career.reviews(data["teacher"], iid, review)) == 1
    assert len(career.reviews(data["teacher"], iid, review)) == 1
    with pytest.raises(ApiError):
        career.reviews(data["teacher"], iid, {**review, "note": "Changed"})
    with pytest.raises(ApiError):
        career.reviews(data["other"], iid)
    career.internships(data["admin"], {}, {"status": "completed"}, True, iid)
    first = career.internship_certificate(data["admin"], iid)
    assert career.internship_certificate(data["admin"], iid) == first
    assert len(uploads) == 1 and uploads[0][1].startswith(b"%PDF")
    body = {
        "request_id": uid(),
        "body": "Completed a useful project.",
        "signer": "Training team",
    }
    letter = career.letter(data["admin"], iid, body)
    assert career.letter(data["admin"], iid, body) == letter
    assert len(uploads) == 2 and uploads[-1][1].startswith(b"%PDF")
    assert career.letter(data["student"], iid) == letter
    with pytest.raises(ApiError):
        career.letter(data["other"], iid)
