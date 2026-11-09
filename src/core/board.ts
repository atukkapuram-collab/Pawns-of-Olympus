/** Board queries. Pure helpers over GameState. */
import { DIRS, DV, type Dir, type GameState, type TileKind, type Unit } from './types';

export function inBounds(s: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < s.width && y < s.height;
}

export function idx(s: GameState, x: number, y: number): number {
  return y * s.width + x;
}

export function tileAt(s: GameState, x: number, y: number): TileKind | null {
  return inBounds(s, x, y) ? s.tiles[idx(s, x, y)]! : null;
}

/** Can a unit stand on this tile (ignoring other units)? */
export function standable(s: GameState, x: number, y: number): boolean {
  const t = tileAt(s, x, y);
  return t !== null && t !== 'rock' && t !== 'water';
}

/** Units that are on the board right now (alive, not in mist, not escaped). */
export function onBoard(u: Unit): boolean {
  return u.alive && !u.mist && !u.escaped;
}

export function unitAt(s: GameState, x: number, y: number): Unit | undefined {
  return s.units.find((u) => onBoard(u) && u.x === x && u.y === y);
}

export function unitById(s: GameState, id: string): Unit | undefined {
  return s.units.find((u) => u.id === id);
}

export function heroes(s: GameState): Unit[] {
  return s.units.filter((u) => u.team === 'greek' && onBoard(u));
}

export function trojans(s: GameState): Unit[] {
  return s.units.filter((u) => u.team === 'trojan' && onBoard(u));
}

export function ships(s: GameState): Unit[] {
  return s.units.filter((u) => u.type === 'ship' && u.alive);
}

export function step(x: number, y: number, d: Dir, n = 1): { x: number; y: number } {
  return { x: x + DV[d].dx * n, y: y + DV[d].dy * n };
}

export function dirBetween(ax: number, ay: number, bx: number, by: number): Dir {
  const dx = bx - ax, dy = by - ay;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Exact orthogonal direction from a to b if they share a row or column (and differ). */
export function lineDir(ax: number, ay: number, bx: number, by: number): Dir | null {
  if (ax === bx && ay !== by) return by > ay ? 'down' : 'up';
  if (ay === by && ax !== bx) return bx > ax ? 'right' : 'left';
  return null;
}

/**
 * Breadth-first reachable tiles from (x, y) within `range` steps, moving
 * orthogonally through standable tiles not occupied by any unit. `blocked`
 * lets callers add reserved tiles. Returns a map key -> path (excluding start).
 */
export function reachable(
  s: GameState,
  x: number,
  y: number,
  range: number,
  blocked?: (x: number, y: number) => boolean,
  avoid?: (x: number, y: number) => boolean,
): Map<string, Array<{ x: number; y: number }>> {
  const out = new Map<string, Array<{ x: number; y: number }>>();
  const q: Array<{ x: number; y: number; path: Array<{ x: number; y: number }> }> = [{ x, y, path: [] }];
  const seen = new Set([`${x},${y}`]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur.path.length >= range) continue;
    for (const d of DIRS) {
      const n = step(cur.x, cur.y, d);
      const k = `${n.x},${n.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!standable(s, n.x, n.y) || unitAt(s, n.x, n.y) || blocked?.(n.x, n.y) || avoid?.(n.x, n.y)) continue;
      const path = [...cur.path, n];
      out.set(k, path);
      q.push({ ...n, path });
    }
  }
  return out;
}

/** BFS distance field over standable tiles (units ignored), from many sources. */
export function distanceField(s: GameState, sources: Array<{ x: number; y: number }>): Int32Array {
  const dist = new Int32Array(s.width * s.height).fill(-1);
  const q: Array<{ x: number; y: number }> = [];
  for (const p of sources) {
    if (!inBounds(s, p.x, p.y)) continue;
    dist[idx(s, p.x, p.y)] = 0;
    q.push(p);
  }
  while (q.length) {
    const c = q.shift()!;
    const cd = dist[idx(s, c.x, c.y)]!;
    for (const d of DIRS) {
      const n = step(c.x, c.y, d);
      if (!standable(s, n.x, n.y)) continue;
      const i = idx(s, n.x, n.y);
      if (dist[i] !== -1) continue;
      dist[i] = cd + 1;
      q.push(n);
    }
  }
  return dist;
}

export function cloneState(s: GameState): GameState {
  return structuredClone(s);
}
