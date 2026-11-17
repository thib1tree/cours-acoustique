import { describe, expect, it } from 'vitest';
import { tubeField, tubeModel } from './tube';

const s = { rho0: 1.204, c0: 343.2, omega: 2 * Math.PI * 500, P: 1.41, R: 0, length: 1.7 };

describe('tube models', () => {
  it('maps term switches to models', () => {
    expect(tubeModel(true, true)).toBe('wave');
    expect(tubeModel(true, false)).toBe('incompressible');
    expect(tubeModel(false, true)).toBe('massless');
    expect(tubeModel(false, false)).toBe('none');
  });

  it('all models share the same piston motion at x = 0', () => {
    const fields = (['wave', 'incompressible', 'massless'] as const).map((m) => tubeField(m, s));
    for (const t of [0, 1e-4, 7e-4]) {
      const v0 = fields[0]!.v(0, t);
      for (const f of fields) expect(f.v(0, t)).toBeCloseTo(v0, 12);
      const x0 = fields[0]!.xi(0, t);
      for (const f of fields) expect(f.xi(0, t)).toBeCloseTo(x0, 12);
    }
  });

  it('displacement is the time integral of velocity (wave model, rel. tol. 1e-6)', () => {
    const f = tubeField('wave', { ...s, R: 0.4 });
    const h = 1e-8;
    for (const [x, t] of [
      [0.3, 1e-4],
      [1.1, 3e-4],
    ] as const) {
      expect((f.xi(x, t + h) - f.xi(x, t - h)) / (2 * h) / f.v(x, t)).toBeCloseTo(1, 5);
    }
  });

  it('incompressible column obeys ρ₀ ∂v/∂t = −∂p/∂x (tol. 1e-6)', () => {
    const f = tubeField('incompressible', s);
    const h = 1e-7;
    for (const [x, t] of [
      [0.2, 1e-4],
      [1.0, 6e-4],
    ] as const) {
      const dvdt = (f.v(x, t + h) - f.v(x, t - h)) / (2 * h);
      const dpdx = (f.p(x + h, t) - f.p(x - h, t)) / (2 * h);
      expect((s.rho0 * dvdt) / -dpdx).toBeCloseTo(1, 5);
    }
  });

  it('accelerating the whole column takes kℓ times the wave pressure', () => {
    const k = s.omega / s.c0;
    const inc = tubeField('incompressible', s);
    const pMax = Math.abs(inc.p(0, Math.PI / 2 / s.omega));
    expect(pMax / s.P).toBeCloseTo(k * s.length, 10);
  });
});
