/**
 * What the game teaches, and when. Pure data + functions (no Phaser):
 * - topics: every hero, Trojan, god, special tile and objective type
 * - firstAppearances: the level where each topic first shows up, worked out
 *   from the level data (never by hand)
 * - card specs: art, stat line and ability lines (+ tiny diagrams) per topic
 * - objective wording for the briefing and the HUD
 * All player-facing words live in strings.ts (keys `card.*`, `goal.*`).
 */
import type { LevelData } from '../core/level';
import { STANDARD_LEGEND } from '../core/level';
import type { HeroType, Objective, PatronId, TrojanGodId, TrojanType } from '../core/types';
import { UNITS } from './units';
import { t } from './strings';

export type TopicKind = 'hero' | 'trojan' | 'god' | 'tgod' | 'tile' | 'goal';
export type TileTopic = 'water' | 'rock' | 'fire' | 'brush' | 'gate' | 'light';
export type GoalTopic = 'protect' | 'escort' | 'stealth' | 'survive';
export type TopicId = HeroType | TrojanType | PatronId | TrojanGodId | TileTopic | GoalTopic;

/**
 * Tiny diagram on a card. `rows` is a grid of cell codes:
 *   . ground  # rock  ~ water  ^ fire  % brush  G gate  * light
 *   x threat  g goal  v sentry sight  p Apollo's mark  q Aphrodite's mark
 *   H hero  T Trojan  S ship  (lowercase h t s: the same, standing in red)
 *   B Trojan under Zeus' bolt  R Trojan in Ares' rage  a hero acting again
 *   f hero in fire  l hero in light  k hero in brush
 *   gold goals: P protected ship  Y goal gate  Q Trojan to defeat
 * `arrows`: [x0, y0, x1, y1, both?] from cell centre to cell centre.
 */
export interface Diagram {
  rows: string[];
  arrows?: Array<[number, number, number, number, boolean?]>;
}

export type CardArt =
  | { type: 'unit'; unit: string }
  | { type: 'portrait'; god: string }
  | { type: 'tile'; tile: TileTopic }
  | { type: 'ship' }
  | { type: 'diagram'; diagram: Diagram };

export interface CardSpec {
  id: TopicId;
  kind: TopicKind;
  art: CardArt;
  /** One diagram per ability line (`card.<id>.1`, `.2`, ...). */
  diagrams: Array<Diagram | null>;
}

const D = (rows: string[], arrows?: Diagram['arrows']): Diagram => (arrows ? { rows, arrows } : { rows });

