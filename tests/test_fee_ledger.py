"""Financial state, idempotency, access control and historical ledger calculations."""

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta, datetime, time
import pytest
from test_programme_integration import schema, data, DSN
from learning import fee_ledger as fees, payments
from learning.validation import ApiError
from shared.db import execute_query, get_db_cursor

pytestmark = pytest.mark.skipif(not DSN, reason="Requires isolated PostgreSQL")


def rid():
    return str(uuid.uuid4())


@pytest.fixture
def account(data):
    uid = data["student"]["id"]
    cid = data["course"]
    execute_query(
        "DELETE FROM course_registrations WHERE user_id=%s", (uid,), fetch="none"
    )
    body = {
        "request_id": rid(),
        "user_id": uid,
        "course_id": cid,
        "mode": "test",
        "marked_price_paise": 10000,
        "discount_bps": 1000,
        "billed_on": str(fees.today() - timedelta(days=40)),
        "installments": [
            {"amount_paise": 3000, "due_on": str(fees.today() - timedelta(days=30))},
            {"amount_paise": 6000, "due_on": str(fees.today() + timedelta(days=5))},
        ],
    }
    aid = fees.create_account(data["admin"], body)["id"]
    return data, aid, body


def cash(data, aid, amount=3000, **extra):
    return fees.receipt(
        data["admin"],
        aid,
        {
            "request_id": rid(),
            "method": "cash",
            "amount_paise": amount,
            "received_on": str(fees.today()),
            **extra,
        },
    )


def registration(data):
    return execute_query(
        "SELECT status,source FROM course_registrations WHERE user_id=%s AND course_id=%s",
        (data["student"]["id"], data["course"]),
        fetch="one",
    )


def test_account_is_obligation_not_money_and_retry_is_idempotent(account):
    d, aid, body = account
    assert fees.create_account(d["admin"], body)["id"] == aid
    r = fees.detail(d["admin"], aid)
    assert (
        r["billed_paise"] == 9000
        and r["paid_paise"] == 0
        and r["outstanding_paise"] == 9000
    )
    assert (
        r["overdue_paise"] == 3000
        and r["aging"]["16_30"] == 3000
        and r["aging"]["not_due"] == 6000
    )
    assert registration(d) is None
    with pytest.raises(ApiError):
        fees.create_account(d["admin"], {**body, "marked_price_paise": 11000})


def test_first_installment_must_be_fully_cleared_for_access(account):
    d, aid, _ = account
    cash(d, aid, 1000)
    assert registration(d) is None
    cash(d, aid, 2000)
    assert registration(d)["status"] == "registered"
    r = fees.detail(d["student"], aid)
    assert (
        r["paid_paise"] == 3000
        and r["outstanding_paise"] == 6000
        and r["overdue_paise"] == 0
    )
    with pytest.raises(ApiError):
        fees.detail(d["other"], aid)
    with pytest.raises(ApiError):
        fees.report(d["student"], {"mode": "test"})


def test_cheque_pending_clear_reversal_and_duplicate_ref(account):
    d, aid, _ = account
    body = {
        "request_id": rid(),
        "method": "cheque",
        "reference": "BANK-CHQ-100",
        "amount_paise": 3000,
        "received_on": str(fees.today()),
    }
    receipt = fees.receipt(d["admin"], aid, body)
    assert receipt["status"] == "pending"
    assert fees.detail(d["admin"], aid)["paid_paise"] == 0 and registration(d) is None
    assert fees.receipt(d["admin"], aid, body) == receipt
    with pytest.raises(ApiError):
        fees.receipt(d["admin"], aid, {**body, "request_id": rid()})
    fees.change_receipt(
        d["admin"],
        aid,
        receipt["id"],
        {"request_id": rid(), "action": "clear", "reason": "Bank statement verified"},
    )
    assert (
        fees.detail(d["admin"], aid)["paid_paise"] == 3000
        and registration(d)["status"] == "registered"
    )
    fees.change_receipt(
        d["admin"],
        aid,
        receipt["id"],
        {"request_id": rid(), "action": "reverse", "reason": "Bank reversed clearance"},
    )
    assert (
        fees.detail(d["admin"], aid)["paid_paise"] == 0
        and registration(d)["status"] == "dropped"
    )


