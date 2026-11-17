import type { ParamSpec } from './types';

const nf = new Map<number, Intl.NumberFormat>();

/** French number formatting (comma decimal separator, narrow no-break space thousands). */
export function formatNumber(x: number, digits = 0): string {
  let f = nf.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    nf.set(digits, f);
  }
  return f.format(x).replace('-', '−');
}

export const formatParam = (p: ParamSpec, v: number): string => formatNumber(v, p.digits ?? 0);

/** Parse a number typed by a reader ("1,5", "1.5", "−3"). Returns NaN if invalid. */
export function parseNumber(s: string): number {
  const clean = s
    .replace(/\s| | /g, '')
    .replace('−', '-')
    .replace(',', '.');
  return clean === '' ? NaN : Number(clean);
}

export function clampParam(p: ParamSpec, v: number): number {
  const clamped = Math.min(p.max, Math.max(p.min, v));
  const k = Math.round((clamped - p.min) / p.step);
  return Number((p.min + k * p.step).toFixed(10));
}

/** Map a parameter value to slider position 0..1 (log or linear). */
export function toUnit(p: ParamSpec, v: number): number {
  if (p.scale === 'log') return Math.log(v / p.min) / Math.log(p.max / p.min);
  return (v - p.min) / (p.max - p.min);
}

export function fromUnit(p: ParamSpec, u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return p.scale === 'log' ? p.min * (p.max / p.min) ** x : p.min + x * (p.max - p.min);
}
