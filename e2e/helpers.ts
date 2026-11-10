import { expect, type Page } from '@playwright/test';
import type { LevelData, SolutionStep } from '../src/core/level';

export async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

export async function waitScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => window.__POO__?.scene() === k || (k === 'Battle' && !!window.__POO__?.battle()), key, { timeout: 15_000 });
}

export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => window.__POO__!.settle());
}

/** Click (mouse) or tap (touch) at a CSS point. */
export async function press(page: Page, p: { x: number; y: number }, touch: boolean): Promise<void> {
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(30);
}

export async function pressTile(page: Page, x: number, y: number, touch: boolean, confirm = false): Promise<void> {
  const p = await page.evaluate(([tx, ty]) => window.__POO__!.tileToClient(tx!, ty!), [x, y]);
  await press(page, p, touch);
  // touch: first tap previews, second confirms
  if (touch && confirm) await press(page, p, touch);
  await settle(page);
}

export async function pressButton(page: Page, label: string, touch: boolean): Promise<void> {
  const p = await page.evaluate((l) => window.__POO__!.buttonToClient(l), label);
  expect(p, `button "${label}" on screen`).not.toBeNull();
  await press(page, p!, touch);
  await page.waitForTimeout(40);
  await settle(page);
}

async function heroPos(page: Page, id: string): Promise<{ x: number; y: number }> {
  return page.evaluate((h) => {
    const u = window.__POO__!.battle()!.state.units.find((v) => v.id === h)!;
    return { x: u.x, y: u.y };
  }, id);
}

/** Play a recorded solution through real clicks / taps. */
export async function playSolution(page: Page, level: LevelData, touch: boolean): Promise<void> {
  for (const turn of level.solution.turns) {
    for (const st of turn as SolutionStep[]) {
      if (st[0] === 'endTurn') {
        await pressButton(page, 'End turn', touch);
      } else if (st[0] === 'move' || st[0] === 'act') {
        const h = await heroPos(page, st[1]);
        await pressTile(page, h.x, h.y, touch);
        const [tx, ty] = st[0] === 'move' ? [st[2], st[3]] : [st[3], st[4]];
        await pressTile(page, tx, ty, touch, true);
      } else if (st[0] === 'favor') {
        const label = st[1][0]!.toUpperCase() + st[1].slice(1);
        await pressButton(page, label, touch);
        await pressTile(page, st[2], st[3], touch, true);
      }
    }
  }
}

/** Click through cutscenes, intro cards and the briefing until a battle starts. */
export async function throughFlow(page: Page, touch: boolean): Promise<void> {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => !!window.__POO__!.battle())) return;
    const scene = await page.evaluate(() => window.__POO__!.scene());
    if (scene === 'Cutscene') await pressButton(page, 'Skip', touch);
    else if (scene === 'Cards') {
      const skip = await page.evaluate(() => window.__POO__!.buttonToClient('Skip'));
      await pressButton(page, skip ? 'Skip' : 'Continue', touch);
    } else if (scene === 'Briefing') await pressButton(page, 'Play', touch);
    await page.waitForTimeout(150);
  }
  throw new Error('flow did not reach a battle');
}

/** Level 1's tutorial, played with real clicks or taps. */
export async function playTutorial(page: Page, touch: boolean): Promise<string[]> {
  const step = () => page.evaluate(() => window.__POO__!.battle()!.tut?.step ?? 'none');
  const steps: string[] = [await step()];
  const note = async () => { const s = await step(); if (steps[steps.length - 1] !== s) steps.push(s); };
  await pressTile(page, 1, 3, touch); await note(); // select Achilles
  await pressTile(page, 4, 3, touch, true); await note(); // move to the framed tile
  await pressTile(page, 4, 2, touch, true); await note(); // strike
  // read the other spearman: hover with a mouse, tap on touch
  const p = await page.evaluate(() => window.__POO__!.tileToClient(5, 4));
  if (touch) await press(page, p, true); else await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await note();
  await pressButton(page, 'End turn', touch); await note();
  await page.waitForFunction(() => window.__POO__!.battle()!.state.turn === 2);
  await settle(page);
  await note();
  await pressTile(page, 4, 4, touch, true); await note(); // dodge
  await pressButton(page, 'Undo', touch); await note();
  await pressTile(page, 5, 2, touch, true); await note(); // step off the red again
  await pressTile(page, 5, 3, touch, true); await note(); // strike
  return steps;
}
