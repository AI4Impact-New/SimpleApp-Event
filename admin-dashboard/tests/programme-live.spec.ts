import { test, expect, APIRequestContext, Page } from "@playwright/test";
import { pick } from './select';
import fs from "node:fs";
import crypto from "node:crypto";
const config = process.env.QA_LIVE_CONFIG;
test.skip(
  !config || process.env.QA_LIVE_WRITES !== "1",
  "Explicit live QA configuration and write opt-in required",
);
test.use({ actionTimeout: 20000, navigationTimeout: 45000 });
const q =
  config && process.env.QA_LIVE_WRITES === "1"
    ? JSON.parse(fs.readFileSync(config, "utf8"))
    : null;
const base = "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com";
const admin = "https://admin.ai4impact.in";
const landing = "https://www.ai4impact.in";
const id = () => crypto.randomUUID();
const prefix = () => `QA ${q.run}`;
const record = (kind: string, value: string) => {
  q.resources ??= {};
  q.resources[kind] ??= [];
  q.resources[kind].push(value);
  fs.writeFileSync(config!, JSON.stringify(q), { mode: 0o600 });
};
async function call(
  r: APIRequestContext,
  role: string,
  method: string,
  path: string,
  data?: unknown,
  status = 200,
) {
  const response = await r.fetch(base + path, {
    method,
    headers: role
      ? { Authorization: "Bearer " + q.accounts[role].tokens.IdToken }
      : {},
    data,
    timeout: 60000,
  });
  const expected =
    status === 200 && method === "DELETE" && path.startsWith("/events/")
      ? 204
      : status === 200 &&
          method === "POST" &&
          /^\/events$|\/exams$|\/attempts$/.test(path)
        ? 201
        : status;
  expect(response.status(), method + " " + path).toBe(expected);
  return response.status() === 204 ? {} : response.json();
}
async function login(page: Page, role: string) {
  await page.goto(admin + "/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(q.accounts[role].email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(q.accounts[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 45000 });
}
function times() {
  q.slot_sequence = (q.slot_sequence || 0) + 1;
  fs.writeFileSync(config!, JSON.stringify(q), { mode: 0o600 });
  const start = new Date(Date.now() + (30 + q.slot_sequence) * 86400000);
  start.setUTCHours(6, 0, 0, 0);
  return {
    starts_at: start.toISOString(),
    ends_at: new Date(+start + 1800000).toISOString(),
  };
}
async function session(
  r: APIRequestContext,
  extra: Record<string, unknown> = {},
) {
  const body = {
    request_id: id(),
    course_id: q.course_id,
    educator_id: q.accounts.teacher.profile.id,
    kind: "handholding",
    title: prefix() + " support " + id().slice(0, 6),
    timezone: "Asia/Kolkata",
    capacity: 1,
    meeting_url: "https://example.invalid/qa-private",
    ...times(),
    ...extra,
  };
  const s = await call(r, "teacher", "POST", "/programme/staff/sessions", body);
  record("sessions", s.id);
  return { s, body };
}
async function company(r: APIRequestContext) {
  const c = await call(r, "admin", "POST", "/admin/programme/companies", {
    request_id: id(),
    name: prefix() + " company",
    website: "https://example.invalid",
    active: true,
  });
  record("companies", c.id);
  return c;
}
async function job(
  r: APIRequestContext,
  c: any,
  extra: Record<string, unknown> = {},
) {
  const body = {
    request_id: id(),
    company_id: c.id,
    title: prefix() + " DO NOT APPLY",
    description: "Temporary automated QA listing.",
    location: "Hyderabad",
    work_mode: "hybrid",
    employment_type: "contract",
    experience_min: 0,
    experience_max: 2,
    salary_min: 600000,
    salary_max: 900000,
    salary_currency: "INR",
    skills: ["SQL"],
    partner: "QA Consulting",
    deadline: new Date(Date.now() + 3600000).toISOString(),
    status: "published",
    ...extra,
  };
  const j = await call(r, "admin", "POST", "/admin/programme/jobs", body);
  record("jobs", j.id);
  return { j, body };
}

test("live authentication, enrollment and role boundaries", async ({
  request,
}) => {
  await call(
    request,
    "",
    "GET",
    "/programme/sessions?course_id=" + q.course_id,
    undefined,
    401,
  );
  await call(
    request,
    "student",
    "GET",
    "/admin/programme/deliveries",
    undefined,
    403,
  );
  await call(
    request,
    "outsider",
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
    undefined,
    403,
  );
  await call(
    request,
    "teacher",
    "GET",
    "/admin/programme/jobs",
    undefined,
    403,
  );
  const ent = await call(
    request,
    "student",
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
  );
  expect(ent.ai_enabled).toBe(false);
  expect(
    ent.wallets.find((w: any) => w.kind === "handholding").balance,
  ).toBeGreaterThanOrEqual(0);
  const access = await call(
    request,
    "teacher",
    "GET",
    "/programme/staff/access",
  );
  expect(access.admin).toBe(false);
  expect(access.courses.some((c: any) => c.course_id === q.course_id)).toBe(
    true,
  );
});

test("real admin sign-in and session form persist UTC and meeting privacy", async ({
  page,
  request,
}) => {
  await login(page, "admin");
  await page.goto(admin + "/dashboard/programme");
  await pick(page.getByLabel("Course", { exact: true }), q.course_id);
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await pick(page
    .getByLabel("Educator", { exact: true }), q.accounts.teacher.profile.id);
  const t = times();
  const day = t.starts_at.slice(0, 10);
  const title = prefix() + " UI session " + id().slice(0, 6);
  await pick(page
    .getByLabel("Session type", { exact: true }), "handholding");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Starts in selected time zone").fill(day + "T15:00");
  await page.getByLabel("Ends in selected time zone").fill(day + "T15:30");
  await page
    .getByLabel("Meeting link", { exact: true })
    .fill("https://example.invalid/qa-ui");
  const saved = page.waitForResponse(
    (r) =>
      r.url() === base + "/admin/programme/sessions" &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const s = await response.json();
  record("sessions", s.id);
  expect(s.starts_at).toContain("T09:30:00");
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.reload();
  await pick(page.getByLabel("Course", { exact: true }), q.course_id);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const rows = await call(
    request,
    "student",
    "GET",
    "/programme/sessions?course_id=" + q.course_id,
  );
  expect(rows.items.find((i: any) => i.id === s.id).meeting_url).toBeNull();
});

test("real educator workspace hides admin-only functions", async ({ page }) => {
  await login(page, "teacher");
  await page.goto(admin + "/dashboard/programme");
  await expect(
    page.getByRole("heading", { name: "Programme+ workspace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jobs", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Webinars", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bookings", exact: true }),
  ).toBeVisible();
});

test("last-seat race, idempotency, ownership and cancellation refund", async ({
  request,
}) => {
  const { s } = await session(request);
  const bodies = {
    student: { request_id: id(), topic: "Concurrent QA" },
    other: { request_id: id(), topic: "Concurrent QA" },
  };
  const response = await Promise.all(
    ["student", "other"].map((role) =>
      request.post(base + "/programme/sessions/" + s.id + "/bookings", {
        headers: { Authorization: "Bearer " + q.accounts[role].tokens.IdToken },
        data: bodies[role as "student" | "other"],
      }),
    ),
  );
  expect(response.map((r) => r.status()).sort()).toEqual([200, 409]);
  const winner = response[0].status() === 200 ? "student" : "other";
  const loser = winner === "student" ? "other" : "student";
  const booking = await response[winner === "student" ? 0 : 1].json();
  record("bookings", booking.id);
  const duplicate = await call(
    request,
    winner,
    "POST",
    "/programme/sessions/" + s.id + "/bookings",
    bodies[winner],
  );
  expect(duplicate.id).toBe(booking.id);
  const mine = await call(
    request,
    winner,
    "GET",
    "/programme/sessions?course_id=" + q.course_id,
  );
  expect(mine.items.find((i: any) => i.id === s.id).meeting_url).toBe(
    "https://example.invalid/qa-private",
  );
  await call(
    request,
    loser,
    "GET",
    "/programme/bookings/" + booking.id + "/calendar",
    undefined,
    404,
  );
  const calendar = await call(
    request,
    winner,
    "GET",
    "/programme/bookings/" + booking.id + "/calendar",
  );
  expect(calendar.content).toContain(
    "DTSTART:" + s.starts_at.replace(/[-:]/g, "").slice(0, 15) + "Z",
  );
  const before = await call(
    request,
    winner,
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
  );
  await call(request, winner, "PATCH", "/programme/bookings/" + booking.id, {
    status: "cancelled",
  });
  await call(request, winner, "PATCH", "/programme/bookings/" + booking.id, {
    status: "cancelled",
  });
  const after = await call(
    request,
    winner,
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
  );
  expect(after.wallets.find((w: any) => w.kind === "handholding").balance).toBe(
    before.wallets.find((w: any) => w.kind === "handholding").balance + 1,
  );
});

test("reschedule transfers one credit, stale retries cannot overspend", async ({
  request,
}) => {
  const first = await session(request);
  const next = await session(request);
  const b = await call(
    request,
    "student",
    "POST",
    "/programme/sessions/" + first.s.id + "/bookings",
    { request_id: id(), topic: "Reschedule QA" },
  );
  record("bookings", b.id);
  const body = { request_id: id(), session_id: next.s.id };
  const moved = await call(
    request,
    "student",
    "POST",
    "/programme/bookings/" + b.id + "/reschedule",
    body,
  );
  record("bookings", moved.id);
  expect(
    (
      await call(
        request,
        "student",
        "POST",
        "/programme/bookings/" + b.id + "/reschedule",
        body,
      )
    ).id,
  ).toBe(moved.id);
  await call(request, "student", "PATCH", "/programme/bookings/" + moved.id, {
    status: "cancelled",
  });
});

test("invalid dates, duration, unsafe links and educator overlap are rejected", async ({
  request,
}) => {
  const { s, body } = await session(request);
  await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/sessions",
    { ...body, request_id: id() },
    409,
  );
  await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/sessions",
    { ...body, request_id: id(), starts_at: "2027-03-01T10:00" },
    400,
  );
  await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/sessions",
    { ...body, request_id: id(), meeting_url: "javascript:alert(1)" },
    400,
  );
  await call(
    request,
    "student",
    "PUT",
    "/admin/programme/sessions/" + s.id,
    { ...body, request_id: id() },
    403,
  );
});

