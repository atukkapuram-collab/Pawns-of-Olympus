# Gods

Every god has: a role, an exact effect, a portrait (48×56, hourglass body, gold meander hem, one item, dithered halo ring in a signature color), a battle manifestation (64–96 px silhouette rising behind the board with a dither fade) and a sound.

## Patrons (chosen before a level; favor usable once per level)
| God | Unlock | Effect | Halo | Item | Sound |
|---|---|---|---|---|---|
| **Zeus** | L1 | Lightning: 2 divine damage to any one tile | gold `#e0a83a` | zigzag thunderbolt | sharp crack + low rumble |
| **Athena** | L3 | One hero who has already acted gets a second action this turn | iron-white `#dfe6ee` | spear + aegis with ink Gorgoneion | owl-like two-note hoot, bright pluck |
| **Poseidon** | L6 | Wave along a row/column pushes every unit 1 tile in a chosen direction; puts out fire in that line | sea `#1f7a8a` | trident | rising whoosh + spray noise |

Zeus is neutral in the war (he favors no side); he lends his bolt to whoever amuses him.

## Trojan gods (level modifiers, telegraphed a turn ahead)
| God | Levels | Effect | Halo | Item | Sound |
|---|---|---|---|---|---|
| **Apollo** | L9, L15 | Marks the tiles heroes stand on; plague arrows hit them for 1 at the end of the next enemy phase | sun `#f08a4b` | silver bow, sun disc | descending whistle, thin twang ×3 |
| **Ares** | L10, L11, L15 | On listed turns, Trojans deal +1 damage next enemy phase (red aura on intents) | red `#d8342c` | spear, crested helm | drum hit + growl |
| **Aphrodite** | L12, L15 | First Trojan defeated is taken away in a mist and returns 2 turns later on a marked tile | rose `#e88aa8` | dove, golden apple | soft harp gliss |

## Banter
Each god has 2–4 one-line remarks (in `src/data/strings.ts`, keys `god.<name>.*`) shown in a small vase-panel box when they act. Tone: bored, petty, amused. Never explain the joke.
