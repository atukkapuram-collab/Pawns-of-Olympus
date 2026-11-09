/**
 * Small screens: Settings, Credits, Pause, and the Flow trampoline.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { PixelBuffer, meanderBand } from '../art/pixels';
import { panel } from '../art/ui';
import { t } from '../data/strings';
import { loadSettings, writeSettings, type Settings } from '../game/save';
import { startLevel } from '../game/flow';
import { ensureTexture } from '../view/textures';
import { addButton, addText, type PixelButton } from '../view/ui';
import { fxSettings } from '../view/fx';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';

/** Apply settings to the live systems. */
export function applySettings(s: Settings): void {
  sfx.setVolume(s.sound);
  sfx.setMuted(s.muted);
  music.setVolume(s.music);
  music.setMuted(s.muted);
  fxSettings.shake = s.shake;
  fxSettings.reducedMotion = s.reducedMotion;
  fxSettings.highContrast = s.highContrast;
}

function frame(scene: Phaser.Scene, w: number, h: number, key: string): { x: number; y: number } {
  const x = Math.round(160 - w / 2), y = Math.round(90 - h / 2);
  scene.add.image(x, y, ensureTexture(scene, key, () => {
    const b = panel(w, h, 'clay');
    meanderBand(b, 3, 3, w - 6, C.ink);
    return b;
  })).setOrigin(0, 0).setDepth(10);
  return { x, y };
}

export class SettingsScene extends Phaser.Scene {
  private st!: Settings;
  private row = 0;
  private rows: Array<{ label: string; get: () => string; change: (d: number) => void }> = [];
  private parts: Phaser.GameObjects.GameObject[] = [];
  private back = '';

  constructor() {
    super('Settings');
  }

