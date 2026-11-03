import { test, expect } from "@playwright/test";
const base = process.env.QA_LANDING_URL;
test.skip(!base, "Requires a locally served landing static build");
const now = new Date("2026-11-03T12:00:00Z");
const campaign = {
  id: "00000000-0000-4000-8000-000000000009",
  title: "QA webinar",
  body: "Meet our training team",
  speakers: "Trainer",
  starts_at: "2026-11-04T12:00:00Z",
  ends_at: "2026-11-04T13:00:00Z",
  timezone: "Asia/Kolkata",
  display_until: "2026-11-04T12:00:00Z",
  delay_seconds: 5,
  frequency_hours: 24,
  version: 1,
  variant: "modal",
};
test("delayed registration keeps its request key after a recoverable failure", async ({
  page,
}) => {
  await page.clock.install({ time: now });
  const writes: Record<string, unknown>[] = [];
  await page.route("**/public/webinars**", async (route) => {
    if (route.request().url().endsWith("/registrations")) {
      writes.push(route.request().postDataJSON());
      return route.fulfill({
        status: writes.length === 1 ? 503 : 200,
        json:
          writes.length === 1
            ? { error: "Please retry" }
            : { message: "Received" },
      });
    }
    await route.fulfill({
      json: route.request().method() === "GET" ? { campaign } : { ok: true },
    });
  });
  await page.goto(base!);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Register free", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Full name", { exact: true })
    .fill("QA Person");
  await page
    .getByRole("dialog")
    .getByLabel("Email", { exact: true })
    .fill("qa@example.invalid");
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm registration" }).click();
  await expect(page.getByText("Please retry", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm registration" }).click();
  await expect(page.getByText(/Registration received/)).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[0].request_id).toBe(writes[1].request_id);
  expect(writes[0].version).toBe(1);
});
test("paused campaign disappears on the next configuration refresh", async ({
  page,
}) => {
  await page.clock.install({ time: now });
  let active = true;
  await page.route("**/public/webinars**", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? {
              campaign: active
                ? { ...campaign, variant: "toast", delay_seconds: 0 }
                : null,
            }
          : { ok: true },
    }),
  );
  await page.goto(base!);
  await page.clock.fastForward(1000);
  await expect(
    page.getByRole("complementary", { name: "Webinar invitation" }),
  ).toBeVisible();
  active = false;
  await page.clock.fastForward(31000);
  await expect(
    page.getByRole("complementary", { name: "Webinar invitation" }),
  ).toHaveCount(0);
});
test("an open invitation closes at its publication expiry", async ({
  page,
}) => {
  await page.clock.install({ time: now });
  await page.route("**/public/webinars**", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? {
              campaign: {
                ...campaign,
                delay_seconds: 0,
                display_until: "2026-11-03T12:00:10Z",
              },
            }
          : { ok: true },
    }),
  );
  await page.goto(base!);
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.fastForward(11000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
