/**
 * Helmholtz resonator (chapter 3): a plug of air in the neck (mass) on the air of the
 * cavity (spring). All dimensions small compared with the wavelength.
 *   mass   m = ρ₀ S L′            (L′ = neck length plus end corrections)
 *   spring K = ρ₀ c₀² S² / V       (compressing V by a plug displacement ξ: ΔV = Sξ)
 *   ω₀ = √(K/m) = c₀ √(S/(V L′))
 */
import { END_CORRECTION } from './tubes';

export interface Resonator {
  /** Cavity volume (m³). */
  readonly V: number;
  /** Neck radius (m). */
  readonly a: number;
  /** Physical neck length (m). */
  readonly L: number;
}

/** Effective neck length: inner end flanged by the cavity wall, outer end unflanged. */
export const effectiveLength = (r: Resonator, withCorrection = true): number =>
  r.L + (withCorrection ? (END_CORRECTION.flanged + END_CORRECTION.unflanged) * r.a : 0);

export const neckArea = (r: Resonator): number => Math.PI * r.a * r.a;

/** Stiffness of the cavity seen by the plug, K = ρ₀c₀²S²/V (N/m). */
export const cavityStiffness = (r: Resonator, rho: number, c: number): number =>
  (rho * c * c * neckArea(r) ** 2) / r.V;

/** Mass of the air plug, m = ρ₀ S L′ (kg). */
export const plugMass = (r: Resonator, rho: number, withCorrection = true): number =>
  rho * neckArea(r) * effectiveLength(r, withCorrection);

/** Lumped resonance frequency f₀ = (c₀/2π) √(S/(V L′)) (Hz). */
export function helmholtzFrequency(r: Resonator, c: number, withCorrection = true): number {
  return (c / (2 * Math.PI)) * Math.sqrt(neckArea(r) / (r.V * effectiveLength(r, withCorrection)));
}

/**
 * Distributed check: neck = tube of length L′ and area S, cavity = closed tube of
 * length Lc and area Sc (volume V = Sc Lc), outer end pressure-release. Resonance when
 * (1/Sc) cot(k Lc) = (1/S) tan(k L′). Returns the lowest root (Hz) by bisection.
 */
export function distributedFrequency(
  r: Resonator,
  cavityLength: number,
  c: number,
  withCorrection = true,
): number {
  const S = neckArea(r);
  const Sc = r.V / cavityLength;
  const Lp = effectiveLength(r, withCorrection);
  const g = (f: number) => {
    const k = (2 * Math.PI * f) / c;
    return 1 / (Sc * Math.tan(k * cavityLength)) - Math.tan(k * Lp) / S;
  };
  // g decreases from +∞; first root below the first pole of either tangent.
  let lo = 1e-3;
  let hi = Math.min(c / (4 * cavityLength), c / (4 * Lp)) * 0.999999;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
