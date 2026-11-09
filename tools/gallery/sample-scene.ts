/**
 * A composed 320x180 battle frame built only from art recipes, used in the
 * gallery to judge whether every piece works together at real size.
 */
import { C } from '../../src/art/palette';
import { PixelBuffer, rosetteBand } from '../../src/art/pixels';
import { drawText } from '../../src/art/font';
import { drawBackdrop } from '../../src/art/backdrops';
import * as T from '../../src/art/sprites/tiles';
import { buildFigureFrames } from '../../src/art/sprites/units';
import { button, panel } from '../../src/art/ui';
import { hpPips, intentGlyph, orderBadge } from '../../src/art/markers';
import { boardLayout, tileOrigin, unitOrigin, HUD_X, HUD_W } from '../../src/view/layout';

export function composeSampleScene(): PixelBuffer {
  const s = drawBackdrop('beach');
  const board = [
    '...%%..',
    '.......',
    '.......',
    '.#.~~..',
    '...~...',
  ];
  const rows = board.length, cols = board[0]!.length;
  const L = boardLayout(cols, rows);

  // tiles: back to front
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const ch = board[y]![x]!;
      const { px, py } = tileOrigin(L, x, y);
      if (ch === '#') continue;
      const t = ch === '~' ? T.waterTile(0) : ch === '%' ? T.brushTile(x + y) : T.groundTile((x * 3 + y) % 4, (x + y) % 2 === 1);
      s.blit(t, px, py);
    }

  { const o = tileOrigin(L, 0, rows); s.blit(T.boardPlinth(cols * 24), o.px, o.py + 2); }
  const move = T.moveOverlay(), threat = T.threatOverlay(), sel = T.selectOverlay();
  for (const [x, y] of [[2, 1], [1, 2], [3, 2], [4, 2], [2, 3], [2, 0], [3, 1], [1, 1], [0, 2]] as const) s.blit(move, tileOrigin(L, x, y).px, tileOrigin(L, x, y).py);
  // spearman at (5,1) thrusts left into (4,1); archer at (5,3)? water there. archer at (5,2) shoots left along row 2
  const threats: Array<[number, number, 'thrust' | 'arrow', 'left']> = [[4, 1, 'thrust', 'left'], [2, 2, 'arrow', 'left']];
  for (const [x, y] of threats) s.blit(threat, tileOrigin(L, x, y).px, tileOrigin(L, x, y).py);
  s.blit(sel, tileOrigin(L, 2, 2).px, tileOrigin(L, 2, 2).py);

  // rock rim and units, painter's order by row
  const units: Array<[string, number, number, number, number, 'greek' | 'trojan']> = [
    ['ajax', 1, 1, 4, 4, 'greek'],
    ['spearman', 5, 1, 2, 2, 'trojan'],
    ['achilles', 2, 2, 4, 4, 'greek'],
    ['archer', 6, 2, 1, 1, 'trojan'],
  ];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (board[y]![x] === '#') {
        const { px, py } = tileOrigin(L, x, y);
        s.blit(T.rockTile((x + y) % 3), px, py - 8);
      }
    }
    for (const [type, ux, uy, hp, max, team] of units) {
      if (uy !== y) continue;
      const { px, py } = unitOrigin(L, ux, uy);
      s.blit(buildFigureFrames(type).idle0, px, py);
      const pips = hpPips(hp, max, team);
      s.blit(pips, px + 12 - Math.floor(pips.w / 2), py - 4);
    }
  }
  // intent glyphs + order badges on threatened tiles
  threats.forEach(([x, y, kind, dir], i) => {
    const { px, py } = tileOrigin(L, x, y);
    s.blit(intentGlyph(kind, dir, C.ink), px + 7, py + 3);
    s.blit(orderBadge(i + 1), px + 1, py + 1);
  });
  // dotted arrow path from archer to target
  {
    const a = tileOrigin(L, 6, 2), t = tileOrigin(L, 2, 2);
    for (let x = t.px + 22; x < a.px; x += 4) s.rect(x, a.py + 7, 2, 1, C.red);
  }

  // ---- HUD column ----
  const hud = panel(HUD_W, 176, 'clay', true);
  s.blit(hud, HUD_X, 2);
  let y = 17;
  const tx = HUD_X + 7;
  drawText(s, 'The Landing', tx, y, C.ink);
  y += 11;
  drawText(s, 'Turn 1 / par 3', tx, y, C.umber);
  y += 13;
  s.hline(tx, y, HUD_W - 14, C.deepClay);
  y += 5;
  drawText(s, 'Achilles', tx, y, C.ink);
  s.blit(hpPips(4, 4, 'greek'), tx + 48, y + 1);
  y += 10;
  drawText(s, 'Move 3. Strike 2.', tx, y, C.umber);
  y += 10;
  drawText(s, 'Arrows kill him.', tx, y, C.red);
  y += 14;
  s.hline(tx, y, HUD_W - 14, C.deepClay);
  y += 5;
  drawText(s, 'Trojans act', tx, y, C.ink);
  y += 11;
  s.blit(orderBadge(1), tx, y - 2);
  drawText(s, 'Spear: thrust', tx + 12, y, C.umber);
  y += 12;
  s.blit(orderBadge(2), tx, y - 2);
  drawText(s, 'Archer: arrow', tx + 12, y, C.umber);
  y += 16;
  s.blit(button(HUD_W - 14, 14, 'End turn', 'hover', 'E'), tx, y);
  y += 17;
  s.blit(button(Math.floor((HUD_W - 17) / 2), 14, 'Undo', 'idle'), tx, y);
  s.blit(button(Math.floor((HUD_W - 17) / 2), 14, 'Zeus', 'idle'), tx + Math.floor((HUD_W - 17) / 2) + 3, y);

  // title band top-left
  const tb = panel(118, 15, 'ink');
  s.blit(tb, 4, 4);
  drawText(s, 'Act I: The Beaches', 9, 8, C.cream);
  rosetteBand(s, 4, 20, 118, 6, C.ink);
  return s;
}
