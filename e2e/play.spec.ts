import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { LevelData } from '../src/core/level';
import { collectErrors, playSolution, playTutorial, pressButton, pressTile, settle, throughFlow, waitScene } from './helpers';

const lvl = (id: string) => JSON.parse(readFileSync(`src/data/levels/${id}.json`, 'utf8')) as LevelData;
const a102 = lvl('a1-02');

test('title -> intro cards -> briefing -> Level 1 tutorial, step by step -> victory screen', async ({ page }, info) => {
  const touch = info.project.name === 'touch';
  const errors = await collectErrors(page);
  await page.goto('./');
  await waitScene(page, 'Title');
  await pressButton(page, 'New campaign', touch);
  // act intro and pre-level scene
  for (let i = 0; i < 2; i++) { await waitScene(page, 'Cutscene'); await pressButton(page, 'Skip', touch); }
  // intro cards for what is new in Level 1, walked with Next
  await waitScene(page, 'Cards');
  const ids = await page.evaluate(() => (window.__POO__!.game.scene.getScene('Cards') as unknown as { d: { ids: string[] } }).d.ids);
  expect(ids).toEqual(['achilles', 'spearman', 'water']);
  await pressButton(page, 'Next', touch);
  await pressButton(page, 'Next', touch);
  await pressButton(page, 'Continue', touch);
  await waitScene(page, 'Briefing');
  await pressButton(page, 'Play', touch);
  await waitScene(page, 'Battle');
  await settle(page);
  const steps = await playTutorial(page, touch);
  expect(steps).toEqual(['select', 'move', 'strike', 'read', 'endTurn', 'dodge', 'undo', 'finish', 'done']);
  await waitScene(page, 'Result');
  const phase = await page.evaluate(() => window.__POO__!.battle()!.state.phase);
  expect(phase).toBe('won');
  // stars get awarded, then Next leads to Level 2
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pawns-of-olympus/save')!).tutorialDone)).toBe(true);
  await pressButton(page, 'Next', touch);
  await throughFlow(page, touch);
  await page.waitForFunction(() => window.__POO__?.battle()?.level.id === 'a1-02');
  // seen cards are not shown again, and the tutorial does not run outside Level 1
  expect(await page.evaluate(() => window.__POO__!.battle()!.tut)).toBeNull();
  expect(errors).toEqual([]);
});

test('Level 2 with Zeus, through the UI', async ({ page }, info) => {
  const touch = info.project.name === 'touch';
  const errors = await collectErrors(page);
  await page.goto('./?level=a1-02');
  await waitScene(page, 'Battle');
  await playSolution(page, a102, touch);
  await waitScene(page, 'Result');
  expect(await page.evaluate(() => window.__POO__!.battle()!.state.phase)).toBe('won');
  expect(errors).toEqual([]);
});

test('undo, invalid moves and restart behave', async ({ page }, info) => {
  const touch = info.project.name === 'touch';
  await page.goto('./?level=a1-01');
  await waitScene(page, 'Battle');
  const ach = () => page.evaluate(() => { const u = window.__POO__!.battle()!.state.units.find((v) => v.id === 'achilles')!; return [u.x, u.y]; });
  await pressTile(page, 1, 3, touch);
  await pressTile(page, 2, 3, touch, true);
  expect(await ach()).toEqual([2, 3]);
  await pressButton(page, 'Undo', touch);
  expect(await ach()).toEqual([1, 3]);
  // water is not a destination: nothing happens
  await pressTile(page, 1, 0, touch, true);
  expect(await ach()).toEqual([1, 3]);
  await pressTile(page, 1, 3, touch);
  await pressTile(page, 3, 3, touch, true);
  await pressButton(page, 'Restart', touch);
  await waitScene(page, 'Battle');
  await settle(page);
  expect(await ach()).toEqual([1, 3]);
});

test('keyboard can play a turn', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'keyboard test runs on desktop');
  await page.goto('./?level=a1-01');
  await waitScene(page, 'Battle');
  await settle(page);
  await page.locator('#game canvas').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(100);
  // Achilles starts selected at (1,3); cursor starts at him
  await page.keyboard.press('Tab');
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight']) await page.keyboard.press(k);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const u = window.__POO__!.battle()!.state.units.find((v) => v.id === 'achilles')!; return u.x === 4 && u.y === 3; }, null, { timeout: 5000 });
  await settle(page);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__POO__!.battle()!.state.turn === 2, null, { timeout: 5000 });
});
