import { describe, expect, it } from 'vitest';
import { abs, sub } from './complex';
import {
  bendingStiffness,
  bendingWavenumber,
  coincidenceFrequency,
  diffuseTL,
  doubleWallTransmission,
  limpMassTransmission,
  massAirMassFrequency,
  massLaw,
  transmissionLoss,
  wallImpedance,
  wallTransmission,
  type Plate,
} from './vibro';

const rho = 1.204;
const c = 343.2;
// 4 mm glass (generic values, see the content for sources)
const glass: Plate = { m: 2500 * 0.004, D: bendingStiffness(70e9, 0.004, 0.22), eta: 0.002 };

describe('single wall', () => {
  it('lossless wall conserves energy: |R|² + |T|² = 1 with R = 1 − T (tol. 1e-12)', () => {
    const lossless = { ...glass, eta: 0 };
    for (const [f, deg] of [
      [125, 0],
      [1000, 45],
      [5000, 70],
    ] as const) {
      const T = wallTransmission(f, (deg * Math.PI) / 180, lossless, rho, c);
      const R = sub([1, 0], T);
      expect(abs(R) ** 2 + abs(T) ** 2).toBeCloseTo(1, 12);
    }
  });
  it('normal incidence tends to the mass law 20 log(ωm/2ρc) (tol. 0.05 dB at 1 kHz)', () => {
    expect(
      Math.abs(transmissionLoss(1000, 0, glass, rho, c) - massLaw(1000, glass.m, rho, c)),
    ).toBeLessThan(0.05);
  });
  it('mass law: +6 dB per doubling of mass or frequency (tol. 0.05 dB)', () => {
    const a = transmissionLoss(500, 0, glass, rho, c);
    expect(transmissionLoss(1000, 0, glass, rho, c) - a).toBeCloseTo(6.02, 1);
    expect(transmissionLoss(500, 0, { ...glass, m: 2 * glass.m }, rho, c) - a).toBeCloseTo(6.02, 1);
  });
  it('coincidence: without damping the wall is transparent where k_B = k sin θ (tol. 1e-9)', () => {
    const lossless = { ...glass, eta: 0 };
    const fc = coincidenceFrequency(c, glass);
    const th = Math.PI / 4;
    const f = fc / Math.sin(th) ** 2; // k sin θ = k_B  ⇔  f = f_c / sin²θ
    expect(abs(wallImpedance(f, th, lossless, c))).toBeLessThan(1e-9 * 2 * Math.PI * f * glass.m);
    expect(abs(wallTransmission(f, th, lossless, rho, c))).toBeCloseTo(1, 9);
    // and the bending wavenumber equals the trace there
    expect(
      bendingWavenumber(2 * Math.PI * f, glass) / ((2 * Math.PI * f * Math.sin(th)) / c),
    ).toBeCloseTo(1, 9);
  });
  it('4 mm glass: coincidence near 3 kHz (f_c h ≈ 12 Hz·m for glass, TODO-VERIFY rule of thumb; tol. 10 %)', () => {
    expect(Math.abs((coincidenceFrequency(c, glass) * 0.004) / 12 - 1)).toBeLessThan(0.1);
  });
  it('diffuse field: below coincidence, close to the mass law minus a few dB; dip at f_c', () => {
    const fc = coincidenceFrequency(c, glass);
    const low = diffuseTL(200, glass, rho, c);
    expect(massLaw(200, glass.m, rho, c) - low).toBeGreaterThan(3);
    expect(massLaw(200, glass.m, rho, c) - low).toBeLessThan(12);
    expect(diffuseTL(fc, glass, rho, c)).toBeLessThan(diffuseTL(fc / 2, glass, rho, c));
  });
});

describe('diffuse-field quadrature', () => {
  it('peak-adapted quadrature equals a brute-force average (400 000 points, tol. 0.1 dB)', () => {
    const fc = coincidenceFrequency(c, glass);
    for (const f of [0.5 * fc, 1.3 * fc, 2.5 * fc]) {
      const N = 400000;
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        sum += abs(wallTransmission(f, Math.asin(Math.sqrt(u)), glass, rho, c)) ** 2;
      }
      const brute = -10 * Math.log10(sum / N);
      expect(Math.abs(diffuseTL(f, glass, rho, c) - brute)).toBeLessThan(0.1);
    }
  });
});

describe('double wall', () => {
  const w = { m1: 10, m2: 10, d: 0.1 };
  it('transfer matrix of one mass equals 1/(1 − iωm/2ρc) (tol. 1e-12)', () => {
    const T = limpMassTransmission(800, 12, rho, c);
    const ref = wallTransmission(800, 0, { m: 12, D: 1, eta: 0 }, rho, c, {
      bending: false,
      damping: false,
    });
    expect(abs(sub(T, ref))).toBeLessThan(1e-12);
  });
  it('transmission minimum at the mass–air–mass resonance (tol. 3 %)', () => {
    const f0 = massAirMassFrequency(w, rho, c);
    let best = 0;
    let fb = 0;
    for (let f = f0 / 2; f < f0 * 2; f *= 1.001) {
      const t = abs(doubleWallTransmission(f, w, rho, c));
      if (t > best) {
        best = t;
        fb = f;
      }
    }
    expect(Math.abs(fb / f0 - 1)).toBeLessThan(0.03);
  });
  it('above f0, insulation grows by about 18 dB per octave (tol. 1.5 dB)', () => {
    const f0 = massAirMassFrequency(w, rho, c);
    const tl = (f: number) => -20 * Math.log10(abs(doubleWallTransmission(f, w, rho, c)));
    const slope = tl(8 * f0) - tl(4 * f0);
    expect(Math.abs(slope - 18)).toBeLessThan(1.5);
  });
});
