/**
 * 1D linear acoustics, staggered-grid finite differences (Yee scheme).
 *
 *   ρ₀ ∂v/∂t = −∂p/∂x         (linearized Euler)
 *   ∂p/∂t   = −ρ₀c₀² ∂v/∂x    (continuity + adiabatic state law)
 *
 * p lives on integer nodes x_i = i·dx at integer times; v lives on half nodes x_{i+½}
 * at half times. Both updates are centred, so the scheme is second order.
 *
 * Stability (CFL): Courant number C = c₀dt/dx ≤ 1.
 * Numerical dispersion: sin(ω dt/2) = C sin(k dx/2). At C = 1 this gives ω = c₀k
 * exactly ("magic time step"): pulses translate without any deformation. For C < 1,
 * short wavelengths travel too slowly; with 10 points per wavelength and C = 0.5 the
 * phase-speed error is about 1 %.
 * Boundaries: rigid walls (v = 0) at both ends.
 */

export interface Grid1D {
  readonly n: number;
  readonly dx: number;
  readonly rho0: number;
  readonly c0: number;
  /** Courant number c₀dt/dx (0 < C ≤ 1). */
  readonly courant: number;
}

export interface Fdtd1DState {
  /** n pressures on nodes. */
  p: Float64Array;
  /** n + 1 velocities on half nodes (v[0] and v[n] are walls). */
  v: Float64Array;
  t: number;
}

export const timeStep = (g: Grid1D): number => (g.courant * g.dx) / g.c0;

export function createFdtd1D(g: Grid1D): Fdtd1DState {
  if (!(g.courant > 0 && g.courant <= 1)) throw new RangeError('CFL: need 0 < C ≤ 1');
  return { p: new Float64Array(g.n), v: new Float64Array(g.n + 1), t: 0 };
}

export function stepFdtd1D(g: Grid1D, s: Fdtd1DState, steps = 1): void {
  const dt = timeStep(g);
  const kv = dt / (g.rho0 * g.dx);
  const kp = (g.rho0 * g.c0 * g.c0 * dt) / g.dx;
  const { p, v, n } = { p: s.p, v: s.v, n: g.n };
  for (let it = 0; it < steps; it++) {
    for (let i = 1; i < n; i++) v[i] = v[i]! - kv * (p[i]! - p[i - 1]!);
    for (let i = 0; i < n; i++) p[i] = p[i]! - kp * (v[i + 1]! - v[i]!);
    s.t += dt;
  }
}

/** Numerical phase speed of the scheme for wavenumber k. */
export function numericalPhaseSpeed(g: Grid1D, k: number): number {
  const dt = timeStep(g);
  const omega = (2 / dt) * Math.asin(g.courant * Math.sin((k * g.dx) / 2));
  return omega / k;
}

/** Acoustic energy per unit area: Σ (p²/(2ρ₀c₀²) + ρ₀v²/2) dx. */
export function energy1D(g: Grid1D, s: Fdtd1DState): number {
  let e = 0;
  for (let i = 0; i < g.n; i++) e += (s.p[i]! ** 2 / (2 * g.rho0 * g.c0 ** 2)) * g.dx;
  for (let i = 0; i <= g.n; i++) e += 0.5 * g.rho0 * s.v[i]! ** 2 * g.dx;
  return e;
}
