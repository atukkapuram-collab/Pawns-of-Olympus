/**
 * Prints a level turn by turn while replaying its solution: board, units,
 * intents and events. A design aid for level-designer.
 * Usage: npx vite-node tools/level-trace.ts <level-id | path.json>
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLevel, stepToAction, type LevelData } from '../src/core/level';
import { applyAction, intentOrder } from '../src/core/rules';
import { onBoard } from '../src/core/board';
import type { GameState } from '../src/core/types';

const arg = process.argv[2];
if (!arg) {
  console.error('usage: vite-node tools/level-trace.ts <level-id | file.json>');
  process.exit(1);
}
const file = arg.endsWith('.json') ? arg : resolve(import.meta.dirname, '..', 'src', 'data', 'levels', `${arg}.json`);
const level = JSON.parse(readFileSync(file, 'utf8')) as LevelData;

const CH: Record<string, string> = { ground: '.', sand: ',', rock: '#', water: '~', brush: '%', gate: 'G', light: '*' };
const ARROW: Record<string, string> = { up: '^', down: 'v', left: '<', right: '>' };

export function draw(s: GameState): string {
  const rows: string[][] = [];
  for (let y = 0; y < s.height; y++) {
    rows.push([]);
    for (let x = 0; x < s.width; x++) {
      const k = y * s.width + x;
      rows[y]!.push(s.fire[k] ? '^' : CH[s.tiles[k]!]!);
    }
  }
  const legend: string[] = [];
  const order = intentOrder(s);
  for (const u of s.units) {
    if (!onBoard(u)) continue;
    const mark = u.team === 'greek' ? u.type[0]!.toUpperCase() : u.team === 'object' ? 'S' : u.type[0]!;
    rows[u.y]![u.x] = mark;
    const n = order.indexOf(u);
    legend.push(`${mark}=${u.id} hp${u.hp}${u.intent ? ` intent#${n + 1} ${u.intent.kind}${ARROW[u.intent.dir]}` : ''}`);
  }
  const plague = s.plague.length ? `  plague: ${s.plague.map((k) => `${k % s.width},${Math.floor(k / s.width)}`).join(' ')}` : '';
  return rows.map((r) => '   ' + r.join(' ')).join('\n') + '\n   ' + legend.join(' | ') + plague + (s.ares ? '  ARES' : '');
}

let s = loadLevel(level, level.solution.patron);
console.log(`${level.id} "${level.title}" par ${level.par}\n--- turn 1 start\n${draw(s)}`);
level.solution.turns.forEach((turn, ti) => {
  for (const st of turn) {
    const r = applyAction(s, stepToAction(st));
    if (r.error) { console.log(`   !! ${JSON.stringify(st)}: ${r.error}`); return; }
    const evs = r.events.filter((e) => !['phase', 'reposition'].includes(e.t)).map((e) => JSON.stringify(e)).join('\n      ');
    console.log(`   > ${JSON.stringify(st)}\n      ${evs}`);
    s = r.state;
  }
  console.log(`--- after turn ${ti + 1}: phase ${s.phase}${s.loseReason ? ' ' + s.loseReason : ''}\n${draw(s)}`);
});
