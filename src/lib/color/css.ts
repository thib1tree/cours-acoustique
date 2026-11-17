/**
 * Generates the CSS custom properties of the semantic palette from `palette.ts`.
 * Output is committed as `src/styles/palette.css`; a test fails if it drifts.
 */
import { type LCh, lchToLab, toCssGradient } from './colormaps';
import { oklabToSrgb, rgbToHex } from './oklab';
import { PALETTES, type Theme, type ThemePalette, energyMap, pressureMap } from './palette';

const hex = (c: LCh) => rgbToHex(oklabToSrgb(lchToLab(c)));

const NAMES: Record<Exclude<keyof ThemePalette, 'energyRamp'>, string> = {
  bg: '--color-bg',
  surface: '--color-surface',
  ink: '--color-ink',
  inkMuted: '--color-ink-muted',
  rule: '--color-rule',
  pressureNeg: '--color-pressure-neg',
  pressurePos: '--color-pressure-pos',
  velocity: '--color-velocity',
  energy: '--color-energy',
};

function block(theme: Theme): string {
  const p = PALETTES[theme];
  const lines = Object.entries(NAMES).map(
    ([k, v]) => `  ${v}: ${hex(p[k as keyof typeof NAMES])};`,
  );
  lines.push(`  --gradient-pressure: ${toCssGradient(pressureMap(theme), 9)};`);
  lines.push(`  --gradient-energy: ${toCssGradient(energyMap(theme), 9)};`);
  return lines.join('\n');
}

export function paletteCss(): string {
  return `/* Generated from src/lib/color/palette.ts by \`pnpm gen:tokens\`. Do not edit by hand. */

:root,
:root[data-theme='light'] {
  color-scheme: light;
${block('light')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
${block('dark')
  .split('\n')
  .map((l) => '  ' + l)
  .join('\n')}
  }
}

:root[data-theme='dark'] {
  color-scheme: dark;
${block('dark')}
}
`;
}
