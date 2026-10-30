/**
 * The side-by-side views against independent sources: the expansion rows
 * against each level traced from the top (`visitsAt`), backtracks cancelled
 * one at a time; the supertiles drawn against the slot paths visited and
 * the supertile tree (`buildSystem`).
 */
import { describe, expect, it } from 'vitest';

import { buildSystem, mul, transPt, type Affine, type MetaNode } from '../../../core';
import { CircuitShapes, familyOf, type BornCircuit } from '../../shapes/circuitShapes';
import { expansion, pairPicture, sharedTokens, SUPERTILE_CAP } from '../pairView';
import { readings, token, visitsAt, type Visit } from '../readings';

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

/** The supertile at a slot path below a circuit's birth supertile, and where it sits in the birth supertile's frame. */
function supertileAt(c: BornCircuit, path: string): { type: string; xform: Affine } {
  let node = buildSystem('hex', c.level)[c.type] as MetaNode;
  let xform: Affine = [1, 0, 0, 0, 1, 0];
  for (const pos of path.split('.').map(Number)) {
    const ch = node.children.find((x) => x.pos === pos)!;
    xform = mul(xform, ch.xform as Affine);
    node = ch.node as MetaNode;
  }
  return { type: node.type, xform };
}

describe('lining two readings up token by token', () => {
  it('marks as shared a common subsequence, read in B’s order from its rotation', () => {
    const a = ['D<1', 'G<7', 'S<4', 'Ph<6', 'Pi<5', 'X<5'];
    const b = ['X<5', 'Pi<5', 'T<3', 'S<4', 'G<7', 'D<1', 'Ps<0'];
    const m = sharedTokens(a, b);
    expect(m.state).toBe('differs');
    const inA = a.filter((_, i) => m.a![i]);
    expect(inA).toEqual(['D<1', 'G<7', 'S<4', 'Pi<5', 'X<5']);
    expect(b.filter((_, i) => m.b![i]).sort()).toEqual([...inA].sort());
    expect(sharedTokens(a, [...a].reverse()).state).toBe('same');
  });
});

describe.each(['000100000', '140000001'])('023468 / %s', (combo) => {
  const cs = new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), 6, 1, true);
  const big = [...cs.born].sort((x, y) => y.length - x.length);
  const b = big[0];
  const a = big.find((c) => c.level === b.level - 2 && familyOf(c) === familyOf(b)) ?? big.find((c) => c.level === b.level - 2)!;

  it('expands each circuit into the visits traced from the top, backtracks marked as cancelling them one at a time marks them', () => {
    const x = expansion(cs, a, b, 99);
    expect(x.rows.length).toBeGreaterThan(1);
    for (const r of x.rows) {
      for (const [row, c] of [[r.a, a], [r.b, b]] as const) {
        expect(row.level).toBe(c.level - r.depth);
        const raw = visitsAt(cs, c, row.level).map((v, at) => ({ ...v, at }));
        expect(row.visits).toBe(raw.length);
        expect(row.raw.map((v) => v.type)).toEqual(raw.map((v) => v.type));
        expect(row.raw.map((v) => v.slot)).toEqual(raw.map((v) => v.slot));
        if (r.depth > 1) {
          const above = visitsAt(cs, c, row.level + 1);
          raw.forEach((v, i) => expect(v.id).toBe(`${above[row.raw[i].up].id}.${v.slot}`));
        }
        const kept = cancelOneByOne(raw);
        const keptAt = new Set(kept.map((v) => v.at));
        row.raw.forEach((v, i) => expect(v.mark === 'cancelled').toBe(!keptAt.has(i)));
        expect(row.kept).toEqual(kept.map((v) => row.raw[v.at]));
        expect(row.cancelled).toBe(raw.length - kept.length);
      }
      const short = expansion(cs, a, b, r.depth, 5).rows[r.depth - 1];
      expect(short.b.raw).toEqual(r.b.raw.slice(0, 5));
      expect(short.b.kept).toEqual(r.b.kept.slice(0, 5));
      const ra = readings(cs, a).find((q) => q.level === r.a.level)!;
      const rb = readings(cs, b).find((q) => q.level === r.b.level)!;
      expect(r.same).toBe(sharedTokens(ra.tokens, rb.tokens).state === 'same');
    }
  });

  it('draws the supertiles visited, each where the supertile tree puts it, the unshared ones marked', () => {
    const withReadings = (c: BornCircuit) => ({ circuit: c, readings: readings(cs, c) });
    let marked = 0;
    for (let k = 0; k < a.level; k++) {
      const p = pairPicture(cs, withReadings(a), withReadings(b), k);
      for (const [side, c] of [[p.a, a], [p.b, b]] as const) {
        const raw = visitsAt(cs, c, side.level).map((v, at) => ({ ...v, at }));
        if (raw.length > 30000) continue;
        const paths = [...new Set(raw.map((v) => v.id))];
        expect(side.count).toBe(paths.length);
        expect(side.supertiles.map((s) => s.path)).toEqual(paths.slice(0, SUPERTILE_CAP));
        for (const s of side.supertiles) {
          const at = supertileAt(c, s.path);
          expect(s.type).toBe(at.type);
          const q = transPt(at.xform, cs.corner(side.level, s.type, 0));
          expect(Math.hypot(s.outline[0] - q.x, s.outline[1] - q.y)).toBeLessThan(1e-9);
        }
        // the unshared supertiles: those holding a kept visit whose token the other reading lacks
        const other = side === p.a ? p.b : p.a;
        const kept = cancelOneByOne(raw);
        const otherC = side === p.a ? b : a;
        const otherKept = cancelOneByOne(visitsAt(cs, otherC, other.level).map((v, at) => ({ ...v, at })));
        const tokens = (vs: Tagged[], cc: BornCircuit, lvl: number) => vs.map((v) => token(v, lvl, cc.level));
        const m = side === p.a ? sharedTokens(tokens(kept, c, side.level), tokens(otherKept, otherC, other.level)) : sharedTokens(tokens(otherKept, otherC, other.level), tokens(kept, c, side.level));
        const mine = side === p.a ? m.a : m.b;
        const unshared = new Set(kept.filter((_, q) => mine && !mine[q]).map((v) => v.id));
        marked += unshared.size;
        expect(side.supertiles.filter((s) => s.unshared).map((s) => s.path).sort()).toEqual(side.supertiles.map((s) => s.path).filter((id) => unshared.has(id)).sort());
      }
    }
    if (combo === '000100000') expect(marked).toBeGreaterThan(0);
  }, 60000);
});
