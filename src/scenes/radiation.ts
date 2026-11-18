import type { SceneSpec } from '../lib/scene/types';
import {
  firstNullAngle,
  halfPowerAngle,
  pairPowerRatio,
  sphereImpedance,
} from '../lib/physics/radiation';

const C0 = 343.2;
// No −3 dB point or no null in the front half-space: report 90°.
const deg = (x: number | null) => (x === null ? 90 : (x * 180) / Math.PI);
const kd = (p: Readonly<Record<string, number>>) => (2 * Math.PI * p.f! * p.d! * 1e-2) / C0;

/** Chapter 4: radiation. */
export const radiationScenes: SceneSpec[] = [
  {
    id: '4-sphere',
    params: [
      {
        key: 'ka',
        symbol: 'ka',
        label: 'taille de la sphère rapportée à la longueur d’onde',
        unit: '',
        min: 0.05,
        max: 10,
        step: 0.01,
        default: 0.3,
        scale: 'log',
        digits: 2,
      },
    ],
    terms: [{ key: 'near', label: 'terme de champ proche i/(kr)', toggleable: true }],
    views: [
      {
        key: 'scale',
        label: 'Amplitudes',
        default: 'r',
        options: [
          { key: 'r', label: 'multipliées par r/a' },
          { key: 'raw', label: 'brutes' },
        ],
      },
    ],
    derived: [
      { key: 'R', digits: 3, fn: (p) => sphereImpedance(p.ka!)[0] },
      { key: 'X', digits: 3, fn: (p) => -sphereImpedance(p.ka!)[1] },
      { key: 'phi', digits: 0, fn: (p) => (Math.atan(1 / p.ka!) * 180) / Math.PI },
    ],
  },
  {
    id: '4-pair',
    params: [
      {
        key: 'f',
        symbol: 'f',
        label: 'fréquence',
        unit: 'Hz',
        min: 30,
        max: 3000,
        step: 1,
        default: 200,
        scale: 'log',
        digits: 0,
      },
      {
        key: 'd',
        symbol: 'd',
        label: 'distance entre les deux sources',
        unit: 'cm',
        min: 2,
        max: 100,
        step: 0.5,
        default: 20,
        scale: 'log',
        digits: 1,
      },
    ],
    views: [
      {
        key: 'phase',
        label: 'Les deux sources',
        default: 'opp',
        options: [
          { key: 'opp', label: 'En opposition (dipôle)' },
          { key: 'same', label: 'En phase' },
        ],
      },
    ],
    derived: [
      { key: 'kd', digits: 2, fn: (p) => kd(p) },
      {
        key: 'ratio',
        digits: 1,
        fn: (p, _t, v) => 10 * Math.log10(pairPowerRatio(kd(p), v.phase === 'same' ? 1 : -1)),
      },
    ],
  },
  {
    id: '4-piston',
    params: [
      {
        key: 'ka',
        symbol: 'ka',
        label: 'rayon du piston rapporté à la longueur d’onde',
        unit: '',
        min: 0.3,
        max: 12,
        step: 0.01,
        default: 5,
        scale: 'log',
        digits: 2,
      },
    ],
    derived: [
      { key: 'theta3', digits: 0, fn: (p) => deg(halfPowerAngle(p.ka!)) },
      { key: 'null', digits: 0, fn: (p) => deg(firstNullAngle(p.ka!)) },
      { key: 'zR', digits: 1, fn: (p) => p.ka! / 2 },
    ],
  },
];