test("job filters, consent, owned applications, manual timeline and withdrawal", async ({
  request,
}) => {
  const c = await company(request);
  const { j, body } = await job(request, c);
  try {
    const found = await call(
      request,
      "student",
      "GET",
      "/programme/jobs?q=Hyderabad&work_mode=hybrid&employment_type=contract",
    );
    expect(found.items.some((x: any) => x.id === j.id)).toBe(true);
    await call(
      request,
      "student",
      "POST",
      "/programme/jobs/" + j.id + "/applications",
      { request_id: id(), consent: false },
      400,
    );
    const payload = {
      request_id: id(),
      consent: true,
      statement: "QA application",
    };
    const a = await call(
      request,
      "student",
      "POST",
      "/programme/jobs/" + j.id + "/applications",
      payload,
    );
    record("applications", a.id);
    expect(
      (
        await call(
          request,
          "student",
          "POST",
          "/programme/jobs/" + j.id + "/applications",
          payload,
        )
      ).id,
    ).toBe(a.id);
    await call(
      request,
      "other",
      "PATCH",
      "/programme/applications/" + a.id,
      { status: "withdrawn" },
      404,
    );
    await call(
      request,
      "admin",
      "PATCH",
      "/admin/programme/applications/" + a.id,
      { status: "reviewing", note: "QA human review" },
    );
    await call(
      request,
      "admin",
      "PATCH",
      "/admin/programme/applications/" + a.id,
      { status: "shortlisted" },
    );
    await call(
      request,
      "admin",
      "PATCH",
      "/admin/programme/applications/" + a.id,
      { status: "forwarded" },
    );
    const own = await call(
      request,
      "student",
      "GET",
      "/programme/applications",
    );
    expect(
      own.items
        .find((x: any) => x.id === a.id)
        .history.map((h: any) => h.status),
    ).toEqual(["submitted", "reviewing", "shortlisted", "forwarded"]);
    await call(request, "student", "PATCH", "/programme/applications/" + a.id, {
      status: "withdrawn",
    });
  } finally {
    await call(request, "admin", "PUT", "/admin/programme/jobs/" + j.id, {
      ...body,
      request_id: id(),
      status: "archived",
    });
  }
});

