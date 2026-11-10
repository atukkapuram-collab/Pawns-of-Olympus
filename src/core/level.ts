/** Level data format, schema validation and loading into a GameState. */
import { UNITS } from '../data/units';
import { DIRS, type Action, type Dir, type GameState, type Objective, type PatronId, type TileKind, type TrojanEvent, type Unit, type UnitType } from './types';

export type LegendValue = TileKind | 'ship' | 'fire';

export interface LevelUnit {
  type: UnitType;
  x: number;
  y: number;
  facing?: Dir;
}

/** Solution action in JSON tuple form. */
export type SolutionStep =
  | ['move', string, number, number]
  | ['act', string, 'strike' | 'swap' | 'push', number, number]
  | ['favor', PatronId, number, number]
  | ['favor', PatronId, number, number, Dir]
  | ['endTurn'];

export interface LevelData {
  id: string;
  act: number;
  index: number;
  title: string;
  teaches: string;
  board: string[];
  legend: Record<string, LegendValue>;
  units: LevelUnit[];
  objective: Objective;
  patrons: PatronId[];
  trojanEvent: TrojanEvent | null;
  par: number;
  maxTurns?: number;
  backdrop?: 'beach' | 'plain' | 'walls' | 'night';
  intro?: string;
  outro?: string;
  solution: { patron: PatronId | null; turns: SolutionStep[][] };
}

export const STANDARD_LEGEND: Record<string, LegendValue> = {
  '.': 'ground', ',': 'sand', '#': 'rock', '~': 'water', 'S': 'ship', '^': 'fire', '%': 'brush', 'G': 'gate', '*': 'light',
};
const TILE_KINDS = new Set<LegendValue>(['ground', 'sand', 'rock', 'water', 'brush', 'gate', 'light', 'ship', 'fire']);
const PATRONS = new Set<PatronId>(['zeus', 'athena', 'poseidon']);

/** Schema check. Returns a list of problems (empty = valid). */
export function validateLevelSchema(l: LevelData): string[] {
  const e: string[] = [];
  const req = <K extends keyof LevelData>(k: K, type: string) => {
    if (typeof l[k] !== type) e.push(`${String(k)} must be ${type}`);
  };
  req('id', 'string'); req('act', 'number'); req('index', 'number'); req('title', 'string'); req('teaches', 'string'); req('par', 'number');
  if (!Array.isArray(l.board) || l.board.length === 0) { e.push('board must be a non-empty string array'); return e; }
  const w = l.board[0]!.length;
  if (l.board.some((r) => typeof r !== 'string' || r.length !== w)) e.push('board rows must all be strings of equal length');
  if (w < 4 || w > 8 || l.board.length < 4 || l.board.length > 7) e.push(`board size ${w}x${l.board.length} outside 4..8 wide x 4..7 tall (screen limit)`);
  const legend = { ...STANDARD_LEGEND, ...(l.legend ?? {}) };
  for (const v of Object.values(l.legend ?? {})) if (!TILE_KINDS.has(v)) e.push(`unknown legend value "${v}"`);
  for (const row of l.board) for (const ch of row) if (!legend[ch]) e.push(`board char "${ch}" not in legend`);
  const seen = new Set<string>();
  const heroes = new Set<string>();
  for (const u of l.units ?? []) {
    if (!UNITS[u.type]) { e.push(`unknown unit type ${u.type}`); continue; }
    const ch = l.board[u.y]?.[u.x];
    if (ch === undefined) { e.push(`${u.type} at ${u.x},${u.y} is off the board`); continue; }
    const kind = legend[ch];
    if (kind === 'rock' || kind === 'water' || kind === 'ship') e.push(`${u.type} at ${u.x},${u.y} stands on ${kind}`);
    const k = `${u.x},${u.y}`;
    if (seen.has(k)) e.push(`two units at ${k}`);
    seen.add(k);
    if (UNITS[u.type].team === 'greek') {
      if (heroes.has(u.type)) e.push(`hero ${u.type} appears twice`);
      heroes.add(u.type);
    }
    if (UNITS[u.type].team === 'trojan' && (!u.facing || !DIRS.includes(u.facing))) e.push(`${u.type} at ${k} needs a facing`);
  }
  if (heroes.size === 0) e.push('level has no heroes');
  if (!Array.isArray(l.patrons) || l.patrons.some((p) => !PATRONS.has(p))) e.push('patrons must be a list of zeus/athena/poseidon');
  const o = l.objective as Objective | undefined;
  if (!o || !['rout', 'survive', 'protect', 'escort', 'stealth'].includes(o.type)) e.push('objective.type invalid');
  if (o?.type === 'escort' && !heroes.has(o.unit)) e.push('escort unit is not in the level');
  if (o?.type === 'protect' && !l.board.some((r) => [...r].some((c) => legend[c] === 'ship'))) e.push('protect level has no ships');
  if (o?.type === 'stealth' && !l.board.some((r) => [...r].some((c) => legend[c] === 'gate'))) e.push('stealth level has no gate');
  if (!l.solution || !Array.isArray(l.solution.turns) || l.solution.turns.length === 0) e.push('solution.turns missing');
  if (l.solution?.patron && !l.patrons.includes(l.solution.patron)) e.push('solution patron not offered by the level');
  return e;
}

