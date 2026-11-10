/**
 * Intro cards: shown before a level the first time something new appears
 * (hero, Trojan, god, ground or objective). The same scene reads cards back
 * from the Codex. Back / Next walk the set; the art sits at 2x on a cream
 * tablet, the rules each get a tiny diagram.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { panel } from '../art/ui';
import { meanderBand } from '../art/pixels';
import { cardArt, drawDiagram, scaleUp } from '../art/diagram';
import { measureText } from '../art/font';
import { card, cardLines, cardName, cardStats, type TopicId } from '../data/teach';
import { t } from '../data/strings';
import { markSeen } from '../game/flow';
import { ensureTexture } from '../view/textures';
import { addButton, addText, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';

export interface CardsData {
  ids: TopicId[];
  mode: 'intro' | 'codex';
  index?: number;
  /** intro: what to start after the last card. */
  then?: { scene: string; data?: object };
  /** codex: the Codex was opened over this scene (e.g. 'Pause'). */
  back?: string;
}

export class CardsScene extends Phaser.Scene {
  private d!: CardsData;
  private i = 0;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private buttons: PixelButton[] = [];

  constructor() {
    super('Cards');
  }

  create(data: CardsData): void {
    this.d = data;
    this.i = Math.max(0, Math.min(data.ids.length - 1, data.index ?? 0));
    this.add.image(0, 0, ensureTexture(this, 'cards|bg', () => {
      const b = panel(320, 180, 'ink');
      b.frame(4, 4, 312, 172, C.deepClay);
      meanderBand(b, 6, 6, 308, C.clay);
      return b;
    })).setOrigin(0, 0);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyD' || e.code === 'KeyE') this.step(1);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.step(-1);
      else if (e.code === 'Escape') this.finish();
    });
    this.draw();
    this.game.events.emit('poo:ready', 'Cards');
  }

  private step(dir: number): void {
    const n = this.i + dir;
    if (n < 0) return;
    if (n >= this.d.ids.length) return this.finish();
    sfx.play('tick');
    this.i = n;
    this.draw();
  }

  private finish(): void {
    sfx.play('ui');
    if (this.d.mode === 'intro') {
      for (const id of this.d.ids) markSeen(`card:${id}`);
      const then = this.d.then ?? { scene: 'Title' };
      this.scene.start(then.scene, then.data);
    } else {
      this.scene.start('Codex', { back: this.d.back });
    }
  }

  private draw(): void {
    for (const p of this.parts) p.destroy();
    for (const b of this.buttons) b.destroy();
    this.parts = [];
    this.buttons = [];
    const id = this.d.ids[this.i]!;
    const c = card(id)!;
    if (this.d.mode === 'intro') markSeen(`card:${id}`);
    const P = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.parts.push(o); return o; };

    // heading: what kind of thing this is, and where we are in the set
    const tag = this.d.mode === 'intro' ? t(`card.tag.${c.kind}`) : t(`card.group.${c.kind}`);
    P(addText(this, 14, 20, tag, C.sun));
    if (this.d.ids.length > 1) {
      const cnt = P(addText(this, 0, 20, `${this.i + 1} / ${this.d.ids.length}`, C.clayLt));
      cnt.x = 306 - cnt.width;
    }

    // art tablet
    const art = cardArt(c.art);
    const aw = 76, ah = 104, ax = 12, ay = 32;
    P(this.add.image(ax, ay, ensureTexture(this, `cards|tablet|${aw}|${ah}`, () => panel(aw, ah, 'cream'))).setOrigin(0, 0));
    P(this.add.image(Math.round(ax + (aw - art.w) / 2), Math.round(ay + (ah - art.h) / 2), ensureTexture(this, `cardart|${id}`, () => art)).setOrigin(0, 0));

    // words
    const x = 96, w = 306 - x;
    let y = 32;
    const name = P(addText(this, x, y, cardName(id), C.goldHi));
    y += name.height + 3;
    const lore = P(addText(this, x, y, t(`card.${id}.lore`), C.clayLt, { maxWidth: w }));
    y += lore.height + 4;
    const stats = P(addText(this, x, y, cardStats(c), C.cream, { maxWidth: w }));
    y += stats.height + 6;
    // rules: diagrams at 2x (like the art) when they fit, else 1x; one text column
    const lines = cardLines(c);
    const bufs = lines.map((ln) => (ln.diagram ? drawDiagram(ln.diagram) : null));
    const layout = (scale: number) => {
      const dw = Math.max(16, ...bufs.map((b) => (b ? b.w * scale : 0)));
      const tx = x + dw + 6;
      const rows = lines.map((ln, k) => Math.max((bufs[k]?.h ?? 0) * scale, measureText(ln.text, 306 - tx).h));
      return { scale, tx, rows, total: rows.reduce((a, b) => a + b, 0) + 5 * (rows.length - 1) };
    };
    let L = layout(2);
    if (y + L.total > 152 || L.tx > 200) L = layout(1);
    lines.forEach((ln, k) => {
      const b = bufs[k];
      const rowH = L.rows[k]!;
      if (b) {
        const key = ensureTexture(this, `diag|${id}|${k}|${L.scale}`, () => (L.scale === 2 ? scaleUp(b, 2) : b));
        const img = P(this.add.image(x, y, key).setOrigin(0, 0));
        img.y = y + Math.floor((rowH - img.height) / 2);
      }
      const th = measureText(ln.text, 306 - L.tx).h;
      P(addText(this, L.tx, y + Math.max(0, Math.floor((rowH - th) / 2)), ln.text, C.cream, { maxWidth: 306 - L.tx }));
      y += rowH + 5;
    });

    // buttons
    const last = this.i === this.d.ids.length - 1;
    const by = 157;
    const back = addButton(this, 12, by, 52, 14, t('ui.back'), () => this.step(-1));
    back.setEnabled(this.i > 0);
    const closeLabel = this.d.mode === 'intro' ? t('ui.skip') : t('ui.close');
    const close = addButton(this, 68, by, 52, 14, closeLabel, () => this.finish(), 'Esc');
    const nextLabel = last ? (this.d.mode === 'intro' ? t('ui.continue') : t('ui.close')) : t('ui.next');
    const next = addButton(this, 228, by, 80, 14, nextLabel, () => this.step(1), 'E');
    this.buttons.push(back, next);
    if (!(this.d.mode === 'intro' && last) && !(this.d.mode === 'codex' && last)) this.buttons.push(close);
    else close.destroy();
  }
}
