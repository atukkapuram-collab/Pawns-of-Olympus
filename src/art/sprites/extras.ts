/** Board overlays and objects that aren't figures: ship, target and cursor frames. */
import { C } from '../palette';
import { PixelBuffer } from '../pixels';
import { TILE_W } from './tiles';

/** Attack-target frame: a solid 2px gold frame with an ink inner line. */
export function targetOverlay(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  b.frame(1, 1, 23, 15, C.goldHi).frame(2, 2, 21, 13, C.goldHi).frame(3, 3, 19, 11, C.ink);
  return b;
}

/** Hover / keyboard cursor: 1px cream frame with ink corners. */
export function cursorOverlay(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  b.frame(1, 1, 23, 15, C.cream);
  for (const [x, y] of [[1, 1], [23, 1], [1, 15], [23, 15]] as const) b.set(x, y, C.ink);
  return b;
}

/** Red frame only: redrawn over a unit's feet when it stands on a threatened tile. */
export function threatFrame(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  b.frame(1, 1, 23, 15, C.red);
  b.frame(2, 14, 21, 1, C.red);
  return b;
}

/** Plague mark: Apollo's arrows will land here (sun-colored dither + falling-arrow glyph drawn separately). */
export function plagueOverlay(): PixelBuffer {
  const b = new PixelBuffer(TILE_W, 16);
  b.ditherFill(1, 1, 23, 15, C.sun, 8);
  b.frame(1, 1, 23, 15, C.sun);
  return b;
}

/** Path dot for arrow / charge lanes: a 2x1 red dash on a 2x1 ink backing. */
export function pathDot(): PixelBuffer {
  return new PixelBuffer(2, 2).rect(0, 0, 2, 1, C.red).rect(0, 1, 2, 1, C.ink);
}

/**
 * Greek ship, black-figure: ink hull with a painted eye at the prow, oar
 * strokes, a mast and a cream sail band. 24x28, sits on its tile like a unit.
 */
export function shipSprite(damaged = false): PixelBuffer {
  const b = new PixelBuffer(24, 28);
  // hull
  b.rect(2, 20, 20, 4, C.ink);
  b.triangle(0, 18, 3, 20, 3, 24, C.ink);
  b.triangle(21, 20, 24, 16, 21, 24, C.ink);
  b.set(5, 21, C.cream).set(6, 21, C.ink); // the eye
  for (let x = 8; x < 20; x += 3) b.set(x, 24, C.ink).set(x - 1, 25, C.ink); // oars
  // mast and sail
  b.vline(12, 4, 16, C.umber);
  b.rect(6, 6, 13, 7, C.bone);
  b.hline(6, 6, 13, C.boneDk);
  b.hline(6, 9, 13, C.boneDk);
  if (damaged) {
    b.rect(13, 8, 3, 5, 255); // torn sail
    b.set(9, 22, C.sun).set(15, 21, C.sun);
  }
  return b.outlined(C.ink);
}
