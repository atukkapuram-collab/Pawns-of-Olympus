import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SAVE_KEY, freshSave, loadSave, loadSettings, migrate, recordResult, writeSettings } from '../src/game/save';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe('save', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
  });

  it('starts fresh, and records results, keeping the best stars', () => {
    expect(loadSave()).toEqual(freshSave());
    recordResult('a1-01', [true, false, true]);
    recordResult('a1-01', [true, true, false]);
    const s = loadSave();
    expect(s.levels['a1-01']).toEqual({ won: true, stars: [true, true, true] });
    expect(s.lastLevel).toBe('a1-01');
  });

  it('survives a corrupted save and unknown versions', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadSave()).toEqual(freshSave());
    expect(migrate({ version: 99, levels: { x: 1 } })).toEqual(freshSave());
    expect(migrate(null)).toEqual(freshSave());
  });

  it('settings round-trip and fill defaults', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    writeSettings({ ...DEFAULT_SETTINGS, shake: false });
    expect(loadSettings().shake).toBe(false);
    localStorage.setItem('pawns-of-olympus/settings', '{"music":0.1}');
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, music: 0.1 });
  });
});
