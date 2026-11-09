/**
 * Renders a GameState on the 320x180 screen: tiles, rocks, fire, units, HP,
 * intents and every overlay. Units are persistent images (so they can be
 * animated); overlays and markers are rebuilt on every refresh.
 */
import Phaser from 'phaser';
import { C, FIGURE_NIGHT_REMAP, NIGHT_REMAP, flashMap } from '../art/palette';
import { PixelBuffer } from '../art/pixels';
import * as T from '../art/sprites/tiles';
import { buildFigureFrames } from '../art/sprites/units';
import { POSES, type Pose } from '../art/sprites/figure';
import { cursorOverlay, mistOverlay, pathDot, plagueOverlay, shipSprite, targetOverlay, threatFrame, waveOverlay } from '../art/sprites/extras';
import { hpPips, intentGlyph, orderBadge, type IntentGlyph } from '../art/markers';
import { traceAttack } from '../core/combat';
import { onBoard } from '../core/board';
import { intentOrder } from '../core/rules';
import type { GameState, Unit } from '../core/types';
import { boardLayout, tileOrigin, unitOrigin, type BoardLayout } from './layout';
import { ensureTexture } from './textures';

export const DEPTH = { board: 0, overlay: 2, rowBase: 10, rowStep: 10, markers: 400, select: 450, fx: 480, hud: 1000, modal: 2000 };

export interface BoardUi {
  selected: string | null;
  moveTiles: Array<{ x: number; y: number }>;
  targetTiles: Array<{ x: number; y: number }>;
  cursor: { x: number; y: number } | null;
  preview: { x: number; y: number } | null;
  showIntents: boolean;
  highContrast: boolean;
  /** Poseidon: the wave's line and direction being aimed. */
  wave?: { x: number; y: number; dir: 'up' | 'down' | 'left' | 'right' } | undefined;
}

export const EMPTY_UI: BoardUi = { selected: null, moveTiles: [], targetTiles: [], cursor: null, preview: null, showIntents: true, highContrast: false };

interface UnitView {
  sprite: Phaser.GameObjects.Image;
  pips: Phaser.GameObjects.Image;
  type: string;
  phase: number;
}

const GLYPH: Record<string, IntentGlyph> = { thrust: 'thrust', arrow: 'arrow', charge: 'charge', sweep: 'sweep' };

export class BoardView {
  readonly layout: BoardLayout;
  readonly units = new Map<string, UnitView>();
  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private fireImgs: Phaser.GameObjects.Image[] = [];
  private waterImgs: Phaser.GameObjects.Image[] = [];
  private chevron: Phaser.GameObjects.Image | null = null;
  private frame = 0;
  private timer: Phaser.Time.TimerEvent;

  constructor(
    readonly scene: Phaser.Scene,
    state: GameState,
    readonly night = false,
  ) {
    this.layout = boardLayout(state.width, state.height);
    this.buildStatic(state);
    for (const u of state.units) this.addUnit(u);
    this.timer = scene.time.addEvent({ delay: 500, loop: true, callback: () => this.tick() });
  }

  destroy(): void {
    this.timer.remove();
  }

  // ------------------------------------------------------------------ textures

  unitTex(type: string, pose: Pose | 'flash'): string {
    const n = this.night ? '|n' : '';
    return ensureTexture(this.scene, `u|${type}|${pose}${n}`, () => {
      let b: PixelBuffer;
      if (type === 'ship') b = shipSprite(pose === 'windup');
      else {
        const frames = buildFigureFrames(type);
        b = pose === 'flash' ? frames.idle0.paletteSwap(flashMap()) : frames[pose];
      }
      return this.night && pose !== 'flash' ? b.paletteSwap(FIGURE_NIGHT_REMAP) : b;
    });
  }

  private tex(key: string, make: () => PixelBuffer): string {
    return ensureTexture(this.scene, key, make);
  }

  // ------------------------------------------------------------------ static board

