# Style Guide: "Pottery Pixel"

GBA-era pixel art (limited rich palette, crisp 1px outlines, tiny highlight pixels) built from the flat geometric shapes of **Geometric-period** Greek vase painting (c. 900–700 BC: triangle torsos, stick limbs, meander and zigzag bands), in a **black-figure** pottery palette. It should look like a painted vase came to life as a game.

**The test:** would this look at home painted on a 2,700-year-old vase, rendered on a Game Boy Advance? If not, simplify.

Condensed checklist for agents: `.claude/skills/pawns-art-style/SKILL.md`. Live reference: `npm run dev` → `/gallery.html`.

## 1. Canvas and pixels
- Internal resolution **320×180**. The canvas is upscaled by a whole number in **device pixels** (`src/game/scaler.ts`), centered, letterboxed in ink `#2a1a10`.
- **One pixel size everywhere** (sprites, tiles, UI, text). Never scale by a fraction, never rotate pixel art (intent glyphs rotate only in exact 90° steps, pixel-copied), never draw at fractional coordinates.
- Phaser runs with `pixelArt: true` and `roundPixels: true`.

## 2. Palette (32 colors, `src/art/palette.ts`)
| # | Hex | Name | Main uses |
|---|---|---|---|
| 0 | `#f7e3bd` | cream | sky, highlights on clay, hit flash, text on ink |
| 1 | `#efc08a` | sand | sky band, light ground, rock-free sand |
| 2 | `#f08a4b` | sun | sun disc, Apollo, red-figure night figures |
| 3 | `#d29a5e` | clay | board tiles, panels |
| 4 | `#b5783f` | deepClay | grout, rules, shadows on clay |
| 5 | `#7a4a20` | umber | rock tops, wood, secondary text |
| 6 | `#2a1a10` | ink | outlines, black-figure silhouettes, primary text |
| 7 | `#e0a83a` | bronze | Greek armor, Zeus, buttons' hover |
| 8 | `#ffe9a0` | goldHi | metal highlights, move range, focus, hero HP |
| 9 | `#d8342c` | red | Achilles' crest, danger lines, enemy HP, Ares |
| 10 | `#3a62c0` | blue | Achilles' tunic |
| 11 | `#3f8a5a` | olive | Ajax's tunic, brush |
| 12 | `#6b9480` | sage | hills |
| 13 | `#8a2a3a` | wine | Trojan tunics |
| 14 | `#7a3a9a` | purple | Trojan crests |
| 15 | `#9aa4b0` | iron | Trojan metal |
| 16 | `#f0b888` | skin | all skin |
| 17 | `#c45a3c` | threat | threatened tiles |
| 18 | `#4a2a14` | darkUmber | rock faces, deep shadow, night ground |
| 19 | `#b07a22` | bronzeDk | bronze shadow, spear shafts |
| 20 | `#2c4a96` | blueDk | Achilles' skirt |
| 21 | `#2e6a44` | oliveDk | Ajax's skirt, far hills |
| 22 | `#6a1e2c` | wineDk | Trojan skirts |
| 23 | `#6e7884` | ironDk | iron shadow |
| 24 | `#dfe6ee` | ironHi | iron highlight, Athena |
| 25 | `#f4efe0` | bone | white crests, robes, foam |
| 26 | `#cfc6b0` | boneDk | robe shadow |
| 27 | `#1f7a8a` | sea | water, Poseidon |
| 28 | `#165c68` | seaDk | wave shadow |
| 29 | `#e88aa8` | rose | Aphrodite |
| 30 | `#5a3a2a` | nightClay | night tiles, gates |
| 31 | `#d9a066` | clayLt | alternate tiles, chips |

- Each character or god sprite uses **≤ 8 colors** (unit-tested).
- Sprites store **palette indices**, so off-palette colors are impossible by construction; `tests/art.test.ts` also scans every texture's RGBA.
- **Night ("red-figure") variant:** a palette remap (`NIGHT_REMAP`): ground and sky go to ink/dark umber/night clay, skin becomes sun orange, so Greek figures read orange on near-black like red-figure ware. Trojans keep their wine, purple and iron at night so the two sides never merge.
- **God halo colors:** Zeus bronze, Athena ironHi, Poseidon sea, Apollo sun, Ares red, Aphrodite rose.

## 3. Sizes
| Asset | Size |
|---|---|
| Board tile | 24×18 image (24×16 top face + 2px front lip); rows stacked every 16px |
| Rock block | 24×26 (rises 8px above its row) |
| Hero / Trojan | 24×32 including outline, feet on row 30, standing 3px above the tile's bottom |
| Boss | up to 32×40 |
| God portrait | 48×56 |
| God manifestation | 64–96px silhouette behind the board |
| Board plinth | board width × 12, meander band |
| Glyphs | caps 5×7, line height 10 |

