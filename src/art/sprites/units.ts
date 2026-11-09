/**
 * Unit sprite recipes. Each unit = a FigureSpec (see figure.ts) or a custom
 * recipe, rendered into frames: idle0, idle1, windup, strike (+ hit flash).
 * Every hero is identifiable by 2–3 features: crest color, shield shape,
 * tunic color.
 */
import { C } from '../palette';
import type { PixelBuffer } from '../pixels';
import { drawFigure, POSES, type FigureSpec, type Pose } from './figure';

const bronze = { metal: C.bronze, metalDk: C.bronzeDk, metalHi: C.goldHi };
const iron = { metal: C.iron, metalDk: C.ironDk, metalHi: C.ironHi };

export const FIGURES: Record<string, FigureSpec> = {
  // Red fan crest, Achaean blue, round shield with a red boss.
  achilles: {
    skin: C.skin, tunic: C.blue, tunicDk: C.blueDk, ...bronze, crest: C.red, emblem: C.red, outline: C.ink,
    headgear: 'crest', shield: 'round', weapon: 'spear',
  },
  // White crest, olive tunic, tall tower shield with an ink rib.
  ajax: {
    skin: C.skin, tunic: C.olive, tunicDk: C.oliveDk, ...bronze, crest: C.bone, emblem: C.ink, outline: C.ink,
    headgear: 'crest', shield: 'tower', weapon: 'spear',
  },
  // Felt pilos cap (umber), sand tunic, small round shield with an ink eye.
  odysseus: {
    skin: C.skin, tunic: C.sand, tunicDk: C.deepClay, metal: C.umber, metalDk: C.darkUmber, metalHi: C.clayLt,
    crest: C.umber, emblem: C.ink, outline: C.ink, headgear: 'pilos', shield: 'round', weapon: 'spear',
  },
  // Bronze crest edged gold, sand tunic? No: red-brown (threat would clash). Deep clay tunic, long spear, boar zigzag shield.
  diomedes: {
    skin: C.skin, tunic: C.deepClay, tunicDk: C.umber, ...bronze, crest: C.goldHi, emblem: C.ink, outline: C.ink,
    headgear: 'crest', shield: 'round', weapon: 'longspear',
  },
  // Achilles' armor, worn by someone else: same colors, darker tunic and crest.
  patroclus: {
    skin: C.skin, tunic: C.blueDk, tunicDk: C.ink, ...bronze, crest: C.red, emblem: C.goldHi, outline: C.ink,
    headgear: 'crest', shield: 'round', weapon: 'spear',
  },
  // ---- Trojans (drawn facing right, mirrored at load) ----
  spearman: {
    skin: C.skin, tunic: C.wine, tunicDk: C.wineDk, ...iron, crest: C.purple, emblem: C.purple, outline: C.ink,
    headgear: 'crest', shield: 'round', weapon: 'spear',
  },
  archer: {
    skin: C.skin, tunic: C.purple, tunicDk: C.wineDk, ...iron, crest: C.wine, emblem: C.wine, outline: C.ink,
    headgear: 'phrygian', shield: 'none', weapon: 'bow',
  },
  shieldbearer: {
    skin: C.skin, tunic: C.wine, tunicDk: C.wineDk, ...iron, crest: C.purple, emblem: C.wineDk, outline: C.ink,
    headgear: 'crest', shield: 'tower', weapon: 'spear',
  },
};

/** Odysseus' shield eye; Diomedes' boar-tusk zigzag. Small, but they make the hero. */
FIGURES.odysseus!.extra = (b: PixelBuffer, oy: number, pose: Pose) => {
  const cx = 6 + (pose === 'strike' ? 1 : 0), cy = 17 + oy;
  b.set(cx - 1, cy, C.bone).set(cx + 1, cy, C.bone);
};
FIGURES.diomedes!.extra = (b: PixelBuffer, oy: number, pose: Pose) => {
  const cx = 6 + (pose === 'strike' ? 1 : 0), cy = 17 + oy;
  b.set(cx - 3, cy - 1, C.ink).set(cx - 2, cy, C.ink).set(cx + 2, cy, C.ink).set(cx + 3, cy - 1, C.ink);
};

export const TROJANS = new Set(['spearman', 'archer', 'shieldbearer', 'chariot', 'hector', 'paris']);

export interface UnitFrames {
  frames: Record<Pose, PixelBuffer>;
}

/** Build all poses for a figure unit, mirrored for Trojans so they face left. */
export function buildFigureFrames(type: string): Record<Pose, PixelBuffer> {
  const spec = FIGURES[type];
  if (!spec) throw new Error(`no figure recipe for ${type}`);
  const out = {} as Record<Pose, PixelBuffer>;
  for (const p of POSES) {
    const f = drawFigure(spec, p);
    out[p] = TROJANS.has(type) ? f.flipped() : f;
  }
  return out;
}
