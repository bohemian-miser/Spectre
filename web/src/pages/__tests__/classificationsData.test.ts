import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildData,
  classQuartiles,
  columnsToRows,
  fieldGroup,
  groupFields,
  type ClassificationMeta,
  type FieldInfo,
} from '../classifications/data';
import { firstSentence } from '../classifications/Explain';
import { rowsByClass } from '../classifications/ScatterPlot';
import { DEFAULT_THRESHOLDS, THRESHOLD_NAMES, classifierThresholds, classify } from '../classifications/classifier';

const field = (key: string, extra: Partial<FieldInfo> = {}): FieldInfo => ({
  key,
  label: key,
  lo: 0,
  hi: 1,
  scale: 'linear',
  description: '',
  ...extra,
});

describe('classification data', () => {
  it('transposes column-major points back to rows', () => {
    // Three rows of three bytes, stored column by column.
    const cols = new Uint8Array([0, 1, 2, 10, 11, 12, 20, 21, 22]);
    expect([...columnsToRows(cols, 3)]).toEqual([0, 10, 20, 1, 11, 21, 2, 12, 22]);
    const meta = {
      version: 3,
      rowBytes: 3,
      layout: 'columns',
      classes: [{ id: 'a', label: 'A' }],
      fields: [field('x'), field('y')],
      blocks: [],
      levels: '',
    } as unknown as ClassificationMeta;
    const data = buildData(meta, cols);
    expect(data.nRows).toBe(3);
    expect(data.rows[1 * 3 + 2]).toBe(21);
  });

  it('groups fields by their own group, or by key for older data', () => {
    const fields = [
      field('gC'),
      field('cFill'),
      field('dCr', { group: 'Growth & dimension' }),
      field('oFill'),
      field('mystery'),
      field('maxNest'),
    ];
    expect(fieldGroup(fields[1])).toBe('Biggest circuit shape');
    expect(groupFields(fields)).toEqual([
      { name: 'Growth & dimension', fields: [0, 2] },
      { name: 'Biggest circuit shape', fields: [1] },
      { name: 'Longest open strand', fields: [3] },
      { name: 'Other', fields: [4] },
      { name: 'Nesting', fields: [5] },
    ]);
  });

  it('computes quartiles per class and field from the stored bytes', () => {
    const meta: ClassificationMeta = {
      version: 1,
      rowBytes: 2,
      classes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
      fields: [field('x', { hi: 255 })],
      blocks: [],
      levels: '',
    };
    // Class a: 0, 10, 20, 30, 40; class b: 100; one unswept row.
    const rows = new Uint8Array([0, 0, 0, 10, 0, 20, 0, 30, 0, 40, 1, 100, 255, 7]);
    const q = classQuartiles(buildData(meta, rows));
    expect(q[0][0]).toEqual([10, 20, 30]);
    expect(q[0][1]).toEqual([100, 100, 100]);
    expect(q[0][2]).toBeNull();
  });
});

describe('page helpers', () => {
  it('lists each class\'s rows once, skipping unswept rows', () => {
    const meta = {
      rowBytes: 1,
      classes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      fields: [],
      blocks: [],
    } as unknown as ClassificationMeta;
    const lists = rowsByClass(buildData(meta, new Uint8Array([1, 0, 255, 1, 0])));
    expect(lists.map((l) => [...l])).toEqual([[1, 4], [0, 3]]);
  });

  it('cuts a description to its first sentence without splitting decimals', () => {
    expect(firstSentence('Twice gC: about 1.4 here. More detail. And more.')).toBe('Twice gC: about 1.4 here.');
    expect(firstSentence('a in "L ∝ N^a", from level 4 (N = tiles). 0 bounded, ~0.7 triangle.')).toBe(
      'a in "L ∝ N^a", from level 4 (N = tiles).',
    );
    expect(firstSentence('One sentence only.')).toBe('One sentence only.');
  });
});

describe('classifier explanation', () => {
  it('uses the same thresholds as classify.py', () => {
    const py = readFileSync(new URL('../../../circuit-classes/classify.py', import.meta.url), 'utf8');
    const found: Record<string, number> = {};
    for (const m of py.matchAll(/^\s+'([A-Z_]+)': \(([\d.]+),/gm)) found[m[1]] = Number(m[2]);
    expect(Object.keys(found).sort()).toEqual([...THRESHOLD_NAMES].sort());
    for (const k of THRESHOLD_NAMES) expect(found[k]).toBe(DEFAULT_THRESHOLDS[k].value);
  });

  it('prefers thresholds stored in meta.json', () => {
    const meta = { thresholds: { GROW: { value: 0.6, meaning: 'm' } } } as unknown as ClassificationMeta;
    const t = classifierThresholds(meta);
    expect(t.GROW.value).toBe(0.6);
    expect(t.TRI.value).toBe(DEFAULT_THRESHOLDS.TRI.value);
  });

  it('replays the decision order of classify.py', () => {
    const t = classifierThresholds({} as ClassificationMeta);
    const base = { gC: 0, gO: 0, fo: 0, cFill: 0, cFat: 0, cTri: 0, oFill: 0, oElong: 1 };
    expect(classify(base, t)).toEqual({ cls: 'bounded', step: 1 });
    const line = { ...base, gO: 1, fo: 0.8, oFill: 0.6 };
    expect(classify(line, t)).toEqual({ cls: 'line', step: 2 });
    expect(classify({ ...line, oElong: 5 }, t)).toEqual({ cls: 'unclear', step: 8 });
    expect(classify({ ...line, gC: 0.7 }, t)).toEqual({ cls: 'mixed', step: 3 });
    const grows = { ...base, gC: 0.7, gO: 0.7 };
    expect(classify({ ...grows, cFill: 0.6, cTri: 0.9 }, t)).toEqual({ cls: 'mixed', step: 4 });
    expect(classify({ ...grows, cFill: 0.6, cTri: 0.7 }, t)).toEqual({ cls: 'blob', step: 4 });
    expect(classify({ ...grows, cFat: -1, cTri: 0.9 }, t)).toEqual({ cls: 'triangle', step: 5 });
    expect(classify({ ...grows, cFat: 0.6, cTri: 0.9 }, t)).toEqual({ cls: 'triangle', step: 6 });
    expect(classify({ ...grows, cFat: 0.2, cTri: 0.5 }, t)).toEqual({ cls: 'thin', step: 7 });
    expect(classify({ ...grows, cFat: 0.32, cTri: 0.5 }, t)).toEqual({ cls: 'unclear', step: 8 });
  });
});
