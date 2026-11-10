import { test, expect } from "@playwright/test";
import { zonedInputToIso } from "../src/services/programme";
const base = process.env.QA_ADMIN_URL || "http://localhost:3100";
const cid = "00000000-0000-4000-8000-000000000001",
  eid = "00000000-0000-4000-8000-000000000002",
  company = "00000000-0000-4000-8000-000000000003";
async function login(page: import("@playwright/test").Page, admin = true) {
  const payload = Buffer.from(
    JSON.stringify({
      token_use: "id",
      sub: "qa-programme",
      email: "qa@example.invalid",
      "cognito:groups": [admin ? "Admins" : "Students"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  await page.addInitScript(
    (token) => localStorage.setItem("auth_id_token", token),
    "test." + payload + ".test",
  );
}
test("time-zone conversion handles DST gaps and both overlap occurrences", () => {
  expect(zonedInputToIso("2027-01-10T10:00", "Asia/Kolkata")).toBe(
    "2027-01-10T04:30:00.000Z",
  );
  expect(() => zonedInputToIso("2027-03-14T02:30", "America/New_York")).toThrow(
    "does not exist",
  );
  expect(() => zonedInputToIso("2027-11-07T01:30", "America/New_York")).toThrow(
    "occurs twice",
  );
  expect(
    zonedInputToIso("2027-11-07T01:30", "America/New_York", "earlier"),
  ).toBe("2027-11-07T05:30:00.000Z");
  expect(zonedInputToIso("2027-11-07T01:30", "America/New_York", "later")).toBe(
    "2027-11-07T06:30:00.000Z",
  );
});
test("admin session form sends chosen-zone UTC and a stable retry key", async ({
  page,
}) => {
  await login(page);
  const writes: Record<string, unknown>[] = [];
  await page.route(
    "https://*.execute-api.ap-south-1.amazonaws.com/**",
    async (route) => {
      const p = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (p === "/programme/staff/access") json = { admin: true, courses: [] };
      else if (p === "/courses") json = [{ id: cid, title: "QA Course" }];
      else if (p === "/users")
        json = {
          users: [
            { id: eid, name: "Trainer", email: "trainer@example.invalid" },
          ],
        };
      else if (p.endsWith("/educators"))
        json = [{ user_id: eid, name: "Trainer", active: true }];
      else if (p.endsWith("/sessions") && route.request().method() === "POST") {
        writes.push(route.request().postDataJSON());
        return route.fulfill({
          status: 409,
          json: { error: "Slot was just taken" },
        });
      } else if (p.endsWith("/sessions"))
        json = { items: [], next_cursor: null };
      return route.fulfill({ json });
    },
  );
  await page.goto(base + "/dashboard/programme");
  await expect(
    page.getByRole("heading", { name: "Programme+ workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page.getByLabel("Educator", { exact: true }).selectOption(eid);
  await page.getByLabel("Title", { exact: true }).fill("Clarification");
  await page
    .getByLabel("Starts in selected time zone")
    .fill("2027-01-10T10:00");
  await page.getByLabel("Ends in selected time zone").fill("2027-01-10T11:00");
  await page.getByLabel("Seats", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Slot was just taken" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[0].starts_at).toBe("2027-01-10T04:30:00.000Z");
  expect(writes[0].request_id).toBe(writes[1].request_id);
  expect(writes[0].course_id).toBe(cid);
});
test("educator workspace hides unrelated administration and uses scoped routes", async ({
  page,
}) => {
  await login(page, false);
  const forbidden: string[] = [];
  await page.route(
    "https://*.execute-api.ap-south-1.amazonaws.com/**",
    async (route) => {
      const p = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (p === "/programme/staff/access")
        json = {
          admin: false,
          courses: [{ course_id: cid, title: "Assigned course" }],
        };
      else if (p.endsWith("/educators"))
        json = [{ user_id: eid, name: "Trainer", active: true }];
      else if (p.endsWith("/sessions")) json = { items: [], next_cursor: null };
      else if (p.startsWith("/admin/") || p === "/users") forbidden.push(p);
      await route.fulfill({ json });
    },
  );
  await page.goto(base + "/dashboard/programme");
  await expect(
    page.getByRole("heading", { name: "Programme+ workspace" }),
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
  expect(forbidden).toEqual([]);
});
test("job publisher includes consultancy, work mode, experience and salary fields", async ({
  page,
}) => {
  await login(page);
  let saved: Record<string, unknown> | undefined;
  await page.route(
    "https://*.execute-api.ap-south-1.amazonaws.com/**",
    async (route) => {
      const p = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (p === "/programme/staff/access") json = { admin: true, courses: [] };
      else if (p === "/courses") json = [{ id: cid, title: "QA" }];
      else if (p === "/users") json = { users: [] };
      else if (p.endsWith("/educators")) json = [];
      else if (p.endsWith("/companies"))
        json = [{ id: company, name: "Partner company" }];
      else if (p.endsWith("/jobs") && route.request().method() === "POST") {
        saved = route.request().postDataJSON();
        json = { id: company };
      } else json = { items: [], next_cursor: null };
      await route.fulfill({ json });
    },
  );
  await page.goto(base + "/dashboard/programme");
  await page.getByRole("button", { name: "Careers", exact: true }).click();
  await page.getByRole("button", { name: "New job", exact: true }).click();
  await page.getByLabel("Company", { exact: true }).selectOption(company);
  await page.getByLabel("Job title", { exact: true }).fill("Data Engineer");
  await page.getByLabel("Description", { exact: true }).fill("Build pipelines");
  await page.getByLabel("Location", { exact: true }).fill("Hyderabad");
  await page
    .getByLabel("Recruitment / consultancy partner")
    .fill("QA Consulting");
  await page.getByLabel("Work mode", { exact: true }).selectOption("hybrid");
  await page
    .getByLabel("Employment type", { exact: true })
    .selectOption("full_time");
  await page.getByLabel("Maximum experience (years)").fill("2");
  await page.getByLabel("Minimum annual salary").fill("600000");
  await page.getByLabel("Maximum annual salary").fill("900000");
  await page.getByLabel("Application deadline").fill("2027-02-01T17:00");
  await page.getByLabel("Status", { exact: true }).selectOption("published");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => saved?.partner).toBe("QA Consulting");
  expect(saved?.work_mode).toBe("hybrid");
  expect(saved?.experience_max).toBe(2);
  expect(saved?.salary_min).toBe(600000);
});

test("programme is record-first, grouped, searchable and opens accessible editors", async ({
  page,
}) => {
  await login(page);
  await page.route(
    "https://*.execute-api.ap-south-1.amazonaws.com/**",
    async (route) => {
      const p = new URL(route.request().url()).pathname;
      let json: unknown = { items: [], next_cursor: null };
      if (p === "/programme/staff/access") json = { admin: true, courses: [] };
      else if (p === "/courses") json = [{ id: cid, title: "QA Course" }];
      else if (p === "/users") json = { users: [] };
      else if (p.endsWith("/educators"))
        json = [{ user_id: eid, name: "Trainer", active: true }];
      else if (p.endsWith("/companies"))
        json = [{ id: company, name: "Partner company" }];
      else if (p.endsWith("/sessions"))
        json = {
          items: [
            {
              id: eid,
              title: "Group clarification",
              status: "published",
              kind: "group",
            },
          ],
          next_cursor: null,
        };
      await route.fulfill({ json });
    },
  );
  await page.goto(base + "/dashboard/programme");
  await expect(
    page.getByText("Group clarification", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("programme-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Educator", { exact: true })).toHaveCount(0);
  await page.getByLabel("Search sessions").fill("unmatched");
  await expect(
    page.getByText("Group clarification", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/No matches in the loaded records/),
  ).toBeVisible();
  await page.getByLabel("Search sessions").fill("");
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New session" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "New session", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Careers", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sessions", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Jobs", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "New job", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New job" })).toBeVisible();
  await page.getByRole("button", { name: "Close editor" }).click();
  await page
    .getByRole("button", { name: "Communications", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New webinar", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("programme-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /^Menu/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Payments ledger", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
