/**
 * Directed flow on the hexagon edge classes, and the integer lattice of
 * circuits it gives.
 *
 * The mod-2 rule ("every tile meets an even number of selected edges") is the
 * null space of the types x classes incidence matrix over GF(2). Give every
 * edge a direction instead (+ = flow leaves the tile, - = flow enters) and the
 * rule becomes "flow in = flow out" for every tile type: the null space of a
 * signed matrix over the integers. Its solutions form a lattice; the circuits
 * with at most m lines per edge are its points with every |x| <= m.
 *
 * Two ways to choose the unknowns:
 *   'labels' — one per class, signed by the label's own `-` (every glued pair
 *              in the hexagon tables is `+k` against `-k`, except class 0).
 *   'groups' — one per set of edges that actually meet each other. A class
 *              like 3 splits into groups that never touch, and labels mode
 *              ties their flows together by convention; groups mode doesn't.
 *
 * A class or group is dropped when its edges can't be oriented: the Psi's
 * class-0 edge meets another Psi's class-0 edge, so its flow would have to
 * equal its own negative.
 */

import { HEX_LEAF_ORDER, HEX_PTS, edgeLabels, type TileTypeId } from './families';
import { parseEdgeLabel } from './edges';
import { transPt, type Pt } from './geom';
import { buildSystem, flatten, levelMirror, type TileInstance } from './tiles';

export type FlowMode = 'labels' | 'groups';

export interface FlowSlot {
  readonly type: TileTypeId;
  readonly edge: number;
  /** +1: positive flow leaves the tile through this edge. */
  readonly sign: 1 | -1;
}

export interface FlowVar {
  /** Display name: the class ('3'), or class + group letter ('3a'). */
  readonly label: string;
  readonly major: number;
  readonly slots: readonly FlowSlot[];
}

export interface FlowModel {
  readonly mode: FlowMode;
  readonly types: readonly TileTypeId[];
  readonly vars: readonly FlowVar[];
  /** Classes or groups left out because they can't carry a direction. */
  readonly dropped: readonly string[];
  /** types x vars: net outward edges of each variable on each tile type. */
  readonly matrix: readonly (readonly number[])[];
  /** Integer basis of the circuits, shortest vectors first. */
  readonly basis: readonly (readonly number[])[];
}

const slotKey = (type: string, edge: number) => `${type}#${edge}`;

function labelSign(type: TileTypeId, edge: number): { major: number; sign: 1 | -1 } {
  const l = parseEdgeLabel(edgeLabels('hex', type)[edge]);
  return { major: l.major, sign: l.sign };
}

let meetingCache: readonly (readonly [string, string])[] | null = null;

/**
 * Every pair of (type, edge) slots that meet somewhere in a big Delta patch.
 * Level 3 already shows all 51; a patch's boundary edges just don't count.
 */
export function hexMeetings(): readonly (readonly [string, string])[] {
  if (meetingCache) return meetingCache;
  const byEdge = new Map<string, string[]>();
  const key = (p: Pt) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
  for (const inst of flatten(buildSystem('hex', 3)['Delta'])) {
    const w = HEX_PTS.map((p) => transPt(inst.xform, p));
    for (let e = 0; e < 6; e++) {
      const a = key(w[e]);
      const b = key(w[(e + 1) % 6]);
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const list = byEdge.get(k) ?? [];
      list.push(slotKey(inst.type, e));
      byEdge.set(k, list);
    }
  }
  const seen = new Set<string>();
  const out: [string, string][] = [];
  for (const list of byEdge.values()) {
    if (list.length !== 2) continue;
    const [a, b] = [...list].sort();
    if (seen.has(`${a} ${b}`)) continue;
    seen.add(`${a} ${b}`);
    out.push([a, b]);
  }
  meetingCache = out;
  return out;
}

function allSlots(): { type: TileTypeId; edge: number }[] {
  return HEX_LEAF_ORDER.flatMap((type) => [0, 1, 2, 3, 4, 5].map((edge) => ({ type, edge })));
}

/** Groups of slots: the classes themselves, or the meeting graph's components. */
function slotGroups(mode: FlowMode): { major: number; keys: string[] }[] {
  const slots = allSlots();
  if (mode === 'labels') {
    const byMajor = new Map<number, string[]>();
    for (const s of slots) {
      const { major } = labelSign(s.type, s.edge);
      byMajor.set(major, [...(byMajor.get(major) ?? []), slotKey(s.type, s.edge)]);
    }
    return [...byMajor].sort((a, b) => a[0] - b[0]).map(([major, keys]) => ({ major, keys }));
  }
  const parent = new Map(slots.map((s) => [slotKey(s.type, s.edge), slotKey(s.type, s.edge)]));
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  for (const [a, b] of hexMeetings()) parent.set(find(a), find(b));
  const comps = new Map<string, string[]>();
  for (const s of slots) {
    const k = slotKey(s.type, s.edge);
    comps.set(find(k), [...(comps.get(find(k)) ?? []), k]);
  }
  const met = new Set(hexMeetings().flat());
  return [...comps.values()]
    .filter((keys) => keys.some((k) => met.has(k)))
    .map((keys) => {
      const [type, edge] = keys[0].split('#');
      return { major: labelSign(type as TileTypeId, Number(edge)).major, keys };
    })
    .sort((a, b) => a.major - b.major || a.keys[0].localeCompare(b.keys[0]));
}

