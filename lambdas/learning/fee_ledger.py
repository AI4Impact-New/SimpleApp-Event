"""Audited INR fee obligations, installment schedules, receipts and as-of reporting."""

import csv, io, json, uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from decimal import Decimal
from psycopg2.errors import UniqueViolation
from shared.db import get_db_cursor, execute_query
from learning.validation import ApiError, identifier, integer, text
from learning.service import admin
from programme.common import mutation, remember, emit, utcnow

ZONE = ZoneInfo("Asia/Kolkata")
BUCKETS = ["not_due", "1_15", "16_30", "31_60", "60_plus"]


def _fields(body, allowed):
    if not isinstance(body, dict) or set(body) - allowed - {"request_id"}:
        raise ApiError(400, "Unknown request field")


def today():
    return datetime.now(ZONE).date()


def day(value=None, name="date", future=False):
    try:
        r = date.fromisoformat(value) if value else today()
    except (ValueError, TypeError):
        raise ApiError(400, f"Invalid {name}")
    if not future and r > today():
        raise ApiError(400, f"{name} cannot be in the future")
    return r


def cutoff(d):
    return datetime.combine(d + timedelta(days=1), time.min, ZONE)


def bucket(days):
    return (
        "not_due"
        if days <= 0
        else (
            "1_15"
            if days <= 15
            else "16_30" if days <= 30 else "31_60" if days <= 60 else "60_plus"
        )
    )


def mode(value=None):
    from learning.payments import credentials

    value = value or credentials()["mode"]
    if value not in ("test", "live"):
        raise ApiError(400, "Use test or live mode")
    return value


def audit(cur, actor, aid, action, body):
    cur.execute(
        "INSERT INTO fee_audit(account_id,actor_id,action,request_id,details) VALUES(%s,%s,%s,%s,%s::jsonb)",
        (
            aid,
            actor["id"],
            action,
            body["request_id"],
            json.dumps(
                {k: v for k, v in body.items() if k != "request_id"}, default=str
            ),
        ),
    )


def own(cur, actor, aid, lock=False):
    cur.execute(
        "SELECT a.*,coalesce(u.name,u.email) AS name,u.email,c.title AS course_title FROM fee_accounts a JOIN users u ON u.id=a.user_id JOIN courses c ON c.id=a.course_id WHERE a.id=%s"
        + (" FOR UPDATE OF a" if lock else ""),
        (identifier(aid),),
    )
    row = cur.fetchone()
    if not row or (not actor["admin"] and str(row["user_id"]) != actor["id"]):
        raise ApiError(404, "Fee account not found")
    return row


def _schedule(cur, aid, asof):
    cur.execute(
        "SELECT id,version FROM fee_plans WHERE account_id=%s AND effective_on<=%s ORDER BY version DESC LIMIT 1",
        (aid, asof),
    )
    p = cur.fetchone()
    if not p:
        return []
    cur.execute(
        "SELECT * FROM fee_installments WHERE plan_id=%s ORDER BY number", (p["id"],)
    )
    return cur.fetchall()


def _row(
    cur,
    a,
    asof,
    prefetched_totals=None,
    prefetched_schedule=None,
    prefetched_credits=None,
):
    if prefetched_totals is None:
        cur.execute(
            "SELECT kind,coalesce(sum(amount_paise),0) AS amount FROM fee_entries WHERE account_id=%s AND effective_at<%s GROUP BY kind",
            (a["id"], cutoff(asof)),
        )
        totals = {r["kind"]: int(r["amount"]) for r in cur.fetchall()}
    else:
        totals = prefetched_totals
    billed = max(0, int(a["total_paise"]) + totals.get("fee_adjustment", 0))
    paid = sum(v for k, v in totals.items() if k != "fee_adjustment")
    outstanding = max(0, billed - paid)
    lines = [
        dict(r)
        for r in (
            prefetched_schedule
            if prefetched_schedule is not None
            else _schedule(cur, a["id"], asof)
        )
    ]
    if prefetched_credits is None:
        cur.execute(
            "SELECT coalesce(i.number,1) AS number,-sum(e.amount_paise) AS amount FROM fee_entries e LEFT JOIN payment_orders p ON p.id=e.payment_order_id LEFT JOIN fee_installments i ON i.id=p.fee_installment_id WHERE e.account_id=%s AND e.kind='fee_adjustment' AND e.effective_at<%s GROUP BY coalesce(i.number,1) ORDER BY number",
            (a["id"], cutoff(asof)),
        )
        credits = cur.fetchall()
    else:
        credits = prefetched_credits
    for line in lines:
        line["adjusted_amount_paise"] = int(line["amount_paise"])
    for item in credits:
        remaining = max(0, int(item["amount"]))
        start = max(0, int(item["number"]) - 1)
        # Follow the refunded payment's starting installment; historical paid
        # prefixes stay stable across schedule versions. Wrap for cancellation.
        for index in [*range(start, len(lines)), *range(0, min(start, len(lines)))]:
            reduction = min(remaining, lines[index]["adjusted_amount_paise"])
            lines[index]["adjusted_amount_paise"] -= reduction
            remaining -= reduction
    available = max(0, paid)
    overdue = 0
    oldest = 0
    aging = {b: 0 for b in BUCKETS}
    next_due = None
    for l in lines:
        credited = min(available, l["adjusted_amount_paise"])
        available -= credited
        l["paid_paise"] = credited
        l["outstanding_paise"] = l["adjusted_amount_paise"] - credited
        days = max(0, (asof - l["due_on"]).days)
        l["overdue_days"] = days if l["outstanding_paise"] else 0
        if l["outstanding_paise"]:
            aging[bucket(days)] += l["outstanding_paise"]
            oldest = max(oldest, days)
            if days:
                overdue += l["outstanding_paise"]
            if next_due is None:
                next_due = {
                    "date": l["due_on"],
                    "number": l["number"],
                    "amount_paise": l["outstanding_paise"],
                    "id": str(l["id"]),
                }
    state = (
        "refunded"
        if billed == 0
        else (
            "overdue"
            if overdue
            else "paid" if outstanding == 0 else "part_paid" if paid > 0 else "unpaid"
        )
    )
    return {
        **dict(a),
        "billed_paise": billed,
        "paid_paise": paid,
        "outstanding_paise": outstanding,
        "credit_paise": max(0, paid - billed),
        "overdue_paise": overdue,
        "overdue_days": oldest,
        "aging": aging,
        "next_due": next_due,
        "status": state,
        "installments": lines,
    }


