import { describe, expect, it } from 'vitest';
import {
  AIR,
  HELIUM,
  adiabaticBulkModulus,
  celerityFromModulus,
  celsiusToKelvin,
  gasDensity,
  gasIsothermalSoundSpeed,
  gasSoundSpeed,
  mixGases,
} from './media';
import { P_ATM } from './constants';

const T20 = celsiusToKelvin(20);

describe('ideal-gas sound speed', () => {
  it('air at 20 °C ≈ 343.2 m/s (independent recomputation, rel. tol. 1e-3)', () => {
    // Independent: γ R T / M with R = 8.314462618 J/(mol·K).
    const ref = Math.sqrt((1.4 * 8.314462618 * 293.15) / 0.0289647);
    expect(gasSoundSpeed(AIR, T20)).toBeCloseTo(ref, 6);
    expect(Math.abs(gasSoundSpeed(AIR, T20) / 343.2 - 1)).toBeLessThan(1e-3);
  });

  it('helium at 20 °C ≈ 1007 m/s (rel. tol. 1e-3)', () => {
    expect(Math.abs(gasSoundSpeed(HELIUM, T20) / 1007.4 - 1)).toBeLessThan(1e-3);
  });

  it('Newton vs Laplace: ratio is exactly √γ (rel. tol. 1e-12)', () => {
    const ratio = gasSoundSpeed(AIR, T20) / gasIsothermalSoundSpeed(AIR, T20);
    expect(Math.abs(ratio / Math.sqrt(AIR.gamma) - 1)).toBeLessThan(1e-12);
    // Newton's value is ~15 % too low.
    expect(1 - 1 / ratio).toBeGreaterThan(0.15);
    expect(1 - 1 / ratio).toBeLessThan(0.16);
  });

  it('is independent of static pressure (Newton–Laplace with K = γp₀)', () => {
    for (const p0 of [0.3 * P_ATM, P_ATM, 10 * P_ATM]) {
      const c = celerityFromModulus(adiabaticBulkModulus(AIR, p0), gasDensity(AIR, T20, p0));
      expect(Math.abs(c / gasSoundSpeed(AIR, T20) - 1)).toBeLessThan(1e-12);
    }
  });

  it('scales as √T', () => {
    const r = gasSoundSpeed(AIR, 4 * T20) / gasSoundSpeed(AIR, T20);
    expect(r).toBeCloseTo(2, 12);
  });
});

describe('gas mixtures', () => {
  it('reduces to pure species at x = 0 and x = 1', () => {
    const pureHe = mixGases(HELIUM, AIR, 1);
    const pureAir = mixGases(HELIUM, AIR, 0);
    expect(pureHe.gamma).toBeCloseTo(HELIUM.gamma, 12);
    expect(pureAir.gamma).toBeCloseTo(AIR.gamma, 12);
    expect(pureHe.molarMass).toBeCloseTo(HELIUM.molarMass, 15);
  });

  it('sound speed rises monotonically with helium fraction', () => {
    let prev = 0;
    for (let x = 0; x <= 1.0001; x += 0.1) {
      const c = gasSoundSpeed(mixGases(HELIUM, AIR, Math.min(x, 1)), T20);
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });
});
