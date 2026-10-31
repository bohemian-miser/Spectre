import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CircuitShapes } from '../../shapes/circuitShapes';
import type { PageCombo } from '../../foundations/pageData';
import { bestFit, cancelOpen, fitAlignment, tileOf, IdentifyEngine, randomOpenStrand, Strand, ancestry, type Report } from '../identify';
import { identifyHref, readIdentify } from '../href';

const SUBSET = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';
const digits = [...COMBO].map((c) => parseInt(c, 36));
/** The sweep's analysis of the combination: an independent list of its circuits and chains. */
const known = JSON.parse(readFileSync(resolve(__dirname, '../../../../public/data/foundations/hex-023468/140000001.json'), 'utf8')) as PageCombo;

/** An address on a tile half way round the circuit of `length` tiles closing at `level` in a Delta. */
function addressOf(level: number, length: number): { tile: string; edge: number } {
  const cs = new CircuitShapes('hex', SUBSET, digits, level, 1, false);
  const c = cs.born.find((b) => b.level === level && b.length === length && b.type === 'Delta');
  if (!c) throw new Error(`no ${length} closes in a level-${level} Delta`);
  return tileOf(cs, c, Math.floor(length / 2));
}

function run(level: number, tile: string, edge: number, cap: number): Report[] {
  const e = new IdentifyEngine({ subset: SUBSET, combo: COMBO, tile, edge, level, cap, known });
  const out: Report[] = [];
  while (!e.done) out.push(e.step());
  return out;
}

