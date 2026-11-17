/** Minimal complex arithmetic for phasors (allocation-light, immutable tuples). */
export type Complex = readonly [re: number, im: number];

export const C = (re: number, im = 0): Complex => [re, im];
export const re = (z: Complex): number => z[0];
export const im = (z: Complex): number => z[1];
export const add = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Complex, b: Complex): Complex => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
export const scale = (a: Complex, s: number): Complex => [a[0] * s, a[1] * s];
export const conj = (a: Complex): Complex => [a[0], -a[1]];
export const abs = (a: Complex): number => Math.hypot(a[0], a[1]);
export const arg = (a: Complex): number => Math.atan2(a[1], a[0]);
/** e^{iθ}. */
export const cis = (theta: number): Complex => [Math.cos(theta), Math.sin(theta)];
export const div = (a: Complex, b: Complex): Complex => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
/** Principal square root. */
export const sqrtC = (a: Complex): Complex => {
  const r = abs(a);
  const re = Math.sqrt((r + a[0]) / 2);
  const im = Math.sign(a[1] || 1) * Math.sqrt(Math.max(0, (r - a[0]) / 2));
  return [re, im];
};
export const expC = (a: Complex): Complex => scale(cis(a[1]), Math.exp(a[0]));
