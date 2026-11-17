/**
 * Surface impedance and sound absorption (chapter 2). Convention e^{−iωt}.
 * Locally reacting surface of normal specific impedance Z_s:
 *   R(θ) = (Z_s cos θ − Z₀)/(Z_s cos θ + Z₀),   α = 1 − |R|².
 */
import { type Complex, C, abs, add, div, mul, scale, sub } from './complex';

export function surfaceReflection(Zs: Complex, Z0: number, theta = 0): Complex {
  const z = scale(Zs, Math.cos(theta));
  return div(sub(z, C(Z0)), add(z, C(Z0)));
}

export function absorption(Zs: Complex, Z0: number, theta = 0): number {
  const r = abs(surfaceReflection(Zs, Z0, theta));
  return 1 - r * r;
}

/** Standing-wave ratio |P|max/|P|min = (1 + |R|)/(1 − |R|). */
export const standingWaveRatio = (R: Complex): number => (1 + abs(R)) / (1 - abs(R));

/** Absorption from a measured standing-wave ratio s: α = 1 − ((s − 1)/(s + 1))². */
export const absorptionFromSwr = (s: number): number => 1 - ((s - 1) / (s + 1)) ** 2;

/**
 * Impedance seen through a layer of thickness d (characteristic impedance Zc,
 * complex wavenumber k) backed by a rigid wall: Z = +i Zc cot(k d), velocity counted
 * positive into the surface. Check: a thin air gap (kd ≪ 1) gives Z ≈ i ρ₀c₀²/(ωd),
 * the impedance iK/ω of a spring of stiffness K = ρ₀c₀²/d per unit area.
 */
export function rigidBackedLayer(Zc: Complex, k: Complex, d: number): Complex {
  // cot(z) = i (e^{2iz} + 1)/(e^{2iz} − 1)
  const iz2: Complex = [-2 * k[1] * d, 2 * k[0] * d]; // 2 i k d
  const e: Complex = scale([Math.cos(iz2[1]), Math.sin(iz2[1])], Math.exp(iz2[0]));
  const cot = mul(C(0, 1), div(add(e, C(1)), sub(e, C(1))));
  return mul(mul(C(0, 1), Zc), cot);
}

/**
 * Thin resistive screen (flow resistance r, Pa·s/m) at distance d in front of a rigid
 * wall: Z_s = r + i Z₀ cot(k d). Terms can be switched off for the chapter's live
 * equation (resistance r, air-gap reactance).
 */
export function resistiveScreen(
  r: number,
  d: number,
  k: number,
  Z0: number,
  terms = { r: true, gap: true },
): Complex {
  const gap = terms.gap ? Z0 / Math.tan(k * d) : 0;
  return C(terms.r ? r : 0, gap);
}

/**
 * Delany & Bazley (1970) empirical model of fibrous materials, flow resistivity σ
 * (Pa·s/m²), X = ρ₀ f/σ, valid for 0.01 < X < 1. Written for e^{−iωt} (the paper's
 * imaginary parts change sign).
 * TODO-VERIFY: coefficients (Delany & Bazley, Applied Acoustics 3, 105–116, 1970).
 */
export function delanyBazley(
  f: number,
  sigma: number,
  rho0: number,
  c0: number,
): { Zc: Complex; k: Complex; X: number } {
  const X = (rho0 * f) / sigma;
  const Zc = scale(C(1 + 0.0571 * X ** -0.754, 0.087 * X ** -0.732), rho0 * c0);
  const k = scale(C(1 + 0.0978 * X ** -0.7, 0.189 * X ** -0.595), (2 * Math.PI * f) / c0);
  return { Zc, k, X };
}
