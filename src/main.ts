import Phaser from 'phaser';
import { makeConfig } from './game/config';
import { attachIntegerScaler } from './game/scaler';
import { BootScene } from './scenes/Boot';
import { TitleScene } from './scenes/Title';
import { BattleScene } from './scenes/Battle';
import { ResultScene } from './scenes/Result';
import { tileOrigin } from './view/layout';
import type { PatronId } from './core/types';

const game = new Phaser.Game(makeConfig([BootScene, TitleScene, BattleScene, ResultScene]));

game.events.once(Phaser.Core.Events.READY, () => {
  attachIntegerScaler(game.canvas, () => game.scale.refresh());
});

/**
 * Test hook for Playwright (see .claude/skills/pawns-playtest). Read-only
 * inspection plus helpers to drive the real UI; nothing here bypasses rules.
 */
const hook = {
  game,
  scene(): string | null {
    const active = game.scene.getScenes(true);
    return active.length ? active[active.length - 1]!.scene.key : null;
  },
  battle(): BattleScene | null {
    const b = game.scene.getScene('Battle') as BattleScene | null;
    return b && b.scene.isActive() ? b : null;
  },
  startLevel(id: string, patron?: PatronId | null): void {
    for (const s of game.scene.getScenes(true)) if (s.scene.key !== 'Battle') s.scene.stop();
    const b = game.scene.getScene('Battle');
    if (b.scene.isActive()) b.scene.restart({ levelId: id, patron });
    else game.scene.start('Battle', { levelId: id, patron });
  },
  /** CSS-pixel centre of a board tile, for real clicks/taps. */
  tileToClient(x: number, y: number): { x: number; y: number } {
    const b = hook.battle();
    if (!b) throw new Error('no battle');
    const o = tileOrigin(b.board.layout, x, y);
    return hook.gameToClient(o.px + 12, o.py + 9);
  },
  gameToClient(gx: number, gy: number): { x: number; y: number } {
    const r = game.canvas.getBoundingClientRect();
    return { x: r.left + (gx * r.width) / 320, y: r.top + (gy * r.height) / 180 };
  },
  /** CSS-pixel centre of an on-screen button by its label. */
  buttonToClient(label: string): { x: number; y: number } | null {
    for (const s of game.scene.getScenes(true)) {
      for (const o of s.children.list) {
        const img = o as Phaser.GameObjects.Image;
        if (img.getData?.('label') === label && img.visible) return hook.gameToClient(img.x + img.width / 2, img.y + img.height / 2);
      }
    }
    return null;
  },
  settle(): Promise<void> {
    return hook.battle()?.settle() ?? Promise.resolve();
  },
};

declare global {
  interface Window {
    __POO__?: typeof hook;
  }
}
window.__POO__ = hook;
