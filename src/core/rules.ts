/**
 * The rules: legal-move queries and applyAction (pure: clones its input).
 * See docs/GDD.md for the authoritative description.
 */
import { SWAP_RANGE, UNITS } from '../data/units';
import { cloneState, heroes, idx, inBounds, lineDir, onBoard, reachable, ships, step, tileAt, trojans, unitAt, unitById } from './board';
import { hurt, push, resolveIntent, sheltered, traceAttack } from './combat';
import { repositionAll } from './ai';
import { DIRS, DV, type Ability, type Action, type ApplyResult, type Dir, type GameEvent, type GameState, type Unit } from './types';

// ---------------------------------------------------------------------------
// Queries (used by the UI and the validator)
// ---------------------------------------------------------------------------

export function canMove(s: GameState, u: Unit): boolean {
  return s.phase === 'player' && u.team === 'greek' && onBoard(u) && !u.moved && !u.acted;
}

export function canAct(s: GameState, u: Unit): boolean {
  return s.phase === 'player' && u.team === 'greek' && onBoard(u) && !u.acted;
}

export function moveOptions(s: GameState, u: Unit): Map<string, Array<{ x: number; y: number }>> {
  if (!canMove(s, u)) return new Map();
  return reachable(s, u.x, u.y, UNITS[u.type].move);
}

export function abilitiesOf(u: Unit): Ability[] {
  return UNITS[u.type].abilities ?? [];
}

/** Valid target tiles for an ability. */
export function abilityTargets(s: GameState, u: Unit, ability: Ability): Array<{ x: number; y: number }> {
  if (!canAct(s, u) || !abilitiesOf(u).includes(ability)) return [];
  const out: Array<{ x: number; y: number }> = [];
  if (ability === 'strike' || ability === 'push') {
    for (const d of DIRS) {
      const t = step(u.x, u.y, d);
      const v = unitAt(s, t.x, t.y);
      if (!v) continue;
      if (ability === 'strike' && v.team === 'trojan') out.push(t);
      if (ability === 'push' && v.team !== 'object') out.push(t);
    }
  } else if (ability === 'swap') {
    for (const d of DIRS) {
      for (let n = 1; n <= SWAP_RANGE; n++) {
        const t = step(u.x, u.y, d, n);
        if (!inBounds(s, t.x, t.y)) break;
        const v = unitAt(s, t.x, t.y);
        if (v && v.team !== 'object') out.push(t);
      }
    }
  }
  return out;
}

/** Trojans with a pending intent, in the order they will act (badge numbers 1, 2, 3…). */
export function intentOrder(s: GameState): Unit[] {
  return s.units.filter((u) => u.team === 'trojan' && onBoard(u) && u.intent !== null);
}

/** Every tile a pending Trojan intent will hit (the red tiles), in act order. */
export function threatTiles(s: GameState): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const e of intentOrder(s)) for (const h of traceAttack(s, e, e.intent!, e).hits) out.push({ x: h.x, y: h.y });
  return out;
}

export function favorAvailable(s: GameState): boolean {
  return s.phase === 'player' && s.patron !== null && !s.favorUsed;
}

// ---------------------------------------------------------------------------
// applyAction
// ---------------------------------------------------------------------------

function fail(state: GameState, error: string): ApplyResult {
  return { state, events: [], error };
}

