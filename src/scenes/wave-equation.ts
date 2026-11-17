import type { SceneSpec } from '../lib/scene/types';
import {
  AIR,
  TABULATED_MEDIA,
  celsiusToKelvin,
  celerityFromModulus,
  gasDensity,
  gasSoundSpeed,
} from '../lib/physics/media';
import { pressureFromSpl } from '../lib/physics/levels';

const T20 = celsiusToKelvin(20);
const RHO_AIR = gasDensity(AIR, T20);
const C_AIR = gasSoundSpeed(AIR, T20);
const WATER = TABULATED_MEDIA[0]!;
const C_WATER = celerityFromModulus(WATER.modulus, WATER.rho);
const peak = (L: number) => Math.SQRT2 * pressureFromSpl(L);

const freq = (def: number, min = 100, max = 2000) =>
  ({
    key: 'f',
    symbol: 'f',
    label: 'fréquence',
    unit: 'Hz',
    min,
    max,
    step: 10,
    default: def,
    scale: 'log',
  }) as const;
const level = (def: number, min = 40, max = 150) =>
  ({
    key: 'L',
    symbol: 'L_p',
    label: 'niveau de pression',
    unit: 'dB',
    min,
    max,
    step: 1,
    default: def,
    quantity: 'pressure',
  }) as const;

