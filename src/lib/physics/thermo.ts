/**
 * Thermodynamics of a sound wave in a gas: why compressions are adiabatic.
 *
 * Heat diffuses over a length δ = √(2D/ω) during one period (D: thermal diffusivity).
 * The compression is adiabatic when δ ≪ λ, i.e. when heat has no time to flow from
 * compressions to rarefactions half a wavelength away. Since δ/λ ∝ √f, the adiabatic
 * hypothesis holds better at LOW frequency; it would fail around f* = c₀²/(4πD), a
 * frequency (~GHz in air) where the continuum hypothesis itself breaks down.
 */

/**
 * Thermal diffusivity of air at 20 °C and 1 atm, D = κ/(ρ c_p) ≈ 2.2 × 10⁻⁵ m²/s.
 * TODO-VERIFY: κ ≈ 0.0257 W/(m·K), c_p ≈ 1005 J/(kg·K), ρ ≈ 1.204 kg/m³ (engineering tables).
 */
export const AIR_THERMAL_DIFFUSIVITY = 0.0257 / (1.204 * 1005);

/** Thermal diffusion length over one period, √(2D/ω) (m). */
export const thermalDiffusionLength = (D: number, omega: number): number =>
  Math.sqrt((2 * D) / omega);

/** Ratio of the diffusion length to the wavelength (adiabatic when ≪ 1). */
export function diffusionToWavelength(D: number, c0: number, f: number): number {
  const omega = 2 * Math.PI * f;
  return thermalDiffusionLength(D, omega) / (c0 / f);
}

/** Frequency at which √(2D/ω) = c₀/ω, i.e. f* = c₀²/(4πD). */
export const isothermalCrossover = (D: number, c0: number): number => (c0 * c0) / (4 * Math.PI * D);

/** Adiabatic temperature fluctuation T'/T₀ = ((γ − 1)/γ) p/p₀. */
export const adiabaticTemperatureRatio = (gamma: number, p: number, p0: number): number =>
  ((gamma - 1) / gamma) * (p / p0);
