/**
 * Small Phaser UI helpers built on the art recipes: pixel text and buttons.
 * Text is rendered with the Stele bitmap font into cached canvas textures.
 */
import Phaser from 'phaser';
import { textBuffer, type Align } from '../art/font';
import type { ColorIndex } from '../art/palette';
import { button as buttonArt, type ButtonState } from '../art/ui';
import { ensureTexture } from './textures';

export interface TextOpts {
  shadow?: ColorIndex;
  maxWidth?: number;
  align?: Align;
}

export function textKey(text: string, color: ColorIndex, o: TextOpts = {}): string {
  return `txt|${color}|${o.shadow ?? ''}|${o.maxWidth ?? ''}|${o.align ?? ''}|${text}`;
}

/** Add pixel text at (x, y) (top-left origin). */
export function addText(scene: Phaser.Scene, x: number, y: number, text: string, color: ColorIndex, o: TextOpts = {}): Phaser.GameObjects.Image {
  const key = ensureTexture(scene, textKey(text, color, o), () => textBuffer(text, color, o));
  return scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0, 0);
}

/** Change an existing text image's string. */
export function setText(img: Phaser.GameObjects.Image, text: string, color: ColorIndex, o: TextOpts = {}): void {
  const key = ensureTexture(img.scene, textKey(text, color, o), () => textBuffer(text, color, o));
  img.setTexture(key);
}

export interface PixelButton {
  img: Phaser.GameObjects.Image;
  setEnabled(on: boolean): void;
  setLabel(label: string): void;
  setVisible(on: boolean): void;
  readonly enabled: boolean;
  /** Programmatic press (keyboard shortcut). */
  press(): void;
  destroy(): void;
}

/**
 * Flat clay-tablet button with idle / hover / down / disabled frames.
 * Works with mouse, touch and keyboard (via `press`).
 */
export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onPress: () => void,
  key?: string,
): PixelButton {
  let current = label;
  let enabled = true;
  let hover = false;
  let down = false;
  const tex = (st: ButtonState) => ensureTexture(scene, `btn|${w}|${h}|${current}|${key ?? ''}|${st}`, () => buttonArt(w, h, current, st, key));
  const img = scene.add.image(Math.round(x), Math.round(y), tex('idle')).setOrigin(0, 0);
  img.setInteractive({ useHandCursor: true });
  img.setData('label', label);
  const refresh = () => img.setTexture(tex(!enabled ? 'disabled' : down ? 'down' : hover ? 'hover' : 'idle'));
  img.on('pointerover', () => { hover = true; refresh(); });
  img.on('pointerout', () => { hover = false; down = false; refresh(); });
  img.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!enabled) return;
    down = true;
    refresh();
  });
  img.on('pointerup', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!enabled || !down) return;
    down = false;
    refresh();
    onPress();
  });
  const api: PixelButton = {
    img,
    get enabled() { return enabled; },
    setEnabled(on) { if (on !== enabled) { enabled = on; refresh(); } },
    setLabel(l) { if (l !== current) { current = l; img.setData('label', l); refresh(); } },
    setVisible(on) { img.setVisible(on); if (on) img.setInteractive(); else img.disableInteractive(); },
    press() {
      if (!enabled || !img.visible) return;
      down = true; refresh();
      scene.time.delayedCall(70, () => { down = false; refresh(); });
      onPress();
    },
    destroy() { img.destroy(); },
  };
  return api;
}

/** Promise wrappers so animation code reads top to bottom. */
export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((res) => scene.time.delayedCall(ms, () => res()));
}

export function tween(scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((res) => scene.tweens.add({ ...cfg, onComplete: () => res() }));
}
