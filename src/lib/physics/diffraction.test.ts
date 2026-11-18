import { describe, expect, it } from 'vitest';
import { abs, sub } from './complex';
import { fresnelCS, halfPlane, sommerfeldF } from './diffraction';
import {
  farField,
  legendre,
  rigidSphereCoefficients,
  scatteringEfficiency,
  sphereField,
  sphericalBessel,
} from './scattering';

describe('Fresnel integrals', () => {
  it('derivatives are cos(πx²/2) and sin(πx²/2) on both sides of the series/fraction switch (tol. 1e-7)', () => {
    const h = 1e-5;
    for (const x of [0.1, 0.7, 1.2, 1.49, 1.51, 2, 3.3, 7, 15]) {
      const dC = (fresnelCS(x + h).C - fresnelCS(x - h).C) / (2 * h);
      const dS = (fresnelCS(x + h).S - fresnelCS(x - h).S) / (2 * h);
      expect(Math.abs(dC - Math.cos((Math.PI * x * x) / 2))).toBeLessThan(1e-7);
      expect(Math.abs(dS - Math.sin((Math.PI * x * x) / 2))).toBeLessThan(1e-7);
    }
  });
  it('limits and symmetry: C, S → ½ (asymptotic 1/(πx)), odd functions, zero at 0', () => {
    const big = fresnelCS(1000);
    expect(Math.abs(big.C - 0.5)).toBeLessThan(1 / (Math.PI * 1000) + 1e-9);
    expect(Math.abs(big.S - 0.5)).toBeLessThan(1 / (Math.PI * 1000) + 1e-9);
    expect(fresnelCS(-0.8).C).toBeCloseTo(-fresnelCS(0.8).C, 14);
    expect(fresnelCS(0).S).toBe(0);
  });
  it('Sommerfeld function: F(−∞) = 1, F(0) = ½, F(+∞) = 0', () => {
    expect(abs(sub(sommerfeldF(-200), [1, 0]))).toBeLessThan(5e-3);
    expect(abs(sub(sommerfeldF(0), [0.5, 0]))).toBeLessThan(1e-15);
    expect(abs(sommerfeldF(200))).toBeLessThan(5e-3);
  });
});

describe('rigid half-plane (Sommerfeld)', () => {
  const phi0 = 2.3;
  const u = (x: number, y: number) => {
    let phi = Math.atan2(y, x);
    if (phi <= 0) phi += 2 * Math.PI;
    return halfPlane(Math.hypot(x, y), phi, phi0).total;
  };
  it('satisfies the Helmholtz equation ∇²u + u = 0 (finite differences, residual < 1e-5)', () => {
    const h = 1e-3;
    for (const [x, y] of [
      [2, 1],
      [-3, 0.5],
      [-1, -2],
      [4, -0.7],
      [0.3, 0.4],
    ] as const) {
      const lap = [u(x + h, y), u(x - h, y), u(x, y + h), u(x, y - h)].reduce(
        (acc, v) => [acc[0] + v[0], acc[1] + v[1]] as const,
        [0, 0] as const,
      );
      const c = u(x, y);
      const res = [
        (lap[0] - 4 * c[0]) / (h * h) + c[0],
        (lap[1] - 4 * c[1]) / (h * h) + c[1],
      ] as const;
      expect(abs(res)).toBeLessThan(1e-5 * 10);
    }
  });
  it('rigid screen: zero normal derivative on both faces (tol. 1e-6)', () => {
    const h = 1e-6;
    for (const x of [0.5, 2, 7]) {
      for (const side of [1, -1]) {
        // ∂u/∂y at y = 0±, x > 0 (one-sided differences away from the screen)
        const y1 = side * h;
        const y2 = side * 2 * h;
        const d = sub(u(x, y2), u(x, y1));
        expect(abs(d) / h).toBeLessThan(1e-4);
      }
    }
  });
  it('far from the edge: incident + reflected where lit, nothing in deep shadow, ½ on the shadow boundary', () => {
    const kr = 2e4;
    // shadow boundary at φ = φ0 + π; lit side φ < φ0 + π (reflection zone φ < π − φ0 is empty here)
    const lit = halfPlane(kr, phi0 + 2, phi0);
    expect(abs(sub(lit.total, lit.geometric))).toBeLessThan(1e-2);
    const shadow = halfPlane(kr, phi0 + Math.PI + 0.6, phi0);
    expect(abs(shadow.total)).toBeLessThan(1e-2);
    const boundary = halfPlane(kr, phi0 + Math.PI, phi0);
    expect(Math.abs(abs(boundary.total) - 0.5)).toBeLessThan(1e-2);
  });
});

