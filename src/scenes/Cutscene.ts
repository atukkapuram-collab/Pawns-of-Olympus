/**
 * Vase-panel scenes: act intros (3-4 panels) and short pre/post level scenes.
 * Each line is shown under a painted frieze: the speaking god's portrait, or
 * the figures of the moment standing on a meander ground line. Skippable.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { PixelBuffer, meanderBand, zigzagBand } from '../art/pixels';
import { panel } from '../art/ui';
import { buildFigureFrames } from '../art/sprites/units';
import { buildPortrait, GODS } from '../art/sprites/gods';
import { shipSprite } from '../art/sprites/extras';
import { t } from '../data/strings';
import { levelById } from '../data/levels/index';
import { lines, markSeen, type CutsceneData } from '../game/flow';
import { ensureTexture } from '../view/textures';
import { addButton, addText, wait } from '../view/ui';
import { ditherKeep } from '../view/fx';
import { sfx } from '../audio/sfx';

const PANEL = { x: 12, y: 8, w: 296, h: 112 };
const GREEKS = new Set(['achilles', 'ajax', 'odysseus', 'diomedes', 'patroclus']);
const NAME_TO_TYPE: Record<string, string> = {
  achilles: 'achilles', ajax: 'ajax', odysseus: 'odysseus', diomedes: 'diomedes', patroclus: 'patroclus',
  hector: 'hector', paris: 'paris', trojan: 'spearman', archer: 'archer', sentry: 'spearman', priam: 'spearman',
};

/** Figures for act-intro panels, by act then panel. */
const ACT_CAST: Record<number, string[][]> = {
  1: [['ship', 'ship', 'ship'], ['achilles', 'ajax', 'spearman', 'archer'], ['ajax', 'ship', 'spearman'], ['odysseus', 'achilles', 'ajax']],
  2: [['achilles'], ['diomedes', 'odysseus', 'spearman', 'chariot'], ['patroclus', 'hector'], ['ajax', 'diomedes', 'hector']],
  3: [['achilles', 'hector'], ['achilles', 'spearman', 'shieldbearer', 'archer'], ['paris', 'achilles'], ['odysseus', 'diomedes', 'ajax']],
};

export class CutsceneScene extends Phaser.Scene {
  private data0!: CutsceneData;
  private pages: string[] = [];
  private page = 0;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private busy = false;

  constructor() {
    super('Cutscene');
  }

