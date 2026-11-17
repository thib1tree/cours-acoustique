import { besselJ0, besselJ1 } from './special';
/**
 * Two-dimensional hard-walled duct of width b (chapter 3). Transverse modes
 * cos(mπy/b); axial wavenumber k_x = √(k² − (mπ/b)²). Below the cut-off frequency
 * f_c = m c/(2b), k_x is imaginary: the mode is evanescent.
 * A propagating mode is two plane waves crossing at ±θ, sin θ = f_c/f.
 */
export const cutoffFrequency = (m: number, b: number, c: number): number => (m * c) / (2 * b);

/** Axial wavenumber (rad/m): real when propagating, returned as {re, im} otherwise. */
export function axialWavenumber(
  f: number,
  m: number,
  b: number,
  c: number,
): { re: number; im: number } {
  const k = (2 * Math.PI * f) / c;
  const ky = (m * Math.PI) / b;
  const d = k * k - ky * ky;
  return d >= 0 ? { re: Math.sqrt(d), im: 0 } : { re: 0, im: Math.sqrt(-d) };
}

/** Phase and group velocities of a propagating mode (f > f_c). */
export function modeVelocities(f: number, fc: number, c: number): { phase: number; group: number } {
  const r = Math.sqrt(1 - (fc / f) ** 2);
  return { phase: c / r, group: c * r };
}

/** Angle of the two component plane waves with the duct axis, sin θ = f_c/f. */
export const planeWaveAngle = (f: number, fc: number): number | null =>
  f > fc ? Math.asin(fc / f) : null;

/**
 * First non-planar mode of a rigid circular duct of radius a: the (1,1) mode, whose cut-off
 * is set by the first zero of J₁′(x) = J₀(x) − J₁(x)/x. Returns that zero (dimensionless
 * k a at cut-off), found by bisection.
 */
export function circularCutoffKa(): number {
  const d = (x: number) => besselJ0(x) - besselJ1(x) / x;
  let lo = 1.5;
  let hi = 2.2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (d(lo) * d(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Cut-off frequency (Hz) of the first non-planar mode of a circular duct of radius a. */
export function circularCutoffFrequency(a: number, c: number): number {
  return (circularCutoffKa() * c) / (2 * Math.PI * a);
}
