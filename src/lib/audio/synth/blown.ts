/**
 * Blowing across a bottle: broadband noise (the turbulent jet) filtered by a sharp
 * resonance at the Helmholtz frequency. A simplification: the real jet locks onto the
 * resonance non-linearly and produces a purer tone.
 */
import { audio, rampTo } from '../engine';

export interface Blown {
  setFrequency(f: number): void;
  stop(): void;
}

export async function startBlown(f0: number, q = 40): Promise<Blown> {
  const ctx = await audio.start();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f0;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(bp).connect(g).connect(audio.input);
  src.start();
  rampTo(g.gain, 4, ctx, 0.08);
  let unregister = () => {};
  const voice: Blown = {
    setFrequency: (f) => rampTo(bp.frequency, f, ctx, 0.05),
    stop() {
      rampTo(g.gain, 0, ctx, 0.05);
      src.stop(ctx.currentTime + 0.3);
      unregister();
    },
  };
  unregister = audio.register(voice);
  return voice;
}
