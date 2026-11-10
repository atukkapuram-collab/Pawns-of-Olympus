/**
 * Level briefing, before every level: title and story line, the objective in
 * plain words beside a mini map with the goal in gold, how you lose, the three
 * Kleos stars, your heroes and the Trojans, and (if the level has patrons)
 * the patron choice. Play / Settings / Home.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { panel } from '../art/ui';
import { meanderBand, PixelBuffer } from '../art/pixels';
import { drawDiagram } from '../art/diagram';
import { hpPips } from '../art/markers';
import { buildFigureFrames } from '../art/sprites/units';
import { levelById, LEVELS } from '../data/levels/index';
import { UNITS } from '../data/units';
import { STRINGS, t } from '../data/strings';
import { loseText, miniMap, objectiveText, starTexts } from '../data/teach';
import type { HeroType, PatronId, UnitType } from '../core/types';
import { ensureTexture } from '../view/textures';
import { addButton, addText, setText, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';

export interface BriefingData {
  levelId: string;
  tutorial?: boolean;
  patron?: PatronId | null;
}

/** Head-and-shoulders crop of a unit sprite, for the roster. */
function bust(type: string, h = 20, w = 24): PixelBuffer {
  const f = buildFigureFrames(type).idle0;
  const top = f.h > 32 ? 4 : 2;
  const x = Math.max(0, Math.floor((f.w - w) / 2));
  return f.crop(x, top, Math.min(w, f.w), Math.min(h, f.h - top));
}

