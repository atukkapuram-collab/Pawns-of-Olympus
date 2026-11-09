/**
 * A tiny procedural sound synth in the spirit of ZzFX: every sound is a short
 * parameter list rendered into an AudioBuffer. Written for this project.
 * Deterministic except for an optional small pitch jitter per play.
 */
export type Wave = 'sine' | 'square' | 'saw' | 'tri' | 'noise';

export interface SoundParams {
  wave: Wave;
  /** Start frequency in Hz. */
  freq: number;
  /** Frequency change per second (Hz/s), negative = falling. */
  slide?: number;
  attack?: number;
  sustain?: number;
  release?: number;
  volume?: number;
  /** Square duty / noise mix 0..1. */
  shape?: number;
  /** Mix of white noise into a tonal wave, 0..1. */
  noise?: number;
  /** Tremolo/vibrato depth on pitch (fraction) and rate (Hz). */
  vibrato?: number;
  vibratoRate?: number;
  /** Bit-crush steps (0 = off): gives the dry, ceramic edge. */
  crush?: number;
  /** Simple one-pole low-pass 0..1 (1 = off). */
  lowpass?: number;
  /** Second voice an interval above (ratio), for bronze clangs. */
  harmonic?: number;
  /** Random pitch variation per play (fraction, e.g. 0.06). */
  jitter?: number;
}

/** Seeded LCG so noise is repeatable per render. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function renderSound(p: SoundParams, sampleRate: number, pitchMul = 1, seed = 7): Float32Array {
  const a = p.attack ?? 0.005, su = p.sustain ?? 0.05, r = p.release ?? 0.1;
  const len = Math.max(1, Math.floor((a + su + r) * sampleRate));
  const out = new Float32Array(len);
  const rand = rng(seed);
  let phase = 0, phase2 = 0, lp = 0;
  const vol = p.volume ?? 0.5;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    let f = (p.freq + (p.slide ?? 0) * t) * pitchMul;
    if (p.vibrato) f *= 1 + p.vibrato * Math.sin(t * Math.PI * 2 * (p.vibratoRate ?? 8));
    f = Math.max(20, f);
    phase = (phase + f / sampleRate) % 1;
    phase2 = (phase2 + (f * (p.harmonic ?? 0)) / sampleRate) % 1;
    const osc = (ph: number): number => {
      switch (p.wave) {
        case 'sine': return Math.sin(ph * Math.PI * 2);
        case 'square': return ph < (p.shape ?? 0.5) ? 1 : -1;
        case 'saw': return ph * 2 - 1;
        case 'tri': return 1 - 4 * Math.abs(ph - 0.5);
        case 'noise': return rand() * 2 - 1;
      }
    };
    let v = osc(phase);
    if (p.harmonic) v = v * 0.6 + osc(phase2) * 0.4;
    if (p.noise) v = v * (1 - p.noise) + (rand() * 2 - 1) * p.noise;
    if (p.crush) v = Math.round(v * p.crush) / p.crush;
    const k = p.lowpass ?? 1;
    lp += (v - lp) * k;
    v = lp;
    const env = t < a ? t / a : t < a + su ? 1 : Math.max(0, 1 - (t - a - su) / r);
    out[i] = v * env * vol;
  }
  return out;
}
