/**
 * Effects: number pops, dither fades, pottery shatter, banners, screen shake.
 * Every fade is an ordered dither (palette pixels on/off), never alpha.
 */
import Phaser from 'phaser';
import { C, type ColorIndex } from '../art/palette';
import { CLEAR } from '../art/palette';
import { PixelBuffer, ditherOn } from '../art/pixels';
import { textBuffer } from '../art/font';
import { panel } from '../art/ui';
import { godSilhouette } from '../art/sprites/gods';
import { DEPTH } from './BoardView';
import { ensureTexture } from './textures';
import { tween, wait } from './ui';

export interface FxSettings {
  shake: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

export const fxSettings: FxSettings = { shake: true, reducedMotion: false, highContrast: false };

/** Copy of a buffer with pixels removed by an ordered dither (level 0..16 = how much remains). */
export function ditherKeep(b: PixelBuffer, level: number): PixelBuffer {
  const out = b.clone();
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (!ditherOn(x, y, level)) out.set(x, y, CLEAR);
  return out;
}

/** Rising damage number in the Stele font with a hard ink shadow. */
export function popNumber(scene: Phaser.Scene, x: number, y: number, text: string, color: ColorIndex = C.red): void {
  const key = ensureTexture(scene, `pop|${color}|${text}`, () => textBuffer(text, color, { shadow: C.ink }));
  const img = scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 1).setDepth(DEPTH.fx);
  const steps = fxSettings.reducedMotion ? 2 : 6;
  let i = 0;
  scene.time.addEvent({
    delay: 60, repeat: steps,
    callback: () => {
      i++;
      if (i <= steps) img.y -= 1;
      else img.destroy();
    },
  });
  scene.time.delayedCall(60 * (steps + 1) + 250, () => img.destroy());
}

/** Integer-pixel screen shake (toggleable). */
export async function shake(scene: Phaser.Scene, px = 1, frames = 3): Promise<void> {
  if (!fxSettings.shake || fxSettings.reducedMotion) return;
  const cam = scene.cameras.main;
  for (let i = 0; i < frames; i++) {
    cam.setScroll(i % 2 === 0 ? px : -px, i % 2 === 0 ? 0 : px);
    await wait(scene, 34);
  }
  cam.setScroll(0, 0);
}

/**
 * The signature defeat: the figure cracks into pottery shards that drop,
 * scatter 1–3px and dither out. Shards are cut from the sprite along a fixed
 * pattern of wedges so every unit breaks the same, deterministic way.
 */
export async function shatter(scene: Phaser.Scene, sprite: Phaser.GameObjects.Image, source: PixelBuffer): Promise<void> {
  sprite.setVisible(false);
  const shards = cutShards(source);
  const imgs: Phaser.GameObjects.Image[] = [];
  const baseX = sprite.x, baseY = sprite.y;
  shards.forEach((sh, i) => {
    const key = ensureTexture(scene, `shard|${sprite.texture.key}|${i}|16`, () => sh.buf);
    imgs.push(scene.add.image(Math.round(baseX + sh.x), Math.round(baseY + sh.y), key).setOrigin(0, 0).setDepth(sprite.depth));
  });
  const frames = fxSettings.reducedMotion ? 3 : 8;
  for (let f = 1; f <= frames; f++) {
    imgs.forEach((img, i) => {
      const sh = shards[i]!;
      // stiff, stepped fall: drop faster than they spread
      img.x = Math.round(baseX + sh.x + sh.vx * f);
      img.y = Math.round(baseY + sh.y + Math.min(f * f * 0.35, 6 + (i % 3)));
      const keep = Math.max(0, 16 - Math.max(0, f - 3) * 3);
      img.setTexture(ensureTexture(scene, `shard|${sprite.texture.key}|${i}|${keep}`, () => ditherKeep(sh.buf, keep)));
    });
    await wait(scene, 55);
  }
  for (const img of imgs) img.destroy();
}

interface Shard {
  buf: PixelBuffer;
  x: number;
  y: number;
  vx: number;
}

