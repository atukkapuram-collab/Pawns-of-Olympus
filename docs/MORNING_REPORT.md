Status: FINAL

# Pawns of Olympus: morning report

Good morning. The game is built: 15 levels in 3 acts, playable start to finish with mouse, keyboard or touch. Everything is committed in the local git history; nothing has been pushed or published.

## 1. How to play it now
In PowerShell:
```powershell
cd ~\Documents\pawns-of-olympus
npm run dev
```
Open http://localhost:5173 in a browser. Click **New campaign**.
- **Mouse:** click a hero, click a gold tile to move, click a red-framed Trojan next to you to strike. **End turn** when you're done. Hover anything for its card on the right.
- **Keyboard:** arrows move the cursor, Enter selects/confirms, Tab cycles heroes, E end turn, Z undo, R restart, F patron's favor, 1/2 pick an action, Esc/P pause.
- **Touch (phone or tablet, sideways):** tap a hero, tap a tile to preview, tap again to confirm.

Each Trojan shows what it will do next turn (red tiles, a numbered badge for the order, a glyph for the attack shape). The whole game is making those attacks miss, hit each other, or hit the river.

The art gallery (every sprite, tile, god, the palette and font, at 4x): http://localhost:5173/gallery.html

## 2. What's done
| Milestone | Status |
|---|---|
| M0 Setup | done |
| M1 Style lock | done (3 art-review rounds; all major issues fixed) |
| M2 Rules engine | done (66 unit tests) |
| M3 Playable slice | done |
| M4 Full cast | done: 5 heroes, 6 Trojan types incl. Hector and Paris, 6 gods |
| M5 Campaign | done: 15 levels, each with a recorded solution that wins within par |
| M6 Screens and flow | done: title, vase level select, patron choice, story scenes, battle, result, settings, pause, credits, saves |
| M7 Audio and juice | done: own sound synth, lyre music in Greek modes, pottery shatter, god appearances |
| M8 Polish | done (see note in ROADMAP) |
| M9 Hardening | done: `npm run check` passes; every bug QA found (23) is fixed |
| M10 This report | done |

## 3. Screenshots (in `docs/screenshots/`)
- Title: [title-2x.png](screenshots/title-2x.png)
- Level select (the amphora): [levelselect-act1-2x.png](screenshots/levelselect-act1-2x.png)
- Choosing a patron: [patron-2x.png](screenshots/patron-2x.png)
- Story panels: [cutscene-act1-2x.png](screenshots/cutscene-act1-2x.png), [cutscene-pre-2x.png](screenshots/cutscene-pre-2x.png)
- Battles: [Level 2, archers](screenshots/battle-a1-02-2x.png), [Level 4, fire at the ships](screenshots/battle-a1-04-2x.png), [Level 7, chariots](screenshots/battle-a2-02-2x.png), [Level 14, night stealth](screenshots/battle-a3-04-2x.png), [Level 15, finale](screenshots/battle-a3-05-2x.png)
- Result screens: [victory-2x.png](screenshots/victory-2x.png), [defeat-2x.png](screenshots/defeat-2x.png)
- Art sheets: [heroes and Trojans](screenshots/gallery-03.png), [gods](screenshots/gallery-05.png), [whole gallery](screenshots/gallery-full.png)

Refresh them any time with `npm run screenshots`.

## 4. Decisions I made for you (full list: `docs/DECISIONS.md`, 30 entries)
1. Your private GitHub repo wasn't created: the safety check blocked it, and you said you'd do it this morning (command in section 8).
2. GitHub Pages is the main target, but the build also works on itch.io (relative paths, `npm run package:itch` makes the zip).
3. Level 1 has no patron god; Zeus arrives in Level 2 (with Zeus, Level 1 could be won in one turn).
4. Achilles sits out Act II, as in the Iliad. Act I ends with the quarrel; Patroclus falls after Level 8 whatever happened on the board ("the gods decided").
5. Hector at the Gates (Level 10) and Paris on the Walls (Level 13) are "get a hero to the gate" levels, not "defeat everyone": Hector must survive until Act III, and Paris otherwise never threatened anything.
6. Boards have no stone border; the board's edge is a wall, and the board stands on a painted meander band like a vase frieze.
7. At night (Level 14) only the Greeks turn orange "red-figure" style; Trojans keep their wine and iron so you can tell the sides apart.
8. Sound and music are written from scratch in code (no third-party audio), quiet by default.
9. On touch, every move/attack is "tap to preview, tap again to do it", and you must pick "Aim at ally" before Diomedes can shove a friend (QA kept shoving Ajax by accident).
10. God appearances use the 48x56 portraits as black-figure silhouettes rather than new giant figures (scaling would mix pixel sizes).

## 5. What needs your eyes
1. **The art.** Open the gallery and a few battles. Is it "a painted vase come to life"? Name specifics ("Achilles' crest reads as a hat", "tiles too orange") and I'll fix them. My reviewer's remaining nitpicks are at the end of `docs/PLAYTEST_LOG.md`.
2. **Difficulty.** Act I is gentle, Act III is tight (par = the minimum possible on 4 of 5 levels). Play a few and tell me if it's too easy or too hard.
3. **The story lines.** Short, dry, a little wry about the gods (`src/data/strings.ts`). Cut anything that doesn't sound right to you.
4. **The music.** Procedural lyre and drum; a matter of taste. Settings has volume and mute.
5. **The title screen.** The hand-lettered logo is the first thing anyone sees.

## 6. Known issues
No open bugs in `docs/BUGS.md`. Known rough edges:
- Trojans are a little clumsy: an idle Trojan sometimes faces a hero through its own ally, and spearmen still crowd Achilles even though spears can't hurt him. Changing this would change the recorded solutions, so I logged it instead.
- Apollo's plague (Level 9) mostly teaches "don't stand still"; it rarely forces sheltering under Ajax.
- The finale's par (4) is a solution I found, not a proven minimum; a sharp player may beat it.
- Story panels show the right characters but are fairly simple compositions.
- The project's subagents (style-reviewer, qa-tester, level-designer, lore-keeper) only load after Claude Code restarts. Tonight they ran as general-purpose agents told to follow those files.

## 7. Recommended next steps
1. **Play Act I and give art notes**, in your main session: "Use style-reviewer on battle-a1-04, then fix what I mark."
2. **Tune Act III difficulty** with the level-designer agent: "Use level-designer to make a3-05 need 5 turns."
3. **Smarter Trojans (optional):** fix the two AI quirks above, then have level-designer re-record any solutions that break (`npm run validate-levels` tells you which).
4. **A sound pass:** listen with headphones, then adjust the numbers in `src/audio/sfx.ts` (one line per sound).
5. **Add bonus levels:** drop a JSON file in `src/data/levels/`; it shows up automatically.
For more speed, run a second Claude session on a git worktree for chores. See `docs/WORKFLOW.md`.

## 8. Publishing (when you're ready)
First, your private backup repo:
```powershell
gh repo create pawns-of-olympus --private --source . --remote origin --push
```
- **GitHub Pages:** steps in `docs/WORKFLOW.md`. Note that GitHub Pages from a private repo needs a paid GitHub plan, and a Pages site is public. The deploy workflow only runs when you press "Run workflow".
- **itch.io:** `npm run build`, then `npm run package:itch`, then upload `release/pawns-of-olympus-web.zip` as an HTML game (steps in `docs/WORKFLOW.md`).
