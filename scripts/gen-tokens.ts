import { writeFileSync } from 'node:fs';
import { paletteCss } from '../src/lib/color/css';

writeFileSync(new URL('../src/styles/palette.css', import.meta.url), paletteCss());
console.log('wrote src/styles/palette.css');