function cutShards(src: PixelBuffer): Shard[] {
  // six wedge-shaped regions (like a broken pot): by angle around the centre
  const cx = src.w / 2, cy = src.h * 0.55;
  const n = 6;
  const parts = Array.from({ length: n }, () => new PixelBuffer(src.w, src.h));
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c === CLEAR) continue;
      const a = Math.atan2(y - cy, x - cx) + Math.PI + ((x * 7 + y * 3) % 5) * 0.04; // ragged edges
      const k = Math.floor((a / (Math.PI * 2)) * n) % n;
      parts[k]!.set(x, y, c);
    }
  return parts.map((buf, k) => {
    const ang = ((k + 0.5) / n) * Math.PI * 2 - Math.PI;
    return { buf, x: 0, y: 0, vx: Math.round(Math.cos(ang) * 1.5 * 10) / 10 };
  });
}

/** Ink banner across the board ("Trojans act", "Your turn"). */
export async function banner(scene: Phaser.Scene, text: string, color: ColorIndex = C.cream, ms = 520): Promise<void> {
  const w = 120;
  const bg = scene.add.image(108 - w / 2, 92, ensureTexture(scene, `banner|${w}`, () => panel(w, 17, 'ink'))).setOrigin(0, 0).setDepth(DEPTH.fx + 5);
  const tb = textBuffer(text, color);
  const tx = scene.add.image(Math.round(108 - tb.w / 2), 97, ensureTexture(scene, `bannertxt|${color}|${text}`, () => tb)).setOrigin(0, 0).setDepth(DEPTH.fx + 6);
  await wait(scene, fxSettings.reducedMotion ? ms / 2 : ms);
  bg.destroy();
  tx.destroy();
}

/** Zeus' bolt: a zigzag of gold falling onto a tile, then a cream flash ring. */
export async function boltFx(scene: Phaser.Scene, px: number, py: number): Promise<void> {
  const key = ensureTexture(scene, 'fx|bolt', () => {
    const b = new PixelBuffer(12, 60);
    let x = 6;
    for (let y = 0; y < 60; y++) {
      if (y % 8 === 0) x = 6 + ((y / 8) % 2 === 0 ? 2 : -2);
      b.set(x, y, C.goldHi).set(x + 1, y, C.cream);
    }
    return b.outlined(C.bronze);
  });
  const img = scene.add.image(Math.round(px + 6), Math.round(py + 10), key).setOrigin(0, 1).setDepth(DEPTH.fx);
  await wait(scene, 90);
  img.destroy();
  await shake(scene, 2, 4);
}

/**
 * A god appears behind the board: the silhouette dithers in while rising a
 * few pixels, a banter line shows in an ink strip, then it dithers away.
 */
export async function manifest(scene: Phaser.Scene, god: string, line: string, x: number, y: number): Promise<void> {
  const sil = godSilhouette(god);
  const img = scene.add.image(Math.round(x), Math.round(y + 6), ensureTexture(scene, `god|${god}|16`, () => sil)).setOrigin(0, 0).setDepth(-5);
  const steps = fxSettings.reducedMotion ? [16] : [3, 6, 10, 13, 16];
  for (const [i, lv] of steps.entries()) {
    img.setTexture(ensureTexture(scene, `god|${god}|${lv}`, () => ditherKeep(sil, lv)));
    img.y = Math.round(y + 6 - (6 * (i + 1)) / steps.length);
    await wait(scene, 50);
  }
  let parts: Phaser.GameObjects.Image[] = [];
  if (line) {
    const tb = textBuffer(line, C.cream, { maxWidth: 196 });
    const h = tb.h + 8;
    const bg = scene.add.image(8, 22, ensureTexture(scene, `banter|${h}`, () => panel(200, h, 'ink'))).setOrigin(0, 0).setDepth(DEPTH.fx + 5);
    const tx = scene.add.image(13, 26, ensureTexture(scene, `bantertxt|${line}`, () => tb)).setOrigin(0, 0).setDepth(DEPTH.fx + 6);
    parts = [bg, tx];
  }
  await wait(scene, fxSettings.reducedMotion ? 500 : 900);
  for (const p of parts) p.destroy();
  for (const lv of [10, 5, 2]) {
    img.setTexture(ensureTexture(scene, `god|${god}|${lv}`, () => ditherKeep(sil, lv)));
    await wait(scene, 45);
  }
  img.destroy();
}

/** Generic short slide of an image to a point, in whole pixels. */
export function slide(scene: Phaser.Scene, img: Phaser.GameObjects.Image, x: number, y: number, ms: number): Promise<void> {
  return tween(scene, { targets: img, x: Math.round(x), y: Math.round(y), duration: fxSettings.reducedMotion ? Math.min(ms, 40) : ms, ease: 'Linear' });
}
