/**
 * Title: the walls of Ilion under a cream sky where the gods' shapes hang,
 * faint, in dither. An ink band carries the lettered title; below it a frieze
 * of Greeks and Trojans marches past forever. The menu is a small clay tablet.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { drawBackdrop } from '../art/backdrops';
import { PixelBuffer, meanderBand, zigzagBand } from '../art/pixels';
import { panel } from '../art/ui';
import { logoBuffer } from '../art/logo';
import { buildFigureFrames } from '../art/sprites/units';
import { t } from '../data/strings';
import { LEVELS } from '../data/levels/index';
import { loadSave } from '../game/save';
import { startLevel } from '../game/flow';
import { music } from '../audio/music';
import { ensureTexture } from '../view/textures';
import { addButton, addText, type PixelButton } from '../view/ui';
import { fxSettings } from '../view/fx';
import { sfx } from '../audio/sfx';

const MARCH = ['achilles', 'ajax', 'odysseus', 'diomedes', 'spearman', 'archer', 'shieldbearer', 'spearman'];

/** Faint dithered god silhouettes: hourglass bodies with halo rings. */
function skyGods(): PixelBuffer {
  const b = new PixelBuffer(320, 60);
  for (const [cx, s] of [[34, 1], [286, 1], [160, 0]] as const) {
    if (!s) continue;
    const g = new PixelBuffer(60, 60);
    g.triangle(30, 22, 16, 58, 44, 58, C.clayLt);
    g.triangle(18, 14, 42, 14, 30, 32, C.clayLt);
    g.circle(30, 8, 5, C.clayLt);
    g.ditherRing(30, 8, 9, 13, C.clayLt, [8, 4]);
    for (let y = 0; y < 60; y++) for (let x = 0; x < 60; x++) if (g.get(x, y) !== 255 && ((x + y) % 2 === 0 || (x * 3 + y) % 4 === 0)) b.set(cx - 30 + x, y, C.clayLt);
  }
  return b;
}

function marchStrip(): PixelBuffer {
  const step = 40;
  const b = new PixelBuffer(step * MARCH.length, 34);
  MARCH.forEach((type, i) => {
    const f = buildFigureFrames(type)[i % 2 === 0 ? 'idle0' : 'idle1'];
    // everyone marches left, so the Greeks are mirrored here
    const greek = ['achilles', 'ajax', 'odysseus', 'diomedes'].includes(type);
    b.blit(f, i * step + 8, 1, greek ? { flipX: true } : {});
  });
  return b;
}

export class TitleScene extends Phaser.Scene {
  private strip: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    this.add.image(0, 0, ensureTexture(this, 'bg|walls', () => drawBackdrop('walls'))).setOrigin(0, 0);
    this.add.image(0, 0, ensureTexture(this, 'title|gods', skyGods)).setOrigin(0, 0);

    // title band
    const logo = logoBuffer();
    const bandW = logo.w + 24;
    const bx = Math.round(160 - bandW / 2);
    this.add.image(bx, 8, ensureTexture(this, `title|band|${bandW}`, () => {
      const b = panel(bandW, 30, 'ink');
      meanderBand(b, 3, 19, bandW - 6, C.clay);
      return b;
    })).setOrigin(0, 0);
    this.add.image(Math.round(160 - logo.w / 2), 11, ensureTexture(this, 'title|logo', () => logo)).setOrigin(0, 0);
    const tag = addText(this, 0, 125, t('game.tagline'), C.ink);
    tag.x = Math.round(160 - tag.width / 2);

    // the marching frieze on its ground band
    this.add.image(0, 136, ensureTexture(this, 'title|ground', () => {
      const b = new PixelBuffer(320, 44);
      b.rect(0, 0, 320, 44, C.clay);
      b.hline(0, 34, 320, C.ink);
      zigzagBand(b, 0, 37, 320, 4, C.ink);
      b.hline(0, 0, 320, C.ink);
      return b;
    })).setOrigin(0, 0);
    const stripKey = ensureTexture(this, 'title|march', marchStrip);
    const sw = this.textures.get(stripKey).getSourceImage().width as number;
    this.strip = [0, 1].map((i) => this.add.image(i * sw, 137, stripKey).setOrigin(0, 0));
    if (!fxSettings.reducedMotion) {
      this.time.addEvent({
        delay: 70, loop: true,
        callback: () => {
          for (const s of this.strip) {
            s.x -= 1;
            if (s.x <= -sw) s.x += sw * 2;
          }
        },
      });
    }

    // menu tablet
    const save = loadSave();
    const firstUnwon = LEVELS.find((l) => !save.levels[l.id]?.won) ?? LEVELS[0]!;
    const hasProgress = Object.keys(save.levels).length > 0;
    const items: Array<[string, () => void, string?]> = [];
    if (hasProgress) items.push([t('ui.continue'), () => { sfx.play('select'); this.scene.start('LevelSelect', { levelId: firstUnwon.id }); }, 'E']);
    items.push([t('ui.newCampaign'), () => this.start(LEVELS[0]!.id), hasProgress ? 'N' : 'E']);
    items.push([t('ui.settings'), () => this.scene.start('Settings', { back: 'Title' })]);
    items.push([t('ui.credits'), () => this.scene.start('Credits', {})]);
    const tw = 104, th = items.length * 15 + 10;
    const tx = Math.round(160 - tw / 2), ty = 60 + Math.round((72 - th) / 2);
    this.add.image(tx, ty, ensureTexture(this, `title|tablet|${th}`, () => panel(tw, th, 'clay'))).setOrigin(0, 0);
    const buttons: PixelButton[] = items.map(([label, fn, key], i) => addButton(this, tx + 6, ty + 5 + i * 15, tw - 12, 13, label, fn, key));

    music.play('title');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      music.play('title');
      if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') buttons[0]!.press();
      if (e.code === 'KeyN' && hasProgress) buttons[1]!.press();
    });
    this.input.on('pointerdown', () => { sfx.unlock(); music.play('title'); });
    this.game.events.emit('poo:ready', 'Title');
  }

  private start(levelId: string): void {
    sfx.play('select');
    startLevel(this, levelId);
  }
}
