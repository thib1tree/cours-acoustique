import { describe, expect, it } from 'vitest';
import { C, abs } from './complex';
import {
  extrema,
  idealResonances,
  refineExtremum,
  inputImpedance,
  openTubeInput,
  radiationImpedance,
} from './tubes';
import { cavityStiffness, distributedFrequency, helmholtzFrequency, plugMass } from './helmholtz';
import {
  axialWavenumber,
  circularCutoffKa,
  cutoffFrequency,
  modeVelocities,
  planeWaveAngle,
} from './waveguide';

const c = 343.2;
const rho = 1.204;

describe('tubes', () => {
  it('refined resonance peak reaches the standing-wave ratio of the radiation load (tol. 0.1 %)', () => {
    // Lossless line: max over kL of |Z_in| = (1 + |R|)/(1 − |R|), R = (Z_L − 1)/(Z_L + 1).
    const L = 0.6;
    const a = 0.0075;
    const f0 = refineExtremum((f) => abs(openTubeInput(f, L, a, c)), 120, 165, 1);
    const ZL = radiationImpedance((2 * Math.PI * f0 * a) / c);
    const [r, x] = ZL;
    const g = abs(C((r - 1) * (r + 1) + x * x, 2 * x)) / ((r + 1) ** 2 + x * x);
    const swr = (1 + g) / (1 - g);
    expect(Math.abs(abs(openTubeInput(f0, L, a, c)) / swr - 1)).toBeLessThan(1e-3);
  });
  it('ideal open–open tube: impedance minima at n c/2L; closed–open: maxima at odd c/4L (tol. 0.2 %)', () => {
    const L = 0.6;
    const fs = Array.from({ length: 4001 }, (_, i) => 1 + i * 0.5);
    const z = fs.map((f) => abs(inputImpedance(C(0), (2 * Math.PI * f * L) / c)));
    const minima = extrema(
      fs,
      z.map((v) => Math.log(v + 1e-12)),
      -1,
    ).slice(0, 3);
    const maxima = extrema(
      fs,
      z.map((v) => Math.log(v + 1e-12)),
      1,
    ).slice(0, 3);
    idealResonances(L, c, 'open-open', 3).forEach((f, i) =>
      expect(Math.abs(minima[i]! / f - 1)).toBeLessThan(2e-3),
    );
    idealResonances(L, c, 'closed-open', 3).forEach((f, i) =>
      expect(Math.abs(maxima[i]! / f - 1)).toBeLessThan(2e-3),
    );
  });
  it('short tubes: closed end acts as a spring (+i), open end as a mass (−i)', () => {
    const kL = 0.01;
    expect(inputImpedance(C(1e12), kL)[1]).toBeCloseTo(1 / kL, 1); // i cot kL ≈ i/kL
    expect(inputImpedance(C(0), kL)[1]).toBeCloseTo(-kL, 6); // −i tan kL ≈ −i kL
  });
  it('radiation mass lowers the resonances as if the tube were longer by 0.61 a (tol. 0.5 %)', () => {
    const L = 0.6;
    const a = 0.01;
    const fs = Array.from({ length: 3001 }, (_, i) => 50 + i * 0.25);
    const z = fs.map((f) => abs(openTubeInput(f, L, a, c, { resistance: false, mass: true })));
    const first = extrema(
      fs,
      z.map((v) => -Math.log(v + 1e-12)),
      1,
    )[0]!;
    expect(Math.abs(first / (c / (2 * (L + 0.6133 * a))) - 1)).toBeLessThan(5e-3);
  });
  it('radiation resistance makes the peaks finite', () => {
    const z = radiationImpedance(0.1);
    expect(z[0]).toBeCloseTo(0.0025, 10);
    expect(z[1]).toBeLessThan(0);
  });
});

describe('Helmholtz resonator', () => {
  const r = { V: 0.75e-3, a: 0.009, L: 0.08 };
  it('ω₀ = √(K/m) (consistency, tol. 1e-12)', () => {
    const w = Math.sqrt(cavityStiffness(r, rho, c) / plugMass(r, rho));
    expect(w / (2 * Math.PI) / helmholtzFrequency(r, c)).toBeCloseTo(1, 12);
  });
  it('halving the volume raises f₀ by √2', () => {
    expect(helmholtzFrequency({ ...r, V: r.V / 2 }, c) / helmholtzFrequency(r, c)).toBeCloseTo(
      Math.SQRT2,
      12,
    );
  });
  it('lumped model matches the distributed model for small dimensions (tol. 1 %), and departs for large ones', () => {
    const small = { V: 1e-5, a: 0.003, L: 0.01 };
    expect(
      Math.abs(distributedFrequency(small, 0.01, c) / helmholtzFrequency(small, c) - 1),
    ).toBeLessThan(0.01);
    // Scaling every dimension leaves the error unchanged (only the shape matters); at
    // fixed volume, a shorter, wider cavity (smaller k·Lc) follows the lumped model better.
    const r2 = { V: 1e-4, a: 0.004, L: 0.01 };
    const err = (Lc: number) =>
      Math.abs(distributedFrequency(r2, Lc, c) / helmholtzFrequency(r2, c) - 1);
    expect(err(0.02)).toBeLessThan(err(0.05) / 4);
    // A long, narrow cavity and a long neck: the lumped model is ~5 % too high.
    const big = { V: 0.0015, a: 0.015, L: 0.1 };
    expect(
      Math.abs(distributedFrequency(big, 0.25, c) / helmholtzFrequency(big, c) - 1),
    ).toBeGreaterThan(0.03);
  });
});

describe('waveguide', () => {
  it('cut-off and evanescence', () => {
    const b = 0.1;
    const fc = cutoffFrequency(1, b, c);
    expect(fc).toBeCloseTo(1716, 0);
    expect(axialWavenumber(0.5 * fc, 1, b, c).im).toBeGreaterThan(0);
    expect(axialWavenumber(2 * fc, 1, b, c).im).toBe(0);
  });
  it('phase × group velocity = c², and the plane-wave angle obeys sin θ = f_c/f', () => {
    const v = modeVelocities(2000, 1000, c);
    expect(v.phase * v.group).toBeCloseTo(c * c, 8);
    expect(Math.sin(planeWaveAngle(2000, 1000)!)).toBeCloseTo(0.5, 12);
    // Group velocity is the axial projection of c along the zig-zag: c cos θ.
    expect(v.group).toBeCloseTo(c * Math.cos(planeWaveAngle(2000, 1000)!), 10);
  });
  it('circular duct: first zero of J1′ at 1.8412 (tabulated value, tol. 1e-4)', () => {
    // TODO-VERIFY: Abramowitz & Stegun table of zeros of J′ (j′₁,₁ = 1.84118).
    expect(Math.abs(circularCutoffKa() - 1.84118)).toBeLessThan(1e-4);
  });
});
