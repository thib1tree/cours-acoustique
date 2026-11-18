/**
 * Scene declarations. Content refers to scenes by id (e.g. `scene="1a-tube"`);
 * each scene lists the parameters, terms and views shared by its islands.
 */
import type { SceneSpec } from '../lib/scene/types';
import { fluidScenes } from './fluids';
import { waveEquationScenes } from './wave-equation';
import { labScenes } from './lab';
import { planeWaveScenes } from './plane-waves';
import { guideScenes } from './guides';
import { radiationScenes } from './radiation';

const all: SceneSpec[] = [
  ...fluidScenes,
  ...waveEquationScenes,
  ...planeWaveScenes,
  ...guideScenes,
  ...radiationScenes,
  ...labScenes,
];

export const SCENES: Record<string, SceneSpec> = Object.fromEntries(all.map((s) => [s.id, s]));
