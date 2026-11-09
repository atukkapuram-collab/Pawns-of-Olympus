/**
 * God portraits, 48x56. Hourglass body of two triangles, long robe with a gold
 * meander hem, one signature item, and a dithered halo ring in the god's
 * signature color. Background: an ink night panel with a dithered horizon.
 */
import { C, type ColorIndex } from '../palette';
import { PixelBuffer } from '../pixels';

export const PORTRAIT_W = 48;
export const PORTRAIT_H = 56;

export interface GodSpec {
  halo: ColorIndex;
  bg: ColorIndex;
  bgLow: ColorIndex;
  robe: ColorIndex;
  robeDk: ColorIndex;
  hair: ColorIndex;
  /** Draw headgear, item and anything unique. Called after the body. */
  draw: (b: PixelBuffer) => void;
  /** Drawn over the bottom edge (clouds, waves). */
  front?: (b: PixelBuffer) => void;
}

/** A small running meander along the hem, 3px tall, period 4. */
function hemMeander(b: PixelBuffer, x0: number, x1: number, y: number): void {
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) % 4;
    if (t === 0) b.vline(x, y, 3, C.bronze);
    else if (t === 1) b.set(x, y, C.bronze);
    else if (t === 2) { b.set(x, y, C.bronze); b.set(x, y + 2, C.bronze); }
    else b.set(x, y + 2, C.bronze);
  }
  b.hline(x0, y + 3, x1 - x0 + 1, C.bronze);
}

export function drawGodPortrait(g: GodSpec): PixelBuffer {
  const b = new PixelBuffer(PORTRAIT_W, PORTRAIT_H);
  // panel background: flat field with a dithered lower band (never a gradient)
  b.rect(0, 0, PORTRAIT_W, PORTRAIT_H, g.bg);
  b.ditherFill(0, 30, PORTRAIT_W, 6, g.bgLow, 4);
  b.ditherFill(0, 36, PORTRAIT_W, 6, g.bgLow, 10);
  b.rect(0, 42, PORTRAIT_W, 14, g.bgLow);
  // halo: solid inner band, dithered outer rings
  b.ditherRing(24, 13, 9, 17, g.halo, [16, 6, 2]);

  // the figure, on its own layer so we can outline it
  const f = new PixelBuffer(PORTRAIT_W, PORTRAIT_H);
  // lower robe: tall triangle from the waist
  f.triangle(24, 25, 11, 51, 37, 51, g.robe);
  f.triangle(24, 25, 24, 51, 37, 51, g.robeDk);
  // upper body: inverted triangle (shoulders to waist)
  f.triangle(14, 18, 34, 18, 24, 33, g.robe);
  f.triangle(24, 18, 34, 18, 24, 33, g.robeDk);
  hemMeander(f, 13, 35, 46);
  f.hline(11, 50, 27, C.bronze);
  // near arm hangs, forearm bent forward at the hip
  f.rect(14, 19, 2, 9, C.skin);
  f.hline(14, 28, 4, C.skin);
  // head in profile (facing right): hair cap, full face, dot eye, nose
  f.circle(24, 13, 4, C.skin);
  f.halfCircle(24, 10, 5, g.hair);
  f.rect(19, 10, 2, 6, g.hair);
  f.set(26, 12, C.ink);
  f.set(29, 13, C.skin);
  g.draw(f);
  b.blit(f.outlined(C.ink), 0, 0);
  g.front?.(b);
  // frame
  b.frame(0, 0, PORTRAIT_W, PORTRAIT_H, C.ink);
  return b;
}

export const GODS: Record<string, GodSpec> = {
  zeus: {
    halo: C.bronze, bg: C.ink, bgLow: C.darkUmber, robe: C.bone, robeDk: C.boneDk, hair: C.ink,
    draw: (f) => {
      // black-figure beard: an ink wedge under the jaw
      f.triangle(21.5, 16, 29, 16, 24.5, 24, C.ink);
      f.hline(25, 16, 3, C.skin); // lip line stays skin
      // laurel: bronze leaves on the hair
      for (const [x, y] of [[20, 7], [21, 6], [23, 5], [25, 5], [27, 6], [28, 7]] as const) f.set(x, y, C.bronze);
      // raised arm and the thunderbolt, held clear of the halo
      f.rect(33, 19, 2, 2, C.skin);
      f.rect(34, 10, 2, 10, C.skin);
      const bolt = [[39, 1, 2], [38, 2, 2], [37, 3, 2], [36, 4, 5], [38, 5, 2], [37, 6, 2], [36, 7, 2]] as const;
      for (const [x, y, w] of bolt) f.hline(x, y + 1, w, C.goldHi);
      f.set(40, 1, C.bronze).set(36, 9, C.bronze);
    },
    front: (b) => {
      // cloud bank in sand, below the robe hem
      for (const [x, r] of [[4, 5], [14, 6], [34, 6], [44, 5]] as const) b.circle(x, 56, r, C.sand, { half: 'top', shade: C.boneDk, shadeFrom: 2 });
    },
  },
};

export function buildPortrait(god: string): PixelBuffer {
  const g = GODS[god];
  if (!g) throw new Error(`no portrait for ${god}`);
  return drawGodPortrait(g);
}
