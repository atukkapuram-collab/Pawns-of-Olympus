import { beforeEach, describe, expect, it } from 'vitest';
import { LEVELS, levelById } from '../src/data/levels/index';
import { CARDS, cardLines, firstAppearances, newTopicsIn, objectiveShort, objectiveText, topicsIn, turnGoal, goalTiles, miniMap, loseText } from '../src/data/teach';
import { STRINGS } from '../src/data/strings';
import { hasGlyph, measureLine, measureText } from '../src/art/font';
import { drawDiagram } from '../src/art/diagram';
import { PALETTE_HEX } from '../src/art/palette';
import { Session } from '../src/core/session';
import { Tutorial, TUT_STEPS, type TutInput } from '../src/game/tutorial';
import { HINT_AFTER, attempts, firstTurnSteps, hintAvailable, hintText, hintsUnlocked, recordAttempt, unlockNextHint } from '../src/game/hints';
import { stepToAction } from '../src/core/level';
import { loadSave } from '../src/game/save';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe('intro cards: first appearances from level data', () => {
  it('finds where everything first appears', () => {
    const first = Object.fromEntries(firstAppearances(LEVELS));
    expect(first).toEqual({
      achilles: 'a1-01', spearman: 'a1-01', water: 'a1-01',
      ajax: 'a1-02', archer: 'a1-02', zeus: 'a1-02', rock: 'a1-02',
      athena: 'a1-03',
      protect: 'a1-04', fire: 'a1-04', brush: 'a1-04',
      odysseus: 'a1-05',
      diomedes: 'a2-01', poseidon: 'a2-01',
      chariot: 'a2-02',
      escort: 'a2-03', patroclus: 'a2-03',
      apollo: 'a2-04',
      hector: 'a2-05', ares: 'a2-05', gate: 'a2-05',
      shieldbearer: 'a3-01',
      aphrodite: 'a3-02',
      paris: 'a3-03',
      stealth: 'a3-04', light: 'a3-04',
    });
  });

  it('shows each card before exactly one level, and nothing for repeats', () => {
    const shown = LEVELS.flatMap((l) => newTopicsIn(l, LEVELS));
    expect(new Set(shown).size).toBe(shown.length);
    expect(newTopicsIn(levelById('a3-05')!, LEVELS)).toEqual([]);
    expect(newTopicsIn(levelById('a1-05')!, LEVELS)).toEqual(['odysseus']);
    // a level only introduces things it actually contains
    for (const l of LEVELS) for (const id of newTopicsIn(l, LEVELS)) expect(topicsIn(l)).toContain(id);
  });

  it('every topic that appears has a card, and every card has its words', () => {
    for (const l of LEVELS) for (const id of topicsIn(l)) expect(CARDS.some((c) => c.id === id)).toBe(true);
    for (const c of CARDS) {
      for (const k of [`card.${c.id}.name`, `card.${c.id}.lore`]) expect(STRINGS[k], k).toBeTruthy();
      for (const ln of cardLines(c)) {
        expect(ln.text.startsWith('card.'), `${c.id} line missing`).toBe(false);
        for (const ch of ln.text) expect(hasGlyph(ch), `${c.id}: "${ch}"`).toBe(true);
      }
      expect(measureLine(STRINGS[`card.${c.id}.name`]!)).toBeLessThan(200);
    }
  });

  it('briefing hero lines fit their column', () => {
    for (const h of ['achilles', 'ajax', 'odysseus', 'diomedes', 'patroclus']) expect(measureLine(STRINGS[`brief.ab.${h}`]!)).toBeLessThanOrEqual(120);
  });

  it('diagrams use only palette colors', () => {
    for (const c of CARDS) for (const d of c.diagrams) if (d) {
      const b = drawDiagram(d);
      for (const col of b.colorsUsed()) expect(col).toBeLessThan(PALETTE_HEX.length);
    }
  });
});

