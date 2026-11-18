/**
 * Synthetic room impulse response for listening (hybrid model, as in auralisation
 * software): exact image sources for the early part, then an exponentially decaying
 * noise tail with the chosen reverberation time, its level matched to the early part.
 * Frequency-independent absorption; the direct sound is normalized to 1.
 */
import { imageSources, type Vec3 } from '../physics/room';
import { mulberry32 } from './fft';

export function roomImpulseResponse(opts: {
  rate: number;
  L: Vec3;
  s: Vec3;
  r: Vec3;
  alpha: number;
  T: number;
  c: number;
  tEarly?: number;
}): Float32Array {
  const { rate, L, s, r, alpha, T, c } = opts;
  const tEarly = opts.tEarly ?? 0.08;
  const length = Math.round(Math.min(4, 1.1 * T + 0.1) * rate);
  const h = new Float32Array(length);
  const imgs = imageSources(L, s, r, c * tEarly);
  const R0 = imgs[0]!.R;
  for (const im of imgs) {
    const t = (im.R / c) * rate;
    const i = Math.floor(t);
    const w = t - i;
    const a = ((1 - alpha) ** (im.order / 2) * R0) / im.R;
    if (i + 1 < length) {
      h[i] = h[i]! + a * (1 - w);
      h[i + 1] = h[i + 1]! + a * w;
    }
  }
  // energy per second just before tEarly (last 20 ms of the early part, excluding the direct sound)
  const i1 = Math.round(tEarly * rate);
  const i0 = Math.round((tEarly - 0.02) * rate);
  let e = 0;
  for (let i = Math.max(i0, Math.round((R0 / c) * rate) + 4); i < i1; i++) e += h[i]! ** 2;
  const density = e / Math.max(1, i1 - i0); // per sample
  const rnd = mulberry32(3);
  const decay = (3 * Math.log(10)) / T; // amplitude e^{−δt}, energy −60 dB in T
  const fade = Math.round(0.01 * rate);
  for (let i = i1 - fade; i < length; i++) {
    const t = i / rate;
    const env = Math.sqrt(3 * density) * Math.exp(-decay * (t - tEarly)); // uniform noise variance 1/3
    const ramp = Math.min(1, (i - (i1 - fade)) / fade);
    h[i] = h[i]! + ramp * env * (2 * rnd() - 1);
  }
  return h;
}
