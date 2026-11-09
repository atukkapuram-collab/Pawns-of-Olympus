/**
 * Deterministic enemy AI: reposition and choose the next intent.
 * Scoring assumes nobody else moves: it aims at heroes where they stand now.
 */
import { UNITS } from '../data/units';
import { dirBetween, distanceField, heroes, idx, lineDir, reachable, tileAt, unitAt } from './board';
import { traceAttack } from './combat';
import { DIRS, type Dir, type GameEvent, type GameState, type Intent, type Unit } from './types';

const SCORE = { hero: 10, patroclus: 20, ship: 8, trojan: -6, parisOnAchilles: 30 };

export function scoreAttack(s: GameState, u: Unit, origin: { x: number; y: number }, intent: Intent): number {
  const tr = traceAttack(s, origin, intent, u);
  let score = 0;
  for (const h of tr.hits) {
    const t = h.unit;
    if (!t) continue;
    if (t.team === 'greek') {
      score += t.type === 'patroclus' ? SCORE.patroclus : SCORE.hero;
      if (u.type === 'paris' && t.type === 'achilles') score += SCORE.parisOnAchilles;
    } else if (t.type === 'ship') score += SCORE.ship;
    else if (t.team === 'trojan') score += SCORE.trojan;
  }
  return score;
}

interface Plan {
  x: number;
  y: number;
  path: Array<{ x: number; y: number }>;
  intent: Intent;
  score: number;
}

/** Choose where one Trojan goes and what it will do next turn. */
export function planFor(s: GameState, u: Unit, reserved: Set<string>): Plan {
  const stats = UNITS[u.type];
  const kind = stats.intent!;
  const avoidFire = (x: number, y: number) => s.fire[idx(s, x, y)] === true;
  const reach = reachable(s, u.x, u.y, stats.move, (x, y) => reserved.has(`${x},${y}`), avoidFire);
  const options: Array<{ x: number; y: number; path: Array<{ x: number; y: number }> }> = [{ x: u.x, y: u.y, path: [] }];
  // stable order: row-major by destination
  [...reach.values()]
    .map((p) => ({ ...p[p.length - 1]!, path: p }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((o) => options.push(o));

  // Paris: if he has a straight line to Achilles from a reachable tile, he takes it.
  let best: Plan | null = null;
  for (const o of options) {
    for (const d of DIRS) {
      const intent: Intent = { kind, dir: d };
      let score = scoreAttack(s, u, o, intent);
      if (u.type === 'paris') {
        const ach = s.units.find((v) => v.type === 'achilles' && v.alive && !v.escaped);
        if (ach && lineDir(o.x, o.y, ach.x, ach.y) === d) score += 1; // aim at him even if blocked
      }
      if (score <= 0) continue;
      if (!best || score > best.score || (score === best.score && o.path.length < best.path.length)) {
        best = { x: o.x, y: o.y, path: o.path, intent, score };
      }
    }
  }
  if (best) return best;

  // Nothing to hit: advance toward the nearest hero and face it.
  const hs = heroes(s);
  if (hs.length === 0) return { x: u.x, y: u.y, path: [], intent: { kind, dir: u.facing }, score: 0 };
  const field = distanceField(s, hs.map((h) => ({ x: h.x, y: h.y })));
  let pick = options[0]!;
  let pickD = field[idx(s, pick.x, pick.y)]! < 0 ? 1e9 : field[idx(s, pick.x, pick.y)]!;
  for (const o of options) {
    const d = field[idx(s, o.x, o.y)]!;
    const dd = d < 0 ? 1e9 : d;
    if (dd < pickD || (dd === pickD && o.path.length < pick.path.length)) {
      pick = o;
      pickD = dd;
    }
  }
  let nearest = hs[0]!;
  let nd = Infinity;
  for (const h of hs) {
    const md = Math.abs(h.x - pick.x) + Math.abs(h.y - pick.y);
    if (md < nd) { nd = md; nearest = h; }
  }
  const dir: Dir = nearest.x === pick.x && nearest.y === pick.y ? u.facing : dirBetween(pick.x, pick.y, nearest.x, nearest.y);
  return { x: pick.x, y: pick.y, path: pick.path, intent: { kind, dir }, score: 0 };
}

/** Reposition every living Trojan in order and set new intents. */
export function repositionAll(s: GameState, ev: GameEvent[]): void {
  const reserved = new Set<string>();
  for (const u of s.units) {
    if (u.team !== 'trojan' || !u.alive || u.mist || u.escaped) continue;
    const plan = planFor(s, u, reserved);
    if (plan.x !== u.x || plan.y !== u.y) {
      // check the target is still free (another Trojan might have moved there)
      if (!unitAt(s, plan.x, plan.y) && tileAt(s, plan.x, plan.y) !== null) {
        u.x = plan.x;
        u.y = plan.y;
      }
    }
    u.intent = plan.intent;
    u.facing = plan.intent.dir;
    reserved.add(`${u.x},${u.y}`);
    ev.push({ t: 'reposition', unit: u.id, path: plan.path, intent: plan.intent });
  }
}
