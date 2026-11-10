/**
 * The battle: owns a Session (pure core state + undo), a BoardView and a Hud.
 * Input -> core action -> event list -> animations -> refresh. The core never
 * waits for the view; the view plays the events and then snaps to the truth.
 */
import Phaser from 'phaser';
import { C, FIGURE_NIGHT_REMAP } from '../art/palette';
import { drawBackdrop } from '../art/backdrops';
import { TROJANS, buildFigureFrames } from '../art/sprites/units';
import { shipSprite } from '../art/sprites/extras';
import { Session } from '../core/session';
import { abilitiesOf, abilityTargets, canAct, moveOptions } from '../core/rules';
import { lineDir, onBoard, unitAt, unitById } from '../core/board';
import type { Ability, Action, Dir, GameEvent, GameState, PatronId, Unit } from '../core/types';
import { levelById, LEVELS } from '../data/levels/index';
import type { LevelData } from '../core/level';
import { BoardView, DEPTH, EMPTY_UI, type BoardUi } from '../view/BoardView';
import { Hud } from '../view/Hud';
import { tileOrigin } from '../view/layout';
import { ensureTexture } from '../view/textures';
import { banner, boltFx, manifest, popNumber, shake, shatter, slide } from '../view/fx';
import { STRINGS } from '../data/strings';
import { wait } from '../view/ui';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { fxSettings } from '../view/fx';
import { Coach, type Rect } from '../view/Coach';
import { measureLine } from '../art/font';
import { Tutorial, type TutInput } from '../game/tutorial';
import { firstTurnSteps, hintAvailable, hintsUnlocked, hintText, recordAttempt, unlockNextHint } from '../game/hints';
import { goalTiles, objectiveShort, turnGoal } from '../data/teach';
import { trojans } from '../core/board';
import { t } from '../data/strings';
import { updateSave } from '../game/save';
import { addButton, type PixelButton } from '../view/ui';

export interface BattleData {
  levelId: string;
  patron?: PatronId | null;
  /** Level 1's guided tutorial. */
  tutorial?: boolean;
  /** Hint 3: replay the first turn of the recorded solution. */
  demo?: boolean;
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
  waveOrigin: { x: number; y: number } | null = null;
  /** Push/swap may target allies only after the player picks the ability explicitly. */
  aimAllies = false;
  /** A pause or restart pressed during an animation, run when it ends (BUG-18). */
  pendingKey: 'pause' | 'restart' | null = null;
  private settleWaiters: Array<() => void> = [];
  private godShown = new Set<string>();
  private banterCount: Record<string, number> = {};
  /** Level 1 tutorial (null when not running). */
  tut: Tutorial | null = null;
  coach!: Coach;
  /** Hint 3 is playing the first turn: the player watches. */
  demoActive = false;
  private hintBtn: PixelButton | null = null;
  private clearShown = false;
  private wantDemo = false;

