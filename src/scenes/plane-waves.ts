import type { SceneSpec } from '../lib/scene/types';
import { C } from '../lib/physics/complex';
import { abs } from '../lib/physics/complex';
import { intensityTransmission, oblique, reflection, transmission } from '../lib/physics/interface';
import {
  absorption,
  resistiveScreen,
  standingWaveRatio,
  surfaceReflection,
} from '../lib/physics/absorption';

const Z0 = 413;
const C0 = 343.2;

/** Chapter 2: plane waves at interfaces and absorbing surfaces. */
export const planeWaveScenes: SceneSpec[] = [
  {
    id: '2-interface',
    params: [
      {
        key: 'zr',
        symbol: 'Z_2/Z_1',
        label: 'rapport des impédances',
        unit: '',
        min: 1e-4,
        max: 1e4,
        step: 0.0001,
        default: 4,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'cr',
        symbol: 'c_2/c_1',
        label: 'rapport des célérités',
        unit: '',
        min: 0.2,
        max: 5,
        step: 0.01,
        default: 2,
        scale: 'log',
        digits: 2,
      },
    ],
    derived: [
      { key: 'R', digits: 3, fn: (p) => reflection(1, p.zr!) },
      { key: 'T', digits: 3, fn: (p) => transmission(1, p.zr!) },
      { key: 'tau', digits: 1, fn: (p) => 100 * intensityTransmission(1, p.zr!) },
    ],
  },
  {
    id: '2-oblique',
    params: [
      {
        key: 'theta',
        symbol: '\\theta_1',
        label: "angle d'incidence",
        unit: '°',
        min: 0,
        max: 89,
        step: 1,
        default: 30,
      },
      {
        key: 'cr',
        symbol: 'c_2/c_1',
        label: 'rapport des célérités',
        unit: '',
        min: 0.3,
        max: 5,
        step: 0.01,
        default: 1.6,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'rr',
        symbol: '\\rho_2/\\rho_1',
        label: 'rapport des masses volumiques',
        unit: '',
        min: 0.1,
        max: 10,
        step: 0.01,
        default: 1.3,
        scale: 'log',
        digits: 2,
      },
    ],
    derived: [
      {
        key: 'Rabs',
        digits: 3,
        fn: (p) =>
          abs(oblique({ rho: 1, c: 1 }, { rho: p.rr!, c: p.cr! }, (p.theta! * Math.PI) / 180).R),
      },
      { key: 'kt', digits: 3, fn: (p) => Math.sin((p.theta! * Math.PI) / 180) },
    ],
  },
  {
    id: '2-standing',
    params: [
      {
        key: 'res',
        symbol: "\\zeta'",
        label: 'résistance réduite de la paroi',
        unit: '',
        min: 0.05,
        max: 20,
        step: 0.01,
        default: 3,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'reac',
        symbol: "\\zeta''",
        label: 'réactance réduite de la paroi',
        unit: '',
        min: -5,
        max: 5,
        step: 0.05,
        default: 0,
        digits: 2,
      },
    ],
    derived: [
      { key: 'alpha', digits: 2, fn: (p) => absorption(C(p.res! * Z0, p.reac! * Z0), Z0) },
      {
        key: 'swr',
        digits: 2,
        fn: (p) => standingWaveRatio(surfaceReflection(C(p.res! * Z0, p.reac! * Z0), Z0)),
      },
    ],
  },
  {
    id: '2-absorber',
    params: [
      {
        key: 'd',
        symbol: 'd',
        label: 'distance au mur ou épaisseur',
        unit: 'cm',
        min: 1,
        max: 30,
        step: 0.5,
        default: 5,
        digits: 1,
      },
      {
        key: 'r',
        symbol: 'r/\\rho_0c_0',
        label: "résistance de l'écran",
        unit: '',
        min: 0.1,
        max: 10,
        step: 0.01,
        default: 1,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'sigma',
        symbol: '\\sigma',
        label: "résistivité au passage de l'air",
        unit: 'kPa·s/m²',
        min: 2,
        max: 100,
        step: 0.5,
        default: 20,
        scale: 'log',
        digits: 1,
      },
    ],
    terms: [
      { key: 'r', label: "résistance de l'écran", toggleable: true },
      { key: 'gap', label: "réactance de la lame d'air", toggleable: true },
    ],
    views: [
      {
        key: 'model',
        label: 'Absorbant',
        default: 'screen',
        options: [
          { key: 'screen', label: 'Écran résistif' },
          { key: 'porous', label: 'Couche poreuse' },
        ],
      },
    ],
    derived: [
      { key: 'fq', digits: 0, fn: (p) => C0 / (4 * (p.d! / 100)) },
      {
        key: 'alphaq',
        digits: 2,
        fn: (p, t) => {
          const d = p.d! / 100;
          const k = (2 * Math.PI * (C0 / (4 * d))) / C0;
          return absorption(
            resistiveScreen(p.r! * Z0, d, k, Z0, { r: t.r !== false, gap: t.gap !== false }),
            Z0,
          );
        },
      },
    ],
  },
  {
    id: '2-gap',
    params: [
      {
        key: 'f',
        symbol: 'f',
        label: 'fréquence de la sonde',
        unit: 'MHz',
        min: 0.5,
        max: 15,
        step: 0.1,
        default: 5,
        scale: 'log',
        digits: 1,
      },
    ],
  },
];
