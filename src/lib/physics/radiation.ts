/**
 * Chapter 4: radiation from simple sources (convention e^{−iωt}).
 * All pressures are normalized by ρ₀c₀U, U being the normal velocity amplitude of the
 * source surface; lengths enter through dimensionless products (ka, kr, kd).
 */
import { type Complex, C, mul, expC } from './complex';
import { besselJ1, besselY1 } from './special';

/**
 * Specific radiation impedance of a pulsating sphere of radius a, divided by ρ₀c₀:
 * Z/ρ₀c₀ = −ika / (1 − ika) = (ka)²/(1 + (ka)²) − i ka/(1 + (ka)²).
 * The real part radiates; the imaginary part is the mass of air moved near the sphere.
 */
export function sphereImpedance(ka: number): Complex {
  const d = 1 + ka * ka;
  return C((ka * ka) / d, -ka / d);
}

/**
 * ρ₀c₀ V / P for a spherical wave at distance r: 1 + i/(kr) (the second term is the near
 * field; switching it off gives the plane-wave relation V = P/ρ₀c₀).
 */
export function sphericalAdmittance(kr: number, nearField = true): Complex {
  return C(1, nearField ? 1 / kr : 0);
}

/** Pressure of a pulsating sphere at distance r ≥ a, normalized by ρ₀c₀U. */
export function spherePressure(ka: number, kr: number): Complex {
  return mul(mul(sphereImpedance(ka), C(ka / kr)), expC(C(0, kr - ka)));
}

/**
 * Radiated power of two equal point sources at distance d, in phase (sign = +1) or in
 * opposition (sign = −1), relative to twice the power of one source alone:
 * 1 + sign · sin(kd)/(kd).
 */
export function pairPowerRatio(kd: number, sign: 1 | -1): number {
  const s = kd < 1e-6 ? 1 - (kd * kd) / 6 : Math.sin(kd) / kd;
  return 1 + sign * s;
}

/** Far-field amplitude pattern of the pair, |1 + sign e^{ikd cos θ}| / 2 (θ from the axis). */
export function pairDirectivity(kd: number, sign: 1 | -1, theta: number): number {
  const ph = kd * Math.cos(theta);
  return Math.hypot(1 + sign * Math.cos(ph), sign * Math.sin(ph)) / 2;
}

/**
 * Struve function H₁(x): power series for x ≤ 25 (cancellation error ~1e-10 there), and
 * beyond, the asymptotic expansion H₁ − Y₁ ≈ (2/π)(1 + 1/x² − 3/x⁴).
 * H₁(x) = Σ (−1)^m (x/2)^{2m+2} / (Γ(m + 3/2) Γ(m + 5/2)).
 */
export function struveH1(x: number): number {
  if (x <= 25) {
    // Γ(3/2) = √π/2, Γ(5/2) = 3√π/4; Γ(m + 3/2) and Γ(m + 5/2) grow by (m + 3/2), (m + 5/2).
    let g1 = Math.sqrt(Math.PI) / 2;
    let g2 = (3 * Math.sqrt(Math.PI)) / 4;
    const h = (x / 2) * (x / 2);
    let pw = h;
    let sum = 0;
    for (let m = 0; m < 200; m++) {
      const term = (m % 2 ? -1 : 1) * (pw / (g1 * g2));
      sum += term;
      if (m > 5 && Math.abs(term) < 1e-17) break;
      pw *= h;
      g1 *= m + 1.5;
      g2 *= m + 2.5;
    }
    return sum;
  }
  const x2 = 1 / (x * x);
  return besselY1(x) + (2 / Math.PI) * (1 + x2 - 3 * x2 * x2);
}

/**
 * Radiation impedance of a rigid circular piston in an infinite baffle, divided by ρ₀c₀S:
 * R − iX with R = 1 − J₁(2ka)/ka and X = H₁(2ka)/ka (the −i makes X a mass in e^{−iωt}).
 */
