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

export function drawGodPortrait(g: GodSpec, bare = false): PixelBuffer {
  const b = new PixelBuffer(PORTRAIT_W, PORTRAIT_H);
  if (!bare) {
    // panel background: flat field with a dithered lower band (never a gradient)
    b.rect(0, 0, PORTRAIT_W, PORTRAIT_H, g.bg);
    b.ditherFill(0, 30, PORTRAIT_W, 6, g.bgLow, 4);
    b.ditherFill(0, 36, PORTRAIT_W, 6, g.bgLow, 10);
    b.rect(0, 42, PORTRAIT_W, 14, g.bgLow);
  }
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
  if (bare) return b;
  g.front?.(b);
  // frame
  b.frame(0, 0, PORTRAIT_W, PORTRAIT_H, C.ink);
  return b;
}

/**
 * Battle manifestation: the god as a black-figure silhouette (ink body, the
 * halo ring kept in the god's own color), to rise behind the board.
 */
export function godSilhouette(god: string): PixelBuffer {
  const g = GODS[god];
  if (!g) throw new Error(`no god ${god}`);
  const fig = drawGodPortrait(g, true);
  const out = new PixelBuffer(fig.w, fig.h);
  for (let y = 0; y < fig.h; y++)
    for (let x = 0; x < fig.w; x++) {
      const c = fig.get(x, y);
      if (c === 255) continue;
      out.set(x, y, c === g.halo ? g.halo : c === C.bronze || c === C.goldHi ? C.bronze : C.ink);
    }
  return out;
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
  // Athena: crested helmet, spear, the round aegis with an ink Gorgon face. Greek side.
  athena: {
    halo: C.ironHi, bg: C.ink, bgLow: C.darkUmber, robe: C.bone, robeDk: C.boneDk, hair: C.ink,
    draw: (f) => {
      f.halfCircle(24, 10, 5, C.bronze, C.bronzeDk);
      f.halfCircle(24, 5, 4, C.ironHi); // crest
      f.vline(19, 10, 4, C.bronze); // cheek guard
      f.rect(33, 19, 2, 3, C.skin);
      f.vline(36, 2, 48, C.bronzeDk); // spear
      f.set(36, 1, C.bronze).hline(35, 2, 3, C.bronze).hline(35, 3, 3, C.bronze).set(36, 4, C.bronze);
      f.rect(34, 20, 3, 2, C.skin);
      // aegis: bronze disc on the near arm with a Gorgon face
      f.circle(14, 31, 6, C.bronze, { shade: C.bronzeDk, shadeFrom: 2 });
      // snakes fringe the rim; a small ink Gorgoneion at the centre
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) f.set(Math.round(14 + Math.cos(a) * 6), Math.round(31 + Math.sin(a) * 6), C.ink);
      f.rect(13, 30, 3, 3, C.ink);
      f.set(14, 31, C.bronze);
    },
  },
  // Poseidon: trident, sea-green robe, a breaking wave across the bottom. Greek side.
  poseidon: {
    halo: C.sea, bg: C.ink, bgLow: C.seaDk, robe: C.sea, robeDk: C.seaDk, hair: C.ink,
    draw: (f) => {
      f.triangle(21.5, 16, 29, 16, 24.5, 25, C.ink); // beard
      f.hline(25, 16, 3, C.skin);
      f.rect(33, 19, 2, 2, C.skin);
      f.vline(37, 6, 44, C.bronze); // trident shaft
      f.hline(34, 8, 7, C.bronze);
      for (const x of [34, 37, 40]) { f.vline(x, 2, 6, C.bronze); f.set(x, 1, C.bronze); }
      f.rect(35, 20, 3, 2, C.skin);
    },
    front: (b) => {
      for (let x = -4; x < 52; x += 8) {
        b.triangle(x, 56, x + 4, 46, x + 8, 56, C.sea);
        b.triangle(x + 4, 56, x + 4, 46, x + 8, 56, C.seaDk);
        b.hline(x + 3, 46, 2, C.bone);
      }
    },
  },
  // Apollo: the silver-bow god before a flat sun disc. Trojan side.
  apollo: {
    halo: C.sun, bg: C.wineDk, bgLow: C.ink, robe: C.bronze, robeDk: C.bronzeDk, hair: C.goldHi,
    draw: (f) => {
      f.rect(19, 10, 2, 8, C.goldHi); // long hair
      f.rect(33, 19, 3, 2, C.skin);
      // bow: an arc held out front, string in skin-light
      for (let a = -1.2; a <= 1.2; a += 0.06) f.set(Math.round(37 + Math.cos(a) * 3), Math.round(28 + Math.sin(a) * 11), C.bronzeDk);
      f.vline(37, 17, 23, C.goldHi);
      f.hline(30, 28, 7, C.goldHi); // arrow nocked
    },
  },
  // Ares: crested iron helmet, bronze breastplate, spear. Trojan side.
  ares: {
    halo: C.red, bg: C.wineDk, bgLow: C.ink, robe: C.wine, robeDk: C.wineDk, hair: C.ink,
    draw: (f) => {
      f.halfCircle(24, 10, 5, C.iron, C.ironDk);
      f.halfCircle(24, 5, 5, C.red); // crest
      f.vline(19, 10, 5, C.iron).vline(29, 10, 3, C.iron);
      f.triangle(17, 19, 31, 19, 24, 29, C.iron); // breastplate
      f.triangle(24, 19, 31, 19, 24, 29, C.ironDk);
      f.rect(33, 19, 2, 3, C.skin);
      f.vline(37, 3, 47, C.ironDk);
      f.set(37, 1, C.iron).hline(36, 2, 3, C.iron).hline(36, 3, 3, C.iron);
      f.rect(35, 20, 3, 2, C.skin);
    },
  },
  // Aphrodite: golden hair, rose robe, a white dove on her hand. Trojan side.
  aphrodite: {
    halo: C.rose, bg: C.wineDk, bgLow: C.ink, robe: C.rose, robeDk: C.wine, hair: C.goldHi,
    draw: (f) => {
      f.rect(19, 10, 2, 10, C.goldHi);
      f.rect(28, 10, 2, 3, C.goldHi);
      f.rect(33, 19, 4, 2, C.skin);
      // dove
      f.rect(36, 15, 5, 3, C.bone);
      f.triangle(37, 15, 40, 15, 39, 11, C.bone);
      f.set(41, 15, C.bone).set(40, 16, C.ink);
    },
  },
};

export function buildPortrait(god: string): PixelBuffer {
  const g = GODS[god];
  if (!g) throw new Error(`no portrait for ${god}`);
  return drawGodPortrait(g);
}
