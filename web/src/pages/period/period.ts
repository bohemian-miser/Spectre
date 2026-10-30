/**
 * A combination's supertiles read from outside, level by level, and the
 * level at which that reading starts to repeat.
 *
 * A type's border at a level is its crossings in order round the supertile,
 * edge by edge, and which crossing a strand entering at each one leaves by.
 * The borders of every type at level n + 1 are made from the borders at
 * level n by one rule, `step`, built from the substitution alone: the child
 * type in each slot (`childType`), the pairs of child edges glued inside the
 * parent (`gluedPairs`), and the child edges each parent edge is made of
 * (`edgeParts`). None of these depends on the level, so once the borders of
 * level n + p equal those of level n, every level from n on repeats with
 * period p, and so does everything a level's borders decide: which circuits
 * close in each type at the next level, and which routes it has.
 *
 * Positions are border positions: crossing i of a type is the i-th crossing
 * met going round its edges 0 to 5 in turn. A child edge meets the parent's
 * border reversed (each level is mirrored), and two glued child edges meet
 * crossing for crossing in reverse order.
 */
import { HEX_TYPES, childType, edgeParts, gluedPairs, leafOrder, slotsOfType, type HexType } from '../../core';
import { ruleOptions } from '../shapes/circuitShapes';

/** A type's border at one level. */
export interface Border {
  /** Crossings on each of the six edges. */
  readonly perEdge: readonly number[];
  /** By position: the position a strand entering there leaves by. */
  readonly mate: Int32Array;
  /** By position: chords (tile passes) on the way to the mate. */
  readonly chords: Float64Array;
}

export type State = Readonly<Record<HexType, Border>>;

/** A crossing of a child: the slot it sits in and its border position there. */
export interface Child {
  readonly slot: number;
  readonly pos: number;
}

/** How a parent's border is made from its children's. */
export interface Composition {
  readonly parent: HexType;
  readonly kids: readonly { readonly slot: number; readonly type: HexType }[];
  /** By parent position: the child crossing it is. */
  readonly border: readonly Child[];
  /** Child crossings welded in pairs inside the parent. */
  readonly welds: readonly (readonly [Child, Child])[];
  /** Per route (from its lower position): the child crossings the strand enters, in order. */
  readonly routes: readonly { readonly from: number; readonly to: number; readonly enters: readonly Child[] }[];
  /** Closed walks inside the parent: the child crossings each enters. */
  readonly circuits: readonly (readonly Child[])[];
}

const offsets = (perEdge: readonly number[]): number[] => {
  const out = [0];
  for (const m of perEdge) out.push(out[out.length - 1] + m);
  return out;
};

/** Level 0: each tile type's crossings, one per edge of a selected class, joined by the combination's pairing. */
export function baseState(subset: readonly number[], digits: readonly number[]): State {
  const options = ruleOptions('hex', subset);
  const out = {} as Record<HexType, Border>;
  leafOrder('hex').forEach((t, ti) => {
    const edges = slotsOfType('hex', t, subset).map((s) => s.edge);
    const mate = new Int32Array(edges.length).fill(-1);
    for (const [a, b] of options[ti][digits[ti]] ?? []) {
      mate[a] = b;
      mate[b] = a;
    }
    if (mate.some((m) => m < 0)) throw new Error(`${t}: the pairing leaves a crossing unjoined`);
    out[t as HexType] = { perEdge: Array.from({ length: 6 }, (_, j) => (edges.includes(j) ? 1 : 0)), mate, chords: new Float64Array(edges.length).fill(1) };
  });
  return out;
}

