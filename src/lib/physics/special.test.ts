import { describe, expect, it } from 'vitest';
import { besselJ0, besselJ1, pistonDirectivity } from './special';

describe('Bessel functions', () => {
  it('match tabulated values (tol. 1e-7)', () => {
    // Values from the series definition computed independently below.
    const series = (n: 0 | 1, x: number) => {
      let s = 0;
      for (let m = 0; m < 40; m++) {
        let fact = 1;
        for (let i = 2; i <= m; i++) fact *= i;
        let fact2 = fact;
        for (let i = m + 1; i <= m + n; i++) fact2 *= i;
        s += ((-1) ** m / (fact * fact2)) * (x / 2) ** (2 * m + n);
      }
      return s;
    };
    for (const x of [0, 0.5, 1, 2.5, 3.8317, 5, 7.9]) {
      expect(Math.abs(besselJ0(x) - series(0, x))).toBeLessThan(1e-7);
      expect(Math.abs(besselJ1(x) - series(1, x))).toBeLessThan(1e-7);
    }
  });
  it('first zero of J₁ is at 3.8317 (tol. 1e-4)', () => {
    expect(Math.abs(besselJ1(3.8317))).toBeLessThan(1e-4);
  });
});

describe('baffled piston directivity', () => {
  it('is 1 on axis and isotropic when ka → 0', () => {
    expect(pistonDirectivity(5, 0)).toBe(1);
    expect(pistonDirectivity(0.01, Math.PI / 2)).toBeCloseTo(1, 4);
  });
  it('first null at sin θ = 3.8317/ka', () => {
    const ka = 10;
    expect(Math.abs(pistonDirectivity(ka, Math.asin(3.8317 / ka)))).toBeLessThan(1e-4);
  });
});
