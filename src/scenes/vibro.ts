import type { SceneSpec } from '../lib/scene/types';
import {
  bendingStiffness,
  coincidenceFrequency,
  diffuseTL,
  massAirMassFrequency,
  transmissionLoss,
  type Plate,
} from '../lib/physics/vibro';

const C0 = 343.2;
const RHO = 1.204;

export interface Material {
  key: string;
  label: string;
  rho: number;
  E: number;
  nu: number;
  eta: number;
}

/**
 * Generic material data for the figures.
 * TODO-VERIFY: all four (density, Young's modulus, Poisson's ratio, loss factor), e.g.
 * against Cremer, Heckl & Petersson, Structure-Borne Sound, or Fahy, Sound and Structural
 * Vibration. Loss factors in particular vary widely with mounting.
 */
export const MATERIALS: readonly Material[] = [
  { key: 'glass', label: 'verre', rho: 2500, E: 70e9, nu: 0.22, eta: 0.002 },
  { key: 'plaster', label: 'plaque de plâtre', rho: 750, E: 2.5e9, nu: 0.2, eta: 0.015 },
  { key: 'steel', label: 'acier', rho: 7850, E: 200e9, nu: 0.3, eta: 0.001 },
  { key: 'concrete', label: 'béton', rho: 2300, E: 30e9, nu: 0.2, eta: 0.01 },
];

export const plateOf = (mat: string, hmm: number): Plate => {
  const m = MATERIALS.find((x) => x.key === mat) ?? MATERIALS[0]!;
  const h = hmm * 1e-3;
  return { m: m.rho * h, D: bendingStiffness(m.E, h, m.nu), eta: m.eta };
};

const GLASS4 = plateOf('glass', 4);

/** Chapter 8: vibroacoustics. */
export const vibroScenes: SceneSpec[] = [
  {
    id: '8-wall',
    params: [
      {
        key: 'h',
        symbol: 'h',
        label: 'épaisseur de la paroi',
        unit: 'mm',
        min: 1,
        max: 300,
        step: 0.5,
        default: 4,
        scale: 'log',
        digits: 1,
      },
    ],
    terms: [
      { key: 'bending', label: 'rigidité de flexion', toggleable: true },
      { key: 'damping', label: 'amortissement interne', toggleable: true },
    ],
    views: [
      {
        key: 'material',
        label: 'Matériau',
        default: 'glass',
        options: MATERIALS.map((m) => ({ key: m.key, label: m.label })),
      },
      {
        key: 'incidence',
        label: 'Incidence',
        default: 'diffuse',
        options: [
          { key: 'diffuse', label: 'champ diffus' },
          { key: 'normal', label: 'normale' },
        ],
      },
    ],
    derived: [
      { key: 'm', digits: 1, fn: (p, _t, v) => plateOf(v.material ?? 'glass', p.h!).m },
      {
        key: 'fc',
        digits: 0,
        fn: (p, _t, v) => coincidenceFrequency(C0, plateOf(v.material ?? 'glass', p.h!)),
      },
      {
        key: 'TL',
        digits: 1,
        fn: (p, t, v) => {
          const pl = plateOf(v.material ?? 'glass', p.h!);
          const terms = { bending: t.bending !== false, damping: t.damping !== false };
          return v.incidence === 'normal'
            ? transmissionLoss(500, 0, pl, RHO, C0, terms)
            : diffuseTL(500, pl, RHO, C0, terms);
        },
      },
    ],
  },
  {
    id: '8-coinc',
    params: [
      {
        key: 'fr',
        symbol: 'f/f_c',
        label: 'fréquence rapportée à la fréquence de coïncidence',
        unit: '',
        min: 0.1,
        max: 4,
        step: 0.01,
        default: 1.6,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'theta',
        symbol: '\\theta',
        label: 'angle d’incidence',
        unit: '°',
        min: 0,
        max: 89,
        step: 1,
        default: 30,
        digits: 0,
      },
    ],
    terms: [{ key: 'damping', label: 'amortissement interne', toggleable: true }],
    derived: [
      {
        key: 'ratio',
        digits: 2,
        fn: (p) => Math.sin((p.theta! * Math.PI) / 180) * Math.sqrt(p.fr!),
      },
      {
        key: 'TL',
        digits: 1,
        fn: (p, t) =>
          transmissionLoss(
            p.fr! * coincidenceFrequency(C0, GLASS4),
            (p.theta! * Math.PI) / 180,
            GLASS4,
            RHO,
            C0,
            { bending: true, damping: t.damping !== false },
          ),
      },
    ],
  },
  {
    id: '8-double',
    params: [
      {
        key: 'm1',
        symbol: 'm_1',
        label: 'masse surfacique de la première paroi',
        unit: 'kg/m²',
        min: 3,
        max: 100,
        step: 0.5,
        default: 10,
        scale: 'log',
        digits: 1,
      },
      {
        key: 'm2',
        symbol: 'm_2',
        label: 'masse surfacique de la seconde paroi',
        unit: 'kg/m²',
        min: 3,
        max: 100,
        step: 0.5,
        default: 10,
        scale: 'log',
        digits: 1,
      },
      {
        key: 'd',
        symbol: 'd',
        label: 'épaisseur de la lame d’air',
        unit: 'mm',
        min: 10,
        max: 300,
        step: 1,
        default: 70,
        scale: 'log',
        digits: 0,
      },
    ],
    terms: [{ key: 'fill', label: 'laine minérale dans la cavité', toggleable: true }],
    derived: [
      {
        key: 'f0',
        digits: 0,
        fn: (p) => massAirMassFrequency({ m1: p.m1!, m2: p.m2!, d: p.d! * 1e-3 }, RHO, C0),
      },
    ],
  },
];