/** Chapters 1a and 1b. */
export const waveEquationScenes: SceneSpec[] = [
  {
    id: '1a-chain',
    params: [
      {
        key: 'N',
        symbol: 'N',
        label: 'nombre de masses',
        unit: '',
        min: 4,
        max: 160,
        step: 1,
        default: 12,
        scale: 'log',
      },
      {
        key: 'w',
        symbol: '\\ell',
        label: "largeur de l'impulsion",
        unit: 'cm',
        min: 2,
        max: 20,
        step: 1,
        default: 8,
      },
    ],
    terms: [{ key: 'springs', label: 'ressorts de couplage', toggleable: true }],
    views: [
      {
        key: 'show',
        label: 'Affichage',
        default: 'both',
        options: [
          { key: 'chain', label: 'Chaîne' },
          { key: 'both', label: 'Chaîne et continu' },
        ],
      },
    ],
  },
  {
    id: '1a-stiffness',
    derived: [{ key: 'c', digits: 0, unit: 'm/s', fn: (p) => Math.sqrt(p.K! / p.rho!) }],
    params: [
      {
        key: 'K',
        symbol: 'K',
        label: 'module de compressibilité',
        unit: 'Pa',
        min: 1e4,
        max: 1e12,
        step: 1,
        default: 141855,
        scale: 'log',
      },
      {
        key: 'rho',
        symbol: '\\rho_0',
        label: 'masse volumique',
        unit: 'kg/m³',
        min: 0.1,
        max: 2e4,
        step: 0.01,
        default: 1.204,
        scale: 'log',
        digits: 2,
      },
    ],
  },
  {
    id: '1a-newton',
    params: [
      {
        key: 'f',
        symbol: 'f',
        label: 'fréquence',
        unit: 'Hz',
        min: 20,
        max: 1e9,
        step: 1,
        default: 1000,
        scale: 'log',
      },
    ],
    terms: [{ key: 'adiabatic', label: 'compression adiabatique', toggleable: true }],
  },
  {
    id: '1a-tube',
    params: [freq(500), level(94)],
    derived: [
      { key: 'P', digits: 2, unit: 'Pa', fn: (p) => peak(p.L!) },
      { key: 'V', digits: 2, unit: 'mm/s', fn: (p) => (1000 * peak(p.L!)) / (RHO_AIR * C_AIR) },
      {
        key: 'Xi',
        digits: 2,
        unit: 'µm',
        fn: (p) => (1e6 * peak(p.L!)) / (RHO_AIR * C_AIR * 2 * Math.PI * p.f!),
      },
      { key: 'c', digits: 1, unit: 'm/s', fn: () => C_AIR },
    ],
    terms: [
      { key: 'inertia', label: 'inertie', toggleable: true },
      { key: 'compressibility', label: 'compressibilité', toggleable: true },
    ],
    views: [
      {
        key: 'view',
        label: 'Vue',
        default: 'both',
        options: [
          { key: 'euler', label: 'Eulérienne' },
          { key: 'lagrange', label: 'Lagrangienne' },
          { key: 'both', label: 'Les deux' },
        ],
      },
    ],
  },
  {
    id: '1a-dalembert',
    params: [
      {
        key: 'w',
        symbol: '\\ell',
        label: "largeur de l'impulsion",
        unit: 'cm',
        min: 3,
        max: 30,
        step: 1,
        default: 10,
      },
    ],
    views: [
      {
        key: 'start',
        label: 'Départ',
        default: 'rest',
        options: [
          { key: 'rest', label: 'Au repos' },
          { key: 'right', label: 'Vers la droite' },
          { key: 'cross', label: 'Deux impulsions' },
        ],
      },
      {
        key: 'parts',
        label: 'Affichage',
        default: 'sum',
        options: [
          { key: 'sum', label: 'Somme' },
          { key: 'split', label: 'f et g' },
        ],
      },
    ],
  },
  {
    id: '1a-helium',
    params: [
      {
        key: 'x',
        symbol: 'x_{\\mathrm{He}}',
        label: "fraction molaire d'hélium",
        unit: '%',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
      },
    ],
  },
  {
    id: '1b-piston',
    derived: [
      {
        key: 'Z',
        digits: 0,
        fn: (_p, _t, v) => (v.medium === 'water' ? WATER.rho * C_WATER : RHO_AIR * C_AIR),
      },
      {
        key: 'p',
        digits: 2,
        fn: (p, _t, v) =>
          ((v.medium === 'water' ? WATER.rho * C_WATER : RHO_AIR * C_AIR) * p.v!) / 1000,
      },
    ],
    params: [
      {
        key: 'v',
        symbol: 'v',
        label: 'vitesse du piston',
        unit: 'mm/s',
        min: 0.1,
        max: 100,
        step: 0.1,
        default: 10,
        scale: 'log',
        digits: 1,
        quantity: 'velocity',
      },
    ],
    views: [
      {
        key: 'medium',
        label: 'Milieu',
        default: 'air',
        options: [
          { key: 'air', label: 'Air' },
          { key: 'water', label: 'Eau' },
        ],
      },
    ],
  },
  {
    id: '1b-energy',
    derived: [{ key: 'ratio', digits: 2, fn: (p) => 1 - p.R! * p.R! }],
    params: [
      freq(300),
      {
        key: 'R',
        symbol: 'R',
        label: 'coefficient de réflexion',
        unit: '',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0,
        digits: 2,
      },
    ],
    views: [
      {
        key: 'curves',
        label: 'Courbes',
        default: 'energy',
        options: [
          { key: 'pv', label: 'p et v' },
          { key: 'energy', label: 'Énergie' },
        ],
      },
    ],
  },
  {
    id: '1b-levels',
    params: [
      {
        key: 'L',
        symbol: 'L_p',
        label: 'niveau de pression',
        unit: 'dB',
        min: 0,
        max: 194,
        step: 1,
        default: 60,
        quantity: 'pressure',
      },
      {
        key: 'N',
        symbol: 'N',
        label: 'nombre de sources',
        unit: '',
        min: 1,
        max: 16,
        step: 1,
        default: 1,
      },
    ],
    views: [
      {
        key: 'scale',
        label: 'Échelle',
        default: 'log',
        options: [
          { key: 'log', label: 'Décibels' },
          { key: 'lin', label: 'Pascals' },
        ],
      },
      {
        key: 'sum',
        label: 'Sources',
        default: 'incoherent',
        options: [
          { key: 'incoherent', label: 'Incohérentes' },
          { key: 'coherent', label: 'Cohérentes, en phase' },
        ],
      },
    ],
  },
  {
    id: '1b-shock',
    params: [
      level(140, 100, 170),
      {
        key: 'f',
        symbol: 'f',
        label: 'fréquence',
        unit: 'Hz',
        min: 100,
        max: 10000,
        step: 10,
        default: 1000,
        scale: 'log',
      },
      {
        key: 'x',
        symbol: 'x',
        label: 'distance parcourue',
        unit: 'm',
        min: 0.1,
        max: 10000,
        step: 0.1,
        default: 5,
        scale: 'log',
        digits: 1,
      },
    ],
    terms: [
      { key: 'convective', label: 'convection', toggleable: true },
      { key: 'stateLaw', label: "non-linéarité de l'état", toggleable: true },
    ],
  },
];
