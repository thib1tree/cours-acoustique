import { describe, expect, it } from 'vitest';
import { fft, shapedNoise } from './fft';

describe('FFT', () => {
  it('matches a direct DFT and inverts exactly (tol. 1e-9)', () => {
    const n = 64;
    const re = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 0.3) + (i % 5) * 0.1);
    const im = Float64Array.from({ length: n }, (_, i) => Math.cos(i * 0.11));
    const r0 = Float64Array.from(re);
    const i0 = Float64Array.from(im);
    fft(re, im, -1);
    for (const k of [0, 1, 7, 33]) {
      let sr = 0;
      let si = 0;
      for (let t = 0; t < n; t++) {
        const a = (-2 * Math.PI * k * t) / n;
        sr += r0[t]! * Math.cos(a) - i0[t]! * Math.sin(a);
        si += r0[t]! * Math.sin(a) + i0[t]! * Math.cos(a);
      }
      expect(Math.abs(re[k]! - sr)).toBeLessThan(1e-9);
      expect(Math.abs(im[k]! - si)).toBeLessThan(1e-9);
    }
    fft(re, im, 1);
    for (let t = 0; t < n; t++) expect(Math.abs(re[t]! / n - r0[t]!)).toBeLessThan(1e-9);
  });
  it('shaped noise puts its energy only where the amplitude spectrum is non-zero', () => {
    const n = 4096;
    const rate = 48000;
    const x = shapedNoise(n, rate, (f) => (f > 1000 && f < 2000 ? 1 : 0));
    const re = Float64Array.from(x);
    const im = new Float64Array(n);
    fft(re, im, -1);
    let inBand = 0;
    let outBand = 0;
    for (let k = 1; k < n / 2; k++) {
      const f = (k * rate) / n;
      const e = re[k]! ** 2 + im[k]! ** 2;
      if (f > 1000 && f < 2000) inBand += e;
      else outBand += e;
    }
    expect(outBand / inBand).toBeLessThan(1e-12);
  });
});
