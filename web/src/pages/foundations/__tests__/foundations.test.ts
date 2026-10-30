/**
 * The foundations against independent sources: the readings against
 * `harmonics/readings.ts` (its own cancelling and comparing, circuit by
 * circuit and level by level), the lineages it finds against `lineages`, the
 * account of chords against counting the leaves of the supertiles, the
 * circuits against the circuit index, and each prediction against the level
 * built after it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSystem, flatten } from '../../../core';
import { lineages, readings, sameCyclic } from '../../harmonics/readings';
import { CircuitShapes, familyOf } from '../../shapes/circuitShapes';
import {
  agreement,
  buildShapes,
  cancelCyclic,
  chordsPerTile,
  closingKey,
  foundations,
  predictHarmonic,
  readCircuit,
  tileAccount,
  tokenString,
} from '../foundations';

const subset = [0, 2, 3, 4, 6, 8];

describe('readings', () => {
  it('cancel backtracks as readings.ts does', () => {
    expect(Array.from(cancelCyclic([1, 2, 1, 3, 1, 3, 4]))).toEqual([0, 5, 6]);
    expect(cancelCyclic([1, 2, 1, 2]).length).toBe(2);
  });

  for (const combo of ['140000001', '000100000']) {
    it(`read every circuit of ${combo} to level 6 as readings.ts does, at every level`, () => {
      const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 6, 1, true);
      let compared = 0;
      for (const c of cs.born) {
        const old = readings(cs, c);
        const mine = readCircuit(cs, c, 0, 1e7);
        for (let k = 0; k < c.level; k++) {
          expect(sameCyclic(old[k].tokens, Array.from(mine.levels[k]!, tokenString))).toBe(true);
          compared++;
        }
      }
      expect(compared).toBeGreaterThan(50);
    }, 120000);
  }

  it('find the lineages readings.ts finds, with the floor at 1', () => {
    const cs = new CircuitShapes('hex', subset, [...'000100000'].map((c) => parseInt(c, 36)), 7, 1, true);
    const old = cs.born.map((c) => ({ level: c.level, readings: readings(cs, c) }));
    const want = new Set(lineages(old).map((l) => `${l.a}-${l.b}`));
    const mine = cs.born.map((c) => readCircuit(cs, c, 0, 1e7));
    const got = new Set<string>();
    cs.born.forEach((b, bi) => cs.born.forEach((a, ai) => {
      if (a.level + 2 === b.level && a.level > 1 && agreement(mine[ai], a.level, mine[bi]).floor <= 1) got.add(`${ai}-${bi}`);
    }));
    expect(want.size).toBeGreaterThan(5);
    expect([...got].sort()).toEqual([...want].sort());
  }, 120000);
});

describe('the account of chords', () => {
  const cs = buildShapes(subset, '140000001', 7);
  const f = foundations(cs);
  const rows = tileAccount(cs, f);

  it('balances exactly: closed plus tails is every chord, at every level and type', () => {
    for (const r of rows) expect(r.closed.foundational + r.closed.harmonic + r.closed.reborn + r.tails).toBe(r.chords);
    // the closings at a level come out of the children's tails
    for (const r of rows) if (r.level > 0) expect(r.room - r.closedHere.foundational - r.closedHere.harmonic - r.closedHere.reborn).toBe(r.tails);
  }, 120000);

  it('counts the chords a supertile holds, as its leaves do', () => {
    const per = chordsPerTile('hex', subset);
    for (let n = 0; n <= 3; n++) {
      const sys = buildSystem('hex', n);
      for (const r of rows.filter((x) => x.level === n)) {
        const leaves = flatten(sys[r.type as keyof typeof sys]);
        expect(leaves.reduce((s, l) => s + per[l.type], 0)).toBe(r.chords);
      }
    }
  });
});

describe('the circuits', () => {
  for (const combo of ['140000001', '000100000', '000000001', '001001100']) {
    it(`of ${combo} up to level 7 are the ones the circuit index lists, each at the level it first closes`, () => {
      const index = JSON.parse(readFileSync(resolve(__dirname, `../../../../public/data/corners/hex-023468/${combo}.json`), 'utf8')) as { circuits: { length: number; level: number }[] };
      const cs = buildShapes(subset, combo, 7);
      const f = foundations(cs);
      const first = new Set(f.closings.filter((c) => c.status !== 'reborn').map((c) => `${c.level}/${c.length}`));
      const listed = new Set(index.circuits.filter((c) => c.level <= 7).map((c) => `${c.level}/${c.length}`));
      expect([...first].sort()).toEqual([...listed].sort());
    }, 120000);
  }
});

describe('a harmonic predicted before its level is built', () => {
  it('is a circuit the build closes there, a harmonic of the one it was predicted from', () => {
    const cs = buildShapes(subset, '140000001', 6);
    const from = cs.born.filter((c) => c.level === 5 && c.type === 'Delta');
    const predicted = from.map((a) => ({ a, p: predictHarmonic(cs, a, 2).predicted }));
    cs.extend(7);
    const f = foundations(cs);
    const byKey = new Map(f.closings.map((c) => [c.key, c] as const));
    let checked = 0;
    for (const { a, p } of predicted) {
      const ca = byKey.get(closingKey(a))!;
      if (ca.status === 'reborn') continue;
      expect(p.length).toBeGreaterThan(0);
      const b = byKey.get(closingKey(p[0]))!;
      expect(b.status).toBe('harmonic');
      expect(b.of).toBe(ca.id);
      expect(familyOf(p[0])).toBe(ca.family);
      checked++;
    }
    expect(checked).toBe(9);
  }, 120000);
});
