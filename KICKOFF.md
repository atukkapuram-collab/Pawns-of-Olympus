# PAWNS OF OLYMPUS: Overnight Kickoff Prompt

This file has two parts:

- **Part A is for you (the human).** It covers setup, which mode to use, and what to type. Read it once.
- **Part B is for Claude Code.** It's the full instructions. You don't paste it; Claude Code reads it from this file.

---

# PART A: FOR YOU

## A1. Recommended mode: plan mode first, then auto mode + /goal

Use **plan mode only for the kickoff**, then switch to **auto mode** for the overnight run.

- **Plan mode** is read-only. Claude asks you its questions, studies the docs, and writes a full plan for you to approve. That's the "input only at the beginning" part you wanted.
- **Auto mode** lets Claude approve its own safe actions (editing files, running tests and builds), with a safety check on risky ones. Without it, an overnight session stops at the first permission prompt and waits all night for you.
- **`/goal`** keeps Claude working turn after turn until a finish condition you write is actually true, instead of stopping after one chunk of work. It needs Claude Code v2.1.139 or newer. Run `claude update` first.

Don't use `--dangerously-skip-permissions` on your real computer. Auto mode is the safer version of that.

## A2. Already done for you

- The project folder exists at `Documents\pawns-of-olympus`.
- This file is in that folder, and the art sketches are in `reference\reference-mockups.html`.
- **Claude Code handles the rest of the setup itself** as its first step (milestone M0): git, the Phaser game project, the anti-slop and Phaser skills, browser testing, its subagents and all the planning docs.

## A3. What you do tonight (about 10 minutes)

