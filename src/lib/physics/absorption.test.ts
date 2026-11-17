import { describe, expect, it } from 'vitest';
import { C, abs } from './complex';
import {
  absorption,
  absorptionFromSwr,
  delanyBazley,
  resistiveScreen,
  rigidBackedLayer,
  standingWaveRatio,
  surfaceReflection,
} from './absorption';
import { incidentPlusReflected } from './plane-wave';

const Z0 = 413;
const c0 = 343;

describe('surface impedance', () => {
  it('matched resistance absorbs everything; pure reactance absorbs nothing', () => {
    expect(absorption(C(Z0), Z0)).toBeCloseTo(1, 12);
    for (const X of [-500, -10, 3, 800]) expect(absorption(C(0, X), Z0)).toBeCloseTo(0, 12);
  });
  it('standing-wave ratio measured in a simulated tube gives back α (tol. 1e-6)', () => {
    const Zs = C(2.5 * Z0, -1.2 * Z0);
    const R = surfaceReflection(Zs, Z0);
    // Wall at x = 0: P(x) = e^{ikx} + R e^{−ikx} after shifting origin; scan |P| over a wavelength.
    const k = (2 * Math.PI * 1000) / c0;
    const field = incidentPlusReflected(C(1), R, k, 2 * Math.PI * 1000, { rho0: 1.2, c0 });
    let max = 0;
    let min = Infinity;
    for (let i = 0; i <= 4000; i++) {
      const x = (-(i / 4000) * (2 * Math.PI)) / k;
      const m = abs(field.P(x));
      max = Math.max(max, m);
      min = Math.min(min, m);
    }
    expect(max / min).toBeCloseTo(standingWaveRatio(R), 4);
    expect(absorptionFromSwr(max / min)).toBeCloseTo(absorption(Zs, Z0), 5);
  });
  it('a screen of resistance ρ₀c₀ a quarter wavelength from the wall absorbs 100 %', () => {
    const f = 1000;
    const k = (2 * Math.PI * f) / c0;
    const d = Math.PI / (2 * k);
    expect(absorption(resistiveScreen(Z0, d, k, Z0), Z0)).toBeCloseTo(1, 10);
    // At half a wavelength the screen sits at a velocity node: nothing is absorbed.
    expect(absorption(resistiveScreen(Z0, 2 * d, k, Z0), Z0)).toBeLessThan(1e-6);
  });
  it('rigid-backed layer of air equals the gap reactance +i Z₀ cot(kd)', () => {
    const k = 12;
    const d = 0.05;
    const z = rigidBackedLayer(C(Z0), C(k), d);
    expect(z[0]).toBeCloseTo(0, 6);
    expect(z[1]).toBeCloseTo(Z0 / Math.tan(k * d), 6);
  });
  it('a thin air gap is a spring: Z ≈ iK/ω with K = ρ₀c₀²/d (rel. tol. 1e-3)', () => {
    const omega = 2 * Math.PI * 50;
    const d = 0.01;
    const z = rigidBackedLayer(C(Z0), C(omega / c0), d);
    expect(z[1] / ((Z0 * c0) / d / omega)).toBeCloseTo(1, 3);
  });
});

describe('Delany–Bazley porous layer', () => {
  it('is passive (0 ≤ α ≤ 1) and absorbs more at high frequency for a 5 cm layer', () => {
    const sigma = 20000;
    const alpha = (f: number) => {
      const { Zc, k } = delanyBazley(f, sigma, 1.2, c0);
      return absorption(rigidBackedLayer(Zc, k, 0.05), Z0);
    };
    for (const f of [100, 250, 500, 1000, 2000, 4000]) {
      expect(alpha(f)).toBeGreaterThanOrEqual(0);
      expect(alpha(f)).toBeLessThanOrEqual(1);
    }
    expect(alpha(2000)).toBeGreaterThan(0.8);
    expect(alpha(125)).toBeLessThan(0.3);
  });
  it('wave decays inside the material (Im k > 0 with e^{−iωt})', () => {
    expect(delanyBazley(1000, 20000, 1.2, c0).k[1]).toBeGreaterThan(0);
  });
});
