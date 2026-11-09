/**
 * Level linter. The key check: a level must not be winnable in a single turn.
 * Bounded depth-first search over every first-turn action sequence (moves,
 * abilities, favor), deduplicated by state. If the budget runs out the result
 * is a warning, not an error.
 */
import { loadLevel, type LevelData } from './level';
import { abilitiesOf, abilityTargets, applyAction, canAct, favorAvailable, moveOptions } from './rules';
import { onBoard } from './board';
import { DIRS, type Action, type GameState, type PatronId } from './types';

export interface LintResult {
  errors: string[];
  warnings: string[];
}

function key(s: GameState): string {
  return JSON.stringify([s.units.map((u) => [u.x, u.y, u.hp, u.alive, u.moved, u.acted, u.mist ? 1 : 0]), s.favorUsed, s.fire]);
}

function playerActions(s: GameState): Action[] {
  const out: Action[] = [];
  for (const u of s.units) {
    if (u.team !== 'greek' || !onBoard(u)) continue;
    for (const k of moveOptions(s, u).keys()) {
      const [x, y] = k.split(',').map(Number) as [number, number];
      out.push({ type: 'move', unit: u.id, x, y });
    }
    if (canAct(s, u)) for (const ab of abilitiesOf(u)) for (const t of abilityTargets(s, u, ab)) out.push({ type: 'act', unit: u.id, ability: ab, ...t });
  }
  if (favorAvailable(s)) {
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        if (s.patron === 'poseidon') {
          if (x === 0 || y === 0) for (const d of DIRS) out.push({ type: 'favor', god: 'poseidon', x, y, dir: d });
        } else out.push({ type: 'favor', god: s.patron!, x, y });
      }
  }
  return out;
}

/** 'yes' | 'no' | 'unknown' (budget exhausted). */
export function winnableInOneTurn(level: LevelData, patron: PatronId | null, budget = 60000): 'yes' | 'no' | 'unknown' {
  const start = loadLevel(level, patron);
  const seen = new Set<string>();
  let nodes = 0;
  const stack: GameState[] = [start];
  while (stack.length) {
    const s = stack.pop()!;
    const k = key(s);
    if (seen.has(k)) continue;
    seen.add(k);
    if (++nodes > budget) return 'unknown';
    const end = applyAction(s, { type: 'endTurn' });
    if (end.state.phase === 'won') return 'yes';
    for (const a of playerActions(s)) {
      const r = applyAction(s, a);
      if (r.error) continue;
      if (r.state.phase === 'won') return 'yes';
      if (r.state.phase === 'player') stack.push(r.state);
    }
  }
  return 'no';
}

export function lintLevel(level: LevelData): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const patrons: Array<PatronId | null> = level.patrons.length ? level.patrons : [null];
  for (const p of patrons) {
    const r = winnableInOneTurn(level, p);
    if (r === 'yes') errors.push(`winnable in a single turn (patron ${p})`);
    if (r === 'unknown') warnings.push(`one-turn check ran out of budget (patron ${p})`);
  }
  if (level.par < 2) errors.push('par must be at least 2');
  const turns = level.solution.turns.length;
  if (level.par - turns > 2) warnings.push(`par ${level.par} is ${level.par - turns} turns over the recorded solution`);
  return { errors, warnings };
}
