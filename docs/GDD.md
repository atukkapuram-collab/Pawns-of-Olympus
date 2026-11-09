# Game Design Document

The rules engine (`src/core/`) implements exactly this document. If they disagree, fix one of them and log why in DECISIONS.md.

## 1. Turn structure
1. **Level start:** enemies telegraph their first intents (direction from level data `facing`; targets chosen by the AI).
2. **Player phase.** Each hero may **move, then act**, once each, in that order. Acting first forfeits the move. Heroes can be activated in any order and switched between freely. The player may use the patron favor once per level at any time in the player phase. **Undo** reverts the last player action (unlimited within the phase). **Restart** reloads the level.
3. **End turn** → **enemy phase**, fully deterministic:
   1. Enemy intents resolve one by one in their shown **number order** (1, 2, 3…). An enemy that died or was swept away before its turn does nothing.
   2. **Hazards:** fire spreads, then Apollo's plague arrows land.
   3. Turn counter +1. Objectives are checked (win/lose).
   4. Living enemies reposition (one by one, in number order) and telegraph new intents. Trojan god events telegraph next turn's effect.
4. Back to the player phase.

## 2. Intents (the core idea)
- An intent is an **attack shape + a direction**, stored relative to the enemy, and drawn on the board during the player phase.
- **Intents keep their direction when the enemy is moved.** Push, swap or wave an enemy and its attack goes off from its new position in the same direction. That is how you make enemies hit each other, a wall or nothing.
- Attacks hit **any** unit in their tiles, including other Trojans and Greek ships.
- Shapes:
  - **Thrust** (Spearman): the adjacent tile in its direction. 1 melee damage.
  - **Arrow** (Archer, Paris): travels in its direction and hits the **first unit or ship** (stops at rock/walls/board edge). 1 arrow damage.
  - **Charge** (Chariot): the chariot moves in its direction until blocked, then deals 2 charge damage to the unit it ran into (none if it hits rock). Deep water stops the chariot at the bank.
  - **Sweep** (Hector): the 3 tiles in front of him (front-left, front, front-right). 2 melee damage each.
- Enemies of every kind block movement; heroes can't pass through any unit.

## 3. Damage
- Small numbers. Heroes 3–4 HP; regular enemies 1–3; bosses 5–6.
- Damage types: `melee` (strikes, thrusts, sweeps), `arrow`, `charge`, `impact` (push collisions), `divine` (Zeus), `fire`.
- A unit at 0 HP is defeated: it shatters into pottery shards (Trojans) or falls (heroes). Fallen heroes leave the board for the rest of the level.
- Defeat a Trojan while its intent is pending and the intent is cancelled.

## 4. Push and swap (the puzzle verbs)
- **Push** moves a unit 1 tile directly away from the source.
  - Into rock, a wall or the board edge: the pushed unit takes 1 impact damage.
  - Into another unit or a ship: **both** take 1 impact damage; nothing moves.
  - Into **deep water** (the Scamander): the unit is swept away (removed). Heroes swept away count as fallen.
  - Into fire or brush: it moves normally (fire burns at the hazard step).
- **Swap** (Odysseus): exchange positions with any unit in a straight line within 3 tiles, ignoring what lies between. Facings and intents stay with their units.
- Ships, rocks and gates can't be pushed or swapped.

