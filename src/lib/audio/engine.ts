/**
 * Web Audio engine shared by the whole site.
 *
 * Rules (CLAUDE.md § 9): sound starts only from a user gesture, the default volume is
 * low, and every voice goes through a limiter before the speakers. The context is
 * suspended when the tab is hidden.
 *
 * Output chain: voices → master gain (−24 dB by default) → compressor-limiter
 * (threshold −6 dBFS, ratio 20:1, attack 1 ms) → soft clipper (tanh) → destination.
 */

export const DEFAULT_MASTER_DB = -24;

export const dbToGain = (db: number): number => 10 ** (db / 20);

/** tanh soft-clip curve: transparent at low level, never exceeds ±1. */
export function softClipCurve(n = 2048): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = Math.tanh((2 * i) / (n - 1) - 1);
  return curve;
}

type Voice = { stop: () => void };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private listeners = new Set<() => void>();

  get context(): AudioContext | null {
    return this.ctx;
  }

  get running(): boolean {
    return this.voices.size > 0;
  }

  /** Must be called from a user gesture (click, touch, key). */
  async start(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor({ latencyHint: 'interactive' });
      const master = ctx.createGain();
      master.gain.value = dbToGain(DEFAULT_MASTER_DB);
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      const clip = ctx.createWaveShaper();
      clip.curve = softClipCurve();
      master.connect(limiter).connect(clip).connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      // iOS unlock: play one silent sample inside the gesture.
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) void ctx.suspend();
        else if (this.voices.size) void ctx.resume();
      });
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    return this.ctx;
  }

  /** Node to which voices connect (before the limiter). */
  get input(): AudioNode {
    if (!this.master) throw new Error('audio engine not started');
    return this.master;
  }

  register(v: Voice): () => void {
    this.voices.add(v);
    this.emit();
    return () => {
      this.voices.delete(v);
      this.emit();
    };
  }

  stopAll(): void {
    for (const v of [...this.voices]) v.stop();
    this.voices.clear();
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const audio = new AudioEngine();

/** Smooth gain ramp to avoid clicks (time constant 15 ms). */
export function rampTo(param: AudioParam, value: number, ctx: AudioContext, tau = 0.015): void {
  param.cancelScheduledValues(ctx.currentTime);
  param.setTargetAtTime(value, ctx.currentTime, tau);
}
