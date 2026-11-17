/**
 * Reference points of the sound-level ruler (chapter 1b, D9).
 * `kind: 'defined'` values follow from a definition or a standard, `'calculated'` from
 * physics; `'typical'` values are orders of magnitude that MUST carry a source.
 */
export interface LevelExample {
  readonly L: number;
  readonly label: string;
  readonly kind: 'defined' | 'calculated' | 'typical';
  readonly source?: string;
  readonly verified: boolean;
}

export const LEVEL_EXAMPLES: readonly LevelExample[] = [
  { L: 0, label: 'référence : 20 µPa', kind: 'defined', source: 'ISO 1683', verified: true },
  // TODO-VERIFY: typical conversational speech at 1 m ≈ 60 dB (e.g. ANSI S3.5 / Pearsons et al. 1977).
  {
    L: 60,
    label: 'conversation à 1 m',
    kind: 'typical',
    source: 'Pearsons, Bennett & Fidell (1977), EPA 600/1-77-025',
    verified: false,
  },
  {
    L: 94,
    label: 'calibreur : 1 Pa',
    kind: 'defined',
    source: 'IEC 60942 (calibreurs acoustiques)',
    verified: true,
  },
  // TODO-VERIFY: threshold of pain often quoted ≈ 120–140 dB.
  {
    L: 130,
    label: 'seuil de douleur (ordre de grandeur)',
    kind: 'typical',
    source: 'à préciser',
    verified: false,
  },
  { L: 194, label: 'pression efficace = 1 atm', kind: 'calculated', verified: true },
];