/**
 * Orient a group so glued slots disagree. Labels mode trusts the label signs;
 * groups mode 2-colours the meeting graph, starting from the first slot's label
 * sign so the two modes agree wherever they can. Null when it can't be done.
 */
function orient(mode: FlowMode, keys: readonly string[]): Map<string, 1 | -1> | null {
  const inGroup = new Set(keys);
  const sign = new Map<string, 1 | -1>();
  const parse = (k: string) => {
    const [type, edge] = k.split('#');
    return labelSign(type as TileTypeId, Number(edge)).sign;
  };
  if (mode === 'labels') for (const k of keys) sign.set(k, parse(k));
  else {
    const nb = new Map<string, string[]>();
    for (const [a, b] of hexMeetings()) {
      if (!inGroup.has(a)) continue;
      nb.set(a, [...(nb.get(a) ?? []), b]);
      nb.set(b, [...(nb.get(b) ?? []), a]);
    }
    sign.set(keys[0], parse(keys[0]));
    const queue = [keys[0]];
    while (queue.length) {
      const a = queue.pop()!;
      for (const b of nb.get(a) ?? []) {
        if (sign.has(b)) continue;
        sign.set(b, sign.get(a) === 1 ? -1 : 1);
        queue.push(b);
      }
    }
  }
  for (const [a, b] of hexMeetings()) {
    if (inGroup.has(a) && sign.get(a) === sign.get(b)) return null;
  }
  return sign;
}

const modelCache = new Map<FlowMode, FlowModel>();

export function flowModel(mode: FlowMode): FlowModel {
  const hit = modelCache.get(mode);
  if (hit) return hit;
  const groups = slotGroups(mode);
  const perMajor = new Map<number, number>();
  for (const g of groups) perMajor.set(g.major, (perMajor.get(g.major) ?? 0) + 1);
  const seenMajor = new Map<number, number>();
  const vars: FlowVar[] = [];
  const dropped: string[] = [];
  for (const g of groups) {
    const n = seenMajor.get(g.major) ?? 0;
    seenMajor.set(g.major, n + 1);
    const label = perMajor.get(g.major)! > 1 ? `${g.major}${String.fromCharCode(97 + n)}` : String(g.major);
    const sign = orient(mode, g.keys);
    if (!sign) {
      dropped.push(label);
      continue;
    }
    const slots = g.keys.map((k) => {
      const [type, edge] = k.split('#');
      return { type: type as TileTypeId, edge: Number(edge), sign: sign.get(k)! };
    });
    vars.push({ label, major: g.major, slots });
  }
  const types = HEX_LEAF_ORDER;
  const matrix = types.map((t) =>
    vars.map((v) => v.slots.reduce((acc, s) => acc + (s.type === t ? s.sign : 0), 0)),
  );
  const model: FlowModel = { mode, types, vars, dropped, matrix, basis: integerKernel(matrix, vars.length) };
  modelCache.set(mode, model);
  return model;
}

/**
 * Integer basis of { x : A x = 0 } by unimodular column operations (A U = [H | 0],
 * so U's trailing columns span the kernel), then greedy pairwise shortening so
 * the vectors read as small loops.
 */
