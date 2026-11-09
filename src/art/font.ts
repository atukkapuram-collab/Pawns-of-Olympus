/**
 * "Stele": the game's own bitmap font. Capitals are lapidary, like letters cut
 * into a Greek inscription: straight strokes, open angular joins, slightly
 * wide. Caps and digits are 5x7; lowercase has a 5px x-height with 2px
 * ascenders and descenders. Line height 10. Variable width, 1px tracking.
 *
 * Each glyph is rows joined with '|', '#' = ink. Rows start at the top of the
 * 9px cell (row 0 = cap top, row 6 = baseline row, rows 7-8 = descenders).
 */
import { PixelBuffer } from './pixels';
import type { ColorIndex } from './palette';

const G: Record<string, string> = {
  A: '..#..|.#.#.|.#.#.|#...#|#####|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.####|#....|#....|#....|#....|#....|.####',
  D: '###..|#..#.|#...#|#...#|#...#|#..#.|###..',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.####|#....|#....|#..##|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '.#...#.|.##.##.|.#.#.#.|#..#..#|#.....#|#.....#|#.....#',
  N: '#...#|##..#|##..#|#.#.#|#..##|#..##|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|.#.#.|.#.#.|..#..|..#..',
  W: '#.....#|#.....#|#.....#|#..#..#|.#.#.#.|.##.##.|.#...#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',

  a: '.....|.....|.###.|....#|.####|#...#|.####',
  b: '#....|#....|####.|#...#|#...#|#...#|####.',
  c: '....|....|.###|#...|#...|#...|.###',
  d: '....#|....#|.####|#...#|#...#|#...#|.####',
  e: '.....|.....|.###.|#...#|#####|#....|.####',
  f: '..##|.#..|####|.#..|.#..|.#..|.#..',
  g: '.....|.....|.####|#...#|#...#|#...#|.####|....#|.###.',
  h: '#....|#....|####.|#...#|#...#|#...#|#...#',
  i: '#|.|#|#|#|#|#',
  j: '..#|...|..#|..#|..#|..#|..#|..#|##.',
  k: '#...|#...|#..#|#.#.|##..|#.#.|#..#',
  l: '#.|#.|#.|#.|#.|#.|.#',
  m: '.....|.....|####.|#.#.#|#.#.#|#.#.#|#.#.#',
  n: '.....|.....|####.|#...#|#...#|#...#|#...#',
  o: '.....|.....|.###.|#...#|#...#|#...#|.###.',
  p: '.....|.....|####.|#...#|#...#|#...#|####.|#....|#....',
  q: '.....|.....|.####|#...#|#...#|#...#|.####|....#|....#',
  r: '....|....|#.##|##..|#...|#...|#...',
  s: '.....|.....|.####|#....|.###.|....#|####.',
  t: '.#..|.#..|####|.#..|.#..|.#..|..##',
  u: '.....|.....|#...#|#...#|#...#|#...#|.####',
  v: '.....|.....|#...#|#...#|.#.#.|.#.#.|..#..',
  w: '.....|.....|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  y: '.....|.....|#...#|#...#|#...#|#...#|.####|....#|.###.',
  z: '.....|.....|#####|...#.|..#..|.#...|#####',

  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '.#.|##.|.#.|.#.|.#.|.#.|###',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|..#..|..#..|..#..',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',

  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|..|.#|#.',
  ':': '.|.|#|.|.|.|#',
  ';': '..|..|.#|..|..|..|.#|#.',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|..##.|..#..|.....|..#..',
  "'": '#|#',
  '"': '#.#|#.#',
  '-': '.....|.....|.....|#####',
  '+': '.....|..#..|..#..|#####|..#..|..#..',
  '=': '...|...|###|...|###',
  '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
  '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.',
  '[': '##|#.|#.|#.|#.|#.|##',
  ']': '##|.#|.#|.#|.#|.#|##',
  '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
  '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#',
  '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '_': '.....|.....|.....|.....|.....|.....|#####',
  '#': '.#.#.|#####|.#.#.|.#.#.|.#.#.|#####|.#.#.',
  // Kleos star (used as "*"), and a hollow one as "^"
  '*': '..#..|..#..|#####|.###.|.#.#.|#...#',
  '^': '..#..|..#..|##.##|.#.#.|.#.#.|#...#',
  // HP pip (used as "~")
  '~': '###|###|###',
};

