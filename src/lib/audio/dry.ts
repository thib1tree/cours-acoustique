/** Dry (anechoic) test sounds, synthesized: no recording, no rights to clear. */
import { mulberry32 } from './fft';

/** A hand-clap-like burst: 6 ms of noise with a fast exponential decay. */
export function clap(rate: number): Float32Array {
  const n = Math.round(0.03 * rate);
  const out = new Float32Array(n);
  const rnd = mulberry32(5);
  for (let i = 0; i < n; i++) out[i] = (2 * rnd() - 1) * Math.exp(-i / (0.004 * rate));
  return out;
}

/** Three plucked notes (Karplus–Strong), a sparse "musical" dry signal. */
export function plucks(rate: number): Float32Array {
  const notes = [
    { f: 196, t: 0 },
    { f: 293.66, t: 0.35 },
    { f: 392, t: 0.7 },
  ];
  const n = Math.round(1.6 * rate);
  const out = new Float32Array(n);
  const rnd = mulberry32(9);
  for (const { f, t } of notes) {
    const p = Math.round(rate / f);
    const buf = Float32Array.from({ length: p }, () => 2 * rnd() - 1);
    const start = Math.round(t * rate);
    let k = 0;
    for (let i = start; i < n; i++) {
      const v = buf[k % p]!;
      const next = buf[(k + 1) % p]!;
      buf[k % p] = 0.996 * 0.5 * (v + next);
      out[i] = out[i]! + 0.5 * v;
      k++;
    }
  }
  return out;
}
