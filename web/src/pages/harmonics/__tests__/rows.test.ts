/**
 * A chain's rows against independent sources: each visit's run in the row
 * below against the visits traced from the top (`visitsAt`), which lie inside
 * the visit's supertile by slot path; the runs of a row joined against the
 * row below; the pairing of the members' readings against the readings'
 * alignment; and the thumbnails' level of detail.
 */
import { describe, expect, it } from 'vitest';

import { HarmonicsEngine } from '../harmonicsJob';
import { THUMB_POINTS } from '../ChainViews';
import { alignReadings, sameCyclic, visitsAt } from '../readings';
import { below, lit, pairReadings } from '../rows';

describe.each(['000100000', '140000001'])('rows of 023468 / %s', (combo) => {
  const engine = new HarmonicsEngine({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo, level: 7 });
  const r = engine.result();
  const chain = [...r.chains].sort((a, b) => b.members.length - a.members.length)[0];

  it('expand each visit into the run of visits inside its supertile, and the runs join into the row below', () => {
    expect(chain.members.length).toBeGreaterThan(1);
    const k = Math.max(0, r.circuits[chain.members[0]].level - 4);
    const rows = engine.rows(chain.members, k);
    rows.members.forEach((m, j) => {
      const c = r.circuits[chain.members[j]];
      for (let d = 0; d + 1 < m.levels.length; d++) {
        const lv = m.levels[d];
        const here = visitsAt(engine.cs, engine.bornOf(chain.members[j]), lv.level);
        const next = visitsAt(engine.cs, engine.bornOf(chain.members[j]), lv.level - 1);
        const start = lv.start!;
        expect(start[0]).toBe(0);
        expect(start[here.length]).toBe(next.length);
        const seen = new Map<string, number>();
        here.forEach((v, i) => {
          expect(start[i + 1]).toBeGreaterThan(start[i]);
          // the run: every visit in it inside the supertile; the visits next to it outside
          for (let x = start[i]; x < start[i + 1]; x++) expect(next[x].id.startsWith(`${v.id}.`)).toBe(true);
          if (start[i] > 0) expect(next[start[i] - 1].id.startsWith(`${v.id}.`)).toBe(false);
          if (start[i + 1] < next.length) expect(next[start[i + 1]].id.startsWith(`${v.id}.`)).toBe(false);
          // the m-th visit to a supertile has the m-th run inside it
          const nth = seen.get(v.id) ?? 0;
          seen.set(v.id, nth + 1);
          let runs = 0;
          for (let x = 0; x < start[i]; x++) if (next[x].id.startsWith(`${v.id}.`) && (x === 0 || !next[x - 1].id.startsWith(`${v.id}.`))) runs++;
          expect(runs).toBe(nth);
          // what a hover on it lights in the row below
          const l = lit(rows, { kind: 'visit', j, d, from: i, to: i + 1, q: null }, rows.members.map(() => []));
          expect(l.ranges[j][d + 1]).toEqual(below(start, [[i, i + 1]]));
        });
        expect(c.level - 1 - d).toBe(lv.level);
      }
    });
  });

  it('pairs the members’ visits as the readings line up', () => {
    const k = Math.max(0, r.circuits[chain.members[0]].level - 4);
    const rows = engine.rows(chain.members, k);
    let paired = 0;
    rows.pairs.forEach((byDepth, j) =>
      byDepth.forEach((p, d) => {
        const a = r.circuits[chain.members[j]], b = r.circuits[chain.members[j + 1]];
        const ta = r.circuits[chain.members[j]].readings.find((x) => x.level === a.level - 1 - d)!.tokens;
        const tb = r.circuits[chain.members[j + 1]].readings.find((x) => x.level === b.level - 1 - d)!.tokens;
        expect(p).toEqual(pairReadings(ta, tb));
        if (!p) return;
        p.ab.forEach((q, i) => { if (q >= 0) { expect(tb[q]).toBe(ta[i]); paired++; } });
        if (!sameCyclic(ta, tb)) expect(Array.from(p.ab, (q) => q >= 0)).toEqual(alignReadings(ta, tb)!.matchedA);
      }),
    );
    expect(paired).toBeGreaterThan(0);
  });

  it('draws each thumbnail at least two levels below its circuit (or at the tiles) within the budget', () => {
    const t = engine.thumbs(r.circuits.map((_, i) => i), THUMB_POINTS);
    t.forEach((x, i) => {
      expect(x.stop).toBeLessThanOrEqual(Math.max(0, r.circuits[i].level - 2));
      expect(x.pts.length / 2).toBeLessThanOrEqual(THUMB_POINTS + 1);
    });
    expect(t.some((x) => x.stop > 0)).toBe(true);
  });
});

describe('pairing readings', () => {
  it('pairs a rotation read either way round, else the common subsequence', () => {
    const a = ['D<1', 'G<7', 'S<4'];
    const p = pairReadings(a, ['S<4', 'G<7', 'D<1'])!;
    expect(Array.from(p.ab)).toEqual([2, 1, 0]);
    const q = pairReadings(a, ['D<1', 'X<5', 'S<4'])!;
    expect(Array.from(q.ab)).toEqual([0, -1, 2]);
  });
});
