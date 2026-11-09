/**
 * Backdrops behind the board: flat bands of sky, a disc sun, triangle hills
 * and the block walls of Troy. Sky bands are the only "gradient" allowed, and
 * they are hard steps joined by a 2-row ordered dither, never a smooth ramp.
 */
import { C, type ColorIndex } from './palette';
import { PixelBuffer, triangleBand, zigzagBand } from './pixels';

export type Backdrop = 'beach' | 'plain' | 'walls' | 'night';

function skyBands(b: PixelBuffer, bands: Array<[ColorIndex, number]>): void {
  let y = 0;
  bands.forEach(([c, h], i) => {
    b.rect(0, y, b.w, h, c);
    const next = bands[i + 1];
    if (next) {
      b.ditherFill(0, y + h - 2, b.w, 2, next[0], 8);
    }
    y += h;
  });
}

/** Troy's wall: courses of blocks, crenellations, square towers, one gate. */
function troyWall(b: PixelBuffer, y: number, h: number, night: boolean): void {
  const face = night ? C.nightClay : C.clayLt;
  const joint = night ? C.darkUmber : C.deepClay;
  const light = night ? C.deepClay : C.sand;
  b.rect(0, y, b.w, h, face);
  for (let row = 0; row * 4 < h; row++) {
    const yy = y + row * 4;
    b.hline(0, yy, b.w, joint);
    for (let x = row % 2 === 0 ? 0 : 6; x < b.w; x += 12) b.vline(x, yy, 4, joint);
  }
  for (let x = 0; x < b.w; x += 8) b.rect(x, y - 3, 4, 3, face), b.hline(x, y - 3, 4, light);
  // towers
  for (const tx of [22, 140, 262]) {
    b.rect(tx, y - 12, 26, h + 12, face);
    b.frame(tx, y - 12, 26, h + 12, joint);
    b.vline(tx + 1, y - 11, h + 10, light);
    for (let x = tx; x < tx + 26; x += 6) b.rect(x, y - 15, 4, 3, face), b.hline(x, y - 15, 4, light);
    b.rect(tx + 11, y - 6, 4, 6, joint); // window slit
  }
  // the gate in the middle tower
  b.rect(146, y + 2, 14, h - 2, C.ink);
  b.halfCircle(153, y + 2, 7, C.ink);
}

export function drawBackdrop(kind: Backdrop, w = 320, h = 180): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const night = kind === 'night';
  if (night) {
    skyBands(b, [[C.ink, 40], [C.darkUmber, 30], [C.nightClay, h - 70]]);
    b.circle(258, 22, 9, C.bone, { shade: C.boneDk, shadeFrom: 4 }); // moon
    for (const [x, y] of [[30, 12], [70, 26], [118, 9], [200, 18], [300, 30], [160, 34]] as const) b.set(x, y, C.cream);
  } else {
    skyBands(b, [[C.cream, 26], [C.sand, 22], [C.clayLt, h - 48]]);
    b.circle(262, 26, 13, C.sun); // flat disc sun, no glow
  }

  if (kind === 'beach') {
    triangleBand(b, 0, 40, w, 16, 8, C.sea, C.seaDk);
    b.rect(0, 48, w, 8, C.sea);
    zigzagBand(b, 0, 50, w, 3, C.bone);
    // ships' black hulls on the horizon
    for (const sx of [40, 96, 210]) {
      b.rect(sx, 44, 22, 3, C.ink);
      b.triangle(sx - 3, 44, sx, 44, sx, 47, C.ink);
      b.vline(sx + 11, 34, 10, C.ink);
      b.rect(sx + 7, 35, 9, 5, C.bone);
    }
  } else {
    // hills: sage triangles, overlapping
    b.triangle(-20, 56, 50, 30, 120, 56, C.sage);
    b.triangle(90, 56, 170, 34, 250, 56, C.oliveDk);
    b.triangle(200, 56, 280, 28, 360, 56, C.sage);
    if (kind === 'walls' || night) troyWall(b, 38, 18, night);
  }
  return b;
}
