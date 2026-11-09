/**
 * The title lettering: big lapidary capitals drawn at native pixel size with
 * 2px strokes (never a scaled-up font), cream with an ink cut and a
 * deep-clay drop, like letters incised into a painted band.
 */
import { C } from './palette';
import { PixelBuffer } from './pixels';

const BIG: Record<string, string[]> = {
  P: ['#######.', '##....##', '##....##', '##....##', '#######.', '##......', '##......', '##......', '##......'],
  A: ['...##...', '..####..', '.##..##.', '.##..##.', '##....##', '########', '##....##', '##....##', '##....##'],
  W: ['##......##', '##......##', '##......##', '##..##..##', '##..##..##', '##.####.##', '.###..###.', '.##....##.', '.#......#.'],
  N: ['##....##', '###...##', '####..##', '##.##.##', '##..####', '##...###', '##....##', '##....##', '##....##'],
  S: ['.#######', '##......', '##......', '##......', '.######.', '......##', '......##', '......##', '#######.'],
  O: ['.######.', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '.######.'],
  F: ['########', '##......', '##......', '######..', '##......', '##......', '##......', '##......', '##......'],
  L: ['##......', '##......', '##......', '##......', '##......', '##......', '##......', '##......', '########'],
  Y: ['##....##', '##....##', '.##..##.', '..####..', '...##...', '...##...', '...##...', '...##...', '...##...'],
  M: ['##......##', '###....###', '####..####', '##.####.##', '##..##..##', '##......##', '##......##', '##......##', '##......##'],
  U: ['##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '.######.'],
};

export function logoBuffer(text = 'PAWNS OF OLYMPUS'): PixelBuffer {
  const gap = 2, space = 6;
  let w = 0;
  for (const ch of text) w += ch === ' ' ? space : (BIG[ch]?.[0]!.length ?? 8) + gap;
  const b = new PixelBuffer(w + 4, 9 + 4);
  const letters = new PixelBuffer(w + 4, 13);
  let x = 2;
  for (const ch of text) {
    if (ch === ' ') { x += space; continue; }
    const g = BIG[ch]!;
    g.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') letters.set(x + i, y + 1, C.cream); });
    x += g[0]!.length + gap;
  }
  // deep-clay drop one pixel down-right, then the ink cut around the letters
  b.blit(letters.paletteSwap({ [C.cream]: C.deepClay }), 1, 1);
  b.blit(letters.outlined(C.ink), 0, 0);
  return b;
}
