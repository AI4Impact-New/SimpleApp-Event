"""Batch assignment invariants on PostgreSQL."""

from uuid import uuid4

import pytest
from learning import batches, fee_ledger
from learning.validation import ApiError
from shared.db import get_db_cursor
from test_programme_integration import DSN, data, schema

pytestmark = pytest.mark.skipif(
    not DSN, reason="Requires isolated PostgreSQL PROGRAMME_TEST_DSN"
)


def call(data, route, method="GET", body=None, query=None):
    return batches.dispatch(
        data["admin"],
        route.split("/") if route else [],
        method,
        body or {},
        query or {},
    )


def create(data, **kwargs):
    return call(
        data,
        "",
        "POST",
        {
            "request_id": str(uuid4()),
            "name": "November batch",
            "course_id": data["course"],
            "starts_on": "2026-11-01",
            **kwargs,
        },
    )


def roster(data, **query):
    return call(data, "roster", query={"course_id": data["course"], **query})["items"]


def assignment(data, batch, students):
    return call(
        data,
        "assign",
        "POST",
        {
            "request_id": str(uuid4()),
            "course_id": data["course"],
            "batch_id": batch,
            "registrations": [
                {
                    "id": str(s["id"]),
                    "previous_batch_id": s["batch_id"] and str(s["batch_id"]),
                }
                for s in students
            ],
        },
    )


def test_batch_create_retry_multiple_trainers_and_legacy(data):
    request = str(uuid4())
    first = create(
        data,
        request_id=request,
        trainer_ids=[data["teacher"]["id"], data["admin"]["id"]],
    )
    retry = create(
        data,
        request_id=request,
        trainer_ids=[data["teacher"]["id"], data["admin"]["id"]],
    )
    assert first["id"] == retry["id"]
    assert first["code"].startswith("BATCH-")
    assert [p["id"] for p in first["trainers"]] == [
        data["teacher"]["id"],
        data["admin"]["id"],
    ]
    with pytest.raises(ApiError, match="already in use"):
        create(data, code=first["code"].lower())
    with get_db_cursor() as cur:
        cur.execute(
            "INSERT INTO fee_batches(code,course_id,trainer_id,starts_on) VALUES('LEGACY',%s,%s,'2026-11-01')",
            (data["course"], data["teacher"]["id"]),
        )
    legacy = next(b for b in call(data, "") if b["code"] == "LEGACY")
    assert (
        legacy["name"] is None and legacy["trainers"][0]["id"] == data["teacher"]["id"]
    )


def test_transfer_archive_and_atomic_stale_request(data):
    first, second = create(data), create(data)
    students = roster(data, unassigned="true")
    assert len(students) == 2
    assert assignment(data, str(first["id"]), students[:1]) == {"changed": 1}
    assert assignment(data, str(first["id"]), students[:1]) == {"changed": 0}
    # A stale bulk update must leave the other student unassigned.
    with pytest.raises(ApiError, match="changed batches"):
        assignment(data, str(second["id"]), students)
    assert len(roster(data, unassigned="true")) == 1
    call(data, str(first["id"]), "PATCH", {"archived": True})
    with pytest.raises(ApiError, match="Restore"):
        assignment(data, str(first["id"]), roster(data, unassigned="true"))
    assert assignment(
        data, str(second["id"]), roster(data, batch_id=str(first["id"]))
    ) == {"changed": 1}
    assert assignment(data, None, roster(data, batch_id=str(second["id"]))) == {
        "changed": 1
    }
    assert len(roster(data, unassigned="true")) == 2
    with get_db_cursor() as cur:
        cur.execute("SELECT count(*) AS total FROM batch_assignment_history")
        assert cur.fetchone()["total"] == 3


def test_course_boundary_and_existing_enrollment_only(data):
    with get_db_cursor() as cur:
        other = str(uuid4())
        cur.execute("INSERT INTO courses(id,title) VALUES(%s,'Other')", (other,))
    foreign = create(data, course_id=other)
    with pytest.raises(ApiError, match="another course"):
        assignment(data, str(foreign["id"]), roster(data))
    with pytest.raises(ApiError, match="no longer enrolled"):
        assignment(data, None, [{"id": str(uuid4()), "batch_id": None}])
    with pytest.raises(ApiError) as denied:
        batches.dispatch(data["student"], [], "GET", {}, {})
    assert denied.value.status == 403


def test_fee_plan_defaults_to_students_batch(data):
    batch = create(data)
    student = next(
        s for s in roster(data) if str(s["user_id"]) == data["student"]["id"]
    )
    assignment(data, str(batch["id"]), [student])
    agreement = fee_ledger.create_account(
        data["admin"],
        {
            "request_id": str(uuid4()),
            "user_id": data["student"]["id"],
            "course_id": data["course"],
            "mode": "test",
            "marked_price_paise": 10000,
            "installments": [{"amount_paise": 10000, "due_on": "2026-11-11"}],
        },
    )
    with get_db_cursor() as cur:
        cur.execute("SELECT batch_id FROM fee_accounts WHERE id=%s", (agreement["id"],))
        assert cur.fetchone()["batch_id"] == batch["id"]


def test_concurrent_transfers_allow_one_destination(data):
    from concurrent.futures import ThreadPoolExecutor

    first, second = create(data), create(data)
    student = roster(data, unassigned="true")[:1]

    def move(batch):
        try:
            assignment(data, str(batch["id"]), student)
        except ApiError as error:
            return error.status
        return 200

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(move, [first, second])) == [200, 409]
    assert len(roster(data, unassigned="true")) == 1
