/**
 * Chapter 8: sound transmission through walls (convention e^{−iωt}).
 * A thin plate of surface mass m (kg/m²) and bending stiffness D (N·m) separates two
 * half-spaces of the same fluid; an oblique plane wave at angle θ forces a bending wave
 * of wavenumber k sin θ (trace matching, chapter 2).
 */
import { type Complex, C, add, div, mul, sub, cis, scale, abs } from './complex';
import { delanyBazley } from './absorption';

export interface Plate {
  /** surface mass (kg/m²) */
  m: number;
  /** bending stiffness (N·m) */
  D: number;
  /** loss factor */
  eta: number;
}

/** Bending stiffness D = E h³ / (12 (1 − ν²)). */
export const bendingStiffness = (E: number, h: number, nu: number): number =>
  (E * h ** 3) / (12 * (1 - nu * nu));

/** Free bending wavenumber k_B = (m ω²/D)^{1/4}: dispersive, c_B = ω/k_B ∝ √ω. */
export const bendingWavenumber = (omega: number, p: Pick<Plate, 'm' | 'D'>): number =>
  Math.pow((p.m * omega * omega) / p.D, 0.25);

/** Coincidence (critical) frequency c²/(2π) √(m/D): bending waves as fast as sound. */
export const coincidenceFrequency = (c: number, p: Pick<Plate, 'm' | 'D'>): number =>
  ((c * c) / (2 * Math.PI)) * Math.sqrt(p.m / p.D);

export interface WallTerms {
  /** bending stiffness term */
  bending: boolean;
  /** structural damping (loss factor) */
  damping: boolean;
}

/**
 * Wall impedance p_diff / v for a trace wavenumber k sin θ:
 * Z = −iωm + i D(1 − iη) (k sin θ)⁴ / ω (mass, then bending stiffness with damping).
 */
export function wallImpedance(
  f: number,
  theta: number,
  p: Plate,
  c: number,
  terms: WallTerms = { bending: true, damping: true },
): Complex {
  const w = 2 * Math.PI * f;
  const kx = (w / c) * Math.sin(theta);
  let Z: Complex = C(0, -w * p.m);
  if (terms.bending) {
    const eta = terms.damping ? p.eta : 0;
    const s = (p.D * kx ** 4) / w;
    Z = add(Z, mul(C(0, s), C(1, -eta)));
  }
  return Z;
}

/** Transmitted pressure amplitude T = 1 / (1 + Z cos θ / (2ρc)) (reflected R = 1 − T). */
export function wallTransmission(
  f: number,
  theta: number,
  p: Plate,
  rho: number,
  c: number,
  terms?: WallTerms,
): Complex {
  const Z = wallImpedance(f, theta, p, c, terms);
  return div(C(1), add(C(1), scale(Z, Math.cos(theta) / (2 * rho * c))));
}

/** Transmission loss (dB) at one angle. */
export function transmissionLoss(
  f: number,
  theta: number,
  p: Plate,
  rho: number,
  c: number,
  terms?: WallTerms,
): number {
  return -20 * Math.log10(abs(wallTransmission(f, theta, p, rho, c, terms)));
}

/**
 * Diffuse-field transmission loss: τ averaged with the weight sin θ cos θ over
 * 0 ≤ θ ≤ θmax (θmax = 90° for a true diffuse field; ≈ 78° for the usual "field
 * incidence", TODO-VERIFY). In the variable s = cos θ the weight is s ds. τ has two
 * narrow features: the rise to 1 at grazing incidence (s → 0, width ≈ 2ρc/ωm) and, above
 * coincidence, the peak at s₀ = √(1 − f_c/f). Adaptive Simpson on [cos θmax, s₀] and
 * [s₀, 1] resolves both (relative tolerance `tol`).
 */
export function diffuseTL(
  f: number,
  p: Plate,
  rho: number,
  c: number,
  terms: WallTerms = { bending: true, damping: true },
  thetaMax = Math.PI / 2,
  tol = 1e-4,
): number {
  const g = (s: number) =>
    s * abs(wallTransmission(f, Math.acos(Math.min(1, Math.max(0, s))), p, rho, c, terms)) ** 2;
  const s0 = Math.cos(thetaMax);
  const fc = coincidenceFrequency(c, p);
  const breaks = [s0];
  if (terms.bending && f > fc) {
    const sc = Math.sqrt(1 - fc / f);
    if (sc > s0) breaks.push(sc);
  }
  breaks.push(1);
  let integral = 0;
  for (let i = 0; i + 1 < breaks.length; i++)
    integral += adaptiveSimpson(g, breaks[i]!, breaks[i + 1]!, tol);
  const norm = (1 - s0 * s0) / 2; // ∫ s ds
  return -10 * Math.log10(integral / norm);
}

