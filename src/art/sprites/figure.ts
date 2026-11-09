/**
 * The Geometric-period warrior. One parametric recipe draws every hero and
 * every Trojan foot soldier, in the proportions of Late Geometric vase
 * figures: small head, broad shoulders tapering to a pinched waist (the
 * inverted triangle), long legs with full thighs and thin ankles.
 *
 * Canvas 24x32 including the 1px ink outline. Drawn facing RIGHT; Trojans are
 * mirrored to face left. Feet rest on row 30. Light from the upper left.
 *
 * Vertical plan: crest 1-4, dome 5-8, face 9-11, neck 12, torso 13-20,
 * skirt 20-23, thighs 24-26, greaves 27-29, feet 30.
 */
import { C, type ColorIndex } from '../palette';
import { PixelBuffer } from '../pixels';

export const FIG_W = 24;
export const FIG_H = 32;

export type Headgear = 'crest' | 'pilos' | 'phrygian' | 'bare';
export type ShieldKind = 'round' | 'tower' | 'none';
export type Weapon = 'spear' | 'bow' | 'longspear';

export interface FigureSpec {
  skin: ColorIndex;
  tunic: ColorIndex;
  tunicDk: ColorIndex;
  metal: ColorIndex;
  metalDk: ColorIndex;
  metalHi: ColorIndex;
  crest: ColorIndex;
  emblem: ColorIndex;
  outline: ColorIndex;
  headgear: Headgear;
  shield: ShieldKind;
  weapon: Weapon;
  /** Optional detail drawn last (shield device, cloak spots…). */
  extra?: (b: PixelBuffer, oy: number, pose: Pose) => void;
}

export type Pose = 'idle0' | 'idle1' | 'windup' | 'strike';

/** Leaf-shaped spear blade pointing up, tip at (x, y). */
function bladeUp(b: PixelBuffer, x: number, y: number, s: FigureSpec): void {
  b.set(x, y, s.metal);
  b.hline(x - 1, y + 1, 3, s.metal);
  b.hline(x - 1, y + 2, 3, s.metal);
  b.set(x, y + 3, s.metal);
  b.set(x, y + 1, s.metalHi);
}

/** Leaf-shaped blade pointing right, tip at (x, y). */
function bladeRight(b: PixelBuffer, x: number, y: number, s: FigureSpec): void {
  b.set(x, y, s.metal);
  b.vline(x - 1, y - 1, 3, s.metal);
  b.vline(x - 2, y - 1, 3, s.metal);
  b.set(x - 3, y, s.metal);
  b.set(x - 1, y, s.metalHi);
}

