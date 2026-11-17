import type { SceneSpec } from '../lib/scene/types';
import { END_CORRECTION } from '../lib/physics/tubes';
import { helmholtzFrequency, plugMass } from '../lib/physics/helmholtz';
import { cutoffFrequency } from '../lib/physics/waveguide';

const C0 = 343.2;
const RHO = 1.204;
const res = (p: Readonly<Record<string, number>>) => ({
  V: p.V! * 1e-3,
  a: p.a! * 1e-3,
  L: p.Ln! * 1e-2,
});

/** Chapter 3: guides and cavities. */
export const guideScenes: SceneSpec[] = [
  {
    id: '3-tube',
    params: [
      {
        key: 'L',
        symbol: 'L',
        label: 'longueur du tube',
        unit: 'm',
        min: 0.02,
        max: 1.2,
        step: 0.005,
        default: 0.6,
        scale: 'log',
        digits: 3,
      },
      {
        key: 'a',
        symbol: 'a',
        label: 'rayon du tube',
        unit: 'mm',
        min: 2,
        max: 30,
        step: 0.5,
        default: 7.5,
        digits: 1,
      },
      {
        key: 'n',
        symbol: 'n',
        label: 'résonance affichée',
        unit: '',
        min: 1,
        max: 5,
        step: 1,
        default: 1,
      },
    ],
    terms: [
      { key: 'radmass', label: 'masse de rayonnement', toggleable: true },
      { key: 'radres', label: 'résistance de rayonnement', toggleable: true },
    ],
    views: [
      {
        key: 'excite',
        label: 'Excitation',
        default: 'reed',
        options: [
          { key: 'reed', label: 'Anche (bout fermé)' },
          { key: 'flute', label: 'Biseau (bout ouvert)' },
        ],
      },
    ],
    derived: [
      { key: 'delta', digits: 1, fn: (p) => END_CORRECTION.unflanged * p.a! },
      {
        key: 'Leff',
        digits: 3,
        fn: (p, t) => p.L! + (t.radmass !== false ? END_CORRECTION.unflanged * p.a! * 1e-3 : 0),
      },
    ],
  },
  {
    id: '3-helmholtz',
    params: [
      {
        key: 'V',
        symbol: 'V',
        label: 'volume de la cavité',
        unit: 'L',
        min: 0.05,
        max: 5,
        step: 0.01,
        default: 0.75,
        scale: 'log',
        digits: 2,
      },
      {
        key: 'a',
        symbol: 'a',
        label: 'rayon du col',
        unit: 'mm',
        min: 2,
        max: 30,
        step: 0.5,
        default: 9,
        digits: 1,
      },
      {
        key: 'Ln',
        symbol: 'L',
        label: 'longueur du col',
        unit: 'cm',
        min: 0.5,
        max: 20,
        step: 0.5,
        default: 8,
        digits: 1,
      },
    ],
    terms: [{ key: 'endcorr', label: 'masse ajoutée aux bouts du col', toggleable: true }],
    derived: [
      { key: 'f0', digits: 0, fn: (p, t) => helmholtzFrequency(res(p), C0, t.endcorr !== false) },
      { key: 'm', digits: 2, fn: (p, t) => 1000 * plugMass(res(p), RHO, t.endcorr !== false) },
    ],
  },
  {
    id: '3-duct',
    params: [
      {
        key: 'fr',
        symbol: 'f/f_c',
        label: 'fréquence rapportée à la coupure',
        unit: '',
        min: 0.5,
        max: 3,
        step: 0.01,
        default: 1.6,
        digits: 2,
      },
      {
        key: 'm',
        symbol: 'm',
        label: 'ordre du mode transverse',
        unit: '',
        min: 1,
        max: 3,
        step: 1,
        default: 1,
      },
    ],
    views: [
      {
        key: 'show',
        label: 'Affichage',
        default: 'mode',
        options: [
          { key: 'mode', label: 'Mode guidé' },
          { key: 'wave', label: 'Une seule onde plane' },
        ],
      },
    ],
    derived: [{ key: 'fc', digits: 0, fn: (p) => cutoffFrequency(p.m!, 0.1, C0) }],
  },
];
