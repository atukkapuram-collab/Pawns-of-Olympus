/**
 * The battle: owns a Session (pure core state + undo), a BoardView and a Hud.
 * Input -> core action -> event list -> animations -> refresh. The core never
 * waits for the view; the view plays the events and then snaps to the truth.
 */
import Phaser from 'phaser';
import { C, FIGURE_NIGHT_REMAP } from '../art/palette';
import { drawBackdrop } from '../art/backdrops';
import { buildFigureFrames } from '../art/sprites/units';
import { shipSprite } from '../art/sprites/extras';
import { Session } from '../core/session';
import { abilitiesOf, abilityTargets, canAct, moveOptions } from '../core/rules';
import { onBoard, unitAt, unitById } from '../core/board';
import type { Ability, Action, Dir, GameEvent, GameState, PatronId, Unit } from '../core/types';
import { levelById, LEVELS } from '../data/levels/index';
import type { LevelData } from '../core/level';
import { BoardView, DEPTH, EMPTY_UI, type BoardUi } from '../view/BoardView';
import { Hud } from '../view/Hud';
import { tileOrigin, unitOrigin } from '../view/layout';
import { ensureTexture } from '../view/textures';
import { banner, boltFx, popNumber, shake, shatter, slide } from '../view/fx';
import { wait } from '../view/ui';
import { sfx } from '../audio/sfx';

export interface BattleData {
  levelId: string;
  patron?: PatronId | null;
}

type Mode = 'idle' | 'favor';

export class BattleScene extends Phaser.Scene {
  session!: Session;
  level!: LevelData;
  board!: BoardView;
  hud!: Hud;
  busy = false;
  selected: string | null = null;
  info: string | null = null;
  ability: Ability = 'strike';
  mode: Mode = 'idle';
  cursor: { x: number; y: number } | null = null;
  preview: { x: number; y: number } | null = null;
  favorDir: Dir = 'right';
  private settleWaiters: Array<() => void> = [];

  constructor() {
    super('Battle');
  }

  get state(): GameState {
    return this.session.state;
  }

  init(data: BattleData): void {
    this.level = levelById(data.levelId) ?? LEVELS[0]!;
    const patron = data.patron === undefined ? (this.level.patrons[0] ?? null) : data.patron;
    this.session = new Session(this.level, patron);
    this.busy = false;
    this.selected = null;
    this.info = null;
    this.mode = 'idle';
    this.cursor = null;
    this.preview = null;
  }