/** The parent's border made from its children's borders at the level below. */
export function compose(prev: State, parent: HexType): Composition {
  const kids: { slot: number; type: HexType }[] = [];
  for (let s = 0; s < 8; s++) {
    const t = childType(parent, s);
    if (t) kids.push({ slot: s, type: t });
  }
  const typeAt = new Map(kids.map((k) => [k.slot, k.type]));
  const off = new Map(kids.map((k) => [k.slot, offsets(prev[k.type].perEdge)]));
  const key = (c: Child): number => c.slot * 65536 + c.pos;
  const edgeOf = (slot: number, e: number): Child[] => {
    const o = off.get(slot)!;
    return Array.from({ length: o[e + 1] - o[e] }, (_, i) => ({ slot, pos: o[e] + i }));
  };
  const across = new Map<number, Child>();
  const welds: [Child, Child][] = [];
  for (const [a, b] of gluedPairs(parent)) {
    const A = edgeOf(a.s, a.e), B = edgeOf(b.s, b.e);
    if (A.length !== B.length) throw new Error(`${parent} glues ${A.length} crossings to ${B.length}`);
    for (let i = 0; i < A.length; i++) {
      const x = A[i], y = B[A.length - 1 - i];
      across.set(key(x), y);
      across.set(key(y), x);
      welds.push([x, y]);
    }
  }
  const border: Child[] = [];
  const perEdge: number[] = [];
  for (let j = 0; j < 6; j++) {
    let m = 0;
    for (const part of edgeParts(parent, j)) {
      const run = edgeOf(part.s, part.e);
      for (let i = run.length - 1; i >= 0; i--) border.push(run[i]);
      m += run.length;
    }
    perEdge.push(m);
  }
  let crossings = 0;
  for (const k of kids) crossings += prev[k.type].mate.length;
  if (border.length + 2 * welds.length !== crossings) throw new Error(`${parent}: the border and the welds miss child crossings`);
  const posOf = new Map(border.map((c, i) => [key(c), i]));
  const mateIn = (c: Child): Child => ({ slot: c.slot, pos: prev[typeAt.get(c.slot)!].mate[c.pos] });
  const chordsIn = (c: Child): number => prev[typeAt.get(c.slot)!].chords[c.pos];

  const mate = new Int32Array(border.length).fill(-1);
  const chords = new Float64Array(border.length);
  const routes: Composition['routes'][number][] = [];
  const seen = new Set<number>();
  for (let p = 0; p < border.length; p++) {
    if (mate[p] >= 0) continue;
    const enters: Child[] = [];
    let c = border[p];
    let n = 0;
    for (;;) {
      seen.add(key(c));
      enters.push(c);
      const out = mateIn(c);
      seen.add(key(out));
      n += chordsIn(c);
      const q = posOf.get(key(out));
      if (q !== undefined) {
        mate[p] = q;
        mate[q] = p;
        chords[p] = chords[q] = n;
        routes.push({ from: p, to: q, enters });
        break;
      }
      c = across.get(key(out))!;
    }
  }
  const circuits: Child[][] = [];
  for (const [x] of welds) {
    if (seen.has(key(x))) continue;
    const walk: Child[] = [];
    let c = x;
    do {
      seen.add(key(c));
      walk.push(c);
      const out = mateIn(c);
      seen.add(key(out));
      c = across.get(key(out))!;
    } while (key(c) !== key(x));
    circuits.push(walk);
  }
  return { parent, kids, border, welds, routes, circuits };
}

export interface Stepped {
  readonly state: State;
  /** Circuits closing in each type at the new level. */
  readonly circuits: Readonly<Record<HexType, number>>;
}

/** Every type's border one level up, and the circuits that close there. */
export function step(prev: State): Stepped {
  const state = {} as Record<HexType, Border>;
  const circuits = {} as Record<HexType, number>;
  for (const t of HEX_TYPES) {
    const c = compose(prev, t);
    const mate = new Int32Array(c.border.length);
    const chords = new Float64Array(c.border.length);
    for (const r of c.routes) {
      mate[r.from] = r.to;
      mate[r.to] = r.from;
      const n = r.enters.reduce((a, x) => a + prev[c.kids.find((k) => k.slot === x.slot)!.type].chords[x.pos], 0);
      chords[r.from] = chords[r.to] = n;
    }
    const perEdge = Array.from({ length: 6 }, (_, j) => edgeParts(t, j).reduce((a, part) => {
      const kt = c.kids.find((k) => k.slot === part.s)!.type;
      return a + prev[kt].perEdge[part.e];
    }, 0));
    state[t] = { perEdge, mate, chords };
    circuits[t] = c.circuits.length;
  }
  return { state, circuits };
}

