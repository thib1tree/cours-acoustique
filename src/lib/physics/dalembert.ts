/**
 * d'Alembert solution of the 1D linear acoustic equations.
 *
 * Hypotheses: linear acoustics, lossless homogeneous fluid, unbounded line.
 * With Z = ρ₀c₀, the Riemann invariants f = (p + Zv)/2 and g = (p − Zv)/2 are
 * transported unchanged at +c₀ and −c₀:
 *   p(x, t) = f(x − c₀t) + g(x + c₀t),   Z v(x, t) = f(x − c₀t) − g(x + c₀t).
 * Hence the direction of propagation is fixed by the relation between p and v:
 * a pulse released at rest (v = 0) splits into two halves.
 */
export type Profile = (x: number) => number;

export interface DalembertState {
  /** Right-going part f. */
  readonly f: Profile;
  /** Left-going part g. */
  readonly g: Profile;
}

/** Decompose initial pressure and velocity into right- and left-going parts. */
export function decompose(p0: Profile, v0: Profile, Z: number): DalembertState {
  return {
    f: (x) => 0.5 * (p0(x) + Z * v0(x)),
    g: (x) => 0.5 * (p0(x) - Z * v0(x)),
  };
}

export function pressureAt(s: DalembertState, x: number, t: number, c0: number): number {
  return s.f(x - c0 * t) + s.g(x + c0 * t);
}

export function velocityAt(s: DalembertState, x: number, t: number, c0: number, Z: number): number {
  return (s.f(x - c0 * t) - s.g(x + c0 * t)) / Z;
}

/** Gaussian pulse profile of amplitude a, centre x0 and standard width w. */
export const gaussian =
  (a: number, x0: number, w: number): Profile =>
  (x) =>
    a * Math.exp(-((x - x0) ** 2) / (2 * w * w));