function adaptiveSimpson(fn: (x: number) => number, a: number, b: number, tol: number): number {
  const fa = fn(a);
  const fb = fn(b);
  const m = (a + b) / 2;
  const fm = fn(m);
  const whole = ((b - a) / 6) * (fa + 4 * fm + fb);
  // seed with a few uniform panels so that narrow features are not missed
  const panels = 16;
  let sum = 0;
  for (let k = 0; k < panels; k++) {
    const x0 = a + ((b - a) * k) / panels;
    const x1 = a + ((b - a) * (k + 1)) / panels;
    const y0 = fn(x0);
    const y1 = fn(x1);
    const xm = (x0 + x1) / 2;
    const ym = fn(xm);
    sum += refine(
      fn,
      x0,
      x1,
      y0,
      ym,
      y1,
      ((x1 - x0) / 6) * (y0 + 4 * ym + y1),
      Math.max(1e-15, tol * Math.abs(whole)),
      40,
    );
  }
  return sum;
}

function refine(
  fn: (x: number) => number,
  a: number,
  b: number,
  fa: number,
  fm: number,
  fb: number,
  whole: number,
  eps: number,
  depth: number,
): number {
  const m = (a + b) / 2;
  const lm = (a + m) / 2;
  const rm = (m + b) / 2;
  const flm = fn(lm);
  const frm = fn(rm);
  const left = ((m - a) / 6) * (fa + 4 * flm + fm);
  const right = ((b - m) / 6) * (fm + 4 * frm + fb);
  if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps)
    return left + right + (left + right - whole) / 15;
  return (
    refine(fn, a, m, fa, flm, fm, left, eps / 2, depth - 1) +
    refine(fn, m, b, fm, frm, fb, right, eps / 2, depth - 1)
  );
}

/** Normal-incidence mass law, 20 log₁₀(ωm / 2ρc) (valid for ωm ≫ 2ρc). */
export const massLaw = (f: number, m: number, rho: number, c: number): number =>
  20 * Math.log10((2 * Math.PI * f * m) / (2 * rho * c));

/* ---------- Layered walls (normal incidence, transfer matrices) ---------- */

/** 2×2 complex matrix [[a, b], [c, d]] acting on (p, v). */
type M2 = readonly [Complex, Complex, Complex, Complex];
const mm = (A: M2, B: M2): M2 => [
  add(mul(A[0], B[0]), mul(A[1], B[2])),
  add(mul(A[0], B[1]), mul(A[1], B[3])),
  add(mul(A[2], B[0]), mul(A[3], B[2])),
  add(mul(A[2], B[1]), mul(A[3], B[3])),
];

/** Limp mass layer: p_left − p_right = −iωm v. */
const massMatrix = (f: number, m: number): M2 => [C(1), C(0, -2 * Math.PI * f * m), C(0), C(1)];

/** Fluid layer of thickness d, wavenumber k and characteristic impedance Zc (may be complex). */
function fluidMatrix(k: Complex, Zc: Complex, d: number): M2 {
  // cos(kd), sin(kd) for complex kd
  const kd = scale(k, d);
  const eip = cis(kd[0]);
  const g = Math.exp(-kd[1]);
  const e1: Complex = scale(eip, g); // e^{ikd}
  const e2: Complex = scale([eip[0], -eip[1]], 1 / g); // e^{−ikd}
  const cosk = scale(add(e1, e2), 0.5);
  const sink = div(sub(e1, e2), C(0, 2));
  const mi: Complex = C(0, -1);
  return [cosk, mul(mi, mul(Zc, sink)), mul(mi, div(sink, Zc)), cosk];
}

export interface DoubleWall {
  m1: number;
  m2: number;
  /** cavity depth (m) */
  d: number;
  /** cavity filled with a porous absorber of flow resistivity σ (Delany–Bazley), or air */
  sigma?: number;
}

/** Pressure transmission coefficient of two limp masses separated by a cavity (normal incidence). */
export function doubleWallTransmission(f: number, w: DoubleWall, rho: number, c: number): Complex {
  const k: Complex = C((2 * Math.PI * f) / c);
  let layer: M2;
  if (w.sigma) {
    const db = delanyBazley(f, w.sigma, rho, c);
    layer = fluidMatrix(db.k, db.Zc, w.d);
  } else layer = fluidMatrix(k, C(rho * c), w.d);
  const M = mm(mm(massMatrix(f, w.m1), layer), massMatrix(f, w.m2));
  const Z0 = rho * c;
  // incident 1, reflected R on the left; transmitted T on the right (v = p/Z0)
  const sum = add(add(M[0], scale(M[1], 1 / Z0)), add(scale(M[2], Z0), M[3]));
  return div(C(2), sum);
}

/** Single limp mass through the same matrix machinery (for tests and comparison). */
export function limpMassTransmission(f: number, m: number, rho: number, c: number): Complex {
  const M = massMatrix(f, m);
  const Z0 = rho * c;
  return div(C(2), add(add(M[0], scale(M[1], 1 / Z0)), add(scale(M[2], Z0), M[3])));
}

/** Mass–air–mass resonance (1/2π) √((ρc²/d)(1/m1 + 1/m2)). */
export const massAirMassFrequency = (
  w: Pick<DoubleWall, 'm1' | 'm2' | 'd'>,
  rho: number,
  c: number,
): number => Math.sqrt(((rho * c * c) / w.d) * (1 / w.m1 + 1 / w.m2)) / (2 * Math.PI);
