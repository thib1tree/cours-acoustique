import { describe, expect, it } from 'vitest';
import {
  type Chain,
  continuumSpeed,
  createState,
  dispersionOmega,
  energy,
  fixedModeOmega,
  groupSpeed,
  phaseSpeed,
  step,
} from './mass-spring';

describe('mass-spring chain', () => {
  const base = { m: 0.01, K: 100, a: 0.01 };

  it('long waves travel at the continuum speed a√(K/m) (rel. tol. 1e-6)', () => {
    expect(phaseSpeed(base, 1e-3) / continuumSpeed(base)).toBeCloseTo(1, 6);
    expect(groupSpeed(base, 1e-3) / continuumSpeed(base)).toBeCloseTo(1, 6);
  });

  it('phase-speed deficit scales as (ka)²/24 for ka ≪ 1 (rel. tol. 1 %)', () => {
    for (const ka of [0.05, 0.1, 0.2]) {
      const deficit = 1 - phaseSpeed(base, ka / base.a) / continuumSpeed(base);
      expect(deficit / ((ka * ka) / 24)).toBeCloseTo(1, 2);
    }
  });

  it('fluid mapping m = ρSa, K = K_s S/a gives c = √(K_s/ρ) for any a', () => {
    const rho = 1.2;
    const Ks = 1.4 * 101325;
    const S = 1e-4;
    for (const a of [0.1, 0.01, 0.001]) {
      const c = continuumSpeed({ m: rho * S * a, K: (Ks * S) / a, a });
      expect(c / Math.sqrt(Ks / rho)).toBeCloseTo(1, 12);
    }
  });

  it('simulated normal mode oscillates at the lattice frequency (rel. tol. 0.5 %)', () => {
    const chain: Chain = { n: 24, ...base, ends: 'fixed' };
    for (const mode of [1, 5, 20]) {
      const s = createState(chain);
      for (let j = 0; j < chain.n; j++)
        s.u[j] = Math.sin((mode * Math.PI * (j + 1)) / (chain.n + 1));
      const w = fixedModeOmega(chain, mode);
      const dt = 0.01 / w;
      // Track the projection on the mode and time its zero crossings.
      const proj = () =>
        s.u.reduce(
          (acc, u, j) => acc + u * Math.sin((mode * Math.PI * (j + 1)) / (chain.n + 1)),
          0,
        );
      let prev = proj();
      const crossings: number[] = [];
      while (crossings.length < 5) {
        step(chain, s, dt);
        const cur = proj();
        if (prev > 0 !== cur > 0) crossings.push(s.t - dt * (cur / (cur - prev)));
        prev = cur;
      }
      const period = (2 * (crossings[4]! - crossings[0]!)) / 4;
      expect((2 * Math.PI) / period / w).toBeCloseTo(1, 2);
      expect(Math.abs((2 * Math.PI) / period / w - 1)).toBeLessThan(0.005);
    }
  });

  it('velocity Verlet keeps energy bounded (rel. drift < 1e-4 over 10⁴ steps)', () => {
    const chain: Chain = { n: 50, ...base, ends: 'fixed' };
    const s = createState(chain);
    for (let j = 0; j < chain.n; j++) s.u[j] = Math.exp(-((j - 15) ** 2) / 8) * 1e-3;
    const e0 = energy(chain, s);
    step(chain, s, 0.05 * Math.sqrt(base.m / base.K), 10_000);
    expect(Math.abs(energy(chain, s) / e0 - 1)).toBeLessThan(1e-4);
  });

  it('no propagation above the cut-off 2√(K/m)', () => {
    expect(dispersionOmega(base, Math.PI / base.a)).toBeCloseTo(2 * Math.sqrt(base.K / base.m), 10);
  });
});
