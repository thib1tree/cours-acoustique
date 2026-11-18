/**
 * Chapter 7: room acoustics of a rectangular room (shoebox) Lx × Ly × Lz with rigid or
 * uniformly absorbing walls. Convention e^{−iωt}.
 */
import { type Complex, C, add, div, scale } from './complex';

export type Vec3 = readonly [number, number, number];

/** Eigenfrequency of mode (nx, ny, nz) of a rigid-walled box: (c/2)√Σ(n_i/L_i)². */
export function modeFrequency(n: Vec3, L: Vec3, c: number): number {
  return (c / 2) * Math.hypot(n[0] / L[0], n[1] / L[1], n[2] / L[2]);
}

export interface Mode {
  n: Vec3;
  f: number;
}

/** All modes below fmax, sorted by frequency (the (0,0,0) mode excluded). */
export function listModes(L: Vec3, fmax: number, c: number): Mode[] {
  const out: Mode[] = [];
  const m = L.map((Li) => Math.floor((2 * fmax * Li) / c)) as unknown as Vec3;
  for (let i = 0; i <= m[0]; i++)
    for (let j = 0; j <= m[1]; j++)
      for (let k = 0; k <= m[2]; k++) {
        if (i + j + k === 0) continue;
        const f = modeFrequency([i, j, k], L, c);
        if (f <= fmax) out.push({ n: [i, j, k], f });
      }
  return out.sort((a, b) => a.f - b.f);
}

/**
 * Asymptotic number of modes below f (Weyl, with the surface and edge corrections of
 * Bolt and Maa): N ≈ 4πVf³/(3c³) + πSf²/(4c²) + L′f/(8c), L′ = 4(Lx + Ly + Lz).
 * TODO-VERIFY: exact form of the corrections (Kuttruff, Room Acoustics).
 */
export function weylCount(f: number, L: Vec3, c: number): number {
  const V = L[0] * L[1] * L[2];
  const S = 2 * (L[0] * L[1] + L[1] * L[2] + L[0] * L[2]);
  const Lp = 4 * (L[0] + L[1] + L[2]);
  return (
    (4 * Math.PI * V * f ** 3) / (3 * c ** 3) +
    (Math.PI * S * f ** 2) / (4 * c ** 2) +
    (Lp * f) / (8 * c)
  );
}

/** Schroeder frequency 2000 √(T/V) (Hz, T in s, V in m³): above it, modes overlap. */
export const schroederFrequency = (T: number, V: number): number => 2000 * Math.sqrt(T / V);

const shape = (n: Vec3, L: Vec3, p: Vec3): number =>
  Math.cos((n[0] * Math.PI * p[0]) / L[0]) *
  Math.cos((n[1] * Math.PI * p[1]) / L[1]) *
  Math.cos((n[2] * Math.PI * p[2]) / L[2]);

/** Λ = ∏ ε_i, ε = 1 for n_i = 0 and ½ otherwise: ∫ψ² dV = VΛ. */
const lambda = (n: Vec3): number => (n[0] ? 0.5 : 1) * (n[1] ? 0.5 : 1) * (n[2] ? 0.5 : 1);

/**
 * Pressure at r due to a point volume source at s (modal sum), divided by the free-field
 * pressure at 1 m, ρω Q/(4π): p/p₁ = 4π Σ ψ(s)ψ(r) / (VΛ (k_m² − k² − 2iδk/c)).
 * δ = 3 ln 10 / T (energy decays by 60 dB in T). The (0,0,0) mode is included.
 */
export function modalTransfer(
  f: number,
  L: Vec3,
  s: Vec3,
  r: Vec3,
  T: number,
  c: number,
  modes: readonly Mode[],
): Complex {
  const k = (2 * Math.PI * f) / c;
  const delta = (3 * Math.log(10)) / T;
  const V = L[0] * L[1] * L[2];
  let sum: Complex = C(0);
  const all: readonly Mode[] = [{ n: [0, 0, 0], f: 0 }, ...modes];
  for (const m of all) {
    const km = (2 * Math.PI * m.f) / c;
    const num = (4 * Math.PI * shape(m.n, L, s) * shape(m.n, L, r)) / (V * lambda(m.n));
    sum = add(sum, div(C(num), C(km * km - k * k, (-2 * delta * k) / c)));
  }
  return scale(sum, 1);
}

/** Mean free path 4V/S. */
export const meanFreePath = (V: number, S: number): number => (4 * V) / S;

/** 24 ln 10 / c (≈ 0.161 s/m at 343 m/s): the constant in Sabine's formula. */
export const sabineConstant = (c: number): number => (24 * Math.log(10)) / c;

/** Reverberation time (s): Sabine, T = 0.161 V/(S α). */
export const sabineT = (V: number, S: number, alpha: number, c: number): number =>
  (sabineConstant(c) * V) / (S * alpha);