def report(actor, query):
    admin(actor)
    asof = day(query.get("as_of"))
    m = mode(query.get("mode"))
    params = [m, asof]
    where = ["a.mode=%s", "a.billed_on<=%s"]
    for field, column in [("course_id", "a.course_id"), ("trainer_id", "b.trainer_id")]:
        if query.get(field):
            where.append(column + "=%s")
            params.append(identifier(query[field]))
    if query.get("month"):
        try:
            month = date.fromisoformat(query["month"] + "-01")
        except ValueError:
            raise ApiError(400, "Invalid batch month")
        where.append("date_trunc('month',b.starts_on)=%s")
        params.append(month)
    with get_db_cursor() as cur:
        cur.execute(
            """SELECT a.*,coalesce(u.name,u.email) AS name,u.email,c.title AS course_title,b.code AS batch_code,b.starts_on AS batch_start,t.name AS trainer_name,b.trainer_id
            FROM fee_accounts a JOIN users u ON u.id=a.user_id JOIN courses c ON c.id=a.course_id LEFT JOIN fee_batches b ON b.id=a.batch_id LEFT JOIN users t ON t.id=b.trainer_id
            WHERE """
            + " AND ".join(where)
            + " ORDER BY a.id LIMIT 10001",
            params,
        )
        accounts = cur.fetchall()
        if len(accounts) > 10000:
            raise ApiError(
                413, "Narrow the course, trainer or batch-month filter for this report"
            )
        account_ids = [a["id"] for a in accounts]
        cur.execute(
            "SELECT account_id,kind,sum(amount_paise) AS amount FROM fee_entries WHERE account_id=ANY(%s::uuid[]) AND effective_at<%s GROUP BY account_id,kind",
            (account_ids, cutoff(asof)),
        )
        sums = {}
        for item in cur.fetchall():
            sums.setdefault(str(item["account_id"]), {})[item["kind"]] = int(
                item["amount"]
            )
        cur.execute(
            "SELECT DISTINCT ON(account_id) id,account_id FROM fee_plans WHERE account_id=ANY(%s::uuid[]) AND effective_on<=%s ORDER BY account_id,version DESC",
            (account_ids, asof),
        )
        plans = cur.fetchall()
        cur.execute(
            "SELECT i.*,p.account_id FROM fee_installments i JOIN fee_plans p ON p.id=i.plan_id WHERE p.id=ANY(%s::uuid[]) ORDER BY p.account_id,i.number",
            ([p["id"] for p in plans],),
        )
        schedules = {}
        for item in cur.fetchall():
            schedules.setdefault(str(item["account_id"]), []).append(item)
        cur.execute(
            "SELECT account_id,string_agg(reference,' ') AS refs FROM fee_entries WHERE account_id=ANY(%s::uuid[]) AND effective_at<%s GROUP BY account_id",
            (account_ids, cutoff(asof)),
        )
        references = {str(item["account_id"]): item["refs"] for item in cur.fetchall()}
        cur.execute(
            "SELECT e.account_id,coalesce(i.number,1) AS number,-sum(e.amount_paise) AS amount FROM fee_entries e LEFT JOIN payment_orders p ON p.id=e.payment_order_id LEFT JOIN fee_installments i ON i.id=p.fee_installment_id WHERE e.account_id=ANY(%s::uuid[]) AND e.kind='fee_adjustment' AND e.effective_at<%s GROUP BY e.account_id,coalesce(i.number,1) ORDER BY number",
            (account_ids, cutoff(asof)),
        )
        fee_credits = {}
        for item in cur.fetchall():
            fee_credits.setdefault(str(item["account_id"]), []).append(item)

        rows = []
        search = str(query.get("search", "")).strip().lower()
        for a in accounts:
            if search:
                hay = (
                    " ".join(
                        str(a.get(k) or "")
                        for k in [
                            "name",
                            "email",
                            "course_title",
                            "batch_code",
                            "trainer_name",
                        ]
                    )
                    + " "
                    + references.get(str(a["id"]), "")
                )
                if search not in hay.lower():
                    continue
            rows.append(
                _row(
                    cur,
                    a,
                    asof,
                    sums.get(str(a["id"]), {}),
                    schedules.get(str(a["id"]), []),
                    fee_credits.get(str(a["id"]), []),
                )
            )
        if query.get("age"):
            if query["age"] not in BUCKETS:
                raise ApiError(400, "Invalid aging bucket")
            rows = [r for r in rows if r["aging"][query["age"]] > 0]
        status = query.get("status", "all")
        if status not in (
            "all",
            "overdue",
            "due_7",
            "part_paid",
            "unpaid",
            "paid",
            "failed",
        ):
            raise ApiError(400, "Invalid status filter")
        cur.execute(
            """SELECT p.fee_account_id,count(*) AS n FROM fee_payment_attempts f JOIN payment_orders p ON p.id=f.payment_order_id WHERE f.status='failed' AND f.attempted_at>=%s AND f.attempted_at<%s AND p.mode=%s GROUP BY p.fee_account_id""",
            (cutoff(asof) - timedelta(days=30), cutoff(asof), m),
        )
        failed = {str(x["fee_account_id"]): x["n"] for x in cur.fetchall()}
        for r in rows:
            r["failed_attempts"] = int(failed.get(str(r["id"]), 0))
        if status == "failed":
            rows = [r for r in rows if r["failed_attempts"]]
        elif status == "due_7":
            rows = [
                r
                for r in rows
                if any(
                    l["outstanding_paise"]
                    and asof <= l["due_on"] <= asof + timedelta(days=7)
                    for l in r["installments"]
                )
            ]
        elif status != "all":
            rows = [r for r in rows if r["status"] == status]
        attempt_where = [
            "p.mode=%s",
            "f.status='failed'",
            "f.attempted_at>=%s",
            "f.attempted_at<%s",
        ]
        attempt_params = [m, cutoff(asof) - timedelta(days=30), cutoff(asof)]
        for field, column in [
            ("course_id", "p.course_id"),
            ("trainer_id", "fb.trainer_id"),
        ]:
            if query.get(field):
                attempt_where.append(column + "=%s")
                attempt_params.append(identifier(query[field]))
        if query.get("month"):
            attempt_where.append("date_trunc('month',fb.starts_on)=%s")
            attempt_params.append(date.fromisoformat(query["month"] + "-01"))
        if search:
            attempt_where.append(
                "concat_ws(' ',p.buyer_name,p.buyer_email,p.course_title,p.provider_order_id,f.provider_payment_id) ILIKE %s"
            )
            attempt_params.append("%" + search + "%")
        if query.get("age"):
            attempt_where.append("p.fee_account_id=ANY(%s::uuid[])")
            attempt_params.append([r["id"] for r in rows])
        cur.execute(
            "SELECT f.*,p.buyer_name,p.buyer_email,p.course_title,p.provider_order_id,p.fee_account_id,count(*) OVER() AS total_count FROM fee_payment_attempts f JOIN payment_orders p ON p.id=f.payment_order_id LEFT JOIN fee_accounts fa ON fa.id=p.fee_account_id LEFT JOIN fee_batches fb ON fb.id=fa.batch_id WHERE "
            + " AND ".join(attempt_where)
            + " ORDER BY f.attempted_at DESC LIMIT 200",
            attempt_params,
        )
        attempts = cur.fetchall()
        failure_total = int(attempts[0]["total_count"]) if attempts else 0
        sort = query.get("sort", "outstanding")
        if sort not in ("outstanding", "name", "due"):
            raise ApiError(400, "Invalid sort")
        rows.sort(
            key=(
                (lambda r: (-r["outstanding_paise"], r["name"]))
                if sort == "outstanding"
                else (
                    (lambda r: r["name"].lower())
                    if sort == "name"
                    else (
                        lambda r: r["next_due"]["date"] if r["next_due"] else date.max
                    )
                )
            )
        )
        cur.execute(
            """SELECT count(*) AS n FROM payment_orders WHERE mode=%s AND status='pending' AND expires_at<%s AND expires_at>=%s""",
            (m, cutoff(asof), cutoff(asof) - timedelta(days=30)),
        )
        expired = cur.fetchone()["n"]
        cur.execute("SELECT id,title FROM courses WHERE archived=false ORDER BY title")
        courses = cur.fetchall()
        cur.execute(
            "SELECT b.*,u.name AS trainer_name FROM fee_batches b LEFT JOIN users u ON u.id=b.trainer_id ORDER BY starts_on DESC,code"
        )
        batches = cur.fetchall()
    totals = {
        k: sum(r[k] for r in rows)
        for k in [
            "billed_paise",
            "paid_paise",
            "outstanding_paise",
            "credit_paise",
            "overdue_paise",
        ]
    }
    totals.update(
        {
            "enrollments": len(rows),
            "students_owing": len(
                {str(r["user_id"]) for r in rows if r["outstanding_paise"]}
            ),
            "overdue_students": len(
                {str(r["user_id"]) for r in rows if r["overdue_paise"]}
            ),
            "oldest_days": max([r["overdue_days"] for r in rows], default=0),
            "failed_attempts": failure_total,
            "expired_checkouts": expired,
        }
    )
    aging = [
        {
            "key": b,
            "amount_paise": sum(r["aging"][b] for r in rows),
            "students": len({str(r["user_id"]) for r in rows if r["aging"][b]}),
        }
        for b in BUCKETS
    ]
    return {
        "as_of": asof,
        "mode": m,
        "currency": "INR",
        "totals": totals,
        "aging": aging,
        "accounts": rows,
        "courses": courses,
        "batches": batches,
        "attempts": attempts,
        "attempt_count": failure_total,
        "scope": "Verified Razorpay collections plus agreed fee plans and cleared offline payments. Legacy demo quotes excluded. Aging counts may overlap across installments.",
    }


