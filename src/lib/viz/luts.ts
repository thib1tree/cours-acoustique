import { energyMap, pressureMap } from '../color/palette';
import { toRgba8 } from '../color/colormaps';

const cache = new Map<string, Uint8Array>();

/** RGBA8 lookup table for a quantity in a theme (257 samples for pressure, 256 for energy). */
export function lut(kind: 'pressure' | 'energy', theme: 'light' | 'dark'): Uint8Array {
  const key = `${kind}-${theme}`;
  let l = cache.get(key);
  if (!l) {
    l = toRgba8(kind === 'pressure' ? pressureMap(theme) : energyMap(theme));
    cache.set(key, l);
  }
  return l;
}

/** CSS color of a normalized signed value v ∈ [−1, 1] in the pressure map. */
export function pressureColor(v: number, table: Uint8Array): string {
  const n = table.length / 4;
  const x = Math.min(1, Math.max(-1, v));
  const i = Math.round(((x + 1) / 2) * (n - 1)) * 4;
  return `rgb(${table[i]},${table[i + 1]},${table[i + 2]})`;
}
