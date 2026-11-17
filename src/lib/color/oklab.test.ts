import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, oklabToSrgb, rgbToHex, srgbToOklab } from './oklab';

describe('OKLab', () => {
  it('maps white to L = 1, a = b = 0 (tol. 1e-4)', () => {
    const [L, a, b] = srgbToOklab([1, 1, 1]);
    expect(L).toBeCloseTo(1, 4);
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });
  it('round-trips sRGB colors (tol. 1/255)', () => {
    for (const hex of ['#2F5BD3', '#C0265E', '#0E8A7E', '#D2961B', '#F6F7F9', '#1D2330']) {
      expect(rgbToHex(oklabToSrgb(srgbToOklab(hexToRgb(hex))))).toBe(hex);
    }
  });
  it('WCAG contrast of black on white is 21:1', () => {
    expect(contrastRatio([0, 0, 0], [1, 1, 1])).toBeCloseTo(21, 10);
  });
});