describe('briefing objective for every level', () => {
  const expected: Record<string, string> = {
    'a1-01': 'Defeat every Trojan.',
    'a1-02': 'Defeat every Trojan.',
    'a1-03': 'Defeat every Trojan.',
    'a1-04': 'Keep both ships afloat until the end of turn 4.',
    'a1-05': 'Defeat every Trojan.',
    'a2-01': 'Defeat every Trojan.',
    'a2-02': 'Defeat every Trojan.',
    'a2-03': 'Get Ajax to the gold tile.',
    'a2-04': 'Defeat every Trojan.',
    'a2-05': 'Get Diomedes to the gold tile.',
    'a3-01': 'Defeat every Trojan.',
    'a3-02': 'Defeat every Trojan.',
    'a3-03': 'Get Achilles to the gold tile.',
    'a3-04': 'Get every hero to the gate, unseen.',
    'a3-05': 'Defeat every Trojan.',
  };
  it.each(LEVELS.map((l) => l.id))('%s', (id) => {
    const l = levelById(id)!;
    expect(objectiveText(l)).toBe(expected[id]);
    // HUD version fits the strip; nothing left unfilled
    for (const s of [objectiveText(l), objectiveShort(l), loseText(l)]) expect(s).not.toMatch(/[{}]/);
    expect(measureLine(objectiveShort(l))).toBeLessThanOrEqual(170);
    // the briefing's lose line fits two lines, so the Kleos stars never move under the buttons
    expect(measureText(loseText(l), 152).lines.length).toBeLessThanOrEqual(2);
    // the turn counter's "of N"
    expect(turnGoal(l)).toBe(l.objective.type === 'protect' ? l.objective.turns : l.par);
    // goals are marked: escort target / stealth gates show in gold on the mini map
    const m = miniMap(l).rows.join('');
    if (l.objective.type === 'escort' || l.objective.type === 'stealth') expect(goalTiles(l).length).toBeGreaterThan(0);
    if (l.objective.type === 'escort') expect(m).toContain('g');
    if (l.objective.type === 'stealth') expect(m).toContain('Y');
    if (l.objective.type === 'protect') expect(m).toContain('P');
  });
});