  create(): void {
    const night = this.level.backdrop === 'night';
    this.add.image(0, 0, ensureTexture(this, `bg|${this.level.backdrop ?? 'beach'}`, () => drawBackdrop(this.level.backdrop ?? 'beach'))).setOrigin(0, 0).setDepth(-10);
    this.board = new BoardView(this, this.state, night);
    this.board.warm([...new Set(this.state.units.map((u) => u.type))]);
    this.hud = new Hud(this, this.level.title, this.level.act, this.state, {
      endTurn: () => this.endTurn(),
      undo: () => this.undo(),
      restart: () => this.restart(),
      favor: () => this.toggleFavor(),
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onHover(p));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.events.once('shutdown', () => this.board.destroy());

    // auto-select the first hero so a new player sees what to do
    const first = this.state.units.find((u) => u.team === 'greek' && onBoard(u));
    if (first) this.select(first.id);
    this.refresh();
    this.game.events.emit('poo:ready', 'Battle');
  }

  // ------------------------------------------------------------------ helpers

  private ui(): BoardUi {
    const s = this.state;
    const ui: BoardUi = { ...EMPTY_UI, selected: this.selected, cursor: this.cursor, preview: this.preview };
    const u = this.selected ? unitById(s, this.selected) : undefined;
    if (u && onBoard(u) && s.phase === 'player' && this.mode === 'idle') {
      ui.moveTiles = [...moveOptions(s, u).values()].map((p) => p[p.length - 1]!);
      ui.targetTiles = canAct(s, u) ? abilityTargets(s, u, this.ability) : [];
    }
    if (this.mode === 'favor' && s.patron === 'athena') ui.targetTiles = s.units.filter((v) => v.team === 'greek' && onBoard(v) && v.acted).map((v) => ({ x: v.x, y: v.y }));
    return ui;
  }

  refresh(): void {
    this.board.refresh(this.state, this.ui());
    const infoUnit = (this.info && unitById(this.state, this.info)) || (this.selected && unitById(this.state, this.selected)) || null;
    this.hud.update(this.state, this.session.canUndo, this.busy, infoUnit && onBoard(infoUnit) ? infoUnit : null, this.mode === 'favor');
    // facing: Greeks are drawn facing right, Trojans facing left
    for (const u of this.state.units) {
      const v = this.board.units.get(u.id);
      if (!v || u.type === 'ship') continue;
      const natural: Dir = u.team === 'trojan' ? 'left' : 'right';
      if (u.facing === 'left' || u.facing === 'right') v.sprite.setFlipX(u.facing !== natural);
    }
  }

  private select(id: string | null): void {
    this.selected = id;
    this.preview = null;
    const u = id ? unitById(this.state, id) : undefined;
    if (u) {
      const abs = abilitiesOf(u);
      if (!abs.includes(this.ability)) this.ability = abs[0] ?? 'strike';
    }
  }

  private heroes(): Unit[] {
    return this.state.units.filter((u) => u.team === 'greek' && onBoard(u));
  }

  // ------------------------------------------------------------------ input

  private onHover(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) return;
    const t = this.board.tileAtPoint(p.x, p.y, this.state);
    const changed = (t?.x ?? -1) !== (this.cursor?.x ?? -1) || (t?.y ?? -1) !== (this.cursor?.y ?? -1);
    if (!changed) return;
    this.cursor = t;
    const u = t ? unitAt(this.state, t.x, t.y) : undefined;
    this.info = u ? u.id : null;
    if (!this.busy) this.refresh();
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    sfx.unlock();
    if (this.busy) return;
    const t = this.board.tileAtPoint(p.x, p.y, this.state);
    if (!t) return;
    this.cursor = p.wasTouch ? null : t;
    this.tapTile(t.x, t.y, p.wasTouch);
  }

  /**
   * One tap/click/Enter on a tile. Touch taps preview first and act on the
   * second tap; mouse clicks and keyboard act at once (hover is the preview).
   */
  tapTile(x: number, y: number, needsConfirm = false): void {
    const s = this.state;
    if (s.phase !== 'player' || this.busy) return;
    const confirmed = !needsConfirm || (this.preview?.x === x && this.preview?.y === y);
    const here = unitAt(s, x, y);

    if (this.mode === 'favor') {
      if (s.patron === 'poseidon' && !confirmed) { this.preview = { x, y }; this.refresh(); return; }
      if (!confirmed) { this.preview = { x, y }; this.info = here?.id ?? null; this.refresh(); return; }
      this.preview = null;
      this.dispatch({ type: 'favor', god: s.patron!, x, y, dir: s.patron === 'poseidon' ? this.favorDir : undefined });
      return;
    }

    const sel = this.selected ? unitById(s, this.selected) : undefined;
    const ui = this.ui();
    const isTarget = ui.targetTiles.some((t) => t.x === x && t.y === y);
    const isMove = ui.moveTiles.some((t) => t.x === x && t.y === y);

    if (sel && isTarget) {
      if (!confirmed) { this.preview = { x, y }; this.info = here?.id ?? null; sfx.play('select'); this.refresh(); return; }
      this.preview = null;
      this.dispatch({ type: 'act', unit: sel.id, ability: this.ability, x, y });
      return;
    }
    if (here && here.team === 'greek') {
      if (this.selected !== here.id) sfx.play('select');
      this.select(here.id);
      this.info = here.id;
      this.refresh();
      return;
    }
    if (sel && isMove) {
      if (!confirmed) { this.preview = { x, y }; sfx.play('tick'); this.refresh(); return; }
      this.preview = null;
      this.dispatch({ type: 'move', unit: sel.id, x, y });
      return;
    }
    if (here) {
      // Trojan or ship: show its card
      this.info = here.id;
      this.preview = null;
      sfx.play('tick');
      this.refresh();
      return;
    }
    // empty tile: deselect
    if (sel) sfx.play('invalid');
    this.preview = null;
    this.info = null;
    this.refresh();
  }

