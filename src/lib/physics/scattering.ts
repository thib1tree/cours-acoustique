/**
 * Chapter 6: scattering of a plane wave e^{ikz} by a rigid immovable sphere of radius a
 * (partial waves, convention e^{−iωt}, outgoing h_n = j_n + i y_n).
 *
 *   p_s = −P₀ Σ (2n+1) iⁿ A_n h_n(kr) P_n(cos θ),   A_n = j_n′(ka)/h_n′(ka),
 * θ measured from the propagation direction of the incident wave.
 */
import { type Complex, C, add, mul, scale, div } from './complex';

/** Number of partial waves needed for ka (Wiscombe-like rule). */
export const partialWaves = (ka: number): number => Math.ceil(ka + 4 * Math.cbrt(ka) + 6);

/**
 * Spherical Bessel functions j_n(x), y_n(x) for n = 0..N.
 * y_n by upward recurrence (stable); j_n by downward recurrence from far above N
 * (Miller's algorithm), normalized with j₀ = sin x / x.
 */
export function sphericalBessel(N: number, x: number): { j: Float64Array; y: Float64Array } {
  const j = new Float64Array(N + 1);
  const y = new Float64Array(N + 1);
  y[0] = -Math.cos(x) / x;
  if (N >= 1) y[1] = -Math.cos(x) / (x * x) - Math.sin(x) / x;
  for (let n = 1; n < N; n++) y[n + 1] = ((2 * n + 1) / x) * y[n]! - y[n - 1]!;
  const start = Math.max(N, Math.ceil(x)) + 30 + Math.ceil(Math.sqrt(40 * Math.max(N, x)));
  let jp1 = 0;
  let jn = 1e-300;
  for (let n = start; n > 0; n--) {
    const jm1 = ((2 * n + 1) / x) * jn - jp1;
    jp1 = jn;
    jn = jm1;
    if (n - 1 <= N) j[n - 1] = jn;
    if (Math.abs(jn) > 1e250) {
      // rescale to avoid overflow
      jp1 *= 1e-250;
      jn *= 1e-250;
      for (let m = n - 1; m <= N; m++) j[m] = j[m]! * 1e-250;
    }
  }
  const j0 = x === 0 ? 1 : Math.sin(x) / x;
  // normalize: use j0 unless it is tiny, then j1
  const ref = Math.abs(j0) > 1e-3 || N < 1 ? 0 : 1;
  const exact = ref === 0 ? j0 : Math.sin(x) / (x * x) - Math.cos(x) / x;
  const k = exact / j[ref]!;
  for (let n = 0; n <= N; n++) j[n] = j[n]! * k;
  return { j, y };
}

/** Derivative f_n′ = f_{n−1} − (n+1) f_n / x (f = j or y), with f₀′ = −f₁. */
function deriv(f: Float64Array, n: number, x: number): number {
  return n === 0 ? -f[1]! : f[n - 1]! - ((n + 1) / x) * f[n]!;
}

/** Legendre polynomials P_0..P_N at c. */
export function legendre(N: number, c: number): Float64Array {
  const P = new Float64Array(N + 1);
  P[0] = 1;
  if (N >= 1) P[1] = c;
  for (let n = 1; n < N; n++) P[n + 1] = ((2 * n + 1) * c * P[n]! - n * P[n - 1]!) / (n + 1);
  return P;
}

/** Scattering coefficients A_n = j_n′(ka)/h_n′(ka) for n = 0..N. */
export function rigidSphereCoefficients(ka: number, N = partialWaves(ka)): Complex[] {
  const { j, y } = sphericalBessel(N + 1, ka);
  const out: Complex[] = [];
  for (let n = 0; n <= N; n++) {
    const jd = deriv(j, n, ka);
    const yd = deriv(y, n, ka);
    out.push(div(C(jd), C(jd, yd)));
  }
  return out;
}

/** Total scattering cross-section divided by the geometric one, σ/(πa²) = (4/(ka)²) Σ (2n+1)|A_n|². */
export function scatteringEfficiency(ka: number): number {
  const A = rigidSphereCoefficients(ka);
  let s = 0;
  A.forEach((a, n) => (s += (2 * n + 1) * (a[0] * a[0] + a[1] * a[1])));
  return (4 / (ka * ka)) * s;
}

/**
 * Far-field form function: with h_n(kr) ≈ (−i)^{n+1} e^{ikr}/(kr), the scattered field is
 * g(θ) = Σ (2n+1) A_n P_n(cos θ), with p_s ≈ i P₀ g(θ) e^{ikr}/(kr).
 */
export function farField(ka: number, cosTheta: number, A = rigidSphereCoefficients(ka)): Complex {
  const P = legendre(A.length - 1, cosTheta);
  let g: Complex = C(0);
  A.forEach((a, n) => (g = add(g, scale(a, (2 * n + 1) * P[n]!))));
  return g;
}

/**
 * Pressure at (kr, cos θ), r ≥ a, for P₀ = 1: incident e^{ikr cos θ} and scattered parts.
 * h_n(kr) is built from the same recurrences.
 */
export function sphereField(
  ka: number,
  kr: number,
  cosTheta: number,
  A = rigidSphereCoefficients(ka),
): { incident: Complex; scattered: Complex } {
  const N = A.length - 1;
  const { j, y } = sphericalBessel(N, kr);
  const P = legendre(N, cosTheta);
  let s: Complex = C(0);
  let ipow: Complex = C(1); // iⁿ
  for (let n = 0; n <= N; n++) {
    const h: Complex = C(j[n]!, y[n]!);
    s = add(s, scale(mul(mul(ipow, A[n]!), h), -(2 * n + 1) * P[n]!));
    ipow = mul(ipow, C(0, 1));
  }
  return { incident: C(Math.cos(kr * cosTheta), Math.sin(kr * cosTheta)), scattered: s };
}
