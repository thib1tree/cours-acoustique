import { describe, expect, it } from 'vitest';
import { abs } from './complex';
import {
  echogram,
  eyringT,
  fitDecay,
  imageSources,
  listModes,
  meanFreePath,
  modalTransfer,
  sabineConstant,
  sabineT,
  weylCount,
  type Vec3,
} from './room';

const c = 343.2;
const L: Vec3 = [5, 4, 2.7];
const V = L[0] * L[1] * L[2];
const S = 2 * (L[0] * L[1] + L[1] * L[2] + L[0] * L[2]);

describe('room modes', () => {
  it('exact mode count approaches Weyl’s asymptotic formula (tol. 2 % above 5 000 modes)', () => {
    const f = 1000;
    const n = listModes(L, f, c).length;
    expect(n).toBeGreaterThan(5000);
    expect(Math.abs(n / weylCount(f, L, c) - 1)).toBeLessThan(0.02);
  });
  it('modal transfer peaks at an isolated low mode and is reciprocal', () => {
    const modes = listModes(L, 200, c);
    const s: Vec3 = [0.3, 0.3, 0.3];
    const r: Vec3 = [4.1, 1.2, 1.9];
    const f100 = modes[0]!.f; // (1,0,0)
    let best = 0;
    let fbest = 0;
    for (let f = f100 * 0.9; f <= f100 * 1.1; f += 0.01) {
      const a = abs(modalTransfer(f, L, s, r, 0.8, c, modes));
      if (a > best) {
        best = a;
        fbest = f;
      }
    }
    expect(Math.abs(fbest / f100 - 1)).toBeLessThan(0.01);
    const a = modalTransfer(87, L, s, r, 0.8, c, modes);
    const b = modalTransfer(87, L, r, s, 0.8, c, modes);
    expect(abs([a[0] - b[0], a[1] - b[1]])).toBeLessThan(1e-12);
  });
});

describe('reverberation', () => {
  it('Sabine constant 24 ln 10 / c ≈ 0.161 s/m at 343 m/s; Eyring → Sabine for small α (tol. 0.6 %)', () => {
    expect(sabineConstant(343)).toBeCloseTo(0.1611, 4);
    expect(Math.abs(eyringT(V, S, 0.01, c) / sabineT(V, S, 0.01, c) - 1)).toBeLessThan(0.006);
    expect(eyringT(V, S, 0.999999, c)).toBeLessThan(0.01);
  });
  it('mean free path 4V/S equals the mean chord of Lambert-distributed rays (Monte Carlo, tol. 1 %)', () => {
    // Cauchy's formula: rays leaving the walls uniformly, with a cosine-weighted direction.
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const faces = [
      { a: L[1] * L[2], axis: 0 },
      { a: L[0] * L[2], axis: 1 },
      { a: L[0] * L[1], axis: 2 },
    ];
    const total = faces.reduce((s0, f) => s0 + f.a, 0);
    let sum = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) {
      let u = rnd() * total;
      let ax = 0;
      for (const f of faces) {
        if (u < f.a) {
          ax = f.axis;
          break;
        }
        u -= f.a;
      }
      // start on the wall x_ax = 0, direction cosine-weighted into the room
      const st = Math.sqrt(rnd());
      const ct = Math.sqrt(1 - st * st);
      const ph = 2 * Math.PI * rnd();
      const dir = [0, 0, 0];
      const o = [(ax + 1) % 3, (ax + 2) % 3];
      dir[ax] = ct;
      dir[o[0]!] = st * Math.cos(ph);
      dir[o[1]!] = st * Math.sin(ph);
      const p = [0, 0, 0];
      p[ax] = 0;
      p[o[0]!] = rnd() * L[o[0]!]!;
      p[o[1]!] = rnd() * L[o[1]!]!;
      let t = Infinity;
      for (let k = 0; k < 3; k++) {
        const d = dir[k]!;
        if (Math.abs(d) < 1e-15) continue;
        const tk = d > 0 ? (L[k]! - p[k]!) / d : -p[k]! / d;
        if (tk > 1e-12) t = Math.min(t, tk);
      }
      sum += t;
    }
    expect(Math.abs(sum / N / meanFreePath(V, S) - 1)).toBeLessThan(0.01);
  });
  it('image sources hit the walls cS/4V times per second on average (mean free path, tol. 1 %)', () => {
    const s0: Vec3 = [1.1, 1.3, 1.2];
    const r0: Vec3 = [3.7, 2.6, 1.5];
    const imgs = imageSources(L, s0, r0, c * 0.4).filter((i) => i.R / c > 0.3);
    const rate = imgs.reduce((acc, i) => acc + i.order / (i.R / c), 0) / imgs.length;
    expect(Math.abs(rate / ((c * S) / (4 * V)) - 1)).toBeLessThan(0.01);
  });
  it('specular box with uniform α decays more slowly than Eyring predicts (non-diffuse field)', () => {
    // Paths that rarely meet the walls (near-axial) carry the late energy: the mean of
    // (1 − α)^n exceeds (1 − α)^{mean n}. Eyring assumes a diffuse field.
    const alpha = 0.2;
    const s0: Vec3 = [1.1, 1.3, 1.2];
    const r0: Vec3 = [3.7, 2.6, 1.5];
    expect(echogramT(L, s0, r0, alpha)).toBeGreaterThan(eyringT(V, S, alpha, c));
  });
  it('first-order images: six in a box, at the unfolded path lengths', () => {
    const s: Vec3 = [1, 1, 1];
    const r: Vec3 = [2, 2, 2];
    const first = imageSources(L, s, r, 20).filter((i) => i.order === 1);
    expect(first.length).toBe(6);
    const viaFloor = first.find((i) => Math.abs(i.p[2] + 1) < 1e-12)!;
    expect(viaFloor.R).toBeCloseTo(Math.hypot(1, 1, 3), 12);
  });
});

/** Reverberation time fitted on the image-source echogram (50–450 ms). */
function echogramT(Lr: Vec3, s0: Vec3, r0: Vec3, alpha: number): number {
  return fitDecay(echogram(Lr, s0, r0, alpha, c, 0.45, 0.01), 0.01, 0.05, 0.45);
}
