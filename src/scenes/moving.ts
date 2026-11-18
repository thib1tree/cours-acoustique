import type { SceneSpec } from '../lib/scene/types';
import { machAngle } from '../lib/physics/moving';

const C0 = 343.2;
const mach = (p: Readonly<Record<string, number>>) => p.V! / 3.6 / C0;

/** Chapter 5: moving sources. */
export const movingScenes: SceneSpec[] = [
  {
    id: '5-moving',
    params: [
      {
        key: 'M',
        symbol: 'M',
        label: 'nombre de Mach',
        unit: '',
        min: 0,
        max: 2,
        step: 0.01,
        default: 0.5,
        digits: 2,
      },
    ],
    views: [
      {
        key: 'mover',
        label: 'Qui bouge',
        default: 'source',
        options: [
          { key: 'source', label: 'La source' },
          { key: 'observer', label: 'Les auditeurs' },
        ],
      },
      {
        key: 'frame',
        label: 'Référentiel',
        default: 'medium',
        options: [
          { key: 'medium', label: 'Air au repos' },
          { key: 'body', label: 'Objet en mouvement' },
        ],
      },
    ],
    derived: [
      {
        key: 'front',
        digits: 2,
        fn: (p, _t, v) =>
          v.mover === 'observer' ? 1 + p.M! : p.M! < 1 ? 1 / (1 - p.M!) : Infinity,
      },
      {
        key: 'back',
        digits: 2,
        fn: (p, _t, v) => (v.mover === 'observer' ? 1 - p.M! : 1 / (1 + p.M!)),
      },
      { key: 'alpha', digits: 0, fn: (p) => ((machAngle(p.M!) ?? Math.PI / 2) * 180) / Math.PI },
    ],
  },
  {
    id: '5-passby',
    params: [
      {
        key: 'V',
        symbol: 'V',
        label: 'vitesse du véhicule',
        unit: 'km/h',
        min: 10,
        max: 400,
        step: 1,
        default: 90,
        scale: 'log',
        digits: 0,
      },
      {
        key: 'd',
        symbol: 'd',
        label: 'distance au passage',
        unit: 'm',
        min: 2,
        max: 50,
        step: 0.5,
        default: 10,
        scale: 'log',
        digits: 1,
      },
      {
        key: 'f0',
        symbol: 'f_0',
        label: 'fréquence émise',
        unit: 'Hz',
        min: 100,
        max: 1000,
        step: 1,
        default: 440,
        scale: 'log',
        digits: 0,
      },
    ],
    terms: [
      { key: 'doppler', label: 'effet Doppler', toggleable: true },
      { key: 'spreading', label: 'divergence sphérique', toggleable: true },
      { key: 'convective', label: 'amplification convective', toggleable: true },
    ],
    derived: [
      { key: 'M', digits: 3, fn: (p) => mach(p) },
      { key: 'fa', digits: 0, fn: (p) => p.f0! / (1 - mach(p)) },
      { key: 'fr', digits: 0, fn: (p) => p.f0! / (1 + mach(p)) },
      { key: 'semi', digits: 1, fn: (p) => 12 * Math.log2((1 + mach(p)) / (1 - mach(p))) },
    ],
  },
];
