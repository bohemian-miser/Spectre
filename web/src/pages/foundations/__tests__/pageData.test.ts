/**
 * The Foundations page's data against independent sources: the cut files
 * against the sweep's output and its index (`foundations-index.ts`), and the
 * foundational circuits and chains the page reads against `foundations`
 * run on a fresh build of the renormalisation.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildShapes, foundations, substitutionMatrix } from '../foundations';
import { drawCircuits } from '../drawings';
import { comboCount, combosOf, runLive } from '../liveAnalysis';
import { filterRows, markCounts, NO_FILTERS, sortRows } from '../ComboList';
import {
  account,
  backTest,
  LIMIT_PARTS,
  chainOf,
  forecastChecks,
  MARKS,
  marksOf,
  monstersOf,
  pageCombo,
  pageIndex,
  project,
  segments,
  SHORT,
  tailFates,
  type Mark,
  type PageCombo,
  type PageIndex,
  type SweepFile,
  unaccountedOf,
} from '../pageData';

const web = resolve(__dirname, '../../../..');
const sweepDir = resolve(web, 'circuit-classes/data/foundations/hex-023468');
const pageDir = resolve(web, 'public/data/foundations/hex-023468');
const read = <T,>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const subset = [0, 2, 3, 4, 6, 8];

describe('the page data', () => {
  const names = readdirSync(sweepDir).filter((f) => /^[0-9a-z]{9}\.json$/.test(f));
  const sweep = names.map((f) => read<SweepFile>(resolve(sweepDir, f)));

  it('is the sweep output cut, one file per combination', () => {
    expect(names).toHaveLength(320);
    for (const d of sweep) expect(read<PageCombo>(resolve(pageDir, `${d.combo}.json`))).toEqual(pageCombo(d));
    expect(readdirSync(pageDir).filter((f) => f !== 'index.json').sort()).toEqual([...names].sort());
  });

  it("splits every level's chords into nuggets, chains and tails, adding up to all of them, in every setting", () => {
    for (const d of sweep) {
      const p = pageCombo(d);
      for (const split of ['class', 'order', 'chain'] as const) {
        const segs = segments(p, split);
        for (let n = 0; n < p.tails.length; n++) expect(Math.abs(segs.reduce((s, x) => s + x.values[n], 0) - 1)).toBeLessThan(1e-5);
      }
    }
  });

  it('has an index that agrees with the sweep index', () => {
    const index = read<PageIndex>(resolve(pageDir, 'index.json'));
    expect(index).toEqual(pageIndex('023468', sweep.map(pageCombo)));
    const full = read<{ combos: { combo: string; levels: number; floor: number; settled: boolean; lastNew: number; foundational: [number, number, string, number, number][]; tails: number }[] }>(
      resolve(sweepDir, 'index.json'),
    );
    expect(index.combos.map((r) => r.combo)).toEqual(full.combos.map((r) => r.combo));
    full.combos.forEach((f, i) => {
      const r = index.combos[i];
      expect([r.levels, r.floor, r.settled, r.lastNew, r.found, r.nuggets]).toEqual([f.levels, f.floor, f.settled, f.lastNew, f.foundational.length, f.foundational.filter((x) => x[4]).length]);
      expect(r.largest).toBe(Math.max(...f.foundational.map((x) => x[1])));
      expect(r.tails).toBeCloseTo(f.tails, 4);
    });
    // every foundational circuit at floor + 4 or later is listed as a monster
    const late = full.combos.flatMap((f) => f.foundational.filter(([level]) => level >= f.floor + 4).map(([level, length]) => `${f.combo}/${level}/${length}`));
    expect(index.monsters.filter((m) => m.late).map((m) => `${m.combo}/${m.level}/${m.length}`).sort()).toEqual(late.sort());
  });

  it('marks every combination by its definitions, against the sweep index where it has them', () => {
    const index = read<PageIndex>(resolve(pageDir, 'index.json'));
    const full = read<{ combos: { combo: string; floor: number; foundational: [number, number, string, number, number][]; verdicts: Record<string, number> }[] }>(resolve(sweepDir, 'index.json'));
    const counts: Record<Mark, number> = { short: 0, notForecast: 0, unexplained: 0, missed: 0 };
    const bands = [0, 0, 0, 0];
    for (const d of sweep) {
      const p = pageCombo(d);
      const pr = project(p);
      const r = index.combos.find((x) => x.combo === d.combo)!;
      const f = full.combos.find((x) => x.combo === d.combo)!;
      expect(r.limit).toBeCloseTo(pr.limit, 6);
      const want: Mark[] = [];
      if (pr.limit < 0.995) want.push('short');
      if (pr.fits.some((x) => x.stop !== null && x.stop !== 'ended')) want.push('notForecast');
      expect(r.notForecast).toHaveLength(pr.fits.filter((x) => x.stop !== null && x.stop !== 'ended').length);
      // a late nugget, from the sweep's own list of foundational circuits
      if (f.foundational.some(([level, , , , nugget]) => level >= f.floor + 4 && nugget)) want.push('unexplained');
      // a prediction that missed a harmonic, or found another circuit's, by the sweep's verdicts
      if ((f.verdicts.missed ?? 0) + (f.verdicts.other ?? 0) + (f.verdicts['not built'] ?? 0) > 0) want.push('missed');
      expect(marksOf(r)).toEqual(want);
      // a short combination is itself a monster
      expect(r.monsters).toBe(monstersOf(p).length + (want.includes('short') ? 1 : 0));
      for (const m of want) counts[m]++;
      bands[pr.limit < 0.98 ? 0 : pr.limit < 0.995 ? 1 : pr.limit <= 1.005 ? 2 : 3]++;
    }
    // the band table of docs/FOUNDATIONS.md, "Every combination in the limit"
    expect(bands).toEqual([2, 2, 315, 1]);
    expect(counts).toEqual({ short: 4, notForecast: 3, unexplained: 2, missed: 6 });
    // the two whose 60 at level 5 has a chain growing its share: short, and the chain named
    for (const combo of ['110000001', '111000001']) {
      const r = index.combos.find((x) => x.combo === combo)!;
      expect(marksOf(r)[0]).toBe('short');
      expect(r.limit).toBeLessThan(0.66);
      expect(r.notForecast).toEqual([expect.stringMatching(/^chain of 60 at level 5: its members' shares do not fall \(ratio 1\.\d\d\)$/)]);
    }
  });
});

describe('the list of combinations', () => {
  const index = read<PageIndex>(resolve(pageDir, 'index.json'));

  it("splits each limit as the account chart's limit column, from each combination's own file, adding up to 1", () => {
    expect(index.combos).toHaveLength(320);
    for (const r of index.combos) {
      const acc = account(read<PageCombo>(resolve(pageDir, `${r.combo}.json`)), 'class');
      const limit = acc.columns.length - 1;
      expect(acc.columns[limit].level).toBeNull();
      // every segment of the chart is a part, in the chart's order
      expect(LIMIT_PARTS.map((x) => [x.key, x.label])).toEqual(acc.segments.map((x) => [x.key, x.label]));
      r.parts.forEach((v, i) => expect(Math.abs(v - acc.segments[i].values[limit])).toBeLessThan(1e-7));
      expect(Math.abs(r.parts.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-6);
      if (!(acc.over > 0)) expect(Math.abs(unaccountedOf(r) - (1 - r.limit))).toBeLessThan(1e-6);
    }
  });

  it('sorts by the share not accounted for, the largest first', () => {
    const rows = sortRows(index.combos, { key: 'unaccounted', desc: true });
    for (let i = 1; i < rows.length; i++) expect(unaccountedOf(rows[i])).toBeLessThanOrEqual(unaccountedOf(rows[i - 1]));
    expect(rows.slice(0, 4).map((r) => r.combo).sort()).toEqual(index.combos.filter((r) => r.limit < SHORT).map((r) => r.combo).sort());
  });

  it('sorts by limit, the short ones first', () => {
    const rows = sortRows(index.combos, { key: 'limit', desc: false });
    for (let i = 1; i < rows.length; i++) expect(rows[i].limit).toBeGreaterThanOrEqual(rows[i - 1].limit);
    const short = rows.filter((r) => r.limit < SHORT);
    expect(rows.slice(0, short.length)).toEqual(short);
    expect(sortRows(index.combos, { key: 'limit', desc: true })[0].combo).toBe(rows[rows.length - 1].combo);
  });

  it("counts each mark as the rows that choosing it alone shows, under any other filter", () => {
    for (const base of [NO_FILTERS, { ...NO_FILTERS, floor: 1 }, { ...NO_FILTERS, lastNew: 5 }, { ...NO_FILTERS, search: '1' }]) {
      const counts = markCounts(index.combos, base);
      for (const m of Object.keys(MARKS) as Mark[]) {
        const shown = filterRows(index.combos, { ...base, marks: [m] });
        expect(shown).toHaveLength(counts[m]);
        expect(shown.every((r) => marksOf(r).includes(m))).toBe(true);
      }
    }
    // several marks show the rows with any of them
    const two = filterRows(index.combos, { ...NO_FILTERS, marks: ['short', 'unexplained'] });
    expect(two.map((r) => r.combo)).toEqual(index.combos.filter((r) => r.limit < SHORT || r.unexplained > 0).map((r) => r.combo));
  });
});

describe('the circuits the page shows', () => {
  // floors 1 to 4; built afresh to level 8 (circuits first closing by level 8 keep their ids at any higher level)
  for (const combo of ['000000000', '140000001', '001001001', '031001001']) {
    it(`of ${combo} are what foundations finds on a fresh build to level 8`, () => {
      const p = read<PageCombo>(resolve(pageDir, `${combo}.json`));
      const cs = buildShapes(subset, combo, 8);
      const f = foundations(cs, { floor: p.floor });
      const found = f.closings.filter((c) => c.status === 'foundational');
      expect(p.found.filter((x) => x[1] <= 8).map((x) => x.slice(0, 5))).toEqual(found.map((c) => [c.id, c.level, c.length, c.families.join(' '), c.steps]));
      expect(p.found.filter((x) => x[1] <= 8).map((x) => x[7])).toEqual(found.map((c) => c.places[0]));
      expect(p.harm.filter((h) => h[1] <= 8).map((h) => h.slice(0, 7))).toEqual(
        f.closings.filter((c) => c.status === 'harmonic').map((c) => [c.id, c.level, c.length, c.of, c.root, c.families.length, c.matched]),
      );
      // each chain, up to level 8, is the harmonics of the fresh build linked by `of`
      for (const c of found) {
        const want: string[] = [];
        for (let tip = [c.id]; ; ) {
          const next = f.closings.filter((x) => x.status === 'harmonic' && tip.includes(x.of!));
          if (!next.length) break;
          want.push(...next.map((x) => `${x.level}/${x.length}`));
          tip = next.map((x) => x.id);
        }
        const got = chainOf(p, c.id).filter((s) => s.level <= 8).flatMap((s) => s.members.filter((m) => m.id !== null).map((m) => `${s.level}/${m.length}`));
        expect(got).toEqual(want);
      }
      // the drawings name the same circuits
      const drawn = drawCircuits({ subset, combo, want: p.found.filter((x) => x[1] <= 8).map(([id, level, length, families, , , , place]) => ({ id, place, level, length, family: families.split(' ')[0] })) });
      expect(drawn.map((d) => d.id)).toEqual(p.found.filter((x) => x[1] <= 8).map((x) => x[0]));
    }, 300000);
  }
});

describe('what the tails become', () => {
  // an independent count: the chords on tails at level L of a Delta's level-(L + k) supertile, from the tables' arc lengths,
  // less the tails at L + k, against the circuits closing between, from the closed walks' lengths and copies
  for (const combo of ['140000001', '000100000', '001001000']) {
    it(`in ${combo}, the tails at L that close by L + k are exactly the circuits closing between`, () => {
      const cs = buildShapes(subset, combo, 8);
      const M = substitutionMatrix('hex').map((r) => r.map(BigInt));
      const types = Object.keys(cs.levels[0]);
      const D = types.indexOf('Delta');
      const tails = (n: number): bigint[] =>
        types.map((t) => {
          const T = cs.levels[n][t];
          let s = 0;
          for (const k of T.crossings()) s += T.len(k);
          return BigInt(s / 2);
        });
      const born = (n: number): bigint[] => types.map((t) => cs.born.filter((c) => c.level === n && c.type === t).reduce((s, c) => s + BigInt(c.length * cs.copiesOf(c)), 0n));
      const mul = (v: bigint[]): bigint[] => types.map((_, t) => types.reduce((s, _u, u) => s + M[t][u] * v[u], 0n));
      for (let L = 3; L <= 6; L++) {
        let fromTails = tails(L);
        let closed = types.map(() => 0n);
        for (let k = 1; L + k <= 8; k++) {
          fromTails = mul(fromTails);
          const b = born(L + k);
          closed = mul(closed).map((x, t) => x + b[t]);
          expect(fromTails[D] - tails(L + k)[D]).toBe(closed[D]);
        }
      }
      // the page's rows add up to all the tails
      const p = read<PageCombo>(resolve(pageDir, `${combo}.json`));
      for (let L = 3; L < p.tails.length - 1; L++) {
        for (const f of tailFates(p, L)) expect(Math.abs(f.chains.reduce((s, c) => s + c[1], 0) + f.nuggets + f.unseen + f.open - 1)).toBeLessThan(1e-4);
      }
    }, 300000);
  }

  it('back-tests to nothing unexplained once the last foundational circuit is found, and forecasts the next members of known chains', () => {
    for (const combo of ['140000001', '000100000']) {
      const p = read<PageCombo>(resolve(pageDir, `${combo}.json`));
      for (const b of backTest(p)) {
        if (b.level >= p.lastNew) expect(b.unexplained).toBeLessThan(1e-9);
        // a level's tails all close into a known chain, close into a new one, or are still open at the top
        expect(b.explained + b.unexplained + b.open).toBeCloseTo(1, 3);
      }
      const checks = forecastChecks(p).filter((c) => c.actual > 0);
      expect(checks.length).toBeGreaterThan(1);
      for (const c of checks) expect(Math.abs(c.forecast - c.actual) / c.actual).toBeLessThan(0.15);
    }
  });
});

describe('the live analysis', () => {
  // the page's worker runs analyseCombo as the sweep does: run afresh, it gives the precomputed files
  for (const combo of ['140000001', '000100000']) {
    it(`of ${combo} at level 9 is the precomputed data`, () => {
      const p = read<PageCombo>(resolve(pageDir, `${combo}.json`));
      const live = runLive({ rule: '023468', level: 9, combos: [combo] }, () => undefined, () => undefined);
      expect(live).toEqual([p]);
    }, 300000);
  }

  it('counts and lists the combinations of any rule', () => {
    expect(comboCount('023468')).toBe(320);
    expect(combosOf('023468')).toHaveLength(320);
    expect(combosOf('023468')).toContain('140000001');
    expect(combosOf('15')).toHaveLength(comboCount('15'));
  });
});
