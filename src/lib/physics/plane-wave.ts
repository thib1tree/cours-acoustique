/**
 * Harmonic plane waves in a lossless fluid, convention e^{−iωt}.
 *
 * Hypotheses: linear acoustics (|p| ≪ ρ₀c₀²), perfect fluid, plane wave along x.
 * Incident wave of complex amplitude A travelling towards +x plus a reflected wave of
 * complex amplitude R·A travelling towards −x:
 *   P(x) = A (e^{ikx} + R e^{−ikx}),
 *   V(x) = A/(ρ₀c₀) (e^{ikx} − R e^{−ikx})   (from −iωρ₀V = −dP/dx).
 * R = 0 is a progressive wave, |R| = 1 a pure standing wave.
 */
import { type Complex, add, cis, conj, mul, re, scale } from './complex';

export interface Fluid {
  /** Density at rest, kg/m³. */
  readonly rho0: number;
  /** Sound speed, m/s. */
  readonly c0: number;
}

export const impedance = (f: Fluid): number => f.rho0 * f.c0;

/** Particle velocity of a progressive plane wave: v = ±p/(ρ₀c₀). */
export const progressiveVelocity = (p: number, f: Fluid, direction: 1 | -1 = 1): number =>
  (direction * p) / impedance(f);

/** Peak particle displacement of a harmonic progressive wave of peak pressure P. */
export const displacementAmplitude = (P: number, f: Fluid, omega: number): number =>
  P / (impedance(f) * omega);

/** Kinetic energy density ½ρ₀v² (J/m³). */
export const kineticEnergyDensity = (v: number, f: Fluid): number => 0.5 * f.rho0 * v * v;

/** Potential (compression) energy density p²/(2ρ₀c₀²) (J/m³). */
export const potentialEnergyDensity = (p: number, f: Fluid): number =>
  (p * p) / (2 * f.rho0 * f.c0 * f.c0);

/** Time-averaged intensity of a progressive harmonic wave of peak pressure P: P²/(2ρ₀c₀). */
export const meanIntensity = (P: number, f: Fluid): number => (P * P) / (2 * impedance(f));

export interface StandingWaveField {
  readonly P: (x: number) => Complex;
  readonly V: (x: number) => Complex;
  /** Instantaneous pressure Re{P e^{−iωt}}. */
  readonly p: (x: number, t: number) => number;
  /** Instantaneous velocity Re{V e^{−iωt}}. */
  readonly v: (x: number, t: number) => number;
  /** Active (time-averaged) intensity ½ Re{P V*}. */
  readonly activeIntensity: (x: number) => number;
}

/** Incident wave of amplitude A plus reflected wave R·A. */
export function incidentPlusReflected(
  A: Complex,
  R: Complex,
  k: number,
  omega: number,
  f: Fluid,
): StandingWaveField {
  const Z = impedance(f);
  const P = (x: number) => mul(A, add(cis(k * x), mul(R, cis(-k * x))));
  const V = (x: number) => scale(mul(A, add(cis(k * x), scale(mul(R, cis(-k * x)), -1))), 1 / Z);
  return {
    P,
    V,
    p: (x, t) => re(mul(P(x), cis(-omega * t))),
    v: (x, t) => re(mul(V(x), cis(-omega * t))),
    activeIntensity: (x) => 0.5 * re(mul(P(x), conj(V(x)))),
  };
}
