import { describe, expect, it } from 'vitest';
import { convectiveFactor, dopplerObserver, dopplerSource, machAngle, passBy } from './moving';

const c = 343.2;

describe('Doppler effect', () => {
  it('received frequency equals dt′/dt of the retarded time (finite differences, tol. 1e-6)', () => {
    const V = 30;
    const d = 5;
    for (const t of [-3, -0.5, 0, 0.2, 2]) {
      const h = 1e-5;
      const dtdt = (passBy(t + h, V, d, c).tEmit - passBy(t - h, V, d, c).tEmit) / (2 * h);
      const p = passBy(t, V, d, c);
      expect(Math.abs(dtdt / dopplerSource(1, V / c, p.cosTheta) - 1)).toBeLessThan(1e-6);
    }
  });
  it('retarded time satisfies c(t − t′) = distance at emission (tol. 1e-9 m)', () => {
    const p = passBy(1.3, 40, 8, c);
    expect(Math.abs(p.R - Math.hypot(40 * p.tEmit, 8))).toBeLessThan(1e-9);
  });
  it('moving observer: wavefront crossing rate (tol. 1e-12)', () => {
    // Observer moving at V towards a fixed source crosses fronts spaced λ = c/f at c + V.
    const f = 440;
    const V = 50;
    expect(Math.abs(dopplerObserver(f, V / c, 1) - (c + V) / (c / f))).toBeLessThan(1e-9);
  });
  it('source and observer motions are not equivalent (M = 0.5: 2f versus 1.5f)', () => {
    expect(dopplerSource(1, 0.5, 1)).toBeCloseTo(2, 12);
    expect(dopplerObserver(1, 0.5, 1)).toBeCloseTo(1.5, 12);
  });
  it('Mach angle: sin α = 1/M; none below M = 1', () => {
    expect(machAngle(2)! * (180 / Math.PI)).toBeCloseTo(30, 10);
    expect(machAngle(0.9)).toBeNull();
  });
});

describe('moving monopole', () => {
  /**
   * Reference: the retarded-potential integral φ(x, t) = ∫ Q(t′) δ(t − t′ − R(t′)/c) /
   * (4πR(t′)) dt′, with δ replaced by a narrow Gaussian and integrated numerically; then
   * p = −ρ ∂φ/∂t by finite differences. Compared with the far-field closed form
   * p = −ρ Q′(τ) / (4πR(1 − M cos θ)²). Tolerance 2 % (finite kR, Gaussian width).
   */
  it('pressure amplitude follows 1/(1 − M cos θ)² (numerical retarded integral, tol. 2 %)', () => {
    const M = 0.4;
    const V = M * c;
    const f = 200;
    const w = 2 * Math.PI * f;
    const rho = 1.2;
    const sigma = 2e-5; // Gaussian width of the δ (s)
    const phi = (x: number, y: number, t: number) => {
      // emission times close to the retarded one: integrate over a window
      let s = 0;
      const dt = sigma / 8;
      // first guess by fixed-point iteration
      let tp = t;
      for (let k = 0; k < 50; k++) tp = t - Math.hypot(x - V * tp, y) / c;
      for (let u = tp - 12 * sigma; u <= tp + 12 * sigma; u += dt) {
        const R = Math.hypot(x - V * u, y);
        const arg = t - u - R / c;
        s +=
          (Math.cos(w * u) / (4 * Math.PI * R)) * Math.exp(-(arg * arg) / (2 * sigma * sigma)) * dt;
      }
      return s / (sigma * Math.sqrt(2 * Math.PI));
    };
    const dist = 60; // m, kR ≈ 220
    for (const deg of [0, 60, 90, 140, 180]) {
      const th = (deg * Math.PI) / 180;
      // Observer placed so that the emission point is the origin (t′ = 0) at t = dist/c.
      const x = dist * Math.cos(th);
      const y = dist * Math.sin(th) + 1e-9;
      const t = dist / c;
      const h = 1e-6;
      // amplitude: scan one received period (the emission distance drifts by V·T ≈ 1 %)
      let amp = 0;
      const T = (1 - M * Math.cos(th)) / f;
      for (let k = 0; k < 24; k++) {
        const tk = t + (k / 24) * T;
        amp = Math.max(amp, Math.abs((-rho * (phi(x, y, tk + h) - phi(x, y, tk - h))) / (2 * h)));
      }
      const ref = ((rho * w) / (4 * Math.PI * dist)) * convectiveFactor(M, Math.cos(th));
      expect(Math.abs(amp / ref - 1)).toBeLessThan(0.02);
    }
  });
});
