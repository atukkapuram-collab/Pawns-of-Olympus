import { describe, expect, it } from 'vitest';
import { applyAction, abilityTargets, intentOrder, kleos, moveOptions, favorAvailable, canAct } from '../src/core/rules';
import { traceAttack } from '../src/core/combat';
import { planFor } from '../src/core/ai';
import { validateLevelSchema, loadLevel, stepToAction } from '../src/core/level';
import { Session } from '../src/core/session';
import { replaySolution } from '../src/core/replay';
import { lintLevel, winnableInOneTurn } from '../src/core/lint';
import { dirBetween, lineDir, distanceField } from '../src/core/board';
import { LEVELS } from '../src/data/levels/index';
import { act, end, mkLevel, mkState, mv, OPEN6, run, u } from './helpers';

describe('movement', () => {
  it('reaches tiles within move range orthogonally, around rocks and units', () => {
    const s = mkState(['.....', '.#...', '.....', '.....'], [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 1, y: 0, facing: 'left' }]);
    const opts = moveOptions(s, u(s, 'ajax'));
    expect([...opts.keys()].sort()).toEqual(['0,1', '0,2']);
  });

  it('cannot move twice, nor after acting', () => {
    const s0 = mkState(OPEN6, [{ type: 'achilles', x: 0, y: 0 }, { type: 'spearman', x: 4, y: 0, facing: 'left' }]);
    const { s } = run(s0, mv('achilles', 1, 0));
    expect(applyAction(s, mv('achilles', 2, 0)).error).toBeTruthy();
    const s2 = run(mkState(OPEN6, [{ type: 'achilles', x: 3, y: 0 }, { type: 'spearman', x: 4, y: 0, facing: 'left' }]), act('achilles', 'strike', 4, 0)).s;
    expect(applyAction(s2, mv('achilles', 2, 0)).error).toBeTruthy();
  });

  it('rejects unreachable destinations and unknown units', () => {
    const s = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 5, y: 5, facing: 'left' }]);
    expect(applyAction(s, mv('ajax', 3, 0)).error).toMatch(/cannot reach/);
    expect(applyAction(s, mv('nobody', 1, 0)).error).toBeTruthy();
    expect(applyAction(s, mv('spearman-1', 4, 5)).error).toBeTruthy();
  });
});

describe('strike and damage', () => {
  it('Achilles strikes for 2 and defeats a spearman; rout wins immediately', () => {
    const { s, ev } = run(mkState(OPEN6, [{ type: 'achilles', x: 1, y: 1 }, { type: 'spearman', x: 2, y: 1, facing: 'left' }]), act('achilles', 'strike', 2, 1));
    expect(u(s, 'spearman-1').alive).toBe(false);
    expect(ev.map((e) => e.t)).toContain('defeat');
    expect(s.phase).toBe('won');
    expect(kleos(s)).toEqual([true, true, true]);
  });

  it('strike targets only adjacent Trojans', () => {
    const s = mkState(OPEN6, [{ type: 'ajax', x: 1, y: 1 }, { type: 'achilles', x: 2, y: 1 }, { type: 'spearman', x: 1, y: 3, facing: 'up' }]);
    expect(abilityTargets(s, u(s, 'ajax'), 'strike')).toEqual([]);
    expect(applyAction(s, act('ajax', 'strike', 2, 1)).error).toBeTruthy();
  });

  it('Ajax takes 1 less from every hit', () => {
    const s0 = mkState(OPEN6, [{ type: 'ajax', x: 1, y: 1 }, { type: 'hector', x: 2, y: 1, facing: 'left' }], { objective: { type: 'survive', turns: 5 } });
    const { s } = run(s0, end);
    expect(u(s, 'ajax').hp).toBe(3); // sweep 2 - 1
  });

  it('Achilles: immune to melee, killed by any arrow', () => {
    const s0 = mkState(OPEN6, [{ type: 'achilles', x: 1, y: 1 }, { type: 'ajax', x: 5, y: 5 }, { type: 'spearman', x: 2, y: 1, facing: 'left' }, { type: 'archer', x: 1, y: 4, facing: 'up' }]);
    const { s, ev } = run(s0, end);
    expect(ev.some((e) => e.t === 'blocked' && e.reason === 'heel')).toBe(true);
    expect(ev.some((e) => e.t === 'heel')).toBe(true);
    expect(u(s, 'achilles').alive).toBe(false);
    expect(s.fallen).toContain('achilles');
  });

  it('Shieldbearer takes nothing from the front, full damage from the side', () => {
    const front = run(mkState(OPEN6, [{ type: 'achilles', x: 1, y: 1 }, { type: 'shieldbearer', x: 2, y: 1, facing: 'left' }]), act('achilles', 'strike', 2, 1));
    expect(u(front.s, 'shieldbearer-1').hp).toBe(2);
    expect(front.ev.some((e) => e.t === 'blocked' && e.reason === 'front')).toBe(true);
    const side = run(mkState(OPEN6, [{ type: 'achilles', x: 2, y: 0 }, { type: 'shieldbearer', x: 2, y: 1, facing: 'left' }]), act('achilles', 'strike', 2, 1));
    expect(u(side.s, 'shieldbearer-1').alive).toBe(false);
  });
});