  create(data: CutsceneData): void {
    this.data0 = data;
    this.page = 0;
    this.layer = [];
    this.busy = false;
    if (data.kind === 'act') {
      this.pages = lines(`act.${data.act}.panel`, 4);
    } else {
      this.pages = lines(`lvl.${data.levelId}.${data.kind}`, data.kind === 'pre' ? 4 : 2);
    }
    if (!this.pages.length) return this.finish();

    this.cameras.main.setBackgroundColor('#2a1a10');
    // frame: the vase panel and the reading band
    this.add.image(PANEL.x, PANEL.y, ensureTexture(this, 'cs|panel', () => {
      const b = panel(PANEL.w, PANEL.h, 'clay');
      meanderBand(b, 3, 3, PANEL.w - 6, C.ink);
      meanderBand(b, 3, PANEL.h - 12, PANEL.w - 6, C.ink);
      return b;
    })).setOrigin(0, 0);
    this.add.image(PANEL.x, 126, ensureTexture(this, 'cs|band', () => panel(PANEL.w, 46, 'ink'))).setOrigin(0, 0);

    const title = data.kind === 'act' ? `${t(`act.${data.act}.title`)}` : levelById(data.levelId ?? '')?.title ?? '';
    const head = addText(this, 0, 131, data.kind === 'act' ? `Act ${['', 'I', 'II', 'III'][data.act]}: ${title}` : title, C.goldHi);
    head.x = Math.round(160 - head.width / 2);

    const next = addButton(this, PANEL.x + PANEL.w - 66, 154, 58, 13, t('ui.next'), () => void this.advance(), 'E');
    const skip = addButton(this, PANEL.x + 8, 154, 58, 13, t('ui.skip'), () => this.finish());
    next.img.setDepth(5);
    skip.img.setDepth(5);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      if (e.code === 'Escape') this.finish();
      else if (['Enter', 'Space', 'KeyE', 'ArrowRight'].includes(e.code)) void this.advance();
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      sfx.unlock();
      if (p.y < 126) void this.advance();
    });
    void this.show(0);
    this.game.events.emit('poo:ready', 'Cutscene');
  }

  private async advance(): Promise<void> {
    if (this.busy) return;
    sfx.play('ui');
    if (this.page + 1 >= this.pages.length) return this.finish();
    this.page++;
    await this.show(this.page);
  }

  private finish(): void {
    const d = this.data0;
    if (d.kind === 'act') markSeen(`act:${d.act}`);
    else if (d.levelId) markSeen(`${d.kind}:${d.levelId}`);
    this.scene.start(d.then.scene, d.then.data);
  }

  /** Draw page k: a painted frieze for the line, then the line itself. */
  private async show(k: number): Promise<void> {
    this.busy = true;
    for (const o of this.layer) o.destroy();
    this.layer = [];
    const raw = this.pages[k]!;
    const m = /^([A-Z][a-z]+):\s*(.*)$/.exec(raw);
    const speaker = m ? m[1]!.toLowerCase() : null;
    const text = m ? m[2]! : raw;

    const art = this.paintFrieze(k, speaker);
    const key = `cs|art|${this.data0.kind}|${this.data0.act}|${this.data0.levelId ?? ''}|${k}`;
    ensureTexture(this, key, () => art);
    const img = this.add.image(PANEL.x + 6, PANEL.y + 14, key).setOrigin(0, 0);
    this.layer.push(img);
    // dither the painting in, 4 steps (no alpha)
    for (const lv of [4, 8, 12]) {
      img.setTexture(ensureTexture(this, `${key}|d${lv}`, () => ditherKeep(art, lv)));
      await wait(this, 45);
    }
    img.setTexture(key);

    if (m) {
      const who = addText(this, PANEL.x + 10, 142, `${m[1]}:`, C.goldHi);
      this.layer.push(who);
      this.layer.push(addText(this, PANEL.x + 14 + who.width, 142, text, C.cream, { maxWidth: PANEL.w - 30 - who.width }));
    } else {
      const tx = addText(this, 0, 142, text, C.cream, { maxWidth: PANEL.w - 20, align: 'center' });
      tx.x = Math.round(160 - tx.width / 2);
      this.layer.push(tx);
    }
    const n = addText(this, PANEL.x + PANEL.w - 28, 131, `${k + 1}/${this.pages.length}`, C.deepClay);
    this.layer.push(n);
    this.busy = false;
  }

  /** The frieze painting inside the panel: 284 x 84. */
  private paintFrieze(k: number, speaker: string | null): PixelBuffer {
    const W = PANEL.w - 12, H = PANEL.h - 28;
    const b = new PixelBuffer(W, H);
    const ground = H - 10;
    // hard sky bands joined by a 2-row dither, and a flat sun
    b.rect(0, 0, W, 22, C.cream);
    b.rect(0, 22, W, 16, C.sand);
    b.ditherFill(0, 20, W, 2, C.sand, 8);
    b.circle(W - 34, 16, 9, this.data0.act === 3 ? C.sun : C.sun);
    zigzagBand(b, 0, ground + 4, W, 4, C.ink);
    b.hline(0, ground + 1, W, C.ink);
    // a far frieze of hills (Acts I-II) or walls (Act III) behind the figures
    if (this.data0.act === 3) {
      for (let x = 0; x < W; x += 12) { b.rect(x, 30, 10, ground - 30, C.deepClay); b.rect(x + 1, 27, 3, 3, C.deepClay); b.rect(x + 6, 27, 3, 3, C.deepClay); }
    } else if (this.data0.act === 1) {
      for (let x = -8; x < W; x += 16) b.triangle(x, ground - 6, x + 8, ground - 14, x + 16, ground - 6, C.deepClay);
      b.rect(0, ground - 6, W, 6, C.deepClay);
    } else {
      b.triangle(-20, ground, 60, ground - 34, 140, ground, C.deepClay);
      b.triangle(150, ground, 230, ground - 28, 310, ground, C.deepClay);
    }
    b.hline(0, ground + 1, W, C.ink);

    if (speaker && GODS[speaker]) {
      // a god speaks: portrait in a frame, the mortals small beneath
      const p = buildPortrait(speaker);
      b.blit(p, Math.floor(W / 2 - p.w / 2), 2);
      return b;
    }
    let cast: string[];
    if (this.data0.kind === 'act') cast = ACT_CAST[this.data0.act]?.[k] ?? ['achilles'];
    else {
      const lvl = levelById(this.data0.levelId ?? '');
      const types = [...new Set((lvl?.units ?? []).map((u) => u.type))];
      cast = [...types.filter((t) => GREEKS.has(t)), ...types.filter((t) => !GREEKS.has(t)).slice(0, 3)];
      if (speaker && NAME_TO_TYPE[speaker] && !cast.includes(NAME_TO_TYPE[speaker]!)) cast.unshift(NAME_TO_TYPE[speaker]!);
    }
    const speakerType = speaker ? NAME_TO_TYPE[speaker] : undefined;
    const slots = cast.length;
    const gap = Math.floor(W / (slots + 1));
    cast.forEach((type, i) => {
      const x = gap * (i + 1);
      if (type === 'ship') {
        const s = shipSprite();
        b.blit(s, x - 12, ground - s.h + 2);
        return;
      }
      const f = buildFigureFrames(type).idle0;
      // Greeks are drawn facing right, Trojans facing left: they meet in the middle
      b.blit(f, x - Math.floor(f.w / 2), ground - f.h + 2);
      if (type === speakerType) {
        // the speaker: a gold underline in the frieze
        b.hline(x - 6, ground + 2, 12, C.goldHi);
      }
    });
    return b;
  }
}

