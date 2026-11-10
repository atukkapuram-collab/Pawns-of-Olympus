import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { settle, waitScene } from './helpers';

// `npm run screenshots`: captures the art gallery and every game screen into
// docs/screenshots/ at real size (1x canvas) and 2x. View them afterwards.
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

async function shoot(page: Page, name: string): Promise<void> {
  const canvas = page.locator('#game canvas');
  // 1x: read the internal 320x180 canvas directly (exact pixels)
  const data = await page.evaluate(() => (document.querySelector('#game canvas') as HTMLCanvasElement).toDataURL('image/png'));
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`${OUT}/${name}-1x.png`, Buffer.from(data.split(',')[1]!, 'base64'));
  await canvas.screenshot({ path: `${OUT}/${name}-2x.png` });
}

test('gallery', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('./gallery.html');
  await page.waitForSelector('body[data-ready="1"]');
  await page.screenshot({ path: `${OUT}/gallery-full.png`, fullPage: true });
  const sections = page.locator('section');
  const n = await sections.count();
  for (let i = 0; i < n; i++) await sections.nth(i).screenshot({ path: `${OUT}/gallery-${String(i).padStart(2, '0')}.png` });
});

test('game screens', async ({ page }) => {
  test.setTimeout(900_000);
  // 640x360 viewport -> exactly 2x scale for the 2x captures
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('./');
  await waitScene(page, 'Title');
  await page.waitForTimeout(300);
  await shoot(page, 'title');

  // menu screens, reached directly through the scene manager
  const go = async (key: string, data: object, name: string) => {
    await page.evaluate(() => { const g = window.__POO__!.game; for (const s of g.scene.getScenes(true)) s.scene.stop(); });
    await page.waitForTimeout(80);
    await page.evaluate(([k, d]) => window.__POO__!.game.scene.start(k as string, d as object), [key, data] as const);
    await page.waitForTimeout(450);
    await shoot(page, name);
  };
  await go('LevelSelect', { act: 1 }, 'levelselect-act1');
  await go('Briefing', { levelId: 'a1-01' }, 'briefing-a1-01');
  await go('Briefing', { levelId: 'a1-04' }, 'briefing-a1-04');
  await go('Briefing', { levelId: 'a2-05' }, 'briefing-a2-05');
  await go('Briefing', { levelId: 'a3-05' }, 'briefing-a3-05');
  for (const id of ['achilles', 'archer', 'odysseus', 'hector', 'zeus', 'apollo', 'brush', 'protect', 'stealth']) {
    await go('Cards', { ids: [id], mode: 'intro', then: { scene: 'Title' } }, `card-${id}`);
  }
  await page.evaluate(() => localStorage.setItem('pawns-of-olympus/save', JSON.stringify({ version: 1, levels: {}, lastLevel: null, seenScenes: ['card:achilles', 'card:spearman', 'card:water', 'card:ajax', 'card:archer', 'card:zeus', 'card:rock'], attempts: {}, hints: {}, tutorialDone: false })));
  await go('Codex', {}, 'codex');
  await go('Cutscene', { kind: 'act', act: 1, then: { scene: 'Title' } }, 'cutscene-act1');
  await go('Cutscene', { kind: 'pre', act: 1, levelId: 'a1-05', then: { scene: 'Title' } }, 'cutscene-pre');
  await go('Settings', { back: 'Title' }, 'settings');
  await go('Credits', {}, 'credits');

  for (const id of ['a1-01', 'a1-02', 'a1-03', 'a1-04', 'a1-05', 'a2-01', 'a2-02', 'a2-03', 'a2-04', 'a2-05', 'a3-01', 'a3-02', 'a3-03', 'a3-04', 'a3-05']) {
    await page.evaluate((l) => window.__POO__!.startLevel(l), id);
    await waitScene(page, 'Battle');
    await settle(page);
    await page.waitForTimeout(200);
    await shoot(page, `battle-${id}`);
  }
  // Level 1 tutorial: the first steps
  await go('Battle', { levelId: 'a1-01', patron: null, tutorial: true }, 'tutorial-1-select');
  await page.evaluate(async () => { const b = window.__POO__!.battle()!; b.tapTile(1, 3); await b.settle(); });
  await page.waitForTimeout(200);
  await shoot(page, 'tutorial-2-move');
  await page.evaluate(async () => { const b = window.__POO__!.battle()!; b.tapTile(4, 3); await b.settle(); b.tapTile(4, 2); await b.settle(); });
  await page.waitForTimeout(400);
  await shoot(page, 'tutorial-4-read');
  // hint panel (after two restarts) on Level 8
  await page.evaluate(() => localStorage.setItem('pawns-of-olympus/save', JSON.stringify({ version: 1, levels: {}, lastLevel: null, seenScenes: [], attempts: { 'a2-03': 2 }, hints: {}, tutorialDone: true })));
  await page.evaluate(() => window.__POO__!.startLevel('a2-03'));
  await waitScene(page, 'Battle');
  await page.waitForTimeout(300);
  await shoot(page, 'battle-a2-03-hint-button');
  await page.evaluate(() => (window.__POO__!.battle() as unknown as { openHint(): void }).openHint());
  await page.waitForTimeout(200);
  await shoot(page, 'battle-a2-03-hint-1');

  // a hovered move tile + an enemy card
  await page.evaluate(() => window.__POO__!.startLevel('a1-02'));
  await waitScene(page, 'Battle');
  const p = await page.evaluate(() => window.__POO__!.tileToClient(6, 3));
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(150);
  await shoot(page, 'battle-a1-02-hover-archer');

  // victory screen via the recorded solution (fast path: dispatch)
  await page.evaluate(async () => {
    const h = window.__POO__!;
    h.startLevel('a1-01');
  });
  await waitScene(page, 'Battle');
  await page.evaluate(async () => {
    const b = window.__POO__!.battle()!;
    b.dispatch({ type: 'move', unit: 'achilles', x: 4, y: 3 });
    await b.settle();
    b.dispatch({ type: 'act', unit: 'achilles', ability: 'strike', x: 4, y: 2 });
    await b.settle();
    b.dispatch({ type: 'endTurn' });
    await b.settle();
    b.dispatch({ type: 'act', unit: 'achilles', ability: 'strike', x: 5, y: 3 });
    await b.settle();
  });
  await waitScene(page, 'Result');
  await page.waitForTimeout(1200);
  await shoot(page, 'victory');

  // defeat: Level 1 alone, ending turns until night falls
  await page.evaluate(() => window.__POO__!.startLevel('a1-01'));
  await waitScene(page, 'Battle');
  await page.evaluate(async () => {
    const b = window.__POO__!.battle()!;
    for (let i = 0; i < 12 && b.state.phase === 'player'; i++) { b.dispatch({ type: 'endTurn' }); await b.settle(); }
  });
  await waitScene(page, 'Result');
  await page.waitForTimeout(600);
  await shoot(page, 'defeat');
});
