/**
 * The committed data of the hexagon rules with few combinations
 * (`public/data/foundations/hex-<rule>/`) against a live analysis
 * (`runLive`, the code the page's worker runs) of a sample of their
 * combinations, and their indexes against the combination files.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { combosOf, runLive } from '../liveAnalysis';
import { pageIndex, type PageCombo, type PageIndex } from '../pageData';

const RULES = ['258', '128', '03456', '01346', '15'];
const dir = (rule: string): string => resolve(__dirname, `../../../../public/data/foundations/hex-${rule}`);
const read = <T,>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

describe.each(RULES)('rule %s', (rule) => {
  const index = read<PageIndex>(resolve(dir(rule), 'index.json'));
  const files = readdirSync(dir(rule)).filter((f) => f !== 'index.json');
  const combos = files.map((f) => read<PageCombo>(resolve(dir(rule), f)));

  it('has a file for every combination, and an index of them', () => {
    expect(files.map((f) => f.replace('.json', '')).sort()).toEqual(combosOf(rule));
    expect(index).toEqual(pageIndex(rule, combos));
  });

  // the first and last combinations
  const all = combosOf(rule);
  const sample = [all[0], all[all.length - 1]];
  it.each(sample)('of %s is a live analysis at its level', (combo) => {
    const p = read<PageCombo>(resolve(dir(rule), `${combo}.json`));
    expect(runLive({ rule, level: p.levels, combos: [combo] }, () => undefined, () => undefined)).toEqual([p]);
  }, 300000);
});
