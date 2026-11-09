# Playtest and review log

*One entry per review round: what was reviewed, by whom, what was fixed, what is still open.*

## Round 1: M1 style review (style-reviewer via general-purpose agent)
Reviewed: gallery sections and the composed sample battle scene.
Verdict: needs work. Top issues: board blends into ground; selection hidden under the unit; threat on an occupied tile unreadable; Zeus head reads as a hood; figures too close to the mockup (big heads, torso hidden by shield); "+" shield bosses read as crosses; night remap doesn't recolor figures; red-on-clay HUD warning has low contrast; move range drawn on occupied tiles; plinth meander merges with its rule; spearheads read as torches; HUD duplicates the title, M not splayed.
Fixed: pending (round 2 after M2).
Round 1 fixes applied in commit "M1 round 2" (figures, Zeus, meander, plinth, selection, night remap, font M/W) and in M3 (threats on occupied tiles, HUD card, contrast).

## Round 2: style review of the real game screens (M3)
Verdict: needs work. Fixed now: HUD title strip (level number + name only; turn moved to the column), selection brackets sized to the sprite in ink + gold, pips at their unit's row depth, red glyph chip beside the badge on occupied threatened tiles, rock tiles as flat black-figure blocks with cracks, Result: wider Undo last turn button, denser veil, level name under Victory, centred stars; Athena's aegis no longer reads as a smiley.
Still open: title screen frieze composition (M6), lettered logo at native size (M6), bottom frieze band on battle backdrop, dim non-hovered intents, pips for 1-HP units, key hints on Undo/Restart.