export class BriefingScene extends Phaser.Scene {
  private patron: PatronId | null = null;
  private godButtons: PixelButton[] = [];
  private favorText: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('Briefing');
  }

  create(data: BriefingData): void {
    this.favorText = null;
    const level = levelById(data.levelId) ?? LEVELS[0]!;
    this.patron = data.patron !== undefined && data.patron !== null && level.patrons.includes(data.patron) ? data.patron : (level.patrons[0] ?? null);
    this.godButtons = [];
    this.add.image(0, 0, ensureTexture(this, 'brief|bg', () => {
      const b = panel(320, 180, 'ink');
      b.frame(4, 4, 312, 172, C.deepClay);
      meanderBand(b, 6, 6, 308, C.clay);
      return b;
    })).setOrigin(0, 0);

    const center = (y: number, s: string, c: number, maxWidth?: number) => {
      const img = addText(this, 0, y, s, c, maxWidth ? { maxWidth, align: 'center' } : {});
      img.x = Math.round(160 - img.width / 2);
      return img;
    };
    center(19, `Level ${level.index}: ${level.title}`, C.goldHi);
    const intro = STRINGS[`lvl.${level.id}.intro`];
    if (intro) center(30, intro, C.clayLt, 296);

    // --- objective + mini map (cream tablet)
    const ox = 8, oy = 41, ow = 152, oh = 64;
    this.add.image(ox, oy, ensureTexture(this, `brief|obj|${ow}|${oh}`, () => panel(ow, oh, 'cream'))).setOrigin(0, 0);
    const map = ensureTexture(this, `minimap|${level.id}`, () => drawDiagram(miniMap(level)));
    const mapImg = this.add.image(0, 0, map).setOrigin(0, 0);
    mapImg.setPosition(ox + ow - mapImg.width - 5, oy + Math.round((oh - mapImg.height) / 2));
    const tw = mapImg.x - ox - 11;
    addText(this, ox + 6, oy + 5, t('brief.goal'), C.umber);
    addText(this, ox + 6, oy + 16, objectiveText(level), C.ink, { maxWidth: tw });

    // --- lose line + Kleos
    let y = oy + oh + 4;
    const lose = addText(this, ox + 1, y, loseText(level), C.clayLt, { maxWidth: ow });
    y = Math.max(y + lose.height + 3, 130);
    // Kleos: the three stars, two on the first line, one on the second
    const stars = starTexts(level);
    addText(this, ox + 1, y, t('brief.kleos'), C.sun);
    let sx = ox + 34;
    stars.forEach((s, i) => {
      if (i === 2) { sx = ox + 34; y += 9; }
      addText(this, sx, y - 1, '*', C.goldHi, { shadow: C.ink });
      const img = addText(this, sx + 9, y, s, C.cream);
      sx += img.width + 14;
    });

    // --- roster: heroes then Trojans
    const rx = 166;
    let ry = 41;
    addText(this, rx, ry, t('brief.heroes'), C.sun);
    ry += 11;
    const heroes = [...new Set(level.units.filter((u) => UNITS[u.type].team === 'greek').map((u) => u.type as HeroType))];
    for (const h of heroes) {
      const st = UNITS[h];
      this.add.image(rx, ry - 2, ensureTexture(this, `bust|${h}`, () => bust(h))).setOrigin(0, 0);
      const nm = addText(this, rx + 26, ry, st.name, C.cream);
      this.add.image(rx + 30 + nm.width, ry + 1, ensureTexture(this, `pips|${st.hp}|${st.hp}|greek`, () => hpPips(st.hp, st.hp, 'greek'))).setOrigin(0, 0);
      const ab = addText(this, rx + 26, ry + 9, t(`brief.ab.${h}`), C.clayLt, { maxWidth: 312 - rx - 26 });
      ry += Math.max(22, 9 + ab.height + 4);
    }
    ry += 1;
    addText(this, rx, ry, t('brief.trojans'), C.sun);
    ry += 11;
    const counts = new Map<UnitType, number>();
    for (const u of level.units) if (UNITS[u.type].team === 'trojan') counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
    // fixed slots: a bust, then its count on an ink chip beside it (never over the figure)
    let tx = rx;
    for (const [type, n] of counts) {
      const img = this.add.image(tx, ry - 2, ensureTexture(this, `bust|${type}|22x20`, () => bust(type, 22, 20))).setOrigin(0, 0);
      tx += img.width + 1;
      if (n > 1) {
        const c = addText(this, tx + 1, ry + 12, `x${n}`, C.cream).setDepth(2);
        this.add.rectangle(tx, ry + 11, c.width + 2, 9, 0x2a1a10).setOrigin(0, 0).setDepth(1);
        tx += c.width + 3;
      }
      tx += 4;
    }

    // --- patron + buttons
    // bottom bar: patron choice (left, with its favor below), then Home / Settings / Play
    const by = 151;
    if (level.patrons.length) {
      level.patrons.forEach((g, i) => {
        const b = addButton(this, 8 + i * 52, by, 50, 14, cap(g), () => this.pick(g));
        this.godButtons.push(b);
      });
      this.favorText = addText(this, 9, by + 16, '', C.clayLt);
      this.pick(this.patron!, true);
    }
    addButton(this, 170, by, 40, 14, t('ui.home'), () => { sfx.play('ui'); this.scene.start('Title'); });
    addButton(this, 213, by, 54, 14, t('ui.settings'), () => {
      sfx.play('ui');
      this.scene.start('Settings', { back: 'Briefing', backData: { ...data, patron: this.patron } });
    }, 'S');
    const play = addButton(this, 270, by, 42, 14, t('ui.play'), () => this.play(level.id, !!data.tutorial), 'E');

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (n >= 0 && level.patrons[n]) this.pick(level.patrons[n]!);
      if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') play.press();
      if (e.code === 'KeyS') this.scene.start('Settings', { back: 'Briefing', backData: { ...data, patron: this.patron } });
      if (e.code === 'Escape') this.scene.start('LevelSelect', { act: level.act });
    });
    this.game.events.emit('poo:ready', 'Briefing');
  }

  private pick(g: PatronId, silent = false): void {
    const level = levelById((this.scene.settings.data as BriefingData).levelId)!;
    this.patron = g;
    if (!silent) sfx.play('tick');
    level.patrons.forEach((p, i) => this.godButtons[i]?.setActive(p === g));
    if (this.favorText) setText(this.favorText, t(`favor.${g}`), C.clayLt);
  }

  private play(levelId: string, tutorial: boolean): void {
    sfx.play('select');
    this.scene.start('Battle', { levelId, patron: this.patron, tutorial });
  }
}

function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1);
}
