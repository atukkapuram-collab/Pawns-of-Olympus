/**
 * Art gallery (morning art review page). `npm run dev` → /gallery.html.
 * Every asset is drawn from its recipe and shown at integer zoom.
 */
import { C, PALETTE_HEX, FIGURE_NIGHT_REMAP, flashMap, type ColorIndex } from '../../src/art/palette';
import { PixelBuffer } from '../../src/art/pixels';
import { textBuffer } from '../../src/art/font';
import { buildFigureFrames, FIGURES } from '../../src/art/sprites/units';
import { POSES } from '../../src/art/sprites/figure';
import { buildPortrait, GODS } from '../../src/art/sprites/gods';
import * as T from '../../src/art/sprites/tiles';
import { button, frieze, panel } from '../../src/art/ui';
import { drawBackdrop } from '../../src/art/backdrops';
import { composeSampleScene } from './sample-scene';

const root = document.getElementById('gallery')!;
document.title = 'Pawns of Olympus: art gallery';
Object.assign(document.body.style, { margin: '0', padding: '24px', background: PALETTE_HEX[C.ink] });

function canvasOf(b: PixelBuffer, zoom: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  c.getContext('2d')!.putImageData(new ImageData(b.toRGBA() as ImageDataArray, b.w, b.h), 0, 0);
  Object.assign(c.style, { width: `${b.w * zoom}px`, height: `${b.h * zoom}px`, imageRendering: 'pixelated', display: 'block' });
  return c;
}

function label(text: string, color: ColorIndex = C.cream, zoom = 2): HTMLCanvasElement {
  return canvasOf(textBuffer(text, color), zoom);
}

function section(title: string, note?: string): HTMLDivElement {
  const s = document.createElement('section');
  Object.assign(s.style, { margin: '0 0 40px' });
  s.appendChild(label(title, C.goldHi, 3));
  if (note) {
    const n = label(note, C.clayLt, 2);
    n.style.marginTop = '8px';
    s.appendChild(n);
  }
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', marginTop: '14px' });
  s.appendChild(row);
  root.appendChild(s);
  return row;
}

function item(row: HTMLElement, b: PixelBuffer, name: string, zoom = 4): void {
  const d = document.createElement('div');
  d.appendChild(canvasOf(b, zoom));
  const l = label(name, C.clayLt, 2);
  l.style.marginTop = '6px';
  d.appendChild(l);
  row.appendChild(d);
}

// ---- Title ----
root.appendChild(label('Pawns of Olympus: art gallery', C.goldHi, 4));
const sub = label('All art is drawn in code from the 32-color master palette. Shown at 4x unless noted.', C.clayLt, 2);
sub.style.margin = '8px 0 32px';
root.appendChild(sub);

// ---- Sample scene ----
{
  const row = section('Sample battle scene, 2x', 'Board, units, threat and move tiles, selection, HUD panel.');
  item(row, composeSampleScene(), 'beach, turn 1', 2);
}

// ---- Palette ----
{
  const row = section('Master palette (32)');
  PALETTE_HEX.forEach((hex, i) => {
    const b = new PixelBuffer(12, 12).rect(0, 0, 12, 12, i);
    b.frame(0, 0, 12, 12, i === C.ink ? C.umber : C.ink);
    item(row, b, `${i} ${hex.slice(1)}`, 4);
  });
}

// ---- Font ----
{
  const row = section('Stele: the bitmap font', 'Caps 5x7, lowercase x-height 5, line height 10.');
  const sample = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789 .,:;!?\'"-+=/()[]%&<>_#',
    'Sing, goddess, the wrath of Achilles.',
    'End turn   Undo   Patron: Athena   Kleos 2/3',
    'Kleos ***  ^^^   HP ~~~',
  ].join('\n');
  const b = new PixelBuffer(220, 64).rect(0, 0, 220, 64, C.clay);
  const t = textBuffer(sample, C.ink);
  b.blit(t, 4, 4);
  item(row, b, 'ink on clay, 3x', 3);
  const b2 = new PixelBuffer(220, 64).rect(0, 0, 220, 64, C.ink);
  b2.blit(textBuffer(sample, C.cream, { shadow: C.umber }), 4, 4);
  item(row, b2, 'cream on ink with pixel shadow, 3x', 3);
}

// ---- Units ----
{
  const row = section('Heroes and Trojans', 'Poses: idle 0, idle 1 (1px breath), wind-up, strike, hit flash.');
  for (const type of Object.keys(FIGURES)) {
    const fr = buildFigureFrames(type);
    const strip = new PixelBuffer(24 * 5 + 4 * 4, 32);
    POSES.forEach((p, i) => strip.blit(fr[p], i * 28, 0));
    strip.blit(fr.idle0.paletteSwap(flashMap()), 4 * 28, 0);
    item(row, strip, type, 4);
  }
}

// ---- Gods ----
{
  const row = section('Gods: portraits 48x56');
  for (const g of Object.keys(GODS)) item(row, buildPortrait(g), g, 4);
}

// ---- Tiles ----
{
  const row = section('Tiles 24x18 and overlays');
  for (let v = 0; v < 4; v++) item(row, T.groundTile(v, v % 2 === 1), `ground ${v}`);
  item(row, T.sandTile(0), 'sand');
  item(row, T.rockTile(0), 'rock');
  item(row, T.waterTile(0), 'water 0');
  item(row, T.waterTile(1), 'water 1');
  item(row, T.brushTile(0), 'brush');
  item(row, T.fireSprite(0), 'fire 0');
  item(row, T.fireSprite(1), 'fire 1');
  item(row, T.moveOverlay(), 'move');
  item(row, T.threatOverlay(), 'threat');
  item(row, T.threatOverlay(true), 'threat hc');
  item(row, T.selectOverlay(), 'select');
  item(row, T.lightPool(), 'torchlight');
}

// ---- UI ----
{
  const row = section('UI: panels, buttons, friezes');
  item(row, panel(120, 64, 'clay', true), 'panel clay + meander', 3);
  item(row, panel(80, 40, 'ink'), 'panel ink', 3);
  item(row, panel(80, 40, 'cream'), 'panel cream', 3);
  item(row, button(56, 14, 'End turn', 'idle', 'E'), 'button', 3);
  item(row, button(56, 14, 'End turn', 'hover', 'E'), 'hover', 3);
  item(row, button(56, 14, 'End turn', 'down', 'E'), 'down', 3);
  item(row, button(56, 14, 'Undo', 'disabled', 'Z'), 'disabled', 3);
  item(row, frieze(120, 'meander'), 'meander', 3);
  item(row, frieze(120, 'checker'), 'checker', 3);
  item(row, frieze(120, 'rosette'), 'rosette', 3);
}

// ---- Backdrops ----
{
  const row = section('Backdrops 320x180, 2x');
  item(row, drawBackdrop('beach'), 'beach', 2);
  item(row, drawBackdrop('walls'), 'walls', 2);
  const night = drawBackdrop('night');
  item(row, night, 'night (red-figure)', 2);
  const nightAchilles = buildFigureFrames('achilles').idle0.paletteSwap(FIGURE_NIGHT_REMAP);
  item(row, nightAchilles, 'achilles, night remap', 4);
}

document.body.dataset.ready = '1';
