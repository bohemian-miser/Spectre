/**
 * A picked supertile against independent sources: its visits one level down
 * against each level traced from the top (`visitsAt`) with backtracks
 * cancelled one at a time; the supertile the other circuit is paired with
 * against the readings' alignment; the routes it highlights against the
 * routes the circuit uses (`buildup/circuitRoutes.ts`).
 */
import { describe, expect, it } from 'vitest';

import type { HexType } from '../../../core';
import { circuitUse } from '../../buildup/circuitRoutes';
import { Geometry, routePasses } from '../../buildup/viewer';
import { CircuitShapes, familyOf } from '../../shapes/circuitShapes';
import { CircuitFocus, pairReadings } from '../focus';
import { alignReadings, readings, sameCyclic, token, visitsAt, type Visit } from '../readings';

const RULE = [0, 2, 3, 4, 6, 8];

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

/** Visits in order, each kept one as itself and each run of cancelled ones as one item. */
function itemsOf(visits: readonly Tagged[], kept: ReadonlySet<number>, tokenOf: (v: Tagged) => string) {
  const out: ({ kind: 'visit'; i: number; type: string; slot: number; token: string } | { kind: 'run'; count: number; types: string[] })[] = [];
  for (const v of visits) {
    const last = out[out.length - 1];
    if (kept.has(v.at)) out.push({ kind: 'visit', i: v.at, type: v.type, slot: v.slot, token: tokenOf(v) });
    else if (last?.kind === 'run') {
      last.count++;
      if (!last.types.includes(v.type)) last.types.push(v.type);
    } else out.push({ kind: 'run', count: 1, types: [v.type] });
  }
  return out;
}

describe.each(['000100000', '140000001'])('023468 / %s', (combo) => {
  const cs = new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), 6, 1, true);
  const g = new Geometry(cs);
  const big = [...cs.born].sort((x, y) => y.length - x.length);
  const b = big[0];
  const a = big.find((c) => c.level === b.level - 2 && familyOf(c) === familyOf(b)) ?? big.find((c) => c.level === b.level - 2)!;
  const fa = new CircuitFocus(cs, g, a);
  const fb = new CircuitFocus(cs, g, b);

  it('expands a supertile into the visits one level down inside it, backtracks as cancelling them one at a time leaves out', () => {
    for (const [f, c] of [[fa, a], [fb, b]] as const) {
      const birth = f.node({ level: c.level, i: -1 }, null);
      const top = visitsAt(cs, c, c.level - 1).map((v, at) => ({ ...v, at }));
      expect(birth.items).toEqual(itemsOf(top, new Set(cancelOneByOne(top).map((v) => v.at)), (v) => token(v, c.level - 1, c.level)));
      for (let level = c.level - 1; level >= 1; level--) {
        const row = visitsAt(cs, c, level);
        const below = visitsAt(cs, c, level - 1).map((v, at) => ({ ...v, at }));
        const kept = new Set(cancelOneByOne(below).map((v) => v.at));
        const seen = new Set<string>();
        row.forEach((v, i) => {
          if (seen.has(v.id) || seen.size > 40) return;
          seen.add(v.id);
          const node = f.node({ level, i }, null);
          expect(node.path).toBe(v.id);
          expect(node.type).toBe(v.type);
          const inside = below.filter((w) => w.id.startsWith(`${v.id}.`));
          expect(node.childCount).toBe(inside.length);
          expect(node.items).toEqual(itemsOf(inside, kept, (w) => token(w, level - 1, c.level)));
        });
      }
    }
  });

  it('pairs a visit with the one the readings alignment pairs it with', () => {
    let paired = 0;
    for (let k = 0; k < a.level; k++) {
      const ra = readings(cs, a).find((r) => r.level === k)!.tokens;
      const rb = readings(cs, b).find((r) => r.level === k + 2)!.tokens;
      const p = pairReadings(rb, ra);
      if (!p) continue;
      if (sameCyclic(ra, rb)) {
        // a rotation, either way round, of the whole reading
        const n = rb.length;
        const d = n > 1 ? (p.ab[1] - p.ab[0] + n) % n : 1;
        expect(d === 1 || d === n - 1).toBe(true);
        p.ab.forEach((j, q) => expect(j).toBe((p.ab[0] + q * d) % n));
      } else {
        const al = alignReadings(rb, ra)!;
        expect(Array.from(p.ab, (j) => j >= 0)).toEqual(al.matchedA);
      }
      p.ab.forEach((j, q) => { if (j >= 0) expect(ra[j]).toBe(rb[q]); });
      // the partner of each kept visit of B at level k + 2
      const rowB = visitsAt(cs, b, k + 2).map((v, at) => ({ ...v, at }));
      const keptB = cancelOneByOne(rowB);
      const keptA = cancelOneByOne(visitsAt(cs, a, k).map((v, at) => ({ ...v, at })));
      keptB.slice(0, 30).forEach((v, q) => {
        const node = fb.node({ level: k + 2, i: v.at }, fa);
        const j = p.ab[q];
        expect(node.partner).toEqual(j >= 0 ? { level: k, i: keptA[j].at } : null);
        if (j >= 0) paired++;
      });
    }
    expect(paired).toBeGreaterThan(0);
    expect(fb.node({ level: b.level, i: -1 }, fa).partner).toEqual({ level: a.level, i: -1 });
  });

  it('highlights in a supertile’s route table the routes the circuit takes through it, as many times as it takes them', () => {
    const use = circuitUse(cs, b);
    for (let level = b.level - 1; level >= 1; level--) {
      const row = visitsAt(cs, b, level);
      const total = new Map<string, number>();
      const done = new Set<string>();
      row.forEach((v, i) => {
        if (done.has(v.id)) return;
        done.add(v.id);
        const t = fb.node({ level, i }, null).routes!;
        if (!t.all) return;
        // the passes drawn are every route's, in order, each with how often the circuit takes it
        const want = t.route.filter((r, q) => q === 0 || t.route[q - 1] !== r);
        expect(t.passes.length).toBe(want.reduce((s, r) => s + routePasses(g, level, v.type, r).length, 0));
        t.route.forEach((r, q) => {
          if (q === 0 || t.route[q - 1] !== r) total.set(`${v.type} ${r}`, (total.get(`${v.type} ${r}`) ?? 0) + t.uses[q]);
        });
      });
      const counted = new Map<string, number>();
      for (const [type, m] of use[level].byType) for (const [k, c] of m) counted.set(`${type as HexType} ${k}`, c);
      for (const [key, c] of total) if (c === 0) total.delete(key);
      if ([...done].length === row.filter((v, i) => row.findIndex((w) => w.id === v.id) === i).length) expect(total).toEqual(counted);
    }
  });
});
