/**
 * Bigger and odder Trojans: Hector (32x40), Paris, and the chariot.
 */
import { C } from '../palette';
import { PixelBuffer } from '../pixels';
import { drawFigure, POSES, type FigureSpec, type Pose } from './figure';

export const BOSS_W = 32;
export const BOSS_H = 40;

const hectorSpec: FigureSpec = {
  skin: C.skin, tunic: C.wine, tunicDk: C.wineDk, metal: C.bronze, metalDk: C.ironDk, metalHi: C.iron,
  crest: C.purple, emblem: C.ink, outline: C.ink, headgear: 'crest', shield: 'none', weapon: 'longspear',
};

/**
 * Hector: the standard warrior set into a 32x40 cell, with a towering purple
 * plume and a great round shield ringed in iron (his "ring band").
 */
export function hectorFrame(pose: Pose): PixelBuffer {
  const base = drawFigure(hectorSpec, pose);
  const b = new PixelBuffer(BOSS_W, BOSS_H);
  const oy = pose === 'idle1' ? 1 : 0;
  const tx = pose === 'strike' ? 1 : pose === 'windup' ? -1 : 0;
  // tall plume rising from the crest: a stacked half-disc and a stalk
  const hx = 4 + 11 + tx;
  const plume = new PixelBuffer(BOSS_W, BOSS_H);
  plume.halfCircle(hx, 9 + oy, 5, C.purple);
  plume.halfCircle(hx, 5 + oy, 3, C.purple);
  plume.vline(hx, 9 + oy, 4, C.ink);
  for (let x = hx - 4; x <= hx + 4; x += 2) plume.set(x, 8 + oy, C.wineDk); // horsehair strands
  b.blit(plume.outlined(C.ink), 0, 0);
  b.blit(base, 4, 8);
  // great shield
  const sh = new PixelBuffer(BOSS_W, BOSS_H);
  const cx = 9 + (pose === 'strike' ? 1 : 0), cy = 28 + oy;
  sh.circle(cx, cy, 6, C.iron, { shade: C.ironDk, shadeFrom: 2 });
  sh.circle(cx, cy, 4, C.bronze, { shade: C.wineDk, shadeFrom: 2 });
  sh.rect(cx - 1, cy - 1, 2, 2, C.ink);
  sh.set(cx - 3, cy - 4, C.bronze).set(cx - 4, cy - 3, C.bronze);
  b.blit(sh.outlined(C.ink), 0, 0);
  return b.flipped();
}

const parisSpec: FigureSpec = {
  skin: C.skin, tunic: C.cream, tunicDk: C.boneDk, metal: C.iron, metalDk: C.ironDk, metalHi: C.ironHi,
  crest: C.bronze, emblem: C.ink, outline: C.ink, headgear: 'bare', shield: 'none', weapon: 'bow',
  // leopard-skin cloak: ink spots over a cream torso
  extra: (b, oy, pose) => {
    const tx = pose === 'strike' ? 1 : pose === 'windup' ? -1 : 0;
    for (const [x, y] of [[7, 14], [11, 15], [14, 14], [9, 17], [12, 18], [6, 13], [16, 13]] as const) b.paint(x + tx, y + oy, C.ink);
    b.set(11 + tx, 6 + oy, C.cream).set(9 + tx, 7 + oy, C.cream); // glints in his golden hair
  },
};

export function parisFrame(pose: Pose): PixelBuffer {
  return drawFigure(parisSpec, pose).flipped();
}

/**
 * Chariot (side view, facing left once mirrored): an ink horse, a wicker car
 * on one big four-spoke wheel, and a wine-clad driver. 24x32 cell.
 */
export function chariotFrame(pose: Pose): PixelBuffer {
  const b = new PixelBuffer(24, 32);
  const lunge = pose === 'strike' ? 2 : pose === 'windup' ? -1 : 0;
  const bob = pose === 'idle1' ? 1 : 0;
  // horse (black-figure silhouette) in front, to the right before mirroring
  const hx = 14 + lunge;
  b.rect(hx, 19 + bob, 7, 4, C.ink); // body
  b.triangle(hx + 6, 19 + bob, hx + 9, 13 + bob, hx + 9, 20 + bob, C.ink); // neck
  b.rect(hx + 8, 13 + bob, 3, 2, C.ink); // head
  b.set(hx + 7, 12 + bob, C.ink); // ear
  for (const lx of [hx, hx + 2, hx + 5, hx + 6]) b.vline(lx, 23, 6 - (pose === 'idle1' && lx % 2 === 0 ? 1 : 0), C.ink); // legs
    // car
  b.rect(4, 17, 9, 6, C.umber);
  b.hline(4, 17, 9, C.darkUmber);
  for (let x = 5; x < 13; x += 2) b.vline(x, 18, 4, C.darkUmber);
  b.hline(12, 21, hx - 12 + 1, C.umber); // pole to the horse
  // wheel
  b.circle(8, 25, 4, C.ink);
  b.circle(8, 25, 3, C.umber);
  b.hline(5, 25, 7, C.ink);
  b.vline(8, 22, 7, C.ink);
  b.set(8, 25, C.bronze);
  // driver
  b.rect(7, 11 + bob, 4, 6, C.wine);
    b.circle(9, 8 + bob, 2, C.skin);
  b.halfCircle(9, 7 + bob, 2, C.iron);
  b.set(9, 4 + bob, C.purple).set(8, 4 + bob, C.purple).set(10, 5 + bob, C.purple);
  b.hline(10, 13 + bob, 5 + lunge, C.skin); // arms holding the reins
  b.line(14 + lunge, 13 + bob, hx + 8, 15 + bob, C.bronze); // reins
  return b.outlined(C.ink).flipped();
}

export const BOSS_TYPES: Record<string, (p: Pose) => PixelBuffer> = {
  hector: hectorFrame,
  paris: parisFrame,
  chariot: chariotFrame,
};

export function bossFrames(type: string): Record<Pose, PixelBuffer> {
  const f = BOSS_TYPES[type]!;
  const out = {} as Record<Pose, PixelBuffer>;
  for (const p of POSES) out[p] = f(p);
  return out;
}
