/**
 * UI frames, drawn like the bands on a vase: flat terracotta fields bordered
 * by ink rules, meanders and zigzags. No bevels, no gloss, no rounded cards.
 */
import { C, type ColorIndex } from './palette';
import { PixelBuffer, checkerBand, meanderBand, rosetteBand } from './pixels';
import { drawText, measureLine } from './font';

export type PanelStyle = 'clay' | 'ink' | 'cream';

const STYLES: Record<PanelStyle, { fill: ColorIndex; rule: ColorIndex; band: ColorIndex }> = {
  clay: { fill: C.clay, rule: C.ink, band: C.ink },
  ink: { fill: C.ink, rule: C.deepClay, band: C.clay },
  cream: { fill: C.cream, rule: C.ink, band: C.deepClay },
};

/**
 * A vase panel: outer ink line, 1px field gap, inner rule. With `meander`, a
 * running Greek key band sits inside the top and bottom edges.
 */
export function panel(w: number, h: number, style: PanelStyle = 'clay', meander = false): PixelBuffer {
  const s = STYLES[style];
  const b = new PixelBuffer(w, h);
  b.rect(0, 0, w, h, s.fill);
  b.frame(0, 0, w, h, C.ink);
  b.frame(2, 2, w - 4, h - 4, s.rule);
  if (meander && h >= 24) {
    meanderBand(b, 3, 3, w - 6, s.band);
    meanderBand(b, 3, h - 10, w - 6, s.band);
  }
  return b;
}

/** Content inset for a panel (where text can go). */
export function panelInset(meander: boolean): { x: number; top: number; bottom: number } {
  return meander ? { x: 6, top: 13, bottom: 13 } : { x: 5, top: 5, bottom: 5 };
}

export type ButtonState = 'idle' | 'hover' | 'down' | 'disabled';

/**
 * Button: a flat clay tablet with an ink rule. Hover lights the rule gold and
 * adds a gold underline; down shifts the label 1px. Disabled goes dull.
 */
export function button(w: number, h: number, label: string, state: ButtonState = 'idle', key?: string): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const fill = state === 'disabled' ? C.deepClay : state === 'down' ? C.clayLt : C.clay;
  const ink = state === 'disabled' ? C.umber : C.ink;
  b.rect(0, 0, w, h, fill);
  b.frame(0, 0, w, h, C.ink);
  if (state === 'hover' || state === 'down') {
    b.frame(1, 1, w - 2, h - 2, C.goldHi);
  } else {
    b.hline(1, h - 2, w - 2, C.deepClay); // the tablet's lower edge
  }
  const dy = state === 'down' ? 1 : 0;
  const lw = measureLine(label);
  const kw = key ? measureLine(key) + 4 : 0;
  const x = Math.floor((w - lw - kw) / 2);
  const y = Math.floor((h - 7) / 2) + dy;
  drawText(b, label, x, y, ink);
  if (key) {
    // key hint in a small ink box after the label
    const kx = x + lw + 3;
    b.rect(kx, y - 1, kw - 1, 9, state === 'disabled' ? C.umber : C.deepClay);
    drawText(b, key, kx + 2, y, state === 'disabled' ? C.deepClay : C.cream);
  }
  return b;
}

/** Decorative frieze bands for screen borders. */
export function frieze(w: number, kind: 'meander' | 'checker' | 'rosette', fg: ColorIndex = C.ink, bg: ColorIndex = C.clay): PixelBuffer {
  const h = kind === 'meander' ? 7 : kind === 'checker' ? 4 : 3;
  const b = new PixelBuffer(w, h);
  b.rect(0, 0, w, h, bg);
  if (kind === 'meander') meanderBand(b, 0, 0, w, fg);
  else if (kind === 'checker') checkerBand(b, 0, 0, w, 2, 2, fg);
  else rosetteBand(b, 0, 0, w, 6, fg);
  return b;
}