describe('push', () => {
  const base = (bx: number, by: number, board = OPEN6) =>
    mkState(board, [{ type: 'diomedes', x: 1, y: 1 }, { type: 'spearman', x: bx, y: by, facing: 'up' }, { type: 'archer', x: 5, y: 5, facing: 'up' }]);

  it('damages then moves the target one tile', () => {
    const { s, ev } = run(base(2, 1), act('diomedes', 'push', 2, 1));
    expect(u(s, 'spearman-1')).toMatchObject({ x: 3, y: 1, hp: 1 });
    expect(ev.some((e) => e.t === 'push')).toBe(true);
  });

  it('into a wall or the edge: 1 impact damage', () => {
    const { s } = run(base(2, 1, ['......', '...#..', '......', '......', '......', '......']), act('diomedes', 'push', 2, 1));
    expect(u(s, 'spearman-1')).toMatchObject({ x: 2, alive: false }); // 1 strike + 1 impact
    const edge = mkState(['....', '....', '....', '....'], [{ type: 'diomedes', x: 2, y: 1 }, { type: 'hector', x: 3, y: 1, facing: 'up' }]);
    expect(u(run(edge, act('diomedes', 'push', 3, 1)).s, 'hector-1').hp).toBe(4);
  });

  it('into another unit: both take 1', () => {
    const s0 = mkState(OPEN6, [{ type: 'diomedes', x: 1, y: 1 }, { type: 'hector', x: 2, y: 1, facing: 'up' }, { type: 'hector', x: 3, y: 1, facing: 'up' }]);
    const { s } = run(s0, act('diomedes', 'push', 2, 1));
    expect(u(s, 'hector-1')).toMatchObject({ x: 2, hp: 4 });
    expect(u(s, 'hector-2').hp).toBe(5);
  });

  it('into deep water: swept away', () => {
    const { s, ev } = run(base(2, 1, ['......', '...~..', '......', '......', '......', '......']), act('diomedes', 'push', 2, 1));
    expect(ev.some((e) => e.t === 'swept')).toBe(true);
    expect(u(s, 'spearman-1').alive).toBe(false);
  });

  it('pushes allies without damage; ships never move', () => {
    const s0 = mkState(['......', '..S...', '......', '......'], [{ type: 'diomedes', x: 1, y: 1 }, { type: 'ajax', x: 1, y: 2 }, { type: 'archer', x: 5, y: 3, facing: 'up' }]);
    const { s } = run(s0, act('diomedes', 'push', 1, 2));
    expect(u(s, 'ajax')).toMatchObject({ x: 1, y: 3, hp: 4 });
    expect(abilityTargets(s0, u(s0, 'diomedes'), 'push')).not.toContainEqual({ x: 2, y: 1 });
  });

  it('a moved enemy keeps its intent direction and can hit its own side', () => {
    // spearman faces down; push it right so it thrusts into the archer below its new tile
    const s0 = mkState(OPEN6, [{ type: 'diomedes', x: 0, y: 1 }, { type: 'odysseus', x: 5, y: 5 }, { type: 'hector', x: 1, y: 1, facing: 'down' }, { type: 'archer', x: 2, y: 2, facing: 'up' }]);
    const { s, ev } = run(s0, act('diomedes', 'push', 1, 1), end);
    expect(ev.some((e) => e.t === 'damage' && e.unit === 'archer-1')).toBe(true);
    expect(u(s, 'archer-1').alive).toBe(false);
  });
});