/** Same crossings on every edge, joined the same way (chords aside: they grow with the level). */
export function sameBorder(a: Border, b: Border): boolean {
  if (a.mate.length !== b.mate.length) return false;
  for (let j = 0; j < 6; j++) if (a.perEdge[j] !== b.perEdge[j]) return false;
  for (let i = 0; i < a.mate.length; i++) if (a.mate[i] !== b.mate[i]) return false;
  return true;
}

export const sameState = (a: State, b: State): boolean => HEX_TYPES.every((t) => sameBorder(a[t], b[t]));

export interface Run {
  /** states[n]: every type's border at level n. */
  readonly states: readonly State[];
  /** circuits[n]: circuits closing in each type at level n (level 0: none). */
  readonly circuits: readonly Readonly<Record<HexType, number>>[];
  /** The first level whose borders come back, and after how many levels; null if none did by the last level built. */
  readonly period: { readonly start: number; readonly length: number } | null;
}

/** The period as soon as it shows: the lowest n and p with level n + p's borders equal to level n's. */
export function findPeriod(states: readonly State[]): Run['period'] {
  for (let top = 1; top < states.length; top++) {
    for (let start = 0; start < top; start++) if (sameState(states[start], states[top])) return { start, length: top - start };
  }
  return null;
}

/** The levels up to `upTo`, or fewer once a level's borders pass `maxCrossings` crossings in all. */
export function run(subset: readonly number[], digits: readonly number[], upTo: number, maxCrossings = 200000): Run {
  const states: State[] = [baseState(subset, digits)];
  const circuits: Record<HexType, number>[] = [Object.fromEntries(HEX_TYPES.map((t) => [t, 0])) as Record<HexType, number>];
  const size = (s: State): number => HEX_TYPES.reduce((a, t) => a + s[t].mate.length, 0);
  while (states.length <= upTo && size(states[states.length - 1]) <= maxCrossings) {
    const next = step(states[states.length - 1]);
    states.push(next.state);
    circuits.push(next.circuits);
  }
  return { states, circuits, period: findPeriod(states) };
}

/** Leaf tiles in a level-n supertile of each type. */
export function tileCounts(n: number): Record<HexType, number>[] {
  const out: Record<HexType, number>[] = [Object.fromEntries(HEX_TYPES.map((t) => [t, 1])) as Record<HexType, number>];
  for (let k = 1; k <= n; k++) {
    const prev = out[k - 1];
    out.push(Object.fromEntries(HEX_TYPES.map((t) => {
      let s = 0;
      for (let slot = 0; slot < 8; slot++) {
        const c = childType(t, slot);
        if (c) s += prev[c];
      }
      return [t, s];
    })) as Record<HexType, number>);
  }
  return out;
}

/** A supertile `depth` levels up, as its level-n pieces: each piece's slot path and type, the welds between pieces, and the parent's border on them. */
export interface Expansion {
  readonly pieces: readonly { readonly path: readonly number[]; readonly type: HexType }[];
  /** By parent position: the piece crossing it is. */
  readonly border: readonly { readonly piece: number; readonly pos: number }[];
  readonly welds: readonly (readonly [{ readonly piece: number; readonly pos: number }, { readonly piece: number; readonly pos: number }])[];
}

