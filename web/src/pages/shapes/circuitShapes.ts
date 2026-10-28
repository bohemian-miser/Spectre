/**
 * The shapes of circuits too big to render: the renormalisation of
 * `web/circuit-classes/renormalize.ts`, keeping each arc's route through its
 * children so one circuit can be expanded on its own, down to any level of
 * detail.
 *
 * An arc of a level-n supertile (outline crossing k to its mate) is the walk
 * through the children that made it: a list of child crossings it enters.
 * Expanding a circuit means replaying those walks recursively; stopping at
 * level `stop` draws each level-`stop` arc as a straight chord between its
 * ends, so a million-tile circuit comes out as a few thousand points with its
 * shape intact.
 */
import {
  buildSystem,
  connectionPoints,
  enumerateMatchings,
  leafOrder,
  mul,
  nonCrossingForTile,
  transPt,
  type Affine,
  type MetaNode,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';

/** Each tile type's options for a rule (digit -> local index pairs). */
export function ruleOptions(family: TileFamilyId, subset: readonly number[]): (readonly (readonly [number, number])[])[][] {
  const sel = new Set(subset);
  return leafOrder(family).map((t) => {
    const n = connectionPoints(family, t, sel).length;
    const all = enumerateMatchings(n);
    const nc = nonCrossingForTile(family, t, sel);
    return nc.length === 0 ? [[]] : nc.map((m) => all[m] as (readonly [number, number])[]);
  });
}

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

/** A born circuit's family: the child slots it runs through, sorted. */
export const familyOf = (c: BornCircuit): string => [...new Set(c.slots)].sort((x, y) => x - y).join('');

const key = (p: Pt) => `${Math.round(p.x * 64)},${Math.round(p.y * 64)}`;

export class CircuitShapes {
  readonly levels: Record<string, Layer>[] = [];
  readonly born: BornCircuit[] = [];
  /** With `onePerLength`: where each family, level and length sits in `born`. */
  private readonly bornAt = new Map<string, number>();

  constructor(
    readonly family: TileFamilyId,
    subset: readonly number[],
    digits: readonly number[],
    readonly maxLevel: number,
    /** Keep the walks of circuits born at least this long. */
    keepAtLeast = 50,
    /** Keep one walk per family, level and length (a Delta's when there is one) rather than one per supertile type. */
    readonly onePerLength = false,
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
            const c: BornCircuit = { level: n, type: t as TileTypeId, length: len, slots, steps: walk };
            if (!onePerLength) this.born.push(c);
            else {
              const at = `${familyOf(c)}/${n}/${len}`;
              const i = this.bornAt.get(at);
              if (i === undefined) this.bornAt.set(at, this.born.push(c) - 1);
              else if (t === 'Delta') this.born[i] = c;
            }
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

  /** The children of a level-n supertile of `type`: their types and slots, in child order. */
  childTypes(n: number, type: string): { type: string; pos: number }[] {
    return (buildSystem(this.family, n)[type] as MetaNode).children.map((ch) => ({ type: ch.node.type, pos: ch.pos }));
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

  /**
   * The tile a born circuit enters first: the slots from its supertile down
   * to that tile (top first), and the chord the strand draws across it, in
   * the supertile's frame (the first two points of `shape(c, 0)`).
   */
  firstTile(c: BornCircuit): { path: { type: TileTypeId; pos: number }[]; chord: [Pt, Pt] } {
    const meta = buildSystem(this.family, c.level)[c.type] as MetaNode;
    const top = this.levels[c.level][c.type];
    const i = c.steps[0];
    const first = meta.children[top.owner[i]];
    const path = [{ type: first.node.type as TileTypeId, pos: first.pos }];
    let x = first.xform as Affine;
    let n = c.level - 1;
    let type = first.node.type as string;
    let k = top.local[i];
    // Follow the first child entered at each level, as `arc` does.
    while (n > 0) {
      const L = this.levels[n][type];
      const m = buildSystem(this.family, n)[type] as MetaNode;
      const fwd = L.forward[k] === 1;
      const from = fwd ? k : L.mate[k];
      const steps = L.routeSteps.subarray(L.routeStart[from], L.routeStart[from + 1]);
      const g = fwd ? steps[0] : steps[steps.length - 1];
      const child = m.children[L.owner[g]];
      let loc = L.local[g];
      if (!fwd) loc = this.levels[n - 1][child.node.type].mate[loc];
      path.push({ type: child.node.type as TileTypeId, pos: child.pos });
      x = mul(x, child.xform as Affine);
      n--;
      type = child.node.type;
      k = loc;
    }
    const leaf = this.levels[0][type];
    return { path, chord: [transPt(x, leaf.pts[k]), transPt(x, leaf.pts[leaf.mate[k]])] };
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


export interface TileLoop {
  /** Tile positions (chord midpoints), anticlockwise, `samples` of them evenly spaced by tile count. */
  readonly xy: Float64Array;
  readonly n: number;
  /** Radius of gyration over every tile. */
  readonly rg: number;
}

/**
 * A circuit's tiles as a loop: the midpoint of the strand's chord through
 * each tile (from the crossings `shape(c, 0)` draws), turned anticlockwise,
 * then sampled at tiles round(j L / n).
 */
export function tileLoop(crossings: readonly Pt[], samples: number): TileLoop {
  const L = crossings.length;
  const mx = new Float64Array(L);
  const my = new Float64Array(L);
  let area = 0;
  for (let i = 0; i < L; i++) {
    const q = crossings[(i + 1) % L];
    mx[i] = (crossings[i].x + q.x) / 2;
    my[i] = (crossings[i].y + q.y) / 2;
  }
  for (let i = 0; i < L; i++) area += mx[i] * my[(i + 1) % L] - mx[(i + 1) % L] * my[i];
  const at = (i: number) => (area < 0 ? L - 1 - i : i);
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < L; i++) {
    cx += mx[i];
    cy += my[i];
  }
  cx /= L;
  cy /= L;
  let s = 0;
  for (let i = 0; i < L; i++) s += (mx[i] - cx) ** 2 + (my[i] - cy) ** 2;
  const n = Math.min(L, samples);
  const xy = new Float64Array(2 * n);
  for (let j = 0; j < n; j++) {
    const t = at(Math.round((j * L) / n) % L);
    xy[2 * j] = mx[t];
    xy[2 * j + 1] = my[t];
  }
  return { xy, n, rg: Math.sqrt(s / L) };
}

export interface DistinctCircuit {
  /** Child slots it runs through, sorted. */
  readonly family: string;
  /** Other families with a circuit of the same length and radius of gyration. */
  readonly aliases: string[];
  readonly level: number;
  readonly type: TileTypeId;
  readonly length: number;
  readonly circuit: BornCircuit;
  readonly loop: TileLoop;
}

/**
 * Every distinct circuit born up to the renormalisation's last level: each
 * family's circuits of each length at each level, as tile loops, with the same
 * length and radius of gyration kept once at its lowest level (the others'
 * families become its aliases). Ordered by family, the family with the
 * biggest circuit first, then by level and length.
 */
export function distinctCircuits(cs: CircuitShapes, samples: number): DistinctCircuit[] {
  const top = new Map<string, number>();
  for (const c of cs.born) top.set(familyOf(c), Math.max(top.get(familyOf(c)) ?? 0, c.length));
  const order = [...cs.born].sort((a, b) => a.level - b.level || b.length - a.length);
  const out: DistinctCircuit[] = [];
  for (const c of order) {
    const loop = tileLoop(cs.shape(c, 0), samples);
    const family = familyOf(c);
    const twin = out.find((o) => o.length === c.length && Math.abs(o.loop.rg - loop.rg) <= 1e-6 * loop.rg);
    if (twin) {
      if (twin.family !== family && !twin.aliases.includes(family)) twin.aliases.push(family);
    } else out.push({ family, aliases: [], level: c.level, type: c.type, length: c.length, circuit: c, loop });
  }
  const rank = (f: string) => -(top.get(f) ?? 0);
  return out.sort((a, b) => rank(a.family) - rank(b.family) || a.family.localeCompare(b.family) || a.level - b.level || b.length - a.length);
}
