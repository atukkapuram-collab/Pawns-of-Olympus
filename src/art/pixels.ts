/**
 * PixelBuffer: an indexed-color bitmap and the deterministic drawing primitives
 * every sprite recipe is built from. No canvas needed (runs in Node tests), and
 * every pixel is a palette index, so nothing off-palette can be drawn.
 */
import { CLEAR, PALETTE_RGB, type ColorIndex } from './palette';

/** 4x4 Bayer matrix, values 0..15. Used for every fade, glow-substitute and light. */
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** True if pixel (x, y) is "on" for an ordered-dither level 0..16 (0 none, 16 all). */
export function ditherOn(x: number, y: number, level: number): boolean {
  return BAYER4[((y % 4) + 4) % 4]![((x % 4) + 4) % 4]! < level;
}

export class PixelBuffer {
  readonly data: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h).fill(CLEAR);
  }

  static from(rows: string[], key: Record<string, ColorIndex>): PixelBuffer {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const b = new PixelBuffer(w, h);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]!;
        const c = key[ch];
        if (c !== undefined) b.set(x, y, c);
      }
    });
    return b;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): number {
    return this.inside(x, y) ? this.data[y * this.w + x]! : CLEAR;
  }

  set(x: number, y: number, c: ColorIndex): this {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inside(x, y)) this.data[y * this.w + x] = c;
    return this;
  }

  /** Set only where already opaque (paint "inside" a shape). */
  paint(x: number, y: number, c: ColorIndex): this {
    if (this.get(x, y) !== CLEAR) this.set(x, y, c);
    return this;
  }

  clear(): this {
    this.data.fill(CLEAR);
    return this;
  }

  clone(): PixelBuffer {
    const b = new PixelBuffer(this.w, this.h);
    b.data.set(this.data);
    return b;
  }

  rect(x: number, y: number, w: number, h: number, c: ColorIndex): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  /** 1px rectangle border. */
  frame(x: number, y: number, w: number, h: number, c: ColorIndex): this {
    this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c);
    return this;
  }

  hline(x: number, y: number, w: number, c: ColorIndex): this {
    return this.rect(x, y, w, 1, c);
  }

  vline(x: number, y: number, h: number, c: ColorIndex): this {
    return this.rect(x, y, 1, h, c);
  }

  /** Bresenham line, 1px, no anti-aliasing. */
  line(x0: number, y0: number, x1: number, y1: number, c: ColorIndex): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /**
   * Filled circle centred on (cx, cy) with radius r. Pixel-exact and symmetric;
   * the "+ r*0.8" term rounds the silhouette like hand-placed pixel circles.
   * `half` = 'top' | 'bottom' draws only that half (helmets, crests).
   * `shadeRight` paints the right side (x > cx + shadeFrom) in a shadow color.
   */
  circle(cx: number, cy: number, r: number, c: ColorIndex, opts: { half?: 'top' | 'bottom'; shade?: ColorIndex; shadeFrom?: number } = {}): this {
    const lim = r * r + r * 0.8;
    for (let y = -r; y <= r; y++) {
      if (opts.half === 'top' && y > 0) continue;
      if (opts.half === 'bottom' && y < 0) continue;
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= lim) {
          const useShade = opts.shade !== undefined && x > (opts.shadeFrom ?? Math.floor(r / 3));
          this.set(cx + x, cy + y, useShade ? opts.shade! : c);
        }
      }
    }
    return this;
  }

  /** Half-disc: the classic crest / helmet dome. */
  halfCircle(cx: number, cy: number, r: number, c: ColorIndex, shade?: ColorIndex): this {
    return this.circle(cx, cy, r, c, shade === undefined ? { half: 'top' } : { half: 'top', shade });
  }

  /** Ellipse (axis aligned), filled. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: ColorIndex): this {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx + rx * 0.6) + (y * y) / (ry * ry + ry * 0.6) <= 1) this.set(cx + x, cy + y, c);
    return this;
  }

  /**
   * Scanline triangle fill using pixel-centre sampling (top-left rule-ish).
   * Deterministic and gap-free between triangles that share an edge.
   */
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: ColorIndex): this {
    const s = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
    const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const X = px + 0.5, Y = py + 0.5;
        const d1 = s(X, Y, x1, y1, x2, y2), d2 = s(X, Y, x2, y2, x3, y3), d3 = s(X, Y, x3, y3, x1, y1);
        const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.set(px, py, c);
      }
    }
    return this;
  }

  /** Fill a rectangle with color `c` at ordered-dither density `level` (0..16). */
  ditherFill(x: number, y: number, w: number, h: number, c: ColorIndex, level: number, onlyOpaque = false): this {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j;
        if (!ditherOn(px, py, level)) continue;
        if (onlyOpaque) this.paint(px, py, c); else this.set(px, py, c);
      }
    return this;
  }

  /** Dithered ring (halo): solid core band, then thinning dither outward. Never a soft glow. */
  ditherRing(cx: number, cy: number, r0: number, r1: number, c: ColorIndex, levels: number[] = [16, 8, 4]): this {
    const band = (r1 - r0) / levels.length;
    for (let y = Math.floor(cy - r1 - 1); y <= cy + r1 + 1; y++)
      for (let x = Math.floor(cx - r1 - 1); x <= cx + r1 + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r0 || d >= r1) continue;
        const lv = levels[Math.min(levels.length - 1, Math.floor((d - r0) / band))]!;
        if (ditherOn(x, y, lv)) this.set(x, y, c);
      }
    return this;
  }

  /** Draw another buffer onto this one. Transparent pixels are skipped. */
  blit(src: PixelBuffer, dx: number, dy: number, opts: { flipX?: boolean; map?: Partial<Record<number, number>> } = {}): this {
    dx = Math.round(dx); dy = Math.round(dy);
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        let c = src.data[y * src.w + (opts.flipX ? src.w - 1 - x : x)]!;
        if (c === CLEAR) continue;
        if (opts.map && opts.map[c] !== undefined) c = opts.map[c]!;
        this.set(dx + x, dy + y, c);
      }
    return this;
  }

  /** New buffer, mirrored horizontally. */
  flipped(): PixelBuffer {
    return new PixelBuffer(this.w, this.h).blit(this, 0, 0, { flipX: true });
  }

  /** Replace colors via a map (palette swap). Returns a new buffer. */
  paletteSwap(map: Partial<Record<number, number>>): PixelBuffer {
    const b = this.clone();
    for (let i = 0; i < b.data.length; i++) {
      const c = b.data[i]!;
      if (c !== CLEAR && map[c] !== undefined) b.data[i] = map[c]!;
    }
    return b;
  }

  /**
   * 1px outline around every opaque pixel (4-neighbour), drawn into transparent
   * pixels. Returns a new buffer the same size (leave a 1px margin in recipes).
   */
  outlined(c: ColorIndex, diagonals = false): PixelBuffer {
    const out = this.clone();
    const opaque = (x: number, y: number) => this.get(x, y) !== CLEAR;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (opaque(x, y)) continue;
        const n = opaque(x + 1, y) || opaque(x - 1, y) || opaque(x, y + 1) || opaque(x, y - 1);
        const d = diagonals && (opaque(x + 1, y + 1) || opaque(x - 1, y - 1) || opaque(x + 1, y - 1) || opaque(x - 1, y + 1));
        if (n || d) out.set(x, y, c);
      }
    return out;
  }

  /** Copy a sub-rectangle out as a new buffer. */
  crop(x: number, y: number, w: number, h: number): PixelBuffer {
    const b = new PixelBuffer(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.data[j * w + i] = this.get(x + i, y + j);
    return b;
  }

  /** Set of palette indices used (excluding transparency). */
  colorsUsed(): Set<number> {
    const s = new Set<number>();
    for (const c of this.data) if (c !== CLEAR) s.add(c);
    return s;
  }

  /** RGBA bytes for ImageData / PNG export. */
  toRGBA(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i]!;
      if (c === CLEAR) continue;
      const rgb = PALETTE_RGB[c]!;
      out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2]; out[i * 4 + 3] = 255;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Decorative bands (vase friezes). Each draws into `b` starting at (x, y).
