/**
 * Air column of length ℓ driven by a piston at x = 0, in three models, so the reader
 * can switch terms of the wave equation off (chapter 1a, D4):
 *
 *  - 'wave': inertia and compressibility both present. Incident wave of peak pressure P
 *    plus a reflected wave R·P (R = 0: anechoic end, progressive wave).
 *  - 'incompressible' (compressibility off, K → ∞, c₀ → ∞): the whole column moves with
 *    the piston at once; a pressure gradient ∂p/∂x = −ρ₀ ∂v/∂t is needed to accelerate
 *    it. With p(ℓ) = 0: p = ρ₀ ω V₀ sin ωt · (x − ℓ).
 *  - 'massless' (inertia off, ρ₀ → 0): nothing resists the piston, p = 0 everywhere and
 *    the column follows the piston without compressing.
 * In both degenerate models the response is instantaneous: no wave.
 * The piston velocity is the same in every model: V₀ = P/(ρ₀c₀), v_p = V₀ cos ωt.
 * Convention e^{−iωt}.
 */
import { C, type Complex, mul, re } from './complex';
import { type Fluid, incidentPlusReflected } from './plane-wave';

export type TubeModel = 'wave' | 'incompressible' | 'massless' | 'none';

export function tubeModel(inertia: boolean, compressibility: boolean): TubeModel {
  if (inertia && compressibility) return 'wave';
  if (inertia) return 'incompressible';
  if (compressibility) return 'massless';
  return 'none';
}

export interface TubeSetup extends Fluid {
  readonly omega: number;
  /** Peak pressure of the incident wave (Pa). */
  readonly P: number;
  /** Real reflection coefficient at the far end (wave model only). */
  readonly R: number;
  /** Column length (m), used by the incompressible model. */
  readonly length: number;
}

export interface TubeField {
  p(x: number, t: number): number;
  v(x: number, t: number): number;
  /** Particle displacement ξ (m). */
  xi(x: number, t: number): number;
}

export function tubeField(model: TubeModel, s: TubeSetup): TubeField {
  const Z = s.rho0 * s.c0;
  const V0 = s.P / Z;
  const w = s.omega;
  if (model === 'wave') {
    const k = w / s.c0;
    const f = incidentPlusReflected(C(s.P), C(s.R), k, w, s);
    const iOverW: Complex = [0, 1 / w];
    return {
      p: f.p,
      v: f.v,
      xi: (x, t) => re(mul(mul(iOverW, f.V(x)), [Math.cos(w * t), -Math.sin(w * t)])),
    };
  }
  if (model === 'incompressible') {
    return {
      p: (x, t) => s.rho0 * w * V0 * Math.sin(w * t) * (x - s.length),
      v: (_x, t) => V0 * Math.cos(w * t),
      xi: (_x, t) => (V0 / w) * Math.sin(w * t),
    };
  }
  // massless (and the meaningless 'none', drawn the same way with a warning)
  return {
    p: () => 0,
    v: (_x, t) => V0 * Math.cos(w * t),
    xi: (_x, t) => (V0 / w) * Math.sin(w * t),
  };
}
