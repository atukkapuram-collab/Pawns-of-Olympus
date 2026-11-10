/**
 * Tiny rule diagrams for cards and the briefing mini map: a grid of 8px clay
 * cells (7px field + 1px rule), tokens as flat discs, arrows as ink lines.
 * Black-figure flat colors only; no gradients.
 */
import { C, type ColorIndex } from './palette';
import { PixelBuffer } from './pixels';
import type { CardArt, Diagram } from '../data/teach';
import { buildFigureFrames } from './sprites/units';
import { buildPortrait } from './sprites/gods';
import { shipSprite } from './sprites/extras';
import * as T from './sprites/tiles';

export const CELL = 8;

/** Integer nearest-neighbour upscale (cards show sprites at 2x). */
export function scaleUp(src: PixelBuffer, n: number): PixelBuffer {
  const b = new PixelBuffer(src.w * n, src.h * n);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c === 255) continue;
      b.rect(x * n, y * n, n, n, c);
    }
  return b;
}

const BG: Record<string, ColorIndex> = {
  '.': C.clayLt, '#': C.umber, '~': C.sea, '^': C.sun, '%': C.olive, G: C.clayLt, '*': C.goldHi,
  x: C.threat, g: C.goldHi, v: C.clayLt, p: C.sun, q: C.rose,
  h: C.threat, t: C.threat, s: C.threat, P: C.goldHi, Y: C.goldHi, Q: C.goldHi, B: C.goldHi, f: C.sun, l: C.goldHi, k: C.olive,
};

function disc(b: PixelBuffer, x: number, y: number, fill: ColorIndex, crest: ColorIndex): void {
  // 5x5 pawn: round body with an ink rim and a crest pixel pair on top
  b.rect(x + 1, y + 1, 3, 4, fill);
  b.rect(x, y + 2, 5, 2, fill);
  b.hline(x + 1, y, 3, C.ink);
  b.set(x, y + 1, C.ink); b.set(x + 4, y + 1, C.ink);
  b.hline(x + 1, y + 5, 3, C.ink);
  b.set(x, y + 4, C.ink); b.set(x + 4, y + 4, C.ink);
  b.set(x + 2, y, crest);
}

function token(b: PixelBuffer, ch: string, px: number, py: number): void {
  const x = px + 1, y = py;
  switch (ch) {
    case 'H': case 'h': case 'f': case 'l': case 'k': disc(b, x, y, C.blue, C.red); break;
    case 'a': b.frame(px, py, 7, 7, C.goldHi); disc(b, x, y, C.blue, C.red); break;
    case 'T': case 't': case 'B': case 'Q': disc(b, x, y, C.wine, C.purple); break;
    case 'R': b.frame(px, py, 7, 7, C.red); disc(b, x, y, C.wine, C.purple); break;
    case 'S': case 's': case 'P':
      b.hline(px, py + 3, 7, C.ink);
      b.rect(px + 1, py + 4, 5, 2, C.umber);
      b.vline(px + 3, py, 3, C.ink);
      b.set(px + 4, py + 1, C.bone);
      break;
    case 'G': case 'Y': b.rect(px + 2, py + 2, 3, 5, C.ink); b.hline(px + 3, py + 1, 1, C.ink); break; // an ink arch
    case '#': b.rect(px + 1, py + 1, 5, 3, C.deepClay); b.hline(px, py + 4, 7, C.ink); break;
    case '~': b.hline(px + 1, py + 2, 2, C.bone); b.hline(px + 4, py + 4, 2, C.bone); break;
    case '^': b.triangle(px + 3, py + 1, px + 1, py + 6, px + 5, py + 6, C.red); b.set(px + 3, py + 4, C.goldHi); break;
    case '%': b.vline(px + 1, py + 3, 3, C.oliveDk); b.vline(px + 3, py + 1, 5, C.oliveDk); b.vline(px + 5, py + 2, 4, C.oliveDk); break;
    case '*': b.rect(px + 2, py + 2, 3, 3, C.cream); break;
    case 'g': b.frame(px + 1, py + 1, 5, 5, C.ink); b.rect(px + 3, py + 3, 1, 1, C.ink); break;
    case 'p': b.vline(px + 3, py + 1, 3, C.ink); b.hline(px + 1, py + 4, 5, C.ink); b.hline(px + 2, py + 5, 3, C.ink); b.set(px + 3, py + 6, C.ink); break; // arrow falling
    case 'q': for (const [dx, dy] of [[1, 1], [3, 1], [5, 1], [2, 3], [4, 3], [1, 5], [3, 5], [5, 5]] as const) b.set(px + dx, py + dy, C.bone); break;
    case 'v': b.ditherFill(px, py, 7, 7, C.bone, 4); b.hline(px + 2, py + 3, 3, C.ink); b.set(px + 3, py + 2, C.ink); b.set(px + 3, py + 4, C.ink); break; // a watching eye
    default: break;
  }
  if (ch === 'B') {
    // Zeus' bolt: a gold zigzag striking the token's shoulder
    for (const [dx, dy] of [[6, 0], [5, 1], [4, 2], [5, 2], [6, 2], [5, 3], [4, 4]] as const) b.set(px + dx, py + dy, C.goldHi);
    b.set(px + 6, py + 1, C.ink); b.set(px + 3, py + 4, C.ink);
  }
}