  create(data: { back?: string; overlay?: boolean }): void {
    this.back = data.back ?? 'Title';
    this.st = loadSettings();
    this.row = 0;
    if (data.overlay) this.add.image(0, 0, ensureTexture(this, 'veil2', () => new PixelBuffer(320, 180).ditherFill(0, 0, 320, 180, C.ink, 13))).setOrigin(0, 0);
    else this.cameras.main.setBackgroundColor('#2a1a10');
    const { x, y } = frame(this, 220, 150, 'set|frame');
    addText(this, x + 10, y + 16, t('ui.settings'), C.ink).setDepth(11);
    const vol = (k: 'music' | 'sound') => ({ get: () => `${Math.round(this.st[k] * 10)} / 10`, change: (d: number) => { this.st[k] = Math.max(0, Math.min(1, Math.round((this.st[k] + d * 0.1) * 10) / 10)); } });
    const flag = (k: 'muted' | 'shake' | 'reducedMotion' | 'highContrast') => ({ get: () => (this.st[k] ? 'On' : 'Off'), change: () => { this.st[k] = !this.st[k]; } });
    this.rows = [
      { label: 'Music', ...vol('music') },
      { label: 'Sound', ...vol('sound') },
      { label: 'Mute all', ...flag('muted') },
      { label: 'Screen shake', ...flag('shake') },
      { label: 'Reduced motion', ...flag('reducedMotion') },
      { label: 'Threat hatch', ...flag('highContrast') },
    ];
    addButton(this, x + 150, y + 126, 60, 14, t('ui.back'), () => this.close(), 'Esc').img.setDepth(12);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.row = (this.row + this.rows.length - 1) % this.rows.length;
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.row = (this.row + 1) % this.rows.length;
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.rows[this.row]!.change(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Enter' || e.code === 'Space') this.rows[this.row]!.change(1);
      else if (e.code === 'Escape') return this.close();
      else return;
      this.commit();
    });
    this.drawRows(x, y);
    this.game.events.emit('poo:ready', 'Settings');
  }

  private commit(): void {
    writeSettings(this.st);
    applySettings(this.st);
    sfx.play('tick');
    this.drawRows(Math.round(160 - 110), Math.round(90 - 75));
  }

  private drawRows(x: number, y: number): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    this.rows.forEach((r, i) => {
      const yy = y + 30 + i * 15;
      const on = i === this.row;
      const label = addText(this, x + 12, yy + 3, r.label, C.ink).setDepth(11);
      const minus = addButton(this, x + 120, yy, 13, 13, '-', () => { this.row = i; r.change(-1); this.commit(); });
      const val = addText(this, x + 137, yy + 3, r.get(), C.ink).setDepth(11);
      const plus = addButton(this, x + 196, yy, 13, 13, '+', () => { this.row = i; r.change(1); this.commit(); });
      minus.img.setDepth(12).setData('label', `${r.label} -`);
      plus.img.setDepth(12).setData('label', `${r.label} +`);
      this.parts.push(label, minus.img, val, plus.img);
      if (on) this.parts.push(this.add.rectangle(x + 6, yy - 1, 208, 15, 0xffe9a0).setOrigin(0, 0).setDepth(10.5));
    });
  }

  private close(): void {
    sfx.play('ui');
    this.scene.stop();
    if (this.back !== 'Pause' && this.back) this.scene.start(this.back);
    else this.scene.resume('Pause');
  }
}

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create(data: { ending?: boolean }): void {
    this.cameras.main.setBackgroundColor('#2a1a10');
    const { x, y } = frame(this, 260, 160, 'cr|frame');
    const lines: Array<[string, number]> = [
      [data.ending ? 'The gates are open. The game is over, for now.' : t('ui.credits'), C.ink],
      ['', C.ink],
      ['Pawns of Olympus. Made with Claude Code.', C.ink],
      ['Art, font, music and sound: made in code for this game.', C.umber],
      ['Built with Phaser 4, TypeScript, Vite.', C.umber],
      ['Tested with Vitest and Playwright.', C.umber],
      ['Epigraphs: public-domain Iliad translations', C.umber],
      ['(Butler 1898; Lang, Leaf and Myers 1883; Pope 1715).', C.umber],
      ['Homer, for the plot.', C.umber],
    ];
    let yy = y + 16;
    for (const [s, c] of lines) {
      if (!s) { yy += 5; continue; }
      const img = addText(this, x + 12, yy, s, c, { maxWidth: 236 }).setDepth(11);
      yy += img.height + 2;
    }
    const b: PixelButton = addButton(this, x + 180, y + 136, 66, 14, data.ending ? 'Title' : t('ui.back'), () => this.scene.start(data.ending ? 'Title' : 'Title'), 'E');
    b.img.setDepth(12);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { if (['Escape', 'Enter', 'KeyE'].includes(e.code)) b.press(); });
    this.game.events.emit('poo:ready', 'Credits');
  }
}

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    this.add.image(0, 0, ensureTexture(this, 'veil2', () => new PixelBuffer(320, 180).ditherFill(0, 0, 320, 180, C.ink, 13))).setOrigin(0, 0);
    const { x, y } = frame(this, 120, 104, 'pause|frame');
    addText(this, x + 10, y + 16, 'Paused', C.ink).setDepth(11);
    const battle = this.scene.get('Battle') as Phaser.Scene & { restart(): void };
    const bw = 100;
    const items: PixelButton[] = [
      addButton(this, x + 10, y + 28, bw, 14, 'Resume', () => this.resume(), 'Esc'),
      addButton(this, x + 10, y + 45, bw, 14, t('ui.restart'), () => { this.scene.stop(); this.scene.resume('Battle'); battle.restart(); }),
      addButton(this, x + 10, y + 62, bw, 14, t('ui.settings'), () => { this.scene.pause(); this.scene.launch('Settings', { back: 'Pause', overlay: true }); }),
      addButton(this, x + 10, y + 79, bw, 14, 'Quit to map', () => { const id = (battle as unknown as { level: { act: number } }).level.act; this.scene.stop('Battle'); this.scene.start('LevelSelect', { act: id }); }),
    ];
    for (const b of items) b.img.setDepth(12);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { if (e.code === 'Escape' || e.code === 'KeyP') this.resume(); });
    this.game.events.emit('poo:ready', 'Pause');
  }

  private resume(): void {
    sfx.play('ui');
    this.scene.stop();
    this.scene.resume('Battle');
  }
}

/** Trampoline used by cutscenes: "start this level properly". */
export class FlowScene extends Phaser.Scene {
  constructor() {
    super('Flow');
  }

  create(data: { levelId: string }): void {
    startLevel(this, data.levelId);
  }
}
