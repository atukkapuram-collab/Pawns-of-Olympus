/** Unit stats. Authoritative numbers (mirrored in docs/GDD.md §13). */
import type { Ability, IntentKind, Team, UnitType } from '../core/types';

export interface UnitStats {
  name: string;
  team: Team;
  hp: number;
  move: number;
  /** Heroes: abilities they can use as their action. */
  abilities?: Ability[];
  /** Strike damage (heroes) or intent damage (Trojans). */
  damage: number;
  /** Trojans: attack shape. */
  intent?: IntentKind;
}

export const UNITS: Record<UnitType, UnitStats> = {
  achilles: { name: 'Achilles', team: 'greek', hp: 4, move: 3, abilities: ['strike'], damage: 2 },
  ajax: { name: 'Ajax', team: 'greek', hp: 4, move: 2, abilities: ['strike'], damage: 1 },
  odysseus: { name: 'Odysseus', team: 'greek', hp: 3, move: 3, abilities: ['strike', 'swap'], damage: 1 },
  diomedes: { name: 'Diomedes', team: 'greek', hp: 3, move: 2, abilities: ['push'], damage: 1 },
  patroclus: { name: 'Patroclus', team: 'greek', hp: 3, move: 3, abilities: ['strike'], damage: 1 },
  spearman: { name: 'Spearman', team: 'trojan', hp: 2, move: 2, damage: 1, intent: 'thrust' },
  archer: { name: 'Archer', team: 'trojan', hp: 1, move: 2, damage: 1, intent: 'arrow' },
  shieldbearer: { name: 'Shieldbearer', team: 'trojan', hp: 2, move: 1, damage: 1, intent: 'thrust' },
  chariot: { name: 'Chariot', team: 'trojan', hp: 2, move: 0, damage: 2, intent: 'charge' },
  hector: { name: 'Hector', team: 'trojan', hp: 6, move: 1, damage: 2, intent: 'sweep' },
  paris: { name: 'Paris', team: 'trojan', hp: 3, move: 2, damage: 1, intent: 'arrow' },
  ship: { name: 'Ship', team: 'object', hp: 2, move: 0, damage: 0 },
};

export const HERO_TYPES = ['achilles', 'ajax', 'odysseus', 'diomedes', 'patroclus'] as const;
export const SWAP_RANGE = 3;