describe('spherical Bessel functions', () => {
  it('match the closed forms for n ≤ 2 (tol. 1e-12)', () => {
    for (const x of [0.3, 1, 4.7, 20]) {
      const { j, y } = sphericalBessel(2, x);
      const s = Math.sin(x);
      const c = Math.cos(x);
      expect(j[0]).toBeCloseTo(s / x, 12);
      expect(j[1]).toBeCloseTo(s / x ** 2 - c / x, 12);
      expect(j[2]).toBeCloseTo((3 / x ** 2 - 1) * (s / x) - (3 * c) / x ** 2, 12);
      expect(y[1]).toBeCloseTo(-c / x ** 2 - s / x, 12);
    }
  });
  it('satisfy the cross-product j_n y_{n−1} − j_{n−1} y_n = 1/x² up to n = 40 (rel. tol. 1e-9)', () => {
    for (const x of [0.5, 5, 30]) {
      const { j, y } = sphericalBessel(40, x);
      for (let n = 1; n <= 40; n++) {
        const w = j[n]! * y[n - 1]! - j[n - 1]! * y[n]!;
        expect(Math.abs(w * x * x - 1)).toBeLessThan(1e-9);
      }
    }
  });
  it('Legendre recurrence: P₂(c) = (3c² − 1)/2', () => {
    expect(legendre(3, 0.3)[2]).toBeCloseTo((3 * 0.09 - 1) / 2, 14);
  });
});

describe('rigid sphere scattering', () => {
  it('Rayleigh limit σ/πa² = (7/9)(ka)⁴ for ka ≪ 1 (tol. 1 %)', () => {
    const ka = 0.01;
    expect(Math.abs(scatteringEfficiency(ka) / ((7 / 9) * ka ** 4) - 1)).toBeLessThan(0.01);
  });
  it('large sphere: σ → 2πa² (extinction paradox), with a deficit shrinking like (ka)^(−2/3) (tol. 3 % at ka = 600)', () => {
    expect(Math.abs(scatteringEfficiency(600) / 2 - 1)).toBeLessThan(0.03);
    const ratio = (2 - scatteringEfficiency(600)) / (2 - scatteringEfficiency(200));
    expect(Math.abs(ratio - 3 ** (-2 / 3))).toBeLessThan(0.05);
  });
  it('optical theorem: σ = (4π/k²) Re g(0) (tol. 1e-10)', () => {
    for (const ka of [0.3, 2, 9]) {
      const g = farField(ka, 1);
      expect(Math.abs((4 * g[0]) / (ka * ka) / scatteringEfficiency(ka) - 1)).toBeLessThan(1e-10);
    }
  });
  it('rigid surface: total radial velocity vanishes at r = a (finite differences, tol. 1e-5)', () => {
    for (const ka of [1, 5]) {
      const A = rigidSphereCoefficients(ka);
      for (const c of [-0.8, 0, 0.5, 1]) {
        const h = 1e-5;
        const f = (kr: number) => {
          const p = sphereField(ka, kr, c, A);
          return [p.incident[0] + p.scattered[0], p.incident[1] + p.scattered[1]] as const;
        };
        const d = sub(f(ka + h), f(ka));
        const ref = ka; // |∂p_i/∂(kr)| ≤ 1
        expect(abs(d) / h / Math.max(1, ref)).toBeLessThan(1e-4);
      }
    }
  });
  it('far field of the series matches the form function g(θ) (tol. 1 % at kr = 400)', () => {
    const ka = 3;
    const A = rigidSphereCoefficients(ka);
    for (const c of [1, 0.3, -1]) {
      const kr = 400;
      const ps = sphereField(ka, kr, c, A).scattered;
      expect(Math.abs((abs(ps) * kr) / abs(farField(ka, c, A)) - 1)).toBeLessThan(0.01);
    }
  });
});
