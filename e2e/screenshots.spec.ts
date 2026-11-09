import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// `npm run screenshots`: captures the art gallery and every game screen into
// docs/screenshots/. View the PNGs afterwards (Read tool) and review them.
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

test('gallery', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('./gallery.html');
  await page.waitForSelector('body[data-ready="1"]');
  await page.screenshot({ path: `${OUT}/gallery-full.png`, fullPage: true });
  const sections = page.locator('section');
  const n = await sections.count();
  for (let i = 0; i < n; i++) await sections.nth(i).screenshot({ path: `${OUT}/gallery-${String(i).padStart(2, '0')}.png` });
});
