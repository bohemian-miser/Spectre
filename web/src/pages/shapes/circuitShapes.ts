/**
 * The shapes of circuits too big to render: the renormalisation of
 * `web/circuit-classes/renormalize.ts`, keeping each arc's route through its
 * children so one circuit can be expanded on its own, down to any level of
 * detail.
 *
 * An arc of a level-n supertile (crossing k to its mate) is the walk
 * through the children that made it: a list of child crossings it enters.
 * Expanding a circuit means replaying those walks recursively; stopping at
 * level `stop` draws each level-`stop` arc as a straight chord between its
 * ends, so a million-tile circuit comes out as a few thousand points with its
 * shape intact.
 */
import {
  buildSystem,
  connectionPoints,
  edgeParts,
  enumerateMatchings,
  gluedPairs,
  leafOrder,
  leafPts,
  mul,
  nonCrossingForTile,
  slotsOfType,
  tileLetter,
  transPt,
  type Affine,
  type HexType,
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

/**
 * A level's crossings, numbered once for every type: a crossing's number (its
 * place) is fixed by the slot of the child it sits on and the child's place
 * one level down, which is also what fixes its position, so a place sits at
 * the same point in every type's frame. Level 0's places are the six edges
 * of a hexagon.
 *
 * The level's table is common to the types: for each place, the place a
 * strand entering there leaves by, the tiles on the way, and the route
 * through the children that made it. A type keeps which places it has and
 * its entries where it differs from the common table.
 */
export class Level {
  private cachedPts: readonly Pt[] | null = null;

  constructor(
    readonly n: number,
    /** Per place: the child crossing it is, as `childPlace * 8 + slot` (level 0: its edge). */
    readonly under: Int32Array,
    readonly mate: Int32Array,
    readonly arcLen: Float64Array,
    /** The route from place k: routeSteps[routeStart[k]..routeStart[k + 1]), each a child crossing as in `under`. */
    readonly routeStart: Int32Array,
    readonly routeSteps: Int32Array,
    /** Whether the route is stored from k (otherwise it is stored from mate[k]). */
    readonly forward: Uint8Array,
    private readonly place: (p: number) => Pt,
  ) {}

  get size(): number {
    return this.under.length;
  }

  /** Each place's position, in the frame every type at this level shares. */
  get pts(): readonly Pt[] {
    if (!this.cachedPts) this.cachedPts = Array.from(this.under, (_, p) => this.place(p));
    return this.cachedPts;
  }
}

/** A type's entry where it differs from the common table. */
export interface Own {
  readonly mate: number;
  readonly len: number;
  readonly forward: boolean;
  readonly steps: Int32Array;
}

const NO_STEPS = new Int32Array(0);

/** One type's table at one level: the level's common table, with the type's places and overrides. */
export class Table {
  constructor(
    readonly level: Level,
    readonly type: string,
    /** Bit p: the type has place p. */
    private readonly present: Uint8Array,
    private readonly own: ReadonlyMap<number, Own>,
  ) {}

  get size(): number {
    return this.level.size;
  }

  get pts(): readonly Pt[] {
    return this.level.pts;
  }

  /** Overrides of the common table. */
  get overrides(): number {
    return this.own.size;
  }

  /** The overrides, by place. */
  ownEntries(): Iterable<[number, Own]> {
    return this.own.entries();
  }

  /** Places of the level the type does not have. */
  absent(): number {
    let had = 0;
    for (const b of this.present) for (let x = b; x; x &= x - 1) had++;
    return this.size - had;
  }

  has(k: number): boolean {
    return (this.present[k >> 3] & (1 << (k & 7))) !== 0;
  }

  /** The place a strand entering at k leaves by: -1 when it ends inside, or k is not a crossing of this type. */
  mate(k: number): number {
    if (!this.has(k)) return -1;
    const o = this.own.get(k);
    return o ? o.mate : this.level.mate[k];
  }

  /** Tiles on the way from k to its mate. */
  len(k: number): number {
    if (!this.has(k)) return 0;
    const o = this.own.get(k);
    return o ? o.len : this.level.arcLen[k];
  }

  /** The route of the arc through k, as stored: from k when `forward`, otherwise from its mate. */
  route(k: number): { steps: Int32Array; forward: boolean } {
    const at = (p: number): { steps: Int32Array; forward: boolean } => {
      const o = this.own.get(p);
      if (o) return { steps: o.steps, forward: o.forward };
      const L = this.level;
      return { steps: L.routeSteps.subarray(L.routeStart[p], L.routeStart[p + 1]), forward: L.forward[p] === 1 };
    };
    const r = at(k);
    return r.forward ? r : { steps: at(this.mate(k)).steps, forward: false };
  }

  /** The type's places, in order. */
  crossings(): Int32Array {
    const out: number[] = [];
    for (let k = 0; k < this.size; k++) if (this.has(k)) out.push(k);
    return Int32Array.from(out);
  }
}

export interface BornCircuit {
  readonly level: number;
  readonly type: TileTypeId;
  readonly length: number;
  /** Child slots (positions) it passes through, in order of first visit. */
  readonly slots: readonly number[];
  /** Child crossings the closing walk enters, as `childPlace * 8 + slot`. */
  readonly steps: readonly number[];
}

/** A born circuit's family: the child slots it runs through, sorted. */
export const familyOf = (c: BornCircuit): string => [...new Set(c.slots)].sort((x, y) => x - y).join('');

/** A child crossing, `childPlace * 8 + slot`, taken apart. */
export const slotOf = (step: number): number => step & 7;
export const placeOf = (step: number): number => step >>> 3;

/** One type's results at a level, before they are shared out. */
interface Built {
  readonly type: string;
  readonly places: Int32Array;
  /** Per crossing, in the order of `places`: */
  readonly mate: Int32Array;
  readonly len: Float64Array;
  readonly forward: Uint8Array;
  readonly routeStart: Int32Array;
  readonly steps: Int32Array;
}

const sameEntry = (a: Built, i: number, b: Built, j: number): boolean => {
  if (a.mate[i] !== b.mate[j] || a.len[i] !== b.len[j] || a.forward[i] !== b.forward[j]) return false;
  const s = a.routeStart[i], e = a.routeStart[i + 1], t = b.routeStart[j];
  if (e - s !== b.routeStart[j + 1] - t) return false;
  for (let q = 0; q < e - s; q++) if (a.steps[s + q] !== b.steps[t + q]) return false;
  return true;
};

export class CircuitShapes {
  /** levels[n][type]: each type's table at level n. */
  readonly levels: Record<string, Table>[] = [];
  readonly born: BornCircuit[] = [];
  /** With `onePerLength`: where each family, level and length sits in `born` (with `keyOf`, each key). */
  private readonly bornAt = new Map<string, number>();
  /** rows[n][type][edge]: a level-n type's places on each edge, in order round the supertile; what level n + 1 is glued by. */
  private readonly rows: Record<string, Int32Array[]>[] = [{}];
  /** groupOf[n][type]: types in one group have identical tables at level n (the same children's groups slot for slot, glued the same way), so each group is walked once. */
  private readonly groupOf: Map<string, number>[] = [];
  /** Per level, each type's border crossings on each edge, in order, at most `BORDER_SAMPLES` of them evenly spaced: what outlines are drawn through. */
  private readonly borders: Record<string, Int32Array[]>[] = [];
  private readonly corners = new Map<string, Pt>();
  /** `walkAbove`'s gluing of the last type it walked in. */
  private readonly glued = new Map<string, ReturnType<CircuitShapes['glue']>>();
  /** With `keyOf`: how many circuits closed under each key. */
  private readonly copies = new Map<string, number>();
  /** closed[n][type]: the child crossings of every walk closing in a level-n supertile of `type` (at least `keepAtLeast` tiles), whether `born` keeps it or not. */
  readonly closed: Map<string, readonly Int32Array[]>[] = [new Map()];

  /** How many circuits closed like `c`: with `keyOf`, the copies under its key; otherwise 1. */
  copiesOf(c: BornCircuit): number {
    return this.keyOf ? (this.copies.get(this.keyOf(c)) ?? 0) : 1;
  }

  /** The highest level built so far; `extend` adds levels above it. */
  maxLevel = 0;

  /** Per level, the sums of the arcs met so far (`arcSums`): key `place * 16 + type index`, value an offset into `sumPool`. */
  private readonly sumAt: Map<number, number>[] = [];
  private sumPool = new Float64Array(SUMS * 1024);
  private sumUsed = 0;
  private readonly typeIndex = new Map<string, number>();

  constructor(
    readonly family: TileFamilyId,
    subset: readonly number[],
    digits: readonly number[],
    maxLevel: number,
    /** Keep the walks of circuits born at least this long. */
    private readonly keepAtLeast = 50,
    /** Keep one walk per family, level and length (a Delta's when there is one) rather than one per supertile type. */
    readonly onePerLength = false,
    /** Keep one walk per key (the first) and count the copies (`copiesOf`); overrides `onePerLength`. */
    private readonly keyOf?: (c: BornCircuit) => string,
  ) {
    if (family !== 'hex') throw new Error('supertiles are built up for the hexagon tiles');
    const sel = new Set(subset);
    const options = ruleOptions(family, subset);
    const corners = connectionPoints(family, 'Delta', new Set([0, 1, 2, 3, 4, 5, 6, 7, 8])).map((c) => c.pt);
    const built = leafOrder(family).map((t, ti): Built => {
      const edges = slotsOfType(family, t, subset).map((x) => x.edge);
      if (edges.length !== connectionPoints(family, t, sel).length) throw new Error(`${t}: crossings and edges disagree`);
      const mate = new Int32Array(6).fill(-1);
      for (const [a, b] of options[ti][digits[ti]]) {
        mate[edges[a]] = edges[b];
        mate[edges[b]] = edges[a];
      }
      this.rows[0][t] = Array.from({ length: 6 }, (_, j) => Int32Array.from(edges.includes(j) ? [j] : []));
      const places = Int32Array.from([...edges].sort((x, y) => x - y));
      return {
        type: t,
        places,
        mate: Int32Array.from(places, (p) => mate[p]),
        len: new Float64Array(places.length).fill(1),
        forward: new Uint8Array(places.length).fill(1),
        routeStart: new Int32Array(places.length + 1),
        steps: NO_STEPS,
      };
    });
    const keys0 = new Map<string, number>();
    this.groupOf.push(new Map(built.map((b) => {
      const key = `${Array.from(b.places).join(',')}|${Array.from(b.mate).join(',')}`;
      return [b.type, keys0.get(key) ?? keys0.set(key, keys0.size).get(key)!];
    })));
    this.levels.push(this.share(0, Int32Array.from([0, 1, 2, 3, 4, 5]), built, (p) => corners[p]));
    this.borders.push(sampleRows(this.rows[0]));
    this.extend(maxLevel);
  }

  /** The level's common table from each type's results: per place, the entry most types have; the rest are overrides. */
  private share(n: number, under: Int32Array, built: readonly Built[], place: (p: number) => Pt): Record<string, Table> {
    const P = under.length;
    const count = new Int32Array(P + 1);
    for (const b of built) for (const p of b.places) count[p + 1]++;
    for (let p = 0; p < P; p++) count[p + 1] += count[p];
    // who has each place: built index and position in its list
    const whoB = new Int32Array(count[P]);
    const whoI = new Int32Array(count[P]);
    const fill = count.slice(0, P);
    built.forEach((b, bi) => b.places.forEach((p, i) => { whoB[fill[p]] = bi; whoI[fill[p]++] = i; }));
    const mate = new Int32Array(P).fill(-1);
    const arcLen = new Float64Array(P);
    const forward = new Uint8Array(P);
    const routeStart = new Int32Array(P + 1);
    let steps = new Int32Array(1024);
    let used = 0;
    const own = built.map(() => new Map<number, Own>());
    const group = new Int32Array(built.length);
    for (let p = 0; p < P; p++) {
      const lo = count[p], hi = count[p + 1];
      // group the types' entries; the biggest group (first on a tie) is common
      let best = lo, bestSize = 0;
      for (let a = lo; a < hi; a++) {
        group[a - lo] = a;
        for (let r = lo; r < a; r++) {
          if (group[r - lo] === r && sameEntry(built[whoB[a]], whoI[a], built[whoB[r]], whoI[r])) { group[a - lo] = r; break; }
        }
      }
      for (let a = lo; a < hi; a++) {
        if (group[a - lo] !== a) continue;
        let size = 0;
        for (let r = a; r < hi; r++) if (group[r - lo] === a) size++;
        if (size > bestSize) { best = a; bestSize = size; }
      }
      routeStart[p] = used;
      if (bestSize > 0) {
        const b = built[whoB[best]], i = whoI[best];
        mate[p] = b.mate[i];
        arcLen[p] = b.len[i];
        forward[p] = b.forward[i];
        const s = b.steps.subarray(b.routeStart[i], b.routeStart[i + 1]);
        if (used + s.length > steps.length) {
          const grown = new Int32Array(Math.max(steps.length * 2, used + s.length));
          grown.set(steps);
          steps = grown;
        }
        steps.set(s, used);
        used += s.length;
      }
      for (let a = lo; a < hi; a++) {
        if (group[a - lo] === best) continue;
        const b = built[whoB[a]], i = whoI[a];
        own[whoB[a]].set(p, { mate: b.mate[i], len: b.len[i], forward: b.forward[i] === 1, steps: b.steps.slice(b.routeStart[i], b.routeStart[i + 1]) });
      }
    }
    routeStart[P] = used;
    const level = new Level(n, under, mate, arcLen, routeStart, steps.slice(0, used), forward, place);
    const out: Record<string, Table> = {};
    built.forEach((b, bi) => {
      const present = new Uint8Array((P + 7) >> 3);
      for (const p of b.places) present[p >> 3] |= 1 << (p & 7);
      out[b.type] = new Table(level, b.type, present, own[bi]);
    });
    return out;
  }

  /** Builds the levels up to `toLevel`, one on top of the last; levels already built are kept. */
  extend(toLevel: number): void {
    const { keepAtLeast, onePerLength } = this;
    for (let n = this.maxLevel + 1; n <= toLevel; n++) {
      const sys = buildSystem(this.family, n);
      const prev = this.levels[n - 1];
      const Q = Object.values(prev)[0].size;
      // the level's places, by child crossing (childPlace * 8 + slot)
      const placeAt = new Int32Array(Q * 8).fill(-1);
      const under: number[] = [];
      const intern = (step: number): number => {
        let p = placeAt[step];
        if (p < 0) {
          p = placeAt[step] = under.length;
          under.push(step);
        }
        return p;
      };
      const built: Built[] = [];
      const rows: Record<string, Int32Array[]> = {};
      const groups = new Map<string, number>();
      const walked = new Map<number, { built: Built; closing: Omit<BornCircuit, 'type'>[]; type: string }>();
      const born = (t: string, c: Omit<BornCircuit, 'type'>): void => {
        const b: BornCircuit = { ...c, type: t as TileTypeId };
        if (this.keyOf) {
          const at = this.keyOf(b);
          if (!this.bornAt.has(at)) this.bornAt.set(at, this.born.push(b) - 1);
          this.copies.set(at, (this.copies.get(at) ?? 0) + 1);
        } else if (!onePerLength) this.born.push(b);
        else {
          const at = `${familyOf(b)}/${n}/${b.length}`;
          const i = this.bornAt.get(at);
          if (i === undefined) this.bornAt.set(at, this.born.push(b) - 1);
          else if (t === 'Delta') this.born[i] = b;
        }
      };
      const keyOf = new Map<string, number>();
      const closedHere = new Map<string, readonly Int32Array[]>();
      for (const [t, node] of Object.entries(sys)) {
        const kids = (node as MetaNode).children;
        const childAt = new Int32Array(8).fill(-1);
        kids.forEach((ch, ci) => { childAt[ch.pos] = ci; });
        // the edge's crossings round the supertile: each child edge on it in turn, the child mirrored, so reversed
        const rowsOf = (): Int32Array[] => Array.from({ length: 6 }, (_, j) => {
          const row: number[] = [];
          for (const part of edgeParts(t as HexType, j)) {
            const c = childAt[part.s];
            const on = this.rows[n - 1][kids[c].node.type][part.e];
            for (let q = on.length - 1; q >= 0; q--) row.push(intern(on[q] * 8 + kids[c].pos));
          }
          return Int32Array.from(row);
        });
        const key = `${kids.map((ch) => `${ch.pos}=${this.groupOf[n - 1].get(ch.node.type)}`).join(' ')}|${JSON.stringify(gluedPairs(t as HexType))}`;
        const group = keyOf.get(key) ?? keyOf.set(key, keyOf.size).get(key)!;
        groups.set(t, group);
        const done = walked.get(group);
        if (done) {
          // its crossings are the walked type's, already numbered
          rows[t] = rowsOf();
          built.push({ ...done.built, type: t });
          for (const c of done.closing) born(t, c);
          closedHere.set(t, closedHere.get(done.type)!);
          continue;
        }
        const closing: Omit<BornCircuit, 'type'>[] = [];
        const tables = kids.map((ch) => prev[ch.node.type]);
        // child crossing g = child * Q + its place
        const total = kids.length * Q;
        const across = new Int32Array(total).fill(-1);
        // two children glued along an edge meet crossing for crossing, in reverse order
        for (const [a, b] of gluedPairs(t as HexType)) {
          const ca = childAt[a.s], cb = childAt[b.s];
          const A = this.rows[n - 1][kids[ca].node.type][a.e];
          const B = this.rows[n - 1][kids[cb].node.type][b.e];
          if (A.length !== B.length) throw new Error(`${t} glues ${A.length} crossings to ${B.length}`);
          for (let i = 0, m = A.length; i < m; i++) {
            const x = ca * Q + A[i], y = cb * Q + B[m - 1 - i];
            across[x] = y;
            across[y] = x;
          }
        }
        const outer: number[] = [];
        tables.forEach((T, ci) => {
          for (let q = 0; q < Q; q++) if (T.has(q) && across[ci * Q + q] < 0) outer.push(ci * Q + q);
        });
        const stepOf = (g: number): number => (g % Q) * 8 + kids[Math.floor(g / Q)].pos;
        const placeOfG = new Int32Array(total).fill(-1);
        for (const g of outer) placeOfG[g] = intern(stepOf(g));
        // walked in order of place, so a route is stored from the same end in every type
        outer.sort((x, y) => placeOfG[x] - placeOfG[y]);
        const places = Int32Array.from(outer, (g) => placeOfG[g]);
        const index = new Int32Array(total);
        outer.forEach((g, k) => { index[g] = k; });
        rows[t] = rowsOf();
        if (rows[t].reduce((a, r) => a + r.length, 0) !== outer.length) throw new Error(`${t} at level ${n}: the border places miss crossings`);
        const childMate = (g: number): number => {
          const c = Math.floor(g / Q);
          const m = tables[c].mate(g - c * Q);
          return m < 0 ? -1 : c * Q + m;
        };
        const childLen = (g: number): number => {
          const c = Math.floor(g / Q);
          return tables[c].len(g - c * Q);
        };
        const outs = outer.length;
        const mate = new Int32Array(outs).fill(-1);
        const len = new Float64Array(outs);
        const forward = new Uint8Array(outs);
        const routeStart = new Int32Array(outs + 1);
        const steps: number[] = [];
        const seen = new Uint8Array(total);
        for (let k0 = 0; k0 < outs; k0++) {
          const g0 = outer[k0];
          routeStart[k0] = steps.length;
          if (seen[g0]) continue;
          forward[k0] = 1;
          let g = g0;
          let l = 0;
          for (;;) {
            seen[g] = 1;
            steps.push(stepOf(g));
            const j = childMate(g);
            if (j < 0) break;
            seen[j] = 1;
            l += childLen(g);
            if (across[j] < 0) {
              const k1 = index[j];
              mate[k0] = places[k1];
              mate[k1] = places[k0];
              len[k0] = len[k1] = l;
              break;
            }
            g = across[j];
          }
        }
        routeStart[outs] = steps.length;
        const mine: Built = { type: t, places, mate, len, forward, routeStart, steps: Int32Array.from(steps) };
        built.push(mine);
        for (let g0 = 0; g0 < total; g0++) {
          if (seen[g0] || across[g0] < 0) continue;
          let g = g0;
          let l = 0;
          const walk: number[] = [];
          let ok = true;
          for (;;) {
            seen[g] = 1;
            walk.push(stepOf(g));
            const j = childMate(g);
            if (j < 0) {
              ok = false;
              break;
            }
            seen[j] = 1;
            l += childLen(g);
            g = across[j];
            if (g < 0) {
              ok = false;
              break;
            }
            if (g === g0) break;
          }
          if (ok && l >= keepAtLeast) {
            const slots: number[] = [];
            for (const w of walk) if (!slots.includes(slotOf(w))) slots.push(slotOf(w));
            const c = { level: n, length: l, slots, steps: walk };
            closing.push(c);
            born(t, c);
          }
        }
        walked.set(group, { built: mine, closing, type: t });
        closedHere.set(t, closing.map((c) => Int32Array.from(c.steps)));
      }
      this.closed.push(closedHere);
      this.rows.push(rows);
      this.groupOf.push(groups);
      this.borders.push(sampleRows(rows));
      this.levels.push(this.share(n, Int32Array.from(under), built, this.placer(n)));
      this.maxLevel = n;
    }
  }

  /**
   * The children of a level-(below + 1) supertile, with the level-`below`
   * tables: child crossing g is `child * Q + its place`, and `across[g]` is
   * the crossing of the neighbouring child it is glued to (-1 on the outline).
   */
  private glue(t: string, node: MetaNode, below: number) {
    const prev = this.levels[below];
    const rowsBelow = this.rows[below];
    const Q = Object.values(prev)[0].size;
    const kids = node.children;
    const childAt = new Int32Array(8).fill(-1);
    kids.forEach((ch, ci) => { childAt[ch.pos] = ci; });
    const tables = kids.map((ch) => prev[ch.node.type]);
    const total = kids.length * Q;
    const across = new Int32Array(total).fill(-1);
    // two children glued along an edge meet crossing for crossing, in reverse order
    for (const [a, b] of gluedPairs(t as HexType)) {
      const ca = childAt[a.s], cb = childAt[b.s];
      const A = rowsBelow[kids[ca].node.type][a.e];
      const B = rowsBelow[kids[cb].node.type][b.e];
      if (A.length !== B.length) throw new Error(`${t} glues ${A.length} crossings to ${B.length}`);
      for (let i = 0, m = A.length; i < m; i++) {
        const x = ca * Q + A[i], y = cb * Q + B[m - 1 - i];
        across[x] = y;
        across[y] = x;
      }
    }
    return { kids, childAt, tables, total, across, Q };
  }

  /**
   * The strand through child crossing `step` (`childPlace * 8 + slot`) of a
   * level-(below + 1) supertile of `type`, followed through its children from
   * the level-`below` tables alone, so `below` may be the top level built: the
   * child crossings it enters, the tiles on the way, and whether it closes
   * inside the supertile. An open strand is followed from `step` until it
   * reaches the outline.
   */
  walkAbove(type: string, step: number, below = this.maxLevel): { closed: boolean; steps: number[]; length: number } {
    const key = `${below}/${type}`;
    let glued = this.glued.get(key);
    if (!glued) {
      this.glued.clear();
      glued = this.glue(type, buildSystem(this.family, below + 1)[type] as MetaNode, below);
      this.glued.set(key, glued);
    }
    const { kids, childAt, tables, across, Q } = glued;
    const c0 = childAt[slotOf(step)];
    if (c0 < 0) throw new Error(`${type} has no child in slot ${slotOf(step)}`);
    const g0 = c0 * Q + placeOf(step);
    const steps: number[] = [];
    let g = g0;
    let length = 0;
    for (;;) {
      const c = Math.floor(g / Q);
      steps.push((g % Q) * 8 + kids[c].pos);
      const m = tables[c].mate(g - c * Q);
      if (m < 0) return { closed: false, steps, length };
      length += tables[c].len(g - c * Q);
      g = across[c * Q + m];
      if (g < 0) return { closed: false, steps, length };
      if (g === g0) return { closed: true, steps, length };
    }
  }

  /** Works out where place p of level n sits, from the child crossing it is (a function of its own, so it holds nothing from the build). */
  private placer(n: number): (p: number) => Pt {
    const xform: Affine[] = [];
    for (const node of Object.values(buildSystem(this.family, n))) for (const ch of (node as MetaNode).children) xform[ch.pos] = ch.xform as Affine;
    return (p) => {
      const step = this.levels[n].Delta.level.under[p];
      return transPt(xform[slotOf(step)], this.levels[n - 1].Delta.level.pts[placeOf(step)]);
    };
  }

  /** A level-n type's places on each of its six edges, in order round the supertile. */
  border(n: number, type: string): readonly Int32Array[] {
    return this.rows[n][type];
  }

  /** The child at each slot of a level-n supertile of `type`. */
  private kidsAt(n: number, type: string): MetaNode['children'][number][] {
    const out: MetaNode['children'][number][] = [];
    for (const ch of (buildSystem(this.family, n)[type] as MetaNode).children) out[ch.pos] = ch;
    return out;
  }

  /** Each child crossing of a level-n arc from place k, in the order the strand meets them, with the child's own place entered. */
  enters(n: number, type: string, k: number): { slot: number; type: string; k: number }[] {
    const kids = this.kidsAt(n, type);
    const { steps, forward } = this.levels[n][type].route(k);
    const out: { slot: number; type: string; k: number }[] = [];
    const take = (s: number, reversed: boolean): void => {
      const ct = kids[slotOf(s)].node.type;
      out.push({ slot: slotOf(s), type: ct, k: reversed ? this.levels[n - 1][ct].mate(placeOf(s)) : placeOf(s) });
    };
    if (forward) for (const s of steps) take(s, false);
    else for (let q = steps.length - 1; q >= 0; q--) take(steps[q], true);
    return out;
  }

  /** The child a child crossing of a level-n `type` sits in, and its place there. */
  childOf(n: number, type: string, step: number): { type: string; pos: number; xform: Affine; k: number } {
    const ch = this.kidsAt(n, type)[slotOf(step)];
    return { type: ch.node.type, pos: ch.pos, xform: ch.xform as Affine, k: placeOf(step) };
  }

  /** The points of the arc from place k of a level-n `type` (in frame `x`), drawn down to level `stop`. */
  arc(n: number, type: string, k: number, x: Affine, stop: number, out: Pt[]): void {
    if (n <= stop) {
      out.push(transPt(x, this.levels[n][type].pts[k]));
      return;
    }
    const kids = this.kidsAt(n, type);
    for (const e of this.enters(n, type, k)) this.arc(n - 1, e.type, e.k, mul(x, kids[e.slot].xform as Affine), stop, out);
  }

  /** The tiles of a level-n arc entering place k, as letters (`core/circuitWord.ts`), appended to `out`. */
  private letters(n: number, type: string, k: number, out: string[]): void {
    if (n === 0) {
      out.push(tileLetter(type as HexType, k, this.levels[0][type].mate(k)));
      return;
    }
    for (const e of this.enters(n, type, k)) this.letters(n - 1, e.type, e.k, out);
  }

  /** The edge of a tile that its level-0 place k sits on. */
  crossingEdge(_type: string, k: number): number {
    return k;
  }

  /** A born circuit's word: a letter per tile. */
  word(c: BornCircuit): string[] {
    const out: string[] = [];
    for (const s of c.steps) {
      const ch = this.childOf(c.level, c.type, s);
      this.letters(c.level - 1, ch.type, ch.k, out);
    }
    return out;
  }

  /**
   * Corner j of a level-n supertile of `type`, where its edge j starts, in
   * its frame: the corner of the child its edge j starts on, where that
   * child's edge (run backwards, the child being mirrored) ends.
   */
  corner(n: number, type: string, j: number): Pt {
    if (n === 0) return leafPts(this.family, type as TileTypeId)[j];
    const key = `${n}/${type}/${j}`;
    const hit = this.corners.get(key);
    if (hit) return hit;
    const part = edgeParts(type as HexType, j)[0];
    const ch = this.kidsAt(n, type)[part.s];
    const p = transPt(ch.xform as Affine, this.corner(n - 1, ch.node.type, (part.e + 1) % 6));
    this.corners.set(key, p);
    return p;
  }

  /**
   * The outline of a level-n supertile of `type`, in its frame: each corner
   * followed by crossings on the edge it starts (at most `BORDER_SAMPLES`,
   * evenly spaced), all of them points of the supertile's border. A
   * neighbour sharing an edge passes through the same points.
   */
  outline(n: number, type: string): Pt[] {
    const T = this.levels[n][type];
    const rows = this.borders[n][type];
    const out: Pt[] = [];
    for (let j = 0; j < 6; j++) {
      out.push(this.corner(n, type, j));
      for (const p of rows[j]) out.push(T.pts[p]);
    }
    return out;
  }

  /** The children of a level-n supertile of `type`: their types and slots, in child order. */
  childTypes(n: number, type: string): { type: string; pos: number }[] {
    return (buildSystem(this.family, n)[type] as MetaNode).children.map((ch) => ({ type: ch.node.type, pos: ch.pos }));
  }

  /** The longest arc through a level-n supertile of `type` (an open strand), drawn down to level `stop`, with its end points. */
  longestArc(n: number, type: string, stop: number): { length: number; pts: Pt[] } {
    const T = this.levels[n][type];
    let best = -1;
    for (const k of T.crossings()) if (best < 0 || T.len(k) > T.len(best)) best = k;
    const out: Pt[] = [];
    this.arc(n, type, best, [1, 0, 0, 0, 1, 0], stop, out);
    out.push(T.pts[T.mate(best)]);
    return { length: T.len(best), pts: out };
  }

  /**
   * The tile a born circuit enters first: the slots from its supertile down
   * to that tile (top first), and the chord the strand draws across it, in
   * the supertile's frame (the first two points of `shape(c, 0)`).
   */
  firstTile(c: BornCircuit): { path: { type: TileTypeId; pos: number }[]; chord: [Pt, Pt] } {
    const first = this.childOf(c.level, c.type, c.steps[0]);
    const path = [{ type: first.type as TileTypeId, pos: first.pos }];
    let x = first.xform;
    let type = first.type;
    let k = first.k;
    // Follow the first child entered at each level, as `arc` does.
    for (let n = c.level - 1; n > 0; n--) {
      const e = this.enters(n, type, k)[0];
      path.push({ type: e.type as TileTypeId, pos: e.slot });
      x = mul(x, this.kidsAt(n, type)[e.slot].xform as Affine);
      type = e.type;
      k = e.k;
    }
    const leaf = this.levels[0][type];
    return { path, chord: [transPt(x, leaf.pts[k]), transPt(x, leaf.pts[leaf.mate(k)])] };
  }

  /**
   * The sums over the tiles of the arc from place k of a level-n `type`, in
   * its frame (`SUMS`), each arc worked out once from its children's.
   */
  private arcSums(n: number, type: string, k: number): number {
    const memo = (this.sumAt[n] ??= new Map());
    let ti = this.typeIndex.get(type);
    if (ti === undefined) this.typeIndex.set(type, (ti = this.typeIndex.size));
    const key = k * 16 + ti;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const acc = new Float64Array(SUMS);
    if (n === 0) {
      const T = this.levels[0][type];
      const p = T.pts[k], q = T.pts[T.mate(k)];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      acc.set([1, mx, my, 0, 0, 0, 0, mx, my, mx, my]);
    } else {
      const kids = this.kidsAt(n, type);
      for (const e of this.enters(n, type, k)) {
        const at = this.arcSums(n - 1, e.type, e.k);
        joinSums(acc, this.sumPool, at, kids[e.slot].xform as Affine);
      }
    }
    if (this.sumUsed + SUMS > this.sumPool.length) {
      const grown = new Float64Array(this.sumPool.length * 2);
      grown.set(this.sumPool);
      this.sumPool = grown;
    }
    const at = this.sumUsed;
    this.sumPool.set(acc, at);
    this.sumUsed += SUMS;
    memo.set(key, at);
    return at;
  }

  /** The sums over a born circuit's tiles (`SUMS`), in its supertile's frame, with the pair of tiles that closes the loop in the shoelace sum. */
  circuitSums(c: BornCircuit): Float64Array {
    const acc = new Float64Array(SUMS);
    for (const s of c.steps) {
      const ch = this.childOf(c.level, c.type, s);
      const at = this.arcSums(c.level - 1, ch.type, ch.k);
      joinSums(acc, this.sumPool, at, ch.xform);
    }
    acc[6] += cross(acc[9] - acc[1], acc[10] - acc[2], acc[7] - acc[1], acc[8] - acc[2]);
    return acc;
  }

  /**
   * The chord midpoints of a born circuit's tiles at the given tile indices
   * (ascending, counted from the first tile `shape(c, 0)` draws), as x, y
   * pairs. Arcs holding none of them are passed over by their tile counts.
   */
  midpointsAt(c: BornCircuit, tiles: ArrayLike<number>): Float64Array {
    const out = new Float64Array(2 * tiles.length);
    let got = 0;
    let passed = 0;
    const visit = (lvl: number, type: string, k: number, x: Affine): void => {
      const T = this.levels[lvl][type];
      const len = T.len(k);
      if (got === tiles.length || passed + len <= tiles[got]) {
        passed += len;
        return;
      }
      if (lvl === 0) {
        const p = transPt(x, T.pts[k]), q = transPt(x, T.pts[T.mate(k)]);
        while (got < tiles.length && tiles[got] === passed) {
          out[2 * got] = (p.x + q.x) / 2;
          out[2 * got + 1] = (p.y + q.y) / 2;
          got++;
        }
        passed++;
        return;
      }
      const kids = this.kidsAt(lvl, type);
      for (const e of this.enters(lvl, type, k)) visit(lvl - 1, e.type, e.k, mul(x, kids[e.slot].xform as Affine));
    };
    for (const s of c.steps) {
      if (got === tiles.length) break;
      const ch = this.childOf(c.level, c.type, s);
      visit(c.level - 1, ch.type, ch.k, ch.xform);
    }
    return out;
  }

  /** A born circuit as a closed polyline in its supertile's frame, drawn down to level `stop`. */
  shape(c: BornCircuit, stop: number): Pt[] {
    const out: Pt[] = [];
    for (const s of c.steps) {
      const ch = this.childOf(c.level, c.type, s);
      this.arc(c.level - 1, ch.type, ch.k, ch.xform, stop, out);
    }
    return out;
  }

  /**
   * A born circuit as a closed polyline at a resolution: its tiles cut into
   * runs of consecutive tiles, each run as long as its chord midpoints stay
   * within `share` of the circuit's radius of gyration (root mean square,
   * about the run's mean), and each run drawn at its mean. Taken from the arc
   * sums (`arcSums`): an arc whose tiles already fit joins the run whole, so
   * the tiles are never listed and a circuit gives about as many points at a
   * share as any other.
   */
  coarse(c: BornCircuit, share: number): { pts: Pt[]; tiles: number[] } {
    const all = this.circuitSums(c);
    const r2 = (share * share * (all[3] + all[5])) / all[0];
    const pts: Pt[] = [];
    const tiles: number[] = [];
    // the run so far: tiles, mean, sum of squared distances from the mean
    let n = 0, mx = 0, my = 0, m2 = 0;
    const join = (bn: number, bx: number, by: number, bm2: number): void => {
      if (n > 0) {
        const t = n + bn, dx = bx - mx, dy = by - my;
        const m = m2 + bm2 + ((n * bn) / t) * (dx * dx + dy * dy);
        if (m <= r2 * t) {
          mx += (dx * bn) / t;
          my += (dy * bn) / t;
          m2 = m;
          n = t;
          return;
        }
        pts.push({ x: mx, y: my });
        tiles.push(n);
      }
      n = bn;
      mx = bx;
      my = by;
      m2 = bm2;
    };
    const visit = (lvl: number, type: string, k: number, x: Affine): void => {
      const o = this.arcSums(lvl, type, k);
      const P = this.sumPool;
      const [a, b, tx, d, e, ty] = x;
      const bm2 = (a * a + d * d) * P[o + 3] + 2 * (a * b + d * e) * P[o + 4] + (b * b + e * e) * P[o + 5];
      if (lvl === 0 || bm2 <= r2 * P[o]) {
        join(P[o], a * P[o + 1] + b * P[o + 2] + tx, d * P[o + 1] + e * P[o + 2] + ty, bm2);
        return;
      }
      const kids = this.kidsAt(lvl, type);
      for (const en of this.enters(lvl, type, k)) visit(lvl - 1, en.type, en.k, mul(x, kids[en.slot].xform as Affine));
    };
    for (const s of c.steps) {
      const ch = this.childOf(c.level, c.type, s);
      visit(c.level - 1, ch.type, ch.k, ch.xform);
    }
    pts.push({ x: mx, y: my });
    tiles.push(n);
    return { pts, tiles };
  }
}

/**
 * The sums `arcSums` keeps per arc, over the chord midpoints m of its tiles in
 * order, each about the arc's own mean so that none grows with the distance
 * from the origin: the tile count; the mean (x, y); the second moments about
 * the mean (xx, xy, yy); the shoelace sum Σ (m_j − mean) × (m_(j+1) − mean)
 * over consecutive tiles; the first and the last midpoint.
 */
const SUMS = 11;

/** Crossings kept per edge of a supertile for drawing its outline. */
const BORDER_SAMPLES = 12;

/** Each row cut to at most `BORDER_SAMPLES` crossings, evenly spaced and both ends kept, so a row and its reverse keep the same ones. */
function sampleRows(rows: Record<string, Int32Array[]>): Record<string, Int32Array[]> {
  const out: Record<string, Int32Array[]> = {};
  for (const [t, edges] of Object.entries(rows)) {
    out[t] = edges.map((row) => {
      const m = row.length;
      if (m <= BORDER_SAMPLES) return row;
      return Int32Array.from({ length: BORDER_SAMPLES }, (_, i) => row[Math.round((i * (m - 1)) / (BORDER_SAMPLES - 1))]);
    });
  }
  return out;
}

const cross = (px: number, py: number, qx: number, qy: number): number => px * qy - py * qx;

/**
 * Appends an arc's sums (at `src[o..]`, in its own frame) to `acc`, mapped by
 * x: the mean moves with x, the moments and the shoelace sum change by its
 * linear part only, and two runs of tiles combine through their means (the
 * pairwise update of Chan, Golub and LeVeque for the moments). The tiles are
 * never listed.
 */
function joinSums(acc: Float64Array, src: Float64Array, o: number, x: Affine): void {
  const [a, b, c, d, e, f] = x;
  const nb = src[o];
  const Cxx = src[o + 3], Cxy = src[o + 4], Cyy = src[o + 5];
  const bx = a * src[o + 1] + b * src[o + 2] + c, by = d * src[o + 1] + e * src[o + 2] + f;
  const bxx = a * a * Cxx + 2 * a * b * Cxy + b * b * Cyy;
  const bxy = a * d * Cxx + (a * e + b * d) * Cxy + b * e * Cyy;
  const byy = d * d * Cxx + 2 * d * e * Cxy + e * e * Cyy;
  const bw = (a * e - b * d) * src[o + 6];
  const Fx = a * src[o + 7] + b * src[o + 8] + c, Fy = d * src[o + 7] + e * src[o + 8] + f;
  const Lx = a * src[o + 9] + b * src[o + 10] + c, Ly = d * src[o + 9] + e * src[o + 10] + f;
  const na = acc[0];
  if (na === 0) {
    acc.set([nb, bx, by, bxx, bxy, byy, bw, Fx, Fy, Lx, Ly]);
    return;
  }
  const n = na + nb;
  const ax = acc[1], ay = acc[2];
  const dx = bx - ax, dy = by - ay;
  const mx = ax + (dx * nb) / n, my = ay + (dy * nb) / n;
  const w = (na * nb) / n;
  // about the new mean μ: Σ (u − μ) × (v − μ) = Σ (u − μ_run) × (v − μ_run) + (μ_run − μ) × (last − first), for each run
  acc[6] +=
    cross(ax - mx, ay - my, acc[9] - acc[7], acc[10] - acc[8]) +
    bw +
    cross(bx - mx, by - my, Lx - Fx, Ly - Fy) +
    cross(acc[9] - mx, acc[10] - my, Fx - mx, Fy - my);
  acc[0] = n;
  acc[1] = mx;
  acc[2] = my;
  acc[3] += bxx + dx * dx * w;
  acc[4] += bxy + dx * dy * w;
  acc[5] += byy + dy * dy * w;
  acc[9] = Lx;
  acc[10] = Ly;
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

/**
 * A born circuit's tile loop, as `tileLoop(cs.shape(c, 0), samples)` gives
 * it, from the circuit's sums and its sampled tiles alone.
 */
export function circuitLoop(cs: CircuitShapes, c: BornCircuit, samples: number): TileLoop {
  const s = cs.circuitSums(c);
  const L = s[0];
  const rg = Math.sqrt((s[3] + s[5]) / L);
  const n = Math.min(L, samples);
  const at = Array.from({ length: n }, (_, j) => {
    const i = Math.round((j * L) / n) % L;
    return s[6] < 0 ? L - 1 - i : i;
  });
  const order = at.map((_, j) => j).sort((x, y) => at[x] - at[y]);
  const mids = cs.midpointsAt(c, order.map((j) => at[j]));
  const xy = new Float64Array(2 * n);
  order.forEach((j, q) => {
    xy[2 * j] = mids[2 * q];
    xy[2 * j + 1] = mids[2 * q + 1];
  });
  return { xy, n, rg };
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
    const loop = circuitLoop(cs, c, samples);
    const family = familyOf(c);
    const twin = out.find((o) => o.length === c.length && Math.abs(o.loop.rg - loop.rg) <= 1e-6 * loop.rg);
    if (twin) {
      if (twin.family !== family && !twin.aliases.includes(family)) twin.aliases.push(family);
    } else out.push({ family, aliases: [], level: c.level, type: c.type, length: c.length, circuit: c, loop });
  }
  const rank = (f: string) => -(top.get(f) ?? 0);
  return out.sort((a, b) => rank(a.family) - rank(b.family) || a.family.localeCompare(b.family) || a.level - b.level || b.length - a.length);
}
