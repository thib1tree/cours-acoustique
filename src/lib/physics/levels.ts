/**
 * Sound levels in decibels.
 *
 * L_p = 20 log10(p_rms / p_ref), p_ref = 20 µPa in air (ISO 1683).
 * Levels of incoherent sources add in power; coherent in-phase sources add in amplitude.
 */
import { I_REF, P_REF_AIR } from './constants';

export const splFromPressure = (pRms: number, pRef = P_REF_AIR): number =>
  20 * Math.log10(pRms / pRef);

export const pressureFromSpl = (L: number, pRef = P_REF_AIR): number => pRef * 10 ** (L / 20);

export const intensityLevel = (I: number): number => 10 * Math.log10(I / I_REF);

export const intensityFromLevel = (L: number): number => I_REF * 10 ** (L / 10);

/** RMS value of a sinusoid of peak amplitude `peak`. */
export const rmsOfSine = (peak: number): number => peak / Math.SQRT2;

/** Total level of mutually incoherent sources: powers add. */
export function sumIncoherent(levels: readonly number[]): number {
  return 10 * Math.log10(levels.reduce((s, L) => s + 10 ** (L / 10), 0));
}

/** Total level of coherent sources received exactly in phase: pressures add. */
export function sumCoherentInPhase(levels: readonly number[]): number {
  return 20 * Math.log10(levels.reduce((s, L) => s + 10 ** (L / 20), 0));
}
