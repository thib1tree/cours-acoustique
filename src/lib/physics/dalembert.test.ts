import { describe, expect, it } from 'vitest';
import { decompose, gaussian, pressureAt, velocityAt } from './dalembert';

const c0 = 343;
const Z = 413;
const zero = () => 0;

describe("d'Alembert", () => {
  it('a pulse released at rest splits into two half-amplitude pulses', () => {
    const s = decompose(gaussian(1, 0, 0.05), zero, Z);
    const t = 0.01; // 3.43 m
    expect(pressureAt(s, c0 * t, t, c0)).toBeCloseTo(0.5, 12);
    expect(pressureAt(s, -c0 * t, t, c0)).toBeCloseTo(0.5, 12);
    expect(pressureAt(s, 0, t, c0)).toBeCloseTo(0, 12);
  });

  it('a pulse with v = p/Z travels right with its shape unchanged (tol. 1e-12)', () => {
    const p0 = gaussian(1, 0, 0.05);
    const s = decompose(p0, (x) => p0(x) / Z, Z);
    for (const t of [0.001, 0.004, 0.02])
      for (const x of [-0.1, 0, 0.03, 0.1]) {
        expect(pressureAt(s, x + c0 * t, t, c0)).toBeCloseTo(p0(x), 12);
        expect(pressureAt(s, x - c0 * t, t, c0)).toBeCloseTo(0, 12);
      }
  });

  it('opposite pulses cross: p vanishes everywhere at the crossing, energy is all kinetic', () => {
    const h = gaussian(1, 0, 0.05);
    const L = 1;
    const p0 = (x: number) => h(x + L) - h(x - L);
    const v0 = (x: number) => (h(x + L) + h(x - L)) / Z; // left pulse goes right, right pulse goes left
    const s = decompose(p0, v0, Z);
    const t = L / c0;
    let pMax = 0;
    let vMax = 0;
    for (let x = -0.5; x <= 0.5; x += 0.005) {
      pMax = Math.max(pMax, Math.abs(pressureAt(s, x, t, c0)));
      vMax = Math.max(vMax, Math.abs(velocityAt(s, x, t, c0, Z)));
    }
    expect(pMax).toBeLessThan(1e-12);
    expect(vMax * Z).toBeCloseTo(2, 6);
  });

  it('pulses cross without perturbing each other (superposition)', () => {
    const p0 = (x: number) => gaussian(1, -1, 0.05)(x) + gaussian(0.5, 1, 0.08)(x);
    const v0 = (x: number) => (gaussian(1, -1, 0.05)(x) - gaussian(0.5, 1, 0.08)(x)) / Z;
    const s = decompose(p0, v0, Z);
    const t = 2 / c0; // each pulse has travelled 2 m
    expect(pressureAt(s, 1, t, c0)).toBeCloseTo(1, 10);
    expect(pressureAt(s, -1, t, c0)).toBeCloseTo(0.5, 10);
  });
});
