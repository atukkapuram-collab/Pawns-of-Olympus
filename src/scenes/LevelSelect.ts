/**
 * Level select: the campaign painted on an amphora. Each act is one side of
 * the vase; turning it (arrows) shows the next act. Each level is a painted
 * metope with its Kleos stars; locked levels are bare, unpainted clay.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { PixelBuffer, meanderBand, zigzagBand, checkerBand } from '../art/pixels';
import { panel } from '../art/ui';
import { textBuffer } from '../art/font';
import { buildFigureFrames } from '../art/sprites/units';
import { LEVELS } from '../data/levels/index';
import { t } from '../data/strings';
import { isUnlocked, startLevel } from '../game/flow';
import { loadSave } from '../game/save';
import { ensureTexture } from '../view/textures';
import { addButton, addText, slideTween } from '../view/ui';
import { sfx } from '../audio/sfx';

const PANEL_W = 34, PANEL_H = 46, GAP = 8, ROW_Y = 66;
const ROMAN = ['', 'I', 'II', 'III'];

function vase(): PixelBuffer {
  const b = new PixelBuffer(320, 180);
  // handles (behind the body)
  for (const hx of [52, 268]) {
    b.ellipse(hx, 44, 14, 16, C.ink);
    b.ellipse(hx, 44, 9, 11, 255);
  }
  // neck and lip
  b.rect(118, 6, 84, 30, C.clay);
  b.rect(110, 4, 100, 5, C.clay);
  b.frame(110, 4, 100, 5, C.ink);
  b.vline(118, 9, 27, C.ink).vline(201, 9, 27, C.ink);
  checkerBand(b, 119, 30, 82, 2, 2, C.ink);
  // body: a broad belly
  b.ellipse(160, 100, 136, 70, C.ink);
  b.ellipse(160, 100, 134, 68, C.clay);
  b.rect(0, 168, 320, 12, 255);
  // foot
  b.rect(124, 166, 72, 8, C.ink);
  b.rect(126, 166, 68, 6, C.clay);
  b.ditherFill(236, 60, 60, 108, C.deepClay, 4, true);
  // shoulder and lower bands
  meanderBand(b, 44, 40, 232, C.ink);
  zigzagBand(b, 40, 124, 240, 4, C.ink);
  b.hline(36, 122, 248, C.ink);
  b.hline(36, 130, 248, C.ink);
  // the frieze zone behind the metopes: ink with clay rules (black-figure)
  b.rect(30, 56, 260, 64, C.ink);
  b.hline(30, 57, 260, C.deepClay);
  b.hline(30, 118, 260, C.deepClay);
  return b;
}

function metope(type: string | null, painted: boolean, selected: boolean): PixelBuffer {
  const b = new PixelBuffer(PANEL_W, PANEL_H);
  b.rect(0, 0, PANEL_W, PANEL_H, painted ? C.clay : C.clayLt);
  b.frame(0, 0, PANEL_W, PANEL_H, selected ? C.goldHi : painted ? C.cream : C.deepClay);
  if (selected) b.frame(1, 1, PANEL_W - 2, PANEL_H - 2, C.goldHi);
  if (painted && type) {
    const f = buildFigureFrames(type).idle0;
    const crop = f.w > 24 ? f.crop(4, 6, 24, 34) : f;
    b.blit(crop, Math.floor((PANEL_W - crop.w) / 2), PANEL_H - crop.h - 4);
    b.hline(3, PANEL_H - 4, PANEL_W - 6, C.ink);
  } else {
    // unpainted clay: only the potter's guide lines
    b.hline(3, PANEL_H - 4, PANEL_W - 6, C.deepClay);
    b.vline(Math.floor(PANEL_W / 2), 10, PANEL_H - 16, C.deepClay);
  }
  return b;
}

export class LevelSelectScene extends Phaser.Scene {
  private act = 1;
  private selected = 0;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('LevelSelect');
  }

  create(data: { act?: number; levelId?: string }): void {
    this.cameras.main.setBackgroundColor('#2a1a10');
    const save = loadSave();
    const firstOpen = LEVELS.find((l) => isUnlocked(l.id) && !save.levels[l.id]?.won) ?? LEVELS[LEVELS.length - 1]!;
    const focus = data.levelId ? LEVELS.find((l) => l.id === data.levelId) : undefined;
    this.act = data.act ?? focus?.act ?? firstOpen.act;
    const inAct = LEVELS.filter((l) => l.act === this.act);
    this.selected = Math.max(0, inAct.findIndex((l) => l.id === (focus ?? firstOpen).id));
    this.add.image(0, 0, ensureTexture(this, 'ls|vase', vase)).setOrigin(0, 0);

    const prev = addButton(this, 6, 80, 18, 18, '<', () => this.turn(-1));
    const next = addButton(this, 296, 80, 18, 18, '>', () => this.turn(1));
    prev.img.setDepth(3);
    next.img.setDepth(3);
    addButton(this, 6, 6, 40, 14, t('ui.back'), () => this.scene.start('Title')).img.setDepth(3);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      const n = LEVELS.filter((l) => l.act === this.act).length;
      if (e.code === 'ArrowLeft') { if (this.selected > 0) this.choose(this.selected - 1); else this.turn(-1); }
      if (e.code === 'ArrowRight') { if (this.selected < n - 1) this.choose(this.selected + 1); else this.turn(1); }
      if (e.code === 'PageUp' || e.code === 'KeyQ') this.turn(-1);
      if (e.code === 'PageDown' || e.code === 'KeyW') this.turn(1);
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') this.play();
      if (e.code === 'Escape') this.scene.start('Title');
    });
    this.draw();
    this.game.events.emit('poo:ready', 'LevelSelect');
  }

  private turn(d: number): void {
    const acts = [...new Set(LEVELS.map((l) => l.act))];
    const i = acts.indexOf(this.act) + d;
    if (i < 0 || i >= acts.length) { sfx.play('invalid'); return; }
    sfx.play('swap');
    const dir = d;
    void slideTween(this, this.items.filter((o) => (o as Phaser.GameObjects.Image).getData?.('row')) as Phaser.GameObjects.Image[], -dir * 40, 90).then(() => {
      this.act = acts[i]!;
      this.selected = 0;
      this.draw();
    });
  }

  private choose(i: number): void {
    if (i === this.selected) return;
    this.selected = i;
    sfx.play('tick');
    this.draw();
  }

  private play(): void {
    const level = LEVELS.filter((l) => l.act === this.act)[this.selected];
    if (!level) return;
    if (!isUnlocked(level.id)) { sfx.play('invalid'); return; }
    sfx.play('select');
    startLevel(this, level.id);
  }

  private draw(): void {
    for (const o of this.items) o.destroy();
    this.items = [];
    const save = loadSave();
    const levels = LEVELS.filter((l) => l.act === this.act);
    const title = addText(this, 0, 14, `Act ${ROMAN[this.act]}`, C.ink);
    title.x = Math.round(160 - title.width / 2);
    const sub = addText(this, 0, 22, t(`act.${this.act}.title`) !== `act.${this.act}.title` ? t(`act.${this.act}.title`) : '', C.umber);
    sub.x = Math.round(160 - sub.width / 2);
    this.items.push(title, sub);

    const total = levels.length * PANEL_W + (levels.length - 1) * GAP;
    const x0 = Math.round(160 - total / 2);
    levels.forEach((l, i) => {
      const open = isUnlocked(l.id);
      const rec = save.levels[l.id];
      const hero = l.units.find((u) => ['achilles', 'ajax', 'odysseus', 'diomedes', 'patroclus'].includes(u.type))?.type ?? null;
      const boss = l.units.find((u) => ['hector', 'paris', 'chariot'].includes(u.type))?.type;
      const type = boss ?? hero;
      const sel = i === this.selected;
      const key = ensureTexture(this, `ls|m|${type}|${open}|${sel}`, () => metope(type, open, sel));
      const x = x0 + i * (PANEL_W + GAP);
      const img = this.add.image(x, ROW_Y, key).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      img.setData('row', 1);
      img.setData('label', `level ${l.id}`);
      img.on('pointerup', () => { if (sel) this.play(); else this.choose(i); });
      this.items.push(img);
      const num = addText(this, x + 2, ROW_Y - 9, String(l.index), open ? C.clay : C.umber);
      num.setData('row', 1);
      this.items.push(num);
      // Kleos stars under the metope
      const stars = (rec?.stars ?? [false, false, false]).map((s) => (s ? '*' : '^')).join('');
      const st = this.add.image(x + 3, ROW_Y + PANEL_H + 2, ensureTexture(this, `ls|stars|${stars}`, () => textBuffer(stars, C.goldHi))).setOrigin(0, 0);
      st.setData('row', 1);
      if (!rec) st.setVisible(false);
      this.items.push(st);
    });

    // info tablet under the frieze
    const l = levels[this.selected]!;
    const open = isUnlocked(l.id);
    const tab = this.add.image(40, 132, ensureTexture(this, 'ls|tab3', () => panel(240, 42, 'cream'))).setOrigin(0, 0);
    this.items.push(tab);
    this.items.push(addText(this, 46, 136, `${l.index}. ${l.title}`, C.ink));
    this.items.push(addText(this, 46, 146, open ? l.teaches : 'Unpainted clay. Win the one before.', C.umber, { maxWidth: 176 }));
    const play = addButton(this, 228, 150, 46, 14, 'Play', () => this.play(), 'E');
    play.setEnabled(open);
    this.items.push(play.img);
  }
}
