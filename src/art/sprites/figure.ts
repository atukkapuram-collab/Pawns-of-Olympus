/**
 * The Geometric-period warrior. One parametric recipe draws every hero and
 * every Trojan foot soldier: inverted-triangle torso, short skirt band, stick
 * legs, round head, half-disc crest, round or tower shield, spear.
 *
 * Canvas 24x32 including the 1px ink outline. Drawn facing RIGHT (toward the
 * enemy); Trojans are mirrored to face left. Feet rest on row 30.
 * Light comes from the upper left: shadow tones sit on the right side.
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
  /** Optional small detail drawn last (shield device, cloak spots…). */
  extra?: (b: PixelBuffer, oy: number, pose: Pose) => void;
}

export type Pose = 'idle0' | 'idle1' | 'windup' | 'strike';

/** Draw one pose. `bob` lowers everything above the hips by 1px (breath). */
export function drawFigure(s: FigureSpec, pose: Pose): PixelBuffer {
  const b = new PixelBuffer(FIG_W, FIG_H);
  const oy = pose === 'idle1' ? 1 : 0; // upper-body bob
  const lean = pose === 'strike' ? 1 : pose === 'windup' ? -1 : 0; // body lean

  // ---- weapon behind the body (vertical spear / bow) ----
  if (s.weapon !== 'bow') {
    if (pose === 'strike') {
      // spear levelled forward at shoulder height
      b.hline(12, 14 + oy, 10, s.metalDk);
      b.triangle(21, 12.5 + oy, 21, 16.5 + oy, 23.4, 14.5 + oy, s.metal);
      b.set(22, 14 + oy, s.metalHi);
    } else {
      const sx = 19 + (pose === 'windup' ? -1 : 0);
      const top = s.weapon === 'longspear' ? 1 : 3;
      const tipY = (pose === 'windup' ? top - 1 : top) + oy;
      b.vline(sx, tipY + 4, 29 - tipY - 3, s.metalDk);
      b.triangle(sx + 0.5, tipY, sx - 1.5, tipY + 4.2, sx + 2.5, tipY + 4.2, s.metal);
      b.set(sx, tipY + 1, s.metalHi);
    }
  }

  // ---- legs (fixed to the ground, no bob) ----
  const legL = 9, legR = 12;
  for (const lx of [legL, legR]) {
    b.rect(lx, 24, 2, 2, s.skin);
    b.rect(lx, 26, 2, 4, s.metal); // greaves
    b.set(lx, 26, s.metalHi);
  }
  b.rect(legL - 1, 30, 3, 1, s.outline);
  b.rect(legR, 30, 3, 1, s.outline);

  // ---- skirt band (trapezoid) ----
  const sy = 20 + oy;
  b.rect(9 + lean, sy, 5, 1, s.tunicDk);
  b.rect(8 + lean, sy + 1, 7, 2, s.tunicDk);
  b.rect(7 + lean, sy + 3, 9, 1, s.tunicDk);
  for (let x = 8 + lean; x <= 15 + lean; x += 2) b.set(x, sy + 3, s.metal); // hem dots

  // ---- torso: inverted triangle ----
  const tx = lean;
  b.triangle(5.5 + tx, 12 + oy, 17.5 + tx, 12 + oy, 11.5 + tx, 23 + oy, s.tunic);
  b.triangle(14.5 + tx, 12 + oy, 17.5 + tx, 12 + oy, 11.5 + tx, 23 + oy, s.tunicDk);
  b.hline(9 + tx, 18 + oy, 6, s.metal); // belt
  b.set(9 + tx, 18 + oy, s.metalHi);

  // ---- spear arm ----
  if (s.weapon === 'bow') {
    // bow held forward: an arc of metalDk with a cream string
    const bx = 18 + (pose === 'windup' ? -1 : 0) + (pose === 'strike' ? 1 : 0);
    const arc = [[0, 0], [1, 1], [2, 2], [2, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [2, 9], [2, 10], [1, 11], [0, 12]] as const;
    for (const [dx, dy] of arc) b.set(bx + dx, 9 + oy + dy, s.metalDk);
    const pull = pose === 'windup' ? -3 : pose === 'strike' ? 0 : -1;
    b.line(bx, 9 + oy, bx + pull, 15 + oy, s.metalHi);
    b.line(bx + pull, 15 + oy, bx, 21 + oy, s.metalHi);
    b.rect(15 + tx, 14 + oy, 3, 2, s.skin); // arm
    if (pose === 'strike') {
      b.hline(bx + 3, 15 + oy, 3, s.metalHi); // arrow leaving
    }
  } else if (pose === 'strike') {
    b.rect(15 + tx, 13 + oy, 4, 2, s.skin);
  } else {
    const ax = pose === 'windup' ? 17 : 18;
    b.rect(16 + tx, 14 + oy, ax - 16 - tx + 1, 2, s.skin);
  }

  // ---- neck, face, helmet, crest ----
  const hx = 11 + tx;
  b.rect(hx - 1, 12 + oy, 3, 1, s.skin);
  b.rect(hx - 2, 9 + oy, 5, 3, s.skin); // face block
  b.set(hx + 1, 10 + oy, C.ink); // the single dot eye of Geometric figures

  if (s.headgear === 'crest') {
    // fan crest (half-disc) on a bronze dome with cheek guards
    b.halfCircle(hx, 6 + oy, 5, s.crest);
    b.hline(hx - 5, 6 + oy, 11, s.crest);
    b.halfCircle(hx, 9 + oy, 4, s.metal, s.metalDk);
    b.vline(hx - 3, 9 + oy, 3, s.metal); // cheek guard (back)
    b.vline(hx + 3, 9 + oy, 2, s.metalDk); // cheek guard (front)
    b.set(hx - 2, 6 + oy, s.metalHi);
    b.set(hx - 3, 7 + oy, s.metalHi);
  } else if (s.headgear === 'pilos') {
    // Odysseus' felt cap: a low cone
    b.triangle(hx - 4.5, 9 + oy, hx + 4.5, 9 + oy, hx + 0.5, 3 + oy, s.metal);
    b.triangle(hx + 0.5, 9 + oy, hx + 4.5, 9 + oy, hx + 0.5, 3 + oy, s.metalDk);
    b.hline(hx - 4, 9 + oy, 9, s.metalDk);
    b.set(hx - 1, 6 + oy, s.metalHi);
  } else if (s.headgear === 'phrygian') {
    // soft cap with the tip folded forward (toward facing)
    b.halfCircle(hx, 9 + oy, 4, s.crest);
    b.rect(hx - 4, 9 + oy, 2, 3, s.crest); // lappet
    b.triangle(hx - 1, 5 + oy, hx + 3, 4 + oy, hx + 4, 7 + oy, s.crest);
    b.set(hx - 2, 6 + oy, s.metalHi);
  } else {
    // bare head: hair cap
    b.halfCircle(hx, 9 + oy, 3, s.crest);
    b.vline(hx - 3, 9 + oy, 3, s.crest);
  }

  // ---- shield (in front of the body, on the near arm) ----
  if (s.shield === 'round') {
    const cx = 6 + (pose === 'strike' ? 1 : 0), cy = 17 + oy;
    b.circle(cx, cy, 5, s.metal, { shade: s.metalDk, shadeFrom: 2 });
    b.circle(cx, cy, 1, s.emblem);
    b.set(cx - 3, cy - 3, s.metalHi).set(cx - 2, cy - 4, s.metalHi).set(cx - 4, cy - 2, s.metalHi);
  } else if (s.shield === 'tower') {
    const x0 = 1 + (pose === 'strike' ? 1 : 0), y0 = 11 + oy;
    b.halfCircle(x0 + 4, y0 + 2, 4, s.metal);
    b.rect(x0, y0 + 2, 9, 15, s.metal);
    b.rect(x0 + 6, y0 + 2, 3, 15, s.metalDk);
    b.triangle(x0 + 4, y0 - 2, x0 + 8.6, y0 + 2.5, x0 + 4, y0 + 2.5, s.metalDk);
    b.rect(x0 + 3, y0 + 4, 2, 11, s.emblem); // central rib
    b.set(x0 + 1, y0 + 3, s.metalHi).set(x0 + 1, y0 + 4, s.metalHi).set(x0 + 1, y0 + 5, s.metalHi).set(x0 + 2, y0 + 1, s.metalHi);
  }

  s.extra?.(b, oy, pose);
  return b.outlined(s.outline);
}

export const POSES: Pose[] = ['idle0', 'idle1', 'windup', 'strike'];
