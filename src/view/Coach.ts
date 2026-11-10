/**
 * The coach: a cream instruction tablet, an ordered-dither veil that dims
 * everything except the thing to click, and a pulsing gold frame around it.
 * Used by Level 1's tutorial and by hint 3 (the first turn, shown on the board).
 * The veil never takes input; the Battle scene decides what is allowed.
 */
import Phaser from 'phaser';
import { C, CLEAR } from '../art/palette';
import { PixelBuffer } from '../art/pixels';
import { panel } from '../art/ui';
import { DEPTH } from './BoardView';
import { measureLine } from '../art/font';
import { addButton, addText, type PixelButton } from './ui';
import { ensureTexture } from './textures';
import { fxSettings } from './fx';

export interface Rect { x: number; y: number; w: number; h: number }

export interface CoachView {
  text: string;
  keys?: string;
  /** Areas left undimmed. Empty = no veil. */
  holes: Rect[];
  /** Areas framed in pulsing gold. */
  frames: Rect[];
  buttons?: Array<{ label: string; key?: string; fn: () => void }>;
  /** Keep the tablet clear of this area (it moves to the bottom if needed). */
  avoid?: Rect | undefined;
  width?: number;
}

const D = DEPTH.hud + 40;
const PANEL_W = 208;

function veil(holes: Rect[]): PixelBuffer {
  const b = new PixelBuffer(320, 180).ditherFill(0, 0, 320, 180, C.ink, 10);
  for (const h of holes) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) if (b.inside(x, y)) b.set(x, y, CLEAR);
  return b;
}

function goldFrame(w: number, h: number, phase: number): PixelBuffer {
  const b = new PixelBuffer(w + 4, h + 4);
  const o = phase ? 0 : 1;
  b.frame(o, o, w + 4 - 2 * o, h + 4 - 2 * o, C.ink);
  b.frame(o + 1, o + 1, w + 2 - 2 * o, h + 2 - 2 * o, C.goldHi);
  return b;
}

export class Coach {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private frames: Phaser.GameObjects.Image[] = [];
  private buttons: PixelButton[] = [];
  private phase = 0;
  private timer: Phaser.Time.TimerEvent;

  constructor(readonly scene: Phaser.Scene) {
    this.timer = scene.time.addEvent({ delay: 320, loop: true, callback: () => this.pulse() });
  }

  get visible(): boolean {
    return this.parts.length > 0;
  }

  show(v: CoachView): void {
    this.clear();
    const P = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.parts.push(o); return o; };
    if (v.holes.length) {
      const key = `coachveil|${v.holes.map((h) => `${h.x},${h.y},${h.w},${h.h}`).join('|')}`;
      P(this.scene.add.image(0, 0, ensureTexture(this.scene, key, () => veil(v.holes))).setOrigin(0, 0).setDepth(D));
    }
    for (const f of v.frames) {
      const fx = Math.round(f.x) - 2, fy = Math.round(f.y) - 2;
      const img = this.scene.add.image(fx, fy, ensureTexture(this.scene, `coachframe|${f.w}|${f.h}|${this.phase}`, () => goldFrame(f.w, f.h, this.phase))).setOrigin(0, 0).setDepth(D + 1);
      img.setData('wh', [f.w, f.h]);
      this.frames.push(img);
      P(img);
    }

    // the tablet: instruction (ink), then how (umber), then buttons
    const w = v.width ?? PANEL_W;
    const tw = w - 10;
    const text = addText(this.scene, 0, 0, v.text, C.ink, { maxWidth: tw });
    const keys = v.keys ? addText(this.scene, 0, 0, v.keys, C.umber, { maxWidth: tw }) : null;
    const bh = v.buttons?.length ? 16 : 0;
    const h = 6 + text.height + (keys ? keys.height + 3 : 0) + (bh ? bh + 3 : 0) + 5;
    let py = 4;
    if (v.avoid && v.avoid.y < py + h + 2) py = 180 - h - 4;
    P(this.scene.add.image(4, py, ensureTexture(this.scene, `coachpanel|${w}|${h}`, () => panel(w, h, 'cream'))).setOrigin(0, 0).setDepth(D + 2));
    text.setPosition(9, py + 6).setDepth(D + 3);
    P(text);
    if (keys) { keys.setPosition(9, text.y + text.height + 3).setDepth(D + 3); P(keys); }
    let bx = 4 + w - 6;
    for (const b of [...(v.buttons ?? [])].reverse()) {
      const bw = Math.max(40, measureLine(b.label) + (b.key ? measureLine(b.key) + 16 : 12));
      bx -= bw;
      const btn = addButton(this.scene, bx, py + h - bh - 4, bw, 14, b.label, b.fn, b.key);
      btn.img.setDepth(D + 4);
      this.buttons.push(btn);
      bx -= 3;
    }
  }

  /** Press the coach button with this key hint (keyboard shortcut). */
  pressKey(key: string): boolean {
    const b = this.buttons.find((bb) => bb.img.texture.key.split('|')[4] === key);
    if (!b) return false;
    b.press();
    return true;
  }

  private pulse(): void {
    if (fxSettings.reducedMotion || !this.frames.length) return;
    this.phase = 1 - this.phase;
    for (const f of this.frames) {
      const [w, h] = f.getData('wh') as [number, number];
      f.setTexture(ensureTexture(this.scene, `coachframe|${w}|${h}|${this.phase}`, () => goldFrame(w, h, this.phase)));
    }
  }

  clear(): void {
    for (const p of this.parts) p.destroy();
    for (const b of this.buttons) b.destroy();
    this.parts = [];
    this.frames = [];
    this.buttons = [];
  }

  destroy(): void {
    this.clear();
    this.timer.remove();
  }
}
