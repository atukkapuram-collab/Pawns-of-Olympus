import { loadLevel, type LevelData, type LevelUnit } from '../src/core/level';
import { applyAction } from '../src/core/rules';
import type { Action, GameEvent, GameState, Objective, PatronId, TrojanEvent } from '../src/core/types';

/** Build a level from a tiny board. */
export function mkLevel(board: string[], units: LevelUnit[], extra: Partial<LevelData> = {}): LevelData {
  return {
    id: 'test', act: 1, index: 1, title: 'Test', teaches: 'testing',
    board, legend: {}, units,
    objective: { type: 'rout' } as Objective,
    patrons: ['zeus', 'athena', 'poseidon'],
    trojanEvent: null as TrojanEvent | null,
    par: 3,
    solution: { patron: null, turns: [[['endTurn']]] },
    ...extra,
  };
}

export function mkState(board: string[], units: LevelUnit[], extra: Partial<LevelData> = {}, patron: PatronId | null = null): GameState {
  return loadLevel(mkLevel(board, units, extra), patron);
}

/** Apply actions in order; throws on an illegal one. Returns final state and all events. */
export function run(s: GameState, ...actions: Action[]): { s: GameState; ev: GameEvent[] } {
  const ev: GameEvent[] = [];
  for (const a of actions) {
    const r = applyAction(s, a);
    if (r.error) throw new Error(r.error);
    ev.push(...r.events);
    s = r.state;
  }
  return { s, ev };
}

export const end: Action = { type: 'endTurn' };
export const mv = (unit: string, x: number, y: number): Action => ({ type: 'move', unit, x, y });
export const act = (unit: string, ability: 'strike' | 'swap' | 'push', x: number, y: number): Action => ({ type: 'act', unit, ability, x, y });

export function u(s: GameState, id: string) {
  const f = s.units.find((v) => v.id === id);
  if (!f) throw new Error(`no unit ${id}`);
  return f;
}

export const OPEN6 = ['......', '......', '......', '......', '......', '......'];
