import type { SceneSpec } from '../lib/scene/types';

/** Internal component lab (/lab/), not linked from the course. */
export const labScenes: SceneSpec[] = [
  {
    id: 'lab-field',
    params: [
      {
        key: 'kd',
        symbol: 'kd',
        label: 'écartement des sources',
        unit: '',
        min: 0.1,
        max: 12,
        step: 0.1,
        default: 3,
        digits: 1,
      },
    ],
    views: [
      {
        key: 'source',
        label: 'Source',
        default: 'dipole',
        options: [
          { key: 'monopole', label: 'Monopôle' },
          { key: 'dipole', label: 'Dipôle' },
        ],
      },
    ],
  },
  {
    id: 'lab-polar',
    params: [
      {
        key: 'ka',
        symbol: 'ka',
        label: 'taille du piston',
        unit: '',
        min: 0.1,
        max: 20,
        step: 0.1,
        default: 5,
        digits: 1,
      },
    ],
  },
];