export interface Glyph {
  w: number;
  rows: string[];
}

const GLYPHS = new Map<string, Glyph>();
for (const [ch, s] of Object.entries(G)) {
  const rows = s.split('|');
  GLYPHS.set(ch, { w: Math.max(...rows.map((r) => r.length)), rows });
}

export const FONT = {
  capHeight: 7,
  lineHeight: 10,
  spaceWidth: 3,
  tracking: 1,
};

export function glyph(ch: string): Glyph | undefined {
  return GLYPHS.get(ch);
}

export function hasGlyph(ch: string): boolean {
  return ch === ' ' || ch === '\n' || GLYPHS.has(ch);
}

/** Width in pixels of a single line (no wrapping). */
export function measureLine(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') { w += FONT.spaceWidth + FONT.tracking; continue; }
    const g = GLYPHS.get(ch) ?? GLYPHS.get('?')!;
    w += g.w + FONT.tracking;
  }
  return Math.max(0, w - FONT.tracking);
}

/** Greedy word wrap to `maxWidth` pixels. Respects explicit '\n'. */
export function wrapText(text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const trial = line ? `${line} ${word}` : word;
      if (measureLine(trial) <= maxWidth || !line) line = trial;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

/** Measure a (possibly multi-line, wrapped) block. */
export function measureText(text: string, maxWidth = Infinity): { w: number; h: number; lines: string[] } {
  const lines = Number.isFinite(maxWidth) ? wrapText(text, maxWidth) : text.split('\n');
  const w = Math.max(0, ...lines.map(measureLine));
  const descends = /[gjpqy,;]/.test(lines[lines.length - 1] ?? '') ? 2 : 0;
  const h = lines.length === 0 ? 0 : (lines.length - 1) * FONT.lineHeight + FONT.capHeight + descends;
  return { w, h, lines };
}

export type Align = 'left' | 'center' | 'right';

/**
 * Draw text into a buffer. `shadow` draws a 1px drop copy down-right in that
 * color first (a hard pixel shadow, not a soft one).
 */
export function drawText(
  b: PixelBuffer,
  text: string,
  x: number,
  y: number,
  color: ColorIndex,
  opts: { shadow?: ColorIndex; maxWidth?: number; align?: Align } = {},
): { w: number; h: number } {
  const { w, h, lines } = measureText(text, opts.maxWidth);
  lines.forEach((line, li) => {
    const lw = measureLine(line);
    const ox = opts.align === 'center' ? Math.floor((w - lw) / 2) : opts.align === 'right' ? w - lw : 0;
    const draw = (dx: number, dy: number, c: ColorIndex) => {
      let cx = x + ox + dx;
      for (const ch of line) {
        if (ch === ' ') { cx += FONT.spaceWidth + FONT.tracking; continue; }
        const g = GLYPHS.get(ch) ?? GLYPHS.get('?')!;
        g.rows.forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') b.set(cx + rx, y + dy + li * FONT.lineHeight + ry, c);
        });
        cx += g.w + FONT.tracking;
      }
    };
    if (opts.shadow !== undefined) draw(1, 1, opts.shadow);
    draw(0, 0, color);
  });
  return { w: w + (opts.shadow !== undefined ? 1 : 0), h: h + (opts.shadow !== undefined ? 1 : 0) };
}

/** Render text into its own tightly sized buffer. */
export function textBuffer(text: string, color: ColorIndex, opts: { shadow?: ColorIndex; maxWidth?: number; align?: Align } = {}): PixelBuffer {
  const m = measureText(text, opts.maxWidth);
  const s = opts.shadow !== undefined ? 1 : 0;
  const b = new PixelBuffer(Math.max(1, m.w + s), Math.max(1, m.h + s + 2));
  drawText(b, text, 0, 0, color, opts);
  return b;
}
