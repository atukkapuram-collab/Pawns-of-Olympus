/**
 * Victory / defeat panel over the battle. The board behind is veiled with an
 * ordered-dither ink screen (never alpha). Kleos stars are awarded one by one.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { PixelBuffer } from '../art/pixels';
import { panel } from '../art/ui';
import { kleos } from '../core/rules';
import type { GameState } from '../core/types';
import { LEVELS } from '../data/levels/index';
import { t } from '../data/strings';
import { DEPTH } from '../view/BoardView';
import { ensureTexture } from '../view/textures';
import { addButton, addText, wait, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';
import { recordResult } from '../game/save';
import type { BattleScene } from './Battle';

export interface ResultData {
  levelId: string;
  won: boolean;
  state: GameState;
}

const LOSE_LINE: Record<string, string> = {
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
    const W = 184, H = 104, x = Math.floor((320 - W) / 2), y = 38;
    this.add.image(x, y, ensureTexture(this, `resultpanel|${W}|${H}`, () => panel(W, H, 'clay', true))).setOrigin(0, 0).setDepth(d);
    const level = LEVELS.find((l) => l.id === data.levelId)!;
    const idx = LEVELS.indexOf(level);
    const next = LEVELS[idx + 1];
    const battle = this.scene.get('Battle') as BattleScene;

    if (data.won) {
      const stars = kleos(data.state);
      recordResult(level.id, stars);
      this.centerText(y + 14, t('ui.victory'), C.ink);
      this.centerText(y + 25, level.title, C.umber);
      const labels = ['Won', 'No hero fell', `Within par ${level.par}`];
      void (async () => {
        for (let i = 0; i < 3; i++) {
          await wait(this, 260);
          const got = stars[i]!;
          addText(this, x + 52, y + 37 + i * 11, got ? '*' : '^', got ? C.goldHi : C.deepClay, { shadow: C.ink }).setDepth(d + 1);
          addText(this, x + 64, y + 38 + i * 11, labels[i]!, got ? C.ink : C.umber).setDepth(d + 1);
          if (got) sfx.play('star');
        }
      })();
      const outro = t(level.outro ?? '');
      if (outro && outro !== level.outro) this.centerText(y + 72, outro, C.umber, W - 16);
      const bw = 70;
      if (next) this.buttons.push(addButton(this, x + W - bw - 10, y + H - 30, bw, 14, t('ui.next'), () => this.go(next.id), 'E'));
      else this.buttons.push(addButton(this, x + W - bw - 10, y + H - 30, bw, 14, 'Title', () => this.toTitle(), 'E'));
      this.buttons.push(addButton(this, x + 10, y + H - 30, bw, 14, t('ui.retry'), () => this.go(level.id), 'R'));
    } else {
      this.centerText(y + 18, t('ui.defeat'), C.ink);
      this.centerText(y + 34, LOSE_LINE[data.state.loseReason ?? 'heroes'] ?? '', C.umber);
      this.buttons.push(addButton(this, x + 10, y + H - 30, 64, 14, t('ui.retry'), () => this.go(level.id), 'R'));
      this.buttons.push(addButton(this, x + W - 96 - 10, y + H - 30, 96, 14, t('ui.undoLastTurn'), () => battle.undoLastTurn(), 'Z'));
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

  private go(levelId: string): void {
    this.scene.stop('Result');
    this.scene.start('Battle', { levelId });
  }

  private toTitle(): void {
    this.scene.stop('Result');
    this.scene.stop('Battle');
    this.scene.start('Title');
  }
}
