/**
 * Source–filter vowel synthesis, used to hear the helium voice.
 *
 * Source: glottal pulse train at f₀ (harmonics falling ~ −12 dB/octave), set by the
 * vocal folds and therefore unchanged by the gas. Filter: vocal-tract resonances
 * (formants) — quarter-wave-like resonances of the tract, proportional to the sound
 * speed of the gas inside. Breathing helium raises the formants, not the pitch.
 */
import { audio, rampTo } from '../engine';

/**
 * Formants of an adult male /ɑ/ (Hz) and their bandwidths.
 * TODO-VERIFY: F1–F3 from Peterson & Barney (1952), J. Acoust. Soc. Am. 24(2), Table II
 * (730, 1090, 2440 Hz); F4 and bandwidths are typical textbook values.
 */
export const FORMANTS_A = [
  { f: 730, bw: 90, gainDb: 0 },
  { f: 1090, bw: 110, gainDb: -5 },
  { f: 2440, bw: 170, gainDb: -18 },
  { f: 3400, bw: 250, gainDb: -26 },
] as const;

/** Pure function: formant frequencies scaled by the sound-speed ratio. */
export const scaleFormants = (ratio: number): number[] => FORMANTS_A.map((F) => F.f * ratio);

function glottalWave(ctx: AudioContext, harmonics = 40): PeriodicWave {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) imag[n] = 1 / (n * n); // −12 dB/octave
  return ctx.createPeriodicWave(real, imag);
}

export interface VowelVoice {
  setFormantRatio(r: number): void;
  setF0(f0: number): void;
  stop(): void;
}

export async function startVowel(f0 = 110, ratio = 1): Promise<VowelVoice> {
  const ctx = await audio.start();
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(glottalWave(ctx));
  osc.frequency.value = f0;
  // Slow vibrato for naturalness (±0.6 %).
  const vib = ctx.createOscillator();
  const vibDepth = ctx.createGain();
  vib.frequency.value = 5;
  vibDepth.gain.value = f0 * 0.006;
  vib.connect(vibDepth).connect(osc.frequency);
  const out = ctx.createGain();
  out.gain.value = 0;
  const filters = FORMANTS_A.map((F) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = F.f * ratio;
    bp.Q.value = F.f / F.bw;
    const g = ctx.createGain();
    g.gain.value = 10 ** (F.gainDb / 20) * 6;
    osc.connect(bp).connect(g).connect(out);
    return bp;
  });
  out.connect(audio.input);
  osc.start();
  vib.start();
  rampTo(out.gain, 1, ctx, 0.04);
  let unregister = () => {};
  const voice: VowelVoice = {
    setFormantRatio(r) {
      filters.forEach((bp, i) => rampTo(bp.frequency, FORMANTS_A[i]!.f * r, ctx, 0.05));
    },
    setF0(f) {
      rampTo(osc.frequency, f, ctx, 0.05);
    },
    stop() {
      rampTo(out.gain, 0, ctx, 0.03);
      osc.stop(ctx.currentTime + 0.2);
      vib.stop(ctx.currentTime + 0.2);
      unregister();
    },
  };
  unregister = audio.register(voice);
  return voice;
}
