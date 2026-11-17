/**
 * Chain of N identical masses m linked by springs of stiffness K, spacing a.
 *
 * Newton on mass j:  m ü_j = K (u_{j+1} − 2u_j + u_{j−1}).
 * The bracket is the discrete second difference: as a → 0 it becomes a² ∂²u/∂x²,
 * which turns the chain into the wave equation with c = a√(K/m).
 *
 * Mapping to a fluid slab of cross-section S: m = ρ₀Sa and K = K_s S/a give
 * c = a√(K/m) = √(K_s/ρ₀) (Newton–Laplace).
 */

export interface Chain {
  readonly n: number;
  readonly m: number;
  readonly K: number;
  readonly a: number;
  /** 'fixed': u_0 = u_{N+1} = 0 ; 'periodic': ring. */
  readonly ends: 'fixed' | 'periodic';
}

export interface ChainState {
  u: Float64Array;
  v: Float64Array;
  t: number;
}

/** Continuum (long-wavelength) sound speed a√(K/m). */
export const continuumSpeed = (c: Pick<Chain, 'm' | 'K' | 'a'>): number =>
  c.a * Math.sqrt(c.K / c.m);

/** Cut-off angular frequency 2√(K/m): no wave propagates above it. */
export const cutoffOmega = (c: Pick<Chain, 'm' | 'K'>): number => 2 * Math.sqrt(c.K / c.m);

/** Lattice dispersion relation ω(k) = 2√(K/m)|sin(ka/2)|. */
export const dispersionOmega = (c: Pick<Chain, 'm' | 'K' | 'a'>, k: number): number =>
  cutoffOmega(c) * Math.abs(Math.sin((k * c.a) / 2));

export const phaseSpeed = (c: Pick<Chain, 'm' | 'K' | 'a'>, k: number): number =>
  k === 0 ? continuumSpeed(c) : dispersionOmega(c, k) / Math.abs(k);

/** Group speed dω/dk = a√(K/m) cos(ka/2). */
export const groupSpeed = (c: Pick<Chain, 'm' | 'K' | 'a'>, k: number): number =>
  continuumSpeed(c) * Math.cos((k * c.a) / 2);

/** Angular frequency of the n-th normal mode of a fixed–fixed chain (n = 1..N). */
export const fixedModeOmega = (c: Chain, mode: number): number =>
  cutoffOmega(c) * Math.sin((mode * Math.PI) / (2 * (c.n + 1)));

export function createState(c: Chain): ChainState {
  return { u: new Float64Array(c.n), v: new Float64Array(c.n), t: 0 };
}

function accelerations(c: Chain, u: Float64Array, out: Float64Array): void {
  const w2 = c.K / c.m;
  const n = c.n;
  for (let j = 0; j < n; j++) {
    const left = j > 0 ? u[j - 1]! : c.ends === 'periodic' ? u[n - 1]! : 0;
    const right = j < n - 1 ? u[j + 1]! : c.ends === 'periodic' ? u[0]! : 0;
    out[j] = w2 * (left - 2 * u[j]! + right);
  }
}

/**
 * Velocity-Verlet integration (symplectic, second order). Stable for
 * dt < 2/ω_max = √(m/K); energy error stays bounded instead of drifting.
 */
export function step(c: Chain, s: ChainState, dt: number, steps = 1): void {
  const acc = new Float64Array(c.n);
  accelerations(c, s.u, acc);
  for (let it = 0; it < steps; it++) {
    for (let j = 0; j < c.n; j++) {
      s.v[j] = s.v[j]! + 0.5 * dt * acc[j]!;
      s.u[j] = s.u[j]! + dt * s.v[j]!;
    }
    accelerations(c, s.u, acc);
    for (let j = 0; j < c.n; j++) s.v[j] = s.v[j]! + 0.5 * dt * acc[j]!;
    s.t += dt;
  }
}

/** Total mechanical energy (kinetic + springs). */
export function energy(c: Chain, s: ChainState): number {
  let e = 0;
  for (let j = 0; j < c.n; j++) e += 0.5 * c.m * s.v[j]! ** 2;
  const springs = c.ends === 'periodic' ? c.n : c.n + 1;
  for (let j = 0; j < springs; j++) {
    const left = j === 0 ? (c.ends === 'periodic' ? s.u[c.n - 1]! : 0) : s.u[j - 1]!;
    const right = j < c.n ? s.u[j]! : 0;
    e += 0.5 * c.K * (right - left) ** 2;
  }
  return e;
}