def detail(actor, aid, query=None):
    asof = day((query or {}).get("as_of"))
    with get_db_cursor() as cur:
        a = own(cur, actor, aid)
        r = _row(cur, a, asof)
        cur.execute(
            "SELECT * FROM fee_entries WHERE account_id=%s AND effective_at<%s ORDER BY effective_at,created_at,id",
            (a["id"], cutoff(asof)),
        )
        r["entries"] = cur.fetchall()
        cur.execute(
            "SELECT * FROM fee_receipts WHERE account_id=%s ORDER BY created_at DESC",
            (a["id"],),
        )
        r["receipts"] = cur.fetchall()
        cur.execute(
            "SELECT id,status,total_paise,refunded_paise,provider_order_id,provider_payment_id,created_at FROM payment_orders WHERE fee_account_id=%s ORDER BY created_at DESC",
            (a["id"],),
        )
        r["orders"] = cur.fetchall()
        cur.execute(
            "SELECT action,actor_id,details,created_at FROM fee_audit WHERE account_id=%s ORDER BY created_at DESC",
            (a["id"],),
        )
        r["audit"] = cur.fetchall() if actor["admin"] else []
        cur.execute(
            "SELECT e.title,e.created_at,coalesce(d.status,'outbox') AS status,d.error_code,d.provider_id FROM notification_events e LEFT JOIN notification_deliveries d ON d.event_id=e.id AND d.channel='email' WHERE e.entity_type='fee_account' AND e.entity_id=%s ORDER BY e.created_at DESC",
            (a["id"],),
        )
        r["emails"] = cur.fetchall()
        r["as_of"] = asof
    return r