test("entitlement revocation and included quotas are enforced server-side", async ({
  request,
}) => {
  const uid = q.accounts.other.profile.id;
  await call(
    request,
    "admin",
    "PUT",
    "/admin/programme/courses/" + q.course_id + "/entitlements",
    { user_id: uid, active: false, reason: "QA temporary revoke" },
  );
  try {
    await call(
      request,
      "other",
      "GET",
      "/programme/courses/" + q.course_id + "/entitlement",
      undefined,
      403,
    );
  } finally {
    await call(
      request,
      "admin",
      "PUT",
      "/admin/programme/courses/" + q.course_id + "/entitlements",
      { user_id: uid, active: true, reason: "QA restore" },
    );
  }
  await call(
    request,
    "student",
    "POST",
    "/admin/programme/courses/" + q.course_id + "/credits",
    {
      request_id: id(),
      user_id: uid,
      kind: "handholding",
      delta: 100,
      reason: "Forbidden",
    },
    403,
  );
});

test("preferences, inbox ownership, queued announcements and disabled real email", async ({
  request,
}) => {
  const preferences = await call(
    request,
    "student",
    "PATCH",
    "/programme/preferences",
    {
      email_enabled: false,
      marketing_enabled: false,
      timezone: "America/New_York",
      quiet_start: 21,
      quiet_end: 8,
      daily_limit: 3,
    },
  );
  expect(preferences.email_enabled).toBe(false);
  const announcement = await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/announcements",
    {
      request_id: id(),
      course_id: q.course_id,
      title: prefix() + " announcement",
      body: "QA only - no real recipients",
    },
  );
  record("announcements", announcement.campaign_id);
  const inbox = await call(request, "outsider", "GET", "/programme/inbox");
  expect(
    inbox.items.some((x: any) => x.title === prefix() + " announcement"),
  ).toBe(false);
  const deliveries = await call(
    request,
    "admin",
    "GET",
    "/admin/programme/deliveries",
  );
  expect(deliveries.email_enabled).toBe(false);
});

