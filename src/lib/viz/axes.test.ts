import { describe, expect, it } from 'vitest';
import { scale, superscript, ticks } from './axes';

describe('axes', () => {
  it('maps linear and log ranges', () => {
    expect(scale({ min: 0, max: 10 }, 0, 100)(5)).toBe(50);
    expect(scale({ min: 1, max: 1000, log: true }, 0, 3)(100)).toBeCloseTo(2, 12);
  });
  it('produces round linear ticks', () => {
    expect(ticks({ min: 0, max: 1 }, 5).map((t) => t.value)).toEqual([
      0, 0.2, 0.4, 0.6000000000000001, 0.8, 1,
    ]);
  });
  it('labels decades with superscripts', () => {
    expect(superscript(-12)).toBe('⁻¹²');
    const t = ticks({ min: 1e4, max: 1e12, log: true }, 4);
    expect(t[0]!.label).toBe('10⁴');
  });
});