/** A level-`level` supertile of `type` taken down `depth` levels, from the borders of each level (`states`). */
export function expand(states: readonly State[], level: number, type: HexType, depth: number): Expansion {
  if (depth === 0) {
    return { pieces: [{ path: [], type }], border: Array.from(states[level][type].mate, (_, pos) => ({ piece: 0, pos })), welds: [] };
  }
  const c = compose(states[level - 1], type);
  const pieces: { path: number[]; type: HexType }[] = [];
  const welds: [{ piece: number; pos: number }, { piece: number; pos: number }][] = [];
  const subBorder = new Map<number, readonly { piece: number; pos: number }[]>();
  for (const k of c.kids) {
    const sub = expand(states, level - 1, k.type, depth - 1);
    const base = pieces.length;
    for (const p of sub.pieces) pieces.push({ path: [k.slot, ...p.path], type: p.type });
    for (const [x, y] of sub.welds) welds.push([{ piece: x.piece + base, pos: x.pos }, { piece: y.piece + base, pos: y.pos }]);
    subBorder.set(k.slot, sub.border.map((b) => ({ piece: b.piece + base, pos: b.pos })));
  }
  const at = (x: Child) => subBorder.get(x.slot)![x.pos];
  for (const [x, y] of c.welds) welds.push([at(x), at(y)]);
  return { pieces, border: c.border.map(at), welds };
}

/** An expansion's strands walked piece by piece: the routes between parent positions, each as the piece crossings it enters, and the closed walks. */
export function walkExpansion(x: Expansion, pieceBorder: (piece: number) => Border): {
  routes: { from: number; to: number; enters: { piece: number; pos: number }[] }[];
  circuits: { piece: number; pos: number }[][];
} {
  const key = (c: { piece: number; pos: number }): number => c.piece * 65536 + c.pos;
  const across = new Map<number, { piece: number; pos: number }>();
  for (const [a, b] of x.welds) {
    across.set(key(a), b);
    across.set(key(b), a);
  }
  const posOf = new Map(x.border.map((c, i) => [key(c), i]));
  const done = new Set<number>();
  const seen = new Set<number>();
  const routes: { from: number; to: number; enters: { piece: number; pos: number }[] }[] = [];
  for (let p = 0; p < x.border.length; p++) {
    if (done.has(p)) continue;
    const enters: { piece: number; pos: number }[] = [];
    let c = x.border[p];
    for (;;) {
      seen.add(key(c));
      enters.push(c);
      const out = { piece: c.piece, pos: pieceBorder(c.piece).mate[c.pos] };
      seen.add(key(out));
      const q = posOf.get(key(out));
      if (q !== undefined) {
        done.add(p).add(q);
        routes.push({ from: p, to: q, enters });
        break;
      }
      c = across.get(key(out))!;
    }
  }
  const circuits: { piece: number; pos: number }[][] = [];
  for (const [a] of x.welds) {
    if (seen.has(key(a))) continue;
    const walk: { piece: number; pos: number }[] = [];
    let c = a;
    do {
      seen.add(key(c));
      walk.push(c);
      const out = { piece: c.piece, pos: pieceBorder(c.piece).mate[c.pos] };
      seen.add(key(out));
      c = across.get(key(out))!;
    } while (key(c) !== key(a));
    circuits.push(walk);
  }
  return { routes, circuits };
}

/**
 * The edges of a supertile in a chain that still lie on the border of the
 * supertile `k` levels up, when each sits in the next at the given slots in
 * turn (repeating): an edge of a child stays on the border only through the
 * parent edges made of it. Empty once the first is buried.
 */
export function onBorder(type: HexType, slots: readonly number[], k: number): number[] {
  let edges = [0, 1, 2, 3, 4, 5];
  for (let i = 0; i < k; i++) {
    const s = slots[i % slots.length];
    edges = [0, 1, 2, 3, 4, 5].filter((j) => edgeParts(type, j).some((p) => p.s === s && edges.includes(p.e)));
  }
  return edges;
}

/**
 * Levels until every supertile of the chain is buried in a later one,
 * whichever slot of the repeating word it starts at, or null if one never
 * is. After each pass through the word the edges still on the border are
 * one of 64 sets, a function of the set before, so 64 passes settle it.
 */
export function burialDepth(type: HexType, slots: readonly number[]): number | null {
  let worst = 0;
  for (let r = 0; r < slots.length; r++) {
    const word = [...slots.slice(r), ...slots.slice(0, r)];
    let k = 1;
    while (k <= slots.length * 64 && onBorder(type, word, k).length > 0) k++;
    if (k > slots.length * 64) return null;
    worst = Math.max(worst, k);
  }
  return worst;
}
