/**
 * Plane waves at a plane interface between two fluids (chapter 2).
 * Convention e^{−iωt}. Medium 1 (x < 0) carries the incident and reflected waves,
 * medium 2 (x > 0) the transmitted wave. Boundary conditions at x = 0:
 * continuity of pressure (no massless membrane can sustain a pressure jump) and of
 * normal particle velocity (the fluids neither separate nor interpenetrate).
 */
import { type Complex, C, abs, add, div, mul, scale, sqrtC, sub } from './complex';

/** Pressure reflection coefficient at normal incidence, R = (Z₂ − Z₁)/(Z₂ + Z₁). */
export const reflection = (Z1: number, Z2: number): number => (Z2 - Z1) / (Z2 + Z1);

/** Pressure transmission coefficient at normal incidence, T = 1 + R = 2Z₂/(Z₂ + Z₁). */
export const transmission = (Z1: number, Z2: number): number => (2 * Z2) / (Z2 + Z1);

/** Fraction of the incident intensity transmitted, τ = 4Z₁Z₂/(Z₁ + Z₂)² = T² Z₁/Z₂. */
export const intensityTransmission = (Z1: number, Z2: number): number =>
  (4 * Z1 * Z2) / (Z1 + Z2) ** 2;

export interface Fluid {
  readonly rho: number;
  readonly c: number;
}

export interface Oblique {
  /** Complex pressure reflection coefficient. */
  readonly R: Complex;
  /** Complex pressure transmission coefficient (T = 1 + R). */
  readonly T: Complex;
  /** Transmission angle (rad), or null beyond the critical angle. */
  readonly thetaT: number | null;
  /** Fraction of incident power crossing the interface (1 − |R|²). */
  readonly tau: number;
  /** Normal wavenumber in medium 2 divided by k₂ (complex: evanescent when imaginary). */
  readonly cosT: Complex;
}

/**
 * Oblique incidence at angle θ₁ (from the normal). The trace wavenumber along the
 * interface, k₁ sin θ₁, must be the same on both sides (Snell–Descartes):
 * sin θ₂ = (c₂/c₁) sin θ₁. Beyond the critical angle, cos θ₂ is imaginary: the field
 * in medium 2 decays away from the interface (evanescent wave) and |R| = 1.
 * Normal specific impedances: Zₙ = Z/cos θ.
 */
export function oblique(m1: Fluid, m2: Fluid, theta1: number): Oblique {
  const s2 = (m2.c / m1.c) * Math.sin(theta1);
  // cos θ₂ = √(1 − sin²θ₂), choosing the root that decays into medium 2 (Im > 0).
  let cosT = sqrtC(C(1 - s2 * s2));
  if (cosT[1] < 0) cosT = scale(cosT, -1);
  const Z1n: Complex = C((m1.rho * m1.c) / Math.cos(theta1));
  const Z2n = div(C(m2.rho * m2.c), cosT);
  const R = div(sub(Z2n, Z1n), add(Z2n, Z1n));
  const T = add(C(1), R);
  const a = abs(R);
  return { R, T, cosT, thetaT: s2 < 1 ? Math.asin(s2) : null, tau: Math.max(0, 1 - a * a) };
}

/** Critical angle (rad) when c₂ > c₁, else null. */
export const criticalAngle = (c1: number, c2: number): number | null =>
  c2 > c1 ? Math.asin(c1 / c2) : null;

/**
 * Angle of intromission (rad): total transmission, Z₂/cos θ₂ = Z₁/cos θ₁. Exists only
 * for some combinations of densities and sound speeds; null otherwise.
 */
export function intromissionAngle(m1: Fluid, m2: Fluid): number | null {
  const r = m2.rho / m1.rho;
  const n = m1.c / m2.c;
  // From Z₂² cos²θ₁ = Z₁² cos²θ₂ with Snell: sin²θ₁ = (r² − n²)/(r² − 1).
  const s2 = (r * r - n * n) / (r * r - 1);
  if (!(s2 > 0 && s2 < 1)) return null;
  return Math.asin(Math.sqrt(s2));
}

/**
 * Time-domain pulse at normal incidence (real impedances): exact piecewise solution.
 * Incident profile f(x − c₁t), reflected R f(−x − c₁t), transmitted T f(c₁x/c₂ − c₁t).
 */
export function pulseAtInterface(
  f: (s: number) => number,
  m1: Fluid,
  m2: Fluid,
): { p: (x: number, t: number) => number; v: (x: number, t: number) => number } {
  const Z1 = m1.rho * m1.c;
  const Z2 = m2.rho * m2.c;
  const R = reflection(Z1, Z2);
  const T = transmission(Z1, Z2);
  return {
    p: (x, t) =>
      x < 0 ? f(x - m1.c * t) + R * f(-x - m1.c * t) : T * f((m1.c / m2.c) * x - m1.c * t),
    v: (x, t) =>
      x < 0
        ? (f(x - m1.c * t) - R * f(-x - m1.c * t)) / Z1
        : (T * f((m1.c / m2.c) * x - m1.c * t)) / Z2,
  };
}

/**
 * Power transmission through a fluid layer (impedance Z_l, wavenumber k_l, thickness d)
 * separating two half-spaces of the same impedance Z, at normal incidence:
 * τ = 1 / [cos²(k_l d) + ¼ (Z/Z_l + Z_l/Z)² sin²(k_l d)].
 */
export function layerTransmission(Z: number, Zl: number, kl: number, d: number): number {
  const c = Math.cos(kl * d);
  const s = Math.sin(kl * d);
  const m = Z / Zl + Zl / Z;
  return 1 / (c * c + 0.25 * m * m * s * s);
}

/** Complex amplitude helper: e^{i(kx x + ky y)}. */
export const planeWave = (kx: Complex, ky: number, x: number, y: number): Complex => {
  // e^{i kx x} with complex kx = a + ib → e^{−b x} e^{i a x}
  const phase = kx[0] * x + ky * y;
  return scale([Math.cos(phase), Math.sin(phase)], Math.exp(-kx[1] * x));
};

export { mul };
