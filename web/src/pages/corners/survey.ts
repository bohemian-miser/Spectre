/**
 * One row of the survey of every circuit: its symmetry shares, its three-fold
 * polygon fits and how much the start matters when the corners are walked
 * round. Cheap enough to run on all of a rule's circuits in a worker.
 */

import { chordCurve, decimation, evenStarts, fitSymmetric, spectrum, symmetryShare, type Loop } from './measure';

export const SURVEY_SIDES = [3, 6, 9, 12] as const;
export const SURVEY_WALK = [3, 6, 9] as const;

export interface SurveyRow {
  /** Share beyond the circle on the harmonics of a third and a sixth of a turn. */
  readonly third: number;
  readonly sixth: number;
  /** rms ÷ Rg of the best polygon whose thirds share one set of cuts, by sides (missing if the loop does not split into thirds). */
  readonly fit: Readonly<Record<number, number>>;
  /** (worst − best) ÷ mean when k equal-tile corners are walked round, by k. */
  readonly contrast: Readonly<Record<number, number>>;
}

export function surveyCircuit(loop: Loop, rg: number): SurveyRow {
  const s = spectrum(loop);
  const fit: Record<number, number> = {};
  const step = decimation(loop.n, 3, 540);
  if (step !== null) for (const k of SURVEY_SIDES) fit[k] = fitSymmetric(loop, k, 3, rg, step).rms;
  const starts = evenStarts(loop.n, 360);
  const contrast: Record<number, number> = {};
  for (const k of SURVEY_WALK) contrast[k] = chordCurve(loop, k, starts, rg).contrast;
  return { third: symmetryShare(s, 3, true), sixth: symmetryShare(s, 6, true), fit, contrast };
}
