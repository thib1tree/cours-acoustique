/**
 * Semantic palette of the course: single source of truth for physical-quantity colors.
 *
 * Rule (CLAUDE.md § 8): color is reserved for physical quantities and interactive state.
 * The interface itself stays neutral (bg, surface, ink, rule).
 * `src/styles/tokens.css` mirrors these values; a unit test keeps them in sync.
 */
import { type Colormap, type LCh, diverging, sequential } from './colormaps';

export type Theme = 'light' | 'dark';

export interface ThemePalette {
  /** Page background; also the zero of the pressure map ("symmetric around the page"). */
  readonly bg: LCh;
  /** Slightly darker/lighter plate behind visualizations. */
  readonly surface: LCh;
  readonly ink: LCh;
  readonly inkMuted: LCh;
  readonly rule: LCh;
  /** Rarefaction, p < 0. */
  readonly pressureNeg: LCh;
  /** Compression, p > 0. */
  readonly pressurePos: LCh;
  /** Particle velocity (curves, vectors). */
  readonly velocity: LCh;
  /** Energy and intensity (curves, arrows). */
  readonly energy: LCh;
  /** Stops of the sequential energy map, low → high. */
  readonly energyRamp: readonly LCh[];
}

export const PALETTES: Record<Theme, ThemePalette> = {
  light: {
    bg: { L: 0.975, C: 0.003, h: 265 },
    surface: { L: 0.955, C: 0.005, h: 265 },
    ink: { L: 0.26, C: 0.026, h: 265 },
    inkMuted: { L: 0.48, C: 0.022, h: 265 },
    rule: { L: 0.88, C: 0.008, h: 265 },
    pressureNeg: { L: 0.52, C: 0.19, h: 265 },
    pressurePos: { L: 0.52, C: 0.19, h: 5 },
    velocity: { L: 0.53, C: 0.088, h: 184 },
    energy: { L: 0.62, C: 0.125, h: 72 },
    energyRamp: [
      { L: 0.975, C: 0.003, h: 265 },
      { L: 0.84, C: 0.13, h: 82 },
      { L: 0.6, C: 0.135, h: 62 },
      { L: 0.36, C: 0.075, h: 40 },
    ],
  },
  dark: {
    bg: { L: 0.18, C: 0.028, h: 265 },
    surface: { L: 0.21, C: 0.03, h: 265 },
    ink: { L: 0.93, C: 0.008, h: 265 },
    inkMuted: { L: 0.72, C: 0.018, h: 265 },
    rule: { L: 0.32, C: 0.025, h: 265 },
    pressureNeg: { L: 0.7, C: 0.14, h: 262 },
    pressurePos: { L: 0.7, C: 0.165, h: 5 },
    velocity: { L: 0.76, C: 0.11, h: 184 },
    energy: { L: 0.8, C: 0.14, h: 78 },
    energyRamp: [
      { L: 0.18, C: 0.028, h: 265 },
      { L: 0.42, C: 0.09, h: 45 },
      { L: 0.72, C: 0.145, h: 70 },
      { L: 0.94, C: 0.07, h: 95 },
    ],
  },
};

export function pressureMap(theme: Theme, n = 257): Colormap {
  const p = PALETTES[theme];
  return diverging(`pressure-${theme}`, p.pressureNeg, p.bg, p.pressurePos, n);
}

export function energyMap(theme: Theme, n = 256): Colormap {
  return sequential(`energy-${theme}`, PALETTES[theme].energyRamp, n);
}