export function applyAction(input: GameState, action: Action): ApplyResult {
  if (input.phase !== 'player') return fail(input, `not the player phase (${input.phase})`);
  const s = cloneState(input);
  const ev: GameEvent[] = [];

  switch (action.type) {
    case 'move': {
      const u = unitById(s, action.unit);
      if (!u || !canMove(s, u)) return fail(input, `${action.unit} cannot move`);
      const path = moveOptions(s, u).get(`${action.x},${action.y}`);
      if (!path) return fail(input, `${action.unit} cannot reach ${action.x},${action.y}`);
      u.x = action.x;
      u.y = action.y;
      u.moved = true;
      ev.push({ t: 'move', unit: u.id, path });
      break;
    }
    case 'act': {
      const u = unitById(s, action.unit);
      if (!u || !canAct(s, u)) return fail(input, `${action.unit} cannot act`);
      const ok = abilityTargets(s, u, action.ability).some((t) => t.x === action.x && t.y === action.y);
      if (!ok) return fail(input, `${action.unit} cannot ${action.ability} at ${action.x},${action.y}`);
      const target = unitAt(s, action.x, action.y)!;
      u.acted = true;
      u.moved = true; // acting ends the hero's movement
      if (action.ability === 'strike') {
        const dir = lineDir(u.x, u.y, target.x, target.y)!;
        ev.push({ t: 'strike', unit: u.id, target: target.id, dir });
        u.facing = dir;
        hurt(s, target, UNITS[u.type].damage, 'melee', dir, ev);
      } else if (action.ability === 'push') {
        const dir = lineDir(u.x, u.y, target.x, target.y)!;
        ev.push({ t: 'strike', unit: u.id, target: target.id, dir });
        u.facing = dir;
        if (target.team === 'trojan') hurt(s, target, UNITS[u.type].damage, 'melee', dir, ev);
        if (onBoard(target)) push(s, target, dir, ev);
      } else {
        const from = { x: u.x, y: u.y }, to = { x: target.x, y: target.y };
        u.x = to.x; u.y = to.y;
        target.x = from.x; target.y = from.y;
        ev.push({ t: 'swap', unit: u.id, target: target.id, from, to });
      }
      break;
    }
    case 'favor': {
      if (!favorAvailable(s) || s.patron !== action.god) return fail(input, `favor ${action.god} not available`);
      if (!inBounds(s, action.x, action.y)) return fail(input, 'favor target out of bounds');
      if (action.god === 'zeus') {
        ev.push({ t: 'favor', god: 'zeus', x: action.x, y: action.y });
        const v = unitAt(s, action.x, action.y);
        if (v) hurt(s, v, 2, 'divine', null, ev);
      } else if (action.god === 'athena') {
        const v = unitAt(s, action.x, action.y);
        if (!v || v.team !== 'greek' || !v.acted) return fail(input, 'Athena needs a hero who has acted');
        v.acted = false;
        ev.push({ t: 'favor', god: 'athena', x: action.x, y: action.y });
      } else {
        const dir = action.dir;
        if (!dir) return fail(input, 'Poseidon needs a direction');
        ev.push({ t: 'favor', god: 'poseidon', x: action.x, y: action.y, dir });
        poseidonWave(s, action.x, action.y, dir, ev);
      }
      s.favorUsed = true;
      break;
    }
    case 'endTurn':
      endTurn(s, ev);
      return { state: s, events: ev };
  }

  checkImmediate(s, ev);
  return { state: s, events: ev };
}