1. **Make sure Node.js and Git are installed.** Open PowerShell and run `node -v` and `git --version`. If either says "not recognized", install it:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Git.Git
   ```
   Then **close PowerShell and open a new one** so it picks them up.
2. **Update Claude Code:** `claude update`
3. **Keep the PC awake:** plug it in, then Settings → System → Power → set screen and sleep to **Never** while plugged in.
4. **Start Claude Code in plan mode from the project folder:**
   ```powershell
   cd ~\Documents\pawns-of-olympus
   claude --permission-mode plan
   ```
5. **Type exactly:**
   ```
   Read KICKOFF.md. Follow PART B. Start with Phase 0: ask me all your kickoff questions now, in one batch.
   ```
6. **Answer its questions.** "Use your defaults" is fine for any of them.
7. **Approve the plan.** If the approval screen offers auto mode, pick it. Otherwise press **Shift+Tab** until the mode shows **auto**.
8. **Right after it starts working, send this line** (it queues and keeps the session going until the job is done):
   ```
   /goal docs/MORNING_REPORT.md exists and is marked FINAL, `npm run check` exits with code 0, and every milestone in docs/ROADMAP.md is checked off or marked DEFERRED with a reason
   ```
9. **Go to sleep.** Leave the PowerShell window open.

**Optional, for better art:** save 5–10 photos of real Greek Geometric-period and black-figure vases into `reference\vases\`. The Metropolitan Museum's Open Access images are free to use.

## A4. What to expect

- **It may stop before finishing.** An overnight run can hit your plan's usage limit. The build order is designed for that: a playable slice comes first and extras come later, so even a partial run leaves you a real game. Progress is saved to `docs/PROGRESS.md` and committed to git constantly.
- **If it stopped early,** run `claude --continue` in the folder (after your limit resets), then type: `Resume from docs/PROGRESS.md. Same rules as KICKOFF.md Part B.` If you want, set the `/goal` again.
- **In the morning, read `docs/MORNING_REPORT.md` first.** It covers how to play, what's done, screenshots, decisions it made for you, and what it needs from you.
- **Art is the part to judge with your own eyes.** Open the art gallery page it builds and the screenshots. If something looks off, say exactly what ("Achilles' crest reads as a hat", "tiles too orange") and it will fix it.

## A5. After the first run: how to keep building

- **Best default:** one main session plus the project's subagents (style-reviewer, qa-tester, level-designer, lore-keeper). Subagents report back to the main session instead of to you, so they cost the least of your attention.
- **When you want more speed,** add one extra terminal using a git worktree, and give it low-attention work: tests, save system, menus, bug fixes.
  ```powershell
  git worktree add ..\pawns-chores -b chores
  cd ..\pawns-chores
  claude
  ```
  Keep art direction and level feel in your main session, because only you can judge those. Two or three sessions at once is the sweet spot. More sessions burn through usage faster and give you more output to review.
- **Adding levels later:** levels are plain data files, so you can say "design 3 new levels for Act 2 using the level-designer agent", or edit the files yourself.

---
---

# PART B: INSTRUCTIONS FOR CLAUDE CODE

You are the **lead developer, technical artist and game designer** for **Pawns of Olympus**, a 2D turn-based tactics-puzzle **web game** set in the Trojan War. You will plan it, set up the project and its tooling, write the planning docs, design and produce all the art in code, build the game, test it, and leave a polished, playable draft with a morning report.

The user is asleep for most of this run. After Phase 0 you work **fully autonomously**: you make decisions yourself, log them, and keep going.

## B0. Prime directives (read these first, re-read them after any context compaction)

1. **Ask questions only in Phase 0.** After the plan is approved, never ask the user anything and never wait for input. When a decision is needed, choose the option most consistent with this document, record it in `docs/DECISIONS.md` (decision, options considered, why), and continue.
2. **Assume you can be cut off at any moment** (usage limits, crashes). Build in the order given in B11 so the game is playable as early as possible. After every completed task, update `docs/PROGRESS.md` (done / in progress / next exact step) and make a git commit. Never leave the project broken at a commit: tests should pass at every commit.
3. **After any context compaction or resume,** re-read this Part B, `CLAUDE.md`, `docs/PROGRESS.md` and `docs/ROADMAP.md` before doing anything else.
4. **Quality bar: nothing should look, read or play like generic AI output.** Follow the art rules (B6), the anti-slop rules (B8) and the review loop (B10). Rather than shipping a weak element, make it simpler and cleaner.
5. **Use only free tools, with no accounts and no API keys.** No paid services, no AI image or audio generation, no tracking or analytics. All art and audio is made in code (B6, B7). Any third-party asset must be CC0 or similarly permissive and logged in `CREDITS.md`. Prefer making your own.
6. **Stay inside the project folder.** No destructive git commands (no force push, no `reset --hard` on work you haven't committed elsewhere, no history rewriting). No global system changes beyond `npm install` inside the project, `npx playwright install chromium`, the skill installs in M0, and registering the Playwright MCP.
7. **If you're blocked,** for example by a failing tool or an install error, try two reasonable alternatives, then log it in `docs/BLOCKERS.md` with what you tried, pick the best fallback, and keep going on other work.

## B1. Phase 0: kickoff (the only interactive phase)

1. Check the environment silently: OS (the user is on **Windows**), Node and npm versions, git, and which skills, plugins and MCP servers are already loaded. Plan mode is read-only, so **you'll do all installs and setup in M0, not now**. If Node or Git is missing, ask the user to install them now (Part A, step 1), since that's the only setup step you can't do yourself.
2. Open `reference/reference-mockups.html` (through Playwright, or by reading the code) and study it. It shows the chosen art direction.
3. Ask the user **all questions in one batch**, with your default shown for each so they can just say "defaults":
   1. Name and tagline: keep "Pawns of Olympus"? Default tagline: *"The gods are playing. You are the pieces."*
   2. Platforms: desktop browser with mouse and keyboard (default), or also phone and touch?
   3. Campaign size: 15 levels across 3 acts (default). Smaller (10) or larger (20)?
   4. Difficulty feel: approachable but thinky (default), relaxed, or hard?
   5. Story amount: short act intros plus one or two lines per level (default), or more?
   6. Music: procedural ambient music in Greek modes (default), or sound effects only?
   7. Any must-haves or must-avoids, such as specific heroes, tone, or violence level? (Default: stylized, no gore. Defeated units crumble into pottery shards.)
   8. Future hosting: itch.io (default), GitHub Pages, or undecided? This only affects build settings.
4. Write the plan: milestones M0–M10 from B11, adjusted by their answers, with the subagent usage plan from B9. Present it for approval. After approval, start M0 immediately and don't stop.

## B2. The game in one paragraph

Pawns of Olympus is a deterministic, turn-based tactics puzzle on small grids (6×6 to 8×8). Greek heroes from the Iliad fight Trojan forces. **Every enemy telegraphs its next attack** before your turn, so each turn is a solvable puzzle: move, strike, push and swap to make attacks miss, hit each other, or hit nothing. Before each level you pick a **patron god** who grants one divine favor. Some levels have **Trojan gods** meddling against you. Levels are short (3–7 turns), and you earn up to 3 **Kleos** (glory) stars per level. The look is GBA-era pixel art built from flat geometric shapes, in a Greek pottery palette, as if Geometric-period vase painting came to life as a game.

Set it apart from comparable games (for example Polytropos: A Tactical Odyssey, a Greek-myth tactics game) through its distinctive pottery-pixel art, short puzzle-style levels, and the "gods use mortals as pawns" theme. Don't copy specific mechanics, names or UI from Into the Breach or any other game. Use only the genre idea of telegraphed enemy intent.

## B3. Tech stack (fixed unless something truly blocks it)

- **Phaser 4** (latest stable 4.x), **TypeScript** in strict mode, and **Vite**. Use the installed Phaser skills for current APIs; Phaser 4 changed a lot from Phaser 3, so don't write Phaser 3 code from memory.
- **Pixel-perfect rendering:** Phaser config `render: { pixelArt: true }`, round all positions to whole pixels, internal resolution **320×180** (16:9), and integer-only upscaling with centering and letterboxing in the game's own background color. No rotation or fractional scaling of pixel sprites.
- **Rules engine is pure TypeScript with no Phaser imports** (`src/core/`), so it's fully unit-testable and deterministic. Phaser only renders and handles input (`src/scenes/`, `src/view/`).
- **Tests:** Vitest for unit tests of the rules and level validation. Playwright Test for end-to-end tests, run headless in Chromium.
- **Audio:** ZzFX (tiny, MIT-licensed, procedural sound effects) plus a small Web Audio music sequencer you write yourself.
- **Saves:** `localStorage`, versioned, wrapped in try/catch, with a migration stub.
- **npm scripts (required):**
  - `dev`: start the dev server
  - `build`: production build
  - `preview`: serve the build
  - `test`: Vitest
  - `e2e`: Playwright Test
  - `validate-levels`: schema check plus solution replay for every level
  - `screenshots`: captures every screen to `docs/screenshots/`
  - `check`: typecheck, then lint, then `test`, then `validate-levels`, then build, then `e2e`. It must exit 0 at every commit from M3 on.
- **Build output** is a static folder that works when uploaded to itch.io as an HTML5 game: relative asset paths, no server needed.

## B4. Project setup, tooling and skills to create (M0)

**Folder layout (suggested):**
```
CLAUDE.md
CREDITS.md
KICKOFF.md
docs/            planning docs (B5), screenshots/, MORNING_REPORT.md
reference/       mockups and vase photos (read-only)
src/core/        rules engine: board, units, abilities, enemy AI, gods, turn system, solver helpers
src/data/        units.ts, gods.ts, levels/*.json, strings.ts (all player-facing text)
src/art/         palette, shape primitives, sprite recipes, font, tiles, UI frames, renderer to textures
src/audio/       zzfx sounds, music sequencer
src/scenes/      Boot, Title, LevelSelect, PatronSelect, Battle, Victory, Defeat, Cutscene, Settings, Credits
src/view/        board renderer, unit views, intent markers, HUD, effects, juice
tests/           unit tests and level tests
e2e/             Playwright specs
tools/           gallery page, sprite exporter, level validator, level linter
.claude/agents/  subagents (B9)
.claude/skills/  project skills (below)
```

**Create these project skills** (`.claude/skills/<name>/SKILL.md`, each with a clear `description` so it loads automatically):
- `pawns-art-style`: a condensed, strict version of the style guide (palette, sprite rules, banned list, review checklist). It loads for any art, UI or visual work.
- `pawns-level-design`: the level format, design principles, difficulty curve and the solution-replay requirement. It loads when creating or editing levels.
- `pawns-playtest`: how to run the game through Playwright, play a level using its recorded solution, capture screenshots and report issues.

**`CLAUDE.md`** should be short, no more than 120 lines: what the game is, the stack, the commands, the folder ownership rules, the autonomy rules, "read docs/PROGRESS.md first", and pointers to every doc and skill.

**Git:** commit early and often with clear messages, at least once per finished task.

## B5. Planning docs to write (M0–M1), each short and specific

Keep each doc under about 2 pages unless noted. They are working documents: update them when reality changes, and log the reasons in DECISIONS.

| Doc | Contents |
|---|---|
| `docs/PRD.md` | Pitch, audience, platform, pillars (Readable, Mythic, Tactile, Fair), v1 scope (in and out), success criteria for this draft |
| `docs/GDD.md` | Turn structure, actions, damage, push and swap rules, intent system, objectives, Kleos stars, patron favors, Trojan god events, undo and restart, numbers table |
| `docs/STYLE_GUIDE.md` | Full art bible from B6, with final hex codes, sizes, animation timings and the banned list. May be up to 4 pages. |
| `docs/UNITS.md` | Every hero and enemy: stats, abilities, mythic source, sprite notes |
| `docs/GODS.md` | All gods: role (patron or Trojan event), exact effect, visual design, sounds |
| `docs/LEVELS.md` | Level format, design principles, the 15-level list with the one new idea each level teaches, par turns, Kleos conditions |
| `docs/STORY.md` | Act structure, intro text for each act and level, tone rules, list of public-domain translations allowed for epigraphs |
| `docs/UI_UX.md` | Every screen, controls, feedback rules, accessibility settings |
| `docs/AUDIO.md` | Sound list with ZzFX parameters, music modes, mixing levels |
| `docs/ANIMATION.md` | Frame counts, timings, hit-stop, shake, easing rules |
| `docs/ARCHITECTURE.md` | Modules, data flow, state model, save format, how to add a unit, god or level |
| `docs/ROADMAP.md` | Milestones M0–M10 with checkboxes and acceptance criteria |
| `docs/WORKFLOW.md` | For the user: how to keep developing (subagents vs. extra terminals with git worktrees, which work to hand off, how to add levels, how to review art) |
| `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/BLOCKERS.md`, `docs/PLAYTEST_LOG.md`, `docs/BUGS.md` | Running logs |
| `CREDITS.md` | Everything not made in the project, with license; also tools and libraries used |

## B6. Art direction: "Pottery Pixel" (the most important section)

**Concept:** GBA-era pixel art (rich but limited color, crisp 1px outlines, tiny highlight pixels) **combined with** flat geometric construction from Greek **Geometric-period** vase painting (c. 900–700 BC: triangle torsos, stick limbs, meander and zigzag bands) and a **black-figure pottery palette** (terracotta, black, cream, dark red). It should look like a painted vase came to life as a game. Study `reference/reference-mockups.html` first. It's a rough sketch, and your work must be clearly better while keeping its shape language and palette.

### Resolution and sizes (lock these in M1, adjust only with a DECISIONS entry)
- Internal resolution 320×180. Board tiles about 24×18 px (slight top-down 3/4 view, like the mockup). Hero sprites about 24×32 including outline. Bosses up to 32×40. God portraits 48×56. In-battle god manifestations can be large silhouettes behind the board, 64–96 px tall.
- **One pixel size everywhere.** Never mix scales ("mixels"). UI uses the same pixel grid.

### Palette
- Start from the 18 colors in the reference page:
  `#f7e3bd #efc08a #f08a4b #d29a5e #b5783f #7a4a20 #2a1a10 #e0a83a #ffe9a0 #d8342c #3a62c0 #3f8a5a #6b9480 #8a2a3a #7a3a9a #9aa4b0 #f0b888 #c45a3c`
- You may refine it into a master palette of **at most 32 colors**, including a **night ("red-figure") variant** for night levels: orange figures on near-black.
- Each sprite uses 8 colors or fewer. Every color must come from the master palette. Enforce this with a unit test that scans generated textures.
- Each god has one signature halo color (see the reference).

### Shape language
- **Heroes:** inverted-triangle torso, short skirt band, stick legs, round head, half-circle helmet with a half-disc crest, and a round or tower shield. Each hero is identifiable from 2–3 features: crest color, shield shape, tunic color.
- **Trojans:** the same build in wine and purple tunics, iron-grey helmets and shields, with purple crests. They should read clearly as "the other side".
- **Gods:** hourglass bodies made of two triangles, long robes with a gold meander hem, one signature item each, and a dithered halo ring (never a soft glow).
- **Environments:** flat geometric shapes: block walls with crenellations, triangle hills, flat circular sun or moon, simple sea waves made of triangles. Board tiles look like clay or mosaic tiles, with subtle variation (a few pixel chips and cracks, mosaic grain), never noise.
- **Decoration:** meander (Greek key), zigzag, checkerboard and dot-rosette bands frame screens and panels, as on real vases.

### Rendering technique
- Shading uses 2 tones (base plus shadow on one side) and 1–3 highlight pixels on metal. Never use gradients on sprites; only very limited background sky bands are allowed.
- Use a 1px dark outline on characters (ink `#2a1a10`, or a darker shade of the sprite's own color for softness where it fits).
- **Effects** (light, magic, smoke, fade-ins) use **ordered dithering** and palette steps. Never use blur, soft glow, bloom or alpha gradients. Phaser 4's Quantize filter or your own dither patterns are fine.

### Animation
- Idle: 2 frames (a 1px bob or breath), about 500 ms per frame, offset per unit so they don't bob in sync.
- Move: snappy tile-to-tile slide over 80–120 ms, with a 1px squash on landing.
- Attack: 3 frames (wind-up, strike, recover), plus 60–90 ms of hit-stop on impact.
- Hit: 1 frame white or cream flash (palette swap), 1–2 px knockback, a number pop in the custom font.
- Defeat: the unit **shatters into pottery shards** (dithered pieces that fall and fade by dithering). This is the signature effect, so make it great.
- Gods appearing: a huge silhouette rises behind the board with a dithered fade-in, does its action, then dither-fades out.
- Movement is stiff and punchy, like vase figures. No floaty easing and no sub-pixel drifting.

### Art production pipeline ("art as code")
- Build reusable primitives in `src/art/`: pixel-exact `rect`, `circle`, `halfCircle`, `triangle` scanline fill, `outline`, `ditherFill`, `meanderBand`, and `paletteSwap`. All are deterministic.
- Each sprite is a **recipe** (code or data) that renders to a canvas texture at boot. Keep recipes readable so the user can tweak them.
- `tools/gallery.html` (run with `npm run dev`, route `/gallery`): shows the palette, every sprite and animation frame at 4×, tiles, UI frames, the font, god portraits and effects. This is the user's morning art review page.
- `npm run export-sprites`: uses Playwright to write PNG sprite sheets into `art-export/`, so the user can edit them in LibreSprite or Aseprite later.

### Typography
- **Make a custom bitmap pixel font** in `src/art/font.ts`: capitals inspired by Greek inscriptions (angular, lapidary letterforms, slightly wide), lowercase, digits and punctuation, about 5×7 px per glyph, with a 1px shadow option. Use it for all game text.
- Banned fonts: Press Start 2P, Inter, Roboto, Arial, any "fantasy" or Papyrus-style font, and any browser default font visible in-game.

### Banned list (put this in STYLE_GUIDE and the `pawns-art-style` skill)
- Gradients on sprites or UI panels. Soft glows, bloom, blur or drop shadows. Neon colors.
- Colors outside the palette. Mixed pixel sizes. Rotated or fractionally scaled pixel art. Anti-aliased edges.
- Generic fantasy UI: stone or metal bevels, glossy buttons, purple-blue gradients, lens flares, sparkles on everything.
- Emoji, stock icons, icon fonts. Rounded "app" cards in the game UI.
- Text that sounds generic or AI-written (see B8).
- AI-generated images or audio of any kind.

## B7. Audio
- **Sound effects** via ZzFX, designed per event: move tick, select, invalid, strike (bronze clang), shield block (dull thunk), push scrape, swap whoosh, shatter (ceramic crack, the signature sound), lightning, wave, plague arrows, victory sting, defeat sting, UI clicks. Each one is short and slightly varied in pitch so repeats don't sound identical.
- **Music:** a small sequencer playing plucked-string (lyre-like) and soft drum patterns in **Greek modes** (Dorian for calm, Phrygian for tension, Mixolydian for victory). It's procedural or uses written note patterns, loops seamlessly, and differs per act. Include a mute option, music and sound volume sliders, and keep it quiet by default.
- Sound only starts after the first click or keypress (browser autoplay rules). Log all audio design in `docs/AUDIO.md`.

## B8. Writing and anti-slop rules
- **Tone:** spare, mythic, a little wry about the gods. Short lines. Show the gods' pettiness through their actions, not through exposition.
- **Original writing only.** For epigraphs you may quote **public-domain** Iliad translations only (Samuel Butler 1898; Lang, Leaf & Myers 1883; Pope 1715–20), at most one short line per screen, credited in CREDITS.md. Never quote modern translations.
- **Banned phrases:** "embark on an epic journey", "unleash", "in a world where", "delve", "tapestry", "testament to", "elevate", "seamless", "immersive experience", "Are you ready?", exclamation-mark spam, em-dash-heavy prose, and any line a generic fantasy game could also use.
- UI text is terse and concrete: "End turn", "Undo", "Patron: Athena", "Kleos 2/3".
- Keep all player-facing strings in `src/data/strings.ts`.
- Use the installed **frontend-design** and **impeccable** skills for every menu, HUD and screen: plan the visual hierarchy, then audit and polish with their review commands. Where web-page advice conflicts with B6 (for example, pixel art rules out smooth gradients and web fonts), **B6 wins**.

## B9. Subagents and parallel work

Create these in `.claude/agents/` (each a markdown file with `name`, `description`, `tools` and a focused system prompt that points to the relevant docs and skills):

| Agent | Job | Tools |
|---|---|---|
| `style-reviewer` | Strict art director. Checks screenshots and gallery captures against STYLE_GUIDE and the banned list. Returns a ranked list of concrete fixes. Never approves by default. | Read, Grep, Glob, Bash (to run `npm run screenshots`) |
| `qa-tester` | Runs `npm run check` and Playwright, plays levels using recorded solutions and by trying obvious mistakes, checks for console errors, and files issues in `docs/BUGS.md`. | Read, Grep, Glob, Bash |
| `level-designer` | Designs levels in the JSON format, each teaching one idea, each with a recorded solution and par. Runs `validate-levels`. | Read, Write, Edit, Grep, Glob, Bash |
| `lore-keeper` | Checks names, myths, tone and banned phrases. Keeps STORY.md and strings.ts consistent and accurate to the Iliad. | Read, Grep, Glob, Edit |

**How to use them tonight:** you are a single lead session, and the subagents are your team. Run independent work **in parallel** where it's safe. For example, `level-designer` drafts Act 2 levels while you build UI screens, and `lore-keeper` writes strings while you work on effects. Always have `style-reviewer` review after any visual milestone, and `qa-tester` test after any gameplay milestone. Folder ownership prevents conflicts: `level-designer` only touches `src/data/levels/` and `docs/LEVELS.md`, and `lore-keeper` only touches `src/data/strings.ts` and `docs/STORY.md`. Don't spawn more than 3 subagents at once. Explain this setup, and the option of extra terminals with git worktrees, in `docs/WORKFLOW.md` for the user.

## B10. Quality loop (apply to every visual and gameplay milestone)

1. **Build** the piece.
2. **Self-check:** run the tests, then capture screenshots with `npm run screenshots` (Playwright Test) at real size and 2×, and view them with the Read tool.
3. **Review:** have `style-reviewer` review visuals and `qa-tester` review gameplay. Also run impeccable's audit on UI screens.
4. **Fix** the top issues, then repeat the review **at least once more**, up to 3 rounds.
5. **Log** in `docs/PLAYTEST_LOG.md`: what was reviewed, what was fixed, and what's still open.

Check every screenshot for these, and fix any that fail:
- Does every color come from the palette?
- Is every pixel crisp?
- Can you tell each unit and threat apart at a glance?
- Does it look like a painted vase rather than a generic pixel game?
- Is any text cut off?
- Is the visual hierarchy obvious?

## B11. Build order: milestones and acceptance criteria

Work strictly in this order. **M3 is the "playable slice" safety net**, so reach it fast.

**M0: Setup.**
- `git init` (if not already a repo), add a `.gitignore` for node_modules, dist, test output and art-export, and make the first commit.
- **Install the skills into the project** (they go into `.claude/skills/`):
  - `npx -y skills add pbakaus/impeccable --agent claude-code`: anti-slop design skill with audit and polish commands
  - `npx -y skills add anthropics/claude-code --skill frontend-design --agent claude-code`: Anthropic's official frontend-design skill
  - `npx -y skills add phaserjs/phaser --agent claude-code`: official Phaser 4 skills
  - If a newly installed skill doesn't load automatically in this session, read its `SKILL.md` directly from `.claude/skills/` whenever the relevant work comes up. If an install fails, retry once, then log it in BLOCKERS.md and continue.
  - Read the impeccable and frontend-design skills once now, and record which of their rules apply to a pixel-art game (and which B6 overrides) in STYLE_GUIDE.md.
- **Browser testing:** your own screenshots and play-throughs use **Playwright Test** scripts (`npm run screenshots`, `npm run e2e`). After writing a screenshot, view the PNG with the Read tool. Also run `claude mcp add playwright -- npx @playwright/mcp@latest` so the Playwright MCP is ready for future sessions. It may not be available until Claude Code restarts, so don't depend on it tonight.
- Create the project with Vite, TypeScript and Phaser 4. Install Vitest and Playwright (`npx playwright install chromium`).
- **Windows compatibility:** every npm script must run in PowerShell. Use Node scripts or cross-platform packages instead of bash-only commands like `rm -rf`, `cp` or `&&` chains that assume a Unix shell.
- Add the `.claude/agents` and `.claude/skills` files, `CLAUDE.md`, and skeletons of every doc.
- *Accept when:* `npm run dev` shows a blank game at integer scale, `npm test` passes, and everything is committed.

**M1: Style lock.**
- Write STYLE_GUIDE.md.
- Build the art primitives, palette, font, and 1 hero, 1 enemy and 1 god.
- Build tiles, one panel frame with a meander border, and the gallery page.
- Run the review loop until style-reviewer has no major issues.
- *Accept when:* the gallery shows a cohesive mini style sheet that is clearly better than the reference mockups, and the palette test passes.

**M2: Rules engine.**
- Build the board, units, move, strike, push and swap, intents, enemy turn resolution, objectives, undo, win/lose, and Kleos stars, all in `src/core` with thorough unit tests (aim for over 90% coverage of `src/core`).
- Write the level JSON format plus the validator, which runs a schema check and replays the recorded solution.
- *Accept when:* 3 test levels validate and every rule has tests.

**M3: Playable slice (critical).**
- Render the board, units, intent markers, selection and move range, HUD (turn counter, End turn, Undo, Restart), and basic animations.
- Make Levels 1–3 fully playable from a minimal title screen, then show a victory screen.
- *Accept when:* `npm run check` passes, including an e2e test that wins Level 1 by replaying its solution through the UI, and screenshots are captured.

**M4: Full cast.**
- Add all heroes, enemies, environment tiles, and patron favors and Trojan god events from B12, each with art, animation, sounds and tests.

**M5: Campaign.**
- Build all 15 levels (B12), each validated, with par turns and Kleos conditions. Difficulty ramps up and each level teaches one new idea.
- Use `level-designer` in parallel. A level linter flags levels that are trivial (solvable in 1 turn) or have no meaningful choice.

**M6: Screens and flow.**
- Build Boot, Title, Level select, Patron select, Battle, Victory, Defeat, act-intro Cutscenes, Settings, Credits and Pause.
- Saving and loading works.
- *Accept when:* e2e tests cover the whole flow (new game, play Level 1, return to level select, the save persists after reload, settings persist).

**M7: Audio and juice.**
- Add all sound effects and music, hit-stop, small integer-pixel screen shake (toggleable), the pottery-shatter effect, god manifestations, title screen animation, and button feedback.

**M8: Polish pass.**
- Do a full review loop on every screen, with an impeccable audit and polish on the UI.
- Accessibility: threats shown by shape *and* color, keyboard controls for everything, reduced-motion and screen-shake toggles, readable text sizes.
- Performance: a steady 60 fps, and a small bundle.

**M9: Hardening.**
- Get the full `npm run check` green and fix every open bug in BUGS.md.
- Run `qa-tester` over every level.
- Make sure the production build works from a static folder, and write the itch.io upload steps in WORKFLOW.md.

**M10: Morning report.**
- Write `docs/MORNING_REPORT.md` (B14) and mark it FINAL.

If you finish M10 with budget left, return to M8: polish the weakest screen, add one optional bonus level, and improve the title screen. Don't add new systems.

## B12. Game design content (starting values; tune them in GDD.md and log changes)

**Turn structure:** enemies telegraph their intents. On the player phase, each hero may **move, then act** (once each, in that order). You can **undo** within your phase. The enemy phase resolves intents **in a visible numbered order**, then enemies reposition and telegraph new intents. Everything is deterministic, with no randomness in combat.

**Damage and HP:** keep numbers small. Heroes have 3–4 HP, regular enemies 1–3 HP, bosses 5–6 HP.

**Push and swap rules (the core puzzle verbs):**
- A unit pushed into a wall or another unit takes 1 damage, and so does whatever it hits.
- A unit pushed into deep water (the river Scamander) is swept away.
- Enemies keep their telegraphed attack direction after being moved, so repositioning them can make them hit each other or nothing.

**Heroes:**
- **Achilles:** move 3. Strike: 2 damage to an adjacent unit.
  - *Passive "Heel":* immune to all melee damage, but any **arrow** hit defeats him instantly. This sets up the Paris levels.
- **Ajax:** move 2. Strike: 1 damage.
  - *Passive "Tower shield":* takes 1 less damage from every hit (minimum 0). Allies directly behind him, relative to the attack's direction, are protected from that attack.
- **Odysseus:** move 3. Strike: 1 damage.
  - *Action "Cunning swap":* swap places with any unit (ally or enemy) in a straight line within 3 tiles.
- **Diomedes:** move 2. *Action "Spear push":* 1 damage plus push the target 1 tile.
- **Patroclus** (guest, Act II): wears Achilles' armor, so enemies prioritize him. He is the center of a story level.

**Enemies:**
- **Spearman:** attacks the adjacent tile in its facing direction, 1 damage.
- **Archer:** shoots in a straight line and hits the first unit, 1 damage. Arrows are deadly to Achilles.
- **Shieldbearer:** can't be damaged from the front. You have to push it or flank it.
- **Chariot:** charges in a straight line until it's blocked, dealing 2 damage to whatever it hits.
- **Hector** (boss): 6 HP, a sweeping attack on 3 tiles, 2 damage.
- **Paris** (boss archer): his arrows always target Achilles if he has a line of sight.

**Tiles:**
- Ground, wall or rock
- Deep water (the Scamander)
- Greek ships (an objective to protect; they have HP)
- Fire (spreads 1 tile per enemy phase along marked tiles)
- Gate (an objective)
- Torchlight (stealth level: being seen counts as a fail)

**Objectives:** defeat all enemies, survive N turns, protect the ships, reach a tile (escort), or reach the gate unseen (stealth).

**Kleos stars (3 per level):**
1. Win.
2. No hero falls.
3. Finish within the par turn count.

**Patron gods** (choose one before each level; unlock over the campaign; each favor is single-use per level):
- **Zeus:** a lightning bolt deals 2 damage to any tile.
- **Athena:** one hero gets a second action this turn.
- **Poseidon:** a wave pushes every unit in a chosen row or column 1 tile.

**Trojan god events** (level modifiers, telegraphed in advance):
- **Apollo:** plague arrows hit marked tiles for 1 damage at the end of the enemy phase.
- **Ares:** all enemies deal +1 damage next enemy phase. Shown as a red aura intent.
- **Aphrodite:** the first Trojan defeated is whisked away in a mist and returns 2 turns later at a marked tile (as Paris was rescued in Iliad Book 3).

**Campaign (15 levels; each teaches one idea; titles are suggestions):**

*Act I: The Beaches*
1. The Landing (move and strike)
2. Arrows from the Dunes (archers, line of fire)
3. Ajax Holds (tower shield, protect allies)
4. Fire at the Ships (protect objective, spreading fire)
5. The Man of Many Turns (Odysseus's swap; make enemies hit each other)

*Act II: The Plain of Troy*

6. The River Scamander (Diomedes's push, deep water)
7. Chariots (charge lanes)
8. In Borrowed Armor (Patroclus, decoy targeting)
9. Apollo's Plague (Trojan god event)
10. Hector at the Gates (boss)

*Act III: The Walls*

11. The Wrath (Achilles; many enemies, efficient routing)
12. Mist of Aphrodite (rescued enemies)
13. Paris on the Walls (arrow threat to Achilles; afterward a cutscene shows his fate, tastefully, as a vase scene)
14. The Wooden Gift (stealth, torchlight)
15. The Gates Open (finale combining everything)

**Level format** (JSON, human-editable, so the user can add levels later):
```json
{
  "id": "a1-04",
  "act": 1,
  "title": "Fire at the Ships",
  "teaches": "Protect an objective while fire spreads",
  "board": ["########",
            "#..SS..#",
            "#......#",
            "#.^^...#",
            "#......#",
            "########"],
  "legend": { ".": "ground", "#": "rock", "S": "ship", "^": "fire" },
  "units": [ { "type": "ajax", "x": 3, "y": 2 }, { "type": "spearman", "x": 5, "y": 4, "facing": "up" } ],
  "objective": { "type": "protect", "target": "ships", "turns": 4 },
  "patrons": ["zeus", "poseidon"],
  "trojanEvent": null,
  "par": 4,
  "intro": "string id in strings.ts",
  "solution": [ ["move","ajax",3,3], ["act","ajax","strike",4,3], ["endTurn"] ]
}
```
Every level **must** include a recorded `solution` that the validator replays to a win within `par`. Adjust the format as needed and document it in LEVELS.md and ARCHITECTURE.md.

## B13. Screens
- **Title:** a slowly scrolling frieze band of marching geometric warriors (parallax), the custom-font logo inside a meander frame, faint god silhouettes in the sky, and the tagline. Menu: Continue, New campaign, Settings, Credits.
- **Level select:** the campaign painted as a frieze around a vase. Scroll or turn the vase to move between acts. Each level is a painted medallion showing its Kleos stars. Locked levels are shown as unpainted clay.
- **Patron select:** the three patron portraits with their favor explained in one line each.
- **Battle HUD:** turn and par counter, End turn, Undo, Restart, the patron favor button, hover tooltips showing unit info and intents, and the numbered enemy action order.
- **Victory:** Kleos stars awarded one by one, with a short line of text. **Defeat:** "The gods are amused." with Retry and Undo last turn.
- **Act intro cutscenes:** 2–3 vase-panel scenes with one line of text each. Skippable.
- **Settings:** music and sound volume, screen shake, reduced motion, a high-contrast intent option.
- **Credits:** made with Claude Code, plus tools, fonts (yours), and public-domain sources.
- **Pause:** resume, restart, settings, quit to map.

## B14. MORNING_REPORT.md (the last thing you write)

Write it for a non-expert reader, in plain language, and keep it short:
1. **How to play it now:** the exact commands, and what to click.
2. **What's done:** milestone checklist with status.
3. **Screenshots:** embed links to the key images in `docs/screenshots/`, and to the art gallery route.
4. **Decisions I made for you:** the top 10 from DECISIONS.md, one line each.
5. **What needs your eyes:** the 3–5 things where your taste matters most (art details, difficulty, tone).
6. **Known issues:** from BUGS.md.
7. **Recommended next steps:** 5 small, concrete tasks, plus how to run them (point to WORKFLOW.md: subagents vs. extra terminals).
8. **How to publish to itch.io** when ready.

Mark it `Status: FINAL` at the top only when `npm run check` passes and every milestone is checked or marked DEFERRED with a reason.

## B15. Final reminders
- Build the playable slice before you build anything beautiful, then make it beautiful.
- Gameplay readability beats decoration. Every threat has to be obvious at a glance.
- Commit and update PROGRESS.md after every task.
- No questions after Phase 0. Decide, log the decision, and continue.
- When in doubt about a visual, ask: "Would this look at home painted on a 2,700-year-old vase, rendered on a Game Boy Advance?" If not, simplify.
