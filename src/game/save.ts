/**
 * Saves: versioned JSON in localStorage, every access in try/catch, with a
 * migration hook. A broken or missing save falls back to a fresh one.
 */
export const SAVE_KEY = 'pawns-of-olympus/save';
export const SETTINGS_KEY = 'pawns-of-olympus/settings';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  levels: Record<string, { won: boolean; stars: [boolean, boolean, boolean] }>;
  lastLevel: string | null;
  seenScenes: string[];
}

export interface Settings {
  music: number;
  sound: number;
  muted: boolean;
  shake: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

export const DEFAULT_SETTINGS: Settings = { music: 0.35, sound: 0.6, muted: false, shake: true, reducedMotion: false, highContrast: false };

export function freshSave(): SaveData {
  return { version: SAVE_VERSION, levels: {}, lastLevel: null, seenScenes: [] };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Upgrade older save shapes. v1 is the first; future versions add steps here. */
export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return freshSave();
  const r = raw as Partial<SaveData>;
  if (r.version === SAVE_VERSION) {
    return { ...freshSave(), ...r, levels: r.levels ?? {}, seenScenes: r.seenScenes ?? [] };
  }
  return freshSave();
}

export function loadSave(): SaveData {
  try {
    const s = storage()?.getItem(SAVE_KEY);
    return s ? migrate(JSON.parse(s)) : freshSave();
  } catch {
    return freshSave();
  }
}

export function writeSave(d: SaveData): void {
  try {
    storage()?.setItem(SAVE_KEY, JSON.stringify(d));
  } catch {
    /* storage full or blocked: play on without saving */
  }
}

export function recordResult(levelId: string, stars: [boolean, boolean, boolean]): SaveData {
  const d = loadSave();
  const prev = d.levels[levelId];
  const merged: [boolean, boolean, boolean] = prev ? [prev.stars[0] || stars[0], prev.stars[1] || stars[1], prev.stars[2] || stars[2]] : stars;
  d.levels[levelId] = { won: (prev?.won ?? false) || stars[0], stars: merged };
  d.lastLevel = levelId;
  writeSave(d);
  return d;
}

export function loadSettings(): Settings {
  try {
    const s = storage()?.getItem(SETTINGS_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(s: Settings): void {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
