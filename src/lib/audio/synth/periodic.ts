/** Periodic tone with an arbitrary harmonic spectrum (e.g. weighted by a tube's impedance). */
import { audio, rampTo } from '../engine';

export interface PeriodicTone {
  set(f0: number, amplitudes: readonly number[]): void;
  stop(): void;
}

export async function startPeriodic(
  f0: number,
  amplitudes: readonly number[],
): Promise<PeriodicTone> {
  const ctx = await audio.start();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  g.gain.value = 0;
  const apply = (amps: readonly number[]) => {
    const real = new Float32Array(amps.length + 1);
    const imag = new Float32Array(amps.length + 1);
    amps.forEach((a, i) => (imag[i + 1] = a));
    osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  };
  apply(amplitudes);
  osc.frequency.value = f0;
  osc.connect(g).connect(audio.input);
  osc.start();
  rampTo(g.gain, 0.5, ctx, 0.03);
  let unregister = () => {};
  const tone: PeriodicTone = {
    set(f, amps) {
      rampTo(osc.frequency, f, ctx, 0.03);
      apply(amps);
    },
    stop() {
      rampTo(g.gain, 0, ctx, 0.02);
      osc.stop(ctx.currentTime + 0.15);
      unregister();
    },
  };
  unregister = audio.register(tone);
  return tone;
}
