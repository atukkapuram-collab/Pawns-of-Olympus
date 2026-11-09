/** Core types for the rules engine. Pure data: no Phaser, no DOM. */

export type Dir = 'up' | 'right' | 'down' | 'left';
/** Fixed order used for every deterministic tie-break. */
export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];
export const DV: Readonly<Record<Dir, { dx: number; dy: number }>> = {
  up: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
};
export const OPPOSITE: Readonly<Record<Dir, Dir>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export type TileKind = 'ground' | 'sand' | 'rock' | 'water' | 'brush' | 'gate' | 'light';

export type HeroType = 'achilles' | 'ajax' | 'odysseus' | 'diomedes' | 'patroclus';
export type TrojanType = 'spearman' | 'archer' | 'shieldbearer' | 'chariot' | 'hector' | 'paris';
export type ObjectType = 'ship';
export type UnitType = HeroType | TrojanType | ObjectType;
export type Team = 'greek' | 'trojan' | 'object';

export type IntentKind = 'thrust' | 'arrow' | 'charge' | 'sweep';
export type Ability = 'strike' | 'swap' | 'push';
export type DamageType = 'melee' | 'arrow' | 'charge' | 'impact' | 'divine' | 'fire';
export type PatronId = 'zeus' | 'athena' | 'poseidon';
export type TrojanGodId = 'apollo' | 'ares' | 'aphrodite';

export interface Intent {
  kind: IntentKind;
  dir: Dir;
}

export interface Unit {
  id: string;
  type: UnitType;
  team: Team;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: Dir;
  alive: boolean;
  moved: boolean;
  acted: boolean;
  intent: Intent | null;
  /** Aphrodite's mist: off the board until `returnTurn`. */
  mist?: { returnTurn: number; x: number; y: number } | undefined;
  /** Hero left the board through the gate (stealth). */
  escaped?: boolean | undefined;
}

export type Objective =
  | { type: 'rout' }
  | { type: 'survive'; turns: number }
  | { type: 'protect'; target: 'ships'; turns: number; minShips: number }
  | { type: 'escort'; unit: HeroType; x: number; y: number }
  | { type: 'stealth' };

export interface TrojanEvent {
  apollo?: { every: number; from: number } | undefined;
  ares?: { turns: number[] } | undefined;
  aphrodite?: { x: number; y: number } | undefined;
}

export interface GameState {
  levelId: string;
  width: number;
  height: number;
  tiles: TileKind[];
  fire: boolean[];
  units: Unit[];
  turn: number;
  phase: 'player' | 'enemy' | 'won' | 'lost';
  patron: PatronId | null;
  favorUsed: boolean;
  objective: Objective;
  trojanEvent: TrojanEvent | null;
  /** Tile indices Apollo's arrows will hit at the end of the next enemy phase. */
  plague: number[];
  /** Ares' rage applies to the coming enemy phase. */
  ares: boolean;
  aphroditeUsed: boolean;
  par: number;
  maxTurns: number;
  fallen: string[];
  loseReason: LoseReason | null;
  /** Turns used when the level was won. */
  turnsUsed: number;
}

export type LoseReason = 'heroes' | 'ships' | 'escort' | 'seen' | 'time';

export type Action =
  | { type: 'move'; unit: string; x: number; y: number }
  | { type: 'act'; unit: string; ability: Ability; x: number; y: number }
  | { type: 'favor'; god: PatronId; x: number; y: number; dir?: Dir | undefined }
  | { type: 'endTurn' };

export type GameEvent =
  | { t: 'move'; unit: string; path: Array<{ x: number; y: number }> }
  | { t: 'strike'; unit: string; target: string; dir: Dir }
  | { t: 'swap'; unit: string; target: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { t: 'push'; unit: string; dir: Dir; from: { x: number; y: number }; to: { x: number; y: number } }
  | { t: 'bump'; unit: string; dir: Dir; into: string | null }
  | { t: 'damage'; unit: string; amount: number; hp: number; kind: DamageType }
  | { t: 'blocked'; unit: string; reason: 'heel' | 'shield' | 'front' | 'shelter' }
  | { t: 'heel'; unit: string }
  | { t: 'defeat'; unit: string }
  | { t: 'swept'; unit: string; x: number; y: number }
  | { t: 'mist'; unit: string }
  | { t: 'return'; unit: string; x: number; y: number }
  | { t: 'escape'; unit: string }
  | { t: 'attack'; unit: string; intent: Intent; order: number; tiles: Array<{ x: number; y: number }> }
  | { t: 'charge'; unit: string; path: Array<{ x: number; y: number }> }
  | { t: 'fireSpread'; tiles: Array<{ x: number; y: number }> }
  | { t: 'fireOut'; tiles: Array<{ x: number; y: number }> }
  | { t: 'plague'; tiles: Array<{ x: number; y: number }> }
  | { t: 'favor'; god: PatronId; x: number; y: number; dir?: Dir | undefined }
  | { t: 'god'; god: TrojanGodId; what: 'mark' | 'rage' | 'mist' | 'return' }
  | { t: 'reposition'; unit: string; path: Array<{ x: number; y: number }>; intent: Intent }
  | { t: 'seen'; unit: string; by: string | null }
  | { t: 'phase'; phase: 'player' | 'enemy'; turn: number }
  | { t: 'won' }
  | { t: 'lost'; reason: LoseReason };

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
  error?: string | undefined;
}
