import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { paletteCss } from './css';

it('src/styles/palette.css is in sync with palette.ts (run `pnpm gen:tokens`)', () => {
  const onDisk = readFileSync(new URL('../../styles/palette.css', import.meta.url), 'utf8');
  expect(onDisk).toBe(paletteCss());
});
