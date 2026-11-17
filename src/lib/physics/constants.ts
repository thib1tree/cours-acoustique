/**
 * Physical constants used across the course.
 *
 * Exact values are SI-defining constants (2019 SI redefinition). Others cite their source.
 * Never copy a derived quantity here: derive it in the relevant module so it stays testable.
 */

/** Avogadro constant, mol⁻¹ (exact, SI 2019). */
export const N_A = 6.022_140_76e23;

/** Boltzmann constant, J/K (exact, SI 2019). */
export const K_B = 1.380_649e-23;

/** Molar gas constant R = N_A·k_B, J/(mol·K) (exact by construction). */
export const R_GAS = N_A * K_B;

/** Standard atmosphere, Pa (exact by definition). */
export const P_ATM = 101_325;

/** 0 °C in kelvin (exact by definition). */
export const T_ZERO_C = 273.15;

/** Reference pressure for sound pressure level in air, Pa (ISO 1683). */
export const P_REF_AIR = 20e-6;

/** Reference intensity for intensity level, W/m² (ISO 1683). */
export const I_REF = 1e-12;
