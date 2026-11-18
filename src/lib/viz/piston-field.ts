/**
 * Field grid of the baffled piston (Rayleigh integral), shared by the worker and by the
 * synchronous fallback. Columns run along the axis z ∈ (0, zMax], rows across
 * x ∈ [−xMax, xMax], lengths in units of the piston radius a. Interleaved Re, Im.
 */
import { createPistonQuadrature } from '../physics/radiation';

export interface PistonGrid {
  ka: number;
  nx: number;
  ny: number;
  zMax: number;
}

export function pistonDomain(ka: number): number {
  // At least 10 radii (so the beam can widen), 2.4 Rayleigh distances (ka/2 radii each)
  // and two wavelengths.
  return Math.max(10, 1.2 * ka, (2 * 2 * Math.PI) / ka);
}

export function computePistonField({ ka, nx, ny, zMax }: PistonGrid): Float32Array {
  const p = createPistonQuadrature(ka, 5);
  const out = new Float32Array(nx * ny * 2);
  const dz = zMax / nx; // radii per cell (same across)
  for (let j = Math.floor(ny / 2); j < ny; j++) {
    const x = (j + 0.5 - ny / 2) * dz;
    const mirror = ny - 1 - j;
    for (let i = 0; i < nx; i++) {
      const v = p(ka * x, ka * (i + 0.5) * dz);
      out[2 * (j * nx + i)] = v[0];
      out[2 * (j * nx + i) + 1] = v[1];
      out[2 * (mirror * nx + i)] = v[0];
      out[2 * (mirror * nx + i) + 1] = v[1];
    }
  }
  return out;
}