export function pistonImpedance(ka: number, terms = { resistance: true, mass: true }): Complex {
  const x = 2 * ka;
  const R = ka < 1e-4 ? (ka * ka) / 2 : 1 - (2 * besselJ1(x)) / x;
  const X = ka < 1e-4 ? (8 * ka) / (3 * Math.PI) : (2 * struveH1(x)) / x;
  return C(terms.resistance ? R : 0, terms.mass ? -X : 0);
}

/** On-axis pressure amplitude of the baffled piston at kz, normalized by ρ₀c₀U. */
export function pistonOnAxis(ka: number, kz: number): number {
  return 2 * Math.abs(Math.sin((Math.sqrt(kz * kz + ka * ka) - kz) / 2));
}

/** Last on-axis maximum: kz where the path difference to the rim is λ/2 (needs ka > π). */
export function lastAxialMaximum(ka: number): number | null {
  // √(z² + a²) − z = λ/2  ⇒  kz = ((ka)² − π²) / (2π)
  return ka > Math.PI ? (ka * ka - Math.PI * Math.PI) / (2 * Math.PI) : null;
}

/** Root of a continuous function on [lo, hi] by bisection (sign change assumed). */
function bisect(fn: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    if (fn(a) * fn(m) <= 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

/** Argument x where 2J₁(x)/x = 1/√2 (half-power point of the piston pattern). */
export const PISTON_HALF_POWER_X = bisect((x) => (2 * besselJ1(x)) / x - Math.SQRT1_2, 1, 2.5);
/** First zero of J₁ (first null of the piston pattern). */
export const J1_FIRST_ZERO = bisect(besselJ1, 3, 4.5);

/** Half-angle (rad) of the main lobe at −3 dB, or null when the piston is too small. */
export function halfPowerAngle(ka: number): number | null {
  return ka > PISTON_HALF_POWER_X ? Math.asin(PISTON_HALF_POWER_X / ka) : null;
}

/** Angle (rad) of the first null, or null when ka < 3.83 (no null). */
export function firstNullAngle(ka: number): number | null {
  return ka > J1_FIRST_ZERO ? Math.asin(J1_FIRST_ZERO / ka) : null;
}

/**
 * Pressure of the baffled piston at a field point (Rayleigh integral, by quadrature over
 * the disc), normalized by ρ₀c₀U. Coordinates in units of 1/k: (kx, kz), kz > 0, the
 * field point lying in a plane through the axis.
 *   p = −iωρ₀/(2π) ∫ U e^{ikR}/R dS  ⇒  p/ρ₀c₀U = −(i/2π) ∫ e^{iR̃}/R̃ dS̃ (tilde: × k).
 */
export function createPistonQuadrature(ka: number, pointsPerWavelength = 6) {
  const h = Math.min(ka / 6, (2 * Math.PI) / pointsPerWavelength);
  const nr = Math.max(3, Math.ceil(ka / h));
  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  for (let j = 0; j < nr; j++) {
    const r = (ka * (j + 0.5)) / nr;
    const nphi = Math.max(6, Math.ceil((2 * Math.PI * r) / h));
    const w = (2 * Math.PI * r * (ka / nr)) / nphi;
    for (let q = 0; q < nphi; q++) {
      const phi = (2 * Math.PI * (q + 0.5)) / nphi;
      xs.push(r * Math.cos(phi));
      ys.push(r * Math.sin(phi));
      ws.push(w);
    }
  }
  const X = Float64Array.from(xs);
  const Y = Float64Array.from(ys);
  const W = Float64Array.from(ws);
  return function pressure(kx: number, kz: number): Complex {
    let re = 0;
    let im = 0;
    const z2 = kz * kz;
    for (let n = 0; n < X.length; n++) {
      const dx = kx - X[n]!;
      const dy = Y[n]!;
      const R = Math.sqrt(dx * dx + dy * dy + z2);
      const a = W[n]! / R;
      re += a * Math.cos(R);
      im += a * Math.sin(R);
    }
    // multiply by −i/(2π)
    return C(im / (2 * Math.PI), -re / (2 * Math.PI));
  };
}
