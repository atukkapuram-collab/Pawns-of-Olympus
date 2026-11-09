/** Replays a level's recorded solution. Used by the validator, tests and e2e. */
import { loadLevel, stepToAction, validateLevelSchema, type LevelData } from './level';
import { applyAction, kleos } from './rules';
import type { GameState } from './types';

export interface ReplayResult {
  ok: boolean;
  state: GameState;
  stars: [boolean, boolean, boolean];
  errors: string[];
  turnsUsed: number;
}

export function replaySolution(level: LevelData): ReplayResult {
  const errors = validateLevelSchema(level);
  if (errors.length) {
    const s = loadLevel(level, null);
    return { ok: false, state: s, stars: [false, false, false], errors, turnsUsed: 0 };
  }
  let s = loadLevel(level, level.solution.patron);
  level.solution.turns.forEach((turn, ti) => {
    for (const st of turn) {
      if (s.phase === 'won' || s.phase === 'lost') {
        if (s.phase === 'lost') return;
        errors.push(`turn ${ti + 1}: action ${JSON.stringify(st)} after the level was already won`);
        return;
      }
      const r = applyAction(s, stepToAction(st));
      if (r.error) {
        errors.push(`turn ${ti + 1}: ${JSON.stringify(st)}: ${r.error}`);
        return;
      }
      s = r.state;
    }
  });
  if (s.phase === 'lost') errors.push(`solution loses (${s.loseReason}) on turn ${s.turn}`);
  else if (s.phase !== 'won') errors.push(`solution does not win (still turn ${s.turn}, phase ${s.phase})`);
  else if (s.turnsUsed > level.par) errors.push(`solution wins in ${s.turnsUsed} turns, over par ${level.par}`);
  return { ok: errors.length === 0, state: s, stars: kleos(s), errors, turnsUsed: s.turnsUsed };
}
