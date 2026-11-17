import { describe, expect, it } from 'vitest';
import { abs } from './complex';
import {
  criticalAngle,
  intensityTransmission,
  intromissionAngle,
  layerTransmission,
  oblique,
  pulseAtInterface,
  reflection,
  transmission,
} from './interface';

const air = { rho: 1.204, c: 343.2 };
const water = { rho: 998.2, c: 1482.3 };
const Za = air.rho * air.c;
const Zw = water.rho * water.c;

describe('normal incidence', () => {
  it('energy is conserved: R² + τ = 1 (tol. 1e-12)', () => {
    for (const ratio of [1e-4, 0.1, 1, 7, 3600])
      expect(reflection(1, ratio) ** 2 + intensityTransmission(1, ratio)).toBeCloseTo(1, 12);
  });
  it('limits: rigid wall R = +1, pressure-release R = −1, matched R = 0', () => {
    expect(reflection(1, 1e12)).toBeCloseTo(1, 9);
    expect(reflection(1, 1e-12)).toBeCloseTo(-1, 9);
    expect(reflection(5, 5)).toBe(0);
  });
  it('air → water: pressure almost doubles (T ≈ 2) but only ≈ 0.11 % of the power crosses (−29.5 dB)', () => {
    expect(transmission(Za, Zw)).toBeGreaterThan(1.99);
    const tau = intensityTransmission(Za, Zw);
    expect(tau).toBeCloseTo(1.12e-3, 4);
    expect(10 * Math.log10(tau)).toBeCloseTo(-29.5, 1);
    // reciprocity: same power fraction from water to air
    expect(intensityTransmission(Zw, Za)).toBeCloseTo(tau, 14);
  });
  it('pulse solution satisfies continuity of p and v at x = 0 (tol. 1e-12)', () => {
    const f = (s: number) => Math.exp(-((s + 1) ** 2) / 0.01);
    const sol = pulseAtInterface(f, air, water);
    for (const t of [0.001, 0.0029, 0.004]) {
      expect(sol.p(-1e-12, t)).toBeCloseTo(sol.p(1e-12, t), 9);
      expect(sol.v(-1e-12, t) * 1e3).toBeCloseTo(sol.v(1e-12, t) * 1e3, 9);
    }
  });
});

describe('oblique incidence', () => {
  it('reduces to the normal-incidence coefficient at θ = 0', () => {
    expect(oblique(air, water, 0).R[0]).toBeCloseTo(reflection(Za, Zw), 12);
  });
  it('obeys Snell: sin θ₂ / c₂ = sin θ₁ / c₁', () => {
    const m2 = { rho: 1.5, c: 500 };
    const th = 0.4;
    const o = oblique(air, m2, th);
    expect(Math.sin(o.thetaT!) / m2.c).toBeCloseTo(Math.sin(th) / air.c, 12);
  });
  it('total reflection beyond the critical angle (|R| = 1, evanescent wave)', () => {
    const tc = criticalAngle(air.c, water.c)!;
    expect((tc * 180) / Math.PI).toBeCloseTo(13.39, 1);
    const o = oblique(air, water, tc + 0.05);
    expect(abs(o.R)).toBeCloseTo(1, 12);
    expect(o.thetaT).toBeNull();
    expect(o.cosT[1]).toBeGreaterThan(0); // decays into medium 2
  });
  it('energy conservation below the critical angle: |R|² + τ = 1 with τ = |T|² (Z₁/Z₂)(cos θ₂/cos θ₁)', () => {
    const m2 = { rho: 2.5, c: 600 };
    for (const th of [0.1, 0.5, 0.9]) {
      const o = oblique(air, m2, th);
      const tauDirect = abs(o.T) ** 2 * (Za / (m2.rho * m2.c)) * (o.cosT[0] / Math.cos(th));
      expect(abs(o.R) ** 2 + tauDirect).toBeCloseTo(1, 10);
    }
  });
  it('intromission angle gives R = 0 when it exists', () => {
    const m2 = { rho: 2.0, c: 300 }; // denser and slower: intromission exists
    const ti = intromissionAngle(air, m2);
    expect(ti).not.toBeNull();
    expect(abs(oblique(air, m2, ti!).R)).toBeLessThan(1e-9);
  });
});

describe('fluid layer between identical media', () => {
  it('vanishing or half-wave layers are transparent; a thin air gap in water is nearly opaque', () => {
    expect(layerTransmission(Zw, Za, 1000, 0)).toBeCloseTo(1, 12);
    const kl = (2 * Math.PI * 5e6) / air.c;
    expect(layerTransmission(Zw, Za, kl, Math.PI / kl)).toBeCloseTo(1, 9);
    expect(layerTransmission(Zw, Zw, 1000, 0.37)).toBeCloseTo(1, 12);
    // 1 µm of air at 5 MHz: about −44 dB
    const tau = layerTransmission(Zw, Za, kl, 1e-6);
    expect(10 * Math.log10(tau)).toBeLessThan(-40);
    expect(10 * Math.log10(tau)).toBeGreaterThan(-48);
  });
});
