import type { SceneSpec } from '../lib/scene/types';

/** Prerequisite « Rappels de mécanique des fluides ». */
export const fluidScenes: SceneSpec[] = [
  {
    id: 'fl-parcel',
    params: [
      {
        key: 'grad',
        symbol: '\\partial p/\\partial x',
        label: 'gradient de pression',
        unit: 'Pa/m',
        min: -400,
        max: 400,
        step: 10,
        default: 200,
        quantity: 'pressure',
      },
      {
        key: 'pmean',
        symbol: 'p_0',
        label: 'pression moyenne',
        unit: 'kPa',
        min: 20,
        max: 1000,
        step: 1,
        default: 101,
        scale: 'log',
      },
    ],
    terms: [{ key: 'convective', label: 'terme convectif', toggleable: true }],
    views: [
      {
        key: 'frame',
        label: 'Description',
        default: 'lagrange',
        options: [
          { key: 'euler', label: 'Eulérienne' },
          { key: 'lagrange', label: 'Lagrangienne' },
        ],
      },
    ],
  },
  {
    id: 'fl-compress',
    params: [
      {
        key: 'strain',
        symbol: '\\Delta V / V',
        label: 'compression relative',
        unit: '%',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.1,
        digits: 2,
      },
    ],
    views: [
      {
        key: 'medium',
        label: 'Fluide',
        default: 'air',
        options: [
          { key: 'air', label: 'Air' },
          { key: 'water', label: 'Eau' },
        ],
      },
    ],
  },
];