/** Card specs in Codex order (by kind, then campaign order). */
export const CARDS: CardSpec[] = [
  // heroes
  { id: 'achilles', kind: 'hero', art: { type: 'unit', unit: 'achilles' }, diagrams: [D(['Ht']), D(['T.h'], [[0, 0, 1, 0]]), D(['T..h'], [[0, 0, 3, 0]])] },
  { id: 'ajax', kind: 'hero', art: { type: 'unit', unit: 'ajax' }, diagrams: [D(['Th'], [[0, 0, 1, 0]]), D(['T.hH'], [[0, 0, 2, 0]])] },
  { id: 'odysseus', kind: 'hero', art: { type: 'unit', unit: 'odysseus' }, diagrams: [D(['Ht']), D(['H..T'], [[0, 0, 3, 0, true]])] },
  { id: 'diomedes', kind: 'hero', art: { type: 'unit', unit: 'diomedes' }, diagrams: [D(['Ht.'], [[1, 0, 2, 0]]), D(['Ht~'], [[1, 0, 2, 0]])] },
  { id: 'patroclus', kind: 'hero', art: { type: 'unit', unit: 'patroclus' }, diagrams: [D(['Ht']), D(['T.h.T'], [[0, 0, 2, 0], [4, 0, 2, 0]])] },
  // Trojans
  { id: 'spearman', kind: 'trojan', art: { type: 'unit', unit: 'spearman' }, diagrams: [D(['.xT'], [[2, 0, 1, 0]])] },
  { id: 'archer', kind: 'trojan', art: { type: 'unit', unit: 'archer' }, diagrams: [D(['h..T'], [[3, 0, 0, 0]]), D(['H#.T'], [[3, 0, 1, 0]])] },
  { id: 'shieldbearer', kind: 'trojan', art: { type: 'unit', unit: 'shieldbearer' }, diagrams: [D(['.xT'], [[2, 0, 1, 0]]), D(['xTH'], [[2, 0, 1, 0]])] },
  { id: 'chariot', kind: 'trojan', art: { type: 'unit', unit: 'chariot' }, diagrams: [D(['h..T'], [[3, 0, 1, 0]]), null] },
  { id: 'hector', kind: 'trojan', art: { type: 'unit', unit: 'hector' }, diagrams: [D(['x.', 'xT', 'x.'])] },
  { id: 'paris', kind: 'trojan', art: { type: 'unit', unit: 'paris' }, diagrams: [D(['h..T'], [[3, 0, 0, 0]]), null] },
  // patron gods
  { id: 'zeus', kind: 'god', art: { type: 'portrait', god: 'zeus' }, diagrams: [D(['.B.'])] },
  { id: 'athena', kind: 'god', art: { type: 'portrait', god: 'athena' }, diagrams: [D(['at.'])] },
  { id: 'poseidon', kind: 'god', art: { type: 'portrait', god: 'poseidon' }, diagrams: [D(['T.T.'], [[0, 0, 1, 0], [2, 0, 3, 0]]), D(['^^', '..'], [[0, 0, 0, 1], [1, 0, 1, 1]])] },
  // Trojan gods
  { id: 'apollo', kind: 'tgod', art: { type: 'portrait', god: 'apollo' }, diagrams: [D(['pH'], [[0, 0, 1, 0]])] },
  { id: 'ares', kind: 'tgod', art: { type: 'portrait', god: 'ares' }, diagrams: [D(['Rh'], [[0, 0, 1, 0]])] },
  { id: 'aphrodite', kind: 'tgod', art: { type: 'portrait', god: 'aphrodite' }, diagrams: [D(['T..q'], [[0, 0, 3, 0]])] },
  // ground
  { id: 'water', kind: 'tile', art: { type: 'tile', tile: 'water' }, diagrams: [D(['H~.']), D(['Ht~'], [[1, 0, 2, 0]])] },
  { id: 'rock', kind: 'tile', art: { type: 'tile', tile: 'rock' }, diagrams: [D(['H#.']), D(['T.#H'], [[0, 0, 2, 0]])] },
  { id: 'fire', kind: 'tile', art: { type: 'tile', tile: 'fire' }, diagrams: [D(['.f.']), D(['^S'])] },
  { id: 'brush', kind: 'tile', art: { type: 'tile', tile: 'brush' }, diagrams: [D(['^%%'], [[0, 0, 1, 0]]), D(['^k%'])] },
  { id: 'gate', kind: 'tile', art: { type: 'tile', tile: 'gate' }, diagrams: [D(['H.G'], [[0, 0, 2, 0]])] },
  { id: 'light', kind: 'tile', art: { type: 'tile', tile: 'light' }, diagrams: [D(['.l.'])] },
  // objectives
  { id: 'protect', kind: 'goal', art: { type: 'ship' }, diagrams: [D(['S.S']), D(['Ts'], [[0, 0, 1, 0]])] },
  { id: 'escort', kind: 'goal', art: { type: 'diagram', diagram: D(['H..', '..g']) }, diagrams: [D(['H..g'], [[0, 0, 3, 0]]), null] },
  { id: 'stealth', kind: 'goal', art: { type: 'tile', tile: 'gate' }, diagrams: [D(['H..G'], [[0, 0, 3, 0]]), D(['Tvvv'])] },
  { id: 'survive', kind: 'goal', art: { type: 'diagram', diagram: D(['T.', '.H']) }, diagrams: [null] },
];

export function card(id: string): CardSpec | undefined {
  return CARDS.find((c) => c.id === id);
}

/** Every topic a level contains, in the order the cards should be shown. */
export function topicsIn(level: LevelData): TopicId[] {
  const out: TopicId[] = [];
  const add = (id: TopicId) => { if (!out.includes(id) && card(id)) out.push(id); };
  const o = level.objective;
  if (o.type !== 'rout') add(o.type);
  for (const u of level.units) if (UNITS[u.type].team === 'greek') add(u.type as HeroType);
  for (const u of level.units) if (UNITS[u.type].team === 'trojan') add(u.type as TrojanType);
  for (const p of level.patrons) add(p);
  const te = level.trojanEvent;
  if (te?.apollo) add('apollo');
  if (te?.ares) add('ares');
  if (te?.aphrodite) add('aphrodite');
  const legend = { ...STANDARD_LEGEND, ...(level.legend ?? {}) };
  const kinds = new Set(level.board.flatMap((r) => [...r].map((ch) => legend[ch])));
  for (const k of ['water', 'rock', 'fire', 'brush', 'gate', 'light'] as const) if (kinds.has(k)) add(k);
  return out;
}

/** Topic -> id of the first level (campaign order) where it appears. */
export function firstAppearances(levels: LevelData[]): Map<TopicId, string> {
  const m = new Map<TopicId, string>();
  for (const l of levels) for (const id of topicsIn(l)) if (!m.has(id)) m.set(id, l.id);
  return m;
}

/** Topics that appear for the first time in this level. */
export function newTopicsIn(level: LevelData, levels: LevelData[]): TopicId[] {
  const first = firstAppearances(levels);
  return topicsIn(level).filter((id) => first.get(id) === level.id);
}

// ---------------------------------------------------------------------------
// Card words
// ---------------------------------------------------------------------------

export function cardName(id: string): string {
  return t(`card.${id}.name`);
}