export function integerKernel(A: readonly (readonly number[])[], n: number): number[][] {
  const M = A.map((r) => [...r]);
  const U: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const colSub = (j: number, k: number, q: number) => {
    for (const r of M) r[j] -= q * r[k];
    for (const r of U) r[j] -= q * r[k];
  };
  const swap = (j: number, k: number) => {
    for (const r of M) [r[j], r[k]] = [r[k], r[j]];
    for (const r of U) [r[j], r[k]] = [r[k], r[j]];
  };
  let piv = 0;
  for (const row of M) {
    if (piv >= n) break;
    for (;;) {
      const nz: number[] = [];
      for (let j = piv; j < n; j++) if (row[j] !== 0) nz.push(j);
      if (nz.length === 0) break;
      swap(piv, nz.reduce((a, b) => (Math.abs(row[b]) < Math.abs(row[a]) ? b : a)));
      for (let j = piv + 1; j < n; j++) if (row[j] !== 0) colSub(j, piv, Math.trunc(row[j] / row[piv]));
      let clear = true;
      for (let j = piv + 1; j < n; j++) if (row[j] !== 0) clear = false;
      if (clear) {
        piv++;
        break;
      }
    }
  }
  const basis: number[][] = [];
  for (let j = piv; j < n; j++) basis.push(U.map((r) => r[j]));
  const norm = (v: readonly number[]) => v.reduce((a, x) => a + x * x, 0);
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < basis.length; i++) {
      for (let j = 0; j < basis.length; j++) {
        if (i === j) continue;
        for (const s of [1, -1]) {
          const c = basis[i].map((x, k) => x - s * basis[j][k]);
          if (norm(c) < norm(basis[i])) {
            basis[i] = c;
            changed = true;
          }
        }
      }
    }
  }
  // Lead with a positive entry, then shortest first, for a stable order.
  for (const b of basis) {
    const first = b.find((x) => x !== 0) ?? 0;
    if (first < 0) for (let k = 0; k < b.length; k++) b[k] = -b[k];
  }
  const support = (v: readonly number[]) => v.filter((x) => x !== 0).length;
  return basis.sort((a, b) => support(a) - support(b) || norm(a) - norm(b) || b.join().localeCompare(a.join()));
}

export function combine(basis: readonly (readonly number[])[], coeffs: readonly number[], n: number): number[] {
  const x = new Array<number>(n).fill(0);
  basis.forEach((b, i) => b.forEach((v, k) => (x[k] += (coeffs[i] ?? 0) * v)));
  return x;
}

/** Most lines any one edge needs: the box |x| <= m a circuit sits in. */
export function linesNeeded(x: readonly number[]): number {
  return x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
}

/** Which unknown a tile's edge carries, and its sign there; null for a dropped edge. */
export function edgeVar(model: FlowModel, type: TileTypeId, edge: number): { index: number; sign: 1 | -1 } | null {
  for (let index = 0; index < model.vars.length; index++) {
    const slot = model.vars[index].slots.find((s) => s.type === type && s.edge === edge);
    if (slot) return { index, sign: slot.sign };
  }
  return null;
}

/** Per tile type, flow out minus flow in: all zero exactly when x is a circuit. */
export function netFlow(model: FlowModel, x: readonly number[]): number[] {
  return model.matrix.map((row) => row.reduce((a, v, k) => a + v * (x[k] ?? 0), 0));
}

export function isCircuit(model: FlowModel, x: readonly number[]): boolean {
  return netFlow(model, x).every((v) => v === 0);
}

/**
 * The two basis vectors that share the most edges, so their slice of the
 * lattice shows lines adding up and cancelling. Falls back to the first two.
 */
export function defaultAxes(model: FlowModel): [number, number] {
  let best: [number, number] = [0, Math.min(1, model.basis.length - 1)];
  let bestShared = -1;
  model.basis.forEach((a, i) =>
    model.basis.forEach((b, j) => {
      if (j <= i) return;
      const shared = a.filter((v, k) => v !== 0 && b[k] !== 0).length;
      if (shared > bestShared) {
        bestShared = shared;
        best = [i, j];
      }
    }),
  );
  return best;
}

/** `{3: +1, 5: −2}` style text for a flow vector. */
export function describeFlow(model: FlowModel, x: readonly number[]): string {
  const parts = x.flatMap((v, k) => (v === 0 ? [] : [`${model.vars[k].label}: ${v > 0 ? '+' : '−'}${Math.abs(v)}`]));
  return parts.length ? parts.join(', ') : 'empty';
}

// ---------------------------------------------------------------------------
// Drawing a circuit on a patch
// ---------------------------------------------------------------------------

export interface StrandPoint {
  readonly edge: number;
  readonly pos: Pt;
  /** 'out' when flow leaves the tile here. */
  readonly dir: 'in' | 'out';
}

/** One chord inside a tile, entering at `from` and leaving at `to`. */
export interface Strand {
  readonly from: StrandPoint;
  readonly to: StrandPoint;
}

/**
 * Where a tile's strands cross its edges, in boundary order: |flow| points
 * spaced evenly along each edge. Even spacing is symmetric, so a neighbour
 * walking the shared edge the other way puts its points in the same places.
 */
export function tileStrandPoints(model: FlowModel, type: TileTypeId, x: readonly number[], pts: readonly Pt[]): StrandPoint[] {
  const out: StrandPoint[] = [];
  for (let edge = 0; edge < pts.length; edge++) {
    let flow = 0;
    model.vars.forEach((v, k) => {
      for (const s of v.slots) if (s.type === type && s.edge === edge) flow += s.sign * x[k];
    });
    const n = Math.abs(flow);
    const a = pts[edge];
    const b = pts[(edge + 1) % pts.length];
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      out.push({ edge, pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: flow > 0 ? 'out' : 'in' });
    }
  }
  return out;
}

