/**
 * Looped playback of a signal computed sample by sample (e.g. a pass-by rendered from the
 * exact retarded time). `update` swaps the signal with a short cross-fade.
 */
import { audio, rampTo } from '../engine';

export interface BufferLoop {
  /** Sample rate expected by `render`. */
  readonly rate: number;
  update(samples: Float32Array): void;
  stop(): void;
}

/** Peak-normalize to 0.5 (the master gain and the limiter follow). */
function normalize(x: Float32Array): Float32Array<ArrayBuffer> {
  let m = 1e-12;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (0.5 * x[i]!) / m;
  return out;
}

export async function startBufferLoop(render: (rate: number) => Float32Array): Promise<BufferLoop> {
  const ctx = await audio.start();
  const rate = ctx.sampleRate;
  let current: { src: AudioBufferSourceNode; g: GainNode } | null = null;
  const play = (samples: Float32Array) => {
    const buf = ctx.createBuffer(1, samples.length, rate);
    buf.copyToChannel(normalize(samples), 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(audio.input);
    src.start();
    rampTo(g.gain, 1, ctx, 0.03);
    if (current) {
      const old = current;
      rampTo(old.g.gain, 0, ctx, 0.03);
      old.src.stop(ctx.currentTime + 0.2);
    }
    current = { src, g };
  };
  play(render(rate));
  let unregister = () => {};
  const loop: BufferLoop = {
    rate,
    update: play,
    stop() {
      if (current) {
        rampTo(current.g.gain, 0, ctx, 0.02);
        current.src.stop(ctx.currentTime + 0.15);
        current = null;
      }
      unregister();
    },
  };
  unregister = audio.register(loop);
  return loop;
}
