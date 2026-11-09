---
name: pawns-art-style
description: Strict art rules for Pawns of Olympus ("Pottery Pixel"). Load for ANY art, sprite, tile, UI, HUD, menu, screen, font, effect or visual work in this project, and before reviewing screenshots.
---

# Pawns of Olympus: art style (condensed, strict)

Full bible: `docs/STYLE_GUIDE.md`. Palette source of truth: `src/art/palette.ts`. Reference sketch: `reference/reference-mockups.html` (a floor, not the bar).

**One-line test:** would this look at home painted on a 2,700-year-old vase, rendered on a Game Boy Advance? If not, simplify.

## Hard rules
- Internal resolution **320×180**, integer upscaling only. **One pixel size everywhere** (UI included). Never scale a sprite by a non-integer, never rotate pixel art, never place at fractional coordinates (`Math.round` every position).
- **Master palette only** (32 colors in `src/art/palette.ts`). At most 8 colors per sprite. A unit test scans generated textures; it must pass.
- Night levels use the **red-figure** palette swap (orange figures on near-black), built from the same 32 colors.
- Shading: base + 1 shadow tone on one side (light from upper-left), 1–3 highlight pixels on metal. **No gradients** on sprites or panels.
- Outline: 1px ink `#2a1a10` (or a darker palette shade of the sprite's own color).
- Effects (magic, light, smoke, fades): **ordered dithering** (Bayer 4×4) and palette steps only. Never alpha gradients, blur, glow, bloom.
- Text: only the project bitmap font (`src/art/font.ts`), 5×7 caps-height lapidary letters, optional 1px shadow. No browser fonts on screen, ever.

## Shape language
- Heroes: inverted-triangle torso, short skirt band, stick legs, round head, half-circle helmet + half-disc crest, round or tower shield. Identify each hero by crest color + shield shape + tunic color.
- Trojans: same build, wine/purple tunics, iron helmets and shields, purple crests.
- Gods: hourglass (two triangles), long robe with gold meander hem, one signature item, dithered halo ring in their signature color.
- Environment: block walls with crenellations, triangle hills, flat disc sun/moon, triangle waves. Tiles are clay/mosaic: few chips, cracks, grain. Never noise.
- Decoration: meander (Greek key), zigzag, checker and dot-rosette bands frame screens and panels.

## Sizes
Tiles 24×18 (3/4 view). Heroes ~24×32 incl. outline. Bosses ≤32×40. God portraits 48×56. God manifestations 64–96 px tall silhouettes behind the board.

## Animation
Idle 2 frames, 1px bob, ~500 ms, offset per unit. Move: tile-to-tile slide 80–120 ms, 1px landing squash. Attack: 3 frames + 60–90 ms hit-stop. Hit: 1-frame cream flash (palette swap), 1–2 px knockback, number pop. Defeat: **pottery shatter** (shards fall, dither out). Stiff and punchy: no floaty easing, no sub-pixel drift.

## Banned
Gradients on sprites/UI; soft glow, bloom, blur, drop shadows; neon; off-palette colors; mixels; rotated/fractional pixel art; anti-aliased edges; stone/metal bevels, glossy buttons, purple-blue gradients, lens flares, sparkles everywhere; emoji, stock icons, icon fonts; rounded "app" cards; Press Start 2P, Inter, Roboto, Arial, Papyrus-style fonts; AI-generated images; generic or AI-sounding text.

## Review checklist (run on every screenshot)
1. Every color from the palette? 2. Every pixel crisp? 3. Every unit, team and threat distinguishable at a glance (by shape AND color)? 4. Looks like a painted vase, not a generic pixel game? 5. No text cut off? 6. Visual hierarchy obvious (what matters most is most visible)?

## Where web-design skills conflict
`frontend-design` and `impeccable` guide hierarchy, copy, spacing and restraint. Where they suggest smooth gradients, web fonts, soft shadows, rounded cards or CSS motion, **these pixel rules win**.