def test_overpayment_and_concurrent_receipt_retries(account):
    d, aid, _ = account
    body = {
        "request_id": rid(),
        "method": "bank",
        "reference": "UTR-100",
        "amount_paise": 3000,
        "received_on": str(fees.today()),
    }
    with ThreadPoolExecutor(max_workers=4) as pool:
        result = list(pool.map(lambda _: fees.receipt(d["admin"], aid, body), range(4)))
    assert (
        len({r["id"] for r in result}) == 1
        and fees.detail(d["admin"], aid)["paid_paise"] == 3000
    )
    with pytest.raises(ApiError):
        cash(d, aid, 7000)


def test_plan_version_conflict_and_paid_prefix_preserved(account):
    d, aid, _ = account
    cash(d, aid, 3000)
    old = fees.detail(d["admin"], aid)
    lines = [
        {"amount_paise": 3000, "due_on": str(fees.today() - timedelta(days=30))},
        {"amount_paise": 3000, "due_on": str(fees.today() + timedelta(days=5))},
        {"amount_paise": 3000, "due_on": str(fees.today() + timedelta(days=30))},
    ]
    fees.edit_plan(
        d["admin"], aid, {"request_id": rid(), "version": 1, "installments": lines}
    )
    with pytest.raises(ApiError):
        fees.edit_plan(
            d["admin"], aid, {"request_id": rid(), "version": 1, "installments": lines}
        )
    assert len(fees.detail(d["admin"], aid)["installments"]) == 3
    before = fees.detail(
        d["admin"], aid, {"as_of": str(fees.today() - timedelta(days=1))}
    )
    assert len(before["installments"]) == 2 and before["paid_paise"] == 0
    with pytest.raises(ApiError):
        fees.edit_plan(
            d["admin"],
            aid,
            {
                "request_id": rid(),
                "version": 2,
                "installments": [
                    {**lines[0], "amount_paise": 2000},
                    {**lines[1], "amount_paise": 4000},
                    lines[2],
                ],
            },
        )


def test_razorpay_installment_capture_deduplicates_and_grants_access(
    account, monkeypatch
):
    d, aid, _ = account
    monkeypatch.setattr(payments, "enabled", lambda: True)
    monkeypatch.setattr(
        payments,
        "credentials",
        lambda: {
            "mode": "test",
            "key_id": "rzp_test_x",
            "key_secret": "test",
            "webhook_secret": "test",
            "test_buyer_emails": ["person1@example.invalid"],
        },
    )
    monkeypatch.setattr(
        payments,
        "checkout",
        lambda actor, oid, as_admin=False: {
            "id": oid,
            "checkout_url": "https://example.invalid/" + oid,
        },
    )
    result = fees.pay_link(d["admin"], aid, {"request_id": rid()})
    oid = result["id"]
    execute_query(
        "UPDATE payment_orders SET provider_order_id=%s WHERE id=%s",
        ("order_ledger", oid),
        fetch="none",
    )
    p = {
        "id": "pay_ledger",
        "order_id": "order_ledger",
        "amount": 3000,
        "currency": "INR",
        "status": "captured",
        "captured": True,
    }
    payments.apply_payment(p)
    payments.apply_payment(p)
    assert (
        fees.detail(d["admin"], aid)["paid_paise"] == 3000
        and registration(d)["status"] == "registered"
    )
    assert registration(d)["source"] == "fee-account:" + aid
    assert (
        execute_query(
            "SELECT count(*) AS n FROM fee_entries WHERE account_id=%s AND kind='payment'",
            (aid,),
            fetch="one",
        )["n"]
        == 1
    )


def test_csv_injection_and_statement_pdf(account):
    d, aid, _ = account
    cash(d, aid, 1000)
    r = fees.report(d["admin"], {"mode": "test"})
    r["accounts"][0]["name"] = '=HYPERLINK("bad")'
    assert "'=HYPERLINK" in fees.csv_bytes(r["accounts"]).decode()
    assert fees.statement(d["student"], aid).startswith(b"%PDF")
    with pytest.raises(ApiError):
        fees.statement(d["other"], aid)


def test_email_preview_snapshot_and_reminder_rate_limit(account):
    d, aid, _ = account
    cash(d, aid, 1000)
    preview = fees.preview(d["admin"], aid, {"kind": "reminder"})
    assert (
        "80.00" in preview["body"] and preview["recipient"] == "person1@example.invalid"
    )
    body = {"request_id": rid(), "kind": "reminder"}
    assert fees.notice(d["admin"], aid, body) == {"queued": True}
    assert fees.notice(d["admin"], aid, body) == {"queued": True}
    key = "fees:reminder:" + body["request_id"]
    before = fees.notification_pdf(d["student"], aid, key)
    cash(d, aid, 2000)
    assert fees.notification_pdf(d["student"], aid, key) == before
    with pytest.raises(ApiError):
        fees.notice(d["admin"], aid, {"request_id": rid(), "kind": "reminder"})
    with pytest.raises(ApiError):
        fees.notification_pdf(d["other"], aid, key)