## 4. Shape language
- **Heroes:** inverted-triangle torso, belt, short trapezoid skirt with dotted hem, stick legs with greaves, round head with a single dot eye (Geometric convention), half-disc crest on a dome helmet, round or tower shield, spear. Each hero = crest color + shield shape + tunic color:
  Achilles red crest / blue / round with red boss · Ajax white crest / olive / tower shield · Odysseus felt pilos cap / sand / round with an eye · Diomedes gold crest / deep clay / round with boar-tusk marks, long spear · Patroclus Achilles' kit, darker tunic.
- **Trojans:** same build, mirrored to face left, wine/purple tunics, iron helmets and shields, purple crests. Archers wear a Phrygian cap and carry a bow, no shield.
- **Gods:** hourglass of two triangles, long robe with a bronze meander hem, hair cap, one signature item, dithered halo ring.
- **Environment:** flat shapes. Sky in hard bands, flat disc sun or moon, triangle hills, triangle sea waves, block walls with crenellations and square towers. Rocks are dark umber blocks (black-figure). Tiles are clay with grout lines, a faint tessera lattice, and per-variant chips/cracks.
- **Decoration:** meander (Greek key), zigzag, checker and dot-rosette bands. The board stands on a meander plinth like a vase frieze.

## 5. Rendering technique
- 2 tones per material (base + shadow on the right; light from the upper left) and 1–3 highlight pixels on metal.
- 1px ink outline on characters (4-neighbour, no diagonals, so the silhouette stays soft-cornered).
- **Effects use ordered dithering (Bayer 4×4) and palette steps only.** Halos, light pools, fades, smoke, the move range, god manifestations all dither. Never alpha blending, blur, glow, bloom.
- Sky bands are joined by a 2-row 50% dither, never a smooth ramp.

## 6. UI
- Panels are vase fields: flat terracotta fill, outer ink line, 1px gap, inner rule; larger panels add meander bands at top and bottom. Styles: clay (default), ink (title strips), cream (reading panels).
- Buttons are flat clay tablets with an ink frame and a deep-clay lower edge. Hover: gold inner frame. Down: label shifts 1px. Disabled: deep clay, umber text. Keyboard hints in a small dark box after the label.
- Text: ink on clay or cream on ink. Secondary text umber; warnings red. Never more than two text colors in one block.
- Markers: HP pips (gold = Greek, red = Trojan, umber = lost); intent order badges (ink square, red border, cream digit; red fill when Ares' rage is on).

## 7. Threats (readability first)
Each threat is distinguishable by **shape and color**: threatened tiles are filled threat-clay with a diagonal hatch and red frame; on top sits an ink intent glyph (thrust = spear point, arrow = fletched arrowhead, charge = double chevron, sweep = arc, plague = falling arrow, bolt = zigzag), pointing in the attack direction, plus the numbered order badge. Arrow and charge paths are dotted red lines. High-contrast mode switches the hatch to ink.

## 8. Animation
See `docs/ANIMATION.md`. Stiff and punchy like vase figures: stepped motion, no floaty easing, no sub-pixel drift. Idle breath 2 frames; move 80–120 ms per tile; attack wind-up/strike/recover with 60–90 ms hit-stop; 1-frame cream hit flash; pottery-shard shatter on defeat.

## 9. Typography: "Stele"
Own bitmap font (`src/art/font.ts`): lapidary capitals (straight strokes, open joins, splayed M, pointed A), plain lowercase, 5×7 caps, x-height 5, 1px tracking, optional hard 1px pixel shadow. Special glyphs: `*` Kleos star, `^` empty star, `~` HP pip. **Banned:** Press Start 2P, Inter, Roboto, Arial, Papyrus-style or any browser font in-game.

## 10. Banned list
- Gradients on sprites or UI panels. Soft glows, bloom, blur, drop shadows. Neon colors.
- Colors outside the palette. Mixed pixel sizes. Rotated or fractionally scaled pixel art. Anti-aliased edges. Partial transparency.
- Generic fantasy UI: stone or metal bevels, glossy buttons, purple-blue gradients, lens flares, sparkles on everything.
- Emoji, stock icons, icon fonts. Rounded "app" cards.
- Text that sounds generic or AI-written (see STORY.md).
- AI-generated images or audio of any kind.

## 11. What the web-design skills contribute (and what this guide overrides)
From `frontend-design` and `impeccable` we keep: ground every choice in the subject's own materials (clay, bronze, ink, vase friezes); spend boldness in one place per screen (the board, or the god); visual structure must carry information (bands frame content, numbers only for real sequences like intent order); plain, active, terse UI copy ("End turn", "Undo"); visible focus for keyboard; reduced motion respected; one orchestrated motion moment per screen rather than scattered effects; take screenshots and critique.
**Overridden by this guide:** web fonts and type pairing (we use one bitmap font), smooth gradients and soft shadows, border-radius, CSS transitions/easing curves, responsive reflow (we letterbox a fixed 320×180 canvas and scale by integers), and their warning against warm cream + terracotta palettes (the brief pins this palette: it comes from the pottery itself).
