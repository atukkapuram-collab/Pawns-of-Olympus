# Levels

Format and principles: `.claude/skills/pawns-level-design/SKILL.md`. Rules: `docs/GDD.md`. Data: `src/data/levels/*.json`.

## Campaign (15 levels; one new idea each)
| # | Id | Title | Teaches | Patrons | Trojan god | Par |
|---|---|---|---|---|---|---|
| 1 | a1-01 | The Landing | Guided tutorial: select, move, strike, read an intent, End turn, dodge, Undo | none | — | 3 |
| 2 | a1-02 | Arrows from the Dunes | Archers and lines of fire | Zeus | — | 3 |
| 3 | a1-03 | Ajax Holds | Tower shield; stand in the line to shelter others | Zeus, Athena | — | 4 |
| 4 | a1-04 | Fire at the Ships | Protect an objective; fire spreads along brush | Zeus, Athena | — | 4 |
| 5 | a1-05 | The Man of Many Turns | Swap an enemy so its attack hits another Trojan | Zeus, Athena | — | 4 |
| 6 | a2-01 | The River Scamander | Push into deep water | all | — | 3 |
| 7 | a2-02 | Chariots | Charge lanes; redirect a charge into Trojans | all | — | 3 |
| 8 | a2-03 | In Borrowed Armor | Patroclus draws every attack; decoy routing | all | — | 4 |
| 9 | a2-04 | Apollo's Plague | Telegraphed plague arrows; keep moving | all | Apollo | 3 |
| 10 | a2-05 | Hector at the Gates | Boss sweep, Ares' rage; escort Diomedes to the gate | all | Ares | 4 |
| 11 | a3-01 | The Wrath | Achilles alone: the order of kills, shieldbearer fronts, archer lines | all | — | 4 |
| 12 | a3-02 | Mist of Aphrodite | A defeated Trojan returns; kill early so it comes back in time | all | Aphrodite | 3 |
| 13 | a3-03 | Paris on the Walls | Walk Ajax ahead of Achilles up the stair in Paris's line; reach the gate | all | — | 3 |
| 14 | a3-04 | The Wooden Gift | Stealth: avoid torchlight and sentry sight | all | — | 3 |
| 15 | a3-05 | The Gates Open | Finale: swap Hector into his own men under Apollo, Ares and Aphrodite | all | Apollo, Ares, Aphrodite | 4 |

Kleos on every level: win; no hero falls; win within par. Pars were checked with an exhaustive solver for L11-L14 (true minimum); L15 par is a found solution.

## Teaching per level
New things get an intro card before the level (computed from the level data, `src/data/teach.ts`); every level gets a briefing; every level has two hand-written hints (`hint.<id>.1/.2` in strings.ts), and hint 3 replays the first turn of its recorded solution.

| Level | New cards | Hint 1 idea |
|---|---|---|
| a1-01 | Achilles, Spearman, Deep water | Move, then strike (tutorial) |
| a1-02 | Ajax, Archer, Zeus, Rock | Ajax stands in the arrow line |
| a1-03 | Athena | Ajax stops arrows for Achilles |
| a1-04 | Protect, Fire, Dry brush | Stand in the brush to stop the fire |
| a1-05 | Odysseus | A swapped Trojan strikes where it faces |
| a2-01 | Diomedes, Poseidon | Push into the river |
| a2-02 | Chariot | Feed a chariot its own men |
| a2-03 | Escort, Patroclus | Patroclus draws every attack |
| a2-04 | Apollo | Keep moving; Diomedes can push friends |
| a2-05 | Hector, Ares, Gate | Let Hector swing at his own |
| a3-01 | Shieldbearer | Mind the archer and who stands by it |
| a3-02 | Aphrodite | Choose who falls first, early |
| a3-03 | Paris | Ajax is the body arrows stop at |
| a3-04 | Stealth, Torchlight | Only the middle lane is dark |
| a3-05 | (none) | Let the Trojans do the killing |

Level 1's turn-2 solution is now "move Achilles above the spearman, then strike", matching the tutorial's last step. Note: the a3-05 teaching text says "swap Hector into his own men", but its recorded solution never swaps Hector (Hector's sweep and Paris's arrow do the work); the hints describe the recorded solution.
