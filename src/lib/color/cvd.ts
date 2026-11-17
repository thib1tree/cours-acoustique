/**
 * Color-vision-deficiency simulation, Machado, Oliveira & Fernandes (2009),
 * "A physiologically-based model for simulation of color vision deficiency",
 * IEEE TVCG 15(6). Matrices for severity 1.0, applied in linear RGB.
 */
import { type RGB, linearToSrgb, srgbToLinear } from './oklab';

export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia';

const MATRICES: Record<Deficiency, readonly number[]> = {
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
};

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function simulateCvd(c: RGB, kind: Deficiency): RGB {
  const M = MATRICES[kind];
  const r = srgbToLinear(c[0]);
  const g = srgbToLinear(c[1]);
  const b = srgbToLinear(c[2]);
  const row = (i: number) => M[i]! * r + M[i + 1]! * g + M[i + 2]! * b;
  return [
    clamp01(linearToSrgb(clamp01(row(0)))),
    clamp01(linearToSrgb(clamp01(row(3)))),
    clamp01(linearToSrgb(clamp01(row(6)))),
  ];
}
