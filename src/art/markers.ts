/**
 * Small HUD-on-board markers: HP pips, intent order badges, intent glyphs.
 * Threats are told apart by SHAPE as well as color (accessibility).
 */
import { C, type ColorIndex } from './palette';
import { PixelBuffer } from './pixels';
import { drawText } from './font';

/** HP pips: a row of 3x3 squares with an ink frame. Filled = team color. */
export function hpPips(hp: number, max: number, team: 'greek' | 'trojan'): PixelBuffer {
  const w = max * 4 + 1;
  const b = new PixelBuffer(w, 5);
  b.rect(0, 0, w, 5, C.ink);
  for (let i = 0; i < max; i++) {
    const c = i < hp ? (team === 'greek' ? C.goldHi : C.red) : C.umber;
    b.rect(1 + i * 4, 1, 3, 3, c);
  }
  return b;
}

/** Numbered order badge for an enemy's intent (ink square, cream digit). */
export function orderBadge(n: number, aura = false): PixelBuffer {
  const b = new PixelBuffer(9, 11);
  b.rect(0, 0, 9, 11, aura ? C.red : C.ink);
  b.frame(0, 0, 9, 11, aura ? C.ink : C.red);
  drawText(b, String(n % 10), 2, 2, C.cream);
  return b;
}

export type IntentGlyph = 'thrust' | 'arrow' | 'charge' | 'sweep' | 'plague' | 'bolt';

/**
 * Intent glyphs drawn ON the threatened tile (11x9), each a distinct shape:
 * thrust = spear point, arrow = arrowhead with fletch, charge = double chevron,
 * sweep = arc, plague = falling arrow, bolt = zigzag.
 */
export function intentGlyph(kind: IntentGlyph, dir: 'up' | 'down' | 'left' | 'right' = 'right', color: ColorIndex = C.ink): PixelBuffer {
  let b = new PixelBuffer(11, 11);
  switch (kind) {
    case 'thrust':
      b.hline(0, 5, 6, color);
      b.triangle(5, 1.5, 5, 9.5, 10.5, 5.5, color);
      break;
    case 'arrow':
      b.hline(1, 5, 7, color);
      b.triangle(6, 2, 6, 9, 10.5, 5.5, color);
      b.set(0, 3, color).set(1, 4, color).set(0, 7, color).set(1, 6, color);
      break;
    case 'charge':
      for (const ox of [0, 5]) {
        b.line(ox, 1, ox + 4, 5, color).line(ox, 9, ox + 4, 5, color);
        b.line(ox + 1, 1, ox + 5, 5, color).line(ox + 1, 9, ox + 5, 5, color);
      }
      break;
    case 'sweep':
      for (let a = -1.2; a <= 1.2; a += 0.08) b.set(2 + Math.round(Math.cos(a) * 7), 5 + Math.round(Math.sin(a) * 5), color);
      b.triangle(6, 8, 10, 10, 8, 6, color);
      break;
    case 'plague':
      b.vline(5, 0, 7, color);
      b.triangle(2, 6, 8.5, 6, 5.5, 10.5, color);
      b.set(4, 0, color).set(6, 0, color);
      break;
    case 'bolt':
      b.line(7, 0, 3, 5, color).line(3, 5, 8, 5, color).line(8, 5, 4, 10, color);
      break;
  }
  // glyphs are authored pointing right (or down for plague/bolt); rotate in 90° steps
  if (kind !== 'plague' && kind !== 'bolt') b = rotateTo(b, dir);
  return b;
}

/** Exact 90° rotation of a square buffer (pixel-perfect, no resampling). */
export function rotateTo(b: PixelBuffer, dir: 'up' | 'down' | 'left' | 'right'): PixelBuffer {
  if (dir === 'right') return b;
  const n = b.w;
  const out = new PixelBuffer(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const c = b.get(x, y);
      if (c === 255) continue;
      if (dir === 'left') out.set(n - 1 - x, y, c);
      else if (dir === 'down') out.set(n - 1 - y, x, c);
      else out.set(y, n - 1 - x, c);
    }
  return out;
}

/** Dotted attack path segment pixel pattern (for arrows and charges). */
export function dottedPath(b: PixelBuffer, x0: number, y0: number, x1: number, y1: number, c: ColorIndex): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 3) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    b.rect(x, y, 2, 2, c);
  }
}