/** Wave along the row (horizontal dir) or column (vertical dir) through (x, y). */
export function poseidonWave(s: GameState, x: number, y: number, dir: Dir, ev: GameEvent[]): void {
  const horizontal = dir === 'left' || dir === 'right';
  const inLine = s.units.filter((u) => onBoard(u) && u.team !== 'object' && (horizontal ? u.y === y : u.x === x));
  // leading end first
  const key = (u: Unit) => (horizontal ? u.x : u.y) * (DV[dir].dx + DV[dir].dy);
  inLine.sort((a, b) => key(b) - key(a));
  for (const u of inLine) push(s, u, dir, ev);
  const out: Array<{ x: number; y: number }> = [];
  const n = horizontal ? s.width : s.height;
  for (let i = 0; i < n; i++) {
    const tx = horizontal ? i : x, ty = horizontal ? y : i;
    const k = idx(s, tx, ty);
    if (s.fire[k]) { s.fire[k] = false; out.push({ x: tx, y: ty }); }
  }
  if (out.length) ev.push({ t: 'fireOut', tiles: out });
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/** Sentries (all Trojans) see along their facing up to 3 tiles in stealth levels. */
function seenBy(s: GameState, h: Unit): Unit | null | false {
  if (tileAt(s, h.x, h.y) === 'light') return null;
  for (const t of trojans(s)) {
    let p = { x: t.x, y: t.y };
    for (let n = 0; n < 3; n++) {
      p = step(p.x, p.y, t.facing);
      if (!inBounds(s, p.x, p.y) || tileAt(s, p.x, p.y) === 'rock') break;
      if (p.x === h.x && p.y === h.y) return t;
      if (unitAt(s, p.x, p.y)) break;
    }
  }
  return false;
}

function endTurn(s: GameState, ev: GameEvent[]): void {
  // Stealth: being seen at the end of your phase loses immediately.
  if (s.objective.type === 'stealth') {
    for (const h of heroes(s)) {
      const by = seenBy(s, h);
      if (by !== false) {
        ev.push({ t: 'seen', unit: h.id, by: by ? by.id : null });
        lose(s, 'seen', ev);
        return;
      }
    }
  }

  s.phase = 'enemy';
  ev.push({ t: 'phase', phase: 'enemy', turn: s.turn });

  // 1. intents resolve in number order
  if (s.ares) ev.push({ t: 'god', god: 'ares', what: 'rage' });
  const queue = intentOrder(s);
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i]!;
    if (onBoard(u) && u.intent) resolveIntent(s, u, i + 1, ev);
    if (checkLoss(s, ev)) return;
  }

  // 2. hazards
  spreadFire(s, ev);
  if (checkLoss(s, ev)) return;
  if (s.plague.length) {
    const tiles = s.plague.map((k) => ({ x: k % s.width, y: Math.floor(k / s.width) }));
    ev.push({ t: 'plague', tiles });
    for (const t of tiles) {
      const v = unitAt(s, t.x, t.y);
      if (!v) continue;
      if (sheltered(s, v, 'down')) { ev.push({ t: 'blocked', unit: v.id, reason: 'shelter' }); continue; }
      hurt(s, v, 1, 'arrow', 'down', ev);
    }
    s.plague = [];
    if (checkLoss(s, ev)) return;
  }

  // 3. the turn ends
  const finished = s.turn;
  s.turn += 1;

  // win by surviving / protecting / routing during the enemy phase
  const o = s.objective;
  if (o.type === 'rout' && trojans(s).length === 0 && !s.units.some((u) => u.mist)) return win(s, ev, finished);
  if ((o.type === 'survive' || o.type === 'protect') && finished >= o.turns) return win(s, ev, finished);
  if (finished >= s.maxTurns) return lose(s, 'time', ev);

  // 4. telegraph: Aphrodite returns, Trojans reposition, gods mark
  for (const u of s.units) {
    if (u.mist && u.mist.returnTurn <= s.turn) {
      let spot = { x: u.mist.x, y: u.mist.y };
      if (unitAt(s, spot.x, spot.y)) {
        const free = nearestFree(s, spot.x, spot.y);
        if (free) spot = free;
      }
      u.x = spot.x; u.y = spot.y;
      u.hp = u.maxHp;
      u.mist = undefined;
      ev.push({ t: 'return', unit: u.id, x: u.x, y: u.y });
      ev.push({ t: 'god', god: 'aphrodite', what: 'return' });
    }
  }
  repositionAll(s, ev);
  const te = s.trojanEvent;
  s.ares = !!te?.ares?.turns.includes(s.turn);
  if (s.ares) ev.push({ t: 'god', god: 'ares', what: 'rage' });
  if (te?.apollo && s.turn >= te.apollo.from && (s.turn - te.apollo.from) % te.apollo.every === 0) {
    s.plague = heroes(s).map((h) => idx(s, h.x, h.y));
    if (s.plague.length) ev.push({ t: 'god', god: 'apollo', what: 'mark' });
  }

  for (const h of s.units) if (h.team === 'greek') { h.moved = false; h.acted = false; }
  s.phase = 'player';
  ev.push({ t: 'phase', phase: 'player', turn: s.turn });
}

function nearestFree(s: GameState, x: number, y: number): { x: number; y: number } | null {
  for (let r = 1; r < Math.max(s.width, s.height); r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const nx = x + dx, ny = y + dy;
        const t = tileAt(s, nx, ny);
        if (t && t !== 'rock' && t !== 'water' && !unitAt(s, nx, ny)) return { x: nx, y: ny };
      }
  return null;
}

