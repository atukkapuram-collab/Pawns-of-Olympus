/**
 * Board tiles. Each tile image is 24x18: a 24x16 top face plus a 2px front lip
 * that only shows on the nearest row (rows are stacked 16px apart, so the next
 * row covers the lip). Clay/mosaic tiles: a grout line on the top and left,
 * a couple of chips and cracks, and a faint lattice grain. Never noise.
 */
import { C, type ColorIndex } from '../palette';
import { PixelBuffer, ditherOn, meanderBand, triangleBand } from '../pixels';

export const TILE_W = 24;
export const TILE_H = 18;
export const TILE_PITCH_Y = 16;

/** Small deterministic hash so tile variants are stable across builds. */
export function hash(n: number): number {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return n >>> 0;
}

function lip(b: PixelBuffer, top: ColorIndex, bottom: ColorIndex): void {
  b.hline(0, 16, TILE_W, top);
  b.hline(0, 17, TILE_W, bottom);
}

/** Clay ground. `alt` = checkerboard alternate shade; `variant` 0..3 picks chips/cracks. */
export function groundTile(variant: number, alt: boolean): PixelBuffer {
  const b = new PixelBuffer(TILE_W, TILE_H);
  const base = alt ? C.clayLt : C.clay;
  const grain = alt ? C.clay : C.clayLt;
  b.rect(0, 0, TILE_W, 16, base);
  // lattice grain: sparse, regular, like mosaic tesserae
  for (let y = 3; y < 15; y += 4) for (let x = (y % 8 === 3 ? 3 : 7); x < 23; x += 8) b.set(x, y, grain);
  // grout on top and left edges
  b.hline(0, 0, TILE_W, C.deepClay);
  b.vline(0, 0, 16, C.deepClay);
  // chips and cracks, chosen by variant
  const h = hash(variant * 7919 + (alt ? 13 : 0));
  const cx = 4 + (h % 15), cy = 3 + ((h >>> 5) % 10);
  b.set(cx, cy, C.cream).set(cx + 1, cy, grain);
  if (variant % 2 === 1) {
    const kx = 3 + ((h >>> 9) % 16), ky = 4 + ((h >>> 13) % 8);
    b.set(kx, ky, C.deepClay).set(kx + 1, ky + 1, C.deepClay).set(kx + 1, ky + 2, C.deepClay).set(kx + 2, ky + 3, C.deepClay);
  }
  if (variant === 2) b.set(1, 1, C.deepClay).set(2, 1, C.deepClay).set(1, 2, C.deepClay); // chipped corner
  lip(b, C.deepClay, C.umber);
  return b;
}

/** Sand: paler, with a few drift dots. */
export function sandTile(variant: number): PixelBuffer {
  const b = new PixelBuffer(TILE_W, TILE_H);
  b.rect(0, 0, TILE_W, 16, C.sand);
  b.hline(0, 0, TILE_W, C.clayLt);
  b.vline(0, 0, 16, C.clayLt);
  const h = hash(variant * 104729 + 3);
  for (let i = 0; i < 4; i++) b.set(2 + ((h >>> (i * 5)) % 20), 2 + ((h >>> (i * 3 + 2)) % 12), C.clay);
  lip(b, C.clayLt, C.deepClay);
  return b;
}

/**
 * Rock / wall block: a raised stone with a flat top and a jointed front face.
 * Taller than a tile: 24x26, the top 8px rise above the tile row.
 */
export function rockTile(variant: number): PixelBuffer {
  // Black-figure stone: dark umber block, ink joints, one clay highlight edge.
  const b = new PixelBuffer(TILE_W, 26);
  b.rect(0, 0, TILE_W, 10, C.umber);
  b.hline(0, 0, TILE_W, C.deepClay);
  b.vline(0, 0, 10, C.deepClay);
  b.set(4 + (variant % 3) * 6, 4, C.deepClay).set(5 + (variant % 3) * 6, 4, C.deepClay);
  b.rect(0, 10, TILE_W, 16, C.darkUmber);
  b.hline(0, 10, TILE_W, C.ink);
  b.hline(0, 17, TILE_W, C.ink);
  const off = variant % 2 === 0 ? 8 : 14;
  b.vline(off, 11, 6, C.ink);
  b.vline((off + 12) % 24, 18, 7, C.ink);
  b.set(1, 12, C.umber).set(1, 13, C.umber).set(1, 19, C.umber);
  b.hline(0, 25, TILE_W, C.ink);
  return b;
}

/**
 * The plinth under the board's front edge: the board sits on a painted vase
 * band (ink meander on clay) like a frieze. Width = board width.
 */