def test_batch_and_search_filters_and_failure_counts(account):
    d, aid, _ = account
    b = fees.create_batch(
        d["admin"],
        {
            "request_id": rid(),
            "course_id": d["course"],
            "code": "QA-NOV",
            "starts_on": str(fees.today()),
        },
    )
    execute_query(
        "UPDATE fee_accounts SET batch_id=%s WHERE id=%s", (b["id"], aid), fetch="none"
    )
    r = fees.report(
        d["admin"],
        {"mode": "test", "search": "QA-NOV", "month": fees.today().isoformat()[:7]},
    )
    assert len(r["accounts"]) == 1 and r["totals"]["billed_paise"] == 9000
    assert fees.report(d["admin"], {"mode": "live"})["totals"]["billed_paise"] == 0
    assert (
        fees.report(d["admin"], {"mode": "test", "search": "does not exist"})[
            "accounts"
        ]
        == []
    )


def test_invalid_plan_and_cross_account_receipts_are_rejected(account):
    d, aid, _ = account
    with pytest.raises(ApiError):
        fees.edit_plan(
            d["admin"], aid, {"request_id": rid(), "version": 1, "installments": [None]}
        )
    with pytest.raises(ApiError):
        fees.receipt(
            d["student"],
            aid,
            {"request_id": rid(), "method": "cash", "amount_paise": 100},
        )
    with pytest.raises(ApiError):
        fees.receipt(
            d["admin"],
            aid,
            {
                "request_id": rid(),
                "method": "bank",
                "amount_paise": 100,
                "reference": None,
            },
        )
    with pytest.raises(ApiError):
        fees.change_receipt(
            d["admin"],
            aid,
            rid(),
            {"request_id": rid(), "action": "clear", "reason": "Not mine"},
        )


def test_student_buy_uses_agreed_installment_instead_of_catalog_price(
    account, monkeypatch
):
    d, aid, _ = account
    monkeypatch.setattr(payments, "enabled", lambda: True)
    monkeypatch.setattr(
        payments,
        "credentials",
        lambda: {
            "mode": "test",
            "key_id": "rzp_test_x",
            "key_secret": "test",
            "webhook_secret": "test",
            "test_buyer_emails": ["person1@example.invalid"],
        },
    )
    monkeypatch.setattr(payments, "enabled", lambda: True)
    monkeypatch.setattr(
        payments, "checkout", lambda actor, oid, as_admin=False: {"id": oid}
    )
    result = payments.create(
        d["student"], {"course_id": d["course"], "request_id": rid()}
    )
    order = execute_query(
        "SELECT * FROM payment_orders WHERE id=%s", (result["id"],), fetch="one"
    )
    assert str(order["fee_account_id"]) == aid and order["total_paise"] == 3000
    assert fees.detail(d["admin"], aid)["paid_paise"] == 0


def test_failed_attempt_is_visible_without_counting_it_as_collected(
    account, monkeypatch
):
    d, aid, _ = account
    monkeypatch.setattr(payments, "enabled", lambda: True)
    monkeypatch.setattr(
        payments,
        "credentials",
        lambda: {
            "mode": "test",
            "key_id": "rzp_test_x",
            "key_secret": "test",
            "webhook_secret": "test",
            "test_buyer_emails": ["person1@example.invalid"],
        },
    )
    monkeypatch.setattr(
        payments, "checkout", lambda actor, oid, as_admin=False: {"id": oid}
    )
    oid = fees.pay_link(d["admin"], aid, {"request_id": rid()})["id"]
    execute_query(
        "UPDATE payment_orders SET provider_order_id='order_failureledger' WHERE id=%s",
        (oid,),
        fetch="none",
    )
    payments.apply_payment(
        {
            "id": "pay_failureledger",
            "order_id": "order_failureledger",
            "amount": 3000,
            "currency": "INR",
            "status": "failed",
            "captured": False,
            "error_code": "BAD_REQUEST_ERROR",
        }
    )
    r = fees.report(d["admin"], {"mode": "test"})
    assert r["totals"]["failed_attempts"] == 1 and r["totals"]["paid_paise"] == 0
    assert registration(d) is None


