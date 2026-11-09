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
