# Workflow: how to keep building

## Daily loop
1. `cd ~\Documents\pawns-of-olympus` then `claude`.
2. First message: `Read docs/PROGRESS.md and CLAUDE.md, then <your task>.`
3. Play the result with `npm run dev` and open http://localhost:5173. Art gallery: http://localhost:5173/gallery.html.

## One main session + subagents (best default)
The project has four subagents in `.claude/agents/`. They report to the main session, not to you, so they cost the least of your attention:
- `style-reviewer`: strict art critique of screenshots. "Have style-reviewer review the level select screen."
- `qa-tester`: runs every check, plays levels, files bugs in `docs/BUGS.md`.
- `level-designer`: designs levels with recorded solutions. "Use level-designer to design 3 new Act 2 levels about chariots."
- `lore-keeper`: writes and checks story text and names.

## Extra terminals with git worktrees (when you want more speed)
Give a second session low-attention work (tests, save system, menus, bug fixes); keep art direction and level feel in your main session.
```powershell
git worktree add ..\pawns-chores -b chores
cd ..\pawns-chores
npm install
claude
```
Merge back from the main folder with `git merge chores` when it's done. Two or three sessions at once is the sweet spot.

## Adding levels yourself
Levels are JSON files in `src/data/levels/`. Copy one, change the board and units, add it to `src/data/levels/index.ts`, and record a solution. `npm run validate-levels` tells you if the solution still wins within par. Format: `.claude/skills/pawns-level-design/SKILL.md`.

## Reviewing art
Open the gallery page, and the PNGs in `docs/screenshots/`. Say exactly what's wrong ("Ajax's shield reads as a door", "tiles too orange"). Sprites are code recipes in `src/art/sprites/`; `npm run export-sprites` writes PNG sheets to `art-export/` if you want to edit pixels in LibreSprite/Aseprite.

## Your private GitHub repo (morning setup)
```powershell
gh repo create pawns-of-olympus --private --source . --remote origin --push
```
Then `git push` whenever you like. The repo stays private.

## Publishing (when you decide to)
Nothing is published until you do these steps yourself.

### GitHub Pages
1. Push the repo to GitHub (see above).
2. GitHub Pages from a **private** repo needs a paid GitHub plan (Pro/Team). On a free account the repo must be public for Pages to work. A Pages site is always public, whatever the repo's visibility.
3. In the repo on github.com: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
4. Actions tab > **Deploy to GitHub Pages** > **Run workflow**. It builds and publishes `dist/`. The site appears at https://<your-user>.github.io/pawns-of-olympus/.
5. All paths are relative, so the game works at that sub-path (the e2e tests already run it under /pawns-of-olympus/).

### itch.io
1. `npm run build` then `npm run package:itch` -> `release/pawns-of-olympus-web.zip`.
2. On itch.io: Create new project > Kind of project: **HTML** > upload the zip > tick **This file will be played in the browser**.
3. Embed options: viewport 1280 x 720 (any 16:9 works; the game scales by whole numbers), tick **Mobile friendly** with orientation **Landscape**, tick **Fullscreen button**.
4. Save as draft, test the page, then set visibility when ready.

### Before publishing, check
- `npm run check` passes.
- Play the build locally: `npm run build` then `npm run preview` (http://localhost:4173).
