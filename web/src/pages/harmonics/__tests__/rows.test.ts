/**
 * A chain's rows against independent sources: each visit's run in the row
 * below against the visits traced from the top (`visitsAt`), which lie inside
 * the visit's supertile by slot path; the runs of a row joined against the
 * row below; the pairing of the members' readings against the readings'
 * alignment; each run of cancelled visits against the visits cancelling
 * backtracks one at a time removes, and runs matched across members between
 * paired visits; and the thumbnails' level of detail.
 */
import { describe, expect, it } from 'vitest';

import { HarmonicsEngine } from '../harmonicsJob';
import { THUMB_POINTS } from '../ChainViews';
import { alignReadings, sameCyclic, visitsAt, type Visit } from '../readings';
import { below, lit, pairReadings, runLines, RUN_ENDS, weaveKeep } from '../rows';

type Tagged = Visit & { at: number };

/** Cancels the first backtrack A B A in the sequence as it stands (cyclically), until none is left. */
function cancelOneByOne(visits: readonly Tagged[]): Tagged[] {
  let out = [...visits];
  for (;;) {
    const n = out.length;
    let hit = -1;
    for (let i = 0; i < n && hit < 0; i++) if (n > 2 && out[(i + 2) % n].id === out[i].id && out[(i + 1) % n].id !== out[i].id) hit = i;
    if (hit < 0) return out;
    const set = new Set([hit, (hit + 1) % n, (hit + 2) % n]);
    out = out.filter((_, q) => q === hit || !set.has(q));
  }
}

/**
 * The visits folding only weaving keeps, by a regular expression: each
 * leftmost-longest stretch X Y X (Y X …) of two supertiles alternating keeps
 * its first visit, and its last when that is Y.
 */
function weaveByPattern(ids: readonly string[]): number[] {
  const code = new Map<string, string>();
  const text = ids.map((id) => {
    if (!code.has(id)) code.set(id, String.fromCharCode(0x4e00 + code.size));
    return code.get(id)!;
  }).join('');
  const kept = ids.map(() => true);
  for (const m of text.matchAll(/(.)(?!\1)(.)\1(?:\2\1)*(?:\2)?/g)) {
    const from = m.index!, len = m[0].length;
    for (let x = from + 1; x < from + len; x++) kept[x] = false;
    if (len % 2 === 0) kept[from + len - 1] = true;
  }
  return kept.flatMap((k, i) => (k ? [i] : []));
}

