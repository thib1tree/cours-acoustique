/**
 * Progressive plane wave of finite amplitude (lossless "simple wave").
 *
 * Each point of the waveform travels at c₀ + βu, with β = 1 + B/(2A):
 *  - the "1" is convection: the fluid carries the crest forward;
 *  - B/(2A) is the nonlinearity of the state law; for an ideal gas B/A = γ − 1,
 *    since compressed gas is hotter and stiffer.
 * For a source velocity u(0, t) = u₀ sin(ωt), the Poisson (Earnshaw) solution to first
 * order in u/c₀ reads u = u₀ sin(φ + σ u/u₀) with φ = ω(t − x/c₀) and σ = x/x̄,
 * where x̄ = c₀²/(β ω u₀) = 1/(β ε k) is the shock-formation distance (ε = u₀/c₀).
 * Valid for σ < 1; beyond, the solution is multivalued and a shock has formed.
 * Hypotheses: plane wave, no dissipation, ε ≪ 1.
 */

export interface NonlinearityTerms {
  /** Include the convective term (the "1" in β). */
  readonly convective: boolean;
  /** Include the state-law nonlinearity B/2A. */
  readonly stateLaw: boolean;
}

/** β for an ideal gas of heat-capacity ratio γ, with optional terms switched off. */
export function betaIdealGas(
  gamma: number,
  terms: NonlinearityTerms = { convective: true, stateLaw: true },
): number {
  return (terms.convective ? 1 : 0) + (terms.stateLaw ? (gamma - 1) / 2 : 0);
}

/** Shock-formation distance x̄ = c₀²/(βωu₀) (m). Infinite when β = 0. */
export function shockDistance(c0: number, beta: number, omega: number, u0: number): number {
  if (beta === 0 || u0 === 0) return Infinity;
  return (c0 * c0) / (beta * omega * Math.abs(u0));
}

/**
 * Waveform u/u₀ as a function of the retarded phase φ at normalized distance σ = x/x̄ < 1.
 * Solved by Newton iteration on w = sin(φ + σw), which has a unique root for σ < 1.
 */
export function poissonWaveform(phi: number, sigma: number): number {
  if (sigma >= 1) throw new RangeError('σ ≥ 1: a shock has formed, the solution is multivalued');
  let w = Math.sin(phi);
  for (let it = 0; it < 50; it++) {
    const arg = phi + sigma * w;
    const F = w - Math.sin(arg);
    const dF = 1 - sigma * Math.cos(arg);
    const dw = F / dF;
    w -= dw;
    if (Math.abs(dw) < 1e-14) break;
  }
  return w;
}

/** Slope amplification at the zero crossing: d(u/u₀)/dφ = 1/(1 − σ). */
export const zeroCrossingSlope = (sigma: number): number => 1 / (1 - sigma);