describe('identifying a strand from one of its tiles', () => {
  it('names the 303 from a tile of it, closing at level 4 and starting its chain', () => {
    const at = addressOf(4, 303);
    const reports = run(4, at.tile, at.edge, 8);
    const last = reports[reports.length - 1];
    expect(last.found).toBe('closed');
    expect(last.level).toBe(4);
    expect(last.tiles).toBe(303);
    expect(last.identified?.circuit).toEqual({ level: 4, length: 303 });
    expect(last.identified?.order).toBe(0);
    // the sweep's list: the 303 is foundational and starts its own chain
    const row = known.found.find((f) => f[2] === 303)!;
    expect(row[1]).toBe(4);
    expect(last.identified?.known).toEqual({ order: 0, root: { level: 4, length: 303 } });
    expect(reports.slice(0, -1).every((r) => r.found === 'open')).toBe(true);
  });

  it('names the 14,679 from a tile of it: the 303 two levels up, closing at level 6', () => {
    const at = addressOf(6, 14679);
    const reports = run(6, at.tile, at.edge, 8);
    const last = reports[reports.length - 1];
    expect(last.found).toBe('closed');
    expect(last.level).toBe(6);
    expect(last.identified?.circuit).toEqual({ level: 6, length: 14679 });
    expect(last.identified?.chain?.members.map((m) => m.length)).toEqual([303, 14679]);
    expect(last.identified?.order).toBe(1);
    const h = known.harm.find((r) => r[2] === 14679)!;
    expect(known.found.find((f) => f[0] === h[4])![2]).toBe(303);
    expect(last.identified?.known).toEqual({ order: h[7], root: { level: 4, length: 303 } });
  });

  it('built only to level 4, guesses the 14,679 closing at level 6 from its tail', () => {
    const at = addressOf(6, 14679);
    const reports = run(6, at.tile, at.edge, 4);
    const last = reports[reports.length - 1];
    expect(last.level).toBe(4);
    expect(last.found).toBe('open');
    const best = last.candidates[0];
    expect(best.level).toBe(6);
    expect(best.member).toEqual({ level: 4, length: 303 });
    expect(best.order).toBe(1);
    expect(best.length).toBe(14679);
    expect(best.lengthFrom).toBe('data');
    expect(best.similarity).toBeGreaterThan(last.candidates[1]?.similarity ?? 0);  }, 30000);

  it('built to level 5, still takes the 14,679 for the 303\'s harmonic, compared where harmonics read alike', () => {
    const at = addressOf(6, 14679);
    const last = run(6, at.tile, at.edge, 5).pop()!;
    expect(last.found).toBe('open');
    const best = last.candidates[0];
    expect(best.member).toEqual({ level: 4, length: 303 });
    expect(best.level).toBe(6);
    // compared only at levels where the 303, two levels down, is at level 2 or above
    expect(best.levels.every((j) => j - 2 >= 2)).toBe(true);
    // the sweep's list: the 14,679 closes at level 6 as the 303's harmonic
    const h = known.harm.find((r) => r[1] === 6 && r[2] === 14679)!;
    expect(known.found.find((f) => f[0] === h[4])![2]).toBe(303);
  }, 30000);

  it('follows a strand level by level as the tables do', () => {
    const cs = new CircuitShapes('hex', SUBSET, digits, 5, 1, true);
    const r = randomOpenStrand(cs, 5, mulberry(7))!;
    expect(r).not.toBeNull();
    const s = new Strand(cs, ancestry(r.tile, 5, 5), r.edge);
    let tiles = 1;
    for (let n = 1; n <= 5; n++) {
      const f = s.up(n);
      if (f.kind !== 'open') throw new Error(`closed at level ${n}`);
      // the arc grows as it climbs, and its table entry agrees with the walk
      expect(f.arc.tiles).toBeGreaterThanOrEqual(tiles);
      expect(cs.levels[n][f.arc.type].mate(f.arc.exit)).toBe(f.arc.entry);
      tiles = f.arc.tiles;
    }
  });

  it('fits a run of tokens into a cyclic sequence either way round', () => {
    const b = Int32Array.from([1, 2, 3, 4, 5, 6, 7]);
    expect(bestFit(Int32Array.from([6, 7, 1, 2]), b).distance).toBe(0);
    expect(bestFit(Int32Array.from([3, 2, 1, 7]), b).distance).toBe(0);
    const f = bestFit(Int32Array.from([6, 7, 9, 2]), b);
    expect(f.distance).toBe(1);
    const al = fitAlignment(Int32Array.from([6, 7, 9, 2]), b, f);
    expect(al.matchedA).toEqual([true, true, false, true]);
    expect(cancelOpen([1, 2, 1, 3, 4, 3, 5])).toEqual(Int32Array.from([0, 3, 6]));
  });

  it('reads and walks the link the Explorer writes', () => {
    const p = readIdentify('?rule=023468&combo=140000001&tile=0.5.0.0.0.0&edge=5&level=6');
    expect(p).toEqual({ subset: SUBSET, combo: COMBO, tile: '0.5.0.0.0.0', edge: 5, level: 6 });
    const reports = run(p!.level, p!.tile, p!.edge, 7);
    expect(reports.length).toBeGreaterThan(0);
    for (const r of reports) expect(r.tiles).toBeGreaterThan(0);
    // open within the Explorer's level-6 root, closing one level above it as the 2,079's harmonic
    expect(reports.slice(0, 6).every((r) => r.found === 'open')).toBe(true);
    const last = reports[reports.length - 1];
    expect(last.found).toBe('closed');
    expect(last.level).toBe(7);
    expect(last.identified?.circuit).toEqual({ level: 7, length: 103851 });
    const h = known.harm.find((r) => r[1] === 7 && r[2] === 103851)!;
    expect(last.identified?.known).toEqual({ order: h[7], root: { level: 5, length: 2079 } });
  }, 60000);

  it('writes an address that reads back', () => {
    const p = { subset: SUBSET, combo: COMBO, tile: '1.7.0', edge: 2, level: 3 };
    const href = identifyHref('/Spectre/', p);
    expect(href).toBe('/Spectre/identify.html?rule=023468&combo=140000001&tile=1.7.0&edge=2&level=3');
    expect(readIdentify(href.split('?')[1])).toEqual(p);
    expect(readIdentify('rule=023468&combo=140000001&tile=1.7&edge=2&level=3')).toBeNull();
  });
});

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