describe('swap (Odysseus)', () => {
  it('swaps with any unit in a straight line within 3 tiles, ignoring what lies between', () => {
    const s0 = mkState(OPEN6, [{ type: 'odysseus', x: 0, y: 0 }, { type: 'ajax', x: 1, y: 0 }, { type: 'spearman', x: 3, y: 0, facing: 'down' }, { type: 'archer', x: 5, y: 5, facing: 'up' }]);
    const targets = abilityTargets(s0, u(s0, 'odysseus'), 'swap');
    expect(targets).toContainEqual({ x: 3, y: 0 });
    expect(targets).toContainEqual({ x: 1, y: 0 });
    const { s } = run(s0, act('odysseus', 'swap', 3, 0));
    expect(u(s, 'odysseus')).toMatchObject({ x: 3, y: 0 });
    expect(u(s, 'spearman-1')).toMatchObject({ x: 0, y: 0, intent: { kind: 'thrust', dir: 'down' } });
  });

  it('cannot reach 4 tiles away', () => {
    const s0 = mkState(OPEN6, [{ type: 'odysseus', x: 0, y: 0 }, { type: 'spearman', x: 4, y: 0, facing: 'down' }]);
    expect(abilityTargets(s0, u(s0, 'odysseus'), 'swap')).toEqual([]);
  });
});

describe('intents', () => {
  it('arrows hit the first unit and stop at rock', () => {
    const s = mkState(['......', '..#...', '......'], [{ type: 'ajax', x: 0, y: 1 }, { type: 'achilles', x: 3, y: 2 }, { type: 'archer', x: 5, y: 1, facing: 'left' }]);
    const a = u(s, 'archer-1');
    const tr = traceAttack(s, a, a.intent!, a);
    expect(tr.tiles).toEqual([{ x: 4, y: 1 }, { x: 3, y: 1 }]);
    expect(tr.hits[0]!.unit).toBeUndefined();
  });

  it('charge runs until blocked and deals 2', () => {
    const s0 = mkState(['.......', '.......'], [{ type: 'odysseus', x: 1, y: 0 }, { type: 'chariot', x: 6, y: 0, facing: 'left' }], { objective: { type: 'survive', turns: 4 } });
    const { s, ev } = run(s0, end);
    expect(u(s, 'chariot-1').x).toBe(2);
    expect(u(s, 'odysseus').hp).toBe(1);
    expect(ev.some((e) => e.t === 'charge')).toBe(true);
  });

  it('sweep hits three tiles in front', () => {
    const s = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'hector', x: 2, y: 2, facing: 'right' }]);
    const h = u(s, 'hector-1');
    expect(traceAttack(s, h, h.intent!, h).tiles).toEqual([{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }]);
  });

  it('resolve in number order; a Trojan killed before its turn does nothing', () => {
    // spearman-1 (#1) thrusts into archer (#2) and kills it before it shoots Achilles
    const s0 = mkState(OPEN6, [{ type: 'achilles', x: 0, y: 3 }, { type: 'ajax', x: 5, y: 5 }, { type: 'spearman', x: 3, y: 2, facing: 'down' }, { type: 'archer', x: 3, y: 3, facing: 'left' }]);
    expect(intentOrder(s0).map((v) => v.id)).toEqual(['spearman-1', 'archer-1']);
    const { s } = run(s0, end);
    expect(u(s, 'archer-1').alive).toBe(false);
    expect(u(s, 'achilles').alive).toBe(true);
  });

  it('Ajax shelters the ally directly behind him (plague from above)', () => {
    const s0 = mkState(OPEN6, [{ type: 'ajax', x: 2, y: 1 }, { type: 'odysseus', x: 2, y: 2 }, { type: 'spearman', x: 5, y: 5, facing: 'up' }], { trojanEvent: { apollo: { every: 1, from: 1 } }, objective: { type: 'survive', turns: 3 } });
    expect(s0.plague.length).toBe(2);
    const { s, ev } = run(s0, end);
    expect(ev.some((e) => e.t === 'blocked' && e.reason === 'shelter')).toBe(true);
    expect(u(s, 'odysseus').hp).toBe(3);
    expect(u(s, 'ajax').hp).toBe(4); // 1 arrow - 1 shield
  });
});

