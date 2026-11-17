import { describe, expect, it } from 'vitest';
import {
  type Grid2D,
  continuumModeOmegaDt,
  createFdtd2D,
  discreteModeOmegaDt,
  stepFdtd2D,
} from './fdtd2d';

function measureModeOmegaDt(g: Grid2D, m: number, n: number): number {
  const s = createFdtd2D(g);
  const mode = (i: number, j: number) =>
    Math.cos((m * Math.PI * i) / (g.nx - 1)) * Math.cos((n * Math.PI * j) / (g.ny - 1));
  const w = discreteModeOmegaDt(g, m, n);
  for (let j = 0; j < g.ny; j++)
    for (let i = 0; i < g.nx; i++) {
      s.curr[j * g.nx + i] = mode(i, j);
      s.prev[j * g.nx + i] = mode(i, j) * Math.cos(w); // exact previous time level
    }
  const proj = () => {
    let a = 0;
    for (let j = 0; j < g.ny; j++)
      for (let i = 0; i < g.nx; i++) a += s.curr[j * g.nx + i]! * mode(i, j);
    return a;
  };
  let prev = proj();
  const crossings: number[] = [];
  while (crossings.length < 3) {
    stepFdtd2D(g, s);
    const cur = proj();
    if (prev > 0 !== cur > 0) crossings.push(s.steps - cur / (cur - prev));
    prev = cur;
  }
  return Math.PI / ((crossings[2]! - crossings[0]!) / 2);
}

describe('FDTD 2D (leapfrog, rigid walls)', () => {
  it('rejects C > 1/√2', () => {
    expect(() => createFdtd2D({ nx: 8, ny: 8, courant: 0.72 })).toThrow();
  });

  it('cavity modes oscillate at the exact discrete frequency (rel. tol. 1e-3)', () => {
    const g: Grid2D = { nx: 41, ny: 31, courant: 0.5 };
    for (const [m, n] of [
      [1, 0],
      [2, 1],
      [3, 3],
    ] as const) {
      expect(measureModeOmegaDt(g, m, n) / discreteModeOmegaDt(g, m, n)).toBeCloseTo(1, 3);
    }
  });

  it('low modes match the continuum cavity frequencies (rel. tol. 0.5 %)', () => {
    const g: Grid2D = { nx: 81, ny: 61, courant: 0.5 };
    for (const [m, n] of [
      [1, 0],
      [1, 1],
      [2, 1],
    ] as const) {
      const r = measureModeOmegaDt(g, m, n) / continuumModeOmegaDt(g, m, n);
      expect(Math.abs(r - 1)).toBeLessThan(0.005);
    }
  });
});