/** Ability / rule lines of a card, paired with their diagrams. */
export function cardLines(c: CardSpec): Array<{ text: string; diagram: Diagram | null }> {
  return c.diagrams.map((d, i) => ({ text: t(`card.${c.id}.${i + 1}`), diagram: d }));
}

/** "HP 4  Move 3  Damage 2" for units; a short tag for everything else. */
export function cardStats(c: CardSpec): string {
  if (c.kind === 'hero' || c.kind === 'trojan') {
    const s = UNITS[c.id as HeroType | TrojanType];
    return s.move > 0 ? `HP ${s.hp}   Move ${s.move}   Damage ${s.damage}` : `HP ${s.hp}   Damage ${s.damage}`;
  }
  return t(`card.kind.${c.kind}`);
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

function shipCount(level: LevelData): number {
  const legend = { ...STANDARD_LEGEND, ...(level.legend ?? {}) };
  return level.board.join('').split('').filter((ch) => legend[ch] === 'ship').length;
}

/** The objective in big plain words (briefing). */
export function objectiveText(level: LevelData): string {
  const o: Objective = level.objective;
  switch (o.type) {
    case 'rout': return t('goal.rout');
    case 'survive': return t('goal.survive', { n: o.turns });
    case 'protect': {
      const total = shipCount(level);
      const which = o.minShips >= total ? (total === 2 ? 'both ships' : `all ${NUM[total] ?? total} ships`) : `${NUM[o.minShips] ?? o.minShips} of the ${NUM[total] ?? total} ships`;
      return t('goal.protect', { which, n: o.turns });
    }
    case 'escort': return t('goal.escort', { hero: UNITS[o.unit].name });
    case 'stealth': return t('goal.stealth');
  }
}

/** The objective, short enough for the HUD strip. */
export function objectiveShort(level: LevelData): string {
  const o = level.objective;
  switch (o.type) {
    case 'rout': return t('goal.short.rout');
    case 'survive': return t('goal.short.survive', { n: o.turns });
    case 'protect': return t('goal.short.protect', { m: o.minShips, n: o.turns });
    case 'escort': return t('goal.short.escort', { hero: UNITS[o.unit].name });
    case 'stealth': return t('goal.short.stealth');
  }
}

/** How the level is lost, one line. */
export function loseText(level: LevelData): string {
  const o = level.objective;
  const night = level.maxTurns ?? level.par + 4;
  const extra = o.type === 'protect' ? (o.minShips >= shipCount(level) ? t('lose.line.ship') : t('lose.line.ships', { m: o.minShips })) : o.type === 'escort' ? t('lose.line.escort', { hero: UNITS[o.unit].name }) : o.type === 'stealth' ? t('lose.line.seen') : '';
  return t('lose.line', { extra, n: night });
}

/** The three Kleos star conditions. */
export function starTexts(level: LevelData): [string, string, string] {
  return [t('star.win'), t('star.nofall'), t('star.par', { n: level.par })];
}

/**
 * The turn count shown in the HUD: "Turn 2 of 4". The "of" is the turn the
 * objective ends on (protect/survive) or the par for everything else.
 */
export function turnGoal(level: LevelData): number {
  const o = level.objective;
  return o.type === 'protect' || o.type === 'survive' ? o.turns : level.par;
}

/** Tiles the player must reach (escort target, stealth gates): drawn with a pulsing marker. */
export function goalTiles(level: LevelData): Array<{ x: number; y: number }> {
  const o = level.objective;
  if (o.type === 'escort') return [{ x: o.x, y: o.y }];
  if (o.type === 'stealth') {
    const legend = { ...STANDARD_LEGEND, ...(level.legend ?? {}) };
    const out: Array<{ x: number; y: number }> = [];
    level.board.forEach((row, y) => [...row].forEach((ch, x) => { if (legend[ch] === 'gate') out.push({ x, y }); }));
    return out;
  }
  return [];
}

/** The level board as a mini-map diagram, with the goal picked out in gold. */
export function miniMap(level: LevelData): Diagram {
  const legend = { ...STANDARD_LEGEND, ...(level.legend ?? {}) };
  const o = level.objective;
  const code: Record<string, string> = { ground: '.', sand: '.', rock: '#', water: '~', fire: '^', brush: '%', gate: 'G', light: '*', ship: o.type === 'protect' ? 'P' : 'S' };
  const rows = level.board.map((r) => [...r].map((ch) => code[legend[ch] ?? 'ground'] ?? '.'));
  if (o.type === 'stealth') rows.forEach((r) => r.forEach((c, x) => { if (c === 'G') r[x] = 'Y'; }));
  if (o.type === 'escort') rows[o.y]![o.x] = 'g';
  for (const u of level.units) {
    const team = UNITS[u.type].team;
    rows[u.y]![u.x] = team === 'greek' ? 'H' : o.type === 'rout' ? 'Q' : 'T';
  }
  return { rows: rows.map((r) => r.join('')) };
}