/**
 * Pair every entry with an exit without chords crossing: walk the boundary,
 * and whenever a point faces the opposite way to the one on top of the stack,
 * join them. Balanced flow empties the stack; null if it doesn't balance.
 */
export function pairStrands(points: readonly StrandPoint[]): Strand[] | null {
  const stack: StrandPoint[] = [];
  const out: Strand[] = [];
  for (const p of points) {
    const top = stack[stack.length - 1];
    if (top && top.dir !== p.dir) {
      stack.pop();
      out.push(p.dir === 'out' ? { from: top, to: p } : { from: p, to: top });
    } else stack.push(p);
  }
  return stack.length === 0 ? out : null;
}

/** One way to join a tile's strand ends: [entry index, exit index] pairs into its point list. */
export type DirectedMatching = readonly (readonly [number, number])[];

/**
 * Every way to join a tile's entries to its exits with chords that don't cross,
 * in a fixed order (so index k means the same pairing on every tile of a type).
 * The first point joins some later point of the other direction with a balanced
 * stretch between them, which must pair up among itself; the rest pairs after.
 * Empty when the tile doesn't balance; `[[]]` when nothing crosses it.
 */
export function directedMatchings(points: readonly StrandPoint[], limit = 500): { matchings: DirectedMatching[]; truncated: boolean } {
  function* gen(idx: readonly number[]): Generator<[number, number][]> {
    if (idx.length === 0) {
      yield [];
      return;
    }
    const [first, ...rest] = idx;
    let bal = 0;
    for (let j = 0; j < rest.length; j++) {
      const p = rest[j];
      if (bal === 0 && points[p].dir !== points[first].dir) {
        const pair: [number, number] = points[first].dir === 'in' ? [first, p] : [p, first];
        for (const inner of gen(rest.slice(0, j))) {
          for (const outer of gen(rest.slice(j + 1))) yield [pair, ...inner, ...outer];
        }
      }
      bal += points[p].dir === 'out' ? 1 : -1;
    }
  }
  const matchings: DirectedMatching[] = [];
  for (const m of gen(points.map((_, i) => i))) {
    if (matchings.length === limit) return { matchings, truncated: true };
    matchings.push(m);
  }
  return { matchings, truncated: false };
}

export function applyMatching(points: readonly StrandPoint[], m: DirectedMatching): Strand[] {
  return m.map(([i, j]) => ({ from: points[i], to: points[j] }));
}

export interface StrandPath {
  /** Indices into the strand list, in the order the flow runs. */
  readonly strands: readonly number[];
  /** True when the path comes back to where it started. */
  readonly closed: boolean;
}

/**
 * Join strands into paths: a strand's exit sits exactly where the next tile's
 * strand enters (even spacing makes shared points coincide), so follow exit →
 * entry until the path closes or runs off the patch. Open paths are traced from
 * their first strand, the one nothing flows into.
 */
export function traceStrandPaths(strands: readonly Strand[]): StrandPath[] {
  const key = (p: Pt) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
  const byEntry = new Map<string, number>();
  strands.forEach((s, i) => byEntry.set(key(s.from.pos), i));
  const fedInto = new Set<number>();
  strands.forEach((s) => {
    const next = byEntry.get(key(s.to.pos));
    if (next !== undefined) fedInto.add(next);
  });
  const seen = new Set<number>();
  const paths: StrandPath[] = [];
  const walk = (start: number) => {
    const out: number[] = [];
    let i: number | undefined = start;
    while (i !== undefined && !seen.has(i)) {
      seen.add(i);
      out.push(i);
      i = byEntry.get(key(strands[i].to.pos));
    }
    paths.push({ strands: out, closed: i === start });
  };
  // Open paths first, from their heads, so none is entered half way along.
  strands.forEach((_, i) => {
    if (!fedInto.has(i) && !seen.has(i)) walk(i);
  });
  strands.forEach((_, i) => {
    if (!seen.has(i)) walk(i);
  });
  return paths;
}

/**
 * Shoelace area of a closed polyline. Positive means clockwise on screen, where
 * y points down (SVG), and anticlockwise in maths axes.
 */
export function signedArea(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export interface PatchTile {
  readonly inst: TileInstance;
  readonly pts: readonly Pt[];
}

/** A Delta supertile of hexagons, in the same mirrored frame the explorer uses. */
export function hexPatch(level: number): PatchTile[] {
  return flatten(buildSystem('hex', level)['Delta'], levelMirror(level)).map((inst) => ({
    inst,
    pts: HEX_PTS.map((p) => transPt(inst.xform, p)),
  }));
}
