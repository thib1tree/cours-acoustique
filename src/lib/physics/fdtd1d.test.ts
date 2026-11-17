import { describe, expect, it } from 'vitest';
import {
  type Grid1D,
  createFdtd1D,
  energy1D,
  numericalPhaseSpeed,
  stepFdtd1D,
  timeStep,
} from './fdtd1d';

const rho0 = 1.2;
const c0 = 343;
const Z = rho0 * c0;

function rightGoingPulse(g: Grid1D, center: number, width: number) {
  const s = createFdtd1D(g);
  const dt = timeStep(g);
  for (let i = 0; i < g.n; i++) s.p[i] = Math.exp(-((i - center) ** 2) / (2 * width * width));
  // v at half nodes and at t = −dt/2 for a right-going wave: v(x, t) = p(x − c₀t)/Z.
  for (let i = 1; i < g.n; i++) {
    const x = i - 0.5 + (c0 * dt) / 2 / g.dx;
    s.v[i] = Math.exp(-((x - center) ** 2) / (2 * width * width)) / Z;
  }
  return s;
}

describe('FDTD 1D (staggered p–v)', () => {
  it('rejects unstable Courant numbers', () => {
    expect(() => createFdtd1D({ n: 10, dx: 1, rho0, c0, courant: 1.01 })).toThrow();
  });

  it('at C = 1 a pulse translates exactly (magic time step, tol. 1e-10)', () => {
    const g: Grid1D = { n: 400, dx: 0.01, rho0, c0, courant: 1 };
    const s = rightGoingPulse(g, 100, 8);
    const initial = Float64Array.from(s.p);
    stepFdtd1D(g, s, 150);
    for (let i = 0; i < 240; i++) expect(Math.abs(s.p[i + 150]! - initial[i]!)).toBeLessThan(1e-10);
  });

  it('p = ρ₀c₀ v in the travelling pulse (rel. tol. 1 %)', () => {
    const g: Grid1D = { n: 400, dx: 0.01, rho0, c0, courant: 0.8 };
    const s = rightGoingPulse(g, 100, 10);
    stepFdtd1D(g, s, 200);
    let iMax = 0;
    for (let i = 1; i < g.n; i++) if (s.p[i]! > s.p[iMax]!) iMax = i;
    const vAtNode = 0.5 * (s.v[iMax]! + s.v[iMax + 1]!);
    expect(Math.abs((Z * vAtNode) / s.p[iMax]! - 1)).toBeLessThan(0.01);
  });

  it('conserves energy without walls being hit (rel. tol. 1e-3)', () => {
    const g: Grid1D = { n: 600, dx: 0.01, rho0, c0, courant: 0.5 };
    const s = rightGoingPulse(g, 200, 10);
    const e0 = energy1D(g, s);
    stepFdtd1D(g, s, 300);
    expect(Math.abs(energy1D(g, s) / e0 - 1)).toBeLessThan(1e-3);
  });

  it('numerical dispersion: 10 points per wavelength at C = 0.5 → ~1 % slow', () => {
    const g: Grid1D = { n: 10, dx: 0.01, rho0, c0, courant: 0.5 };
    const k = (2 * Math.PI) / (10 * g.dx);
    const err = 1 - numericalPhaseSpeed(g, k) / c0;
    expect(err).toBeGreaterThan(0.005);
    expect(err).toBeLessThan(0.02);
    expect(numericalPhaseSpeed({ ...g, courant: 1 }, k) / c0).toBeCloseTo(1, 12);
  });
});
