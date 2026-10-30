/**
 * The Foundations page's data against independent sources: the cut files
 * against the sweep's output and its index (`foundations-index.ts`), and the
 * foundational circuits and chains the page reads against `foundations`
 * run on a fresh build of the renormalisation.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildShapes, foundations } from '../foundations';
import { drawCircuits } from '../drawings';
import { chainOf, pageCombo, pageIndex, segments, type PageCombo, type PageIndex, type SweepFile } from '../pageData';

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
