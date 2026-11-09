/** Damage, defeat, push, swap, and attack geometry. All functions mutate the
 *  state passed in (callers clone first) and append events. */
import { UNITS } from '../data/units';
import { inBounds, onBoard, standable, step, tileAt, unitAt } from './board';
import { DV, OPPOSITE, type DamageType, type Dir, type GameEvent, type GameState, type Intent, type Unit } from './types';

/** Apply damage to a unit, honoring every passive. Returns damage actually dealt. */
export function hurt(s: GameState, u: Unit, amount: number, kind: DamageType, attackDir: Dir | null, ev: GameEvent[]): number {
  if (!onBoard(u) || amount <= 0) return 0;
  if (u.type === 'achilles') {
    if (kind === 'arrow') {
      ev.push({ t: 'heel', unit: u.id });
      u.hp = 0;
      ev.push({ t: 'damage', unit: u.id, amount, hp: 0, kind });
      defeat(s, u, ev);
      return amount;
    }
    if (kind === 'melee' || kind === 'charge' || kind === 'impact') {
      ev.push({ t: 'blocked', unit: u.id, reason: 'heel' });
      return 0;
    }
  }
  if (u.type === 'shieldbearer' && attackDir && attackDir === OPPOSITE[u.facing] && kind !== 'impact' && kind !== 'fire') {
    ev.push({ t: 'blocked', unit: u.id, reason: 'front' });
    return 0;
  }
  let dmg = amount;
  if (u.type === 'ajax') {
    dmg = Math.max(0, amount - 1);
    if (dmg === 0) {
      ev.push({ t: 'blocked', unit: u.id, reason: 'shield' });
      return 0;
    }
  }
  u.hp = Math.max(0, u.hp - dmg);
  ev.push({ t: 'damage', unit: u.id, amount: dmg, hp: u.hp, kind });
  if (u.hp === 0) defeat(s, u, ev);
  return dmg;
}

export function defeat(s: GameState, u: Unit, ev: GameEvent[]): void {
  const aph = s.trojanEvent?.aphrodite;
  if (u.team === 'trojan' && aph && !s.aphroditeUsed) {
    s.aphroditeUsed = true;
    u.mist = { returnTurn: s.turn + 2, x: aph.x, y: aph.y };
    u.intent = null;
    ev.push({ t: 'mist', unit: u.id });
    ev.push({ t: 'god', god: 'aphrodite', what: 'mist' });
    return;
  }
  u.alive = false;
  u.intent = null;
  ev.push({ t: 'defeat', unit: u.id });
  if (u.team === 'greek' && !s.fallen.includes(u.id)) s.fallen.push(u.id);
}

/** Is `target` sheltered by Ajax from an attack travelling in `dir` into its tile? */
export function sheltered(s: GameState, target: Unit, dir: Dir): boolean {
  if (target.team !== 'greek' || target.type === 'ajax') return false;
  const behind = { x: target.x - DV[dir].dx, y: target.y - DV[dir].dy };
  const a = unitAt(s, behind.x, behind.y);
  return !!a && a.type === 'ajax';
}

/**
 * Push a unit one tile. Walls/edges: 1 impact. Units: 1 impact each.
 * Deep water: swept away. Ships can't be pushed.
 */
export function push(s: GameState, u: Unit, dir: Dir, ev: GameEvent[]): void {
  if (!onBoard(u) || u.team === 'object') return;
  const to = step(u.x, u.y, dir);
  if (!inBounds(s, to.x, to.y) || tileAt(s, to.x, to.y) === 'rock') {
    ev.push({ t: 'bump', unit: u.id, dir, into: null });
    hurt(s, u, 1, 'impact', null, ev);
    return;
  }
  const other = unitAt(s, to.x, to.y);
  if (other) {
    ev.push({ t: 'bump', unit: u.id, dir, into: other.id });
    hurt(s, u, 1, 'impact', null, ev);
    hurt(s, other, 1, 'impact', null, ev);
    return;
  }
  const from = { x: u.x, y: u.y };
  u.x = to.x;
  u.y = to.y;
  ev.push({ t: 'push', unit: u.id, dir, from, to });
  if (tileAt(s, to.x, to.y) === 'water') {
    ev.push({ t: 'swept', unit: u.id, x: to.x, y: to.y });
    u.alive = false;
    u.intent = null;
    // (Aphrodite can't rescue a unit from the river: being swept is not a defeat.)
    if (u.team === 'greek' && !s.fallen.includes(u.id)) s.fallen.push(u.id);
  }
}

