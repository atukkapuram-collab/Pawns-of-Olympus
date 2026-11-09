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
  plume.halfCircle(hx, 10 + oy, 5, C.purple);
  plume.hline(hx - 5, 10 + oy, 11, C.bronze); // crest holder
  for (let x = hx - 3; x <= hx + 3; x += 2) plume.set(x, 7 + oy, C.wineDk); // horsehair strands
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
  skin: C.skin, tunic: C.cream, tunicDk: C.wineDk, metal: C.iron, metalDk: C.ironDk, metalHi: C.ironHi,
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
 * Chariot (side view, facing left once mirrored), 32x40 like Hector: a
 * full-size Trojan driver standing in a wine car on a big four-spoke wheel,
 * drawn by a Geometric stick horse in ink, exactly as horses stand on
 * Geometric kraters: long neck, thin barrel, stick legs.
 */
const driverSpec: FigureSpec = {
  skin: C.skin, tunic: C.wine, tunicDk: C.wineDk, metal: C.iron, metalDk: C.ironDk, metalHi: C.iron,
  crest: C.purple, emblem: C.purple, outline: C.ink, headgear: 'crest', shield: 'none', weapon: 'spear',
};

export function chariotFrame(pose: Pose): PixelBuffer {
  const b = new PixelBuffer(BOSS_W, BOSS_H);
  const lunge = pose === 'strike' ? 2 : pose === 'windup' ? -1 : 0;
  const bob = pose === 'idle1' ? 1 : 0;
  // driver: the standard warrior, cut at the hips, standing in the car
  const driver = drawFigure(driverSpec, pose === 'strike' ? 'strike' : pose === 'windup' ? 'windup' : 'idle0').crop(0, 0, 24, 23);
  b.blit(driver, 0, 2 + bob);
  // horse, in front (right, before mirroring)
  const hx = 17 + lunge;
  b.rect(hx, 22, 10, 3, C.ink); // barrel
  b.triangle(hx + 7, 23, hx + 10, 12, hx + 12, 23, C.ink); // long neck
  b.rect(hx + 10, 11, 4, 3, C.ink); // head
  b.set(hx + 11, 10, C.ink); // ear
  b.line(hx, 22, hx - 2, 28, C.ink); // tail
  const step = pose === 'idle1' ? 1 : 0;
  for (const [lx, d] of [[hx + 1, 0], [hx + 3, step], [hx + 8, step], [hx + 10, 0]] as const) b.vline(lx + d, 25, 12, C.ink); // stick legs
  // car and pole
  b.rect(2, 23, 14, 8, C.wineDk);
  b.hline(2, 23, 14, C.ink);
  for (let x = 4; x < 16; x += 3) b.vline(x, 24, 7, C.ink);
  b.hline(15, 27, hx - 15 + 2, C.ink); // pole
  b.line(18 + lunge, 15 + bob, hx + 11, 13, C.ironDk); // reins
  // wheel
  b.circle(9, 33, 6, C.ink);
  b.circle(9, 33, 4, C.ironDk);
  b.hline(4, 33, 11, C.ink);
  b.vline(9, 28, 11, C.ink);
  b.set(9, 33, C.iron);
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
