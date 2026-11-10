/**
 * Campaign flow between scenes. One place decides what comes next:
 * act intro (first time) -> patron select -> pre-level scene -> battle ->
 * result -> post-level scene -> next level (or level select).
 */
import type Phaser from 'phaser';
import { LEVELS, levelById } from '../data/levels/index';
import { STRINGS } from '../data/strings';
import { newTopicsIn } from '../data/teach';
import { loadSave, writeSave } from './save';

export interface CutsceneData {
  kind: 'act' | 'pre' | 'post';
  act: number;
  levelId?: string;
  /** What to start when the scene ends. */
  then: { scene: string; data?: object };
}

export function lines(prefix: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= max; i++) {
    const s = STRINGS[`${prefix}.${i}`];
    if (s) out.push(s);
  }
  return out;
}

export function isUnlocked(levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  if (i <= 0) return true;
  const save = loadSave();
  return !!save.levels[LEVELS[i - 1]!.id]?.won;
}

export function markSeen(key: string): void {
  const s = loadSave();
  if (!s.seenScenes.includes(key)) {
    s.seenScenes.push(key);
    writeSave(s);
  }
}

export function hasSeen(key: string): boolean {
  return loadSave().seenScenes.includes(key);
}

/**
 * Begin a level the proper way:
 * act intro (first time) -> pre-level scene (first time) -> intro cards for
 * anything new (first time) -> briefing (always) -> battle.
 */
export function startLevel(scene: Phaser.Scene, levelId: string): void {
  const level = levelById(levelId) ?? LEVELS[0]!;
  const firstOfAct = LEVELS.find((l) => l.act === level.act)?.id === level.id;
  const tutorial = level.id === LEVELS[0]!.id && !loadSave().tutorialDone;
  const briefing = { scene: 'Briefing', data: { levelId: level.id, tutorial } };
  const fresh = newTopicsIn(level, LEVELS).filter((id) => !hasSeen(`card:${id}`));
  const cards = fresh.length ? { scene: 'Cards', data: { ids: fresh, mode: 'intro', then: briefing } } : briefing;
  const pre = lines(`lvl.${level.id}.pre`, 4);
  const afterAct = pre.length && !hasSeen(`pre:${level.id}`) ? { scene: 'Cutscene', data: { kind: 'pre', act: level.act, levelId: level.id, then: cards } } : cards;
  const first = firstOfAct && !hasSeen(`act:${level.act}`) && lines(`act.${level.act}.panel`, 4).length
    ? { scene: 'Cutscene', data: { kind: 'act', act: level.act, levelId: level.id, then: afterAct } }
    : afterAct;
  for (const s of scene.scene.manager.getScenes(true)) if (s.scene.key !== first.scene) s.scene.stop();
  scene.scene.start(first.scene, first.data);
}

/** Replay Level 1's guided tutorial (from Settings or the pause menu). */
export function startTutorial(scene: Phaser.Scene): void {
  for (const s of scene.scene.manager.getScenes(true)) if (s.scene.key !== 'Battle') s.scene.stop();
  const b = scene.scene.manager.getScene('Battle');
  const data = { levelId: LEVELS[0]!.id, patron: null, tutorial: true };
  if (b.scene.isActive() || b.scene.isPaused()) b.scene.restart(data);
  else scene.scene.start('Battle', data);
}

/** After a win: post scene (if any), then the next level or the map. */
export function afterVictory(scene: Phaser.Scene, levelId: string): void {
  const level = levelById(levelId)!;
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const post = lines(`lvl.${level.id}.post`, 2);
  for (const s of scene.scene.manager.getScenes(true)) s.scene.stop();
  const then = next ? { scene: 'Flow', data: { levelId: next.id } } : { scene: 'Credits', data: { ending: true } };
  if (post.length) scene.scene.start('Cutscene', { kind: 'post', act: level.act, levelId, then });
  else scene.scene.start(then.scene, then.data);
}