/** Solid arrowhead whose tip is (x, y), pointing along (dx, dy). */
function head(b: PixelBuffer, x: number, y: number, dx: number, dy: number, c: ColorIndex): void {
  for (let k = 0; k < 3; k++) {
    const bx = x - dx * k, by = y - dy * k;
    for (let w = -k; w <= k; w++) b.set(bx + (dy !== 0 ? w : 0), by + (dx !== 0 ? w : 0), c);
  }
}

const TROJAN_TOKENS = new Set(['T', 't', 'R', 'B', 'Q']);

/** Draw a diagram (cells + tokens + arrows) into a new buffer. */
export function drawDiagram(d: Diagram): PixelBuffer {
  const rows = d.rows.length, cols = Math.max(...d.rows.map((r) => r.length));
  const b = new PixelBuffer(cols * CELL + 1, rows * CELL + 1);
  b.rect(0, 0, b.w, b.h, C.ink);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const ch = d.rows[y]![x] ?? '.';
      const px = 1 + x * CELL, py = 1 + y * CELL;
      b.rect(px, py, CELL - 1, CELL - 1, BG[ch] ?? C.clayLt);
      if ('xhts'.includes(ch)) {
        // threatened: a red hatch like the board's threat tiles
        for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if ((i + j) % 3 === 0) b.set(px + i, py + j, C.red);
      }
      token(b, ch, px, py);
    }
  for (const [x0, y0, x1, y1, both] of d.arrows ?? []) {
    // Trojan attacks: dotted red, as on the board; hero moves, pushes, swaps: dotted blue
    const c = TROJAN_TOKENS.has(d.rows[y0]?.[x0] ?? '') ? C.red : C.blue;
    const cx = (x: number) => 1 + x * CELL + 3, cy = (y: number) => 1 + y * CELL + 3;
    const ax = cx(x0), ay = cy(y0), bx = cx(x1), by = cy(y1);
    const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
    // from the source cell's edge to the tip, one pixel inside the target cell
    const sx = ax + dx * 4, sy = ay + dy * 4, ex = bx - dx * 3, ey = by - dy * 3;
    const n = Math.max(Math.abs(ex - sx), Math.abs(ey - sy));
    for (let i = 0; i <= n; i += 2) {
      const lx = Math.round(sx + ((ex - sx) * i) / Math.max(1, n)), ly = Math.round(sy + ((ey - sy) * i) / Math.max(1, n));
      b.set(lx, ly, c);
    }
    if (dx === 0 || dy === 0) {
      head(b, ex, ey, dx, dy, c);
      if (both) head(b, sx, sy, -dx, -dy, c);
    }
  }
  return b;
}

/** The picture on a card: unit sprite or tile at 2x, god portrait at 1x. */
export function cardArt(art: CardArt): PixelBuffer {
  switch (art.type) {
    case 'unit': {
      const f = buildFigureFrames(art.unit).idle0;
      return scaleUp(f, 2);
    }
    case 'portrait': return buildPortrait(art.god);
    case 'ship': return scaleUp(shipSprite(), 2);
    case 'diagram': return scaleUp(drawDiagram(art.diagram), 2);
    case 'tile': {
      if (art.tile === 'gate') return scaleUp(gateWall(), 2);
      const b = new PixelBuffer(T.TILE_W, 26);
      const base = art.tile === 'water' ? T.waterTile(0) : art.tile === 'brush' ? T.brushTile(1) : T.groundTile(1, false);
      if (art.tile !== 'rock') b.blit(base, 0, 8);
      if (art.tile === 'rock') b.blit(T.rockTile(0), 0, 0);
      if (art.tile === 'light') b.blit(T.lightPool(), 0, 8);
      if (art.tile === 'fire') b.blit(T.fireSprite(0), 0, 0);
      if (art.tile === 'brush') b.blit(T.fireSprite(0).crop(0, 0, 12, 24), 0, 0); // fire eating into the brush
      return scaleUp(b, 2);
    }
  }
}

/** The Scaean Gates in miniature: block wall, two crenellated towers, an ink doorway. */
function gateWall(): PixelBuffer {
  const b = new PixelBuffer(34, 28);
  const block = (x: number, y: number, w: number, h: number) => {
    b.rect(x, y, w, h, C.clay);
    b.frame(x, y, w, h, C.ink);
    for (let yy = y + 4; yy < y + h - 1; yy += 4) b.hline(x + 1, yy, w - 2, C.deepClay);
  };
  block(0, 4, 10, 24);
  block(24, 4, 10, 24);
  block(9, 10, 16, 18);
  for (const tx of [0, 24]) for (let cx = tx; cx < tx + 10; cx += 4) { b.rect(cx, 0, 3, 5, C.clay); b.frame(cx, 0, 3, 5, C.ink); }
  // doorway: an ink arch
  b.rect(13, 16, 8, 12, C.ink);
  b.hline(14, 15, 6, C.ink);
  b.hline(15, 14, 4, C.ink);
  b.hline(1, 27, 32, C.ink);
  return b;
}
