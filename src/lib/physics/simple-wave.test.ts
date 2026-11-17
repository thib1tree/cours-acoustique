import { describe, expect, it } from 'vitest';
import { betaIdealGas, poissonWaveform, shockDistance, zeroCrossingSlope } from './simple-wave';
import { AIR, adiabaticBulkModulus, celsiusToKelvin, gasDensity, gasSoundSpeed } from './media';
import { pressureFromSpl } from './levels';

describe('finite-amplitude simple wave', () => {
  it('β = (γ+1)/2 = 1.2 for air; each term can be switched off', () => {
    expect(betaIdealGas(1.4)).toBeCloseTo(1.2, 12);
    expect(betaIdealGas(1.4, { convective: false, stateLaw: true })).toBeCloseTo(0.2, 12);
    expect(betaIdealGas(1.4, { convective: true, stateLaw: false })).toBe(1);
    expect(shockDistance(343, 0, 1, 1)).toBe(Infinity);
  });

  it('reduces to the linear waveform at σ = 0', () => {
    for (const phi of [0, 0.3, 1, 2.5])
      expect(poissonWaveform(phi, 0)).toBeCloseTo(Math.sin(phi), 14);
  });

  it('zero-crossing slope grows as 1/(1 − σ), diverging at the shock distance (rel. tol. 1e-4)', () => {
    for (const sigma of [0.2, 0.5, 0.9]) {
      const h = 1e-6;
      const slope = (poissonWaveform(h, sigma) - poissonWaveform(-h, sigma)) / (2 * h);
      expect(slope / zeroCrossingSlope(sigma)).toBeCloseTo(1, 4);
    }
  });

  it('plane wave at 1 kHz and 140 dB in air shocks after ≈ 20 m (lossless estimate)', () => {
    const T = celsiusToKelvin(20);
    const rho = gasDensity(AIR, T);
    const c0 = gasSoundSpeed(AIR, T);
    const P = Math.SQRT2 * pressureFromSpl(140);
    const u0 = P / (rho * c0);
    const x = shockDistance(c0, betaIdealGas(AIR.gamma), 2 * Math.PI * 1000, u0);
    expect(x).toBeGreaterThan(15);
    expect(x).toBeLessThan(30);
    // Acoustic Mach number ε = u₀/c₀ equals P/(ρ₀c₀²) = P/(γp₀).
    expect(u0 / c0).toBeCloseTo(P / adiabaticBulkModulus(AIR), 3);
  });

  it('refuses σ ≥ 1 (multivalued solution)', () => {
    expect(() => poissonWaveform(0, 1)).toThrow();
  });
});