describe('enemy AI', () => {
  it('moves to hit a hero and prefers the shortest move', () => {
    const s = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 2, y: 0, facing: 'down' }]);
    const p = planFor(s, u(s, 'spearman-1'), new Set());
    expect(p).toMatchObject({ x: 1, y: 0, intent: { kind: 'thrust', dir: 'left' } });
  });

  it('prefers Patroclus over other heroes', () => {
    const s = mkState(OPEN6, [{ type: 'ajax', x: 2, y: 1 }, { type: 'patroclus', x: 2, y: 3 }, { type: 'spearman', x: 2, y: 2, facing: 'down' }]);
    expect(planFor(s, u(s, 'spearman-1'), new Set()).intent.dir).toBe('down');
  });

  it('Paris aims at Achilles over anyone else', () => {
    const s = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 2 }, { type: 'achilles', x: 5, y: 2 }, { type: 'paris', x: 3, y: 2, facing: 'up' }]);
    expect(planFor(s, u(s, 'paris-1'), new Set()).intent.dir).toBe('right');
  });

  it('avoids friendly fire and advances when nothing is in reach', () => {
    const s = mkState(['........', '........', '........'], [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 7, y: 2, facing: 'up' }]);
    const p = planFor(s, u(s, 'spearman-1'), new Set());
    expect(p.score).toBe(0);
    expect(p.x + p.y).toBeLessThan(9);
  });

  it('is deterministic', () => {
    const lvl = LEVELS[2]!;
    const a = replaySolution(lvl), b = replaySolution(lvl);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
});

describe('hazards and gods', () => {
  it('fire spreads along brush, a unit on brush stops it and takes 1, ships beside fire burn', () => {
    const s0 = mkState(['^%%%.', '..S..', '.....'], [{ type: 'ajax', x: 2, y: 0 }, { type: 'archer', x: 4, y: 2, facing: 'down' }], { objective: { type: 'protect', target: 'ships', turns: 5, minShips: 1 } });
    const { s, ev } = run(s0, end);
    expect(s.fire[1]).toBe(true);
    expect(s.fire[2]).toBe(false);
    expect(u(s, 'ajax').hp).toBe(4); // 1 fire - 1 shield
    expect(ev.some((e) => e.t === 'fireSpread')).toBe(true);
    const ship = s.units.find((v) => v.type === 'ship')!;
    expect(ship.hp).toBe(2); // (2,1) is not next to fire yet: fire at (0,0),(1,0)
  });

  it('Zeus: 2 divine damage once per level', () => {
    const s0 = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 4, y: 4, facing: 'up' }, { type: 'archer', x: 5, y: 5, facing: 'up' }], {}, 'zeus');
    const { s } = run(s0, { type: 'favor', god: 'zeus', x: 4, y: 4 });
    expect(u(s, 'spearman-1').alive).toBe(false);
    expect(favorAvailable(s)).toBe(false);
    expect(applyAction(s, { type: 'favor', god: 'zeus', x: 5, y: 5 }).error).toBeTruthy();
    expect(applyAction(s0, { type: 'favor', god: 'athena', x: 0, y: 0 }).error).toBeTruthy();
  });

  it('Athena: a hero who acted acts again', () => {
    const s0 = mkState(OPEN6, [{ type: 'ajax', x: 1, y: 1 }, { type: 'hector', x: 2, y: 1, facing: 'up' }], {}, 'athena');
    const { s } = run(s0, act('ajax', 'strike', 2, 1));
    expect(canAct(s, u(s, 'ajax'))).toBe(false);
    expect(applyAction(s0, { type: 'favor', god: 'athena', x: 1, y: 1 }).error).toBeTruthy();
    const r = run(s, { type: 'favor', god: 'athena', x: 1, y: 1 }, act('ajax', 'strike', 2, 1));
    expect(u(r.s, 'hector-1').hp).toBe(4);
  });

  it('Poseidon: the wave pushes a whole row, leading end first, and puts out fire', () => {
    const s0 = mkState(['......', '^.....', '......'], [{ type: 'ajax', x: 1, y: 1 }, { type: 'spearman', x: 2, y: 1, facing: 'up' }, { type: 'archer', x: 5, y: 2, facing: 'up' }], {}, 'poseidon');
    const { s, ev } = run(s0, { type: 'favor', god: 'poseidon', x: 0, y: 1, dir: 'right' });
    expect(u(s, 'spearman-1').x).toBe(3);
    expect(u(s, 'ajax').x).toBe(2);
    expect(s.fire[6]).toBe(false);
    expect(ev.some((e) => e.t === 'fireOut')).toBe(true);
    expect(applyAction(s0, { type: 'favor', god: 'poseidon', x: 0, y: 1 }).error).toBeTruthy();
  });

  it('Ares: +1 damage on listed turns', () => {
    const s0 = mkState(OPEN6, [{ type: 'odysseus', x: 1, y: 1 }, { type: 'spearman', x: 2, y: 1, facing: 'left' }], { trojanEvent: { ares: { turns: [1] } }, objective: { type: 'survive', turns: 4 } });
    expect(s0.ares).toBe(true);
    const { s } = run(s0, end);
    expect(u(s, 'odysseus').hp).toBe(1);
    expect(s.ares).toBe(false);
  });

  it('Aphrodite: the first Trojan defeated returns 2 turns later at full HP', () => {
    const s0 = mkState(OPEN6, [{ type: 'achilles', x: 0, y: 0 }, { type: 'spearman', x: 1, y: 0, facing: 'down' }, { type: 'spearman', x: 5, y: 5, facing: 'down' }], { trojanEvent: { aphrodite: { x: 4, y: 4 } } });
    let { s } = run(s0, act('achilles', 'strike', 1, 0));
    expect(u(s, 'spearman-1').mist).toBeTruthy();
    expect(s.phase).toBe('player');
    s = run(s, end).s;
    expect(u(s, 'spearman-1').mist).toBeTruthy();
    const r = run(s, end);
    expect(r.ev.some((e) => e.t === 'return')).toBe(true);
    expect(u(r.s, 'spearman-1')).toMatchObject({ hp: 2, mist: undefined });
  });
});

