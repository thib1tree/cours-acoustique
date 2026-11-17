/**
 * Cylindrical tubes (chapter 3). Plane waves only (ka ≪ 1.84, below the first
 * transverse cut-off), lossless walls. Convention e^{−iωt}: a mass reacts as −iωm,
 * a spring as +iK/ω (see notations).
 *
 * Impedances here are specific (p/v) and normalized by the characteristic impedance
 * Z_c = ρ₀c₀ of the air in the tube.
 */
import { type Complex, C, add, div, mul, scale, sub } from './complex';

/** Ideal resonances: open–open or closed–closed n c/(2L); closed–open (2n−1) c/(4L). */
export function idealResonances(
  L: number,
  c: number,
  ends: 'open-open' | 'closed-open',
  count: number,
): number[] {
  return Array.from({ length: count }, (_, i) =>
    ends === 'open-open' ? ((i + 1) * c) / (2 * L) : ((2 * i + 1) * c) / (4 * L),
  );
}

/** End corrections δ/a: unflanged pipe (Levine & Schwinger) and flanged (infinite baffle). */
export const END_CORRECTION = { unflanged: 0.6133, flanged: 8 / (3 * Math.PI) } as const;

/**
 * Normalized radiation impedance of an unflanged open end, low-frequency expansion
 * (ka ≪ 1): Z_r/Z_c = (ka)²/4 − i 0.6133 ka. The real part radiates energy away
 * (resistance), the imaginary part is the mass of air moving with the open end.
 * Terms can be switched off for the chapter's live equation.
 * TODO-VERIFY: low-ka coefficients (Levine & Schwinger 1948: resistance (ka)²/4, δ = 0.6133 a).
 */
export function radiationImpedance(ka: number, terms = { resistance: true, mass: true }): Complex {
  return C(terms.resistance ? (ka * ka) / 4 : 0, terms.mass ? -END_CORRECTION.unflanged * ka : 0);
}

/**
 * Impedance seen at x = 0 of a tube of length L terminated at x = L by Z_L (normalized):
 * Z_in = (Z_L cos kL − i sin kL)/(cos kL − i Z_L sin kL).
 * Limits: closed end (Z_L → ∞) → i cot kL (a spring when kL ≪ 1); ideal open end
 * (Z_L = 0) → −i tan kL (a mass when kL ≪ 1).
 */
export function inputImpedance(ZL: Complex, kL: number): Complex {
  const c = Math.cos(kL);
  const s = Math.sin(kL);
  const num = sub(scale(ZL, c), C(0, s));
  const den = sub(C(c), mul(C(0, s), ZL));
  return div(num, den);
}

/** Input impedance of a tube open at its far end (with radiation), normalized. */
export function openTubeInput(
  f: number,
  L: number,
  a: number,
  c: number,
  terms = { resistance: true, mass: true },
): Complex {
  const k = (2 * Math.PI * f) / c;
  return inputImpedance(radiationImpedance(k * a, terms), k * L);
}

/** Local extrema of a sampled function (maxima if sign = +1, minima if −1). */
export function extrema(xs: readonly number[], ys: readonly number[], sign: 1 | -1): number[] {
  const out: number[] = [];
  for (let i = 1; i < ys.length - 1; i++) {
    const a = sign * ys[i - 1]!;
    const b = sign * ys[i]!;
    const c = sign * ys[i + 1]!;
    if (b > a && b >= c) {
      // Parabolic refinement of the peak position.
      const den = a - 2 * b + c;
      const shift = den !== 0 ? (0.5 * (a - c)) / den : 0;
      out.push(xs[i]! + shift * (xs[i + 1]! - xs[i]!));
    }
  }
  return out;
}

export { add };

/**
 * Golden-section search for the extremum of a unimodal function on [lo, hi]
 * (sign = 1 for a maximum, −1 for a minimum). Used to place markers on resonances whose
 * relative width (~ (ka)²) is far below any plotting grid.
 */
export function refineExtremum(
  fn: (x: number) => number,
  lo: number,
  hi: number,
  sign: 1 | -1,
  iterations = 80,
): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = sign * fn(c);
  let fd = sign * fn(d);
  for (let i = 0; i < iterations; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = sign * fn(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = sign * fn(d);
    }
  }
  return (a + b) / 2;
}
