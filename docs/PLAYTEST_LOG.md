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

## Round 3: style review of all screens (title, level select, patron, cutscenes, settings, credits, battles, result)
Verdict: needs work. Fixed: credits wrapping, result headline strip + taller panel + spaced buttons, level select Back/tablet collision, HUD card wrapping and copy ("Arrows kill him." only when arrows exist), vertical HP pips when the tile above is occupied, order badges anchored on the tile, all god portraits on one ink/umber ground (Ares red robe, Aphrodite's fillet), settings labels in ink and "Threat hatch", wider + and - glyphs, Hector single crest, Paris wine skirt, title halos inside the frame + meander band under the wall, cutscene sky bands and sun, page counter in the caption band.
Still open: chariot driver scale and horse silhouette; cutscene art doesn't depict each caption literally (generic cast); amphora contour stair-steps.

## QA round 2 (whole game, 15 levels through the UI)
Campaign plays end to end with real clicks (both act boundaries, ending, Continue). 11 new bugs (BUG-13..23, 2 major): all fixed. Notable: allies are no longer accidentally pushed/swapped (explicit "Aim at ally" / ability choice), level select blurbs fit, pause/restart queue during animations, rotate overlay stays on top, New campaign asks before erasing progress, act intro paintings match their lines. `npm run check` green afterwards.

## Teaching layer review (2026-11-09)
New: Level 1 guided tutorial, intro cards + Codex, briefing before every level, objective in the HUD, goal markers, hints.
- lore-keeper: 29 text fixes applied. Biggest: the tutorial asked Achilles to dodge a spear he is immune to; the dodge line now says so ("Spears can't hurt Achilles, but others must dodge"). Iliad 10 is a night raid on the Trojan camp, not Troy; card lines over length shortened; rule lines made exact (arrows hit ships, chariots only hurt what they run into, allies pushed without damage, swords removed).
- style-reviewer (verdict: needs work, 8 major): fixed wrapping hero line on the briefing (and the row step now follows the text height), hint button clipped under the HUD (sized to its label), goal marker that looked like a move tile (now gold diamond under units + gold corner brackets above them), diagram arrows that read as split tiles (now dotted red for Trojan attacks / blue for hero moves with solid heads inside the target cell; threatened cells hatched), tutorial holes that cut sprites (one hole and one frame around the whole subject), stealth card art that read as a monitor (now a crenellated gate), brush card (fire eating into brush), ship pennant (swallowtail on the mast top), Trojan roster overlaps (fixed slots, counts on ink chips), Codex "?" invisible and headings misaligned.
- Not done (minor): per-hero token colors in diagrams and mini map (all heroes are blue discs), Codex as a chip grid instead of bars, card name on its own ink strip.

