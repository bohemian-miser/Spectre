/**
 * The classifier's thresholds, for explaining it on the page.
 *
 * `web/circuit-classes/export-site.py` copies them from `classify.py` into
 * meta.json, so the page shows the numbers the data was made with. Data
 * exported before that falls back to these defaults, which a test keeps equal
 * to classify.py.
 */

import type { ClassificationMeta, Threshold } from './data';

export type ThresholdName =
  | 'GROW'
  | 'STATIC'
  | 'LINE_G'
  | 'LINE_FO'
  | 'SLIVER'
  | 'OFILL'
  | 'FILL'
  | 'TRI'
  | 'FAT'
  | 'THIN';

export const DEFAULT_THRESHOLDS: Readonly<Record<ThresholdName, Threshold>> = {
  GROW: { value: 0.5, meaning: 'gC or gO at or above this: the strand keeps growing with the patch' },
  STATIC: { value: 0.3, meaning: 'below this: it has stopped growing' },
  LINE_G: { value: 0.9, meaning: 'an open strand growing like N^1 or faster is a space-filling infinite line' },
  LINE_FO: { value: 0.5, meaning: '...and open strands must carry at least this share of all segments' },
  SLIVER: { value: 4, meaning: 'open strands at least this elongated are cut-offs along the patch edge, not lines' },
  OFILL: { value: 0.35, meaning: '...and a line fills its hull; a cut-open triangle outline does not' },
  FILL: { value: 0.45, meaning: 'a circuit covering this share of its hull is space-filling' },
  TRI: { value: 0.8, meaning: 'hull area over the smallest enclosing equilateral triangle: triangular at or above this' },
  FAT: { value: 0.35, meaning: 'enclosed area over hull area: a triangle outline encloses at least this much' },
  THIN: { value: 0.3, meaning: 'enclosed area over hull area: a thin thread encloses less than this' },
};

export const THRESHOLD_NAMES = Object.keys(DEFAULT_THRESHOLDS) as ThresholdName[];

/** The thresholds the data was classified with (meta.json), else the defaults. */
export function classifierThresholds(meta: ClassificationMeta): Record<ThresholdName, Threshold> {
  const out = { ...DEFAULT_THRESHOLDS };
  for (const k of THRESHOLD_NAMES) {
    const t = meta.thresholds?.[k];
    if (t && typeof t.value === 'number') out[k] = t;
  }
  return out;
}

/** The measurements `classify` reads, as named in meta.json and classify.py. */
export interface ClassifierInputs {
  readonly gC: number;
  readonly gO: number;
  readonly fo: number;
  readonly cFill: number;
  readonly cFat: number;
  readonly cTri: number;
  readonly oFill: number;
  readonly oElong: number;
}

/**
 * The decision in classify.py, step for step, returning the class id and
 * the number of the step that decided it (as listed on the page).
 */
export function classify(f: ClassifierInputs, t: Record<ThresholdName, Threshold>): { cls: string; step: number } {
  const v = (k: ThresholdName) => t[k].value;
  const grows = f.gC >= v('GROW');
  const lineLike = f.gO >= v('LINE_G') && f.fo >= v('LINE_FO') && f.oElong < v('SLIVER') && f.oFill >= v('OFILL');
  if (!grows && f.gO < v('STATIC')) return { cls: 'bounded', step: 1 };
  if (!grows && lineLike) return { cls: 'line', step: 2 };
  if (grows && lineLike) return { cls: 'mixed', step: 3 };
  if (grows) {
    if (f.cFill >= v('FILL')) return { cls: f.cTri >= v('TRI') ? 'mixed' : 'blob', step: 4 };
    if (f.cFat < 0) return { cls: f.cTri >= v('TRI') ? 'triangle' : 'unclear', step: 5 };
    if (f.cTri >= v('TRI') && f.cFat >= v('FAT')) return { cls: 'triangle', step: 6 };
    if (f.cFat < v('THIN')) return { cls: 'thin', step: 7 };
  }
  return { cls: 'unclear', step: 8 };
}
