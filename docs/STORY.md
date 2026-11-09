# Story

## Frame
The gods sit around a board on Olympus. The war below is their game; the heroes are their pieces. The player moves the Greek pieces. The gods comment, cheat and lose interest. Mortals never see the board; the player always does. Tagline: "The gods are playing. You are the pieces."

## Acts
- **Act I: The Beaches** (L1-L5). The Greeks land and hold the shore and the ships. The landing is pre-Iliad tradition; the fight at the ships echoes Books 13-15. Act I ends with the quarrel (Book 1): Agamemnon takes Briseis and Achilles goes to his tent (L5 has no Achilles).
- **Act II: The Plain of Troy** (L6-L10). Achilles sulks in his tent (Iliad 1-16) and never takes the field. The Scamander, the chariots, Patroclus in borrowed armor (Book 16), Apollo's arrows (an echo of the Book 1 plague), Hector at the Scaean Gates in Achilles' stolen armor (Book 17). Ends as word of Patroclus reaches Achilles (Book 18).
- **Act III: The Walls** (L11-L15). Achilles returns with new armor from Hephaestus (Books 18-19), kills Hector (Book 22), Aphrodite's mist (Book 3), Paris on the walls, the wooden horse, the gates open. Achilles' death, Paris's death and the horse are post-Iliad (Epic Cycle; Odyssey 8 for the horse); never attribute them to the Iliad.

## Scene format
- Act intro: title, epigraph, then 4 vase panels, one line each (`act.<n>.*`). Skippable.
- Patron screen: one line (`lvl.<id>.intro`).
- Pre-level: 2-4 lines (`lvl.<id>.pre.N`). "Name: text" marks a speaker (mortal or god); lines without a name are narration.
- Victory panel: one line (`lvl.<id>.outro`). Post-level: 1-2 lines (`lvl.<id>.post.N`).
- God banter: 3 lines per god (`god.<name>.N`), shown when a patron's favor is used or a Trojan god's event fires.
- Defeat: `lose.heroes`, `lose.ships`, `lose.escort`, `lose.seen`, `lose.time`.
- All text lives in `src/data/strings.ts`.

## Act intros
| Act | Panels |
|---|---|
| I | The gods set out a board. The black ships beach. Zeus moves first. The mortals never see the board. |
| II | Agamemnon takes Briseis. Achilles sits in his tent. The Myrmidons idle. The gods move the other pieces. |
| III | Patroclus has fallen; Achilles rises. Hephaestus forges a shield. Peace with Agamemnon, barely. The gods lean closer. |

## Scene list
| # | Id | Pre-scene | Post-scene |
|---|---|---|---|
| 1 | a1-01 | Zeus opens the game; Achilles takes the first move; Athena is dry about it. | The beach is held; Zeus yawns. |
| 2 | a1-02 | Ajax on arrows; Zeus offers exactly one bolt. | Zeus counts his bolts. |
| 3 | a1-03 | Ajax calls everyone behind his seven-hide shield; Zeus is bored by walls. | Not one arrow passes Ajax. |
| 4 | a1-04 | Torches at the ships; Ajax and Achilles say keep two hulls; Zeus admires the dry brush. | Smoke, but the hulls float; Athena: they will need them later. |
| 5 | a1-05 | The quarrel: Briseis taken, Achilles to his tent; Odysseus will borrow Trojan spears. | Trojan hits Trojan; Athena claims Odysseus. |
| 6 | a2-01 | Diomedes at the ford; Poseidon notes the river is not his; the Scamander remembers. | The river carries the bronze to the sea; it will remember (Book 21 foreshadow). |
| 7 | a2-02 | Odysseus and Diomedes on chariots; Ares enjoys it. | Horses run home empty; Ares sulks over his chariot. |
| 8 | a2-03 | Patroclus borrows Achilles' armor; Achilles: save the ships, then come back; Zeus: let him have his day. | **Patroclus falls whatever the board said:** Apollo strikes his back, Hector takes the armor (Book 16-17). |
| 9 | a2-04 | Apollo's past plague; his marks; Odysseus: do not stand in his light. | Arrows rattle on empty ground; Apollo vows to lead the target. |
| 10 | a2-05 | **Hector:** the gates where he left Andromache (Book 6); he wears Achilles' armor and asks for him; Ares admires him. | Hector withdraws, unbeaten; word of Patroclus reaches Achilles' tent (the duel is set up). |
| 11 | a3-01 | Achilles returns with new armor and one thought: Hector. Zeus finally pays attention. | Three times around the walls; Athena's borrowed voice (as Deiphobus); Hector falls (Book 22). |
| 12 | a3-02 | Aphrodite's mist saved Paris from Menelaus (Book 3); Diomedes wounded her once (Book 5). | The mist lifts empty; Aphrodite pouts. |
| 13 | a3-03 | **Paris** aims for Achilles; Ajax raises the shield; Apollo whispers "lower" (post-Homeric heel). | Paris lowers his bow; **his fate as a vase scene:** later, the bow of Heracles (Philoctetes, Little Iliad) finds him. No gore. |
| 14 | a3-04 | Inside Ilion from the horse; Odysseus on torchlight; Athena claims the idea (Odyssey 8). | Ilion sleeps; the Scaean Gates open from inside. |
| 15 | a3-05 | The gates open; three Trojan gods lean in; Zeus calls the last move. | Ilion falls; the board is folded; Zeus: put the pieces away, gently. |

## Tone rules
Spare, mythic, a little wry about the gods. Short lines: patron line at most ~60 characters, victory line at most ~44, panels at most ~48, banter at most ~40, everything else at most 50 per line and 2 lines per box. Concrete nouns (bronze, black ships, the Scamander, Ilion, the Scaean Gates). Gods are shown petty through actions and asides; never explain the joke. Stylized violence only; pieces shatter like pottery; deaths happen off the board or as a vase scene, never described in detail.

Characters: only ASCII letters, digits, space and `. , : ; ! ? ' " - + = / ( ) [ ] % & < > _ #`. No em dashes, curly quotes, accents or ellipsis characters. Exclamation marks: none are used in story text.

**Banned phrases:** "embark on an epic journey", "unleash", "in a world where", "delve", "tapestry", "testament to", "elevate", "seamless", "immersive experience", "Are you ready?", exclamation-mark spam, em-dash-heavy prose, and any line a generic fantasy game could also use.

## Allowed sources for epigraphs (public domain only)
Samuel Butler (1898, prose); Lang, Leaf & Myers (1883, prose); Alexander Pope (1715-20, verse). One short line per screen at most; credit each in CREDITS.md. Never quote modern translations.

## Epigraphs used
| Key | Text | Source |
|---|---|---|
| `act.1.epigraph` | For so were the counsels of Jove fulfilled. | Homer, Iliad 1, tr. Samuel Butler (1898). Capital "F" added; in Butler it is mid-sentence. |
| `act.2.epigraph` | Like leaves on trees the race of man is found | Homer, Iliad 6, tr. Alexander Pope (1715-20) |
| `act.3.epigraph` | Achilles' wrath, to Greece the direful spring | Homer, Iliad 1 (opening line), tr. Alexander Pope (1715-20) |
