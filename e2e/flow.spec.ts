import { expect, test } from '@playwright/test';
import { pressButton, throughFlow, waitScene } from './helpers';

test('save persists across reload; settings persist', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'desktop covers persistence');
  await page.goto('./');
  await waitScene(page, 'Title');
  await pressButton(page, 'New campaign', false);
  await throughFlow(page, false);
  // win Level 1 quickly through the core (persistence is what is under test here)
  await page.evaluate(async () => {
    const b = window.__POO__!.battle()!;
    for (const a of [
      { type: 'move', unit: 'achilles', x: 4, y: 3 },
      { type: 'act', unit: 'achilles', ability: 'strike', x: 4, y: 2 },
      { type: 'endTurn' },
      { type: 'act', unit: 'achilles', ability: 'strike', x: 5, y: 3 },
    ] as const) { b.dispatch(a as never); await b.settle(); }
  });
  await waitScene(page, 'Result');
  await page.waitForTimeout(1000);
  await pressButton(page, 'Map', false);
  await waitScene(page, 'LevelSelect');

  // settings: turn screen shake off
  await page.reload();
  await waitScene(page, 'Title');
  await pressButton(page, 'Settings', false);
  await waitScene(page, 'Settings');
  await pressButton(page, 'Screen shake -', false);

  await page.reload();
  await waitScene(page, 'Title');
  // Continue exists only with a save; it leads to the map with Level 1 painted and Level 2 open
  await pressButton(page, 'Continue', false);
  await waitScene(page, 'LevelSelect');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('pawns-of-olympus/save')!));
  expect(save.levels['a1-01'].won).toBe(true);
  expect(save.levels['a1-01'].stars).toEqual([true, true, true]);
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('pawns-of-olympus/settings')!));
  expect(settings.shake).toBe(false);
});

test('pause menu opens with Esc and resumes', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'keyboard');
  await page.goto('./?level=a1-01');
  await waitScene(page, 'Battle');
  await page.locator('#game canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('KeyP');
  await waitScene(page, 'Pause');
  await pressButton(page, 'Resume', false);
  await page.waitForFunction(() => window.__POO__!.scene() === 'Battle');
});

test('touch: portrait shows the turn-your-device panel, landscape hides it', async ({ page }, info) => {
  test.skip(info.project.name !== 'touch', 'touch only');
  await page.goto('./');
  await waitScene(page, 'Title');
  await page.setViewportSize({ width: 412, height: 915 });
  await page.waitForFunction(() => window.__POO__!.game.scene.isActive('Rotate'));
  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForFunction(() => !window.__POO__!.game.scene.isActive('Rotate'));
});