## 5. Heroes (numbers in UNITS.md)
- **Achilles** (move 3, HP 4): Strike 2. *Heel:* immune to melee, charge and impact damage; any arrow hit (including Apollo's plague arrows) defeats him instantly.
- **Ajax** (move 2, HP 4): Strike 1. *Tower shield:* takes 1 less damage from every hit (min 0). An ally directly behind him relative to an attack's direction is protected from that attack (matters for plague arrows, which fall from the top of the board, and for arrows: Ajax stops them anyway).
- **Odysseus** (move 3, HP 3): Strike 1 **or** Cunning swap.
- **Diomedes** (move 2, HP 3): Spear push: 1 melee damage to an adjacent enemy and push it 1 tile (allies are pushed without damage).
- **Patroclus** (guest, move 3, HP 3): Strike 1. *Borrowed armor:* enemies target him first.
- Strikes target adjacent enemies only. Moves are orthogonal paths through empty passable tiles (no diagonals).

## 6. Enemies
- **Spearman** (HP 2, move 2): thrust.
- **Archer** (HP 1, move 2): arrow.
- **Shieldbearer** (HP 2, move 1): thrust. Takes **no damage from attacks hitting its front** (attacks coming from the tile it faces). Push and impact still hurt.
- **Chariot** (HP 2, move 0, it only charges): charge. After charging it turns to face the nearest hero.
- **Hector** (boss, HP 6, move 1): sweep, 2 damage.
- **Paris** (boss archer, HP 3, move 2): arrow; always aims at Achilles when he has a straight line to him.

### Enemy AI (deterministic)
For each enemy in number order: consider every tile it can reach (including staying) and each of the 4 directions; score the attack that would result *if no one moved*: +10 per hero hit (+20 for Patroclus, +30 Achilles for Paris), +8 per ship hit, −6 per Trojan hit; prefer fewer tiles moved; ties break by fixed direction order (up, right, down, left) then row-major tile order. If no attack scores above 0, step toward the nearest hero (BFS) and face it. Chariots don't move; they only choose a facing.

## 7. Tiles
| Char | Tile | Rules |
|---|---|---|
| `.` / `,` | ground / sand | passable |
| `#` | rock / wall | blocks movement and arrows |
| `~` | deep water (Scamander) | impassable; pushed units are swept away |
| `S` | Greek ship (HP 2) | blocks; takes damage; objective target |
| `^` | fire | units ending the enemy phase in fire take 1 fire damage |
| `%` | dry brush | fire spreads into adjacent brush 1 tile per enemy phase; a unit standing on brush **stops** the spread there but takes 1 fire damage |
| `G` | gate | passable objective tile |
| `*` | torchlight | stealth: a hero standing in light at the end of the player phase is seen |

## 8. Objectives
`rout` (defeat all Trojans) · `survive N turns` · `protect` (keep at least `minShips` ships until turn N) · `escort` (a named hero reaches a tile) · `stealth` (all heroes reach the gate, none seen; sentries see along their facing up to 3 tiles, and lit tiles count as seen).
**Lose:** every hero fallen, the objective fails (ships lost, escort fallen, seen), or `maxTurns` passes (default par + 4): "Night falls on the plain."

## 9. Kleos (3 stars per level)
1. Win. 2. No hero falls. 3. Win within the par turn count.

## 10. Patron favors (pick one patron per level; one use per level)
- **Zeus:** lightning deals 2 divine damage to any one tile.
- **Athena:** one hero who has acted gets a second action this turn.
- **Poseidon:** a wave along a chosen row or column pushes every unit in it 1 tile in the chosen direction, starting from the leading end (a chain moves together; only the lead can collide). Also puts out fire in that line.
Unlocks: Zeus from L1, Athena from L3, Poseidon from L6.

## 11. Trojan god events (level modifiers, always telegraphed a turn ahead)
- **Apollo:** at each telegraph step, marks the tiles where heroes stand; at the end of the next enemy phase plague arrows hit marked tiles for 1 arrow damage. Move off the marks.
- **Ares:** on listed turns, all Trojans deal +1 damage in the next enemy phase (red aura on intents).
- **Aphrodite:** the first Trojan defeated is wrapped in mist instead of shattering and returns 2 turns later on a marked tile, at full HP (if the tile is occupied, the nearest free tile).

## 12. Undo, restart, defeat
Undo: any number of steps within the current player phase. On defeat: Retry (restart level) or Undo last turn (back to the start of the last player phase).

## 13. Numbers table
| Unit | HP | Move | Attack | Damage | Notes |
|---|---|---|---|---|---|
| Achilles | 4 | 3 | Strike | 2 | Heel |
| Ajax | 4 | 2 | Strike | 1 | Tower shield −1 |
| Odysseus | 3 | 3 | Strike / Swap ≤3 | 1 | |
| Diomedes | 3 | 2 | Spear push | 1 + push | |
| Patroclus | 3 | 3 | Strike | 1 | Decoy |
| Spearman | 2 | 2 | Thrust | 1 | |
| Archer | 1 | 2 | Arrow | 1 | |
| Shieldbearer | 2 | 1 | Thrust | 1 | Front immune |
| Chariot | 2 | 0 | Charge | 2 | |
| Hector | 6 | 1 | Sweep (3 tiles) | 2 | Boss |
| Paris | 3 | 2 | Arrow | 1 | Aims at Achilles |
| Ship | 2 | — | — | — | Objective |
