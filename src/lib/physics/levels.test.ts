import { describe, expect, it } from 'vitest';
import { P_ATM } from './constants';
import { pressureFromSpl, splFromPressure, sumCoherentInPhase, sumIncoherent } from './levels';

describe('levels', () => {
  it('1 Pa rms ≈ 93.98 dB (tol. 0.01 dB)', () => {
    expect(splFromPressure(1)).toBeCloseTo(93.979, 2);
  });
  it('round-trips (rel. tol. 1e-12)', () => {
    for (const L of [0, 60, 120, 194])
      expect(splFromPressure(pressureFromSpl(L))).toBeCloseTo(L, 10);
  });
  it('p_rms = 1 atm at ≈ 194.1 dB: the ceiling of an undistorted sinusoid in air', () => {
    expect(splFromPressure(P_ATM)).toBeCloseTo(194.09, 1);
  });
  it('two equal incoherent sources: +10 log10 2 ≈ +3.01 dB', () => {
    expect(sumIncoherent([80, 80]) - 80).toBeCloseTo(10 * Math.log10(2), 12);
  });
  it('two equal in-phase coherent sources: +20 log10 2 ≈ +6.02 dB', () => {
    expect(sumCoherentInPhase([80, 80]) - 80).toBeCloseTo(20 * Math.log10(2), 12);
  });
  it('N incoherent sources add 10 log10 N', () => {
    expect(sumIncoherent(Array(10).fill(70))).toBeCloseTo(80, 10);
  });
});