describe('objectives and flow', () => {
  it('survive: win after N enemy phases', () => {
    const s0 = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 5, y: 5, facing: 'up' }], { objective: { type: 'survive', turns: 2 }, par: 2 });
    const { s } = run(s0, end, end);
    expect(s.phase).toBe('won');
    expect(s.turnsUsed).toBe(2);
  });

  it('protect: losing ships loses the level', () => {
    const s0 = mkState(['.S....', '......'], [{ type: 'ajax', x: 5, y: 1 }, { type: 'hector', x: 1, y: 1, facing: 'up' }], { objective: { type: 'protect', target: 'ships', turns: 3, minShips: 1 } });
    const { s } = run(s0, end);
    expect(s.phase).toBe('lost');
    expect(s.loseReason).toBe('ships');
  });

  it('escort: win when the hero reaches the tile; lose if he falls', () => {
    const s0 = mkState(OPEN6, [{ type: 'patroclus', x: 0, y: 0 }, { type: 'spearman', x: 5, y: 5, facing: 'up' }], { objective: { type: 'escort', unit: 'patroclus', x: 2, y: 0 } });
    expect(run(s0, mv('patroclus', 2, 0)).s.phase).toBe('won');
    const s1 = mkState(OPEN6, [{ type: 'patroclus', x: 0, y: 0 }, { type: 'ajax', x: 3, y: 3 }, { type: 'hector', x: 1, y: 0, facing: 'left' }, { type: 'archer', x: 0, y: 3, facing: 'up' }], { objective: { type: 'escort', unit: 'patroclus', x: 5, y: 5 } });
    expect(run(s1, end).s.loseReason).toBe('escort');
  });

  it('stealth: seen at end of turn loses; all heroes through the gate wins', () => {
    const board = ['..*.G', '.....', '.....'];
    const seen = mkState(board, [{ type: 'odysseus', x: 0, y: 1 }, { type: 'spearman', x: 3, y: 1, facing: 'left' }], { objective: { type: 'stealth' } });
    expect(run(seen, end).s.loseReason).toBe('seen');
    const lit = mkState(board, [{ type: 'odysseus', x: 1, y: 2 }, { type: 'spearman', x: 4, y: 2, facing: 'up' }], { objective: { type: 'stealth' } });
    expect(run(lit, mv('odysseus', 2, 0), end).s.loseReason).toBe('seen');
    const ok = mkState(board, [{ type: 'odysseus', x: 1, y: 2 }, { type: 'spearman', x: 0, y: 2, facing: 'down' }], { objective: { type: 'stealth' } });
    const r1 = run(ok, mv('odysseus', 3, 1), end);
    expect(r1.s.phase).toBe('player');
    expect(run(r1.s, mv('odysseus', 4, 0)).s.phase).toBe('won');
  });

  it('losing every hero loses; running out of turns loses', () => {
    const dead = mkState(OPEN6, [{ type: 'odysseus', x: 1, y: 1 }, { type: 'hector', x: 2, y: 1, facing: 'left' }, { type: 'hector', x: 0, y: 1, facing: 'right' }]);
    expect(run(dead, end).s.loseReason).toBe('heroes');
    const slow = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 5, y: 5, facing: 'up' }], { par: 1, maxTurns: 2 });
    expect(run(slow, end, end).s.loseReason).toBe('time');
  });

  it('no actions after the level ends', () => {
    const s = run(mkState(OPEN6, [{ type: 'achilles', x: 1, y: 1 }, { type: 'spearman', x: 2, y: 1, facing: 'left' }]), act('achilles', 'strike', 2, 1)).s;
    expect(applyAction(s, end).error).toBeTruthy();
  });

  it('Kleos: fallen heroes and slow wins lose stars', () => {
    const s0 = mkState(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'spearman', x: 5, y: 5, facing: 'up' }], { objective: { type: 'survive', turns: 3 }, par: 2 });
    const { s } = run(s0, end, end, end);
    expect(kleos(s)).toEqual([true, true, false]);
  });
});

