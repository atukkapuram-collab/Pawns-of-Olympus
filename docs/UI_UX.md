# UI and UX

*Expanded in M3 and M6. Every screen, controls, feedback rules, accessibility.*

## Screens
Boot, Title, Level select (vase frieze), Patron select, Battle (+ HUD, Pause), Victory, Defeat, Act intro and level scenes, Settings, Credits. Details: KICKOFF.md B13.

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
Title (lettered logo, marching frieze, menu tablet) → Level select (amphora; one act per side; metopes painted when unlocked, Kleos stars below) → Act intro cutscene (first time) → Patron select → Pre-level cutscene (first time) → Battle (HUD: title strip; column with turn/par, cream info card, numbered Trojan order with intent glyphs, favor, End turn, Undo, Restart) → Result (headline strip, stars one by one, outro; Retry / Map / Next) → Post-level cutscene → next level. Pause (Esc/P): Resume, Restart, Settings, Quit to map. Settings: music, sound, mute, screen shake, reduced motion, threat hatch. Credits.

## Touch specifics
Tap a hero to select; tap a destination or target once to preview (gold frame), again to confirm. Allies that are push/swap targets also need the second tap. Zeus on one of your own heroes always needs a second tap. Tapping a Trojan shows its card. Portrait orientation shows a "Turn your device sideways." panel that blocks input until the device turns.