@pytest.fixture
def capture(account, monkeypatch):
    d, aid, _ = account
    monkeypatch.setattr(payments, "credentials", lambda: {"mode": "test"})

    def make(amount=3000):
        order = rid()
        pid = "pay_" + uuid.uuid4().hex
        provider_order = "order_" + uuid.uuid4().hex
        installment = fees.detail(d["admin"], aid)["next_due"]["id"]
        execute_query(
            "INSERT INTO payment_orders(id,request_id,user_id,course_id,course_title,buyer_name,buyer_email,marked_price_paise,discount_bps,discount_paise,total_paise,mode,provider_order_id,fee_account_id,fee_installment_id) VALUES(%s,%s,%s,%s,'QA Course','QA','person1@example.invalid',%s,0,0,%s,'test',%s,%s,%s)",
            (
                order,
                rid(),
                d["student"]["id"],
                d["course"],
                amount,
                amount,
                provider_order,
                aid,
                installment,
            ),
            fetch="none",
        )
        payment = {
            "id": pid,
            "order_id": provider_order,
            "amount": amount,
            "currency": "INR",
            "status": "captured",
            "captured": True,
        }
        return payment

    return d, aid, make


def test_partial_refund_reduces_paid_installment_without_new_arrears(capture):
    d, aid, make = capture
    p = make()
    payments.apply_payment(p)
    payments.apply_payment({**p, "amount_refunded": 1000})
    payments.apply_payment({**p, "amount_refunded": 1000})
    r = fees.detail(d["admin"], aid)
    assert (
        r["billed_paise"],
        r["paid_paise"],
        r["outstanding_paise"],
        r["overdue_paise"],
    ) == (8000, 2000, 6000, 0)
    assert (
        r["installments"][0]["adjusted_amount_paise"] == 2000
        and r["next_due"]["number"] == 2
    )
    assert registration(d)["status"] == "registered"
    report = fees.report(d["admin"], {"mode": "test"})
    assert (
        report["totals"]["billed_paise"] == 8000
        and report["totals"]["overdue_paise"] == 0
    )
    assert (
        execute_query(
            "SELECT count(*) AS n FROM fee_entries WHERE account_id=%s AND kind='fee_adjustment'",
            (aid,),
            fetch="one",
        )["n"]
        == 1
    )


def test_returning_first_installment_cancels_remaining_obligation(capture, account):
    d, aid, make = capture
    p = make()
    payments.apply_payment(p)
    payments.apply_payment({**p, "amount_refunded": 3000, "status": "refunded"})
    r = fees.detail(d["admin"], aid)
    assert (r["billed_paise"], r["paid_paise"], r["outstanding_paise"]) == (0, 0, 0)
    assert (
        r["closed_at"]
        and r["status"] == "refunded"
        and registration(d)["status"] == "dropped"
    )
    body = account[2]
    new = fees.create_account(d["admin"], {**body, "request_id": rid()})
    assert new["id"] != aid


def test_refund_across_installments_and_manual_grant_preservation(capture):
    d, aid, make = capture
    p = make(9000)
    payments.apply_payment(p)
    payments.apply_payment({**p, "amount_refunded": 5000})
    r = fees.detail(d["admin"], aid)
    assert (
        r["billed_paise"] == 4000
        and r["paid_paise"] == 4000
        and r["outstanding_paise"] == 0
    )
    assert (
        r["installments"][0]["adjusted_amount_paise"] == 0
        and r["installments"][1]["adjusted_amount_paise"] == 4000
    )
    assert registration(d)["status"] == "registered"
    execute_query(
        "UPDATE course_registrations SET source='admin' WHERE user_id=%s AND course_id=%s",
        (d["student"]["id"], d["course"]),
        fetch="none",
    )
    payments.apply_payment({**p, "amount_refunded": 9000, "status": "refunded"})
    assert (
        fees.detail(d["admin"], aid)["outstanding_paise"] == 0
        and registration(d)["status"] == "registered"
    )


def test_returning_overpayment_does_not_reduce_fee_twice(capture):
    d, aid, make = capture
    first = make(9000)
    second = make(9000)
    payments.apply_payment(first)
    payments.apply_payment(second)
    assert fees.detail(d["admin"], aid)["credit_paise"] == 9000
    payments.apply_payment({**second, "amount_refunded": 9000, "status": "refunded"})
    r = fees.detail(d["admin"], aid)
    assert (
        r["billed_paise"] == 9000
        and r["paid_paise"] == 9000
        and r["credit_paise"] == 0
        and r["closed_at"] is None
    )
    payments.apply_payment({**first, "amount_refunded": 9000, "status": "refunded"})
    assert fees.detail(d["admin"], aid)["billed_paise"] == 0
