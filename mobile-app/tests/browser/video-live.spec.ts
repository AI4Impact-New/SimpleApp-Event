/** Run only against the deployed portal with an explicitly supplied local QA fixture. */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const fixture = process.env.QA_VIDEO_STATE;
test.skip(!fixture || !process.env.QA_STUDENT_URL, 'Requires deployed portal and local synthetic-account fixture');

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
 test.describe(`${viewport.width}px`, () => {
 test.use({ viewport });
 test('live uploaded MP4, enrollment boundary, watermark, fullscreen and renewable playback', async ({ page, request }) => {
  test.setTimeout(120_000);
  const qa = JSON.parse(fs.readFileSync(fixture!, 'utf8'));
  const api = 'https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com';
  const endpoint = `${api}/learning/classes/${qa.class_id}/playback`;
  expect((await request.get(endpoint)).status()).toBe(401);
  expect((await request.get(endpoint, { headers: { Authorization: qa.outsider.token } })).status()).toBe(403);
  const allowed = await request.get(endpoint, { headers: { Authorization: qa.student.token } });
  expect(allowed.status()).toBe(200);
  const playback = await allowed.json();
  expect(playback.expires_in).toBe(900);
  expect(playback.watermark.student_id).toBe(qa.student.id);
  expect(playback.duration_seconds).toBe(1359);
  const range = await request.get(playback.url, { headers: { Range: 'bytes=0-1023' } });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(1024);
  const plain = new URL(playback.url); plain.search = '';
  expect((await request.get(plain.toString(), { headers: { Range: 'bytes=0-1023' } })).status()).toBe(403);

  await page.clock.install();
  await page.goto('/login');
  await page.getByPlaceholder('your@email.com').fill(qa.student.email);
  await page.getByPlaceholder('••••••••').fill(qa.student.password);
  await page.getByText('Sign In', { exact: true }).click();
  await expect(page.getByRole('tab', { name: /My learning/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('tab', { name: /My learning/i }).click();
  await page.getByText('QA — Video Watermark Demo', { exact: true }).last().click();
  const initialResponse = page.waitForResponse(response => response.url().endsWith(`/learning/classes/${qa.class_id}/playback`) && response.status() === 200);
  await page.getByText('London Diaries — Protected Video Test', { exact: true }).last().click();
  const initialPlayback = await (await initialResponse).json();
  const mark = page.getByTestId('video-watermark');
  await expect(mark).toContainText(qa.student.id, { timeout: 30_000 });
  await expect(mark).toContainText('AI4Impact');
  await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2, { timeout: 30_000 });
  const play = () => page.getByRole('button', { name: 'Play', exact: true }).last().click();
  await play();
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).last().click();
  // Seek near the end of the full 390 MiB upload to exercise CloudFront byte ranges.
  await page.locator('video').evaluate((v: HTMLVideoElement) => { v.currentTime = 1340; });
  await page.waitForFunction(() => { const v = document.querySelector('video'); return !!v && !v.seeking && v.readyState >= 2 && v.currentTime >= 1339; });
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute('data-testid'))).toBe('protected-video-stage');
  await expect(mark).toBeVisible();
  const box = await mark.boundingBox();
  await page.clock.fastForward(26_000);
  await expect.poll(async () => JSON.stringify(await mark.boundingBox())).not.toBe(JSON.stringify(box));
  await page.screenshot({ path: process.env.QA_VIDEO_SCREENSHOT || `/tmp/video-watermark-live-${viewport.width}.png` });
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  const renewal = page.waitForResponse(response => response.url().endsWith(`/learning/classes/${qa.class_id}/playback`) && response.status() === 200);
  // Accelerate the client timer only. The deployed API/CloudFront/Cognito stay real and unmodified.
  await page.clock.fastForward(780_000);
  const renewed = await (await renewal).json();
  expect(renewed.session_id).not.toBe(initialPlayback.session_id);
  expect(renewed.watermark.student_id).toBe(qa.student.id);
  await expect(mark).toBeVisible();
  await play();
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
});

 });
}
