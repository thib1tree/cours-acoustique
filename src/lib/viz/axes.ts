/** Axis scales and tick generation (linear and logarithmic), French number format. */
import { formatNumber } from '../scene/format';

export interface AxisSpec {
  readonly min: number;
  readonly max: number;
  readonly log?: boolean;
  readonly label?: string;
}

export function scale(a: AxisSpec, r0: number, r1: number): (v: number) => number {
  if (a.log) {
    const l0 = Math.log10(a.min);
    const l1 = Math.log10(a.max);
    return (v) => r0 + ((Math.log10(Math.max(v, 1e-300)) - l0) / (l1 - l0)) * (r1 - r0);
  }
  return (v) => r0 + ((v - a.min) / (a.max - a.min)) * (r1 - r0);
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const superscript = (n: number): string =>
  (n < 0 ? '⁻' : '') + String(Math.abs(n)).replace(/\d/g, (d) => SUP[Number(d)]!);

export interface Tick {
  value: number;
  label: string | null;
}

export function ticks(a: AxisSpec, target = 6): Tick[] {
  if (a.log) {
    const out: Tick[] = [];
    const e0 = Math.floor(Math.log10(a.min));
    const e1 = Math.ceil(Math.log10(a.max));
    const every = Math.max(1, Math.ceil((e1 - e0) / target));
    for (let e = e0; e <= e1; e++) {
      const v = 10 ** e;
      if (v >= a.min * 0.999 && v <= a.max * 1.001)
        out.push({
          value: v,
          label:
            (e - e0) % every === 0
              ? Math.abs(e) <= 3
                ? formatNumber(v, Math.max(0, -e))
                : `10${superscript(e)}`
              : null,
        });
    }
    return out;
  }
  const span = a.max - a.min;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target) ?? 10 * mag;
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + (step / mag === 2.5 ? 1 : 0));
  const out: Tick[] = [];
  for (let v = Math.ceil(a.min / step) * step; v <= a.max + step * 1e-9; v += step)
    out.push({ value: v, label: formatNumber(Math.abs(v) < step * 1e-9 ? 0 : v, digits) });
  return out;
}
