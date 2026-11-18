import { describe, expect, it } from 'vitest';
import { C, abs, div, sub } from './complex';
import { besselJ0, besselJ1, besselY1, pistonDirectivity } from './special';
import { END_CORRECTION } from './tubes';
import {
  J1_FIRST_ZERO,
  PISTON_HALF_POWER_X,
  createPistonQuadrature,
  lastAxialMaximum,
  pairPowerRatio,
  pistonImpedance,
  pistonOnAxis,
  sphereImpedance,
  sphericalAdmittance,
  spherePressure,
  struveH1,
} from './radiation';

describe('pulsating sphere', () => {
  it('impedance equals P/V from Euler’s equation applied to e^{ikr}/r (finite differences, tol. 1e-6)', () => {
    for (const ka of [0.05, 0.5, 1, 3, 10]) {
      const h = 1e-5;
      // ρ₀c₀ V = (1/ik) dP/d(kr)
      const dP = div(sub(spherePressure(ka, ka + h), spherePressure(ka, ka - h)), C(2 * h));
      const rcV = div(dP, C(0, 1));
      const Z = div(spherePressure(ka, ka), rcV);
      expect(abs(sub(Z, sphereImpedance(ka)))).toBeLessThan(1e-6);
      // and with the spherical admittance 1 + i/kr
      expect(abs(sub(div(C(1), sphericalAdmittance(ka)), sphereImpedance(ka)))).toBeLessThan(1e-12);
    }
  });
  it('small sphere: resistance ≈ (ka)², reactance ≈ −ka (mass); large sphere: ρ₀c₀ (tol. 1 %)', () => {
    const s = sphereImpedance(0.01);
    expect(s[0] / 1e-4).toBeCloseTo(1, 3);
    expect(-s[1] / 0.01).toBeCloseTo(1, 3);
    const l = sphereImpedance(100);
    expect(Math.abs(l[0] - 1)).toBeLessThan(0.01);
  });
});

describe('pair of sources', () => {
  it('power ratio 1 ± sin(kd)/kd matches direct integration of the far field (Simpson, tol. 1e-6)', () => {
    for (const kd of [0.1, 1, 2.5, 6]) {
      for (const sign of [1, -1] as const) {
        const N = 2000;
        let sum = 0;
        for (let i = 0; i <= N; i++) {
          const th = (Math.PI * i) / N;
          const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
          const ph = kd * Math.cos(th);
          const m2 = (1 + sign * Math.cos(ph)) ** 2 + Math.sin(ph) ** 2;
          sum += w * m2 * Math.sin(th);
        }
        const integral = (sum * Math.PI) / N / 3; // ∫₀^π |·|² sin θ dθ
        // one source alone: ∫ 1 · sin θ dθ = 2 ; two sources alone: 4
        expect(Math.abs(integral / 4 - pairPowerRatio(kd, sign))).toBeLessThan(1e-6);
      }
    }
  });
  it('opposed pair: power falls as (kd)²/6 for kd → 0 (acoustic short circuit, tol. 1 %)', () => {
    expect(pairPowerRatio(0.05, -1) / (0.05 ** 2 / 6)).toBeCloseTo(1, 2);
  });
});

describe('Struve H₁', () => {
  it('matches the Aarts–Janssen approximation (stated max. error ≈ 0.005) on [0, 40]', () => {
    // TODO-VERIFY: Aarts & Janssen, J. Acoust. Soc. Am. 113 (2003): H₁(x) ≈ 2/π − J₀(x)
    // + (16/π − 5) sin(x)/x + (12 − 36/π)(1 − cos x)/x².
    for (let x = 0.5; x <= 40; x += 0.25) {
      const approx =
        2 / Math.PI -
        besselJ0(x) +
        (16 / Math.PI - 5) * (Math.sin(x) / x) +
        (12 - 36 / Math.PI) * ((1 - Math.cos(x)) / (x * x));
      expect(Math.abs(struveH1(x) - approx)).toBeLessThan(0.006);
    }
  });
  it('small x: H₁ ≈ 2x²/(3π); series and asymptotic forms agree at the switch x = 25 (tol. 1e-6)', () => {
    expect(struveH1(1e-3) / (2e-6 / (3 * Math.PI))).toBeCloseTo(1, 6);
    const x = 25;
    const asym = besselY1(x) + (2 / Math.PI) * (1 + 1 / x ** 2 - 3 / x ** 4);
    expect(Math.abs(struveH1(x) - asym)).toBeLessThan(1e-6);
  });
});

describe('baffled piston', () => {
  it('low frequency: R ≈ (ka)²/2 and X/ka → 8/3π, the flanged end correction of chapter 3 (tol. 0.1 %)', () => {
    const z = pistonImpedance(0.01);
    expect(z[0] / (0.01 ** 2 / 2)).toBeCloseTo(1, 3);
    expect(Math.abs(-z[1] / 0.01 / END_CORRECTION.flanged - 1)).toBeLessThan(1e-3);
    // continuity at the switch to the closed forms
    const z2 = pistonImpedance(1.001e-4);
    expect(Math.abs(-z2[1] / 1.001e-4 / END_CORRECTION.flanged - 1)).toBeLessThan(1e-3);
  });
  it('high frequency: R → 1, X → 0 (tol. 2 %)', () => {
    const z = pistonImpedance(50);
    expect(Math.abs(z[0] - 1)).toBeLessThan(0.02);
    expect(Math.abs(z[1])).toBeLessThan(0.02);
  });
  it('on-axis closed form agrees with the Rayleigh integral by quadrature (tol. 1 %)', () => {
    const ka = 10;
    const p = createPistonQuadrature(ka, 16);
    for (const kz of [1, 3, 7, 15, 40]) {
      expect(Math.abs(abs(p(0, kz)) / pistonOnAxis(ka, kz) - 1)).toBeLessThan(0.01);
    }
  });
  it('far field of the quadrature follows 2J₁(ka sin θ)/(ka sin θ) (tol. 0.01 in amplitude)', () => {
    const ka = 5;
    const p = createPistonQuadrature(ka, 16);
    const kr = 4000;
    for (const deg of [0, 10, 20, 40, 60]) {
      const th = (deg * Math.PI) / 180;
      const amp = (abs(p(kr * Math.sin(th), kr * Math.cos(th))) * kr) / ((ka * ka) / 2);
      expect(Math.abs(amp - Math.abs(pistonDirectivity(ka, th)))).toBeLessThan(0.01);
    }
  });
  it('pattern constants: half-power at x = 1.616, first null at the first zero of J₁ = 3.8317 (tol. 1e-3)', () => {
    // TODO-VERIFY: tabulated j₁,₁ = 3.8317 (Abramowitz & Stegun, zeros of Bessel functions).
    expect(Math.abs(J1_FIRST_ZERO - 3.8317)).toBeLessThan(1e-3);
    expect(
      Math.abs((2 * besselJ1(PISTON_HALF_POWER_X)) / PISTON_HALF_POWER_X - Math.SQRT1_2),
    ).toBeLessThan(1e-9);
    expect(Math.abs(PISTON_HALF_POWER_X - 1.616)).toBeLessThan(1e-3);
  });
  it('last on-axis maximum reaches 2ρ₀c₀U (tol. 1e-9)', () => {
    expect(Math.abs(pistonOnAxis(12, lastAxialMaximum(12)!) - 2)).toBeLessThan(1e-9);
  });
});