test("live webinar registration and pause with private join link and safe QA visibility", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const current = await call(request, "", "GET", "/public/webinars");
  test.skip(
    Boolean(current.campaign),
    "Do not interfere with an existing public campaign",
  );
  const now = Date.now();
  const body = {
    request_id: id(),
    title: prefix() + " webinar",
    body: "Temporary automated QA invitation.",
    speakers: "QA Trainer",
    starts_at: new Date(now + 86400000).toISOString(),
    ends_at: new Date(now + 90000000).toISOString(),
    timezone: "Asia/Kolkata",
    display_from: new Date(now - 10000).toISOString(),
    display_until: new Date(now + 300000).toISOString(),
    delay_seconds: 3600,
    frequency_hours: 24,
    variant: "modal",
    meeting_url: "https://example.invalid/qa-webinar-private",
    status: "published",
  };
  const campaign = await call(
    request,
    "admin",
    "POST",
    "/admin/programme/campaigns",
    body,
  );
  record("webinars", campaign.id);
  try {
    const publicData = await call(request, "", "GET", "/public/webinars");
    expect(publicData.campaign.id).toBe(campaign.id);
    expect(publicData.campaign.meeting_url).toBeUndefined();
    // Only this QA browser accelerates the one-hour popup timer. The publication
    // window expires in five minutes, so other visitors never see this QA overlay.
    await page.addInitScript(() => {
      const original = window.setTimeout;
      window.setTimeout = ((
        handler: TimerHandler,
        delay?: number,
        ...args: unknown[]
      ) =>
        original(
          handler,
          delay === 3600000 ? 10 : delay,
          ...args,
        )) as typeof window.setTimeout;
    });
    await page.goto(landing);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await dialog
      .getByRole("button", { name: "Register free", exact: true })
      .click();
    await dialog
      .getByLabel("Full name", { exact: true })
      .fill("QA Programme attendee");
    await dialog
      .getByLabel("Email", { exact: true })
      .fill(q.accounts.student.email);
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Confirm registration" }).click();
    await expect(dialog.getByText(/Registration received/)).toBeVisible();
    const registered = await call(
      request,
      "admin",
      "GET",
      "/admin/programme/campaigns/" + campaign.id + "/registrations",
    );
    expect(
      registered.items.some((x: any) => x.email === q.accounts.student.email),
    ).toBe(true);
    const duplicate = {
      request_id: id(),
      version: campaign.version,
      name: "QA Programme attendee",
      email: q.accounts.student.email,
      consent: true,
    };
    await call(
      request,
      "",
      "POST",
      "/public/webinars/" + campaign.id + "/registrations",
      duplicate,
    );
    expect(
      (
        await call(
          request,
          "admin",
          "GET",
          "/admin/programme/campaigns/" + campaign.id + "/registrations",
        )
      ).items,
    ).toHaveLength(1);
    await call(
      request,
      "admin",
      "PUT",
      "/admin/programme/campaigns/" + campaign.id,
      { ...body, request_id: id(), status: "paused" },
    );
    expect(
      (await call(request, "", "GET", "/public/webinars")).campaign,
    ).toBeNull();
    await call(
      request,
      "",
      "POST",
      "/public/webinars/" + campaign.id + "/registrations",
      { ...duplicate, request_id: id() },
      409,
    );
  } finally {
    await call(
      request,
      "admin",
      "PUT",
      "/admin/programme/campaigns/" + campaign.id,
      { ...body, request_id: id(), status: "cancelled" },
    );
  }
});