  private onKey(e: KeyboardEvent): void {
    sfx.unlock();
    if (e.repeat && !e.code.startsWith('Arrow')) return;
    const s = this.state;
    const k = e.code;
    if (k === 'KeyE') return this.hud.endTurn.press();
    if (k === 'KeyZ') return this.hud.undo.press();
    if (k === 'KeyR') return this.hud.restart.press();
    if (k === 'KeyF') return this.hud.favor?.press();
    if (this.busy || s.phase !== 'player') return;
    if (k === 'Escape') {
      if (this.mode === 'favor') this.mode = 'idle';
      else this.select(null);
      this.preview = null;
      this.refresh();
      return;
    }
    if (k === 'Tab') {
      e.preventDefault();
      const hs = this.heroes();
      if (!hs.length) return;
      const i = hs.findIndex((h) => h.id === this.selected);
      const next = hs[(i + 1) % hs.length]!;
      this.select(next.id);
      this.cursor = { x: next.x, y: next.y };
      this.info = next.id;
      sfx.play('select');
      this.refresh();
      return;
    }
    if (k === 'Digit1' || k === 'Digit2') {
      const u = this.selected ? unitById(s, this.selected) : undefined;
      const abs = u ? abilitiesOf(u) : [];
      const pick = abs[k === 'Digit1' ? 0 : 1];
      if (pick) { this.ability = pick; this.refresh(); }
      return;
    }
    const arrows: Record<string, [number, number, Dir]> = { ArrowUp: [0, -1, 'up'], ArrowDown: [0, 1, 'down'], ArrowLeft: [-1, 0, 'left'], ArrowRight: [1, 0, 'right'], KeyW: [0, -1, 'up'], KeyS: [0, 1, 'down'], KeyA: [-1, 0, 'left'], KeyD: [1, 0, 'right'] };
    const a = arrows[k];
    if (a) {
      e.preventDefault();
      if (this.mode === 'favor' && s.patron === 'poseidon' && e.shiftKey) { this.favorDir = a[2]; this.refresh(); return; }
      const sel = this.selected ? unitById(s, this.selected) : undefined;
      const c = this.cursor ?? (sel ? { x: sel.x, y: sel.y } : { x: 0, y: 0 });
      this.cursor = { x: Math.max(0, Math.min(s.width - 1, c.x + a[0])), y: Math.max(0, Math.min(s.height - 1, c.y + a[1])) };
      const u = unitAt(s, this.cursor.x, this.cursor.y);
      this.info = u?.id ?? null;
      sfx.play('tick');
      this.refresh();
      return;
    }
    if ((k === 'Enter' || k === 'Space' || k === 'NumpadEnter') && this.cursor) {
      e.preventDefault();
      this.tapTile(this.cursor.x, this.cursor.y, false);
    }
  }

  // ------------------------------------------------------------------ commands

  toggleFavor(): void {
    if (this.busy || !this.state.patron || this.state.favorUsed) return;
    this.mode = this.mode === 'favor' ? 'idle' : 'favor';
    this.preview = null;
    sfx.play('select');
    this.refresh();
  }

  endTurn(): void {
    if (this.busy || this.state.phase !== 'player') return;
    this.mode = 'idle';
    this.preview = null;
    this.dispatch({ type: 'endTurn' });
  }

  undo(): void {
    if (this.busy) return;
    if (this.session.undo()) {
      sfx.play('undo');
      this.mode = 'idle';
      this.preview = null;
      this.refresh();
    }
  }

