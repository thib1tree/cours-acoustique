import type { SceneSpec } from '../lib/scene/types';
import {
  eyringT,
  listModes,
  meanFreePath,
  modeFrequency,
  sabineT,
  schroederFrequency,
  type Vec3,
} from '../lib/physics/room';

const C0 = 343.2;
const dims = (p: Readonly<Record<string, number>>): Vec3 => [p.Lx!, p.Ly!, p.Lz!];
/** Shoebox of volume V with proportions 1.6 : 1.25 : 1 (length, width, height). */
export function shoebox(V: number): Vec3 {
  const h = Math.cbrt(V / (1.6 * 1.25));
  return [1.6 * h, 1.25 * h, h];
}
export const area = (L: Vec3): number => 2 * (L[0] * L[1] + L[1] * L[2] + L[0] * L[2]);

/** Chapter 7: room acoustics. */
export const roomScenes: SceneSpec[] = [
  {
    id: '7-modes',
    params: [
      {
        key: 'Lx',
        symbol: 'L_x',
        label: 'longueur de la pièce',
        unit: 'm',
        min: 2,
        max: 12,
        step: 0.05,
        default: 5,
        digits: 2,
      },
      {
        key: 'Ly',
        symbol: 'L_y',
        label: 'largeur de la pièce',
        unit: 'm',
        min: 2,
        max: 10,
        step: 0.05,
        default: 4,
        digits: 2,
      },
      {
        key: 'Lz',
        symbol: 'L_z',
        label: 'hauteur de la pièce',
        unit: 'm',
        min: 2,
        max: 5,
        step: 0.05,
        default: 2.7,
        digits: 2,
      },
      {
        key: 'nx',
        symbol: 'n_x',
        label: 'ordre du mode selon x',
        unit: '',
        min: 0,
        max: 4,
        step: 1,
        default: 1,
      },
      {
        key: 'ny',
        symbol: 'n_y',
        label: 'ordre du mode selon y',
        unit: '',
        min: 0,
        max: 4,
        step: 1,
        default: 1,
      },
      {
        key: 'T',
        symbol: 'T',
        label: 'durée de réverbération',
        unit: 's',
        min: 0.2,
        max: 2,
        step: 0.05,
        default: 0.5,
        digits: 2,
      },
    ],
    views: [
      {
        key: 'hear',
        label: 'Écouter',
        default: 'room',
        options: [
          { key: 'room', label: 'dans la pièce' },
          { key: 'free', label: 'en champ libre' },
        ],
      },
    ],
    derived: [
      { key: 'fm', digits: 1, fn: (p) => modeFrequency([p.nx!, p.ny!, 0], dims(p), C0) },
      { key: 'fs', digits: 0, fn: (p) => schroederFrequency(p.T!, p.Lx! * p.Ly! * p.Lz!) },
      { key: 'n100', digits: 0, fn: (p) => listModes(dims(p), 100, C0).length },
    ],
  },
  {
    id: '7-images',
    params: [
      {
        key: 'alpha',
        symbol: '\\alpha',
        label: 'coefficient d’absorption des parois',
        unit: '',
        min: 0,
        max: 0.9,
        step: 0.01,
        default: 0.1,
        digits: 2,
      },
      {
        key: 'order',
        symbol: 'n',
        label: 'ordre maximal des images dessinées',
        unit: '',
        min: 1,
        max: 6,
        step: 1,
        default: 3,
      },
    ],
  },
  {
    id: '7-reverb',
    params: [
      {
        key: 'V',
        symbol: 'V',
        label: 'volume de la salle',
        unit: 'm³',
        min: 30,
        max: 30000,
        step: 1,
        default: 300,
        scale: 'log',
        digits: 0,
      },
      {
        key: 'alpha',
        symbol: '\\bar\\alpha',
        label: 'coefficient d’absorption moyen',
        unit: '',
        min: 0.02,
        max: 0.8,
        step: 0.01,
        default: 0.15,
        scale: 'log',
        digits: 2,
      },
    ],
    views: [
      {
        key: 'source',
        label: 'Son',
        default: 'plucks',
        options: [
          { key: 'plucks', label: 'notes pincées' },
          { key: 'clap', label: 'claquement' },
        ],
      },
      {
        key: 'hear',
        label: 'Écouter',
        default: 'room',
        options: [
          { key: 'room', label: 'dans la salle' },
          { key: 'dry', label: 'sans salle' },
        ],
      },
    ],
    derived: [
      {
        key: 'Ts',
        digits: 2,
        fn: (p) => {
          const L = shoebox(p.V!);
          return sabineT(p.V!, area(L), p.alpha!, C0);
        },
      },
      {
        key: 'Te',
        digits: 2,
        fn: (p) => {
          const L = shoebox(p.V!);
          return eyringT(p.V!, area(L), p.alpha!, C0);
        },
      },
      { key: 'lm', digits: 1, fn: (p) => meanFreePath(p.V!, area(shoebox(p.V!))) },
      { key: 'S', digits: 0, fn: (p) => area(shoebox(p.V!)) },
    ],
  },
];
