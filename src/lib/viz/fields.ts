/**
 * Complex field grids for the phasor views (interleaved Re, Im, row-major, row 0 at the
 * bottom). Pure functions shared by the field worker and by the synchronous fallback.
 */
import { createPistonQuadrature } from '../physics/radiation';
import { halfPlane } from '../physics/diffraction';
import { rigidSphereCoefficients, sphereField } from '../physics/scattering';

export type FieldRequest =
  | { kind: 'piston'; ka: number; nx: number; ny: number; zMax: number }
  | { kind: 'sphere'; ka: number; nx: number; ny: number; width: number; scattered: boolean }
  | { kind: 'edge'; nx: number; ny: number; width: number; phi0: number; diffracted: boolean };

/** Piston domain along the axis, in radii. */
export function pistonDomain(ka: number): number {
  // At least 10 radii (so the beam can widen), 2.4 Rayleigh distances (ka/2 radii each)
  // and two wavelengths.
  return Math.max(10, 1.2 * ka, (2 * 2 * Math.PI) / ka);
}

/** Sphere domain width in units of 1/k: eight radii or three wavelengths. */
export function sphereDomain(ka: number): number {
  return Math.max(8 * ka, 6 * Math.PI);
}

export function computeField(req: FieldRequest): Float32Array {
  const { nx, ny } = req;
  const out = new Float32Array(nx * ny * 2);
  const put = (i: number, j: number, re: number, im: number) => {
    out[2 * (j * nx + i)] = re;
    out[2 * (j * nx + i) + 1] = im;
  };
  if (req.kind === 'piston') {
    // columns along the axis z ∈ (0, zMax], rows across, lengths in radii; symmetric
    const p = createPistonQuadrature(req.ka, 5);
    const dz = req.zMax / nx;
    for (let j = Math.floor(ny / 2); j < ny; j++) {
      const x = (j + 0.5 - ny / 2) * dz;
      for (let i = 0; i < nx; i++) {
        const v = p(req.ka * x, req.ka * (i + 0.5) * dz);
        put(i, j, v[0], v[1]);
        put(i, ny - 1 - j, v[0], v[1]);
      }
    }
  } else if (req.kind === 'sphere') {
    // incident wave along +x, sphere at the centre; symmetric about the axis
    const A = rigidSphereCoefficients(req.ka);
    const h = req.width / nx; // in units of 1/k
    for (let j = Math.floor(ny / 2); j < ny; j++) {
      const y = (j + 0.5 - ny / 2) * h;
      for (let i = 0; i < nx; i++) {
        const x = (i + 0.5 - nx / 2) * h;
        const kr = Math.hypot(x, y);
        let re = 0;
        let im = 0;
        if (kr >= req.ka) {
          const f = sphereField(req.ka, kr, x / kr, A);
          re = f.scattered[0] + (req.scattered ? 0 : f.incident[0]);
          im = f.scattered[1] + (req.scattered ? 0 : f.incident[1]);
        }
        put(i, j, re, im);
        put(i, ny - 1 - j, re, im);
      }
    }
  } else {
    // edge at the centre, rigid screen along −y; φ measured from the screen, counter-clockwise
    const h = req.width / nx;
    for (let j = 0; j < ny; j++) {
      const y = (j + 0.5 - ny / 2) * h;
      for (let i = 0; i < nx; i++) {
        const x = (i + 0.5 - nx / 2) * h;
        let phi = Math.atan2(y, x) + Math.PI / 2;
        if (phi <= 0) phi += 2 * Math.PI;
        if (phi > 2 * Math.PI) phi -= 2 * Math.PI;
        const f = halfPlane(Math.hypot(x, y), phi, req.phi0);
        const v = req.diffracted ? f.total : f.geometric;
        put(i, j, v[0], v[1]);
      }
    }
  }
  return out;
}
