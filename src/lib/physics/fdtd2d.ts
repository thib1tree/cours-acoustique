/**
 * 2D scalar wave equation ∂²p/∂t² = c²∇²p, leapfrog finite differences.
 *
 * This is the CPU reference of the GPU solver used on the home page: the shader
 * implements exactly `stepFdtd2D` and an end-to-end test compares the two.
 *
 * Update: p^{n+1} = 2p^n − p^{n−1} + C²(p_E + p_W + p_N + p_S − 4p) with C = c dt/h.
 * Stability (CFL, 2D): C ≤ 1/√2.
 * Numerical dispersion: sin²(ωdt/2) = C²[sin²(k_x h/2) + sin²(k_y h/2)] (anisotropic:
 * waves along the axes are slowest).
 * Rigid walls (∂p/∂n = 0) by mirroring: p_{−1} = p_1 (node-centred Neumann).
 * Optional damping multiplies the update by (1 − σ) per step (not physical attenuation;
 * used only to keep the home-page field from saturating).
 */

export interface Grid2D {
  readonly nx: number;
  readonly ny: number;
  /** Courant number c dt / h, ≤ 1/√2. */
  readonly courant: number;
  /** Damping per step, 0 for the lossless scheme. */
  readonly damping?: number;
}

export interface Fdtd2DState {
  prev: Float32Array;
  curr: Float32Array;
  next: Float32Array;
  steps: number;
}

export const MAX_COURANT_2D = Math.SQRT1_2;

export function createFdtd2D(g: Grid2D): Fdtd2DState {
  if (!(g.courant > 0 && g.courant <= MAX_COURANT_2D + 1e-12))
    throw new RangeError('CFL: need 0 < C ≤ 1/√2 in 2D');
  const size = g.nx * g.ny;
  return {
    prev: new Float32Array(size),
    curr: new Float32Array(size),
    next: new Float32Array(size),
    steps: 0,
  };
}

export function stepFdtd2D(g: Grid2D, s: Fdtd2DState, steps = 1): void {
  const { nx, ny } = g;
  const c2 = g.courant * g.courant;
  const keep = 1 - (g.damping ?? 0);
  for (let it = 0; it < steps; it++) {
    const u = s.curr;
    const up = s.prev;
    const un = s.next;
    for (let j = 0; j < ny; j++) {
      const jm = j > 0 ? j - 1 : 1;
      const jp = j < ny - 1 ? j + 1 : ny - 2;
      for (let i = 0; i < nx; i++) {
        const im = i > 0 ? i - 1 : 1;
        const ip = i < nx - 1 ? i + 1 : nx - 2;
        const k = j * nx + i;
        const lap =
          u[j * nx + im]! + u[j * nx + ip]! + u[jm * nx + i]! + u[jp * nx + i]! - 4 * u[k]!;
        un[k] = keep * (2 * u[k]! - up[k]! + c2 * lap);
      }
    }
    s.prev = u;
    s.curr = un;
    s.next = up;
    s.steps++;
  }
}

/** Add a Gaussian pulse at rest (same increment on both time levels). */
export function addPulse(
  g: Grid2D,
  s: Fdtd2DState,
  cx: number,
  cy: number,
  amplitude: number,
  width: number,
): void {
  const r = Math.ceil(4 * width);
  for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(g.ny - 1, Math.ceil(cy + r)); j++) {
    for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(g.nx - 1, Math.ceil(cx + r)); i++) {
      const d2 = (i - cx) ** 2 + (j - cy) ** 2;
      const a = amplitude * Math.exp(-d2 / (2 * width * width));
      const k = j * g.nx + i;
      s.curr[k] = s.curr[k]! + a;
      s.prev[k] = s.prev[k]! + a;
    }
  }
}

/**
 * Exact discrete angular frequency (per step, i.e. ω·dt) of the rigid-cavity mode
 * cos(mπ i/(nx−1)) cos(nπ j/(ny−1)) for this scheme.
 */
export function discreteModeOmegaDt(g: Grid2D, m: number, n: number): number {
  const sx = Math.sin((m * Math.PI) / (2 * (g.nx - 1)));
  const sy = Math.sin((n * Math.PI) / (2 * (g.ny - 1)));
  return 2 * Math.asin(g.courant * Math.sqrt(sx * sx + sy * sy));
}

/** Continuum angular frequency (per step) of the same mode: C·π·√((m/(nx−1))² + (n/(ny−1))²). */
export function continuumModeOmegaDt(g: Grid2D, m: number, n: number): number {
  return g.courant * Math.PI * Math.hypot(m / (g.nx - 1), n / (g.ny - 1));
}
