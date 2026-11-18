import type { SceneSpec } from '../lib/scene/types';
import { halfPlane } from '../lib/physics/diffraction';
import { scatteringEfficiency } from '../lib/physics/scattering';
import { abs } from '../lib/physics/complex';

const C0 = 343.2;
/** Horizontal incident wave coming from the left: φ₀ = 3π/2 (screen along φ = 0, pointing down). */
export const EDGE_PHI0 = (3 * Math.PI) / 2;
const kr = (p: Readonly<Record<string, number>>) => (2 * Math.PI * p.f! * p.r!) / C0;
const listenerPhi = (p: Readonly<Record<string, number>>) =>
  Math.PI / 2 - (p.theta! * Math.PI) / 180;

export function edgeLevel(p: Readonly<Record<string, number>>, diffracted: boolean): number {
  const f = halfPlane(kr(p), listenerPhi(p), EDGE_PHI0);
  return 20 * Math.log10(Math.max(abs(diffracted ? f.total : f.geometric), 1e-5));
}

/** Chapter 6: diffraction and scattering. */
export const diffractionScenes: SceneSpec[] = [
  {
    id: '6-edge',
    params: [
      {
        key: 'f',
        symbol: 'f',
        label: 'fréquence',
        unit: 'Hz',
        min: 63,
        max: 8000,
        step: 1,
        default: 200,
        scale: 'log',
        digits: 0,
      },
      {
        key: 'r',
        symbol: 'r',
        label: 'distance entre l’arête et l’auditeur',
        unit: 'm',
        min: 1,
        max: 40,
        step: 0.1,
        default: 10,
        scale: 'log',
        digits: 1,
      },
      {
        key: 'theta',
        symbol: '\\theta',
        label: 'angle de l’auditeur sous la limite de l’ombre',
        unit: '°',
        min: -30,
        max: 80,
        step: 1,
        default: 20,
        digits: 0,
      },
    ],
    terms: [{ key: 'diff', label: 'onde diffractée par l’arête', toggleable: true }],
    views: [
      {
        key: 'hear',
        label: 'Écouter',
        default: 'listener',
        options: [
          { key: 'listener', label: 'à la place de l’auditeur' },
          { key: 'free', label: 'sans écran' },
        ],
      },
    ],
    derived: [
      { key: 'L', digits: 1, fn: (p, t) => edgeLevel(p, t.diff !== false) },
      {
        key: 'N',
        digits: 2,
        // Fresnel number 2δ/λ, δ = r(1 − cos θ) for a plane wave; negative on the lit side
        fn: (p) =>
          (Math.sign(p.theta!) * 2 * p.r! * (1 - Math.cos((p.theta! * Math.PI) / 180)) * p.f!) / C0,
      },
      { key: 'lr', digits: 1, fn: (p) => (p.r! * p.f!) / C0 },
    ],
  },
  {
    id: '6-sphere',
    params: [
      {
        key: 'ka',
        symbol: 'ka',
        label: 'taille de la sphère rapportée à la longueur d’onde',
        unit: '',
        min: 0.1,
        max: 15,
        step: 0.01,
        default: 1,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'a',
        symbol: 'a',
        label: 'rayon de la sphère (pour l’écoute)',
        unit: 'cm',
        min: 0.5,
        max: 50,
        step: 0.1,
        default: 5,
        scale: 'log',
        digits: 1,
      },
    ],
    views: [
      {
        key: 'show',
        label: 'Afficher',
        default: 'total',
        options: [
          { key: 'total', label: 'champ total' },
          { key: 'scattered', label: 'champ diffusé seul' },
        ],
      },
      {
        key: 'hear',
        label: 'Écouter',
        default: 'scattered',
        options: [
          { key: 'scattered', label: 'le son diffusé' },
          { key: 'incident', label: 'le son incident' },
        ],
      },
    ],
    derived: [
      { key: 'Q', digits: 3, fn: (p) => scatteringEfficiency(p.ka!) },
      { key: 'fa', digits: 0, fn: (p) => C0 / (2 * Math.PI * p.a! * 1e-2) },
    ],
  },
];