export function loadLevel(l: LevelData, patron: PatronId | null): GameState {
  const legend = { ...STANDARD_LEGEND, ...(l.legend ?? {}) };
  const height = l.board.length, width = l.board[0]!.length;
  const tiles: TileKind[] = [];
  const fire: boolean[] = [];
  const units: Unit[] = [];
  const counters: Record<string, number> = {};
  const mk = (type: UnitType, x: number, y: number, facing: Dir): Unit => {
    const stats = UNITS[type];
    counters[type] = (counters[type] ?? 0) + 1;
    const id = stats.team === 'greek' ? type : `${type}-${counters[type]}`;
    const unit: Unit = { id, type, team: stats.team, x, y, hp: stats.hp, maxHp: stats.hp, facing, alive: true, moved: false, acted: false, intent: null };
    if (stats.intent) unit.intent = { kind: stats.intent, dir: facing };
    return unit;
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = legend[l.board[y]![x]!]!;
      if (v === 'ship') { tiles.push('ground'); fire.push(false); units.push(mk('ship', x, y, 'up')); }
      else if (v === 'fire') { tiles.push('ground'); fire.push(true); }
      else { tiles.push(v); fire.push(false); }
    }
  // heroes first (stable ids), then Trojans in listed order (that's their act order)
  for (const u of l.units) if (UNITS[u.type].team === 'greek') units.push(mk(u.type, u.x, u.y, u.facing ?? 'right'));
  for (const u of l.units) if (UNITS[u.type].team === 'trojan') units.push(mk(u.type, u.x, u.y, u.facing ?? 'left'));

  const te = l.trojanEvent;
  const state: GameState = {
    levelId: l.id, width, height, tiles, fire, units, turn: 1, phase: 'player',
    patron, favorUsed: false, objective: l.objective, trojanEvent: te ?? null,
    plague: [], ares: !!te?.ares?.turns.includes(1), aphroditeUsed: false,
    par: l.par, maxTurns: l.maxTurns ?? l.par + 4, fallen: [], loseReason: null, turnsUsed: 0,
  };
  if (te?.apollo && te.apollo.from === 1) {
    state.plague = units.filter((u) => u.team === 'greek').map((u) => u.y * width + u.x);
  }
  return state;
}

export function stepToAction(st: SolutionStep): Action {
  switch (st[0]) {
    case 'move': return { type: 'move', unit: st[1], x: st[2], y: st[3] };
    case 'act': return { type: 'act', unit: st[1], ability: st[2], x: st[3], y: st[4] };
    case 'favor': return { type: 'favor', god: st[1], x: st[2], y: st[3], dir: st[4] };
    case 'endTurn': return { type: 'endTurn' };
  }
}
