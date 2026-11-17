import { describe, expect, it } from 'vitest';
import { clampParam, formatNumber, fromUnit, parseNumber, toUnit } from './format';
import { decodeState, encodeState } from './url-state';
import type { ParamSpec, SceneSpec } from './types';

const f: ParamSpec = {
  key: 'f',
  symbol: 'f',
  label: 'fréquence',
  unit: 'Hz',
  min: 20,
  max: 20000,
  step: 1,
  default: 500,
  scale: 'log',
};
const spec: SceneSpec = {
  id: 'demo',
  params: [
    f,
    {
      key: 'L',
      symbol: 'L_p',
      label: 'niveau',
      unit: 'dB',
      min: 0,
      max: 194,
      step: 1,
      default: 94,
    },
  ],
  terms: [{ key: 'inertia', label: 'inertie', toggleable: true }],
  views: [
    {
      key: 'view',
      label: 'vue',
      default: 'both',
      options: [
        { key: 'euler', label: 'E' },
        { key: 'both', label: 'B' },
      ],
    },
  ],
};

describe('scene helpers', () => {
  it('formats numbers the French way with a true minus sign', () => {
    expect(formatNumber(1234.5, 1).replace(/\s/g, ' ')).toMatch(/1.234,5/);
    expect(formatNumber(-3)).toBe('−3');
  });
  it('parses typed numbers with comma or dot', () => {
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('−2')).toBe(-2);
    expect(parseNumber('abc')).toBeNaN();
  });
  it('clamps and snaps to the step', () => {
    expect(clampParam(f, 5)).toBe(20);
    expect(clampParam(f, 499.6)).toBe(500);
  });
  it('log sliders round-trip', () => {
    expect(fromUnit(f, toUnit(f, 1000))).toBeCloseTo(1000, 9);
    expect(toUnit(f, Math.sqrt(20 * 20000))).toBeCloseTo(0.5, 12);
  });
  it('URL state round-trips and omits defaults', () => {
    const s = { params: { f: 500, L: 120 }, terms: { inertia: false }, views: { view: 'euler' } };
    const enc = encodeState(spec, s);
    expect(enc).toBe('L:120;inertia:off;view:euler');
    expect(decodeState(spec, enc)).toEqual({
      params: { L: 120 },
      terms: { inertia: false },
      views: { view: 'euler' },
    });
  });
  it('URL state rejects unknown keys and clamps values', () => {
    expect(decodeState(spec, 'L:999;zz:1;view:nope')).toEqual({
      params: { L: 194 },
      terms: {},
      views: {},
    });
  });
});

import { formatSci } from './format';
describe('formatSci', () => {
  it('uses plain numbers in the readable range and powers of ten outside', () => {
    expect(formatSci(343.2, 3)).toBe('343');
    expect(formatSci(2e-7)).toBe('2,0 × 10⁻⁷');
    expect(formatSci(0.05)).toBe('0,050');
  });
});
