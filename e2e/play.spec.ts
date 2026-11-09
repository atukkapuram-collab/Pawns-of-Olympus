import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { LevelData } from '../src/core/level';
import { collectErrors, playSolution, pressButton, pressTile, settle, waitScene } from './helpers';

const lvl = (id: string) => JSON.parse(readFileSync(`src/data/levels/${id}.json`, 'utf8')) as LevelData;
const a101 = lvl('a1-01');
const a102 = lvl('a1-02');

test('title -> Level 1 -> win through the UI -> victory screen', async ({ page }, info) => {
  const touch = info.project.name === 'touch';
  const errors = await collectErrors(page);
  await page.goto('./');
  await waitScene(page, 'Title');
  await pressButton(page, 'New campaign', touch);
  await waitScene(page, 'Battle');
  await settle(page);
  await playSolution(page, a101, touch);
  await waitScene(page, 'Result');
  const phase = await page.evaluate(() => window.__POO__!.battle()!.state.phase);
  expect(phase).toBe('won');
  // stars get awarded, then Next leads to Level 2
  await page.waitForTimeout(1000);
  await pressButton(page, 'Next', touch);
  await page.waitForFunction(() => window.__POO__?.battle()?.level.id === 'a1-02');
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
  await page.locator('#game canvas').click({ position: { x: 5, y: 5 } });
  // Achilles starts selected at (1,3); cursor starts at him
  await page.keyboard.press('Tab');
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight']) await page.keyboard.press(k);
  await page.keyboard.press('Enter');
  await settle(page);
  const pos = await page.evaluate(() => { const u = window.__POO__!.battle()!.state.units.find((v) => v.id === 'achilles')!; return [u.x, u.y]; });
  expect(pos).toEqual([4, 3]);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(100);
  await settle(page);
  expect(await page.evaluate(() => window.__POO__!.battle()!.state.turn)).toBe(2);
});