  /** Next banter line for a god (cycles through god.<name>.1..3). */
  banter(god: string): string {
    const n = (this.banterCount[god] = (this.banterCount[god] ?? 0) + 1);
    return STRINGS[`god.${god}.${((n - 1) % 3) + 1}`] ?? '';
  }

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
    this.waveOrigin = null;
    this.tut = data.tutorial ? new Tutorial() : null;
    this.wantDemo = !!data.demo;
    this.demoActive = false;
    this.clearShown = false;
    this.hintBtn = null;
  }

  create(): void {
    const night = this.level.backdrop === 'night';
    this.add.image(0, 0, ensureTexture(this, `bg|${this.level.backdrop ?? 'beach'}`, () => drawBackdrop(this.level.backdrop ?? 'beach'))).setOrigin(0, 0).setDepth(-10);
    this.board = new BoardView(this, this.state, night);
    this.board.warm([...new Set(this.state.units.map((u) => u.type))]);
    this.hud = new Hud(this, objectiveShort(this.level), turnGoal(this.level), this.state, {
      endTurn: () => this.endTurn(),
      undo: () => this.undo(),
      restart: () => this.restart(),
      favor: () => this.toggleFavor(),
      ability: (a) => this.setAbility(a),
    });

    music.play(`act${this.level.act}`);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onHover(p));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.coach = new Coach(this);
    this.events.once('shutdown', () => { this.board.destroy(); this.coach.destroy(); });

    // auto-select the first hero so a new player sees what to do (the tutorial asks instead)
    const first = this.state.units.find((u) => u.team === 'greek' && onBoard(u));
    if (first && !this.tut) this.select(first.id);
    this.refresh();
    this.board.setGoals(goalTiles(this.level), this.state); // after refresh: sprites are placed
    if (this.tut) this.showTutorial();
    else if (hintAvailable(this.level.id, false)) this.addHintButton();
    if (this.wantDemo) this.time.delayedCall(250, () => void this.startDemo());
    this.game.events.emit('poo:ready', 'Battle');
  }

  // ------------------------------------------------------------------ helpers

  private ui(): BoardUi {
    const s = this.state;
    const ui: BoardUi = { ...EMPTY_UI, selected: this.selected, cursor: this.cursor, preview: this.preview, highContrast: fxSettings.highContrast };
    const u = this.selected ? unitById(s, this.selected) : undefined;
    if (u && onBoard(u) && s.phase === 'player' && this.mode === 'idle') {
      ui.moveTiles = [...moveOptions(s, u).values()].map((p) => p[p.length - 1]!);
      ui.targetTiles = canAct(s, u) ? abilityTargets(s, u, this.ability).filter((t) => this.aimAllies || unitAt(s, t.x, t.y)?.team !== 'greek') : [];
      if (this.tut?.active) {
        // the tutorial shows only the moves and targets its step allows
        const ctx = { state: s, selected: this.selected, info: this.info };
        const tut = this.tut;
        ui.moveTiles = ui.moveTiles.filter((t) => tut.allows({ kind: 'move', unit: u.id, ...t }, ctx));
        ui.targetTiles = ui.targetTiles.filter((t) => tut.allows({ kind: 'act', unit: u.id, ...t }, ctx));
      }
    }
    if (this.mode === 'favor' && s.patron === 'poseidon' && this.waveOrigin) ui.wave = { ...this.waveOrigin, dir: this.favorDir };
    if (this.mode === 'favor' && s.patron === 'athena') ui.targetTiles = s.units.filter((v) => v.team === 'greek' && onBoard(v) && v.acted).map((v) => ({ x: v.x, y: v.y }));
    return ui;
  }

  refresh(): void {
    this.board.refresh(this.state, this.ui());
    const infoUnit = (this.info && unitById(this.state, this.info)) || (this.selected && unitById(this.state, this.selected)) || null;
    this.hud.update(this.state, this.session.canUndo, this.busy, infoUnit && onBoard(infoUnit) ? infoUnit : null, this.mode === 'favor', this.selected, this.ability, this.aimAllies);
    // facing: Greeks are drawn facing right, Trojans facing left
    for (const u of this.state.units) {
      const v = this.board.units.get(u.id);
      if (!v || u.type === 'ship') continue;
      const natural: Dir = u.team === 'trojan' ? 'left' : 'right';
      if (u.facing === 'left' || u.facing === 'right') v.sprite.setFlipX(u.facing !== natural);
    }
  }

  private select(id: string | null): void {
    if (id !== this.selected) this.aimAllies = false;
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
    if (!this.busy) { this.refresh(); this.tutorialCheck(); }
  }

  private get covered(): boolean {
    return this.scene.isActive('Result');
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    sfx.unlock();
    if (this.busy || this.covered) return;
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
    if (s.phase !== 'player' || this.busy || this.demoActive) return;
    const confirmed = !needsConfirm || (this.preview?.x === x && this.preview?.y === y);
    const here = unitAt(s, x, y);

    if (this.mode === 'favor') {
      if (s.patron === 'poseidon') {
        // 1st tap: the wave's line; 2nd tap on a neighbour: its direction (same tile = current direction)
        const o = this.waveOrigin;
        if (o && o.x === x && o.y === y) return this.castWave(o, this.favorDir);
        const d = o ? lineDir(o.x, o.y, x, y) : null;
        if (o && d && Math.abs(o.x - x) + Math.abs(o.y - y) === 1) return this.castWave(o, d);
        this.waveOrigin = { x, y };
        sfx.play('tick');
        this.refresh();
        return;
      }
      if (s.patron === 'athena' && !(here && here.team === 'greek' && here.acted)) { sfx.play('invalid'); return; }
      const ownZeus = s.patron === 'zeus' && here?.team === 'greek';
      const sure = confirmed && (!ownZeus || (this.preview?.x === x && this.preview?.y === y));
      if (!sure) { this.preview = { x, y }; this.info = here?.id ?? null; sfx.play(ownZeus ? 'invalid' : 'tick'); this.refresh(); return; }
      this.preview = null;
      this.dispatch({ type: 'favor', god: s.patron!, x, y });
      return;
    }

    const sel = this.selected ? unitById(s, this.selected) : undefined;
    const ui = this.ui();
    const isTarget = ui.targetTiles.some((t) => t.x === x && t.y === y);
    const isMove = ui.moveTiles.some((t) => t.x === x && t.y === y);

    const allyTarget = !!here && here.team === 'greek' && isTarget && this.aimAllies;
    if (sel && isTarget && (!allyTarget || (this.preview?.x === x && this.preview?.y === y))) {
      if (!this.permit({ kind: 'act', unit: sel.id, x, y })) return;
      if (!confirmed) { this.preview = { x, y }; this.info = here?.id ?? null; sfx.play('select'); this.refresh(); return; }
      this.preview = null;
      this.dispatch({ type: 'act', unit: sel.id, ability: this.ability, x, y });
      return;
    }
    if (allyTarget && sel) {
      // first click on an ally the hero could push/swap: preview it; click again to act
      this.preview = { x, y };
      this.info = here!.id;
      sfx.play('select');
      this.refresh();
      return;
    }
    if (here && here.team === 'greek') {
      if (!this.permit({ kind: 'select', unit: here.id })) return;
      if (this.selected !== here.id) sfx.play('select');
      this.select(here.id);
      this.info = here.id;
      this.refresh();
      this.tutorialCheck();
      return;
    }
    if (sel && isMove) {
      if (!this.permit({ kind: 'move', unit: sel.id, x, y })) return;
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
      this.tutorialCheck();
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
    if (this.covered) return;
    if (e.repeat && !e.code.startsWith('Arrow')) return;
    const s = this.state;
    const k = e.code;
    if (this.demoActive || (this.coach.visible && !this.tut?.active)) {
      if (k === 'Enter' || k === 'Space' || k === 'KeyE') { this.coach.pressKey('E'); return; }
      if (k === 'Escape') { this.coach.pressKey('Esc'); return; }
      if (this.demoActive) return;
    }
    if (k === 'KeyE') return this.hud.endTurn.press();
    if (k === 'KeyZ') return this.hud.undo.press();
    if (k === 'KeyR') {
      if (this.busy) { this.pendingKey = 'restart'; return; }
      return this.hud.restart.press();
    }
    if ((k === 'Escape' || k === 'KeyP') && this.busy) { this.pendingKey = 'pause'; return; }
    if (k === 'KeyF') return this.hud.favor?.press();
    if (this.busy || s.phase !== 'player') return;
    if (k === 'Escape' || k === 'KeyP') {
      if (this.mode === 'favor') { this.mode = 'idle'; this.waveOrigin = null; }
      else if (this.selected && k === 'Escape') this.select(null);
      else { this.openPause(); return; }
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
      if (!this.permit({ kind: 'select', unit: next.id })) return;
      this.select(next.id);
      this.cursor = { x: next.x, y: next.y };
      this.info = next.id;
      sfx.play('select');
      this.refresh();
      this.tutorialCheck();
      return;
    }
    if (k === 'Digit1' || k === 'Digit2') {
      const u = this.selected ? unitById(s, this.selected) : undefined;
      const abs = u ? abilitiesOf(u) : [];
      const pick = abs[k === 'Digit1' ? 0 : 1];
      if (pick) this.setAbility(pick);
      return;
    }
    const arrows: Record<string, [number, number, Dir]> = { ArrowUp: [0, -1, 'up'], ArrowDown: [0, 1, 'down'], ArrowLeft: [-1, 0, 'left'], ArrowRight: [1, 0, 'right'], KeyW: [0, -1, 'up'], KeyS: [0, 1, 'down'], KeyA: [-1, 0, 'left'], KeyD: [1, 0, 'right'] };
    const a = arrows[k];
    if (a) {
      e.preventDefault();
      if (this.mode === 'favor' && s.patron === 'poseidon' && this.waveOrigin) { this.favorDir = a[2]; sfx.play('tick'); this.refresh(); return; }
      const sel = this.selected ? unitById(s, this.selected) : undefined;
      const c = this.cursor ?? (sel ? { x: sel.x, y: sel.y } : { x: 0, y: 0 });
      this.cursor = { x: Math.max(0, Math.min(s.width - 1, c.x + a[0])), y: Math.max(0, Math.min(s.height - 1, c.y + a[1])) };
      const u = unitAt(s, this.cursor.x, this.cursor.y);
      this.info = u?.id ?? null;
      sfx.play('tick');
      this.refresh();
      this.tutorialCheck();
      return;
    }
    if ((k === 'Enter' || k === 'Space' || k === 'NumpadEnter') && this.cursor) {
      e.preventDefault();
      this.tapTile(this.cursor.x, this.cursor.y, false);
    }
  }

  // ------------------------------------------------------------------ commands

  private castWave(o: { x: number; y: number }, dir: Dir): void {
    this.waveOrigin = null;
    this.dispatch({ type: 'favor', god: 'poseidon', x: o.x, y: o.y, dir });
  }

  setAbility(a: Ability): void {
    this.ability = a;
    this.aimAllies = true; // an explicit choice: allies in reach become targets
    this.preview = null;
    sfx.play('tick');
    this.refresh();
  }

  openPause(): void {
    if (this.busy || this.covered) return;
    sfx.play('ui');
    this.scene.pause();
    this.scene.launch('Pause');
  }

  toggleFavor(): void {
    if (this.busy || !this.state.patron || this.state.favorUsed || this.demoActive) return;
    if (!this.permit({ kind: 'favor' })) return;
    this.mode = this.mode === 'favor' ? 'idle' : 'favor';
    this.waveOrigin = null;
    this.preview = null;
    sfx.play('select');
    this.refresh();
  }

  endTurn(): void {
    if (this.busy || this.covered || this.state.phase !== 'player' || this.demoActive) return;
    if (!this.permit({ kind: 'endTurn' })) return;
    this.mode = 'idle';
    this.preview = null;
    this.dispatch({ type: 'endTurn' });
  }

  undo(): void {
    if (this.busy || this.covered || this.demoActive) return;
    if (!this.permit({ kind: 'undo' })) return;
    if (this.session.undo()) {
      sfx.play('undo');
      this.mode = 'idle';
      this.preview = null;
      this.refresh();
      this.tutorialCheck({ kind: 'undo' });
    }
  }

  restart(): void {
    if (this.busy || this.covered || this.demoActive) return;
    if (!this.permit({ kind: 'restart' })) return;
    if (!this.tut) recordAttempt(this.level.id);
    sfx.play('select');
    this.scene.stop('Result');
    this.scene.restart({ levelId: this.level.id, patron: this.session.patron, tutorial: !!this.tut?.active });
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
    if (this.tut?.active) this.coach.clear();
    void this.play(r.events);
  }

  // ------------------------------------------------------------------ tutorial

  /** While the tutorial runs, only the step's own action is allowed. */
  private permit(input: TutInput): boolean {
    if (!this.tut?.active) return true;
    if (this.tut.allows(input, { state: this.state, selected: this.selected, info: this.info })) return true;
    sfx.play('invalid');
    return false;
  }

  private tutorialCheck(last?: TutInput): void {
    if (!this.tut?.active) return;
    const before = this.tut.step;
    this.tut.after({ state: this.state, selected: this.selected, info: this.info, last });
    if (!this.tut.active) return this.finishTutorial(true);
    if (this.tut.step !== before) sfx.play('tick');
    if (!this.busy) this.showTutorial();
  }

  private finishTutorial(completed: boolean): void {
    updateSave((d) => { d.tutorialDone = true; });
    this.coach.clear();
    this.skipBtn?.destroy();
    this.skipBtn = null;
    if (!completed) {
      this.tut?.skip();
      if (!this.selected) this.select(this.heroes()[0]?.id ?? null);
      this.refresh();
    }
  }

  private skipBtn: PixelButton | null = null;

  /** Screen rect of a unit's sprite. */
  private unitRect(id: string): Rect | null {
    const v = this.board.units.get(id);
    if (!v || !v.sprite.visible) return null;
    return { x: Math.round(v.sprite.x) - 1, y: Math.round(v.sprite.y) - 1, w: v.sprite.width + 2, h: v.sprite.height + 2 };
  }

  private tileRect(x: number, y: number): Rect {
    const o = tileOrigin(this.board.layout, x, y);
    return { x: o.px, y: o.py, w: 24, h: 17 };
  }

  private showTutorial(): void {
    const tut = this.tut;
    if (!tut?.active) return;
    const step = tut.step;
    const tg = tut.target(this.state);
    const frames: Rect[] = [];
    let holes: Rect[];
    if (tg.kind === 'unit') { const r = this.unitRect(tg.id); if (r) frames.push(r); }
    else if (tg.kind === 'tile') frames.push(this.tileRect(tg.x, tg.y));
    else if (tg.kind === 'units') {
      for (const id of tg.ids) { const r = this.unitRect(id); if (r) frames.push(r); }
      for (const tl of tg.tiles) frames.push(this.tileRect(tl.x, tl.y));
    } else if (tg.kind === 'button') {
      const b = tg.label === 'End turn' ? this.hud.endTurn : this.hud.undo;
      frames.push({ x: b.img.x, y: b.img.y, w: b.img.width, h: b.img.height });
    }
    // the hole: around what to click; moves keep the whole board lit
    if (step === 'move' || step === 'dodge' || step === 'finish' || step === 'strike') {
      const L = this.board.layout;
      holes = [{ x: L.ox - 2, y: L.oy - 22, w: L.cols * 24 + 4, h: L.rows * 16 + 26 }];
    } else {
      const u = unionRect(frames);
      holes = u ? [{ x: u.x - 3, y: u.y - 3, w: u.w + 6, h: u.h + 6 }] : [];
    }
    // one frame around the whole subject (unit + its tiles), never a double line
    if (frames.length > 1) { const u = unionRect(frames); frames.length = 0; if (u) frames.push(u); }
    if (step === 'read') {
      // keep the HUD order list readable too
      holes.push({ x: 216, y: 70, w: 102, h: 24 });
    }
    this.coach.show({ text: t(`tut.${step}.text`), keys: t(`tut.${step}.keys`), holes, frames });
    if (!this.skipBtn) {
      this.skipBtn = addButton(this, 4, 164, 76, 13, t('ui.skipTutorial'), () => { sfx.play('ui'); this.finishTutorial(false); });
      this.skipBtn.img.setDepth(DEPTH.hud + 50);
    }
  }

  // ------------------------------------------------------------------ hints

  private addHintButton(): void {
    if (this.hintBtn) return;
    const w = measureLine(t('hint.ask')) + measureLine('H') + 18;
    this.hintBtn = addButton(this, 210 - w, 21, w, 13, t('hint.ask'), () => this.openHint(), 'H');
    this.hintBtn.img.setDepth(DEPTH.hud + 2);
    this.input.keyboard?.on('keydown-H', () => { if (!this.busy && !this.demoActive && !this.covered) this.hintBtn?.press(); });
  }

  private openHint(): void {
    if (this.busy || this.demoActive) return;
    sfx.play('ui');
    let n = hintsUnlocked(this.level.id);
    if (n === 0) n = unlockNextHint(this.level.id);
    this.showHint(n);
  }

  private showHint(n: number): void {
    const shown = Math.min(2, Math.max(1, n)) as 1 | 2;
    const buttons: Array<{ label: string; key?: string; fn: () => void }> = [];
    if (n < 2) buttons.push({ label: t('hint.more'), key: 'E', fn: () => { sfx.play('tick'); this.showHint(unlockNextHint(this.level.id)); } });
    else buttons.push({ label: t('hint.show'), key: 'E', fn: () => this.requestDemo() });
    buttons.push({ label: t('ui.close'), key: 'Esc', fn: () => { sfx.play('ui'); this.coach.clear(); } });
    this.coach.show({ text: `${t('hint.title', { n: shown })}. ${hintText(this.level.id, shown)}`, holes: [], frames: [], buttons, width: 208 });
  }

  /** Hint 3: restart with the solution's patron and play turn 1 step by step. */
  private requestDemo(): void {
    if (hintsUnlocked(this.level.id) < 3) unlockNextHint(this.level.id);
    sfx.play('select');
    this.coach.clear();
    this.scene.restart({ levelId: this.level.id, patron: this.level.solution.patron, demo: true });
  }

  private async startDemo(): Promise<void> {
    const steps = firstTurnSteps(this.level);
    this.demoActive = true;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i]!;
      if (st.hero) { this.select(st.hero); this.refresh(); }
      const frames: Rect[] = [];
      if (st.focus) frames.push(this.tileRect(st.focus.x, st.focus.y));
      if (st.hero) { const r = this.unitRect(st.hero); if (r) frames.push(r); }
      if (st.action.type === 'endTurn') frames.push({ x: this.hud.endTurn.img.x, y: this.hud.endTurn.img.y, w: this.hud.endTurn.img.width, h: this.hud.endTurn.img.height });
      await new Promise<void>((res) => {
        this.coach.show({
          text: t('hint.step', { i: i + 1, n: steps.length, what: st.text }),
          holes: [], frames,
          buttons: [{ label: t('hint.go'), key: 'E', fn: () => res() }],
          avoid: frames[0],
        });
      });
      this.coach.clear();
      if (!this.scene.isActive()) return;
      this.dispatch(st.action);
      await this.settle();
      if (this.state.phase !== 'player') break;
    }
    this.demoActive = false;
    if (this.state.phase === 'player') {
      this.coach.show({ text: t('hint.yours'), holes: [], frames: [], buttons: [{ label: t('ui.close'), key: 'E', fn: () => { sfx.play('ui'); this.coach.clear(); } }] });
    }
    this.refresh();
  }

  /** Every Trojan is down but the goal is something else: say what is left. */
  private showClear(): void {
    this.clearShown = true;
    const o = this.state.objective;
    const key = o.type === 'escort' ? 'clear.escort' : o.type === 'stealth' ? 'clear.stealth' : o.type === 'protect' ? 'clear.protect' : 'clear.survive';
    const vars = { hero: o.type === 'escort' ? (this.state.units.find((u) => u.type === o.unit) ? cap(o.unit) : '') : '', n: o.type === 'protect' || o.type === 'survive' ? o.turns : 0 };
    const frames = goalTiles(this.level).map((g) => this.tileRect(g.x, g.y));
    this.coach.show({ text: t(key, vars), holes: [], frames, buttons: [{ label: t('ui.close'), key: 'E', fn: () => { sfx.play('ui'); this.coach.clear(); } }], avoid: frames[0] });
  }

  // ------------------------------------------------------------------ animation

  /** Resolves when no animation is running (test hook). */
  settle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise((res) => this.settleWaiters.push(res));
  }

  private origin(id: string, x: number, y: number): { px: number; py: number } {
    return this.board.spriteOrigin(this.board.units.get(id)?.type ?? '', x, y);
  }

  private sprite(id: string): Phaser.GameObjects.Image | undefined {
    return this.board.units.get(id)?.sprite;
  }

  private sourceBuffer(type: string) {
    if (type === 'ship') return shipSprite();
    const b = buildFigureFrames(type).idle0;
    return this.board.night && !TROJANS.has(type) ? b.paletteSwap(FIGURE_NIGHT_REMAP) : b;
  }

  private async play(events: GameEvent[]): Promise<void> {
    this.busy = true;
    try {
      await this.animate(events);
    } catch (err) {
      console.warn('animation failed', err);
    } finally {
      this.busy = false;
      this.afterPlay();
    }
  }

  /** Plays events over the board as it was before the action (BUG-1). */
  private async animate(events: GameEvent[]): Promise<void> {
    // the board keeps showing the previous state; only the HUD updates (disabled buttons)
    this.hud.update(this.state, false, true, null, false, this.selected, this.ability);
    this.board.clearSelection();
    const unitOf = (id: string) => this.state.units.find((u) => u.id === id);
    for (const e of events) {
      switch (e.t) {
        case 'move': {
          const img = this.sprite(e.unit);
          if (!img) break;
          img.setData('busy', true);
          sfx.play('move');
          for (const p of e.path) {
            const o = this.origin(e.unit, p.x, p.y);
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
            const o = this.origin(e.unit, p.x, p.y);
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
          this.board.setPips(e.unit, e.hp, u.maxHp, u.team === 'trojan' ? 'trojan' : 'greek');
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
          const o = this.origin(e.unit, e.to.x, e.to.y);
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
          const oa = this.origin(e.unit, e.to.x, e.to.y), ob = this.origin(e.target, e.from.x, e.from.y);
          await Promise.all([slide(this, a, oa.px, oa.py, 140), slide(this, b, ob.px, ob.py, 140)]);
          break;
        }
        case 'favor': {
          const o = tileOrigin(this.board.layout, e.x, e.y);
          await manifest(this, e.god, this.banter(e.god), this.board.layout.ox + this.board.layout.cols * 12 - 24, this.board.layout.oy - 54);
          sfx.play(e.god === 'zeus' ? 'lightning' : e.god === 'poseidon' ? 'wave' : 'select');
          if (e.god === 'zeus') await boltFx(this, o.px, o.py);
          else await wait(this, 150);
          break;
        }
        case 'phase': {
          if (e.phase === 'player') this.refresh();
          if (e.phase === 'enemy') await banner(this, 'Trojans act', C.cream, 420);
          else await banner(this, 'Your move', C.goldHi, 380);
          break;
        }
        case 'fireSpread':
          sfx.play('fire');
          this.board.showFire(this.state);
          await wait(this, 150);
          break;
        case 'god': {
          if (this.godShown.has(`${e.god}|${e.what}|${this.state.turn}`)) break;
          this.godShown.add(`${e.god}|${e.what}|${this.state.turn}`);
          sfx.play(e.god === 'apollo' ? 'plague' : e.god === 'ares' ? 'bump' : 'swap');
          await manifest(this, e.god, this.banter(e.god), this.board.layout.ox + this.board.layout.cols * 12 - 24, this.board.layout.oy - 54);
          break;
        }
        case 'plague':
          sfx.play('plague');
          await wait(this, 200);
          break;
        case 'reposition': {
          const img = this.sprite(e.unit);
          if (!img || !e.path.length) break;
          for (const p of e.path) {
            const o = this.origin(e.unit, p.x, p.y);
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
  }

  private afterPlay(): void {
    const pend = this.pendingKey;
    this.pendingKey = null;
    if (pend && this.state.phase !== 'won' && this.state.phase !== 'lost') {
      this.time.delayedCall(0, () => (pend === 'restart' ? this.restart() : this.openPause()));
    }
    // keep a sensible selection
    const sel = this.selected ? unitById(this.state, this.selected) : undefined;
    if (!sel || !onBoard(sel)) this.select(this.heroes()[0]?.id ?? null);
    else if (sel.acted) {
      const next = this.heroes().find((h) => !h.acted);
      if (next) this.select(next.id);
    }
    this.refresh();
    const s = this.state;
    if (!this.demoActive) this.tutorialCheck();
    if (s.phase === 'lost' && !this.tut) recordAttempt(this.level.id);
    if (s.phase === 'player' && !this.tut && !this.demoActive && !this.clearShown && s.objective.type !== 'rout' && trojans(s).length === 0) this.showClear();
    if (s.phase === 'won' || s.phase === 'lost') {
      this.time.delayedCall(350, () => {
        if (this.state.phase !== s.phase) return;
        sfx.play(s.phase === 'won' ? 'victory' : 'defeat');
        this.scene.launch('Result', { levelId: this.level.id, won: s.phase === 'won', state: s, patron: this.session.patron });
        this.scene.bringToTop('Result');
        if (this.scene.isActive('Rotate')) this.scene.bringToTop('Rotate');
      });
    }
    for (const w of this.settleWaiters.splice(0)) w();
  }
}

export { DEPTH };

function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1);
}

function unionRect(rs: Rect[]): Rect | null {
  if (!rs.length) return null;
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
