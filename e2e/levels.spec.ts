import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import type { LevelData } from '../src/core/level';
import { collectErrors, settle, waitScene } from './helpers';

const levels = readdirSync('src/data/levels')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`src/data/levels/${f}`, 'utf8')) as LevelData);

test('every level loads, renders and replays its solution in the browser', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'desktop covers this');
  test.setTimeout(300_000);
  const errors = await collectErrors(page);
  await page.goto('./');
  await waitScene(page, 'Title');
  for (const l of levels) {
    await page.evaluate(([id, patron]) => window.__POO__!.startLevel(id as string, patron as never), [l.id, l.solution.patron] as const);
    await waitScene(page, 'Battle');
    await settle(page);
    const result = await page.evaluate(async (turns: unknown[][][]) => {
      const b = window.__POO__!.battle()!;
      for (const turn of turns) {
        for (const st of turn) {
          const s = st as [string, string, number | string, number, number];
          const a = s[0] === 'move' ? { type: 'move', unit: st[1], x: st[2], y: st[3] }
            : st[0] === 'act' ? { type: 'act', unit: st[1], ability: st[2], x: st[3], y: st[4] }
            : st[0] === 'favor' ? { type: 'favor', god: st[1], x: st[2], y: st[3], dir: st[4] }
            : { type: 'endTurn' };
          b.dispatch(a as never);
          await b.settle();
        }
      }
      return b.state.phase;
    }, l.solution.turns as unknown as unknown[][][]);
    expect(result, l.id).toBe('won');
  }
  expect(errors).toEqual([]);
});