def _plan(cur, actor, a, lines, version, effective):
    if not isinstance(lines, list) or not 1 <= len(lines) <= 24:
        raise ApiError(400, "Provide 1 to 24 installments")
    total = 0
    last = a["billed_on"]
    validated = []
    for n, line in enumerate(lines, 1):
        if not isinstance(line, dict) or set(line) - {"amount_paise", "due_on"}:
            raise ApiError(400, "Each installment needs amount_paise and due_on")
        due = day(line.get("due_on"), "due date", True)
        amount = integer(
            line.get("amount_paise"), 100, 1000000000, "installment amount"
        )
        if due < last:
            raise ApiError(
                400, "Installments must be ordered by due date, after billing date"
            )
        total += amount
        last = due
        validated.append((n, amount, due))
    if total != int(a["total_paise"]):
        raise ApiError(400, "Installments must sum to the agreed total")
    if version > 1:
        old = _row(cur, a, today())
        allocated = 0
        for oldline, newline in zip(old["installments"], validated):
            if oldline["paid_paise"] and (
                oldline["number"] != newline[0]
                or int(oldline["amount_paise"]) != newline[1]
                or oldline["due_on"] != newline[2]
            ):
                raise ApiError(409, "Keep paid and partly paid installments unchanged")
            allocated += oldline["paid_paise"]
        if sum(l["paid_paise"] for l in old["installments"]) != allocated:
            raise ApiError(409, "Cannot remove a paid installment")
    cur.execute(
        "INSERT INTO fee_plans(account_id,version,effective_on,created_by) VALUES(%s,%s,%s,%s) RETURNING id",
        (a["id"], version, effective, actor["id"]),
    )
    pid = cur.fetchone()["id"]
    for n, amount, due in validated:
        cur.execute(
            "INSERT INTO fee_installments(plan_id,number,amount_paise,due_on) VALUES(%s,%s,%s,%s)",
            (pid, n, amount, due),
        )


def create_account(actor, body):
    admin(actor)
    _fields(
        body,
        {
            "user_id",
            "buyer_email",
            "course_id",
            "batch_id",
            "mode",
            "marked_price_paise",
            "discount_bps",
            "billed_on",
            "installments",
        },
    )
    uid = identifier(body["user_id"]) if body.get("user_id") else None
    cid = identifier(body.get("course_id"))
    m = mode(body.get("mode"))
    billed = day(body.get("billed_on"), "billing date")
    from learning.billing import amounts

    price = amounts(
        integer(body.get("marked_price_paise"), 100, 1000000000, "marked price"),
        integer(body.get("discount_bps", 0), 0, 10000, "discount"),
    )
    if price["total_paise"] < 100:
        raise ApiError(400, "Ledger plans must have a positive payable fee")
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, "fee.account.create", body)
        if mark[2] is not None:
            return mark[2]
        if uid is None:
            from programme.common import email

            cur.execute(
                "SELECT id FROM users WHERE lower(email)=%s",
                (email(body.get("buyer_email")),),
            )
            buyer = cur.fetchone()
            if not buyer:
                raise ApiError(
                    404, "Existing student profile not found; complete onboarding first"
                )
            uid = str(buyer["id"])
        cur.execute("SELECT 1 FROM users WHERE id=%s", (uid,))
        exists = cur.fetchone()
        cur.execute("SELECT 1 FROM courses WHERE id=%s AND archived=false", (cid,))
        if not exists or not cur.fetchone():
            raise ApiError(404, "Student or course not found")
        bid = identifier(body["batch_id"]) if body.get("batch_id") else None
        if not bid:
            cur.execute(
                """SELECT b.id FROM course_registrations r JOIN fee_batches b ON b.id=r.batch_id
                   WHERE r.course_id=%s AND r.user_id=%s AND r.status IN ('registered','completed')
                     AND b.archived_at IS NULL""",
                (cid, uid),
            )
            assigned = cur.fetchone()
            bid = assigned["id"] if assigned else None
        if bid:
            cur.execute(
                "SELECT 1 FROM fee_batches WHERE id=%s AND course_id=%s AND archived_at IS NULL FOR SHARE",
                (bid, cid),
            )
            if not cur.fetchone():
                raise ApiError(400, "Choose an active batch for this course")
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
            ("fee-account:" + uid + cid + m,),
        )
        cur.execute(
            "SELECT id FROM fee_accounts WHERE user_id=%s AND course_id=%s AND mode=%s AND source_order_id IS NULL AND closed_at IS NULL",
            (uid, cid, m),
        )
        if cur.fetchone():
            raise ApiError(
                409, "An agreed fee account already exists for this student and course"
            )
        cur.execute(
            "INSERT INTO fee_accounts(request_id,user_id,course_id,batch_id,mode,marked_price_paise,discount_bps,total_paise,billed_on,created_by) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            (
                mark[0],
                uid,
                cid,
                bid,
                m,
                price["marked_price_paise"],
                price["discount_bps"],
                price["total_paise"],
                billed,
                actor["id"],
            ),
        )
        a = cur.fetchone()
        _plan(cur, actor, a, body.get("installments"), 1, billed)
        audit(cur, actor, a["id"], "account.created", body)
        result = {"id": str(a["id"])}
        remember(cur, actor, "fee.account.create", mark, result)
        return result


def edit_plan(actor, aid, body):
    admin(actor)
    _fields(body, {"version", "installments"})
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, "fee.plan.update:" + identifier(aid), body)
        if mark[2] is not None:
            return mark[2]
        a = own(cur, actor, aid, True)
        if a["closed_at"]:
            raise ApiError(
                409, "This fee obligation is cancelled; create a new agreement instead"
            )
        if a["source_order_id"]:
            raise ApiError(
                409, "A completed retail checkout cannot be converted into a new debt"
            )
        if body.get("version") != a["version"]:
            raise ApiError(409, "Plan changed; reload before editing")
        _plan(cur, actor, a, body.get("installments"), a["version"] + 1, today())
        cur.execute(
            "UPDATE payment_orders SET expires_at=now() WHERE fee_account_id=%s AND status='pending'",
            (a["id"],),
        )
        cur.execute("UPDATE fee_accounts SET version=version+1 WHERE id=%s", (a["id"],))
        audit(cur, actor, a["id"], "plan.updated", body)
        result = {"id": str(a["id"]), "version": a["version"] + 1}
        remember(cur, actor, "fee.plan.update:" + aid, mark, result)
        return result


