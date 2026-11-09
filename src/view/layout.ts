/**
 * Screen layout constants for the 320x180 battle screen. Pure numbers so the
 * gallery, the renderer and tests agree. Every value is a whole pixel.
 */
import { TILE_PITCH_Y, TILE_W } from '../art/sprites/tiles';

export const SCREEN_W = 320;
export const SCREEN_H = 180;

/** Right-hand HUD column. */
export const HUD_X = 216;
export const HUD_W = SCREEN_W - HUD_X - 2;

/** Area the board is centred in. */
export const BOARD_AREA = { x: 4, y: 44, w: HUD_X - 8, h: SCREEN_H - 44 - 6 };

export interface BoardLayout {
  ox: number;
  oy: number;
  cols: number;
  rows: number;
}

export function boardLayout(cols: number, rows: number): BoardLayout {
  const w = cols * TILE_W;
  const h = rows * TILE_PITCH_Y + 14; // + lip + plinth
  const ox = BOARD_AREA.x + Math.floor((BOARD_AREA.w - w) / 2);
  const oy = BOARD_AREA.y + Math.max(0, Math.floor((BOARD_AREA.h - h) / 2)) + 4;
  return { ox, oy, cols, rows };
}

/** Top-left pixel of a tile's top face. */
export function tileOrigin(l: BoardLayout, x: number, y: number): { px: number; py: number } {
  return { px: l.ox + x * TILE_W, py: l.oy + y * TILE_PITCH_Y };
}

/** Where a unit's 24x32 sprite is drawn so its feet stand on the tile. */
export function unitOrigin(l: BoardLayout, x: number, y: number): { px: number; py: number } {
  const t = tileOrigin(l, x, y);
  return { px: t.px, py: t.py + 13 - 31 };
}