  restart(): void {
    if (this.busy) return;
    sfx.play('select');
    this.scene.stop('Result');
    this.scene.restart({ levelId: this.level.id, patron: this.session.patron });
  }

  /** Called from the defeat screen. */
  undoLastTurn(): void {
    this.scene.stop('Result');
    this.session.undoLastTurn();
    this.busy = false;
    this.refresh();
  }

  dispatch(a: Action): void {
    const r = this.session.dispatch(a);
    if (r.error) {
      sfx.play('invalid');
      return;
    }
    if (a.type === 'favor') this.mode = 'idle';
    void this.play(r.events);
  }

  // ------------------------------------------------------------------ animation

  /** Resolves when no animation is running (test hook). */
  settle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise((res) => this.settleWaiters.push(res));
  }

  private sprite(id: string): Phaser.GameObjects.Image | undefined {
    return this.board.units.get(id)?.sprite;
  }

  private sourceBuffer(type: string) {
    if (type === 'ship') return shipSprite();
    const b = buildFigureFrames(type).idle0;
    return this.board.night ? b.paletteSwap(FIGURE_NIGHT_REMAP) : b;
  }

  private async play(events: GameEvent[]): Promise<void> {
    this.busy = true;
    this.refresh();
    const unitOf = (id: string) => this.state.units.find((u) => u.id === id);
    for (const e of events) {
      switch (e.t) {
        case 'move': {
          const img = this.sprite(e.unit);
          if (!img) break;
          img.setData('busy', true);
          sfx.play('move');
          for (const p of e.path) {
            const o = unitOrigin(this.board.layout, p.x, p.y);
            await slide(this, img, o.px, o.py, 90);
            img.setDepth(this.board.rowDepth(p.y) + 5);
            this.board.placePips(e.unit);
          }
          // 1px landing squash: sink and recover
          img.y += 1;
          await wait(this, 50);
          img.y -= 1;
          img.setData('busy', false);
          break;
        }
        case 'strike': {
          const img = this.sprite(e.unit);
          if (!img) break;
          img.setData('busy', true);
          if (e.dir === 'left' || e.dir === 'right') img.setFlipX(e.dir === 'left');
          this.board.setPose(e.unit, 'windup');
          await wait(this, 90);
          this.board.setPose(e.unit, 'strike');
          sfx.play('strike');
          await wait(this, 80); // hit-stop
          this.board.setPose(e.unit, 'idle0');
          img.setData('busy', false);
          break;
        }
        case 'attack': {
          const img = this.sprite(e.unit);
          if (!img) break;
          img.setData('busy', true);
          this.board.setPose(e.unit, 'windup');
          await wait(this, 110);
          this.board.setPose(e.unit, 'strike');
          sfx.play(e.intent.kind === 'arrow' ? 'arrow' : 'strike');
          await wait(this, 90);
          this.board.setPose(e.unit, 'idle0');
          img.setData('busy', false);
          break;
        }
        case 'charge': {
          const img = this.sprite(e.unit);
          if (!img) break;
          sfx.play('charge');
          for (const p of e.path) {
            const o = unitOrigin(this.board.layout, p.x, p.y);
            await slide(this, img, o.px, o.py, 60);
            img.setDepth(this.board.rowDepth(p.y) + 5);
          }
          break;
        }
        case 'damage': {
          const img = this.sprite(e.unit);
          const u = unitOf(e.unit);
          if (!img || !u) break;
          this.board.setPose(e.unit, 'flash');
          sfx.play(e.kind === 'impact' ? 'bump' : 'hit');
          popNumber(this, img.x + 12, img.y + 2, `-${e.amount}`);
          await wait(this, 70);
          if (u.type !== 'ship') this.board.setPose(e.unit, 'idle0');
          void shake(this, 1, 2);
          break;
        }
        case 'blocked': {
          const img = this.sprite(e.unit);
          if (!img) break;
          sfx.play('block');
          const word = e.reason === 'heel' ? 'Immune' : e.reason === 'front' ? 'Blocked' : e.reason === 'shelter' ? 'Sheltered' : '0';
          popNumber(this, img.x + 12, img.y + 2, word, C.cream);
          await wait(this, 120);
          break;
        }
        case 'heel': {
          const img = this.sprite(e.unit);
          if (img) popNumber(this, img.x + 12, img.y - 6, 'The heel', C.red);
          await wait(this, 200);
          break;
        }
        case 'defeat':
        case 'swept': {
          const img = this.sprite(e.unit);
          const v = this.board.units.get(e.unit);
          if (!img || !v) break;
          v.pips.setVisible(false);
          sfx.play(e.t === 'swept' ? 'wave' : 'shatter');
          if (e.t === 'swept') {
            await slide(this, img, img.x, img.y + 4, 120);
          }
          await shatter(this, img, this.sourceBuffer(v.type));
          break;
        }
        case 'push': {
          const img = this.sprite(e.unit);
          if (!img) break;
          const o = unitOrigin(this.board.layout, e.to.x, e.to.y);
          sfx.play('push');
          await slide(this, img, o.px, o.py, 90);
          img.setDepth(this.board.rowDepth(e.to.y) + 5);
          this.board.placePips(e.unit);
          break;
        }
        case 'bump': {
          const img = this.sprite(e.unit);
          if (!img) break;
          const dx = e.dir === 'left' ? -2 : e.dir === 'right' ? 2 : 0, dy = e.dir === 'up' ? -2 : e.dir === 'down' ? 2 : 0;
          await slide(this, img, img.x + dx, img.y + dy, 50);
          await slide(this, img, img.x - dx, img.y - dy, 50);
          break;
        }
        case 'swap': {
          const a = this.sprite(e.unit), b = this.sprite(e.target);
          if (!a || !b) break;
          sfx.play('swap');
          const oa = unitOrigin(this.board.layout, e.to.x, e.to.y), ob = unitOrigin(this.board.layout, e.from.x, e.from.y);
          await Promise.all([slide(this, a, oa.px, oa.py, 140), slide(this, b, ob.px, ob.py, 140)]);
          break;
        }
        case 'favor': {
          const o = tileOrigin(this.board.layout, e.x, e.y);
          sfx.play(e.god === 'zeus' ? 'lightning' : e.god === 'poseidon' ? 'wave' : 'select');
          if (e.god === 'zeus') await boltFx(this, o.px, o.py);
          else await wait(this, 200);
          break;
        }
        case 'phase': {
          this.refresh();
          if (e.phase === 'enemy') await banner(this, 'Trojans act', C.cream, 420);
          else await banner(this, 'Your move', C.goldHi, 380);
          break;
        }
        case 'fireSpread':
          sfx.play('fire');
          this.refresh();
          await wait(this, 150);
          break;
        case 'plague':
          sfx.play('plague');
          await wait(this, 200);
          break;
        case 'reposition': {
          const img = this.sprite(e.unit);
          if (!img || !e.path.length) break;
          for (const p of e.path) {
            const o = unitOrigin(this.board.layout, p.x, p.y);
            await slide(this, img, o.px, o.py, 80);
            img.setDepth(this.board.rowDepth(p.y) + 5);
            this.board.placePips(e.unit);
          }
          break;
        }
        default:
          break;
      }
    }
    this.busy = false;
    // keep a sensible selection
    const sel = this.selected ? unitById(this.state, this.selected) : undefined;
    if (!sel || !onBoard(sel)) this.select(this.heroes()[0]?.id ?? null);
    else if (sel.acted) {
      const next = this.heroes().find((h) => !h.acted);
      if (next) this.select(next.id);
    }
    this.refresh();
    const s = this.state;
    if (s.phase === 'won' || s.phase === 'lost') {
      await wait(this, 350);
      sfx.play(s.phase === 'won' ? 'victory' : 'defeat');
      this.scene.launch('Result', { levelId: this.level.id, won: s.phase === 'won', state: s });
      this.scene.bringToTop('Result');
    }
    for (const w of this.settleWaiters.splice(0)) w();
  }
}

export { DEPTH };
