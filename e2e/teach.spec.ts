import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { LevelData } from '../src/core/level';
import { collectErrors, pressButton, settle, waitScene } from './helpers';

const lvl = (id: string) => JSON.parse(readFileSync(`src/data/levels/${id}.json`, 'utf8')) as LevelData;

test('hints: hidden at first, offered after 2 restarts, unlock one at a time; hint 3 plays turn 1', async ({ page }, info) => {
  const touch = info.project.name === 'touch';
  const errors = await collectErrors(page);
  const level = lvl('a1-03');
  await page.goto('./?level=a1-03');
  await waitScene(page, 'Battle');
  await settle(page);
  const hintBtn = () => page.evaluate(() => window.__POO__!.buttonToClient('Need a hint?'));
  expect(await hintBtn()).toBeNull();
  for (let i = 0; i < 2; i++) {
    await pressButton(page, 'Restart', touch);
    await waitScene(page, 'Battle');
    await settle(page);
  }
  expect(await hintBtn()).not.toBeNull();
  await pressButton(page, 'Need a hint?', touch);
  await pressButton(page, 'Another hint', touch);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pawns-of-olympus/save')!).hints['a1-03'])).toBe(2);
  await pressButton(page, 'Show turn 1', touch);
  await waitScene(page, 'Battle');
  await page.waitForFunction(() => window.__POO__!.battle()!.demoActive);
  // one Next per step of the recorded first turn
  for (let i = 0; i < level.solution.turns[0]!.length; i++) {
    await page.waitForFunction(() => !!window.__POO__!.buttonToClient('Next'));
    await pressButton(page, 'Next', touch);
    await settle(page);
  }
  await page.waitForFunction(() => !window.__POO__!.battle()!.demoActive);
  const s = await page.evaluate(() => { const b = window.__POO__!.battle()!; return { turn: b.state.turn, patron: b.state.patron, phase: b.state.phase }; });
  expect(s).toEqual({ turn: 2, patron: level.solution.patron, phase: 'player' });
  // stars are not touched by hints: nothing recorded yet, and attempts were counted
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('pawns-of-olympus/save')!));
  expect(save.attempts['a1-03']).toBe(2);
  expect(save.levels['a1-03']).toBeUndefined();
  expect(errors).toEqual([]);
});

test('tutorial can be skipped, and replayed from the pause menu', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'desktop covers menus');
  await page.goto('./');
  await waitScene(page, 'Title');
  await page.evaluate(() => window.__POO__!.game.scene.getScene('Title').scene.start('Battle', { levelId: 'a1-01', patron: null, tutorial: true }));
  await waitScene(page, 'Battle');
  await settle(page);
  expect(await page.evaluate(() => window.__POO__!.battle()!.tut?.step)).toBe('select');
  // End turn is refused while the tutorial asks for something else
  await pressButton(page, 'End turn', false);
  expect(await page.evaluate(() => window.__POO__!.battle()!.state.turn)).toBe(1);
  await pressButton(page, 'Skip tutorial', false);
  expect(await page.evaluate(() => window.__POO__!.battle()!.tut?.active)).toBe(false);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pawns-of-olympus/save')!).tutorialDone)).toBe(true);
  // free play again: End turn works
  await pressButton(page, 'End turn', false);
  await page.waitForFunction(() => window.__POO__!.battle()!.state.turn === 2);
  await page.locator('#game canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('KeyP');
  await waitScene(page, 'Pause');
  await pressButton(page, 'Replay tutorial', false);
  await page.waitForFunction(() => window.__POO__!.battle()?.tut?.step === 'select' && window.__POO__!.battle()!.state.turn === 1);
});

test('codex lists seen cards; title and pause open it', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'desktop covers menus');
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('pawns-of-olympus/save', JSON.stringify({ version: 1, levels: {}, lastLevel: null, seenScenes: ['card:achilles', 'card:spearman'], attempts: {}, hints: {}, tutorialDone: true })));
  await page.reload();
  await waitScene(page, 'Title');
  await pressButton(page, 'Codex', false);
  await waitScene(page, 'Codex');
  expect(await page.evaluate(() => window.__POO__!.buttonToClient('Ajax'))).toBeNull();
  await pressButton(page, 'Spearman', false);
  await waitScene(page, 'Cards');
  await pressButton(page, 'Back', false);
  await pressButton(page, 'Next', false);
  await pressButton(page, 'Close', false);
  await waitScene(page, 'Codex');
  await pressButton(page, 'Close', false);
  await waitScene(page, 'Title');
});

test('briefing: objective, patron choice and Play', async ({ page }, info) => {
  const touch = info.project.name === 'touch';
  await page.goto('./');
  await waitScene(page, 'Title');
  await page.evaluate(() => window.__POO__!.game.scene.getScene('Title').scene.start('Briefing', { levelId: 'a1-04' }));
  await waitScene(page, 'Briefing');
  await pressButton(page, 'Athena', touch);
  await pressButton(page, 'Play', touch);
  await waitScene(page, 'Battle');
  expect(await page.evaluate(() => window.__POO__!.battle()!.state.patron)).toBe('athena');
});
