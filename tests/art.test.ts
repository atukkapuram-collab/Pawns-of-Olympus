import { describe, expect, it } from 'vitest';
import { CLEAR, PALETTE_HEX, PALETTE_RGB, NIGHT_REMAP, flashMap } from '../src/art/palette';
import { PixelBuffer, ditherOn, meanderBand } from '../src/art/pixels';
import { FONT, drawText, glyph, hasGlyph, measureLine, wrapText } from '../src/art/font';
import { buildFigureFrames, FIGURES } from '../src/art/sprites/units';
import { POSES } from '../src/art/sprites/figure';
import { buildPortrait, GODS } from '../src/art/sprites/gods';
import * as T from '../src/art/sprites/tiles';
import { button, panel } from '../src/art/ui';
import { drawBackdrop } from '../src/art/backdrops';
import { hpPips, intentGlyph, orderBadge } from '../src/art/markers';
import { STRINGS } from '../src/data/strings';

function allSprites(): Array<[string, PixelBuffer]> {
  const out: Array<[string, PixelBuffer]> = [];
  for (const type of Object.keys(FIGURES)) {
    const fr = buildFigureFrames(type);
    for (const p of POSES) out.push([`${type}.${p}`, fr[p]]);
  }
  for (const g of Object.keys(GODS)) out.push([`god.${g}`, buildPortrait(g)]);
  return out;
}

function allTextures(): Array<[string, PixelBuffer]> {
  return [
    ...allSprites(),
    ...[0, 1, 2, 3].map((v) => [`ground${v}`, T.groundTile(v, v % 2 === 1)] as [string, PixelBuffer]),
    ['rock', T.rockTile(0)], ['water', T.waterTile(0)], ['brush', T.brushTile(0)], ['fire', T.fireSprite(0)],
    ['sand', T.sandTile(0)], ['move', T.moveOverlay()], ['threat', T.threatOverlay()], ['select', T.selectOverlay()],
    ['plinth', T.boardPlinth(96)], ['panel', panel(80, 40, 'clay', true)], ['button', button(50, 14, 'End turn', 'hover', 'E')],
    ['beach', drawBackdrop('beach')], ['walls', drawBackdrop('walls')], ['night', drawBackdrop('night')],
    ['pips', hpPips(2, 4, 'greek')], ['badge', orderBadge(3)], ['glyph', intentGlyph('arrow', 'up')],
  ];
}

describe('palette', () => {
  it('has at most 32 unique colors and includes the 18 reference colors', () => {
    expect(PALETTE_HEX.length).toBeLessThanOrEqual(32);
    expect(new Set(PALETTE_HEX).size).toBe(PALETTE_HEX.length);
    const reference = '#f7e3bd #efc08a #f08a4b #d29a5e #b5783f #7a4a20 #2a1a10 #e0a83a #ffe9a0 #d8342c #3a62c0 #3f8a5a #6b9480 #8a2a3a #7a3a9a #9aa4b0 #f0b888 #c45a3c'.split(' ');
    for (const c of reference) expect(PALETTE_HEX).toContain(c);
  });

  it('every generated texture uses only palette colors (RGBA scan)', () => {
    const allowed = new Set(PALETTE_RGB.map(([r, g, b]) => (r << 16) | (g << 8) | b));
    for (const [name, buf] of allTextures()) {
      const px = buf.toRGBA();
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        expect(px[i + 3], `${name} alpha`).toBe(255); // no partial transparency
        const rgb = (px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!;
        if (!allowed.has(rgb)) throw new Error(`${name} has off-palette color #${rgb.toString(16)}`);
      }
    }
  });

  it('each character and god sprite uses 8 colors or fewer', () => {
    for (const [name, buf] of allSprites()) {
      expect(buf.colorsUsed().size, name).toBeLessThanOrEqual(8);
    }
  });

  it('night remap and hit flash stay inside the palette', () => {
    for (const v of Object.values(NIGHT_REMAP)) expect(v).toBeLessThan(PALETTE_HEX.length);
    for (const v of Object.values(flashMap())) expect(v).toBeLessThan(PALETTE_HEX.length);
  });
});

describe('pixel primitives', () => {
  it('are deterministic', () => {
    const a = buildFigureFrames('achilles').idle0, b = buildFigureFrames('achilles').idle0;
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('ordered dither covers the expected share of pixels', () => {
    let on = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (ditherOn(x, y, 8)) on++;
    expect(on).toBe(8);
  });

  it('outlines add a 1px ring and never overwrite opaque pixels', () => {
    const b = new PixelBuffer(5, 5).set(2, 2, 3);
    const o = b.outlined(6);
    expect(o.get(2, 2)).toBe(3);
    expect([o.get(1, 2), o.get(3, 2), o.get(2, 1), o.get(2, 3)]).toEqual([6, 6, 6, 6]);
    expect(o.get(1, 1)).toBe(CLEAR);
  });

  it('meander band is periodic', () => {
    const b = new PixelBuffer(32, 7);
    meanderBand(b, 0, 0, 32, 6);
    for (let y = 0; y < 7; y++) for (let x = 0; x < 24; x++) expect(b.get(x, y)).toBe(b.get(x + 8, y));
  });

  it('figures fit their 24x32 cell with feet on row 30', () => {
    const f = buildFigureFrames('ajax').idle0;
    expect([f.w, f.h]).toEqual([24, 32]);
    let feet = false;
    for (let x = 0; x < 24; x++) if (f.get(x, 30) !== CLEAR) feet = true;
    expect(feet).toBe(true);
  });
});

describe('bitmap font', () => {
  it('has a glyph for every character used in player-facing strings', () => {
    const missing = new Set<string>();
    for (const s of Object.values(STRINGS)) for (const ch of s) if (!hasGlyph(ch)) missing.add(ch);
    expect([...missing]).toEqual([]);
  });

  it('caps and digits are 7 rows tall', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(glyph(ch)!.rows.length, ch).toBe(FONT.capHeight);
  });

  it('measures and wraps', () => {
    expect(measureLine('I')).toBe(3);
    expect(measureLine('AB')).toBe(11);
    const lines = wrapText('The gods are playing. You are the pieces.', 80);
    for (const l of lines) expect(measureLine(l)).toBeLessThanOrEqual(80);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('draws inside the buffer', () => {
    const b = new PixelBuffer(40, 10);
    const r = drawText(b, 'Kleos', 0, 0, 6, { shadow: 4 });
    expect(r.w).toBeGreaterThan(0);
    expect(b.colorsUsed()).toEqual(new Set([6, 4]));
  });
});
