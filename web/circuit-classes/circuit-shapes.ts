/**
 * The shapes of circuits too big to render: the renormalisation of
 * `renormalize.ts`, keeping each arc's route through its children so one
 * circuit can be expanded on its own, down to any level of detail.
 *
 * An arc of a level-n supertile (outline crossing k to its mate) is the walk
 * through the children that made it: a list of child crossings it enters.
 * Expanding a circuit means replaying those walks recursively; stopping at
 * level `stop` draws each level-`stop` arc as a straight chord between its
 * ends, so a million-tile circuit comes out as a few thousand points with its
 * shape intact.
 *
 * Usage: tsx circuit-shapes.ts <family> <rule> <combo> <level> <type> <out.json>
 *   writes the largest circuits born at <level> in <type> (in that
 *   supertile's frame) and the supertile's children outlines, as JSON.
 */
import { writeFileSync } from 'node:fs';
import {
  buildSystem,
  connectionPoints,
  leafOrder,
  mul,
  transPt,
  type Affine,
  type MetaNode,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../src/core';
import { ruleOptions } from './boundary-classes';

interface Layer {
  readonly pts: readonly Pt[];
  readonly mate: Int32Array;
  readonly arcLen: Float64Array;
  /** For an arc walked from outline crossing k: its child entries, routeSteps[routeStart[k]..routeStart[k + 1]). */
  readonly routeStart: Int32Array;
  readonly routeSteps: Int32Array;
  /** Whether the route is stored from k (otherwise it is stored from mate[k]). */
  readonly forward: Uint8Array;
  /** Child crossing (global, in the parent's child list) of each outline crossing. */
  readonly outlineChild: Int32Array;
  /** Per global child crossing: which child, and its index in that child's outline. */
  readonly owner: Int32Array;
  readonly local: Int32Array;
}

export interface BornCircuit {
  readonly level: number;
  readonly type: TileTypeId;
  readonly length: number;
  /** Child slots (positions) it passes through, in order of first visit. */
  readonly slots: readonly number[];
  /** Child entries of the closing walk. */
  readonly steps: readonly number[];
}

const key = (p: Pt) => `${Math.round(p.x * 64)},${Math.round(p.y * 64)}`;

export class CircuitShapes {
  readonly levels: Record<string, Layer>[] = [];
  readonly born: BornCircuit[] = [];

  constructor(
    readonly family: TileFamilyId,
    subset: readonly number[],
    digits: readonly number[],
    readonly maxLevel: number,
    /** Keep the walks of circuits born at least this long. */
    keepAtLeast = 50,
  ) {
    const sel = new Set(subset);
    const options = ruleOptions(family, subset);
    const level0: Record<string, Layer> = {};
    leafOrder(family).forEach((t, ti) => {
      const pts = connectionPoints(family, t, sel).map((c) => c.pt);
      const mate = new Int32Array(pts.length).fill(-1);
      for (const [a, b] of options[ti][digits[ti]]) {
        mate[a] = b;
        mate[b] = a;
      }
      const empty = new Int32Array(0);
      level0[t] = {
        pts,
        mate,
        arcLen: new Float64Array(pts.length).fill(1),
        routeStart: new Int32Array(pts.length + 1),
        routeSteps: empty,
        forward: new Uint8Array(pts.length).fill(1),
        outlineChild: empty,
        owner: empty,
        local: empty,
      };
    });
    this.levels.push(level0);
    for (let n = 1; n <= maxLevel; n++) {
      const sys = buildSystem(family, n);
      const prev = this.levels[n - 1];
      const next: Record<string, Layer> = {};
      for (const [t, node] of Object.entries(sys)) {
        const meta = node as MetaNode;
        const ownerArr: number[] = [];
        const localArr: number[] = [];
        const world: Pt[] = [];
        const start: number[] = [];
        meta.children.forEach((ch, ci) => {
          start.push(world.length);
          prev[ch.node.type].pts.forEach((p, k) => {
            ownerArr.push(ci);
            localArr.push(k);
            world.push(transPt(ch.xform as Affine, p));
          });
        });
        const total = world.length;
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
          const b = prev[meta.children[ownerArr[i]].node.type];
          const m = b.mate[localArr[i]];
          return { j: m < 0 ? -1 : start[ownerArr[i]] + m, len: m < 0 ? 0 : b.arcLen[localArr[i]] };
        };
        const outline: number[] = [];
        for (let i = 0; i < total; i++) if (across[i] < 0) outline.push(i);
        const outPos = new Map(outline.map((i, k) => [i, k]));
        const mate = new Int32Array(outline.length).fill(-1);
        const arcLen = new Float64Array(outline.length);
        const forward = new Uint8Array(outline.length);
        const routeStart = new Int32Array(outline.length + 1);
        const steps: number[] = [];
        const used = new Uint8Array(total);
        outline.forEach((i0, k0) => {
          routeStart[k0] = steps.length;
          if (used[i0]) {
            routeStart[k0 + 1] = steps.length;
            return;
          }
          forward[k0] = 1;
          let i = i0;
          let len = 0;
          for (;;) {
            used[i] = 1;
            steps.push(i);
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
          routeStart[k0 + 1] = steps.length;
        });
        for (let i0 = 0; i0 < total; i0++) {
          if (used[i0] || across[i0] < 0) continue;
          let i = i0;
          let len = 0;
          const walk: number[] = [];
          let ok = true;
          for (;;) {
            used[i] = 1;
            walk.push(i);
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
          if (ok && len >= keepAtLeast) {
            const slots: number[] = [];
            for (const w of walk) {
              const pos = meta.children[ownerArr[w]].pos;
              if (!slots.includes(pos)) slots.push(pos);
            }
            this.born.push({ level: n, type: t as TileTypeId, length: len, slots, steps: walk });
          }
        }
        next[t] = {
          pts: outline.map((i) => world[i]),
          mate,
          arcLen,
          routeStart,
          routeSteps: Int32Array.from(steps),
          forward,
          outlineChild: Int32Array.from(outline),
          owner: Int32Array.from(ownerArr),
          local: Int32Array.from(localArr),
        };
      }
      this.levels.push(next);
    }
  }

  /** The points of the arc from outline crossing k of a level-n `type` (in frame `x`), drawn down to level `stop`. */
  arc(n: number, type: string, k: number, x: Affine, stop: number, out: Pt[]): void {
    const L = this.levels[n][type];
    if (n <= stop) {
      out.push(transPt(x, L.pts[k]));
      return;
    }
    const meta = buildSystem(this.family, n)[type] as MetaNode;
    const fwd = L.forward[k] === 1;
    const from = fwd ? k : L.mate[k];
    const s = Array.from(L.routeSteps.subarray(L.routeStart[from], L.routeStart[from + 1]));
    const prev = this.levels[n - 1];
    const enter = (i: number, reversed: boolean) => {
      const ch = meta.children[L.owner[i]];
      const childType = ch.node.type;
      let loc = L.local[i];
      if (reversed) loc = prev[childType].mate[loc];
      this.arc(n - 1, childType, loc, mul(x, ch.xform as Affine), stop, out);
    };
    if (fwd) for (const i of s) enter(i, false);
    else for (let q = s.length - 1; q >= 0; q--) enter(s[q], true);
  }

  /** The longest arc through a level-n supertile of `type` (an open strand), drawn down to level `stop`, with its end points. */
  longestArc(n: number, type: string, stop: number): { length: number; pts: Pt[] } {
    const L = this.levels[n][type];
    let best = 0;
    for (let k = 1; k < L.arcLen.length; k++) if (L.arcLen[k] > L.arcLen[best]) best = k;
    const out: Pt[] = [];
    this.arc(n, type, best, [1, 0, 0, 0, 1, 0], stop, out);
    out.push(L.pts[L.mate[best]]);
    return { length: L.arcLen[best], pts: out };
  }

  /** A born circuit as a closed polyline in its supertile's frame, drawn down to level `stop`. */
  shape(c: BornCircuit, stop: number): Pt[] {
    const meta = buildSystem(this.family, c.level)[c.type] as MetaNode;
    const L = this.levels[c.level][c.type];
    const out: Pt[] = [];
    for (const i of c.steps) {
      const ch = meta.children[L.owner[i]];
      this.arc(c.level - 1, ch.node.type, L.local[i], ch.xform as Affine, stop, out);
    }
    return out;
  }
}

if (process.argv[1]?.endsWith('circuit-shapes.ts')) {
  const [family, rule, combo, lvArg, type, outFile, stopArg, keepArg] = process.argv.slice(2);
  const level = Number(lvArg);
  const t0 = Date.now();
  const cs = new CircuitShapes(family as TileFamilyId, [...rule].map(Number), [...combo].map((ch) => parseInt(ch, 36)), level, Number(keepArg ?? 50));
  const here = cs.born.filter((b) => b.level === level && b.type === type).sort((a, b) => b.length - a.length);
  const lengths = [...new Set(here.map((b) => b.length))].slice(0, 4);
  const picks = lengths.map((l) => here.find((b) => b.length === l)!);
  const stop = stopArg ? Number(stopArg) : Math.max(0, level - 5);
  const shapes = picks.map((b) => ({ length: b.length, pts: cs.shape(b, stop).map((p) => [p.x, p.y]) }));
  writeFileSync(outFile, JSON.stringify({ family, rule, combo, level, type, stop, shapes, counts: lengths.map((l) => here.filter((b) => b.length === l).length) }));
  console.log(`${combo} L${level} ${type}: born lengths ${lengths.join(' ')} (x${lengths.map((l) => here.filter((b) => b.length === l).length).join(' x')}), drawn to level ${stop}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