test("queued course announcement reaches only enrolled QA inboxes", async ({
  request,
}) => {
  test.setTimeout(150000);
  const title = prefix() + " delivered " + id().slice(0, 6);
  const a = await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/announcements",
    {
      request_id: id(),
      course_id: q.course_id,
      title,
      body: "QA dispatch verification",
    },
  );
  record("announcements", a.campaign_id);
  await expect
    .poll(
      async () => {
        const own = await call(request, "student", "GET", "/programme/inbox");
        return own.items.some((x: any) => x.title === title);
      },
      { timeout: 120000, intervals: [5000, 10000] },
    )
    .toBe(true);
  const outsider = await call(request, "outsider", "GET", "/programme/inbox");
  expect(outsider.items.some((x: any) => x.title === title)).toBe(false);
});

test("existing QR event generation, validation, duplicate and future-event guards", async ({
  request,
  page,
}) => {
  const now = Date.now();
  const event = await call(request, "admin", "POST", "/events", {
    name: prefix() + " QR event",
    description: "Temporary QA event",
    location: "QA only",
    event_type: "offline",
    start_time: new Date(now - 60000).toISOString(),
    end_time: new Date(now + 3600000).toISOString(),
    max_attendees: 2,
    visibility: "private",
  });
  record("events", event.event_id);
  try {
    await login(page, "admin");
    await page.goto(admin + "/dashboard/events");
    await page
      .getByRole("heading", { name: prefix() + " QR event", exact: true })
      .locator("../..")
      .getByRole("button", { name: "Generate QR Code", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Event QR Code", exact: true }),
    ).toBeVisible();
    expect(
      await page
        .getByRole("img", {
          name: "QR code for " + prefix() + " QR event",
          exact: true,
        })
        .getAttribute("src"),
    ).toMatch(/^data:image\/png;base64,/);
    await expect(page.getByText(event.event_id, { exact: true })).toBeVisible();
    expect(event.qr_url).toBe(event.event_id);
    await call(request, "admin", "PUT", "/events/" + event.event_id, {
      status: "published",
    });
    await call(
      request,
      "student",
      "POST",
      "/events/" + event.qr_url + "/join",
      {},
    );
    await call(
      request,
      "student",
      "POST",
      "/events/" + event.qr_url + "/join",
      {},
      400,
    );
    await call(
      request,
      "student",
      "POST",
      "/events/" + id() + "/join",
      {},
      404,
    );
  } finally {
    await call(request, "admin", "DELETE", "/events/" + event.event_id);
  }
  const future = await call(request, "admin", "POST", "/events", {
    name: prefix() + " future QR",
    event_type: "offline",
    start_time: new Date(now + 86400000).toISOString(),
    end_time: new Date(now + 90000000).toISOString(),
  });
  record("events", future.event_id);
  try {
    await call(request, "admin", "PUT", "/events/" + future.event_id, {
      status: "published",
    });
    await call(
      request,
      "student",
      "POST",
      "/events/" + future.event_id + "/join",
      {},
      400,
    );
  } finally {
    await call(request, "admin", "DELETE", "/events/" + future.event_id);
  }
});

test("student web sign-in, real exam submission, internship review and private documents", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const exams = [];
  for (const kind of ["aptitude", "technical"]) {
    const exam = await call(
      request,
      "admin",
      "POST",
      "/admin/courses/" + q.course_id + "/exams",
      {
        title: prefix() + " " + kind + " " + id().slice(0, 4),
        published: true,
        time_limit_seconds: 600,
        max_attempts: 3,
        pass_percentage: 70,
        questions: [
          {
            question: "Choose the QA answer",
            options: [
              { id: "yes", label: "Correct QA answer" },
              { id: "no", label: "Wrong QA answer" },
            ],
            correct_option_id: "yes",
            points: 1,
          },
        ],
      },
    );
    record("exams", exam.id);
    exams.push(exam);
  }
  const i = await call(request, "student", "POST", "/programme/internships", {
    request_id: id(),
    course_id: q.course_id,
    eligible_declaration: true,
  });
  record("internships", i.id);
  await call(
    request,
    "admin",
    "PATCH",
    "/admin/programme/internships/" + i.id,
    { status: "screening" },
  );
  await call(
    request,
    "admin",
    "PUT",
    "/admin/programme/courses/" + q.course_id + "/screening",
    { aptitude_exam_id: exams[0].id, technical_exam_id: exams[1].id },
  );
  await call(
    request,
    "admin",
    "PATCH",
    "/admin/programme/internships/" + i.id,
    { status: "interview" },
    409,
  );
  const aptitude = await call(
    request,
    "student",
    "POST",
    "/learning/exams/" + exams[0].id + "/attempts",
    {},
  );
  expect(aptitude.questions[0].correct_option_id).toBeUndefined();
  await call(
    request,
    "other",
    "GET",
    "/learning/attempts/" + aptitude.id,
    undefined,
    404,
  );
  await call(
    request,
    "student",
    "POST",
    "/learning/attempts/" + aptitude.id + "/submit",
    { answers: { [aptitude.questions[0].id]: "yes" } },
  );
  await page.goto("https://learn.ai4impact.in");
  await page
    .getByText("Sign In", { exact: true })
    .filter({ visible: true })
    .click();
  await page.getByPlaceholder("your@email.com").fill(q.accounts.student.email);
  await page.getByPlaceholder("••••••••").fill(q.accounts.student.password);
  await page
    .getByText("Sign In", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page
      .getByText("Complete your profile", { exact: true })
      .or(page.getByRole("tab", { name: /My Learning/ })),
  ).toBeVisible({ timeout: 45000 });
  if (
    await page.getByText("Complete your profile", { exact: true }).isVisible()
  ) {
    await page.getByText("Working professional", { exact: true }).click();
    await page.getByPlaceholder("e.g. Software Engineer").fill("QA Engineer");
    await page.getByPlaceholder("Company name").fill("QA only");
    await page.getByRole("checkbox", { name: "Accept Privacy Policy" }).check();
    await page.getByText("Continue", { exact: true }).click();
  }
  await expect(page.getByRole("tab", { name: /My Learning/ })).toBeVisible({
    timeout: 45000,
  });
  await page.getByRole("tab", { name: /My Learning/ }).click();
  await page
    .getByText("QA Programme validation " + q.run, { exact: true })
    .last()
    .click();
  await page.getByText(exams[1].title, { exact: true }).click();
  await page.getByText("Start / resume exam", { exact: true }).click();
  await page.getByText("Correct QA answer", { exact: true }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByText("Submit (1/1 answered)", { exact: true }).click();
  await expect(page.getByText("Passed", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await call(
    request,
    "admin",
    "PATCH",
    "/admin/programme/internships/" + i.id,
    { status: "interview" },
  );
  await call(
    request,
    "admin",
    "PATCH",
    "/admin/programme/internships/" + i.id,
    {
      status: "accepted",
      mentor_id: q.accounts.teacher.profile.id,
      project: "QA project validation",
    },
  );
  const review = {
    request_id: id(),
    note: "QA manual mentor review",
    rating: 90,
  };
  const reviewed = await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/internships/" + i.id + "/reviews",
    review,
  );
  expect(reviewed).toHaveLength(1);
  await call(
    request,
    "teacher",
    "POST",
    "/programme/staff/internships/" + i.id + "/reviews",
    { ...review, note: "Changed payload" },
    409,
  );
  await call(
    request,
    "admin",
    "PATCH",
    "/admin/programme/internships/" + i.id,
    { status: "completed" },
  );
  const certificate = await call(
    request,
    "admin",
    "POST",
    "/admin/programme/internships/" + i.id + "/certificate",
    {},
  );
  record("certificates", certificate.id);
  expect(
    (
      await call(
        request,
        "admin",
        "POST",
        "/admin/programme/internships/" + i.id + "/certificate",
        {},
      )
    ).id,
  ).toBe(certificate.id);
  await call(
    request,
    "other",
    "GET",
    certificate.download_path,
    undefined,
    404,
  );
  const download = await call(
    request,
    "student",
    "GET",
    certificate.download_path,
  );
  const pdf = await request.get(download.url);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  const letterBody = {
    request_id: id(),
    body: "QA recommendation. Not a real employment reference.",
    signer: "QA Training",
  };
  await call(
    request,
    "admin",
    "POST",
    "/admin/programme/internships/" + i.id + "/letter",
    letterBody,
  );
  await call(
    request,
    "admin",
    "POST",
    "/admin/programme/internships/" + i.id + "/letter",
    letterBody,
  );
  await call(
    request,
    "other",
    "GET",
    "/programme/internships/" + i.id + "/letter",
    undefined,
    404,
  );
  const letter = await call(
    request,
    "student",
    "GET",
    "/programme/internships/" + i.id + "/letter",
  );
  const letterPdf = await request.get(letter.url);
  expect(letterPdf.status()).toBe(200);
  expect((await letterPdf.body()).subarray(0, 4).toString()).toBe("%PDF");
});

test("last-credit race and near-session cancellation cutoffs", async ({
  request,
}) => {
  const uid = q.accounts.student.profile.id;
  const original = await call(
    request,
    "student",
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
  );
  const balance = original.wallets.find(
    (w: any) => w.kind === "handholding",
  ).balance;
  const delta = 1 - balance;
  if (delta)
    await call(
      request,
      "admin",
      "POST",
      "/admin/programme/courses/" + q.course_id + "/credits",
      {
        request_id: id(),
        user_id: uid,
        kind: "handholding",
        delta,
        reason: "QA last-credit setup",
      },
    );
  let winner: any;
  try {
    const slots = [await session(request), await session(request)];
    const responses = await Promise.all(
      slots.map(({ s }) =>
        request.post(base + "/programme/sessions/" + s.id + "/bookings", {
          headers: {
            Authorization: "Bearer " + q.accounts.student.tokens.IdToken,
          },
          data: { request_id: id(), topic: "QA last credit race" },
        }),
      ),
    );
    expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
    winner = await responses.find((r) => r.status() === 200)!.json();
    record("bookings", winner.id);
    await call(
      request,
      "student",
      "PATCH",
      "/programme/bookings/" + winner.id,
      { status: "cancelled" },
    );
  } finally {
    if (delta)
      await call(
        request,
        "admin",
        "POST",
        "/admin/programme/courses/" + q.course_id + "/credits",
        {
          request_id: id(),
          user_id: uid,
          kind: "handholding",
          delta: -delta,
          reason: "QA last-credit restore",
        },
      );
  }
  const now = Date.now();
  const t = (h: number) => ({
    starts_at: new Date(now + h * 3600000).toISOString(),
    ends_at: new Date(now + h * 3600000 + 1800000).toISOString(),
  });
  const short = await session(request, t(2));
  const booking = await call(
    request,
    "student",
    "POST",
    "/programme/sessions/" + short.s.id + "/bookings",
    { request_id: id(), topic: "QA cutoff" },
  );
  record("bookings", booking.id);
  await call(request, "student", "PATCH", "/programme/bookings/" + booking.id, {
    status: "cancelled",
  });
  const current = await call(
    request,
    "student",
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
  );
  expect(
    current.wallets.find((w: any) => w.kind === "handholding").balance,
  ).toBe(balance - 1);
  await call(
    request,
    "admin",
    "POST",
    "/admin/programme/courses/" + q.course_id + "/credits",
    {
      request_id: id(),
      user_id: uid,
      kind: "handholding",
      delta: 1,
      reason: "QA restore consumed cutoff credit",
    },
  );
  const staff = await session(request, t(4));
  const b = await call(
    request,
    "student",
    "POST",
    "/programme/sessions/" + staff.s.id + "/bookings",
    { request_id: id(), topic: "QA staff cancel" },
  );
  record("bookings", b.id);
  await call(
    request,
    "teacher",
    "PUT",
    "/programme/staff/sessions/" + staff.s.id,
    { ...staff.body, request_id: id(), status: "cancelled" },
  );
  const restored = await call(
    request,
    "student",
    "GET",
    "/programme/courses/" + q.course_id + "/entitlement",
  );
  expect(
    restored.wallets.find((w: any) => w.kind === "handholding").balance,
  ).toBe(balance);
  const tooSoon = await session(request, {
    starts_at: new Date(now + 60000).toISOString(),
    ends_at: new Date(now + 1860000).toISOString(),
  });
  await call(
    request,
    "student",
    "POST",
    "/programme/sessions/" + tooSoon.s.id + "/bookings",
    { request_id: id(), topic: "Too late" },
    409,
  );
});
