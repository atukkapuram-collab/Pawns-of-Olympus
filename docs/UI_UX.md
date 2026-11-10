# UI and UX

*Expanded in M3 and M6. Every screen, controls, feedback rules, accessibility.*

## Screens
Boot, Title, Level select (vase frieze), Intro cards, Briefing (with patron choice), Battle (+ HUD, Pause, tutorial coach, hints), Victory, Defeat, Act intro and level scenes, Codex, Settings, Credits. Details: KICKOFF.md B13.

## Controls
- **Mouse:** click a hero to select; click a highlighted tile to move; click a target to act; hover a unit for info.
- **Keyboard:** arrows/WASD move a cursor, Enter/Space select or confirm, Tab next hero, 1/2 choose action, F favor (Poseidon: pick a tile, then arrows choose the wave direction, Enter casts), E end turn, Z undo, R restart, Esc cancel (or pause when nothing is selected), P pause. Menus: arrows + Enter, Esc back; result screen E/R/Z; level select Q/W turn the vase.
- **Touch:** tap a hero to select, tap a tile to preview the move or attack, tap again to confirm. Long-press (400 ms) shows unit info instead of hover. Buttons are at least 18 internal px tall. Landscape only: portrait shows a turn-your-device panel.

## Feedback rules
- Every input gets an immediate visual and audio response; invalid input gets a short shake of the cursor and a dull click.
- Threats show by shape and color: thrust = spear-tip mark, arrow = dotted line ending in an arrowhead, charge = hoof-chevron lane, sweep = arc of three tiles. Damaged tiles show a numbered order badge.

## Accessibility
High-contrast intents (ink outline plus a pattern), reduced motion (no shake, shorter animations), screen shake toggle, keyboard for everything, text at 1x font never under 5x7.

## Screens as built
Title (lettered logo, marching frieze, menu tablet: Continue, New campaign, Settings, Codex, Credits) → Level select (amphora; one act per side; metopes painted when unlocked, Kleos stars below) → Act intro cutscene (first time) → Pre-level cutscene (first time) → Intro cards (first time something new appears) → Briefing (always) → Battle (HUD: objective strip; column with turn/par, cream info card, numbered Trojan order with intent glyphs, favor, End turn, Undo, Restart) → Result (headline strip, stars one by one, outro; Retry / Map / Next) → Post-level cutscene → next level. Pause (Esc/P): Resume, Restart, Settings, Codex, Replay tutorial, Quit to map. Settings: music, sound, mute, screen shake, reduced motion, threat hatch, Replay tutorial. Credits.

## Touch specifics
Tap a hero to select; tap a destination or target once to preview (gold frame), again to confirm. Allies that are push/swap targets also need the second tap. Zeus on one of your own heroes always needs a second tap. Tapping a Trojan shows its card. Portrait orientation shows a "Turn your device sideways." panel that blocks input until the device turns.

## Teaching the game (added 2026-11-09)

### Level 1 tutorial
Runs the first time Level 1 is played (and from Settings or Pause > Replay tutorial). One idea per step; each step shows a cream tablet top-left with one instruction line and one controls line (mouse and keys), dims everything else with an ink dither veil, frames the thing to click in pulsing gold, and only moves on when the player does it. Other input gets the dull "invalid" click, and only the moves and targets the step allows are shown.
Steps: select Achilles (click / Tab) → move to the framed tile (click / arrows + Enter) → strike the spearman → read the other spearman's red tile and badge (hover or tap it / arrows) → End turn (click / E) → step off the red tile → Undo (click / Z) → step off again next to the spearman and strike. "Skip tutorial" (bottom left) ends it at once. Logic: `src/game/tutorial.ts`; view: `src/view/Coach.ts`.

### Intro cards and Codex
Before a level, a short set of cards for every hero, Trojan, god, special ground (water, rock, fire, brush, gate, torchlight) and objective type (protect, escort, stealth) appearing for the first time. First appearances are computed from the level data (`src/data/teach.ts`). Card: kind tag, art at 2x on a cream tablet (god portraits 1x), name, one lore line, stats (HP, move, damage) or kind, then one line per rule with a tiny board diagram (red = hit, arrows = movement or attack). Back / Next (arrows, Enter/E), Skip (Esc). Every card seen goes into the **Codex** (title and pause menu), grouped Heroes / Patrons / Trojans / Trojan gods / Ground / Objectives; unseen entries show "?".

### Briefing
Before every level: "Level N: Title", the story line, a cream Objective tablet with the goal in plain words and a mini map (goal in gold: target tile, gates, protected ships, or the Trojans to defeat), the lose conditions in one line, the three Kleos stars, the heroes (bust, name, HP pips, one-line ability) and the Trojans (busts, counts). Bottom bar: patron buttons (if the level has patrons, with the favor in one line), Home, Settings, Play (E/Enter). Keys 1-3 pick a patron, Esc goes to the map.

### In battle
- The top strip always shows the objective ("Goal  Keep 2 ships afloat to turn 4."). The HUD turn line reads "Turn 2 of 4" (objective turns for protect/survive, par otherwise; "over par" in red).
- Escort targets and stealth gates have pulsing gold corner brackets; ships to protect have a gold pennant above their HP.
- When every Trojan is down but the goal is something else, a tablet says what is left ("The way is clear. Bring Ajax to the gold tile.").

### Hints
After 2 restarts or defeats on a level (never in the tutorial) a small "Need a hint?" button appears under the objective strip (key H). Hint 1 is a nudge, hint 2 the key move (both hand-written in strings.ts), each unlocked in turn by "Another hint". Hint 3 ("Show turn 1") restarts the level with the solution's patron and plays the recorded first turn step by step (Next / E for each step, the step framed in gold), then hands control back. Hints never cost Kleos.
