import { expect, test } from '@playwright/test';

test('game boots at an integer scale with no console errors or 404s', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });

  await page.goto('./');
  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();

  const { w, h, dpr } = await canvas.evaluate((c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    return { w: r.width, h: r.height, dpr: window.devicePixelRatio };
  });
  const fx = (w * dpr) / 320;
  const fy = (h * dpr) / 180;
  expect(Math.abs(fx - Math.round(fx))).toBeLessThan(0.01);
  expect(Math.round(fx)).toBe(Math.round(fy));
  expect(Math.round(fx)).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
