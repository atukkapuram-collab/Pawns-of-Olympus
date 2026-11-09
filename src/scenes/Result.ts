/**
 * Victory / defeat panel over the battle. The board behind is veiled with an
 * ordered-dither ink screen (never alpha). Kleos stars are awarded one by one.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { PixelBuffer, meanderBand } from '../art/pixels';
import { panel } from '../art/ui';
import { kleos } from '../core/rules';
import type { GameState, PatronId } from '../core/types';
import { LEVELS } from '../data/levels/index';
import { STRINGS, t } from '../data/strings';
import { DEPTH } from '../view/BoardView';
import { ensureTexture } from '../view/textures';
import { addButton, addText, wait, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';
import { recordResult } from '../game/save';
import { afterVictory } from '../game/flow';
import { music } from '../audio/music';
import type { BattleScene } from './Battle';

export interface ResultData {
  levelId: string;
  won: boolean;
  state: GameState;
  patron?: PatronId | null;
}

const LOSE_FALLBACK: Record<string, string> = {
  heroes: 'Every hero has fallen.',
  ships: 'The ships burn.',
  escort: 'He did not reach the line.',
  seen: 'A sentry saw you.',
  time: 'Night falls on the plain.',
};

export class ResultScene extends Phaser.Scene {
  private buttons: PixelButton[] = [];

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.buttons = [];
    const d = DEPTH.modal;
    this.add.image(0, 0, ensureTexture(this, 'veil', () => new PixelBuffer(320, 180).ditherFill(0, 0, 320, 180, C.ink, 13))).setOrigin(0, 0).setDepth(d);
    const W = 184, H = 124, x = Math.floor((320 - W) / 2), y = 28;
    this.add.image(x, y, ensureTexture(this, `resultpanel2|${W}|${H}`, () => {
      const b = panel(W, H, 'clay');
      b.rect(3, 3, W - 6, 13, C.ink);
      meanderBand(b, 3, H - 12, W - 6, C.ink);
      return b;
    })).setOrigin(0, 0).setDepth(d);
    const level = LEVELS.find((l) => l.id === data.levelId)!;
    const idx = LEVELS.indexOf(level);
    const next = LEVELS[idx + 1];
    const battle = this.scene.get('Battle') as BattleScene;

    if (data.won) {
      music.play('victory');
      const stars = kleos(data.state);
      recordResult(level.id, stars);
      this.centerText(y + 6, t('ui.victory'), C.cream);
      this.centerText(y + 21, `${level.index}. ${level.title}`, C.umber);
      const labels = ['Won', 'No hero fell', `Within par ${level.par}`];
      void (async () => {
        for (let i = 0; i < 3; i++) {
          await wait(this, 260);
          const got = stars[i]!;
          addText(this, x + 52, y + 34 + i * 11, got ? '*' : '^', got ? C.goldHi : C.deepClay, { shadow: C.ink }).setDepth(d + 1);
          addText(this, x + 64, y + 35 + i * 11, labels[i]!, got ? C.ink : C.umber).setDepth(d + 1);
          if (got) sfx.play('star');
        }
      })();
      const outro = t(level.outro ?? '');
      if (outro && outro !== level.outro) this.centerText(y + 72, outro, C.ink, W - 24);
      const by = y + H - 30;
      this.buttons.push(addButton(this, x + 118, by, 56, 14, next ? t('ui.next') : 'Onward', () => { music.stop(); afterVictory(this, level.id); }, 'E'));
      this.buttons.push(addButton(this, x + 74, by, 36, 14, 'Map', () => this.toMap(level.act)));
      this.buttons.push(addButton(this, x + 10, by, 56, 14, t('ui.retry'), () => this.go(level.id, data.patron), 'R'));
    } else {
      this.centerText(y + 6, t('ui.defeat'), C.cream);
      const why = data.state.loseReason ?? 'heroes';
      this.centerText(y + 40, STRINGS[`lose.${why}`] ?? LOSE_FALLBACK[why] ?? '', C.umber, W - 16);
      this.buttons.push(addButton(this, x + 10, y + H - 30, 64, 14, t('ui.retry'), () => this.go(level.id, data.patron), 'R'));
      this.buttons.push(addButton(this, x + W - 96 - 10, y + H - 30, 96, 14, t('ui.undoLastTurn'), () => battle.undoLastTurn(), 'Z'));
      this.buttons.push(addButton(this, x + Math.floor(W / 2) - 18, y + 60, 36, 14, 'Map', () => this.toMap(level.act)));
    }
    for (const b of this.buttons) b.img.setDepth(d + 2);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const map: Record<string, string> = { KeyE: 'E', Enter: 'E', KeyR: 'R', KeyZ: 'Z' };
      const want = map[e.code];
      const b = this.buttons.find((bb) => (bb.img.texture.key.split('|')[4] ?? '') === want);
      b?.press();
    });
    this.game.events.emit('poo:ready', 'Result');
  }

  private centerText(y: number, text: string, color: number, maxWidth?: number): void {
    const img = addText(this, 0, y, text, color, maxWidth ? { maxWidth, align: 'center' } : {}).setDepth(DEPTH.modal + 1);
    img.x = Math.round((320 - img.width) / 2);
  }

  private go(levelId: string, patron?: PatronId | null): void {
    this.scene.stop('Result');
    this.scene.start('Battle', patron === undefined ? { levelId } : { levelId, patron });
  }

  private toMap(act: number): void {
    this.scene.stop('Battle');
    this.scene.start('LevelSelect', { act });
  }
}