def create_batch(actor, body):
    admin(actor)
    _fields(body, {"code", "course_id", "trainer_id", "trainer_email", "starts_on"})
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, "fee.batch.create", body)
        if mark[2] is not None:
            return mark[2]
        trainer = identifier(body["trainer_id"]) if body.get("trainer_id") else None
        if not trainer and body.get("trainer_email"):
            from programme.common import email

            cur.execute(
                "SELECT id FROM users WHERE lower(email)=%s",
                (email(body["trainer_email"]),),
            )
            person = cur.fetchone()
            if not person:
                raise ApiError(404, "Trainer account not found")
            trainer = person["id"]
        cur.execute(
            "INSERT INTO fee_batches(code,course_id,trainer_id,starts_on) VALUES(%s,%s,%s,%s) RETURNING id",
            (
                text(body.get("code"), "batch code", 100),
                identifier(body.get("course_id")),
                trainer,
                day(body.get("starts_on"), "batch start", True),
            ),
        )
        result = {"id": str(cur.fetchone()["id"])}
        remember(cur, actor, "fee.batch.create", mark, result)
        return result


def sync_access(cur, aid):
    cur.execute("SELECT * FROM fee_accounts WHERE id=%s FOR UPDATE", (aid,))
    a = cur.fetchone()
    if not a or a["source_order_id"]:
        return
    cur.execute(
        "SELECT coalesce(sum(amount_paise),0) AS n FROM fee_entries WHERE account_id=%s AND kind<>'fee_adjustment'",
        (aid,),
    )
    collected = int(cur.fetchone()["n"])
    source = "fee-account:" + str(aid)
    schedule = _row(cur, a, today())["installments"]
    first = next((line for line in schedule if line["adjusted_amount_paise"] > 0), None)
    access_ready = bool(
        not a["closed_at"]
        and collected > 0
        and first
        and first["outstanding_paise"] == 0
    )
    if access_ready:
        cur.execute(
            """INSERT INTO course_registrations(user_id,course_id,status,source) VALUES(%s,%s,'registered',%s)
            ON CONFLICT(course_id,user_id) DO UPDATE SET status=CASE WHEN course_registrations.status='completed' THEN 'completed' ELSE 'registered' END,
            source=CASE WHEN course_registrations.status IN ('registered','completed') THEN course_registrations.source ELSE excluded.source END,updated_at=now()""",
            (a["user_id"], a["course_id"], source),
        )
    else:
        cur.execute(
            "UPDATE course_registrations SET status='dropped',updated_at=now() WHERE user_id=%s AND course_id=%s AND source=%s",
            (a["user_id"], a["course_id"], source),
        )


def _offline_event(cur, a, rid, status):
    title = {
        "pending": "Cheque received - awaiting clearance",
        "paid": "Offline payment received",
        "reversed": "Offline payment reversed",
    }[status]
    prefix = "[TEST] " if a["mode"] == "test" else ""
    emit(
        cur,
        "fees:receipt:" + str(rid) + ":" + status,
        str(a["user_id"]),
        str(a["course_id"]),
        "fees",
        prefix + title,
        prefix
        + "A payment record for "
        + a.get("course_title", "your course")
        + " is "
        + status
        + ". Open your fee statement for the amount, reference and updated balance.",
        "fee_account",
        str(a["id"]),
        utcnow() + timedelta(days=7),
    )
    _save_snapshot(cur, a, "fees:receipt:" + str(rid) + ":" + status)


def receipt(actor, aid, body):
    admin(actor)
    _fields(body, {"method", "amount_paise", "reference", "received_on", "note"})
    method = body.get("method")
    if method not in ("cash", "bank", "offline_upi", "cheque"):
        raise ApiError(400, "Choose cash, bank, offline UPI or cheque")
    amount = integer(body.get("amount_paise"), 100, 1000000000, "amount")
    reference = body.get("reference") or ""
    if not isinstance(reference, str):
        raise ApiError(400, "Payment reference must be text")
    reference = reference.strip()
    if len(reference) > 200 or (method != "cash" and not reference):
        raise ApiError(400, "A payment reference is required (maximum 200 characters)")
    received = day(body.get("received_on"), "received date")
    note = body.get("note") or ""
    if not isinstance(note, str):
        raise ApiError(400, "Note must be text")
    note = note.strip()
    if len(note) > 1000:
        raise ApiError(400, "Note is too long")
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, "fee.receipt:" + identifier(aid), body)
        if mark[2] is not None:
            return mark[2]
        a = own(cur, actor, aid, True)
        if received < a["billed_on"]:
            raise ApiError(400, "Payment cannot precede this account billing date")
        if reference:
            cur.execute(
                "SELECT 1 FROM fee_entries e JOIN fee_accounts a ON a.id=e.account_id WHERE a.mode=%s AND e.reference=%s AND e.payment_order_id IS NOT NULL LIMIT 1",
                (a["mode"], reference),
            )
            if cur.fetchone():
                raise ApiError(
                    409,
                    "This reference is already recorded from Razorpay; do not record it offline",
                )
        if amount > _row(cur, a, today())["outstanding_paise"]:
            raise ApiError(409, "Amount exceeds the current outstanding balance")
        state = "pending" if method == "cheque" else "cleared"
        try:
            cur.execute(
                "INSERT INTO fee_receipts(request_id,account_id,mode,method,amount_paise,reference,received_on,status,cleared_at,created_by,note) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,CASE WHEN %s THEN now() ELSE NULL END,%s,%s) RETURNING id",
                (
                    mark[0],
                    a["id"],
                    a["mode"],
                    method,
                    amount,
                    reference,
                    received,
                    state,
                    state == "cleared",
                    actor["id"],
                    note,
                ),
            )
            rid = cur.fetchone()["id"]
        except UniqueViolation:
            raise ApiError(
                409, "This offline payment reference has already been recorded"
            ) from None
        if state == "cleared":
            cur.execute(
                "INSERT INTO fee_entries(account_id,kind,amount_paise,source_key,reference,effective_at,created_by,note) VALUES(%s,'payment',%s,%s,%s,%s,%s,%s)",
                (
                    a["id"],
                    amount,
                    "offline:" + str(rid),
                    reference,
                    datetime.combine(received, time(12), ZONE),
                    actor["id"],
                    note,
                ),
            )
            sync_access(cur, a["id"])
        audit(cur, actor, a["id"], "receipt." + state, body)
        _offline_event(cur, a, rid, "pending" if state == "pending" else "paid")
        result = {"id": str(rid), "status": state}
        remember(cur, actor, "fee.receipt:" + aid, mark, result)
        return result