/** Reverberation time (s): Eyring, T = 0.161 V/(−S ln(1 − α)). */
export const eyringT = (V: number, S: number, alpha: number, c: number): number =>
  (sabineConstant(c) * V) / (-S * Math.log(1 - alpha));

export interface Image {
  /** distance from image to receiver (m) */
  R: number;
  /** number of wall reflections */
  order: number;
  /** position */
  p: Vec3;
}

/**
 * Image sources of a shoebox up to distance Rmax from the receiver. Along each axis the
 * images sit at 2nL + s (2|n| reflections) and 2nL − s (|2n − 1| reflections).
 * For a 2-D room pass Lz = Infinity (no images along z).
 */
export function imageSources(L: Vec3, s: Vec3, r: Vec3, Rmax: number): Image[] {
  const axis = (Li: number, si: number, ri: number) => {
    if (!Number.isFinite(Li)) return [{ x: si, o: 0 }];
    const out: { x: number; o: number }[] = [];
    const nmax = Math.ceil(Rmax / (2 * Li)) + 1;
    for (let n = -nmax; n <= nmax; n++) {
      for (const [x, o] of [
        [2 * n * Li + si, Math.abs(2 * n)],
        [2 * n * Li - si, Math.abs(2 * n - 1)],
      ] as const)
        if (Math.abs(x - ri) <= Rmax) out.push({ x, o });
    }
    return out;
  };
  const X = axis(L[0], s[0], r[0]);
  const Y = axis(L[1], s[1], r[1]);
  const Z = axis(L[2], s[2], r[2]);
  const out: Image[] = [];
  for (const a of X)
    for (const b of Y)
      for (const d of Z) {
        const R = Math.hypot(a.x - r[0], b.x - r[1], d.x - r[2]);
        if (R <= Rmax) out.push({ R, order: a.o + b.o + d.o, p: [a.x, b.x, d.x] });
      }
  return out.sort((u, v) => u.R - v.R);
}

/**
 * Energy echogram from image sources: energy (relative to the direct sound at 1 m) per
 * time bin of width dt, each image weighted by (1 − α)^order / R².
 */
export function echogram(
  L: Vec3,
  s: Vec3,
  r: Vec3,
  alpha: number,
  c: number,
  tmax: number,
  dt: number,
): Float64Array {
  const bins = new Float64Array(Math.ceil(tmax / dt));
  const Rmax = c * tmax;
  const g = 1 - alpha;
  // Same lattice as imageSources, without building and sorting objects (it can hold 10⁵+ images).
  const axis = (Li: number, si: number, ri: number) => {
    const xs: number[] = [];
    const os: number[] = [];
    const nmax = Math.ceil(Rmax / (2 * Li)) + 1;
    for (let n = -nmax; n <= nmax; n++) {
      const a1 = 2 * n * Li + si;
      const a2 = 2 * n * Li - si;
      if (Math.abs(a1 - ri) <= Rmax) {
        xs.push(a1 - ri);
        os.push(Math.abs(2 * n));
      }
      if (Math.abs(a2 - ri) <= Rmax) {
        xs.push(a2 - ri);
        os.push(Math.abs(2 * n - 1));
      }
    }
    return { xs, os };
  };
  const X = axis(L[0], s[0], r[0]);
  const Y = axis(L[1], s[1], r[1]);
  const Z = axis(L[2], s[2], r[2]);
  const pow = Array.from({ length: X.os.length + Y.os.length + Z.os.length + 3 }, (_, n) => g ** n);
  for (let i = 0; i < X.xs.length; i++) {
    const x2 = X.xs[i]! ** 2;
    for (let j = 0; j < Y.xs.length; j++) {
      const xy2 = x2 + Y.xs[j]! ** 2;
      if (xy2 > Rmax * Rmax) continue;
      const oxy = X.os[i]! + Y.os[j]!;
      for (let k = 0; k < Z.xs.length; k++) {
        const R2 = xy2 + Z.xs[k]! ** 2;
        if (R2 > Rmax * Rmax) continue;
        const b = Math.floor(Math.sqrt(R2) / c / dt);
        if (b < bins.length) bins[b] = bins[b]! + pow[oxy + Z.os[k]!]! / R2;
      }
    }
  }
  return bins;
}

/** Reverberation time from a least-squares fit of 10 log₁₀ E(t) between t0 and t1. */
export function fitDecay(bins: Float64Array, dt: number, t0: number, t1: number): number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let b = Math.floor(t0 / dt); b < Math.min(bins.length, Math.floor(t1 / dt)); b++) {
    if (bins[b]! <= 0) continue;
    xs.push((b + 0.5) * dt);
    ys.push(10 * Math.log10(bins[b]!));
  }
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i]! - my);
    den += (x - mx) ** 2;
  });
  return -60 / (num / den);
}
