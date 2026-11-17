/**
 * Perceptually uniform colormaps built as polylines in OKLab.
 *
 * Sampling a straight segment in OKLab at equal arc length gives exactly equal ΔE_OK
 * between consecutive samples, which is what "perceptually uniform" means here. Each
 * half of a diverging map is sampled independently, so both signs of a signed quantity
 * get the same perceptual contrast per unit of |value|.
 */
import { type Lab, type RGB, deltaE, oklabToLinearRgb, oklabToSrgb } from './oklab';

/** OKLCh color: lightness 0..1, chroma ≥ 0, hue in degrees. */
export interface LCh {
  readonly L: number;
  readonly C: number;
  readonly h: number;
}

export const lchToLab = ({ L, C, h }: LCh): Lab => {
  const r = (h * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
};

/** True when an OKLab color lies inside the sRGB gamut (with a small tolerance). */
export function inSrgbGamut(lab: Lab, eps = 1e-4): boolean {
  return oklabToLinearRgb(lab).every((c) => c >= -eps && c <= 1 + eps);
}

/** Sample a polyline in OKLab at `n` points equally spaced in arc length. */
export function samplePolyline(stops: readonly Lab[], n: number): Lab[] {
  if (stops.length < 2 || n < 2) throw new RangeError('need ≥ 2 stops and ≥ 2 samples');
  const seg: number[] = [];
  for (let i = 1; i < stops.length; i++) seg.push(deltaE(stops[i - 1]!, stops[i]!));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Lab[] = [];
  for (let k = 0; k < n; k++) {
    let s = (total * k) / (n - 1);
    let i = 0;
    while (i < seg.length - 1 && s > seg[i]!) s -= seg[i++]!;
    const t = seg[i]! === 0 ? 0 : Math.min(1, s / seg[i]!);
    const a = stops[i]!;
    const b = stops[i + 1]!;
    out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
  }
  return out;
}

export interface Colormap {
  readonly name: string;
  readonly kind: 'diverging' | 'sequential';
  /** Samples in OKLab, from minimum to maximum of the mapped quantity. */
  readonly lab: readonly Lab[];
}

/**
 * Diverging map: negative end → center → positive end. `n` must be odd so the center
 * (zero of the signed quantity) is an exact sample.
 */
export function diverging(name: string, neg: LCh, center: LCh, pos: LCh, n = 257): Colormap {
  if (n % 2 === 0) throw new RangeError('diverging maps need an odd sample count');
  const half = (n + 1) / 2;
  const left = samplePolyline([lchToLab(neg), lchToLab(center)], half);
  const right = samplePolyline([lchToLab(center), lchToLab(pos)], half);
  return { name, kind: 'diverging', lab: [...left, ...right.slice(1)] };
}

export function sequential(name: string, stops: readonly LCh[], n = 256): Colormap {
  return { name, kind: 'sequential', lab: samplePolyline(stops.map(lchToLab), n) };
}

/** sRGB samples of a colormap. */
export const toRgb = (map: Colormap): RGB[] => map.lab.map(oklabToSrgb);

/** RGBA8 lookup table, ready to upload as a 1D (N×1) texture. */
export function toRgba8(map: Colormap): Uint8Array {
  const rgb = toRgb(map);
  const out = new Uint8Array(rgb.length * 4);
  rgb.forEach(([r, g, b], i) => {
    out[4 * i] = Math.round(r * 255);
    out[4 * i + 1] = Math.round(g * 255);
    out[4 * i + 2] = Math.round(b * 255);
    out[4 * i + 3] = 255;
  });
  return out;
}

/** CSS linear-gradient stops, for legends. */
export function toCssGradient(map: Colormap, stops = 9, direction = 'to right'): string {
  const rgb = toRgb(map);
  const parts: string[] = [];
  for (let k = 0; k < stops; k++) {
    const i = Math.round(((rgb.length - 1) * k) / (stops - 1));
    const [r, g, b] = rgb[i]!;
    parts.push(
      `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}) ${((100 * k) / (stops - 1)).toFixed(1)}%`,
    );
  }
  return `linear-gradient(${direction}, ${parts.join(', ')})`;
}