def change_receipt(actor, aid, rid, body):
    admin(actor)
    _fields(body, {"action", "reason"})
    action = body.get("action")
    if action not in ("clear", "reverse"):
        raise ApiError(400, "Choose clear or reverse")
    reason = text(body.get("reason"), "reason", 1000)
    with get_db_cursor() as cur:
        mark = mutation(
            cur, actor, "fee.receipt." + action + ":" + identifier(rid), body
        )
        if mark[2] is not None:
            return mark[2]
        a = own(cur, actor, aid, True)
        cur.execute(
            "SELECT * FROM fee_receipts WHERE id=%s AND account_id=%s FOR UPDATE",
            (rid, aid),
        )
        r = cur.fetchone()
        if not r:
            raise ApiError(404, "Receipt not found")
        if action == "clear":
            if r["status"] != "pending":
                raise ApiError(409, "Only pending receipts can be cleared")
            if int(r["amount_paise"]) > _row(cur, a, today())["outstanding_paise"]:
                raise ApiError(
                    409,
                    "Clearing would overpay the account; review other payments first",
                )
            cur.execute(
                "UPDATE fee_receipts SET status='cleared',cleared_at=now() WHERE id=%s",
                (rid,),
            )
            cur.execute(
                "INSERT INTO fee_entries(account_id,kind,amount_paise,source_key,reference,effective_at,created_by,note) VALUES(%s,'payment',%s,%s,%s,now(),%s,%s)",
                (
                    aid,
                    r["amount_paise"],
                    "offline:" + rid,
                    r["reference"],
                    actor["id"],
                    reason,
                ),
            )
        else:
            if r["status"] == "reversed":
                raise ApiError(409, "Receipt was already reversed")
            cur.execute(
                "UPDATE fee_receipts SET status='reversed',reversed_at=now() WHERE id=%s",
                (rid,),
            )
            if r["status"] == "cleared":
                cur.execute(
                    "INSERT INTO fee_entries(account_id,kind,amount_paise,source_key,reference,effective_at,created_by,note) VALUES(%s,'reversal',%s,%s,%s,now(),%s,%s)",
                    (
                        aid,
                        -r["amount_paise"],
                        "offline:reverse:" + rid,
                        r["reference"],
                        actor["id"],
                        reason,
                    ),
                )
        sync_access(cur, aid)
        audit(cur, actor, aid, "receipt." + action, body)
        _offline_event(cur, a, rid, "paid" if action == "clear" else "reversed")
        result = {"id": rid, "status": "cleared" if action == "clear" else "reversed"}
        remember(cur, actor, "fee.receipt." + action + ":" + rid, mark, result)
        return result