describe('Level 1 tutorial', () => {
  const level = levelById('a1-01')!;

  function run() {
    const session = new Session(level, null);
    const tut = new Tutorial();
    const ctx = { selected: null as string | null, info: null as string | null };
    const c = (last?: TutInput) => ({ state: session.state, ...ctx, last });
    const doo = (input: TutInput): boolean => {
      if (!tut.allows(input, c())) return false;
      if (input.kind === 'select') ctx.selected = input.unit;
      else if (input.kind === 'inspect') ctx.info = input.unit;
      else if (input.kind === 'move') session.dispatch({ type: 'move', unit: input.unit, x: input.x, y: input.y });
      else if (input.kind === 'act') session.dispatch({ type: 'act', unit: input.unit, ability: 'strike', x: input.x, y: input.y });
      else if (input.kind === 'endTurn') session.dispatch({ type: 'endTurn' });
      else if (input.kind === 'undo') session.undo();
      tut.after(c(input));
      return true;
    };
    return { session, tut, doo };
  }

  it('walks select, move, strike, read, end turn, dodge, undo, finish in order', () => {
    const { session, tut, doo } = run();
    const seen: string[] = [tut.step];
    const go = (i: TutInput) => { expect(doo(i), `${tut.step}: ${JSON.stringify(i)}`).toBe(true); if (seen[seen.length - 1] !== tut.step) seen.push(tut.step); };
    go({ kind: 'select', unit: 'achilles' });
    go({ kind: 'move', unit: 'achilles', x: 4, y: 3 });
    go({ kind: 'act', unit: 'achilles', x: 4, y: 2 });
    go({ kind: 'inspect', unit: 'spearman-2' });
    go({ kind: 'endTurn' });
    go({ kind: 'move', unit: 'achilles', x: 4, y: 4 }); // dodge: off the red tile
    go({ kind: 'undo' });
    go({ kind: 'move', unit: 'achilles', x: 5, y: 2 });
    go({ kind: 'act', unit: 'achilles', x: 5, y: 3 });
    expect(seen).toEqual(TUT_STEPS);
    expect(session.state.phase).toBe('won');
    expect(tut.active).toBe(false);
  });

  it('refuses anything the current step does not ask for', () => {
    const { tut, doo } = run();
    expect(doo({ kind: 'move', unit: 'achilles', x: 2, y: 3 })).toBe(false); // must select first
    expect(doo({ kind: 'endTurn' })).toBe(false);
    doo({ kind: 'select', unit: 'achilles' });
    expect(doo({ kind: 'move', unit: 'achilles', x: 2, y: 3 })).toBe(false); // only the framed tile
    expect(tut.step).toBe('move');
    doo({ kind: 'move', unit: 'achilles', x: 4, y: 3 });
    expect(doo({ kind: 'act', unit: 'achilles', x: 5, y: 4 })).toBe(false); // the other spearman
    doo({ kind: 'act', unit: 'achilles', x: 4, y: 2 });
    expect(doo({ kind: 'endTurn' })).toBe(false); // read the intent first
    expect(tut.step).toBe('read');
  });

  it('hovering the wrong unit does not advance the read step; skip ends it', () => {
    const { tut, doo } = run();
    doo({ kind: 'select', unit: 'achilles' });
    doo({ kind: 'move', unit: 'achilles', x: 4, y: 3 });
    doo({ kind: 'act', unit: 'achilles', x: 4, y: 2 });
    doo({ kind: 'inspect', unit: 'achilles' });
    expect(tut.step).toBe('read');
    tut.skip();
    expect(tut.active).toBe(false);
  });

  it('every step has its words', () => {
    for (const s of TUT_STEPS.slice(0, -1)) {
      expect(STRINGS[`tut.${s}.text`]).toBeTruthy();
      expect(STRINGS[`tut.${s}.keys`]).toBeTruthy();
    }
  });
});

describe('hints', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
  });

  it('unlock after 2 restarts or defeats, never in the tutorial', () => {
    expect(hintAvailable('a1-03', false)).toBe(false);
    recordAttempt('a1-03');
    expect(hintAvailable('a1-03', false)).toBe(false);
    recordAttempt('a1-03');
    expect(attempts('a1-03')).toBe(HINT_AFTER);
    expect(hintAvailable('a1-03', false)).toBe(true);
    expect(hintAvailable('a1-03', true)).toBe(false);
    expect(hintAvailable('a1-04', false)).toBe(false); // per level
  });

  it('open one at a time, up to three, and persist', () => {
    expect(hintsUnlocked('a2-03')).toBe(0);
    expect(unlockNextHint('a2-03')).toBe(1);
    expect(unlockNextHint('a2-03')).toBe(2);
    expect(unlockNextHint('a2-03')).toBe(3);
    expect(unlockNextHint('a2-03')).toBe(3);
    expect(loadSave().hints['a2-03']).toBe(3);
  });

  it('every level has hand-written hints 1 and 2 and a playable hint 3', () => {
    for (const l of LEVELS) {
      for (const n of [1, 2] as const) {
        const h = hintText(l.id, n);
        expect(h, `${l.id} hint ${n}`).toBeTruthy();
        expect(h.length).toBeLessThanOrEqual(70);
        for (const ch of h) expect(hasGlyph(ch), `${l.id}: "${ch}"`).toBe(true);
      }
      const steps = firstTurnSteps(l);
      expect(steps.map((s) => s.action)).toEqual(l.solution.turns[0]!.map(stepToAction));
      for (const s of steps) expect(s.text).not.toMatch(/[{}]|hint\./);
    }
  });
});
