/**
 * Renormalising a pairing: its supertiles' boundary maps, level by level,
 * and every circuit the substitution closes on the way.
 *
 * A level-0 tile's pairing joins its crossings in pairs. A level-(n + 1)
 * supertile is its children (level-n supertiles) glued along shared seams, so
 * its boundary map is the children's boundary maps composed through those
 * seams: follow an arc out of one child, into the next, and so on until the
 * walk reaches the parent's outline. A walk that comes back to where it began
 * without reaching the outline is a circuit *born* at level n + 1: it lies in
 * that supertile and in no single child. Its length (tiles) is the sum of the
 * arcs it uses, and the children it passes through are its address.
 *
 * Nothing here builds a patch: each level only glues the previous level's
 * boundary maps, so it runs to levels no rooted patch reaches. Each supertile
 * type at each level is one record, and every circuit in the tiling is a birth
 * in exactly one of them (the smallest supertile containing it).
 *
 * Usage: tsx renormalize.ts <family> <rule> <combo> <maxLevel>
 */
import {
  buildSystem,
  connectionPoints,
  leafOrder,
  transPt,
  type Affine,
  type MetaNode,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../src/core';
import { ruleOptions } from './boundary-classes';

/** One supertile type at one level, as seen from outside. */
export interface Boundary {
  /** Outline crossings in the supertile's own frame. */
  readonly pts: readonly Pt[];
  /** mate[i] = the outline crossing joined to i through the inside. */
  readonly mate: Int32Array;
  /** Tiles along the arc from i to mate[i]. */
  readonly arcLen: Float64Array;
}

export interface Birth {
  readonly level: number;
  readonly type: TileTypeId;
  /** Tiles around the circuit. */
  readonly length: number;
  /** Child slots (positions) it passes through, in order of first visit. */
  readonly slots: readonly number[];
}

export interface Renormalization {
  /** levels[n][type] */
  readonly levels: readonly Readonly<Record<string, Boundary>>[];
  readonly births: readonly Birth[];
}

const key = (p: Pt) => `${Math.round(p.x * 64)},${Math.round(p.y * 64)}`;

export function renormalize(family: TileFamilyId, subset: readonly number[], digits: readonly number[], maxLevel: number): Renormalization {
  const sel = new Set(subset);
  const types = leafOrder(family);
  const options = ruleOptions(family, subset);
  const level0: Record<string, Boundary> = {};
  types.forEach((t, ti) => {
    const pts = connectionPoints(family, t, sel).map((c) => c.pt);
    const mate = new Int32Array(pts.length).fill(-1);
    for (const [a, b] of options[ti][digits[ti]]) {
      mate[a] = b;
      mate[b] = a;
    }
    level0[t] = { pts, mate, arcLen: new Float64Array(pts.length).fill(1) };
  });
  const levels: Record<string, Boundary>[] = [level0];
  const births: Birth[] = [];
  for (let n = 1; n <= maxLevel; n++) {
    const sys = buildSystem(family, n);
    const prev = levels[n - 1];
    const next: Record<string, Boundary> = {};
    for (const [t, node] of Object.entries(sys)) {
      const meta = node as MetaNode;
      // Every child's outline crossings, in the parent's frame.
      const owner: number[] = [];
      const local: number[] = [];
      const world: Pt[] = [];
      meta.children.forEach((ch, ci) => {
        const b = prev[ch.node.type];
        b.pts.forEach((p, k) => {
          owner.push(ci);
          local.push(k);
          world.push(transPt(ch.xform as Affine, p));
        });
      });
      const start: number[] = [];
      let s = 0;
      for (const ch of meta.children) {
        start.push(s);
        s += prev[ch.node.type].pts.length;
      }
      const total = world.length;
      // Glue: a crossing shared by two children is inside the parent.
      const at = new Map<string, number>();
      const across = new Int32Array(total).fill(-1);
      world.forEach((p, i) => {
        const k = key(p);
        const j = at.get(k);
        if (j === undefined) at.set(k, i);
        else {
          across[i] = j;
          across[j] = i;
        }
      });
      const inner = (i: number) => {
        const b = prev[meta.children[owner[i]].node.type];
        const m = b.mate[local[i]];
        return { j: m < 0 ? -1 : start[owner[i]] + m, len: m < 0 ? 0 : b.arcLen[local[i]] };
      };
      const outline: number[] = [];
      for (let i = 0; i < total; i++) if (across[i] < 0) outline.push(i);
      const outPos = new Map(outline.map((i, k) => [i, k]));
      const mate = new Int32Array(outline.length).fill(-1);
      const arcLen = new Float64Array(outline.length);
      const used = new Uint8Array(total);
      outline.forEach((i0, k0) => {
        if (used[i0]) return;
        let i = i0;
        let len = 0;
        for (;;) {
          used[i] = 1;
          const { j, len: l } = inner(i);
          if (j < 0) break;
          used[j] = 1;
          len += l;
          if (across[j] < 0) {
            const k1 = outPos.get(j) as number;
            mate[k0] = k1;
            mate[k1] = k0;
            arcLen[k0] = arcLen[k1] = len;
            break;
          }
          i = across[j];
        }
      });
      // Whatever is left closes inside: circuits born here.
      for (let i0 = 0; i0 < total; i0++) {
        if (used[i0] || across[i0] < 0) continue;
        let i = i0;
        let len = 0;
        const slots: number[] = [];
        let ok = true;
        for (;;) {
          used[i] = 1;
          const pos = meta.children[owner[i]].pos;
          if (!slots.includes(pos)) slots.push(pos);
          const { j, len: l } = inner(i);
          if (j < 0) {
            ok = false;
            break;
          }
          used[j] = 1;
          len += l;
          i = across[j];
          if (i < 0) {
            ok = false;
            break;
          }
          if (i === i0) break;
        }
        if (ok) births.push({ level: n, type: t as TileTypeId, length: len, slots });
      }
      next[t] = { pts: outline.map((i) => world[i]), mate, arcLen };
    }
    levels.push(next);
  }
  return { levels, births };
}

if (process.argv[1]?.endsWith('renormalize.ts')) {
  const [family, rule, combo, maxArg] = process.argv.slice(2);
  const digits = [...combo].map((ch) => parseInt(ch, 36));
  const t0 = Date.now();
  const r = renormalize(family as TileFamilyId, [...rule].map(Number), digits, Number(maxArg));
  console.log(`${family} ${rule}-${combo}, levels 1..${maxArg} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (let n = 1; n < r.levels.length; n++) {
    const here = r.births.filter((b) => b.level === n);
    const byType = new Map<string, number[]>();
    for (const b of here) (byType.get(b.type) ?? byType.set(b.type, []).get(b.type)!).push(b.length);
    const outline = Object.entries(r.levels[n]).map(([t, b]) => `${t}:${b.pts.length}`).join(' ');
    console.log(`level ${n}: outline crossings ${outline}`);
    for (const [t, ls] of byType) {
      ls.sort((a, b) => b - a);
      console.log(`   born in ${t}: ${ls.length} circuits, longest ${ls.slice(0, 5).join(' ')}`);
    }
  }
}
