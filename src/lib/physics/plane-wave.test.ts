import { describe, expect, it } from 'vitest';
import { C } from './complex';
import {
  displacementAmplitude,
  incidentPlusReflected,
  kineticEnergyDensity,
  meanIntensity,
  potentialEnergyDensity,
} from './plane-wave';
import { AIR, celsiusToKelvin, gasDensity, gasSoundSpeed } from './media';
import { pressureFromSpl } from './levels';

const T = celsiusToKelvin(20);
const air = { rho0: gasDensity(AIR, T), c0: gasSoundSpeed(AIR, T) };
const f = 500;
const omega = 2 * Math.PI * f;
const k = omega / air.c0;
const xs = Array.from({ length: 41 }, (_, i) => (i / 40) * 2);
const ts = Array.from({ length: 13 }, (_, i) => i / (12 * f));

describe('progressive plane wave (R = 0)', () => {
  const w = incidentPlusReflected(C(2), C(0), k, omega, air);
  it('p = ρ₀c₀ v at every point and instant (rel. tol. 1e-12)', () => {
    for (const x of xs)
      for (const t of ts) {
        const p = w.p(x, t);
        expect(Math.abs(p - air.rho0 * air.c0 * w.v(x, t))).toBeLessThan(1e-12 * 2);
      }
  });
  it('equipartition: kinetic = potential energy density everywhere (tol. 1e-12)', () => {
    for (const x of xs)
      for (const t of ts) {
        const ek = kineticEnergyDensity(w.v(x, t), air);
        const ep = potentialEnergyDensity(w.p(x, t), air);
        expect(Math.abs(ek - ep)).toBeLessThan(1e-12 * Math.max(ek, ep, 1e-30) + 1e-30);
      }
  });
  it('active intensity = P²/(2ρ₀c₀), uniform (rel. tol. 1e-12)', () => {
    for (const x of xs) expect(w.activeIntensity(x) / meanIntensity(2, air)).toBeCloseTo(1, 12);
  });
  it('satisfies linearized Euler −iωρ₀V = −dP/dx (finite difference, rel. tol. 1e-6)', () => {
    const h = 1e-6;
    for (const x of [0.1, 0.7, 1.3]) {
      const dP = [
        (w.P(x + h)[0] - w.P(x - h)[0]) / (2 * h),
        (w.P(x + h)[1] - w.P(x - h)[1]) / (2 * h),
      ];
      const V = w.V(x);
      // −iωρ₀V = (ωρ₀V_im, −ωρ₀V_re)
      expect(omega * air.rho0 * V[1]).toBeCloseTo(-dP[0]!, 4);
      expect(-omega * air.rho0 * V[0]).toBeCloseTo(-dP[1]!, 4);
    }
  });
});

describe('standing wave (R = 1) and partial reflection', () => {
  it('pure standing wave carries no active intensity (tol. 1e-12)', () => {
    const w = incidentPlusReflected(C(1), C(1), k, omega, air);
    for (const x of xs) expect(Math.abs(w.activeIntensity(x))).toBeLessThan(1e-12);
  });
  it('active intensity = (1 − R²) P²/(2ρ₀c₀) for real R', () => {
    for (const R of [0.25, 0.5, 0.9]) {
      const w = incidentPlusReflected(C(1), C(R), k, omega, air);
      for (const x of xs)
        expect(w.activeIntensity(x) / ((1 - R * R) * meanIntensity(1, air))).toBeCloseTo(1, 10);
    }
  });
});

describe('orders of magnitude (calculated, not tabulated)', () => {
  it('displacement at the threshold of hearing (0 dB, 1 kHz) is about 1e-11 m', () => {
    const P = Math.SQRT2 * pressureFromSpl(0);
    const xi = displacementAmplitude(P, air, 2 * Math.PI * 1000);
    expect(xi).toBeGreaterThan(0.8e-11);
    expect(xi).toBeLessThan(1.3e-11);
  });
  it('displacement at 94 dB, 500 Hz is about 1.1 µm', () => {
    const xi = displacementAmplitude(Math.SQRT2 * pressureFromSpl(94), air, 2 * Math.PI * 500);
    expect(xi).toBeGreaterThan(1.0e-6);
    expect(xi).toBeLessThan(1.2e-6);
  });
});
