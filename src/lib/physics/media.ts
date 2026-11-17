/**
 * Acoustic properties of media, derived from first principles whenever possible.
 *
 * Model: ideal gas, adiabatic compression. Hypotheses are stated per function.
 */
import { P_ATM, R_GAS, T_ZERO_C } from './constants';

export interface IdealGas {
  readonly name: string;
  /** Molar mass, kg/mol. */
  readonly molarMass: number;
  /** Heat capacity ratio γ = c_p / c_v (dimensionless). */
  readonly gamma: number;
}

/**
 * Dry air. M = 28.9647 g/mol.
 * TODO-VERIFY: molar mass of dry air (commonly 28.9647 g/mol, e.g. U.S. Standard Atmosphere 1976).
 * γ = 1.4 is the diatomic ideal-gas value (7/5); real dry air at 20 °C is 1.400 to 3 digits.
 */
export const AIR: IdealGas = { name: 'air', molarMass: 28.9647e-3, gamma: 1.4 };

/**
 * Helium-4. Monatomic ideal gas: γ = 5/3 exactly in the ideal-gas model.
 * Molar mass 4.002602 g/mol (IUPAC standard atomic weight).
 */
export const HELIUM: IdealGas = { name: 'helium', molarMass: 4.002_602e-3, gamma: 5 / 3 };

/** Convert degrees Celsius to kelvin. */
export const celsiusToKelvin = (tC: number): number => tC + T_ZERO_C;

/** Ideal-gas density ρ₀ = p₀M/(RT), kg/m³. */
export function gasDensity(gas: IdealGas, T: number, p0: number = P_ATM): number {
  return (p0 * gas.molarMass) / (R_GAS * T);
}

/**
 * Adiabatic bulk modulus of an ideal gas, K_s = γ p₀ (Pa).
 * Hypothesis: compression too fast for heat to diffuse over half a wavelength (Laplace).
 */
export const adiabaticBulkModulus = (gas: IdealGas, p0: number = P_ATM): number => gas.gamma * p0;

/**
 * Isothermal bulk modulus of an ideal gas, K_T = p₀ (Pa).
 * Hypothesis: heat exchange is instantaneous (Newton's assumption).
 */
export const isothermalBulkModulus = (p0: number = P_ATM): number => p0;

/** Generic Newton–Laplace celerity c = √(K/ρ) (m/s). */
export function celerityFromModulus(K: number, rho: number): number {
  if (!(K > 0) || !(rho > 0)) throw new RangeError('K and rho must be positive');
  return Math.sqrt(K / rho);
}

/**
 * Adiabatic sound speed of an ideal gas, c₀ = √(γRT/M) (m/s).
 * Independent of the static pressure p₀: both K and ρ₀ scale with p₀.
 */
export function gasSoundSpeed(gas: IdealGas, T: number): number {
  return Math.sqrt((gas.gamma * R_GAS * T) / gas.molarMass);
}

/** Isothermal ("Newton") sound speed of an ideal gas, √(RT/M) (m/s). */
export function gasIsothermalSoundSpeed(gas: IdealGas, T: number): number {
  return Math.sqrt((R_GAS * T) / gas.molarMass);
}

/** Characteristic impedance ρ₀c₀ (Pa·s/m, also written rayl). */
export function characteristicImpedance(gas: IdealGas, T: number, p0: number = P_ATM): number {
  return gasDensity(gas, T, p0) * gasSoundSpeed(gas, T);
}

/**
 * Ideal-gas mixture of two species with mole fraction x of species `a`.
 * Molar heat capacities add linearly: C_v = R/(γ−1) for each species.
 */
export function mixGases(a: IdealGas, b: IdealGas, x: number): IdealGas {
  if (x < 0 || x > 1) throw new RangeError('mole fraction must be in [0, 1]');
  const cvA = 1 / (a.gamma - 1);
  const cvB = 1 / (b.gamma - 1);
  const cv = x * cvA + (1 - x) * cvB; // in units of R
  return {
    name: `${a.name}:${x.toFixed(3)}+${b.name}`,
    molarMass: x * a.molarMass + (1 - x) * b.molarMass,
    gamma: (cv + 1) / cv,
  };
}

/** A medium described by tabulated (not derived) properties, with its source. */
export interface TabulatedMedium {
  readonly name: string;
  /** Density, kg/m³. */
  readonly rho: number;
  /** Modulus governing longitudinal waves, Pa (K for fluids, M = K + 4G/3 for solids). */
  readonly modulus: number;
  readonly modulusKind: 'bulk K' | 'P-wave M';
  readonly source: string;
  /** False until the author has checked the source. */
  readonly verified: boolean;
}

/**
 * Reference media for the stiffness/inertia chart (chapter 1a, D2).
 * Water: c₀ ≈ 1482 m/s at 20 °C. Steel: generic structural steel E ≈ 200 GPa, ν ≈ 0.30.
 */
export const TABULATED_MEDIA: readonly TabulatedMedium[] = [
  {
    name: 'eau (20 °C)',
    rho: 998.2,
    modulus: 998.2 * 1482.3 ** 2,
    modulusKind: 'bulk K',
    // TODO-VERIFY: ρ = 998.2 kg/m³ and c = 1482.3 m/s (e.g. Marczak 1997 / Del Grosso & Mader 1972).
    source: 'Marczak (1997), J. Acoust. Soc. Am. 102(5)',
    verified: false,
  },
  {
    name: 'acier',
    rho: 7850,
    modulus: (200e9 * (1 - 0.3)) / ((1 + 0.3) * (1 - 2 * 0.3)),
    modulusKind: 'P-wave M',
    // TODO-VERIFY: generic structural steel, E = 200 GPa, ν = 0.30, ρ = 7850 kg/m³.
    source: 'valeurs génériques d’un acier de construction',
    verified: false,
  },
];

/** Longitudinal wave speed in an isotropic solid, √(M/ρ) with M = E(1−ν)/((1+ν)(1−2ν)). */
export function solidLongitudinalSpeed(E: number, nu: number, rho: number): number {
  return Math.sqrt((E * (1 - nu)) / ((1 + nu) * (1 - 2 * nu) * rho));
}

/** Bar (thin rod) speed √(E/ρ), slower than the bulk longitudinal speed. */
export const barSpeed = (E: number, rho: number): number => Math.sqrt(E / rho);