  private buildStatic(s: GameState): void {
    const L = this.layout;
    const w = s.width * T.TILE_W, h = s.height * T.TILE_PITCH_Y + 2;
    // tiles + outline + plinth baked into one texture per level
    const key = `board|${s.levelId}|${this.night ? 'n' : 'd'}|${s.tiles.join(',')}`;
    this.tex(key, () => {
      const b = new PixelBuffer(w + 2, h + T.PLINTH_H + 1);
      for (let y = 0; y < s.height; y++)
        for (let x = 0; x < s.width; x++) {
          const t = s.tiles[y * s.width + x]!;
          const v = (x * 7 + y * 3) % 4;
          const alt = (x + y) % 2 === 1;
          const tile = t === 'sand' ? T.sandTile(v) : t === 'brush' ? T.brushTile(v) : t === 'water' ? T.waterTile(0) : T.groundTile(v, alt);
          b.blit(tile, 1 + x * T.TILE_W, 1 + y * T.TILE_PITCH_Y);
          if (t === 'gate') b.rect(1 + x * T.TILE_W + 4, 1 + y * T.TILE_PITCH_Y + 3, 16, 10, C.ink);
          if (t === 'light') b.blit(T.lightPool(), 1 + x * T.TILE_W, 1 + y * T.TILE_PITCH_Y);
        }
      // 1px ink rule around the slab so it reads as raised
      b.hline(0, 0, w + 2, C.ink);
      b.vline(0, 0, h + 1, C.ink);
      b.vline(w + 1, 0, h + 1, C.ink);
      b.blit(T.boardPlinth(w + 2), 0, h + 1);
      return this.night ? b.paletteSwap(NIGHT_REMAP) : b;
    });
    this.scene.add.image(L.ox - 1, L.oy - 1, key).setOrigin(0, 0).setDepth(DEPTH.board);

    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        const t = s.tiles[y * s.width + x]!;
        const o = tileOrigin(L, x, y);
        if (t === 'rock') {
          const k = this.tex(`rock|${(x + y) % 3}|${this.night}`, () => (this.night ? T.rockTile((x + y) % 3).paletteSwap(NIGHT_REMAP) : T.rockTile((x + y) % 3)));
          this.scene.add.image(o.px, o.py - 8, k).setOrigin(0, 0).setDepth(this.rowDepth(y) + 1);
        } else if (t === 'water') {
          const img = this.scene.add.image(o.px, o.py, this.tex('water|0', () => T.waterTile(0))).setOrigin(0, 0).setDepth(DEPTH.board + 1);
          img.setData('phase', (x + y) % 2);
          this.waterImgs.push(img);
        }
      }
  }

  rowDepth(y: number): number {
    return DEPTH.rowBase + y * DEPTH.rowStep;
  }

  // ------------------------------------------------------------------ units

  private addUnit(u: Unit): void {
    const o = this.spriteOrigin(u.type, u.x, u.y);
    const sprite = this.scene.add.image(o.px, o.py, this.unitTex(u.type, 'idle0')).setOrigin(0, 0);
    const pips = this.scene.add.image(0, 0, this.pipsTex(u)).setOrigin(0, 0);
    const phase = (u.x * 3 + u.y * 5) % 2;
    this.units.set(u.id, { sprite, pips, type: u.type, phase });
    this.placeUnit(u.id, u.x, u.y);
    if (!onBoard(u)) { sprite.setVisible(false); pips.setVisible(false); }
  }

  /** Top-left for a unit sprite standing on (x, y); big sprites are centred and rise higher. */
  spriteOrigin(type: string, x: number, y: number): { px: number; py: number } {
    if (type === 'ship') return this.shipOrigin(x, y);
    const o = unitOrigin(this.layout, x, y);
    return type === 'hector' ? { px: o.px - 4, py: o.py - 8 } : o;
  }

  shipOrigin(x: number, y: number): { px: number; py: number } {
    const t = tileOrigin(this.layout, x, y);
    return { px: t.px, py: t.py + 14 - 27 };
  }

  private pipsTex(u: Unit): string {
    const team = u.team === 'trojan' ? 'trojan' : 'greek';
    return this.tex(`pips|${u.hp}|${u.maxHp}|${team}`, () => hpPips(u.hp, u.maxHp, team));
  }

  /** Snap a unit's sprite (and pips) to a tile. */
  placeUnit(id: string, x: number, y: number): void {
    const v = this.units.get(id);
    if (!v) return;
    const o = this.spriteOrigin(v.type, x, y);
    v.sprite.setPosition(o.px, o.py).setDepth(this.rowDepth(y) + 5);
    this.placePips(id);
  }

  placePips(id: string): void {
    const v = this.units.get(id);
    if (!v) return;
    const top = v.type === 'ship' ? 2 : 0;
    v.pips.setPosition(Math.round(v.sprite.x + v.sprite.width / 2 - Math.floor(v.pips.width / 2)), Math.round(v.sprite.y - 5 + top)).setDepth(v.sprite.depth + 1);
  }

  setPose(id: string, pose: Pose | 'flash'): void {
    const v = this.units.get(id);
    if (v) v.sprite.setTexture(this.unitTex(v.type, pose));
  }

  // ------------------------------------------------------------------ refresh

  /** Bring every unit and overlay in line with the state. */
  refresh(s: GameState, ui: BoardUi): void {
    for (const u of s.units) {
      const v = this.units.get(u.id);
      if (!v) continue;
      const vis = onBoard(u);
      v.sprite.setVisible(vis);
      v.pips.setVisible(vis && u.team !== 'object' ? true : vis);
      if (vis) {
        this.placeUnit(u.id, u.x, u.y);
        v.pips.setTexture(this.pipsTex(u));
        this.placePips(u.id);
        if (u.type === 'ship') v.sprite.setTexture(this.unitTex('ship', u.hp < u.maxHp ? 'windup' : 'idle0'));
        else v.sprite.setTexture(this.unitTex(u.type, (this.frame + v.phase) % 2 === 0 ? 'idle0' : 'idle1'));
      }
    }
    for (const d of this.dynamic) d.destroy();
    this.dynamic = [];
    this.drawFire(s);
    this.drawOverlays(s, ui);
  }

  private add(img: Phaser.GameObjects.Image): Phaser.GameObjects.Image {
    this.dynamic.push(img);
    return img;
  }

  private drawFire(s: GameState): void {
    for (const f of this.fireImgs) f.destroy();
    this.fireImgs = [];
    s.fire.forEach((on, k) => {
      if (!on) return;
      const x = k % s.width, y = Math.floor(k / s.width);
      const o = tileOrigin(this.layout, x, y);
      const img = this.scene.add.image(o.px, o.py - 9, this.tex(`fire|${this.frame % 2}`, () => T.fireSprite(this.frame % 2))).setOrigin(0, 0).setDepth(this.rowDepth(y) + 2);
      img.setData('fx', x + y);
      this.fireImgs.push(img);
    });
  }

  private drawOverlays(s: GameState, ui: BoardUi): void {
    const L = this.layout;
    const at = (x: number, y: number) => tileOrigin(L, x, y);
    const overlay = (key: string, make: () => PixelBuffer, x: number, y: number, depth = DEPTH.overlay) =>
      this.add(this.scene.add.image(at(x, y).px, at(x, y).py, this.tex(key, make)).setOrigin(0, 0).setDepth(depth));

    for (const t of ui.moveTiles) overlay('ov|move', T.moveOverlay, t.x, t.y);
    for (const k of s.plague) overlay('ov|plague', plagueOverlay, k % s.width, Math.floor(k / s.width));

    if (ui.showIntents) {
      const order = intentOrder(s);
      const badgesAt = new Map<string, number>();
      order.forEach((enemy, i) => {
        const tr = traceAttack(s, enemy, enemy.intent!, enemy);
        const hits = tr.hits.length ? tr.hits : [];
        // dotted lane for arrows and charges
        if (enemy.intent!.kind === 'arrow' || enemy.intent!.kind === 'charge') {
          const from = at(enemy.x, enemy.y);
          const last = hits[0] ?? tr.tiles[tr.tiles.length - 1];
          if (last) {
            const to = at(last.x, last.y);
            const horizontal = enemy.y === last.y;
            const steps = Math.abs(horizontal ? to.px - from.px : to.py - from.py);
            const dir = Math.sign(horizontal ? to.px - from.px : to.py - from.py);
            for (let p = 12; p < steps - 4; p += 4) {
              const px = horizontal ? from.px + 11 + dir * p : from.px + 11;
              const py = horizontal ? from.py + 7 : from.py + 7 + dir * p;
              this.add(this.scene.add.image(px, py, this.tex('ov|dot', pathDot)).setOrigin(0, 0).setDepth(DEPTH.markers - 2));
            }
          }
        }
        for (const h of hits) {
          overlay(`ov|threat|${ui.highContrast}`, () => T.threatOverlay(ui.highContrast), h.x, h.y);
          const k = `${h.x},${h.y}`;
          const n = badgesAt.get(k) ?? 0;
          badgesAt.set(k, n + 1);
          const glyphKey = `gl|${GLYPH[enemy.intent!.kind]}|${enemy.intent!.dir}`;
          const glyph = this.tex(glyphKey, () => intentGlyph(GLYPH[enemy.intent!.kind]!, enemy.intent!.dir, C.ink));
          const badge = this.tex(`badge|${i + 1}|${s.ares}`, () => orderBadge(i + 1, s.ares));
          const occupant = h.unit && onBoard(h.unit) ? this.units.get(h.unit.id) : undefined;
          if (occupant) {
            // the unit hides the tile: frame its feet in red, badge beside its HP
            overlay('ov|threatFrame', threatFrame, h.x, h.y, occupant.sprite.depth + 1);
            const bx = Math.round(occupant.sprite.x + 18 + n * 10), by = Math.round(occupant.sprite.y - 8);
            this.add(this.scene.add.image(bx, by, badge).setOrigin(0, 0).setDepth(DEPTH.markers));
            this.add(this.scene.add.image(bx + 9, by - 1, this.tex(`chip|${glyphKey}`, () => intentGlyph(GLYPH[enemy.intent!.kind]!, enemy.intent!.dir, C.ink).paletteSwap({ [C.ink]: C.red }).outlined(C.ink))).setOrigin(0, 0).setDepth(DEPTH.markers));
          } else {
            const o = at(h.x, h.y);
            this.add(this.scene.add.image(o.px + 7, o.py + 2, glyph).setOrigin(0, 0).setDepth(DEPTH.markers - 1));
            this.add(this.scene.add.image(o.px + 1 + n * 10, o.py + 1, badge).setOrigin(0, 0).setDepth(DEPTH.markers));
          }
        }
      });
    }

    if (ui.wave) {
      const horiz = ui.wave.dir === 'left' || ui.wave.dir === 'right';
      const n = horiz ? s.width : s.height;
      for (let i = 0; i < n; i++) overlay('ov|wave', waveOverlay, horiz ? i : ui.wave.x, horiz ? ui.wave.y : i, DEPTH.markers - 4);
      for (const d of ['up', 'right', 'down', 'left'] as const) {
        const nx = ui.wave.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0), ny = ui.wave.y + (d === 'up' ? -1 : d === 'down' ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) continue;
        const o = at(nx, ny);
        const col = d === ui.wave.dir ? C.cream : C.sea;
        this.add(this.scene.add.image(o.px + 6, o.py + 2, this.tex(`gl|wavearrow|${d}|${col}`, () => intentGlyph('charge', d, col).outlined(C.ink))).setOrigin(0, 0).setDepth(DEPTH.markers + 2));
      }
    }
    // Aphrodite: where a misted Trojan will return
    for (const u of s.units) if (u.mist && u.alive) overlay('ov|mist', mistOverlay, u.mist.x, u.mist.y, DEPTH.overlay + 1);
    for (const t of ui.targetTiles) overlay('ov|target', targetOverlay, t.x, t.y, DEPTH.markers - 3);
    if (ui.preview) overlay('ov|target', targetOverlay, ui.preview.x, ui.preview.y, DEPTH.markers - 3);
    if (ui.cursor) overlay('ov|cursor', cursorOverlay, ui.cursor.x, ui.cursor.y, DEPTH.select - 1);

    // selection: brackets + bobbing chevron, always on top of the unit
    const sel = ui.selected ? s.units.find((u) => u.id === ui.selected) : undefined;
    if (sel && onBoard(sel)) {
      const o = at(sel.x, sel.y);
      const v = this.units.get(sel.id)!;
      const bw = v.sprite.width + 2, bh = v.sprite.height - 1;
      this.add(this.scene.add.image(v.sprite.x - 1, v.sprite.y + 1, this.tex(`ov|select|${bw}|${bh}`, () => T.selectOverlay(bw, bh))).setOrigin(0, 0).setDepth(DEPTH.select));
      void o;
      if (!this.chevron) this.chevron = this.scene.add.image(0, 0, this.tex('ov|chevron', T.selectChevron)).setOrigin(0, 0).setDepth(DEPTH.select);
      this.chevron.setVisible(true).setPosition(Math.round(v.sprite.x + 9), Math.round(v.sprite.y - 12 + (this.frame % 2)));
    } else this.chevron?.setVisible(false);
  }

  /** Idle animation tick: breathing figures, flickering fire, rolling water. */
  private tick(): void {
    this.frame++;
    for (const [, v] of this.units) {
      if (!v.sprite.visible || v.type === 'ship' || v.sprite.getData('busy')) continue;
      const key = v.sprite.texture.key;
      if (key.includes('|idle')) v.sprite.setTexture(this.unitTex(v.type, (this.frame + v.phase) % 2 === 0 ? 'idle0' : 'idle1'));
    }
    for (const f of this.fireImgs) f.setTexture(this.tex(`fire|${(this.frame + (f.getData('fx') as number)) % 2}`, () => T.fireSprite((this.frame + (f.getData('fx') as number)) % 2)));
    for (const w of this.waterImgs) w.setTexture(this.tex(`water|${(this.frame + (w.getData('phase') as number)) % 2}`, () => T.waterTile((this.frame + (w.getData('phase') as number)) % 2)));
    if (this.chevron?.visible) this.chevron.y += this.frame % 2 === 0 ? -1 : 1;
  }

  /** Tile under a game-space point, or null. */
  tileAtPoint(px: number, py: number, s: GameState): { x: number; y: number } | null {
    const x = Math.floor((px - this.layout.ox) / T.TILE_W);
    const y = Math.floor((py - this.layout.oy) / T.TILE_PITCH_Y);
    if (x < 0 || y < 0 || x >= s.width || y >= s.height) return null;
    return { x, y };
  }

  /** Make every pose texture exist up front (avoids hitches mid-animation). */
  warm(types: string[]): void {
    for (const t of types) {
      if (t === 'ship') { this.unitTex('ship', 'idle0'); this.unitTex('ship', 'windup'); continue; }
      for (const p of POSES) this.unitTex(t, p);
      this.unitTex(t, 'flash');
    }
  }
}
