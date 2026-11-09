/**
 * Sound effects. Each event has its own parameter list (see docs/AUDIO.md).
 * Audio starts only after the first click, tap or keypress.
 */
import { renderSound, type SoundParams } from './synth';

export const SOUNDS = {
  tick: { wave: 'square', freq: 1400, sustain: 0.01, release: 0.02, volume: 0.12, shape: 0.25, jitter: 0.05 },
  select: { wave: 'tri', freq: 660, slide: 900, sustain: 0.03, release: 0.06, volume: 0.25, jitter: 0.03 },
  invalid: { wave: 'square', freq: 140, slide: -120, sustain: 0.04, release: 0.05, volume: 0.18, shape: 0.3, lowpass: 0.3 },
  undo: { wave: 'tri', freq: 720, slide: -1600, sustain: 0.03, release: 0.06, volume: 0.22 },
  move: { wave: 'noise', freq: 400, sustain: 0.02, release: 0.05, volume: 0.12, lowpass: 0.15, jitter: 0.1 },
  strike: { wave: 'square', freq: 520, slide: -600, sustain: 0.02, release: 0.22, volume: 0.32, harmonic: 2.76, noise: 0.15, crush: 10, jitter: 0.06 },
  hit: { wave: 'noise', freq: 300, sustain: 0.03, release: 0.09, volume: 0.3, lowpass: 0.35, jitter: 0.08 },
  block: { wave: 'tri', freq: 110, slide: -80, sustain: 0.02, release: 0.12, volume: 0.4, noise: 0.25, lowpass: 0.4 },
  bump: { wave: 'tri', freq: 90, slide: -60, sustain: 0.03, release: 0.1, volume: 0.4, noise: 0.3, lowpass: 0.3 },
  push: { wave: 'noise', freq: 200, sustain: 0.08, release: 0.08, volume: 0.22, lowpass: 0.08, jitter: 0.08 },
  swap: { wave: 'sine', freq: 300, slide: 2400, sustain: 0.06, release: 0.12, volume: 0.22, noise: 0.35, lowpass: 0.4 },
  shatter: { wave: 'noise', freq: 900, sustain: 0.01, release: 0.32, volume: 0.42, crush: 6, harmonic: 3.1, lowpass: 0.9, jitter: 0.12 },
  arrow: { wave: 'noise', freq: 1800, slide: -2400, sustain: 0.06, release: 0.06, volume: 0.18, lowpass: 0.6, jitter: 0.08 },
  charge: { wave: 'noise', freq: 120, sustain: 0.18, release: 0.12, volume: 0.3, lowpass: 0.06, vibrato: 0.5, vibratoRate: 18 },
  lightning: { wave: 'noise', freq: 60, sustain: 0.06, release: 0.5, volume: 0.5, crush: 4, lowpass: 0.5 },
  wave: { wave: 'noise', freq: 200, sustain: 0.25, release: 0.4, volume: 0.28, lowpass: 0.05, vibrato: 0.3, vibratoRate: 3 },
  fire: { wave: 'noise', freq: 300, sustain: 0.12, release: 0.2, volume: 0.16, lowpass: 0.2, crush: 8 },
  plague: { wave: 'sine', freq: 1700, slide: -1400, sustain: 0.1, release: 0.15, volume: 0.18, vibrato: 0.02, vibratoRate: 30 },
  victory: { wave: 'tri', freq: 392, slide: 196, sustain: 0.25, release: 0.5, volume: 0.3, harmonic: 1.5 },
  defeat: { wave: 'tri', freq: 294, slide: -150, sustain: 0.3, release: 0.6, volume: 0.28, harmonic: 1.19 },
  star: { wave: 'tri', freq: 880, slide: 600, sustain: 0.04, release: 0.25, volume: 0.25, harmonic: 2 },
  ui: { wave: 'square', freq: 900, sustain: 0.01, release: 0.03, volume: 0.12, shape: 0.2 },
} satisfies Record<string, SoundParams>;

export type SoundName = keyof typeof SOUNDS;

class Sfx {
  ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  volume = 0.6;
  muted = false;
  private plays = 0;

  /** Create/resume the AudioContext on the first user gesture. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
        this.setVolume(this.volume);
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.gain) this.gain.gain.value = this.muted ? 0 : v;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.setVolume(this.volume);
  }

  play(name: SoundName): void {
    if (!this.ctx || !this.gain || this.muted || this.ctx.state !== 'running') return;
    const p: SoundParams = SOUNDS[name];
    // 3 pitch variants so repeats don't sound identical
    const variant = p.jitter ? this.plays++ % 3 : 0;
    const key = `${name}|${variant}`;
    let buf = this.cache.get(key);
    if (!buf) {
      const mul = 1 + (variant - 1) * (p.jitter ?? 0);
      const data = renderSound(p, this.ctx.sampleRate, mul, 11 + variant);
      buf = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
      buf.getChannelData(0).set(data);
      this.cache.set(key, buf);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start();
  }
}

export const sfx = new Sfx();
