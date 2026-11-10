# Payments ledger

Admin route: `/dashboard/payments`. APIs are under `/admin/billing/ledger` and require the Admins role. The ledger groups real fee accounts by batch, course or student and supports searches, course/trainer/month/status/aging filters, CSV export, student trails and statements.

## Accounting model

- Agreed fees are immutable snapshots of marked fee, discount and final amount, separate from the current public catalog price. Draft/demo quotes and unpaid retail checkout attempts are not counted as collections.
- Batch records identify course, optional existing trainer and start month. Existing Razorpay captures without a batch are honestly shown as unassigned, rather than assigned invented cohort data.
- Schedules have versioned installment rows. Agreed totals remain fixed; installments already wholly or partly paid cannot be edited. Plan changes invalidate pending local links; a late provider capture is still recorded honestly rather than discarded. Payment beyond the remaining balance appears as credit, never silently disappears.
- Cleared collections are signed, append-only entries. Cheques remain pending until explicitly cleared. Reversals require a reason and create an offsetting entry, preserving the original receipt. References are deduplicated and requests are idempotent. Do not record a Razorpay payment again as offline UPI/bank transfer.
- Capture and cumulative-refund reconciliation uses database transactions and unique source keys. The gateway's existing verified signatures, amount/currency checks, provider-side verification and durable webhook inbox remain in place.
- The first installment must be fully cleared before a fee-plan-owned enrollment is granted. Existing independent/manual grants are preserved when a fee-owned grant is reversed. Test/live accounts are separate; a test account cannot produce a live checkout link.
- Student Buy actions use the agreed installment plan when present, rather than charging the full public catalog price. Generated URLs use the existing owner-checked checkout; the QR is a QR of that URL, not proof of collection.

## Historical reporting

Date cutoffs use Asia/Kolkata. Installment versions effective on the selected date and recorded effective payment entries are used for balances. Aging is allocated per unpaid installment: a student can appear in multiple age buckets, so bucket counts need not add to the distinct-student total. Amounts do add to outstanding.

Retail captures imported from existing verified orders retain their known capture/completion timestamp. Existing cumulative refunds only have a last reconciliation timestamp; the ledger labels that timestamp as recorded knowledge, not an invented historical refund date. This release does not reconstruct unavailable provider refund history, settlement fees or foreign-exchange conversions. INR is the only configured ledger currency.

Reports batch their balance/schedule reads rather than querying per row. Exports are bounded to 10,000 accounts; narrow filters when the bound is exceeded. CSV text cells are guarded against spreadsheet formulas.

## Staff actions

1. Create a batch, optionally identifying an existing trainer account.
2. Create an agreed fee plan for an existing onboarded student and course; installments must sum exactly to the discounted fee.
3. Open a student's trail to create a Razorpay checkout link and its QR, record/clear/reverse an offline receipt, inspect installment balances, or edit the unpaid portion of a plan.
4. Preview and explicitly send an email reminder or statement. Reminders are limited to one per fee account per day. PDF attachments are immutable snapshots of what was reviewed; later payments do not rewrite earlier emailed records.
5. Download a date-ranged PDF/CSV statement. Historical views disable payment mutations. Review the action audit and current email delivery log in the student panel.

Cash, bank transfers and UPI received outside Razorpay count immediately when recorded as received; cheques count only after clearance. WhatsApp/SMS buttons are explicitly unavailable until the provider is configured. No message is falsely marked sent.

## Integration and release status

Migration 024 creates the fee, installment, receipt, audit, statement-snapshot and provider-attempt tables and transactional capture/refund synchronization. It imports verified captures only and suppresses historical notification replay. Deploy compatible learning/Programme workers before exposing the new admin UI. Existing API Gateway admin routes cover these endpoints.

The provider webhook should include `payment.failed` for prompt failed-attempt tracking; pending-order reconciliation also learns failed attempts from authoritative provider reads. Expired local checkouts are labeled expired, not assumed to be confirmed provider failures.

### Confirmed refund and messaging policy

Refunds reduce the agreed fee and the associated paid installment, without creating fresh arrears. Returning all collected funds cancels remaining unpaid dues and closes the agreement; a new agreement may be created later. Returning an overpayment credit does not reduce the agreed fee a second time. Refunds and fee reductions are separate non-destructive ledger entries and remain idempotent. Access follows the first remaining nonzero installment; independent manual grants are preserved.

Email reminders are included. The owner confirmed email first; WhatsApp/SMS are intentionally deferred until a provider is chosen. No provider setup is required to activate email.

### Validation

Real-PostgreSQL tests cover agreement creation, schedule versioning, first-installment access, pending/cleared/reversed cheques, duplicate requests/references, concurrent receipt retries, isolation of test/live data, Razorpay capture deduplication, ordinary student Buy flow, failed attempts, statements, CSV safety, immutable email snapshots and reminder rate limits. Browser tests cover the grouped ledger, student trail, payment-link QR, plan form, cheque clearance, email preview/send, historical action restrictions and mobile containment. No real payment is captured in QA.