def pay_link(actor, aid, body):
    _fields(body, {"amount_paise"})
    from learning import payments

    if not payments.enabled():
        raise ApiError(503, "Online checkout is currently disabled")
    config = payments.credentials()
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, "fee.pay-link:" + identifier(aid), body)
        if mark[2] is not None:
            oid = mark[2]["id"]
        else:
            a = own(cur, actor, aid, True)
            if a["mode"] != config["mode"]:
                raise ApiError(
                    409, "This fee account belongs to a different Razorpay mode"
                )
            if config["mode"] == "test" and not payments.allowed_test_buyer(
                a["email"], config
            ):
                raise ApiError(403, "This student is not an authorized test buyer")
            snapshot = _row(cur, a, today())
            next_due = snapshot["next_due"]
            if not next_due:
                raise ApiError(409, "No amount is outstanding")
            amount = integer(
                body.get("amount_paise", next_due["amount_paise"]),
                100,
                1000000000,
                "amount",
            )
            if amount < next_due["amount_paise"]:
                raise ApiError(
                    400,
                    "A checkout link must cover at least the next installment balance",
                )
            if amount > snapshot["outstanding_paise"]:
                raise ApiError(409, "Amount exceeds the outstanding balance")
            cur.execute(
                "SELECT * FROM payment_orders WHERE fee_account_id=%s AND status='pending' AND expires_at>now() ORDER BY created_at DESC LIMIT 1",
                (aid,),
            )
            pending = cur.fetchone()
            if pending and int(pending["total_paise"]) != amount:
                raise ApiError(
                    409,
                    "An active payment link has another amount; resolve it before creating a different link",
                )
            if pending:
                oid = str(pending["id"])
            else:
                oid = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO payment_orders(id,request_id,user_id,course_id,course_title,buyer_name,buyer_email,marked_price_paise,discount_bps,discount_paise,total_paise,mode,created_by,fee_account_id,fee_installment_id)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,0,0,%s,%s,%s,%s,%s)""",
                    (
                        oid,
                        mark[0],
                        a["user_id"],
                        a["course_id"],
                        a["course_title"],
                        a["name"] or "Learner",
                        a["email"],
                        amount,
                        amount,
                        a["mode"],
                        actor["id"],
                        aid,
                        next_due["id"],
                    ),
                )
            audit(cur, actor, aid, "payment-link.created", body)
            remember(cur, actor, "fee.pay-link:" + aid, mark, {"id": oid})
    return payments.checkout(actor, oid, as_admin=actor["admin"])


def _notice_copy(cur, a, r, kind):
    title = (
        "Fee reminder: " + a["course_title"]
        if kind == "reminder"
        else "Your fee statement: " + a["course_title"]
    )
    title = title[:200]
    content = f"Hello {a['name'] or 'Learner'},\nYour outstanding fee for {a['course_title']} is INR {Decimal(r['outstanding_paise'])/100:,.2f}."
    if r["next_due"]:
        content += (
            "\nNext due: "
            + r["next_due"]["date"].isoformat()
            + f" (INR {Decimal(r['next_due']['amount_paise'])/100:,.2f})."
        )
    if kind == "reminder":
        cur.execute(
            "SELECT * FROM payment_orders WHERE fee_account_id=%s AND status='pending' AND expires_at>now() ORDER BY created_at DESC LIMIT 1",
            (a["id"],),
        )
        order = cur.fetchone()
        if order:
            from learning.payments import response

            content += "\nPay securely: " + response(order)["checkout_url"]
    content += "\nSign in to AI4Impact or reply to support@ai4impact.in if you need assistance."
    if a["mode"] == "test":
        title = "[TEST] " + title
        content = "[TEST] " + content
    return title, content


def notice(actor, aid, body):
    admin(actor)
    _fields(body, {"kind", "from_on", "as_of"})
    kind = body.get("kind", "reminder")
    asof = day(body.get("as_of"))
    if kind == "reminder" and asof != today():
        raise ApiError(400, "Reminders must use the current balance")
    if kind not in ("reminder", "statement"):
        raise ApiError(400, "Choose reminder or statement")
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, "fee.email." + kind + ":" + identifier(aid), body)
        if mark[2] is not None:
            return mark[2]
        a = own(cur, actor, aid, True)
        r = _row(cur, a, asof)
        if kind == "reminder" and not r["outstanding_paise"]:
            raise ApiError(
                409, "There is no outstanding fee to remind this student about"
            )
        # One reminder per account per day; statement copies remain explicit staff actions.
        if kind == "reminder":
            cur.execute(
                "SELECT 1 FROM fee_audit WHERE account_id=%s AND action='email.reminder' AND created_at>=%s",
                (aid, datetime.combine(today(), time.min, ZONE)),
            )
            if cur.fetchone():
                raise ApiError(
                    429, "A reminder was already requested for this account today"
                )
        title, content = _notice_copy(cur, a, r, kind)
        emit(
            cur,
            "fees:" + kind + ":" + mark[0],
            str(a["user_id"]),
            str(a["course_id"]),
            "fees",
            title,
            content,
            "fee_account",
            aid,
            utcnow() + timedelta(days=2),
        )
        audit(cur, actor, aid, "email." + kind, body)
        _save_snapshot(
            cur,
            a,
            "fees:" + kind + ":" + mark[0],
            {"as_of": str(asof), "from_on": body.get("from_on")},
        )
        result = {"queued": True}
        remember(cur, actor, "fee.email." + kind + ":" + aid, mark, result)
        return result


def csv_bytes(rows):
    f = io.StringIO()
    w = csv.writer(f)
    w.writerow(
        [
            "Student",
            "Email",
            "Course",
            "Batch",
            "Mode",
            "Currency",
            "Billed INR",
            "Collected INR",
            "Outstanding INR",
            "Overdue INR",
            "Next due",
            "Status",
        ]
    )

    def safe(s):
        return (
            "'" + s
            if s and s.lstrip().startswith(("=", "+", "-", "@", "\t", "\r"))
            else s
        )

    for r in rows:
        w.writerow(
            [
                safe(str(r.get(k) or ""))
                for k in ["name", "email", "course_title", "batch_code", "mode"]
            ]
            + ["INR"]
            + [
                str(Decimal(r[k]) / 100)
                for k in [
                    "billed_paise",
                    "paid_paise",
                    "outstanding_paise",
                    "overdue_paise",
                ]
            ]
            + [str(r["next_due"]["date"]) if r["next_due"] else "", r["status"]]
        )
    return ("\ufeff" + f.getvalue()).encode("utf-8")


def statement(actor, aid, query=None, fmt="pdf"):
    r = detail(actor, aid, query)
    return _render_statement(r, query, fmt)


def _render_statement(r, query=None, fmt="pdf"):
    query = query or {}
    start = (
        day(query.get("from_on"), "statement start")
        if query.get("from_on")
        else r["billed_on"]
    )
    if start > r["as_of"]:
        raise ApiError(400, "Statement start must not be after its end date")
    prior = [
        e
        for e in r["entries"]
        if e["effective_at"] < datetime.combine(start, time.min, ZONE)
    ]
    opening_billed = (int(r["total_paise"]) if r["billed_on"] < start else 0) + sum(
        int(e["amount_paise"]) for e in prior if e["kind"] == "fee_adjustment"
    )
    opening_collected = sum(
        int(e["amount_paise"]) for e in prior if e["kind"] != "fee_adjustment"
    )
    entries = [e for e in r["entries"] if e not in prior]
    if fmt == "csv":
        f = io.StringIO()
        w = csv.writer(f)
        w.writerow(["Recorded at", "Effective at", "Kind", "Amount INR", "Reference"])
        for e in entries:
            ref = e["reference"]
            ref = "'" + ref if ref.lstrip().startswith(("=", "+", "-", "@")) else ref
            w.writerow(
                [
                    e["created_at"].isoformat(),
                    e["effective_at"].isoformat(),
                    e["kind"],
                    str(Decimal(e["amount_paise"]) / 100),
                    ref,
                ]
            )
        return ("\ufeff" + f.getvalue()).encode()
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import simpleSplit

    out = io.BytesIO()
    pdf = canvas.Canvas(out, pagesize=A4)
    width, height = A4
    y = height - 50

    def line(value, size=10):
        nonlocal y
        for textline in simpleSplit(value, "Helvetica", size, width - 85):
            if y < 55:
                pdf.showPage()
                y = height - 50
            pdf.setFont("Helvetica", size)
            pdf.drawString(42, y, textline)
            y -= size + 6

    line("AI4Impact - Statement of account", 20)
    line(
        "Period "
        + start.isoformat()
        + " to "
        + r["as_of"].isoformat()
        + " | INR | "
        + r["mode"].upper()
    )
    line("Prepared " + datetime.now(ZONE).strftime("%d %b %Y %H:%M %Z"), 9)
    line(r["name"] + " | " + r["email"])
    line(r["course_title"])
    line("Account " + str(r["id"]))
    line(
        "Opening outstanding: INR "
        + format(Decimal(max(0, opening_billed - opening_collected)) / 100, ",.2f")
    )
    for label, key in [
        ("Agreed billed fee", "billed_paise"),
        ("Cleared collections, net of refunds", "paid_paise"),
        ("Outstanding", "outstanding_paise"),
        ("Overdue", "overdue_paise"),
        ("Credit balance", "credit_paise"),
    ]:
        line(label + ": INR " + format(Decimal(r[key]) / 100, ",.2f"))
    y -= 12
    line("Payment trail", 13)
    for e in entries:
        line(
            e["effective_at"].astimezone(ZONE).strftime("%d %b %Y")
            + " | "
            + e["kind"]
            + " | INR "
            + format(Decimal(e["amount_paise"]) / 100, ",.2f")
            + " | "
            + e["reference"]
        )
    if not entries:
        line("No cleared payments recorded in this date range.")
    line(
        "Pending cheques are not included in collected totals. Not a GST tax invoice.",
        9,
    )
    if r["mode"] == "test":
        line("TEST MODE - simulated payment activity only.", 10)
    line("Support: support@ai4impact.in", 9)
    pdf.save()
    return out.getvalue()


def routes(actor, parts, method, body, query):
    admin(actor)
    # Parts are relative to /admin/billing/ledger.
    if not parts and method == "GET":
        return report(actor, query)
    if parts == ["accounts"] and method == "POST":
        return create_account(actor, body)
    if parts == ["batches"] and method == "POST":
        return create_batch(actor, body)
    if parts and len(parts) >= 2 and parts[0] == "accounts":
        aid = identifier(parts[1])
        if len(parts) == 2 and method == "GET":
            return detail(actor, aid, query)
        if len(parts) == 3:
            op = parts[2]
            if op == "preview" and method == "GET":
                return preview(actor, aid, query)
            if op == "plan" and method == "PUT":
                return edit_plan(actor, aid, body)
            if op == "receipts" and method == "POST":
                return receipt(actor, aid, body)
            if op == "pay-link" and method == "POST":
                return pay_link(actor, aid, body)
            if op == "email" and method == "POST":
                return notice(actor, aid, body)
        if len(parts) == 4 and parts[2] == "receipts" and method == "PATCH":
            return change_receipt(actor, aid, identifier(parts[3]), body)
    raise ApiError(404, "Ledger route not found")


def record_attempt(cur, order, payment):
    status = payment.get("status")
    if status not in ("created", "authorized", "failed", "captured", "refunded"):
        return
    stamp = payment.get("created_at")
    when = (
        datetime.fromtimestamp(stamp, timezone.utc)
        if isinstance(stamp, int)
        and not isinstance(stamp, bool)
        and 1262304000 <= stamp <= int(datetime.now(timezone.utc).timestamp()) + 86400
        else utcnow()
    )
    cur.execute(
        "INSERT INTO fee_payment_attempts(provider_payment_id,payment_order_id,status,reason,attempted_at) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(provider_payment_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,updated_at=now()",
        (
            payment["id"],
            order["id"],
            status,
            str(payment.get("error_code") or "")[:200],
            when,
        ),
    )


def linked_plan(cur, order):
    if not order.get("fee_account_id"):
        return False
    cur.execute(
        "SELECT source_order_id FROM fee_accounts WHERE id=%s",
        (order["fee_account_id"],),
    )
    a = cur.fetchone()
    return bool(a and a["source_order_id"] is None)


def preview(actor, aid, query):
    admin(actor)
    kind = query.get("kind", "reminder")
    if kind not in ("reminder", "statement"):
        raise ApiError(400, "Choose reminder or statement")
    with get_db_cursor() as cur:
        a = own(cur, actor, aid)
        r = _row(cur, a, day(query.get("as_of")))
        title, body = _notice_copy(cur, a, r, kind)
        return {
            "recipient": a["email"],
            "subject": title,
            "body": body,
            "template": "ai4impact-fee-" + kind + "-v1",
            "attachment": "Statement of account PDF",
        }


def _save_snapshot(cur, a, key, query=None):
    query = query or {}
    asof = day(query.get("as_of"))
    r = _row(cur, a, asof)
    r["as_of"] = asof
    cur.execute(
        "SELECT * FROM fee_entries WHERE account_id=%s AND effective_at<%s ORDER BY effective_at,created_at,id",
        (a["id"], cutoff(asof)),
    )
    r["entries"] = cur.fetchall()
    pdf = _render_statement(r, query)
    cur.execute(
        "INSERT INTO fee_mail_snapshots(event_key,account_id,pdf) VALUES(%s,%s,%s) ON CONFLICT(event_key) DO NOTHING",
        (key, a["id"], pdf),
    )


def notification_pdf(actor, aid, key):
    with get_db_cursor() as cur:
        own(cur, actor, aid)
        cur.execute(
            "SELECT pdf FROM fee_mail_snapshots WHERE event_key=%s AND account_id=%s",
            (key, aid),
        )
        row = cur.fetchone()
        if not row:
            raise ApiError(
                409, "Email statement snapshot is missing; operator review required"
            )
        return bytes(row["pdf"])