export function boardPlinth(w: number): PixelBuffer {
  const b = new PixelBuffer(w, 12);
  b.rect(0, 0, w, 12, C.clay);
  b.hline(0, 0, w, C.umber);
  meanderBand(b, 0, 2, w, C.ink);
  b.hline(0, 10, w, C.deepClay);
  b.hline(0, 11, w, C.ink);
  return b;
}

/** Deep water (the Scamander): triangle waves, two frames. */
export function waterTile(frame: number): PixelBuffer {
  const b = new PixelBuffer(TILE_W, TILE_H);
  b.rect(0, 0, TILE_W, 18, C.sea);
  const shift = frame % 2 === 0 ? 0 : 4;
  for (let row = 0; row < 3; row++) {
    const y = 2 + row * 5;
    const sx = (row % 2 === 0 ? 0 : 4) + shift;
    for (let x = -8 + sx; x < TILE_W; x += 8) {
      b.triangle(x, y + 3, x + 4, y, x + 8, y + 3, C.seaDk);
      b.set(x + 4, y, C.bone);
    }
  }
  b.hline(0, 16, TILE_W, C.seaDk);
  b.hline(0, 17, TILE_W, C.seaDk);
  return b;
}

/** Dry brush: ground with olive tufts. Fire spreads along these. */
export function brushTile(variant: number): PixelBuffer {
  const b = groundTile(variant, false);
  const tufts = [[4, 11], [11, 6], [17, 12], [19, 4]] as const;
  tufts.forEach(([x, y], i) => {
    if ((i + variant) % 4 === 3) return;
    b.triangle(x - 2, y + 2, x, y - 2, x + 2, y + 2, C.olive);
    b.vline(x + 1, y - 1, 3, C.oliveDk);
    b.set(x, y - 2, C.sage);
  });
  return b;
}

/**
 * Fire: stacked flame triangles, red under sun under gold. Two flicker frames.
 * Drawn on top of ground; 24x24 so flames rise above the tile.
 */
export function fireSprite(frame: number): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 24);
  const f = frame % 2;
  const flames = f === 0 ? [[5, 9], [12, 3], [18, 8]] : [[6, 7], [12, 5], [17, 10]];
  for (const [x, top] of flames) {
    b.triangle(x! - 4, 21, x!, top!, x! + 4, 21, C.red);
    b.triangle(x! - 2.5, 21, x!, top! + 5, x! + 2.5, 21, C.sun);
    b.triangle(x! - 1, 21, x!, top! + 10, x! + 1, 21, C.goldHi);
  }
  b.hline(2, 21, 20, C.red);
  return b.outlined(C.ink);
}

/** Torchlight on the ground: a dithered gold pool (stealth level). */
export function lightPool(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  for (let y = 1; y < 16; y++)
    for (let x = 1; x < TILE_W; x++) {
      const d = Math.hypot((x - 12) / 12, (y - 8) / 8);
      const lv = d < 0.6 ? 8 : d < 0.95 ? 4 : 0;
      if (lv && ditherOn(x, y, lv)) b.set(x, y, C.goldHi);
    }
  return b;
}

/** Overlay: reachable tile. Gold dither + gold inner frame. */
export function moveOverlay(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  b.ditherFill(1, 1, 23, 15, C.goldHi, 6);
  b.frame(2, 2, 21, 13, C.goldHi);
  return b;
}

/** Overlay: threatened tile. Solid threat clay with a hatch so it reads without color. */
export function threatOverlay(highContrast = false): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  b.rect(1, 1, 23, 15, C.threat);
  for (let x = -16; x < 24; x += 4) b.line(x, 15, x + 14, 1, highContrast ? C.ink : C.red);
  b.frame(1, 1, 23, 15, C.red);
  return b;
}

/** Overlay: selection brackets in gold. */
export function selectOverlay(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  const L = 5;
  for (const [x, y, dx, dy] of [[0, 0, 1, 1], [23, 0, -1, 1], [0, 15, 1, -1], [23, 15, -1, -1]] as const) {
    for (let i = 0; i < L; i++) {
      b.set(x + dx * i, y, C.goldHi).set(x, y + dy * i, C.goldHi);
      b.set(x + dx * i, y + dy, C.bronze).set(x + dx, y + dy * i, C.bronze);
    }
  }
  return b;
}

/** Background frieze strip of sea waves for shore levels. */
export function seaBand(w: number): PixelBuffer {
  const b = new PixelBuffer(w, 8);
  b.rect(0, 0, w, 8, C.sea);
  triangleBand(b, 0, 2, w, 8, 5, C.seaDk);
  for (let x = 4; x < w; x += 8) b.set(x, 2, C.bone);
  return b;
}
