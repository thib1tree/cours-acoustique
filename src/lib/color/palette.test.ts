import { describe, expect, it } from 'vitest';
import { PALETTES, type Theme, energyMap, pressureMap } from './palette';
import { type LCh, inSrgbGamut, lchToLab, toRgb } from './colormaps';
import { contrastRatio, deltaE, oklabToSrgb, srgbToOklab } from './oklab';
import { type Deficiency, simulateCvd } from './cvd';

const THEMES: Theme[] = ['light', 'dark'];
const DEFICIENCIES: Deficiency[] = ['protanopia', 'deuteranopia', 'tritanopia'];
const rgb = (c: LCh) => oklabToSrgb(lchToLab(c));

describe.each(THEMES)('%s palette', (theme) => {
  const p = PALETTES[theme];

  it('every named color is inside the sRGB gamut', () => {
    for (const [k, v] of Object.entries(p)) {
      const list = Array.isArray(v) ? (v as LCh[]) : [v as LCh];
      for (const c of list) expect(inSrgbGamut(lchToLab(c)), k).toBe(true);
    }
  });

  it('text contrast: ink ≥ 7:1 (AAA), muted ink ≥ 4.5:1 (AA), on bg and surface', () => {
    for (const ground of [p.bg, p.surface]) {
      expect(contrastRatio(rgb(p.ink), rgb(ground))).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(rgb(p.inkMuted), rgb(ground))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('physical line colors reach the 3:1 non-text contrast (WCAG 1.4.11)', () => {
    for (const c of [p.pressureNeg, p.pressurePos, p.velocity, p.energy]) {
      expect(contrastRatio(rgb(c), rgb(p.bg))).toBeGreaterThanOrEqual(3);
    }
  });

  it('pressure poles are symmetric in lightness (|ΔL| < 0.01)', () => {
    expect(Math.abs(p.pressureNeg.L - p.pressurePos.L)).toBeLessThan(0.01);
  });

  describe('pressure map', () => {
    const map = pressureMap(theme);
    const mid = (map.lab.length - 1) / 2;

    it('is centered exactly on the page background', () => {
      expect(deltaE(map.lab[mid]!, lchToLab(p.bg))).toBeLessThan(1e-12);
    });

    it('stays in gamut and is perceptually uniform within each half (step ratio < 1.001)', () => {
      for (const lab of map.lab) expect(inSrgbGamut(lab)).toBe(true);
      for (const [a, b] of [
        [0, mid],
        [mid, map.lab.length - 1],
      ] as const) {
        const steps: number[] = [];
        for (let i = a + 1; i <= b; i++) steps.push(deltaE(map.lab[i - 1]!, map.lab[i]!));
        expect(Math.max(...steps) / Math.min(...steps)).toBeLessThan(1.001);
      }
    });

    it('gives both signs the same perceptual range (within 10 %)', () => {
      const left = deltaE(map.lab[0]!, map.lab[mid]!);
      const right = deltaE(map.lab[mid]!, map.lab[map.lab.length - 1]!);
      expect(Math.abs(left / right - 1)).toBeLessThan(0.1);
    });

    it.each(DEFICIENCIES)('remains readable under simulated %s', (kind) => {
      const sim = toRgb(map).map((c) => srgbToOklab(simulateCvd(c, kind)));
      // The two signs stay distinguishable.
      expect(deltaE(sim[0]!, sim[sim.length - 1]!)).toBeGreaterThan(0.1);
      // |p| stays readable: distance to the center grows monotonically along each half.
      for (let i = mid + 1; i < sim.length; i++) {
        expect(deltaE(sim[i]!, sim[mid]!)).toBeGreaterThan(deltaE(sim[i - 1]!, sim[mid]!));
      }
      for (let i = mid - 1; i >= 0; i--) {
        expect(deltaE(sim[i]!, sim[mid]!)).toBeGreaterThan(deltaE(sim[i + 1]!, sim[mid]!));
      }
    });
  });

  describe('energy map', () => {
    const map = energyMap(theme);
    it('is in gamut with monotonic lightness', () => {
      const sign = Math.sign(map.lab[map.lab.length - 1]![0] - map.lab[0]![0]);
      for (let i = 0; i < map.lab.length; i++) {
        expect(inSrgbGamut(map.lab[i]!)).toBe(true);
        if (i > 0) expect(sign * (map.lab[i]![0] - map.lab[i - 1]![0])).toBeGreaterThan(0);
      }
    });
    it('is perceptually uniform (step ratio < 1.001 away from polyline corners, < 1.1 at corners)', () => {
      const steps: number[] = [];
      for (let i = 1; i < map.lab.length; i++) steps.push(deltaE(map.lab[i - 1]!, map.lab[i]!));
      steps.sort((a, b) => a - b);
      // A step straddling a corner is a chord, slightly shorter than the arc it spans.
      const corners = PALETTES[theme].energyRamp.length - 2;
      const regular = steps.slice(corners);
      expect(Math.max(...regular) / Math.min(...regular)).toBeLessThan(1.001);
      expect(Math.max(...steps) / Math.min(...steps)).toBeLessThan(1.1);
    });
  });
});
