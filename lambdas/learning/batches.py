"""Course batches share identifiers with the payments ledger."""

import re
from datetime import date
from uuid import uuid4

from learning.service import admin
from learning.validation import ApiError, identifier, text
from shared.db import get_db_cursor
from programme.common import mutation, remember

SELECT_BATCH = """
SELECT b.*, c.title AS course_title,
    (SELECT count(*) FROM course_registrations r
     WHERE r.batch_id=b.id AND r.status IN ('registered','completed')) AS student_count,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'email',u.email)
                              ORDER BY (u.id=b.trainer_id) DESC NULLS LAST,u.name,u.id)
              FROM users u WHERE u.id=b.trainer_id OR EXISTS
              (SELECT 1 FROM batch_assistant_trainers t WHERE t.batch_id=b.id AND t.user_id=u.id)),
             '[]'::jsonb) AS trainers
FROM fee_batches b JOIN courses c ON c.id=b.course_id
"""


def parse_date(value, label):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ApiError(400, f"{label} must be a valid date")


def get_batch(cur, batch_id, lock=False):
    cur.execute(
        SELECT_BATCH + " WHERE b.id=%s" + (" FOR UPDATE OF b" if lock else ""),
        (batch_id,),
    )
    row = cur.fetchone()
    if not row:
        raise ApiError(404, "Batch not found")
    return row


def list_batches(cur, query):
    course_id = identifier(query["course_id"]) if query.get("course_id") else None
    cur.execute(
        SELECT_BATCH + """
        WHERE (%s::uuid IS NULL OR b.course_id=%s)
          AND (%s OR b.archived_at IS NULL)
        ORDER BY b.starts_on DESC,b.code,b.id
        """,
        (course_id, course_id, query.get("include_archived") == "true"),
    )
    return cur.fetchall()


def save(cur, body, batch_id=None):
    if set(body) - {
        "name",
        "code",
        "course_id",
        "starts_on",
        "ends_on",
        "trainer_ids",
        "archived",
    }:
        raise ApiError(400, "Unknown batch field")
    existing = get_batch(cur, batch_id, lock=True) if batch_id else None
    if existing and ({"course_id", "code"} & body.keys()):
        raise ApiError(400, "Batch ID and course are fixed after creation")
    course_id = existing["course_id"] if existing else identifier(body.get("course_id"))
    cur.execute("SELECT id FROM courses WHERE id=%s AND NOT archived", (course_id,))
    if not cur.fetchone():
        raise ApiError(404, "Active course not found")
    name = text(
        body.get("name", (existing["name"] or existing["code"]) if existing else None),
        "Batch name",
        120,
    )
    starts_on = (
        parse_date(body["starts_on"], "Start date")
        if "starts_on" in body
        else (existing["starts_on"] if existing else None)
    )
    if starts_on is None:
        raise ApiError(400, "Start date is required")
    ends_on = existing["ends_on"] if existing else None
    if "ends_on" in body:
        ends_on = parse_date(body["ends_on"], "End date") if body["ends_on"] else None
    if ends_on and ends_on < starts_on:
        raise ApiError(400, "End date must be on or after the start date")
    trainers = body.get(
        "trainer_ids", [t["id"] for t in existing["trainers"]] if existing else []
    )
    if not isinstance(trainers, list) or len(trainers) > 20:
        raise ApiError(400, "Choose up to 20 trainers")
    trainers = list(dict.fromkeys(identifier(trainer) for trainer in trainers))
    cur.execute(
        "SELECT count(*) AS total FROM users WHERE id=ANY(%s::uuid[])", (trainers,)
    )
    if cur.fetchone()["total"] != len(trainers):
        raise ApiError(404, "Trainer account not found")
    archived = body.get("archived", bool(existing and existing["archived_at"]))
    if not isinstance(archived, bool):
        raise ApiError(400, "Archived must be true or false")
    primary = trainers[0] if trainers else None
    if existing:
        cur.execute(
            """UPDATE fee_batches SET name=%s,starts_on=%s,ends_on=%s,trainer_id=%s,
               archived_at=CASE WHEN %s THEN coalesce(archived_at,now()) ELSE NULL END
               WHERE id=%s""",
            (name, starts_on, ends_on, primary, archived, batch_id),
        )
    else:
        code = body.get("code")
        if code is None or (isinstance(code, str) and not code.strip()):
            code = "BATCH-" + uuid4().hex[:12]
        code = text(code, "Batch ID", 100).upper()
        if not re.fullmatch(r"[A-Z0-9][A-Z0-9_-]*", code):
            raise ApiError(
                400, "Batch ID can contain letters, numbers, hyphens and underscores"
            )
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
            ("batch-code:" + code,),
        )
        cur.execute("SELECT 1 FROM fee_batches WHERE upper(code)=%s", (code,))
        if cur.fetchone():
            raise ApiError(409, "Batch ID is already in use")
        cur.execute(
            """INSERT INTO fee_batches (course_id,code,name,starts_on,ends_on,trainer_id,archived_at)
               VALUES (%s,%s,%s,%s,%s,%s,CASE WHEN %s THEN now() END)
               ON CONFLICT (code) DO NOTHING RETURNING id""",
            (course_id, code, name, starts_on, ends_on, primary, archived),
        )
        row = cur.fetchone()
        if not row:
            raise ApiError(409, "Batch ID is already in use")
        batch_id = row["id"]
    cur.execute("DELETE FROM batch_assistant_trainers WHERE batch_id=%s", (batch_id,))
    cur.execute(
        "INSERT INTO batch_assistant_trainers(batch_id,user_id) SELECT %s, unnest(%s::uuid[])",
        (batch_id, trainers[1:]),
    )
    return get_batch(cur, batch_id)