describe('session and undo', () => {
  it('undo steps back within the phase; undoLastTurn restores the phase start', () => {
    const lvl = mkLevel(OPEN6, [{ type: 'achilles', x: 0, y: 0 }, { type: 'spearman', x: 5, y: 5, facing: 'up' }, { type: 'archer', x: 5, y: 0, facing: 'down' }]);
    const ses = new Session(lvl, null);
    expect(ses.canUndo).toBe(false);
    expect(ses.dispatch(mv('achilles', 1, 0)).error).toBeUndefined();
    expect(ses.canUndo).toBe(true);
    ses.undo();
    expect(u(ses.state, 'achilles').x).toBe(0);
    expect(ses.undo()).toBe(false);
    ses.dispatch(mv('achilles', 2, 0));
    ses.dispatch(end);
    expect(ses.canUndo).toBe(false);
    ses.dispatch(mv('achilles', 2, 1));
    ses.undoLastTurn();
    expect(u(ses.state, 'achilles')).toMatchObject({ x: 2, y: 0, moved: false });
    expect(ses.dispatch(mv('nobody', 0, 0)).error).toBeTruthy();
    ses.restart();
    expect(ses.state.turn).toBe(1);
  });
});

describe('levels', () => {
  it('schema catches mistakes', () => {
    const bad = mkLevel(['..', '..'], [{ type: 'achilles', x: 5, y: 5 }]);
    expect(validateLevelSchema(bad).length).toBeGreaterThan(0);
    const noFacing = mkLevel(OPEN6, [{ type: 'achilles', x: 0, y: 0 }, { type: 'spearman', x: 1, y: 1 }]);
    expect(validateLevelSchema(noFacing).join()).toMatch(/facing/);
    const twice = mkLevel(OPEN6, [{ type: 'ajax', x: 0, y: 0 }, { type: 'ajax', x: 1, y: 0 }]);
    expect(validateLevelSchema(twice).join()).toMatch(/twice/);
  });

  it('every campaign level replays its solution to a win within par', () => {
    for (const l of LEVELS) {
      const r = replaySolution(l);
      expect(r.errors, l.id).toEqual([]);
      expect(r.ok).toBe(true);
    }
  });

  it('linter flags one-turn levels', () => {
    const easy = mkLevel(OPEN6, [{ type: 'achilles', x: 0, y: 0 }, { type: 'spearman', x: 2, y: 0, facing: 'up' }], { patrons: [] });
    expect(winnableInOneTurn(easy, null)).toBe('yes');
    expect(lintLevel(easy).errors.length).toBeGreaterThan(0);
  });

  it('loads ships and fire from the board, and maps solution steps', () => {
    const s = loadLevel(mkLevel(['S^..', '....', '....', '....'], [{ type: 'ajax', x: 3, y: 3 }]), null);
    expect(s.units.some((v) => v.type === 'ship')).toBe(true);
    expect(s.fire[1]).toBe(true);
    expect(stepToAction(['favor', 'poseidon', 0, 1, 'right'])).toEqual({ type: 'favor', god: 'poseidon', x: 0, y: 1, dir: 'right' });
  });
});

describe('board helpers', () => {
  it('directions and distances', () => {
    expect(dirBetween(0, 0, 3, 1)).toBe('right');
    expect(dirBetween(0, 0, 0, -2)).toBe('up');
    expect(lineDir(0, 0, 1, 1)).toBeNull();
    const s = mkState(['...', '.#.', '...', '...'], [{ type: 'ajax', x: 0, y: 0 }]);
    expect(distanceField(s, [{ x: 0, y: 0 }])[1 * 3 + 2]).toBe(3);
  });
});
