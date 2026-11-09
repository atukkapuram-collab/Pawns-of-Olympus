# Product Requirements

## Pitch
**Pawns of Olympus** is a short, deterministic tactics puzzle about the Trojan War. Every Trojan shows you what it will do next turn. You move Greek heroes like pieces on a clay board to make those attacks miss, hit each other, or land in the river. Above the field, the gods play their own game and treat everyone as pieces. *The gods are playing. You are the pieces.*

## Audience
Players who like puzzle-tactics (short levels, perfect information) and anyone curious about Greek myth. Sessions of 2–10 minutes. Approachable but thinky: no tactics experience needed for Act I.

## Platform
Web browser. Desktop (mouse + keyboard) and touch (phones/tablets in landscape). Static build hosted on GitHub Pages; itch.io-compatible.

## Pillars
1. **Readable.** Every threat is obvious at a glance, shown by shape and color. No hidden information, no randomness.
2. **Mythic.** The Iliad's people and places, told in spare lines. Gods are petty and powerful, shown by what they do.
3. **Tactile.** Stiff, punchy vase-figure motion: snappy slides, hit-stop, pottery that shatters. Every action feels like moving a piece.
4. **Fair.** Every level has a recorded solution within par. Undo is free within a turn. Defeat is a lesson, not a punishment.

## v1 scope (this draft)
**In:** 15 levels in 3 acts; 4 heroes + 1 guest; 6 enemy types incl. 2 bosses; 3 patron gods; 3 Trojan god events; act-intro and per-level vase-panel scenes; title, level select (vase frieze), patron select, battle, victory, defeat, settings, credits, pause; save/load; procedural music and SFX; keyboard, mouse and touch; accessibility options (high-contrast intents, reduced motion, shake toggle).
**Out:** multiplayer, level editor UI, accounts, analytics, localization, procedural levels, endless mode, cloud saves.

## Success criteria for this draft
- `npm run check` passes; all 15 levels validate with recorded solutions.
- A new player can finish Level 1 without instructions in under 2 minutes.
- Every screenshot passes the style checklist; nothing reads as generic AI output.
- Runs at a steady 60 fps on a mid-range laptop; initial download under 2 MB gzipped.