/** Fire spreads into adjacent brush; a unit on brush stops it (and takes 1). Then fire burns. */
function spreadFire(s: GameState, ev: GameEvent[]): void {
  if (!s.fire.some(Boolean)) return;
  const burning: number[] = [];
  s.fire.forEach((f, k) => { if (f) burning.push(k); });
  const spread: Array<{ x: number; y: number }> = [];
  const stoppedBy = new Set<string>();
  for (const k of burning) {
    const x = k % s.width, y = Math.floor(k / s.width);
    for (const d of DIRS) {
      const n = step(x, y, d);
      if (!inBounds(s, n.x, n.y)) continue;
      const nk = idx(s, n.x, n.y);
      if (s.fire[nk] || s.tiles[nk] !== 'brush') continue;
      const v = unitAt(s, n.x, n.y);
      if (v) { stoppedBy.add(v.id); continue; }
      if (!spread.some((p) => p.x === n.x && p.y === n.y)) spread.push(n);
    }
  }
  for (const p of spread) s.fire[idx(s, p.x, p.y)] = true;
  if (spread.length) ev.push({ t: 'fireSpread', tiles: spread });
  for (const id of stoppedBy) {
    const v = unitById(s, id)!;
    hurt(s, v, 1, 'fire', null, ev);
  }
  // units standing in fire burn
  for (const u of [...s.units]) {
    if (!onBoard(u) || u.team === 'object' || stoppedBy.has(u.id)) continue;
    if (s.fire[idx(s, u.x, u.y)]) hurt(s, u, 1, 'fire', null, ev);
  }
  // ships next to fire burn
  for (const sh of ships(s)) {
    if (!onBoard(sh)) continue;
    if (DIRS.some((d) => { const n = step(sh.x, sh.y, d); return inBounds(s, n.x, n.y) && s.fire[idx(s, n.x, n.y)]; })) {
      hurt(s, sh, 1, 'fire', null, ev);
    }
  }
}

// ---------------------------------------------------------------------------
// Win / lose
// ---------------------------------------------------------------------------

function win(s: GameState, ev: GameEvent[], turnsUsed: number): void {
  if (s.phase === 'won' || s.phase === 'lost') return;
  s.phase = 'won';
  s.turnsUsed = turnsUsed;
  ev.push({ t: 'won' });
}

function lose(s: GameState, reason: GameState['loseReason'] & string, ev: GameEvent[]): void {
  if (s.phase === 'won' || s.phase === 'lost') return;
  s.phase = 'lost';
  s.loseReason = reason;
  ev.push({ t: 'lost', reason });
}

/** Loss conditions that can trigger at any moment. Returns true if lost. */
function checkLoss(s: GameState, ev: GameEvent[]): boolean {
  if (s.phase === 'lost' || s.phase === 'won') return true;
  const o = s.objective;
  const living = s.units.filter((u) => u.team === 'greek' && u.alive);
  if (living.length === 0) { lose(s, 'heroes', ev); return true; }
  if (o.type === 'protect' && ships(s).length < o.minShips) { lose(s, 'ships', ev); return true; }
  if (o.type === 'escort') {
    const e = s.units.find((u) => u.type === o.unit);
    if (!e || !e.alive) { lose(s, 'escort', ev); return true; }
  }
  return false;
}

/** After a player action: immediate wins and losses. */
function checkImmediate(s: GameState, ev: GameEvent[]): void {
  if (checkLoss(s, ev)) return;
  const o = s.objective;
  if (o.type === 'rout' && trojans(s).length === 0 && !s.units.some((u) => u.mist && u.alive)) win(s, ev, s.turn);
  if (o.type === 'escort') {
    const e = s.units.find((u) => u.type === o.unit);
    if (e && onBoard(e) && e.x === o.x && e.y === o.y) win(s, ev, s.turn);
  }
  if (o.type === 'stealth') {
    for (const u of s.units) {
      if (u.team === 'greek' && onBoard(u) && tileAt(s, u.x, u.y) === 'gate') {
        u.escaped = true;
        ev.push({ t: 'escape', unit: u.id });
      }
    }
    const hs = s.units.filter((u) => u.team === 'greek' && u.alive);
    if (hs.length > 0 && hs.every((u) => u.escaped)) win(s, ev, s.turn);
  }
}

// ---------------------------------------------------------------------------
// Kleos
// ---------------------------------------------------------------------------

export function kleos(s: GameState): [boolean, boolean, boolean] {
  const won = s.phase === 'won';
  return [won, won && s.fallen.length === 0, won && s.turnsUsed <= s.par];
}
