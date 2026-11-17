/** Sine tone whose level follows a dB offset (for hearing ±1, 3, 6, 10 dB steps). */
import { audio, dbToGain, rampTo } from '../engine';

export interface Tone {
  setLevelDb(db: number): void;
  setFrequency(f: number): void;
  stop(): void;
}

export async function startTone(f = 1000, levelDb = -12): Promise<Tone> {
  const ctx = await audio.start();
  const osc = ctx.createOscillator();
  osc.frequency.value = f;
  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g).connect(audio.input);
  osc.start();
  rampTo(g.gain, dbToGain(levelDb), ctx, 0.03);
  let unregister = () => {};
  const tone: Tone = {
    setLevelDb: (db) => rampTo(g.gain, dbToGain(db), ctx),
    setFrequency: (fr) => rampTo(osc.frequency, fr, ctx),
    stop() {
      rampTo(g.gain, 0, ctx, 0.02);
      osc.stop(ctx.currentTime + 0.15);
      unregister();
    },
  };
  unregister = audio.register(tone);
  return tone;
}
