# Decisions

Format: decision · options considered · why.

1. **Platforms: desktop + touch** (Phase 0 answer). Pointer-event input everywhere, landscape only, touch e2e project.
2. **Story: expanded** (Phase 0 answer). Act intros 3–4 panels, per-level pre/post scenes, god banter.
3. **Hosting: GitHub Pages, keep itch.io open** (Phase 0 answer). `base: ./`, relative paths, manual Pages workflow, `package:itch` zip script.
4. **GitHub: skipped for tonight.** Creating the private repo was blocked by the auto-mode safety check; the user chose to set it up in the morning. Commits stay local.
5. **TypeScript 6.0, not 7.x.** typescript-eslint 8.72 supports TS <6.1. Options: TS 7 without type-aware lint, or TS 6. TS 6 keeps the lint step working.
6. **Integer scaling done by our own scaler in device pixels** (Phaser Scale.NONE + CSS size). Options: Phaser `MAX_ZOOM` (CSS pixels, blurry seams at 125%/150% Windows scaling). Device-pixel math keeps every game pixel an exact block.
7. **e2e runs against the production build served under `/pawns-of-olympus/`.** It proves relative paths work for a GitHub Pages project site on every run.
8. **frontend-design skill source:** `anthropics/claude-code` contained no installable skill; installed from `anthropics/skills` instead (same skill).
9. **Playwright MCP already registered and connected in this environment**, so `claude mcp add` was not re-run.
10. **npm audit: moderate minimatch advisory in eslint dev dependencies only.** Not shipped to players; the only "fix" downgrades ESLint. Left as is.
11. **Level solution format:** `solution: { patron, turns: [[actions...]] }` instead of a flat list, so per-turn grouping and patron choice are explicit.
12. **Master palette: 32 colors** = the 18 reference colors + 14 shades (see STYLE_GUIDE.md). Night variant is a palette remap, not extra colors.
13. **Project subagents need a Claude Code restart to load.** Tonight they run as general-purpose agents told to read and follow `.claude/agents/<name>.md`. Same prompts, same rules.
14. **Boards have no rock border.** The board edge acts as a wall for pushes; the board stands on a meander plinth. Rocks are dark umber (black-figure) blocks used only as obstacles, for contrast with clay ground.
15. **Tile pitch 24×16** with a 24×18 tile image (2px front lip shows only on the nearest row).
16. **Level 1 has no patron.** The linter showed Zeus makes it a one-turn win; Zeus is introduced in Level 2.
17. **Poseidon's wave pushes units one by one from the leading end** (a blocked lead means the next unit collides with it). Simpler and consistent with the push rule.
18. **Ships burn when next to fire** (not on brush), so fire threatens ships along brush lanes in Fire at the Ships.
19. **Stealth: heroes who step on the gate leave the board**; win when every living hero is out. Sentries see 3 tiles along their facing; standing in torchlight at the end of the player phase also counts as seen.
20. **Enemy order numbers are fixed at the start of the enemy phase**, so a Trojan killed mid-phase doesn't renumber the rest.
21. **a2-05 "Hector at the Gates" is an escort, not a rout.** The story has Hector withdraw unbeaten in Act II and fall in Act III; a rout would kill him early. Win = Diomedes reaches the gate.
22. **Plague stays as built** (marks the tiles heroes stand on; hits at the end of the next enemy phase). It teaches "keep moving" more than "shelter under Ajax". Kept because it is readable; the finale combines it with other threats to make it bite.
23. **Diomedes' spear push moves allies without damage.** Legal per GDD §5; players can use it to give a slow ally an extra tile.
24. **a3-03 "Paris on the Walls" is an escort (Achilles reaches the gate)**, with Paris fixed in a tower above a stair. As a rout, Achilles simply sidestepped Paris's lines and Ajax was never needed.
25. **a3-01 has no Ares**: with Ares, ending turns and letting the Trojans hit each other won within par.
26. **Trojans stay a little clumsy** (an idle Trojan faces the nearest hero even if an ally is in the way; spearmen still value Achilles as a target though melee can't hurt him). Changing the AI now would invalidate the recorded solutions, and "the gods use mortals carelessly" fits the theme. Logged for a future tuning pass.
27. **Night palette applies to Greeks only.** With every figure remapped to red-figure orange, the two sides were indistinguishable in The Wooden Gift. Trojans keep wine/iron.
28. **Stealth sight lines are drawn** (sun-colored eye marks on the 3 tiles each sentry sees), because an invisible losing condition breaks the "every threat is obvious" pillar.
29. **God manifestations are drawn at native 48x56**, not 64-96px: scaling a portrait up would mix pixel sizes, and a new 96px figure set was out of scope tonight.
30. **Music and SFX are our own synth code (ZzFX-style parameter lists, Karplus-Strong lyre)** rather than vendoring ZzFX itself; no third-party audio code ships.
