/**
 * Hints for stuck players (never in the tutorial, never forced, no star cost).
 * After 2 restarts or defeats on a level a small "Need a hint?" button shows.
 * Hints unlock one at a time:
 *   1. a nudge (strings: hint.<level>.1)
 *   2. the key move (hint.<level>.2)
 *   3. the first turn of the recorded solution, played step by step
 */
import { loadLevel, stepToAction, type LevelData } from '../core/level';
import { applyAction } from '../core/rules';
import { unitAt, unitById } from '../core/board';
import type { Action, GameState } from '../core/types';
import { UNITS } from '../data/units';
import { STRINGS, t } from '../data/strings';
import { loadSave, updateSave } from './save';

export const HINT_AFTER = 2;
export const HINT_COUNT = 3;

export function attempts(levelId: string): number {
  return loadSave().attempts[levelId] ?? 0;
}

/** A restart or a defeat on this level. */
export function recordAttempt(levelId: string): number {
  return updateSave((d) => { d.attempts[levelId] = (d.attempts[levelId] ?? 0) + 1; }).attempts[levelId]!;
}

export function hintAvailable(levelId: string, tutorial: boolean): boolean {
  return !tutorial && attempts(levelId) >= HINT_AFTER;
}

/** How many hints the player has opened on this level (0..3). */
export function hintsUnlocked(levelId: string): number {
  return loadSave().hints[levelId] ?? 0;
}

/** Open the next hint; returns the new count. */
export function unlockNextHint(levelId: string): number {
  return updateSave((d) => { d.hints[levelId] = Math.min(HINT_COUNT, (d.hints[levelId] ?? 0) + 1); }).hints[levelId]!;
}

export function hintText(levelId: string, n: 1 | 2): string {
  return STRINGS[`hint.${levelId}.${n}`] ?? '';
}

export interface HintStep {
  action: Action;
  text: string;
  /** Tile to frame on the board (null for End turn). */
  focus: { x: number; y: number } | null;
  /** Hero to select first (moves and acts). */
  hero: string | null;
}

const nameOf = (s: GameState, id: string) => UNITS[unitById(s, id)?.type ?? 'spearman']?.name ?? id;

/** The first turn of the level's recorded solution, described in plain words. */
export function firstTurnSteps(level: LevelData): HintStep[] {
  let s = loadLevel(level, level.solution.patron);
  const out: HintStep[] = [];
  for (const st of level.solution.turns[0] ?? []) {
    const a = stepToAction(st);
    let text: string;
    let focus: HintStep['focus'] = null;
    let hero: string | null = null;
    if (a.type === 'move') {
      text = t('hint.do.move', { hero: nameOf(s, a.unit) });
      focus = { x: a.x, y: a.y };
      hero = a.unit;
    } else if (a.type === 'act') {
      const target = unitAt(s, a.x, a.y);
      text = t(`hint.do.${a.ability}`, { hero: nameOf(s, a.unit), target: (target ? UNITS[target.type].name : 'tile').toLowerCase() });
      focus = { x: a.x, y: a.y };
      hero = a.unit;
    } else if (a.type === 'favor') {
      const here = unitAt(s, a.x, a.y);
      text = t(`hint.do.${a.god}`, { hero: here ? UNITS[here.type].name : '', dir: a.dir ?? '' });
      focus = { x: a.x, y: a.y };
    } else text = t('hint.do.endTurn');
    out.push({ action: a, text, focus, hero });
    const r = applyAction(s, a);
    if (r.error) break;
    s = r.state;
  }
  return out;
}
