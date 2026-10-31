/**
 * The forecast past the build (`project`, `account`) against independent
 * sources: the built members it is fitted to, the same forecast carried
 * level by level instead of summed in closed form, a forecast made two
 * levels lower against the build, and the members the brute force finds
 * above the build (`harmonics/bruteForce.ts`), whose tiles fix the ratio
 * between members.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BruteEngine } from '../../harmonics/bruteJob';
import { drawCircuits } from '../drawings';
import { account, project, type PageCombo } from '../pageData';

const dir = resolve(__dirname, '../../../../public/data/foundations/hex-023468');
const read = (combo: string): PageCombo => JSON.parse(readFileSync(resolve(dir, `${combo}.json`), 'utf8')) as PageCombo;
const all = readdirSync(dir)
  .filter((f) => /^[0-9a-z]{9}\.json$/.test(f))
  .map((f) => read(f.slice(0, 9)));
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** The data as it stood with the top two levels unbuilt: levels and shares cut, and predictions above the new top made forecasts. */
function cut(p: PageCombo, by: number): PageCombo {
  const T = p.tails.length - 1 - by;
  return {
    ...p,
    levels: p.levels - by,
    tails: p.tails.slice(0, T + 1),
    unseen: p.unseen.slice(0, T + 1),
    shares: p.shares.map(([r, c, o, v]) => [r, c, o, v.slice(0, T + 1)]),
    harm: p.harm.filter((h) => h[1] <= T - 1),
    found: p.found.filter((f) => f[1] <= T),
    pred: p.pred.filter((x) => x[1] <= T - 1).map(([from, level, verdict, length]) => [from, level, level + 2 > T ? 'forecast' : verdict, length]),
  };
}

describe('the forecast past the build', () => {
  it('fits each chain to its built harmonics: the ratio carries the last member back to each earlier harmonic within 15%, most within 2%', () => {
    const errors: number[] = [];
    for (const p of all)
      for (const f of project(p).fits) {
        if (f.nugget || f.stop) continue;
        // through harmonics whose places all read as their parent's
        const whole = (order: number): boolean => p.harm.filter((h) => h[4] === f.root && h[7] === order).every((h) => h[5] === h[6]);
        const last = f.members[f.members.length - 1];
        for (let k = f.members.length - 2; k >= 1 && whole(f.members[k + 1].order); k--) {
          const m = f.members[k];
          const model = last.share * f.ratio! ** ((m.level - last.level) / 2);
          errors.push(Math.abs(model / m.share - 1));
          expect(errors[errors.length - 1], `${p.combo} chain ${f.root}, order ${m.order}`).toBeLessThan(0.15);
        }
      }
    expect(errors.length).toBeGreaterThan(1500);
    expect(errors.filter((e) => e < 0.02).length).toBeGreaterThan(0.95 * errors.length);
  });

  it('sums in closed form what it carries level by level, 400 levels on', () => {
    for (const p of all) {
      const near = project(p);
      const far = project(p, 400);
      expect(Math.abs(near.limit - far.limit), p.combo).toBeLessThan(1e-9);
      // carried that far, the rest beyond is all but nothing
      expect(sum(far.lines.map((l) => l.rest)), p.combo).toBeLessThan(1e-6);
      for (const f of near.fits) {
        const g = far.fits.find((x) => x.root === f.root)!;
        expect(Math.abs(f.toCome - g.toCome)).toBeLessThan(1e-9);
        expect(Math.abs(f.closingAgain - g.closingAgain)).toBeLessThan(1e-9);
      }
    }
  }, 60000);

  it('made two levels lower, forecasts what the circuits it fits close at the top two levels to within 1.5% of the chords', () => {
    const misses: number[] = [];
    for (const p of all) {
      const T = p.tails.length - 1;
      const pr = project(cut(p, 2));
      // the chains fitted at the cut, and the nuggets
      const roots = new Set(pr.fits.filter((f) => !f.stop).map((f) => f.root));
      const forecast = sum(pr.lines.filter((l) => roots.has(l.root)).map((l) => l.values[T - 1] + l.values[T]));
      const built = sum(p.shares.filter((r) => roots.has(r[0])).map((r) => r[3][T - 1] + r[3][T]));
      misses.push(Math.abs(forecast / built - 1));
      expect(Math.abs(forecast - built), p.combo).toBeLessThan(0.015);
    }
    // and to within 2% of what they close in most
    expect(misses.filter((x) => x < 0.02).length).toBeGreaterThan(0.7 * all.length);
  });

  it('adds up to 1 in every column of the chart, in every split, for every combination', () => {
    for (const p of all)
      for (const split of ['class', 'order', 'chain'] as const) {
        const a = account(p, split);
        a.columns.forEach((_, c) => expect(Math.abs(sum(a.segments.map((s) => s.values[c])) - 1), `${p.combo} ${split} ${c}`).toBeLessThan(1e-5));
        for (const s of a.segments) for (const v of s.values) expect(v).toBeGreaterThanOrEqual(-1e-9);
      }
  });

  it('puts the limit of 140000001 and 011001100 within a percent of every chord on known circuits', () => {
    expect(project(read('140000001')).limit).toBeCloseTo(0.995, 2);
    expect(project(read('011001100')).limit).toBeCloseTo(1.004, 2);
    // the two chains whose members' shares grow are not forecast
    for (const combo of ['110000001', '111000001']) expect(project(read(combo)).fits.filter((f) => f.stop === 'growing').map((f) => f.root)).toEqual([combo === '110000001' ? 4 : 5]);
  });
});

describe('the members of 011001100 above the build, brute-forced', () => {
  const p = read('011001100');
  const job = { subset: [0, 2, 3, 4, 6, 8], combo: p.combo };
  const engine = new BruteEngine();
  // the level-8 harmonics of the 381 and the 384, drawn where the data names them, and the walks they are drawn from
  const tips = p.harm.filter((h) => h[1] === 8);
  const drawn = drawCircuits({ ...job, want: tips.map(([id, level, length, , , , , , place]) => ({ id, place, level, length })) });
  const growth2 = p.growth ** 2;

  it('are the forecast tiles at level 10, and two levels on fall in share by the ratio fitted', () => {
    const fits = project(p).fits;
    const got: number[][] = [];
    for (const d of drawn) {
      const h = tips.find((x) => x[0] === d.id)!;
      const at10 = engine.harmonic(job, { circuit: { level: 8, type: d.type, length: h[2], steps: d.steps }, addressed: false, floor: p.floor }).found!;
      const at12 = engine.harmonic(job, { circuit: at10, addressed: true, floor: p.floor }).found!;
      expect(at10.length).toBe(p.pred.find((x) => x[0] === h[0])![3]);
      got.push([h[2], at10.length, at12.length]);
      // a member closing in as many places as its parent takes its tiles over a supertile's chords: the share falls by the tiles' growth over the chords'
      const ratio = fits.find((f) => f.root === h[4])!.ratio!;
      expect(Math.abs(at12.length / at10.length / growth2 / ratio - 1)).toBeLessThan(0.005);
    }
    expect(got).toEqual([
      [19866, 1099992, 60984498],
      [25710, 1428504, 79198422],
    ]);
  }, 60000);
});
