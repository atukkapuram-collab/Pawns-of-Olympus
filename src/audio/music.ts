/**
 * Music: a tiny Web Audio sequencer. A plucked lyre (Karplus-Strong string),
 * a soft drone and a frame drum play written patterns in Greek modes:
 * Dorian (calm), Phrygian (tension), Mixolydian (victory). Loops seamlessly.
 * Shares the AudioContext that sfx creates on the first user gesture.
 */
import { sfx } from './sfx';

const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const;
type Mode = keyof typeof MODES;

export interface Song {
  mode: Mode;
  root: number; // Hz
  bpm: number;
  /** Scale degrees per eighth note (0-based, may exceed 6 for the next octave); null = rest. */
  melody: Array<number | null>;
  /** Drum hits per eighth: 2 = low, 1 = high, 0 = none. */
  drum: number[];
  drone: boolean;
}

export const SONGS: Record<string, Song> = {
  title: { mode: 'dorian', root: 146.83, bpm: 76, drone: true,
    melody: [0, null, 4, null, 3, 2, null, null, 0, null, 2, 3, 4, null, null, null, 7, null, 6, 4, null, 3, null, null, 2, null, 0, null, 1, null, null, null],
    drum: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0] },
  act1: { mode: 'dorian', root: 146.83, bpm: 84, drone: true,
    melody: [0, 2, 4, null, 3, null, 2, null, 0, null, 4, 5, 4, null, null, null, 2, 3, 4, null, 6, 5, 4, null, 3, null, 2, null, 0, null, null, null],
    drum: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 1, 1, 0] },
  act2: { mode: 'phrygian', root: 164.81, bpm: 92, drone: true,
    melody: [0, 1, 0, null, 4, null, 3, 1, 0, null, null, null, 1, 3, 4, 5, 4, null, 3, null, 1, null, 0, null, 4, 3, 1, null, 0, null, null, null],
    drum: [2, 0, 0, 1, 2, 0, 1, 0, 2, 0, 0, 1, 2, 1, 1, 0, 2, 0, 0, 1, 2, 0, 1, 0, 2, 0, 0, 1, 2, 1, 2, 1] },
  act3: { mode: 'phrygian', root: 130.81, bpm: 100, drone: true,
    melody: [0, null, 1, 3, 4, null, 5, 4, 3, null, 1, null, 0, null, null, null, 7, null, 5, 4, 5, null, 4, 3, 1, null, 3, 1, 0, null, null, null],
    drum: [2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 0, 2, 1, 2, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 1, 2, 1, 2, 1] },
  victory: { mode: 'mixolydian', root: 196, bpm: 108, drone: false,
    melody: [0, 2, 4, 7, null, 6, 4, null, 5, null, 7, null, null, null, null, null],
    drum: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 2, 0, 0, 0, 0, 0] },
};

class Music {
  private gain: GainNode | null = null;
  private song: Song | null = null;
  private songName = '';
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private drone: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private pluckCache = new Map<number, AudioBuffer>();
  volume = 0.35;
  muted = false;

  private ctx(): AudioContext | null {
    return sfx.ctx && sfx.ctx.state === 'running' ? sfx.ctx : null;
  }

  private ensureGain(ctx: AudioContext): GainNode {
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.connect(ctx.destination);
    }
    this.gain.gain.value = this.muted ? 0 : this.volume * 0.5;
    return this.gain;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.gain) this.gain.gain.value = this.muted ? 0 : v * 0.5;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.setVolume(this.volume);
  }

  /** Start (or keep playing) a song. Safe to call before audio is unlocked. */
  play(name: string): void {
    if (this.songName === name && this.timer) return;
    this.stop();
    this.songName = name;
    this.song = SONGS[name] ?? null;
    this.step = 0;
    if (!this.song) return;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.songName = '';
    try { this.drone?.stop(); } catch { /* not started */ }
    this.drone = null;
  }

  private schedule(): void {
    const ctx = this.ctx();
    const song = this.song;
    if (!ctx || !song) return;
    const out = this.ensureGain(ctx);
    if (song.drone && !this.drone) {
      this.drone = ctx.createOscillator();
      this.drone.type = 'triangle';
      this.drone.frequency.value = song.root / 2;
      this.droneGain = ctx.createGain();
      this.droneGain.gain.value = 0.05;
      this.drone.connect(this.droneGain).connect(out);
      this.drone.start();
    }
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    const eighth = 60 / song.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.25) {
      const i = this.step % song.melody.length;
      const deg = song.melody[i];
      if (deg !== null && deg !== undefined) this.pluck(ctx, out, this.freq(song, deg), this.nextTime);
      const d = song.drum[this.step % song.drum.length] ?? 0;
      if (d) this.drum(ctx, out, d === 2, this.nextTime);
      this.nextTime += eighth;
      this.step++;
      if (song === SONGS.victory && this.step >= song.melody.length) {
        this.song = null;
        break;
      }
    }
  }

  private freq(song: Song, degree: number): number {
    const scale = MODES[song.mode];
    const oct = Math.floor(degree / 7);
    const semis = scale[((degree % 7) + 7) % 7]! + 12 * oct;
    return song.root * 2 ** (semis / 12);
  }

  /** Karplus-Strong plucked string: a short noise burst through a damped delay line. */
  private pluckBuffer(ctx: AudioContext, f: number): AudioBuffer {
    const key = Math.round(f * 10);
    const hit = this.pluckCache.get(key);
    if (hit) return hit;
    const sr = ctx.sampleRate, len = Math.floor(sr * 1.4);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / f));
    let seed = key * 9301 + 49297;
    const line = new Float32Array(period);
    for (let i = 0; i < period; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      line[i] = (seed / 233280) * 2 - 1;
    }
    for (let i = 0; i < len; i++) {
      const j = i % period;
      const v = line[j]!;
      const nxt = line[(j + 1) % period]!;
      line[j] = (v + nxt) * 0.5 * 0.996;
      d[i] = v * 0.5;
    }
    this.pluckCache.set(key, buf);
    return buf;
  }

  private pluck(ctx: AudioContext, out: AudioNode, f: number, at: number): void {
    const src = ctx.createBufferSource();
    src.buffer = this.pluckBuffer(ctx, f);
    const g = ctx.createGain();
    g.gain.value = 0.55;
    src.connect(g).connect(out);
    src.start(at);
  }

  private drum(ctx: AudioContext, out: AudioNode, low: boolean, at: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(low ? 110 : 220, at);
    osc.frequency.exponentialRampToValueAtTime(low ? 50 : 140, at + 0.12);
    g.gain.setValueAtTime(low ? 0.5 : 0.18, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + (low ? 0.25 : 0.1));
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 0.3);
  }
}

export const music = new Music();