describe('folding weaving only', () => {
  it('keeps the same visits as the pattern on random rows of a few supertiles', () => {
    let seed = 7;
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
    for (let t = 0; t < 400; t++) {
      const ids: number[] = [];
      const n = 1 + rand(30);
      for (let i = 0; i < n; i++) ids.push(rand(4));
      expect(Array.from(weaveKeep(ids))).toEqual(weaveByPattern(ids.map(String)));
    }
  });
});

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

  it('opens each run into exactly the visits the reading cancels there, and matches runs between paired visits', () => {
    const k = Math.max(0, r.circuits[chain.members[0]].level - 5);
    const rows = engine.rows(chain.members, k);
    let runs = 0;
    rows.members.forEach((m, j) =>
      m.levels.forEach((lv) => {
        const raw = visitsAt(engine.cs, engine.bornOf(chain.members[j]), lv.level).map((v, at) => ({ ...v, at }));
        const kept = cancelOneByOne(raw).map((v) => v.at);
        const keptSet = new Set(kept);
        expect(Array.from(lv.keep)).toEqual(kept);
        const weave = new Set(weaveByPattern(raw.map((v) => v.id)));
        lv.items.forEach((it, q) => {
          if (it.kind !== 'run') return;
          runs++;
          // folded throughout, all weaving or all detour, and maximal: a kept visit or a run of the other kind on each side
          for (let i = it.from; i < it.to; i++) {
            expect(keptSet.has(i)).toBe(false);
            expect(weave.has(i)).toBe(it.fold === 'detour');
          }
          const prev = lv.items[q - 1], next = lv.items[q + 1];
          if (it.from > 0) expect(keptSet.has(it.from - 1) || (prev?.kind === 'run' && prev.to === it.from && prev.fold !== it.fold)).toBe(true);
          if (it.to < raw.length && next) expect(keptSet.has(it.to) || (next.kind === 'run' && next.from === it.to && next.fold !== it.fold)).toBe(true);
          // the kept visit before it, the row read as a loop
          const before = kept.filter((x) => x < it.from);
          expect(it.after).toBe(before.length ? before.length - 1 : kept.length - 1);
          const n = it.to - it.from;
          expect(it.head).toEqual(raw.slice(it.from, it.from + Math.min(n, 2 * RUN_ENDS)).map((v) => ({ type: v.type, slot: v.slot })));
          if (n > 2 * RUN_ENDS) expect(it.tail).toEqual(raw.slice(it.to - RUN_ENDS, it.to).map((v) => ({ type: v.type, slot: v.slot })));
          // the visits off the two supertiles it mostly goes between
          const ids = raw.slice(it.from, it.to).map((v) => v.id);
          const top = [...new Set(ids)].sort((a, b) => ids.filter((x) => x === b).length - ids.filter((x) => x === a).length).slice(0, 2);
          expect(it.oddCount).toBe(ids.filter((x) => !top.includes(x)).length);
        });
      }),
    );
    expect(runs).toBeGreaterThan(0);
    // matched runs sit between the visits the readings pair: the kept visit before, and the one after
    let matched = 0;
    for (const line of runLines(rows)) {
      line.runs.forEach((x, j) => {
        const y = line.runs[j + 1];
        if (!x || !y) return;
        const p = rows.pairs[j][line.d]!;
        const nx = rows.members[j].levels[line.d].keep.length, ny = rows.members[j + 1].levels[line.d].keep.length;
        // the two kept visits either side of one pair with the two either side of the other, in order or reversed
        const ends = [p.ab[x.after], p.ab[(x.after + 1) % nx]].sort((u, v) => u - v).join(' ');
        expect([[y.after, (y.after + 1) % ny].sort((u, v) => u - v).join(' ')]).toContain(ends);
        expect(y.fold).toBe(x.fold);
        matched++;
      });
    }
    expect(matched).toBeGreaterThan(0);
  });

  it('folds weaving only, or nothing, as set: the kept visits, the detours marked, and the detour runs under weaving and detours', () => {
    const k = Math.max(0, r.circuits[chain.members[0]].level - 3);
    const byFold = Object.fromEntries((['none', 'weave', 'fixpoint'] as const).map((f) => [f, engine.rows(chain.members, k, f)]));
    let detours = 0;
    byFold.fixpoint.members.forEach((m, j) =>
      m.levels.forEach((lv, d) => {
        const raw = visitsAt(engine.cs, engine.bornOf(chain.members[j]), lv.level);
        const fix = new Set(cancelOneByOne(raw.map((v, at) => ({ ...v, at }))).map((v) => v.at));
        const weave = weaveByPattern(raw.map((v) => v.id));
        const weaveSet = new Set(weave);
        const isDetour = (i: number) => !fix.has(i) && weaveSet.has(i);
        expect(lv.detours).toBe(raw.filter((_, i) => isDetour(i)).length);
        // weaving only keeps what the pattern keeps, and marks the visits the fixpoint folds as detours
        const w = byFold.weave.members[j].levels[d];
        expect(Array.from(w.keep)).toEqual(weave);
        for (const it of w.items) {
          if (it.kind === 'visit') expect(it.detour).toBe(isDetour(it.i));
          else for (let i = it.from; i < it.to; i++) expect(weaveSet.has(i)).toBe(false);
        }
        // nothing folds nothing
        const none = byFold.none.members[j].levels[d];
        expect(none.keep.length).toBe(raw.length);
        expect(none.items.every((it) => it.kind === 'visit')).toBe(true);
        // under weaving and detours the detour runs cover exactly those visits
        if (lv.more === 0) {
          const covered = lv.items.flatMap((it) => (it.kind === 'run' && it.fold === 'detour' ? Array.from({ length: it.to - it.from }, (_, q) => it.from + q) : []));
          expect(covered).toEqual(raw.flatMap((_, i) => (isDetour(i) ? [i] : [])));
          detours += covered.length;
        }
      }),
    );
    expect(byFold.weave.fold).toBe('weave');
    if (combo === '140000001') expect(detours).toBeGreaterThan(0);
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
        if (!sameCyclic(ta, tb)) expect(p).toEqual(pairReadings(ta, tb));
        if (!p) return;
        // the same readings: a rotation, either way round
        if (sameCyclic(ta, tb)) {
          const step = (p.ab[1 % ta.length] - p.ab[0] + tb.length) % tb.length;
          p.ab.forEach((q, i) => expect(q).toBe((p.ab[0] + i * step) % tb.length));
        }
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
