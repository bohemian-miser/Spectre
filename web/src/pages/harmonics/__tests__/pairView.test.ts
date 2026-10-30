/**
 * A chain's members drawn over their supertiles, against independent
 * sources: the supertiles drawn against the slot paths visited at each level
 * traced from the top (`visitsAt`) and the supertile tree (`buildSystem`);
 * the supertiles marked against the visits whose tokens the neighbouring
 * member's reading lacks, backtracks cancelled one at a time.
 */
import { describe, expect, it } from 'vitest';

import { buildSystem, mul, transPt, type Affine, type MetaNode } from '../../../core';
import { CircuitShapes, familyOf, type BornCircuit } from '../../shapes/circuitShapes';
import { chainPicture, sharedTokens, SUPERTILE_CAP } from '../pairView';
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

  it('draws every member over the supertiles it visits, each where the supertile tree puts it, those the neighbour lacks marked', () => {
    // members two levels apart in one family, down from the biggest circuit
    const members: BornCircuit[] = [b];
    for (let m = big.find((c) => c.level === b.level - 2 && familyOf(c) === familyOf(b)); m; m = big.find((c) => c.level === m!.level - 2 && familyOf(c) === familyOf(b))) members.unshift(m);
    if (members.length === 1) members.unshift(a);
    const withReadings = (c: BornCircuit) => ({ circuit: c, readings: readings(cs, c) });
    let marked = 0;
    for (let k = 0; k < members[0].level; k++) {
      const p = chainPicture(cs, members.map(withReadings), k);
      expect(p.sides.map((x) => x.level)).toEqual(members.map((c) => k + c.level - members[0].level));
      p.sides.forEach((side, j) => {
        const c = members[j];
        const raw = visitsAt(cs, c, side.level).map((v, at) => ({ ...v, at }));
        if (raw.length > 30000) return;
        const paths = [...new Set(raw.map((v) => v.id))];
        expect(side.count).toBe(paths.length);
        expect(side.supertiles.map((x) => x.path)).toEqual(paths.slice(0, SUPERTILE_CAP));
        for (const x of side.supertiles) {
          const at = supertileAt(c, x.path);
          expect(x.type).toBe(at.type);
          const q = transPt(at.xform, cs.corner(side.level, x.type, 0));
          expect(Math.hypot(x.outline[0] - q.x, x.outline[1] - q.y)).toBeLessThan(1e-9);
        }
        // marked: the supertiles holding a kept visit whose token the neighbour's reading lacks (the member below, or above for the lowest)
        const nb = j > 0 ? j - 1 : 1;
        const o = members[nb];
        const oLevel = p.sides[nb].level;
        const tokens = (vs: Tagged[], cc: BornCircuit, lvl: number) => vs.map((v) => token(v, lvl, cc.level));
        const kept = cancelOneByOne(raw);
        const otherKept = cancelOneByOne(visitsAt(cs, o, oLevel).map((v, at) => ({ ...v, at })));
        const lower = nb < j;
        const m = lower ? sharedTokens(tokens(otherKept, o, oLevel), tokens(kept, c, side.level)) : sharedTokens(tokens(kept, c, side.level), tokens(otherKept, o, oLevel));
        const mine = lower ? m.b : m.a;
        const unshared = new Set(kept.filter((_, q) => mine && !mine[q]).map((v) => v.id));
        marked += unshared.size;
        expect(side.supertiles.filter((x) => x.unshared).map((x) => x.path).sort()).toEqual(side.supertiles.map((x) => x.path).filter((id) => unshared.has(id)).sort());
      });
    }
    if (combo === '000100000') expect(marked).toBeGreaterThan(0);
  }, 60000);
});
