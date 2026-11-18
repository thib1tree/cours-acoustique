/**
 * Chapter 6, diffraction by the edge of a rigid half-plane (Sommerfeld's exact solution,
 * two-dimensional, plane-wave incidence, convention e^{−iωt}).
 *
 * Fresnel integrals C(x), S(x) = ∫₀ˣ cos/sin(πt²/2) dt: power series for |x| < 1.5,
 * continued fraction (modified Lentz) beyond, as in Numerical Recipes § 6.9 (TODO-VERIFY
 * section number); accuracy close to machine precision.
 */
import { type Complex, C as cx, add, mul, cis, scale } from './complex';

export function fresnelCS(x: number): { C: number; S: number } {
  const ax = Math.abs(x);
  const EPS = 1e-15;
  let c: number;
  let s: number;
  if (ax < 1e-30) return { C: 0, S: 0 };
  if (ax < 1.5) {
    // C = Σ (−1)ⁿ (π/2)^{2n} x^{4n+1}/((2n)!(4n+1)), S = Σ (−1)ⁿ (π/2)^{2n+1} x^{4n+3}/((2n+1)!(4n+3)):
    // both from p_m = x tᵐ/m!, t = (π/2)x², term p_m/(2m+1), sign and target by m mod 4.
    const t = (Math.PI / 2) * ax * ax;
    c = 0;
    s = 0;
    let p = ax; // x t^m / m!
    for (let m = 0; m < 200; m++) {
      if (m > 0) p *= t / m;
      const val = p / (2 * m + 1);
      const q = m % 4;
      if (q === 0) c += val;
      else if (q === 1) s += val;
      else if (q === 2) c -= val;
      else s -= val;
      if (val < EPS * Math.max(Math.abs(c), Math.abs(s), 1e-300) && m > 3) break;
    }
  } else {
    // continued fraction for erfc-like auxiliary function
    const pix2 = Math.PI * ax * ax;
    let b: Complex = [1, -pix2];
    let cc: Complex = [1 / 1e-300, 0];
    let d = invC(b);
    let h: Complex = d;
    let n = -1;
    for (let k = 2; k < 400; k++) {
      n += 2;
      const a = -n * (n + 1);
      b = [b[0] + 4, b[1]];
      d = invC(add(scale(d, a), b));
      cc = add(b, scale(invC(cc), a));
      const del = mul(cc, d);
      h = mul(h, del);
      if (Math.abs(del[0] - 1) + Math.abs(del[1]) < EPS) break;
    }
    h = mul([ax, -ax], h);
    const cs = cis((Math.PI / 2) * ax * ax);
    const r = mul(cs, h);
    const res: Complex = [1 - r[0], -r[1]]; // (C + iS) = (1 + i)/2 · (1 − e^{iπx²/2} h)
    const f = mul([0.5, 0.5], res);
    c = f[0];
    s = f[1];
  }
  return x < 0 ? { C: -c, S: -s } : { C: c, S: s };
}

function invC(z: Complex): Complex {
  const d = z[0] * z[0] + z[1] * z[1];
  return [z[0] / d, -z[1] / d];
}

/**
 * Sommerfeld's diffraction function F(a) = (e^{−iπ/4}/√π) ∫ₐ^∞ e^{iμ²} dμ, with
 * F(−∞) = 1 (fully lit), F(0) = ½ (shadow boundary), F(+∞) = 0 (deep shadow).
 */
export function sommerfeldF(a: number): Complex {
  const { C, S } = fresnelCS(a * Math.sqrt(2 / Math.PI));
  // F = ½ − (e^{−iπ/4}/√2)(C + iS)
  const e = mul(cis(-Math.PI / 4), cx(C, S));
  return [0.5 - e[0] / Math.SQRT2, -e[1] / Math.SQRT2];
}

export interface EdgeField {
  total: Complex;
  /** geometrical acoustics: incident where lit, plus the specular reflection */
  geometric: Complex;
  /** diffracted part = total − geometric */
  diffracted: Complex;
}

/**
 * Field around a rigid half-plane lying along φ = 0 (both faces φ = 0⁺ and φ = 2π⁻),
 * for an incident plane wave u_i = exp(−ikr cos(φ − φ₀)) of unit amplitude, coming from
 * the direction φ₀. Polar coordinates (r, φ) centred on the edge, 0 < φ < 2π.
 */
export function halfPlane(kr: number, phi: number, phi0: number): EdgeField {
  const s = Math.sqrt(2 * kr);
  const ui = cis(-kr * Math.cos(phi - phi0));
  const ur = cis(-kr * Math.cos(phi + phi0));
  const ai = -s * Math.cos((phi - phi0) / 2);
  const ar = -s * Math.cos((phi + phi0) / 2);
  const total = add(mul(sommerfeldF(ai), ui), mul(sommerfeldF(ar), ur));
  const lit = Math.cos((phi - phi0) / 2) > 0 ? 1 : 0;
  const refl = Math.cos((phi + phi0) / 2) > 0 ? 1 : 0;
  const geometric = add(scale(ui, lit), scale(ur, refl));
  return { total, geometric, diffracted: [total[0] - geometric[0], total[1] - geometric[1]] };
}