export function drawFigure(s: FigureSpec, pose: Pose): PixelBuffer {
  const b = new PixelBuffer(FIG_W, FIG_H);
  const oy = pose === 'idle1' ? 1 : 0; // breath: upper body sinks 1px
  const tx = pose === 'strike' ? 1 : pose === 'windup' ? -1 : 0; // lean

  // ---- spear behind the body ----
  if (s.weapon !== 'bow') {
    if (pose === 'strike') {
      b.hline(12, 14 + oy, 8, s.metalDk);
      bladeRight(b, 22, 14 + oy, s);
    } else {
      const sx = pose === 'windup' ? 19 : 20;
      const tip = (s.weapon === 'longspear' ? 1 : 3) + oy - (pose === 'windup' ? 1 : 0);
      bladeUp(b, sx, tip, s);
      b.vline(sx, tip + 4, 29 - tip - 4 + 1, s.metalDk);
    }
  }

  // ---- legs: full thighs, thin ankles, greaves (no bob) ----
  for (const lx of [8, 12]) {
    b.rect(lx, 24, 3, 2, s.skin);
    b.rect(lx + (lx === 8 ? 1 : 0), 26, 2, 1, s.skin);
    b.rect(lx + (lx === 8 ? 1 : 0), 27, 2, 2, s.metal);
    b.set(lx + (lx === 8 ? 1 : 0), 27, s.metalHi);
    b.set(lx + 1, 29, s.metal);
  }
  b.rect(8, 30, 3, 1, s.outline);
  b.rect(12, 30, 3, 1, s.outline);

  // ---- skirt: short trapezoid band with a dotted hem ----
  const sy = 20 + oy;
  b.hline(10 + tx, sy, 4, s.tunicDk);
  b.hline(9 + tx, sy + 1, 6, s.tunicDk);
  b.rect(8 + tx, sy + 2, 8, 2, s.tunicDk);
  for (let x = 8 + tx; x <= 15 + tx; x += 2) b.set(x, sy + 3, s.metal);

  // ---- torso: broad inverted triangle pinched at the waist ----
  b.triangle(3.5 + tx, 13 + oy, 19.5 + tx, 13 + oy, 11.5 + tx, 21 + oy, s.tunic);
  b.triangle(15.5 + tx, 13 + oy, 19.5 + tx, 13 + oy, 11.5 + tx, 21 + oy, s.tunicDk);

  // ---- weapon arm ----
  if (s.weapon === 'bow') {
    const bx = 18 + (pose === 'windup' ? -1 : 0) + (pose === 'strike' ? 1 : 0);
    const arc = [[0, 0], [1, 1], [2, 2], [2, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [2, 9], [2, 10], [1, 11], [0, 12]] as const;
    for (const [dx, dy] of arc) b.set(bx + dx, 9 + oy + dy, s.metalDk);
    const pull = pose === 'windup' ? -3 : pose === 'strike' ? 0 : -1;
    b.line(bx, 9 + oy, bx + pull, 15 + oy, s.metalHi);
    b.line(bx + pull, 15 + oy, bx, 21 + oy, s.metalHi);
    b.rect(16 + tx, 14 + oy, 3, 2, s.skin);
    if (pose === 'strike') b.hline(bx + 3, 15 + oy, 3, s.metalHi);
  } else if (pose === 'strike') {
    b.rect(16 + tx, 13 + oy, 4, 2, s.skin);
  } else {
    const hand = pose === 'windup' ? 19 : 20;
    b.rect(17 + tx, 14 + oy, hand - 17 - tx, 2, s.skin);
  }

  // ---- neck and head: small, with the single dot eye ----
  const hx = 11 + tx;
  b.hline(hx - 1, 12 + oy, 2, s.skin);
  b.rect(hx - 2, 9 + oy, 4, 3, s.skin);
  b.set(hx + 2, 10 + oy, s.skin); // nose, profile to the right
  b.set(hx + 1, 9 + oy, C.ink);

  if (s.headgear === 'crest') {
    b.halfCircle(hx, 4 + oy, 3, s.crest);
    b.set(hx, 5 + oy, s.metalDk); // crest stalk
    b.halfCircle(hx, 8 + oy, 3, s.metal, s.metalDk);
    b.vline(hx - 3, 8 + oy, 3, s.metal); // neck guard (back)
    b.set(hx + 2, 9 + oy, s.metalDk); // cheek piece edge
    b.set(hx - 2, 6 + oy, s.metalHi);
  } else if (s.headgear === 'pilos') {
    b.triangle(hx - 3.5, 8.5 + oy, hx + 3.5, 8.5 + oy, hx, 3 + oy, s.metal);
    b.triangle(hx, 8.5 + oy, hx + 3.5, 8.5 + oy, hx, 3 + oy, s.metalDk);
    b.hline(hx - 3, 8 + oy, 7, s.metalDk);
    b.set(hx - 1, 5 + oy, s.metalHi);
  } else if (s.headgear === 'phrygian') {
    b.halfCircle(hx, 8 + oy, 3, s.crest);
    b.rect(hx - 3, 8 + oy, 2, 3, s.crest); // lappet
    b.triangle(hx - 1, 5 + oy, hx + 2.5, 3.5 + oy, hx + 3.5, 6.5 + oy, s.crest);
    b.set(hx - 2, 6 + oy, s.metalHi);
  } else {
    b.halfCircle(hx, 8 + oy, 3, s.crest);
    b.vline(hx - 3, 8 + oy, 3, s.crest);
  }

  // ---- shield on the near arm ----
  if (s.shield === 'round') {
    const cx = 5 + (pose === 'strike' ? 1 : 0), cy = 19 + oy;
    b.circle(cx, cy, 4, s.metal, { shade: s.metalDk, shadeFrom: 1 });
    b.rect(cx - 1, cy - 1, 2, 2, s.emblem); // solid boss
    b.set(cx - 1, cy - 1, s.metalHi === s.emblem ? s.metal : s.metalHi);
    b.set(cx - 2, cy - 3, s.metalHi).set(cx - 3, cy - 2, s.metalHi);
  } else if (s.shield === 'tower') {
    const x0 = 1 + (pose === 'strike' ? 1 : 0), y0 = 12 + oy;
    b.halfCircle(x0 + 4, y0 + 2, 4, s.metal);
    b.rect(x0, y0 + 2, 9, 14, s.metal);
    b.rect(x0 + 6, y0 + 2, 3, 14, s.metalDk);
    b.triangle(x0 + 4, y0 - 2, x0 + 8.6, y0 + 2.5, x0 + 4, y0 + 2.5, s.metalDk);
    b.rect(x0 + 3, y0 + 4, 2, 10, s.emblem); // central rib
    b.set(x0 + 1, y0 + 3, s.metalHi).set(x0 + 1, y0 + 4, s.metalHi).set(x0 + 1, y0 + 5, s.metalHi).set(x0 + 2, y0 + 1, s.metalHi);
  }

  s.extra?.(b, oy, pose);
  return b.outlined(s.outline);
}

export const POSES: Pose[] = ['idle0', 'idle1', 'windup', 'strike'];