def roster(cur, query):
    course_id = identifier(query.get("course_id"))
    search = query.get("search", "").strip()[:120]
    batch_id = identifier(query["batch_id"]) if query.get("batch_id") else None
    if batch_id and str(get_batch(cur, batch_id)["course_id"]) != course_id:
        raise ApiError(400, "Batch belongs to another course")
    after = identifier(query["after"]) if query.get("after") else None
    cur.execute(
        """SELECT r.id,r.user_id,r.status,r.batch_id,b.code AS batch_code,u.name,u.email
           FROM course_registrations r JOIN users u ON u.id=r.user_id
           LEFT JOIN fee_batches b ON b.id=r.batch_id
           WHERE r.course_id=%s AND r.status IN ('registered','completed')
             AND (%s::uuid IS NULL OR r.batch_id=%s)
             AND (NOT %s OR r.batch_id IS NULL)
             AND (%s::uuid IS NULL OR r.id>%s)
             AND (%s='' OR strpos(lower(concat_ws(' ',u.name,u.email)),lower(%s))>0)
           ORDER BY r.id LIMIT 51""",
        (
            course_id,
            batch_id,
            batch_id,
            query.get("unassigned") == "true",
            after,
            after,
            search,
            search,
        ),
    )
    rows = cur.fetchall()
    return {"items": rows[:50], "next": rows[49]["id"] if len(rows) > 50 else None}


def assign(cur, actor, body):
    course_id = identifier(body.get("course_id"))
    destination = (
        identifier(body["batch_id"]) if body.get("batch_id") is not None else None
    )
    items = body.get("registrations")
    if not isinstance(items, list) or not 1 <= len(items) <= 100:
        raise ApiError(400, "Select between 1 and 100 students")
    expected = {}
    for item in items:
        if not isinstance(item, dict) or "previous_batch_id" not in item:
            raise ApiError(400, "Each student needs their current batch ID")
        key = identifier(item.get("id"))
        if key in expected:
            raise ApiError(400, "Select each student once")
        previous = item["previous_batch_id"]
        expected[key] = identifier(previous) if previous is not None else None
    if destination:
        target = get_batch(cur, destination, lock=True)
        if str(target["course_id"]) != course_id:
            raise ApiError(400, "Batch belongs to another course")
        if target["archived_at"]:
            raise ApiError(409, "Restore the batch before assigning students")
    cur.execute(
        """SELECT id,batch_id FROM course_registrations
           WHERE course_id=%s AND id=ANY(%s::uuid[]) AND status IN ('registered','completed')
           ORDER BY id FOR UPDATE""",
        (course_id, list(expected)),
    )
    rows = cur.fetchall()
    if len(rows) != len(expected):
        raise ApiError(
            409, "One or more students are no longer enrolled in this course"
        )
    changed = 0
    for row in rows:
        current = str(row["batch_id"]) if row["batch_id"] else None
        if current == destination:
            continue
        if current != expected[str(row["id"])]:
            raise ApiError(
                409, "A student changed batches. Refresh the roster and try again"
            )
        cur.execute(
            "UPDATE course_registrations SET batch_id=%s WHERE id=%s",
            (destination, row["id"]),
        )
        cur.execute(
            """INSERT INTO batch_assignment_history(registration_id,previous_batch_id,batch_id,changed_by)
               VALUES (%s,%s,%s,%s)""",
            (row["id"], current, destination, actor["id"]),
        )
        changed += 1
    return {"changed": changed}


def dispatch(actor, parts, method, body, query):
    admin(actor)
    with get_db_cursor() as cur:
        if not parts and method == "GET":
            return list_batches(cur, query)
        if not parts and method == "POST":
            operation = "course_batch.create"
            mark = mutation(cur, actor, operation, body)
            if mark[2] is not None:
                return mark[2]
            created = save(
                cur, {key: value for key, value in body.items() if key != "request_id"}
            )
            response = {
                key: value.isoformat() if isinstance(value, date) else value
                for key, value in created.items()
            }
            remember(cur, actor, operation, mark, response)
            return response
        if parts == ["courses"] and method == "GET":
            cur.execute(
                "SELECT id,title FROM courses WHERE NOT archived ORDER BY title,id"
            )
            return cur.fetchall()
        if parts == ["trainers"] and method == "GET":
            search = query.get("search", "").strip()[:120]
            if len(search) < 2:
                return []
            cur.execute(
                """SELECT id,name,email FROM users
                   WHERE strpos(lower(concat_ws(' ',name,email)),lower(%s))>0
                   ORDER BY name NULLS LAST,email,id LIMIT 30""",
                (search,),
            )
            return cur.fetchall()
        if parts == ["roster"] and method == "GET":
            return roster(cur, query)
        if parts == ["assign"] and method == "POST":
            operation = "course_batch.assign"
            mark = mutation(cur, actor, operation, body)
            if mark[2] is not None:
                return mark[2]
            result = assign(cur, actor, body)
            remember(cur, actor, operation, mark, result)
            return result
        if len(parts) == 1 and method == "PATCH":
            return save(cur, body, identifier(parts[0]))
    raise ApiError(404, "Batch route not found")
