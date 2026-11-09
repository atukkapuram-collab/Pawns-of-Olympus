/**
 * The master palette: 32 colors. Every pixel the game draws comes from here.
 * The first 18 are the reference-mockup colors; the rest are shades and the few
 * extra hues the cast needs. Sprites store palette INDICES, so an off-palette
 * color is impossible by construction (and a unit test checks it anyway).
 */
export const PALETTE_HEX = [
  // --- the 18 reference colors ---
  '#f7e3bd', // 0  cream      sky, paper, highlights on clay
  '#efc08a', // 1  sand       light ground, panel fill
  '#f08a4b', // 2  sun        sun disc, Apollo, red-figure night figures
  '#d29a5e', // 3  clay       board tile base
  '#b5783f', // 4  deepClay   tile shadow, borders
  '#7a4a20', // 5  umber      wood, mid-dark lines
  '#2a1a10', // 6  ink        outlines, black-figure silhouettes
  '#e0a83a', // 7  bronze     armor, Zeus, selection
  '#ffe9a0', // 8  goldHi     metal highlights, UI focus
  '#d8342c', // 9  red        Achilles' crest, danger, Ares
  '#3a62c0', // 10 blue       Achaean tunic
  '#3f8a5a', // 11 olive      Ajax tunic, plants
  '#6b9480', // 12 sage       hills
  '#8a2a3a', // 13 wine       Trojan tunic
  '#7a3a9a', // 14 purple     Trojan crest
  '#9aa4b0', // 15 iron       Trojan metal
  '#f0b888', // 16 skin
  '#c45a3c', // 17 threat     threatened tiles
  // --- shades and extra hues ---
  '#4a2a14', // 18 darkUmber  feet, deep shadow, night ground
  '#b07a22', // 19 bronzeDk   bronze shadow
  '#2c4a96', // 20 blueDk
  '#2e6a44', // 21 oliveDk
  '#6a1e2c', // 22 wineDk
  '#6e7884', // 23 ironDk
  '#dfe6ee', // 24 ironHi     iron highlight, Athena
  '#f4efe0', // 25 bone       white crests, robes, foam
  '#cfc6b0', // 26 boneDk
  '#1f7a8a', // 27 sea        water, Poseidon
  '#165c68', // 28 seaDk
  '#e88aa8', // 29 rose       Aphrodite
  '#5a3a2a', // 30 nightClay  night tiles, gates
  '#d9a066', // 31 clayLt     alternate tile, chips
] as const;

export const C = {
  cream: 0, sand: 1, sun: 2, clay: 3, deepClay: 4, umber: 5, ink: 6, bronze: 7, goldHi: 8,
  red: 9, blue: 10, olive: 11, sage: 12, wine: 13, purple: 14, iron: 15, skin: 16, threat: 17,
  darkUmber: 18, bronzeDk: 19, blueDk: 20, oliveDk: 21, wineDk: 22, ironDk: 23, ironHi: 24,
  bone: 25, boneDk: 26, sea: 27, seaDk: 28, rose: 29, nightClay: 30, clayLt: 31,
} as const;

export type ColorName = keyof typeof C;
export type ColorIndex = number;
/** Index used for transparent pixels in a PixelBuffer. */
export const CLEAR = 255;

export const PALETTE_RGB: ReadonlyArray<readonly [number, number, number]> = PALETTE_HEX.map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
});

/** 0xRRGGBB number, for Phaser tints/fills. */
export function hexNum(i: ColorIndex): number {
  return parseInt(PALETTE_HEX[i]!.slice(1), 16);
}
export function hexStr(i: ColorIndex): string {
  return PALETTE_HEX[i]!;
}

/**
 * Red-figure night remap: figures become orange-on-near-black, as on red-figure
 * pottery. Applied to whole textures via paletteSwap; uses only palette colors.
 */
export const NIGHT_REMAP: Partial<Record<number, number>> = {
  [C.cream]: C.darkUmber,
  [C.sand]: C.nightClay,
  [C.clay]: C.nightClay,
  [C.clayLt]: C.nightClay,
  [C.deepClay]: C.darkUmber,
  [C.sage]: C.darkUmber,
  [C.skin]: C.sun,
  [C.bone]: C.sand,
  [C.boneDk]: C.deepClay,
};

/** Cream flash used for hit frames. Everything opaque becomes cream except outlines. */
export function flashMap(): Partial<Record<number, number>> {
  const m: Partial<Record<number, number>> = {};
  for (let i = 0; i < PALETTE_HEX.length; i++) if (i !== C.ink) m[i] = C.cream;
  return m;
}
