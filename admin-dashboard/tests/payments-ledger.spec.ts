import { test, expect } from "@playwright/test";
import { pick } from './select';
const aid = "00000000-0000-0000-0000-000000000081",
  cid = "00000000-0000-0000-0000-000000000082",
  oid = "00000000-0000-0000-0000-000000000083";
const base = "/admin/billing/ledger";
const account = {
  id: aid,
  user_id: cid,
  course_id: cid,
  name: "QA Learner",
  email: "qa@example.invalid",
  course_title: "Ledger QA",
  batch_code: "QA-NOV26",
  batch_start: "2026-11-01",
  trainer_name: "QA Trainer",
  trainer_id: cid,
  mode: "test",
  version: 1,
  source_order_id: null,
  total_paise: 15000,
  marked_price_paise: 15000,
  discount_bps: 0,
  billed_on: "2026-10-01",
  billed_paise: 15000,
  paid_paise: 3000,
  outstanding_paise: 12000,
  credit_paise: 0,
  overdue_paise: 3000,
  overdue_days: 9,
  status: "overdue",
  failed_attempts: 1,
  next_due: { date: "2026-11-01", number: 1, amount_paise: 3000, id: oid },
  aging: { not_due: 9000, "1_15": 3000, "16_30": 0, "31_60": 0, "60_plus": 0 },
  installments: [
    {
      id: oid,
      number: 1,
      amount_paise: 6000,
      adjusted_amount_paise: 6000,
      due_on: "2026-11-01",
      paid_paise: 3000,
      outstanding_paise: 3000,
      overdue_days: 9,
    },
    {
      id: cid,
      number: 2,
      amount_paise: 9000,
      adjusted_amount_paise: 9000,
      due_on: "2026-11-20",
      paid_paise: 0,
      outstanding_paise: 9000,
      overdue_days: 0,
    },
  ],
};
function makeReport() {
  return {
    as_of: "2026-11-10",
    mode: "test",
    currency: "INR",
    totals: {
      enrollments: 1,
      billed_paise: 15000,
      paid_paise: 3000,
      outstanding_paise: 12000,
      credit_paise: 0,
      overdue_paise: 3000,
      students_owing: 1,
      overdue_students: 1,
      oldest_days: 9,
      failed_attempts: 1,
      expired_checkouts: 2,
    },
    aging: Object.entries(account.aging).map(([key, amount_paise]) => ({
      key,
      amount_paise,
      students: amount_paise ? 1 : 0,
    })),
    accounts: [account],
    courses: [{ id: cid, title: "Ledger QA" }],
    batches: [
      {
        id: cid,
        course_id: cid,
        code: "QA-NOV26",
        trainer_id: cid,
        trainer_name: "QA Trainer",
        starts_on: "2026-11-01",
      },
    ],
    scope: "Verified capture test fixture",
  };
}
async function setup(page: import("@playwright/test").Page) {
  await page.clock.install({ time: new Date("2026-11-10T06:00:00Z") });
  const payload = Buffer.from(
    JSON.stringify({
      token_use: "id",
      sub: "qa-admin",
      "cognito:groups": ["Admins"],
      exp: 4102444800,
    }),
  ).toString("base64url");
  await page.addInitScript(
    (token) => localStorage.setItem("auth_id_token", token),
    `test.${payload}.test`,
  );
  let detail = {
    ...account,
    entries: [],
    receipts: [] as any[],
    orders: [],
    audit: [],
    as_of: "2026-11-10",
    emails: [],
  };
  const calls: { path: string; method: string; body: any; query: string }[] =
    [];
  await page.route("https://cognito-idp.*.amazonaws.com/**", (r) => r.abort());
  await page.route(
    "https://*.execute-api.ap-south-1.amazonaws.com/**",
    async (route) => {
      const u = new URL(route.request().url()),
        path = u.pathname,
        method = route.request().method();
      let json: any = [];
      const body = method === "GET" ? null : route.request().postDataJSON();
      calls.push({ path, method, body, query: u.search });
      if (path === base) json = makeReport();
      if (path === `${base}/accounts/${aid}`)
        json = {
          ...detail,
          as_of: u.searchParams.get("as_of") || detail.as_of,
        };
      if (path.endsWith("/preview"))
        json = {
          recipient: account.email,
          subject: "Fee reminder: Ledger QA",
          body: "Your outstanding fee is INR 120.00.",
          template: "ai4impact-fee-reminder-v1",
          attachment: "Statement of account PDF",
        };
      if (path === `${base}/accounts` && method === "POST") json = { id: aid };
      if (path.endsWith("/pay-link"))
        json = {
          id: oid,
          checkout_url: `https://learn.ai4impact.in/checkout/${oid}`,
          total_paise: 3000,
        };
      if (path.endsWith("/receipts") && method === "POST") {
        detail = {
          ...detail,
          receipts: [
            {
              id: oid,
              method: body.method,
              amount_paise: body.amount_paise,
              reference: body.reference,
              received_on: body.received_on,
              status: "pending",
            },
          ],
        };
        json = { id: oid, status: "pending" };
      }
      if (path.endsWith("/receipts/" + oid) && method === "PATCH") {
        detail = {
          ...detail,
          receipts: detail.receipts.map((r) => ({ ...r, status: "cleared" })),
          paid_paise: 6000,
          outstanding_paise: 9000,
        };
        json = { id: oid, status: "cleared" };
      }
      if (path.endsWith("/email")) json = { queued: true };
      if (path === "/programme/staff/access")
        json = { admin: true, courses: [] };
      if (path.endsWith("/statement") || path.endsWith("/export"))
        return route.fulfill({
          body: "Student,Amount\nQA,150.00",
          contentType: "text/csv",
          headers: {
            "Content-Disposition": 'attachment; filename="ledger.csv"',
          },
        });
      await route.fulfill({ json });
    },
  );
  await page.goto(
    `${process.env.QA_ADMIN_URL || "http://localhost:3100"}/dashboard/payments`,
  );
  await expect(
    page.getByRole("heading", { name: "Payments ledger", exact: true }),
  ).toBeVisible();
  return { calls };
}
async function openStudent(page: import("@playwright/test").Page) {
  await expect(
    page.getByText("QA-NOV26", { exact: true }).first(),
  ).toBeVisible();
  if (await page.getByRole("button", { name: /^Show students in/ }).count())
    await page.getByRole("button", { name: /^Show students in/ }).click();
  await page
    .getByRole("button", { name: "View payment trail for QA Learner" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("ledger has real grouping, a student trail and secure QR checkout", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await expect(page.getByText("TEST MODE — simulated Razorpay")).toBeVisible();
  await openStudent(page);
  await page
    .getByRole("button", { name: "Create payment link", exact: true })
    .click();
  await expect(page.getByLabel("Secure payment link")).toHaveValue(
    `https://learn.ai4impact.in/checkout/${oid}`,
  );
  await expect(
    page.getByAltText("QR code for this student payment link"),
  ).toHaveAttribute("src", /^data:image\/png;base64,/);
  expect(
    calls.find((c) => c.path.endsWith("/pay-link"))?.body.request_id,
  ).toMatch(/^[a-f0-9-]{36}$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "By course", exact: true }).click();
  await expect(
    page.getByRole("table").getByText("Ledger QA", { exact: true }).first(),
  ).toBeVisible();
});

test("agreed fee plan posts paise and the selected installment dates", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.getByRole("button", { name: "New fee plan" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Student email").fill("qa@example.invalid");
  await pick(dialog.getByLabel("Fee plan course"), cid);
  await dialog.locator("input[name=price]").fill("100.01");
  await dialog.getByLabel("Installment 1 amount").fill("100.01");
  await dialog
    .getByRole("button", { name: "Create agreed fee plan", exact: true })
    .click();
  await expect
    .poll(() =>
      calls.some((c) => c.path === base + "/accounts" && c.method === "POST"),
    )
    .toBe(true);
  const body = calls.find(
    (c) => c.path === base + "/accounts" && c.method === "POST",
  )!.body;
  expect(body.marked_price_paise).toBe(10001);
  expect(body.installments[0].amount_paise).toBe(10001);
});

test("pending cheque is shown separately and requires an explicit clearance action", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await openStudent(page);
  await page.getByRole("button", { name: "Record offline payment" }).click();
  const dialog = page.getByRole("dialog");
  await pick(dialog.locator("[data-name=method]"), "cheque");
  await dialog.getByLabel("Offline amount INR").fill("30");
  await dialog.locator("input[name=reference]").fill("CHEQUE-QA-1");
  await dialog.getByRole("button", { name: "Save offline payment" }).click();
  await expect(
    dialog.getByRole("button", { name: "Mark cleared" }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path.endsWith("/receipts") && c.method === "POST")?.body
      .method,
  ).toBe("cheque");
  page.once("dialog", (d) => d.accept("Bank statement checked"));
  await dialog.getByRole("button", { name: "Mark cleared" }).click();
  await expect
    .poll(() =>
      calls.some((c) => c.method === "PATCH" && c.body.action === "clear"),
    )
    .toBe(true);
});

test("email requires a server preview before queueing and historical payment actions are disabled", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await openStudent(page);
  await page.getByRole("button", { name: "Send email reminder" }).click();
  await expect(
    page.getByRole("heading", { name: "Email preview" }),
  ).toBeVisible();
  expect(calls.filter((c) => c.path.endsWith("/email"))).toHaveLength(0);
  await page.getByRole("button", { name: "Send reminder email" }).click();
  await expect
    .poll(() =>
      calls.some(
        (c) => c.path.endsWith("/email") && c.body.kind === "reminder",
      ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await page.getByLabel("As of", { exact: true }).fill("2026-11-06");
  await expect(
    page.getByText("Historical view:", { exact: false }),
  ).toBeVisible();
  await openStudent(page);
  await expect(
    page.getByRole("button", { name: "Create payment link", exact: true }),
  ).toBeDisabled();
});

test("mobile ledger keeps wide data inside its scroll container", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(
    page.getByRole("heading", { name: "Payments ledger", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  await openStudent(page);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("lost offline-payment response retries the same intent, while a new payment gets a new request ID", async ({
  page,
}) => {
  await setup(page);
  await openStudent(page);
  const dialog = page.getByRole("dialog");
  const ids: string[] = [];
  await page.route(
    "**/admin/billing/ledger/accounts/*/receipts",
    async (route) => {
      const b = route.request().postDataJSON();
      ids.push(b.request_id);
      if (ids.length === 1) return route.abort("failed");
      await route.fulfill({ json: { id: oid, status: "cleared" } });
    },
  );
  async function fillCash() {
    await pick(dialog.locator("[data-name=method]"), "cash");
    await dialog.getByLabel("Offline amount INR").fill("10");
  }
  await dialog.getByRole("button", { name: "Record offline payment" }).click();
  await fillCash();
  await dialog.getByRole("button", { name: "Save offline payment" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Save offline payment" }).click();
  await expect.poll(() => ids.length).toBe(2);
  expect(ids[0]).toBe(ids[1]);
  await expect(
    dialog.getByRole("button", { name: "Save offline payment" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Record offline payment" }).click();
  await fillCash();
  await dialog.getByRole("button", { name: "Save offline payment" }).click();
  await expect.poll(() => ids.length).toBe(3);
  expect(ids[2]).not.toBe(ids[1]);
});

test("ledger uses one keyboard-accessible expansion control per group", async ({
  page,
}) => {
  await setup(page);
  const toggle = page.getByRole("button", {
    name: "Show students in QA-NOV26",
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Expand", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open QA Learner Ledger QA" }),
  ).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Enter");
  const hide = page.getByRole("button", { name: "Hide students in QA-NOV26" });
  await expect(hide).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Open QA Learner Ledger QA" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("ledger-expansion.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Open QA Learner Ledger QA" }),
  ).toBeHidden();
  await toggle.click();
  const studentLink = page.getByRole("button", {
    name: "View payment trail for QA Learner",
  });
  await studentLink.click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(studentLink).toBeFocused();
});
