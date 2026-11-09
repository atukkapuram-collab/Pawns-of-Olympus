/**
 * Campaign: every `*.json` in this folder, ordered by act then index.
 * To add a level, drop a JSON file here (format: .claude/skills/pawns-level-design).
 */
import type { LevelData } from '../../core/level';

const modules = import.meta.glob<LevelData>('./*.json', { eager: true, import: 'default' });

export const LEVELS: LevelData[] = Object.values(modules).sort((a, b) => a.act - b.act || a.index - b.index);

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((l) => l.id === id);
}