export interface AttackTrace {
  /** Tiles the attack passes through or lands on (for display). */
  tiles: Array<{ x: number; y: number }>;
  /** Tiles where damage lands, with the unit there (if any). */
  hits: Array<{ x: number; y: number; unit: Unit | undefined }>;
  /** Charge only: where the attacker ends up. */
  end?: { x: number; y: number };
}

/**
 * Geometry of an intent fired from `origin` (which may differ from the unit's
 * real position, for AI planning). `self` is ignored as an obstacle.
 */
export function traceAttack(s: GameState, origin: { x: number; y: number }, intent: Intent, self: Unit): AttackTrace {
  const occupant = (x: number, y: number) => {
    const u = unitAt(s, x, y);
    return u && u.id !== self.id ? u : undefined;
  };
  const d = intent.dir;
  switch (intent.kind) {
    case 'thrust': {
      const t = step(origin.x, origin.y, d);
      if (!inBounds(s, t.x, t.y)) return { tiles: [], hits: [] };
      return { tiles: [t], hits: [{ ...t, unit: occupant(t.x, t.y) }] };
    }
    case 'arrow': {
      const tiles: Array<{ x: number; y: number }> = [];
      let p = step(origin.x, origin.y, d);
      while (inBounds(s, p.x, p.y) && tileAt(s, p.x, p.y) !== 'rock') {
        tiles.push(p);
        const u = occupant(p.x, p.y);
        if (u) return { tiles, hits: [{ ...p, unit: u }] };
        p = step(p.x, p.y, d);
      }
      return { tiles, hits: tiles.length ? [{ ...tiles[tiles.length - 1]!, unit: undefined }] : [] };
    }
    case 'charge': {
      const path: Array<{ x: number; y: number }> = [];
      let p = { ...origin };
      for (;;) {
        const n = step(p.x, p.y, d);
        if (!inBounds(s, n.x, n.y) || !standable(s, n.x, n.y)) break;
        const u = occupant(n.x, n.y);
        if (u) return { tiles: [...path, n], hits: [{ ...n, unit: u }], end: p };
        path.push(n);
        p = n;
      }
      return { tiles: path, hits: [], end: p };
    }
    case 'sweep': {
      const front = step(origin.x, origin.y, d);
      const side: Dir = d === 'up' || d === 'down' ? 'left' : 'up';
      const tiles = [step(front.x, front.y, side), front, step(front.x, front.y, OPPOSITE[side])].filter((t) => inBounds(s, t.x, t.y));
      return { tiles, hits: tiles.map((t) => ({ ...t, unit: occupant(t.x, t.y) })) };
    }
  }
}

export function intentDamage(s: GameState, u: Unit): number {
  return UNITS[u.type].damage + (s.ares ? 1 : 0);
}

export function damageKind(intent: Intent): DamageType {
  return intent.kind === 'arrow' ? 'arrow' : intent.kind === 'charge' ? 'charge' : 'melee';
}

/** Resolve one Trojan's intent for real. */
export function resolveIntent(s: GameState, u: Unit, order: number, ev: GameEvent[]): void {
  if (!onBoard(u) || !u.intent) return;
  const intent = u.intent;
  const tr = traceAttack(s, { x: u.x, y: u.y }, intent, u);
  ev.push({ t: 'attack', unit: u.id, intent, order, tiles: tr.tiles });
  if (intent.kind === 'charge' && tr.end && (tr.end.x !== u.x || tr.end.y !== u.y)) {
    const path = tr.tiles.filter((t) => !tr.hits.some((h) => h.x === t.x && h.y === t.y));
    u.x = tr.end.x;
    u.y = tr.end.y;
    ev.push({ t: 'charge', unit: u.id, path });
  }
  const dmg = intentDamage(s, u);
  for (const h of tr.hits) {
    const target = h.unit;
    if (!target || !onBoard(target)) continue;
    if (sheltered(s, target, intent.dir)) {
      ev.push({ t: 'blocked', unit: target.id, reason: 'shelter' });
      continue;
    }
    hurt(s, target, dmg, damageKind(intent), intent.dir, ev);
  }
}