// ---------------------------------------------------------------------------

/**
 * Running meander (Greek key). Height 9: a 1px rule, a 1px gap, a 5px
 * interlocking key, a 1px gap, a 1px rule. Period 8px. Drawn in fg over whatever is underneath.
 */
export const MEANDER_H = 9;
export function meanderBand(b: PixelBuffer, x: number, y: number, w: number, fg: ColorIndex, rules = true): void {
  const unit = ['#.#####.', '#.#...#.', '#.#.#.#.', '#...#.#.', '#####.#.'];
  if (rules) {
    b.hline(x, y, w, fg);
    b.hline(x, y + 8, w, fg);
  }
  for (let i = 0; i < w; i++) {
    const col = i % 8;
    for (let r = 0; r < 5; r++) if (unit[r]![col] === '#') b.set(x + i, y + 2 + r, fg);
  }
}

/** Zigzag band: a 1px line of up/down chevrons. Height h (3..5), period 2*(h-1). */
export function zigzagBand(b: PixelBuffer, x: number, y: number, w: number, h: number, c: ColorIndex): void {
  const p = (h - 1) * 2;
  for (let i = 0; i < w; i++) {
    const t = i % p;
    const yy = t < h - 1 ? t : p - t;
    b.set(x + i, y + yy, c);
  }
}

/** Checkerboard band of `s`-px squares, `rows` high. */
export function checkerBand(b: PixelBuffer, x: number, y: number, w: number, s: number, rows: number, c: ColorIndex): void {
  for (let j = 0; j < rows; j++)
    for (let i = 0; i * s < w; i++) if ((i + j) % 2 === 0) b.rect(x + i * s, y + j * s, Math.min(s, w - i * s), s, c);
}

/** Dot-rosette band: little 5-dot crosses every `gap` px. Height 3. */
export function rosetteBand(b: PixelBuffer, x: number, y: number, w: number, gap: number, c: ColorIndex): void {
  for (let i = 1; i < w - 1; i += gap) {
    b.set(x + i, y + 1, c).set(x + i - 1, y + 1, c).set(x + i + 1, y + 1, c).set(x + i, y, c).set(x + i, y + 2, c);
  }
}

/** Row of upright triangles (sea waves / mountain band), period p, height h. */
export function triangleBand(b: PixelBuffer, x: number, y: number, w: number, p: number, h: number, c: ColorIndex, shade?: ColorIndex): void {
  for (let i = 0; i < w; i += p) {
    b.triangle(x + i, y + h, x + i + p / 2, y, x + i + p, y + h, c);
    if (shade !== undefined) b.triangle(x + i + p / 2, y + h, x + i + p / 2, y, x + i + p, y + h, shade);
  }
}
