/**
 * Deep orbit: the strands of a combination at levels far beyond any rooted
 * patch, exactly, for every family and every rule.
 *
 * A rooted patch at level 7 is already ~10^7 tiles, and some combinations have
 * not settled into a recognisable pattern by then. The classifier (classify.py)
 * also only sees levels 4 to 6. This tool goes deeper by never building the
 * patch: a level-k supertile is summarised by its *boundary state*: the
 * crossings on its outline, which pairs of them its strands join, and how long
 * each of those arcs is. The level-(k+1) state follows from the children's
 * states alone, by welding the children's outline crossings where they
 * coincide and walking arc, weld, arc, ... Whatever is left over has closed
 * into a circuit born at level k+1, and its length and the child slots it runs
 * through are recorded. The cost is the size of the boundary (×(2+√5) a
 * level), not the area (×(4+√15) a level).
 *
 * This is the routing operator of docs/FASS_THEOREM.md §3 and
 * circuit-classes/routing-orbit.ts, but computed geometrically in Z[ζ12]
 * instead of from the hexagon edge-word tables, so it runs on Tile(1,1), the
 * hexagons, the hats and the turtles, with class 0 included (its dot sits on a
 * vertex, which the edge-word model could not place). Every outline crossing
 * is an exact doubled lattice point, so welds are exact at any level.
 *
 * Usage (from web/):
 *   npx tsx circuit-classes/deep-orbit.ts <family> <maxLevel> <rule-combo> [...]
 *   npx tsx circuit-classes/deep-orbit.ts <family> <maxLevel> <rule>-all
 *   npx tsx circuit-classes/deep-orbit.ts <family> <maxLevel> <rule>-0????01100   ('?' = any digit)
 *   npx tsx circuit-classes/deep-orbit.ts --json ...   one JSON line per combination
 *   npx tsx circuit-classes/deep-orbit.ts --compare <family> <maxLevel> <rule-combo> [...]
 *
 * The default report prints, per combination and level: tiles and boundary
 * dots of the Delta supertile, circuits born (count, longest, distinct
 * lengths), the longest arc as a share of the supertile's segments, the share
 * of segments on circuits closed so far, the growth of the longest born
 * circuit and of the longest arc over two levels with the dimensions they
 * imply, and a verdict.
 *
 * --compare groups the combinations by their boundary states: two
 * combinations with the same state for every type at level n differ only
 * inside level-n supertiles, so they are the same pattern at every larger
 * scale. It prints the classes per level and, for a combination that never
 * joins the others, how far from each of them it stays (the share of boundary
 * dots joined differently) and how its births differ.
 *
 * Memory is the limit: about 60 bytes per boundary dot of the children of one
 * supertile. Level 9 of a rule with ~20 dots per level-1 supertile needs
 * ~2 GB; pass --max-old-space-size through NODE_OPTIONS for more.
 */
import {
  SUPER_RULES, leafOrder, enumerateMatchings, zBasePairXform, zSupertileTransforms,
  comboOptionCounts, comboDigitsFromIndex, comboDigitChar, comboToMatchingIndices,
  Z_IDENT, type TileFamilyId, type ZAffine, type ZVec,
} from '../src/core';
import { zConnectionPoints2 } from '../fass-proof/lib';

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

/** The boundary state of a supertile (or a leaf), in its own frame. */
export interface State {
  /** Outline crossings as doubled exact points, 4 coefficients each, in canonical (sorted) order. */
  readonly pts: Float64Array;
  /** partner[i] = the dot the arc from dot i comes out at; -1 if that arc ends in a tail inside. */
  readonly partner: Int32Array;
  /** Length in segments of the arc at dot i. */
  readonly len: Float64Array;
  readonly tiles: number;
  /** Segments (chords) inside, all strands. */
  readonly segs: number;
  /** Circuits closed inside, cumulative. */
  readonly closed: number;
  /** Segments on those circuits. */
  readonly closedSegs: number;
  /** Open strands wholly inside (both ends tails), cumulative. */
  readonly innerOpen: number;
}

export interface Birth {
  readonly type: string;
  /** Child slots the circuit passes through, e.g. '013467'. */
  readonly slots: string;
  readonly len: number;
}

const nPts = (st: State): number => st.pts.length >> 2;

/**
 * d^k conj^m applied to the coefficients (a,b,c,e) of a + b d + c d^2 + e d^3,
 * then + 2t: the image of a doubled point under a ZAffine, written out on
 * plain numbers so the hot loop allocates nothing.
 */
function apply2Into(T: ZAffine, a: number, b: number, c: number, e: number, out: Float64Array, o: number): void {
  if (T.m) {
    // conj(d^j) = d^(-j): conj(a + b d + c d^2 + e d^3) = a + b d^11 + c d^10 + e d^9
    // d^11 = d^2·d^9 ... easier: rotate each unit term by -j. Use the identities
    // d^9 = -d^3, d^10 = -d^2 + ... compute via repeated multiplication instead:
    let [p0, p1, p2, p3] = [a, 0, 0, 0];
    // + b d^11
    let q0 = b, q1 = 0, q2 = 0, q3 = 0;
    for (let i = 0; i < 11; i++) { const t0 = -q3, t1 = q0, t2 = q1 + q3, t3 = q2; q0 = t0; q1 = t1; q2 = t2; q3 = t3; }
    p0 += q0; p1 += q1; p2 += q2; p3 += q3;
    q0 = c; q1 = 0; q2 = 0; q3 = 0;
    for (let i = 0; i < 10; i++) { const t0 = -q3, t1 = q0, t2 = q1 + q3, t3 = q2; q0 = t0; q1 = t1; q2 = t2; q3 = t3; }
    p0 += q0; p1 += q1; p2 += q2; p3 += q3;
    q0 = e; q1 = 0; q2 = 0; q3 = 0;
    for (let i = 0; i < 9; i++) { const t0 = -q3, t1 = q0, t2 = q1 + q3, t3 = q2; q0 = t0; q1 = t1; q2 = t2; q3 = t3; }
    p0 += q0; p1 += q1; p2 += q2; p3 += q3;
    a = p0; b = p1; c = p2; e = p3;
  }
  const k = ((T.k % 12) + 12) % 12;
  for (let i = 0; i < k; i++) { const t0 = -e, t1 = a, t2 = b + e, t3 = c; a = t0; b = t1; c = t2; e = t3; }
  out[o] = a + 2 * T.t[0];
  out[o + 1] = b + 2 * T.t[1];
  out[o + 2] = c + 2 * T.t[2];
  out[o + 3] = e + 2 * T.t[3];
}

/**
 * A numeric hash of a doubled point for welding and for the canonical order.
 * Coefficients stay below 2^31 to level ~20; the hash mixes them into one
 * double below 2^53. Two different points with equal hashes are told apart by
 * comparing coordinates, so a collision costs time, never correctness.
 */
function hashPt(p: Float64Array, o: number): number {
  // 2^53 ≈ 9e15. Mix with odd multipliers and wrap with modulo on a double.
  const M = 9007199254740881; // a prime below 2^53
  let h = (p[o] * 1000003) % M;
  h = ((h + p[o + 1]) * 999983) % M;
  h = ((h + p[o + 2]) * 999979) % M;
  h = ((h + p[o + 3]) * 999961) % M;
  return h < 0 ? h + M : h;
}

function samePt(p: Float64Array, i: number, q: Float64Array, j: number): boolean {
  return p[i] === q[j] && p[i + 1] === q[j + 1] && p[i + 2] === q[j + 2] && p[i + 3] === q[j + 3];
}

function cmpPt(p: Float64Array, i: number, j: number): number {
  for (let t = 0; t < 4; t++) if (p[i + t] !== p[j + t]) return p[i + t] - p[j + t];
  return 0;
}

/**
 * One substitution step: the state of a patch made of `children`, each a
 * state placed by a transform. Welds coincident outline dots of different
 * children, walks the arcs through the welds, and reports the circuits that
 * close inside as births.
 */
export function compose(children: readonly { state: State; xform: ZAffine; slot: number }[], births: Birth[], type: string): State {
  const base = new Int32Array(children.length + 1);
  for (let s = 0; s < children.length; s++) base[s + 1] = base[s] + nPts(children[s].state);
  const N = base[children.length];
  const world = new Float64Array(4 * N);
  const arcP = new Int32Array(N);
  const arcLen = new Float64Array(N);
  const slotOf = new Uint8Array(N);
  const weld = new Int32Array(N).fill(-1);
  const hash = new Float64Array(N);
  const byHash = new Map<number, number>();
  let tiles = 0, segs = 0, closed = 0, closedSegs = 0, innerOpen = 0;
  for (let s = 0; s < children.length; s++) {
    const { state, xform, slot } = children[s];
    tiles += state.tiles; segs += state.segs; closed += state.closed; closedSegs += state.closedSegs; innerOpen += state.innerOpen;
    const n = nPts(state);
    for (let i = 0; i < n; i++) {
      const x = base[s] + i;
      apply2Into(xform, state.pts[4 * i], state.pts[4 * i + 1], state.pts[4 * i + 2], state.pts[4 * i + 3], world, 4 * x);
      arcP[x] = state.partner[i] < 0 ? -1 : base[s] + state.partner[i];
      arcLen[x] = state.len[i];
      slotOf[x] = slot;
      const h = hashPt(world, 4 * x);
      hash[x] = h;
      const other = byHash.get(h);
      if (other === undefined) { byHash.set(h, x); continue; }
      if (samePt(world, 4 * other, world, 4 * x)) {
        if (weld[other] !== -1) throw new Error(`${type}: three dots meet at one point (a junction); this tool only handles strands of degree 2`);
        weld[other] = x;
        weld[x] = other;
        continue;
      }
      // A genuine hash collision (vanishingly rare): scan every earlier dot with this hash.
      let found = -1;
      for (let y = 0; y < x; y++) if (hash[y] === h && samePt(world, 4 * y, world, 4 * x)) { found = y; break; }
      if (found >= 0) {
        if (weld[found] !== -1) throw new Error(`${type}: three dots meet at one point (a junction); this tool only handles strands of degree 2`);
        weld[found] = x;
        weld[x] = found;
      }
    }
  }
  // Parent outline dots: the unwelded ones, in canonical order (by coordinates).
  const outerList: number[] = [];
  for (let x = 0; x < N; x++) if (weld[x] < 0) outerList.push(x);
  const order = Int32Array.from(outerList);
  order.sort((x, y) => cmpPt(world, 4 * x, 4 * y));
  const nOuter = order.length;
  const outer = new Int32Array(N).fill(-1);
  for (let o = 0; o < nOuter; o++) outer[order[o]] = o;
  const pts = new Float64Array(4 * nOuter);
  for (let o = 0; o < nOuter; o++) for (let t = 0; t < 4; t++) pts[4 * o + t] = world[4 * order[o] + t];
  const partner = new Int32Array(nOuter).fill(-1);
  const len = new Float64Array(nOuter);
  const seen = new Uint8Array(N);
  // Arcs from each outline dot.
  for (let o = 0; o < nOuter; o++) {
    let x = order[o];
    if (seen[x]) continue;
    let l = 0;
    for (;;) {
      seen[x] = 1;
      const y = arcP[x];
      if (y < 0) { len[o] = l + arcLen[x]; break; } // the child arc ends in a tail
      l += arcLen[x];
      seen[y] = 1;
      if (outer[y] >= 0) {
        partner[o] = outer[y];
        partner[outer[y]] = o;
        len[o] = len[outer[y]] = l;
        break;
      }
      x = weld[y];
    }
  }
  // Open strands that start at a tail inside a child and end at another tail.
  for (let x0 = 0; x0 < N; x0++) {
    if (seen[x0] || arcP[x0] >= 0) continue;
    let x = x0;
    seen[x] = 1;
    for (;;) {
      const w = weld[x];
      if (w < 0) break;
      seen[w] = 1;
      const y = arcP[w];
      if (y < 0) { innerOpen++; break; }
      seen[y] = 1;
      x = y;
    }
  }
  // What is left closes into circuits.
  for (let x0 = 0; x0 < N; x0++) {
    if (seen[x0]) continue;
    let x = x0;
    let l = 0;
    let slots = 0;
    do {
      seen[x] = 1;
      slots |= 1 << slotOf[x];
      const y = arcP[x];
      l += arcLen[x];
      seen[y] = 1;
      slots |= 1 << slotOf[y];
      x = weld[y];
    } while (x !== x0);
    let label = '';
    for (let s = 0; s < 8; s++) if (slots & (1 << s)) label += s;
    births.push({ type, slots: label, len: l });
    closed++;
    closedSegs += l;
  }
  return { pts, partner, len, tiles, segs, closed, closedSegs, innerOpen };
}

function fromZ(pts: readonly ZVec[]): Float64Array {
  const out = new Float64Array(4 * pts.length);
  pts.forEach((p, i) => { out[4 * i] = p[0]; out[4 * i + 1] = p[1]; out[4 * i + 2] = p[2]; out[4 * i + 3] = p[3]; });
  return out;
}

/** The leaf states of a combination, by leaf type (plus the composite Gamma off the hexagons). */
export function leafStates(family: TileFamilyId, subset: readonly number[], combo: string): Map<string, State> {
  const idxs = comboToMatchingIndices(family, subset, combo);
  const out = new Map<string, State>();
  leafOrder(family).forEach((type, i) => {
    const raw = fromZ(zConnectionPoints2(family, type, subset));
    const n = raw.length >> 2;
    const order = Int32Array.from({ length: n }, (_, j) => j);
    order.sort((x, y) => cmpPt(raw, 4 * x, 4 * y));
    const pos = new Int32Array(n);
    for (let o = 0; o < n; o++) pos[order[o]] = o;
    const pts = new Float64Array(4 * n);
    for (let o = 0; o < n; o++) for (let t = 0; t < 4; t++) pts[4 * o + t] = raw[4 * order[o] + t];
    const partner = new Int32Array(n).fill(-1);
    const len = new Float64Array(n);
    const pairs = n >= 2 && n % 2 === 0 ? enumerateMatchings(n)[idxs[i]] ?? [] : [];
    for (const [a, b] of pairs) {
      partner[pos[a]] = pos[b];
      partner[pos[b]] = pos[a];
      len[pos[a]] = len[pos[b]] = 1;
    }
    out.set(type, { pts, partner, len, tiles: 1, segs: pairs.length, closed: 0, closedSegs: 0, innerOpen: 0 });
  });
  if (family !== 'hex') {
    // The composite Mystic: Gamma1 in place, Gamma2 on the base pair transform.
    const births: Birth[] = [];
    const g = compose([
      { state: out.get('Gamma1')!, xform: Z_IDENT, slot: 0 },
      { state: out.get('Gamma2')!, xform: zBasePairXform(family)!, slot: 1 },
    ], births, 'Gamma');
    if (births.length) throw new Error('a circuit inside the Mystic');
    out.set('Gamma', g);
  }
  return out;
}

export const TYPES: readonly string[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
const DELTA = TYPES.indexOf('Delta');

export interface TypeStats {
  tiles: number; dots: number; segs: number;
  /** Longest arc, and the segments on the five longest arcs. */
  arcMax: number; arcTop5: number;
  /** Arcs carrying at least 1% of the supertile's segments. */
  bigArcs: number;
  arcSum: number; closed: number; closedSegs: number; innerOpen: number;
}

export interface LevelRecord {
  level: number;
  /** Per type (TYPES order). */
  perType: TypeStats[];
  /** Circuits born at this level: [type, slots, length, count], longest first. */
  births: [string, string, number, number][];
  /** Two independent hashes of every type's boundary matching, for grouping combinations. */
  sig: string;
}

export interface Orbit {
  share: string;
  family: TileFamilyId;
  levels: LevelRecord[];
  /** The partner and arc-length arrays at every level, per type, when asked for. */
  history?: { partner: Int32Array; len: Float64Array }[][];
}

function sigOf(states: Map<string, State>): string {
  let h1 = 0, h2 = 0;
  const M1 = 4503599627370449, M2 = 4503599627370517; // primes below 2^52
  for (const T of TYPES) {
    const p = states.get(T)!.partner;
    for (let i = 0; i < p.length; i++) {
      h1 = (h1 * 31 + p[i] + 7) % M1;
      h2 = (h2 * 37 + p[i] + 11) % M2;
    }
    h1 = (h1 * 131 + 1) % M1;
    h2 = (h2 * 137 + 1) % M2;
  }
  return `${h1}:${h2}`;
}

function typeStats(st: State): TypeStats {
  let arcSum = 0, bigArcs = 0;
  const top = [0, 0, 0, 0, 0];
  const threshold = st.segs / 100;
  for (let i = 0; i < st.len.length; i++) {
    if (!(st.partner[i] > i || st.partner[i] < 0)) continue; // each arc once
    const l = st.len[i];
    arcSum += l;
    if (l >= threshold) bigArcs++;
    if (l > top[4]) {
      top[4] = l;
      for (let j = 4; j > 0 && top[j] > top[j - 1]; j--) { const t = top[j]; top[j] = top[j - 1]; top[j - 1] = t; }
    }
  }
  return { tiles: st.tiles, dots: nPts(st), segs: st.segs, arcMax: top[0], arcTop5: top[0] + top[1] + top[2] + top[3] + top[4], bigArcs, arcSum, closed: st.closed, closedSegs: st.closedSegs, innerOpen: st.innerOpen };
}

export function runOrbit(family: TileFamilyId, subset: readonly number[], combo: string, maxLevel: number, keepHistory = false, onLevel?: (r: LevelRecord) => void): Orbit {
  let states = leafStates(family, subset, combo);
  const levels: LevelRecord[] = [];
  const history: { partner: Int32Array; len: Float64Array }[][] = [];
  const record = (level: number, births: Birth[]): void => {
    const tally = new Map<string, number>();
    for (const b of births) {
      const k = `${b.type}|${b.slots}|${b.len}`;
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    const bl: [string, string, number, number][] = [];
    for (const [k, c] of tally) {
      const [t, s, l] = k.split('|');
      bl.push([t, s, Number(l), c]);
    }
    bl.sort((a, b) => b[2] - a[2]);
    const r: LevelRecord = { level, perType: TYPES.map((T) => typeStats(states.get(T)!)), births: bl, sig: sigOf(states) };
    levels.push(r);
    if (keepHistory) history.push(TYPES.map((T) => ({ partner: states.get(T)!.partner, len: states.get(T)!.len })));
    onLevel?.(r);
  };
  record(0, []);
  for (let k = 1; k <= maxLevel; k++) {
    const Ts = zSupertileTransforms(family, k);
    const births: Birth[] = [];
    const next = new Map<string, State>();
    for (const T of TYPES) {
      const subs = SUPER_RULES[T];
      const children: { state: State; xform: ZAffine; slot: number }[] = [];
      for (let s = 0; s < 8; s++) {
        if (subs[s] === 'null') continue;
        children.push({ state: states.get(subs[s])!, xform: Ts[s], slot: s });
      }
      next.set(T, compose(children, births, T));
    }
    states = next;
    record(k, births);
  }
  return { share: `${subset.join('')}-${combo}`, family, levels, history: keepHistory ? history : undefined };
}

// ---------------------------------------------------------------------------
// Reading an orbit
// ---------------------------------------------------------------------------

export interface Verdict {
  /** bounded | fractal | blob | line | mixed | open | unclear */
  kind: string;
  /** Growth of the longest circuit born over two levels, and the dimension it implies. */
  growth: number | null;
  dimension: number | null;
  /** Growth of the Delta supertile's longest arc over two levels, and its dimension. */
  arcGrowth: number | null;
  arcDimension: number | null;
  /** Levels at which circuits were born. */
  birthLevels: number[];
  /** Share of the Delta supertile's segments on its longest arc, last level. */
  lineShare: number;
  /** Share of segments on closed circuits, last level, and its change per level at the end. */
  closedShare: number;
  closedShareTrend: number;
  notes: string[];
}

export function readOrbit(o: Orbit): Verdict {
  const L = o.levels;
  const n = L.length - 1;
  const last = L[n];
  const notes: string[] = [];
  const maxBorn = L.map((r) => (r.births.length ? r.births[0][2] : 0));
  const birthLevels = L.filter((r) => r.births.length > 0).map((r) => r.level);
  const lastBirth = birthLevels.length ? birthLevels[birthLevels.length - 1] : -1;
  const d = last.perType[DELTA];
  const lineShare = d.segs ? d.arcMax / d.segs : 0;
  const closedShare = d.segs ? d.closedSegs / d.segs : 0;
  const prevShare = n >= 1 ? (L[n - 1].perType[DELTA].segs ? L[n - 1].perType[DELTA].closedSegs / L[n - 1].perType[DELTA].segs : 0) : 0;
  const closedShareTrend = closedShare - prevShare;
  const area2 = (k: number): number => L[k].perType[DELTA].tiles / L[k - 2].perType[DELTA].tiles;
  let growth: number | null = null, dimension: number | null = null;
  // the biggest circuit born over the last four levels, against the one two levels before it
  for (let k = n; k >= Math.max(4, n - 1); k--) {
    if (maxBorn[k] > 1 && maxBorn[k - 2] > 1 && maxBorn[k] !== maxBorn[k - 2]) {
      growth = maxBorn[k] / maxBorn[k - 2];
      dimension = (2 * Math.log(growth)) / Math.log(area2(k));
      break;
    }
  }
  let arcGrowth: number | null = null, arcDimension: number | null = null;
  if (n >= 2 && L[n - 2].perType[DELTA].arcMax > 0) {
    arcGrowth = d.arcMax / L[n - 2].perType[DELTA].arcMax;
    arcDimension = (2 * Math.log(arcGrowth)) / Math.log(area2(n));
  }
  const bigBorn = L.filter((r) => r.births.length && r.births[0][2] > 12).map((r) => r.level);
  const periodic2 = bigBorn.length >= 3 && bigBorn.slice(1).every((l, i) => l - bigBorn[i] === 2);
  const periodic1 = bigBorn.length >= 3 && bigBorn.slice(1).every((l, i) => l - bigBorn[i] === 1);
  let kind = 'unclear';
  const growingCircuits = growth !== null && growth > 1.5 && bigBorn.length >= 2 && n - bigBorn[bigBorn.length - 1] <= 2;
  const lineLike = lineShare >= 0.25 && arcDimension !== null && arcDimension >= 1.9;
  if (growingCircuits) {
    if (dimension !== null && dimension >= 1.9) kind = lineLike ? 'mixed' : 'blob';
    else kind = lineLike ? 'mixed' : 'fractal';
    if (periodic2) notes.push(`big circuits born at every other level (${bigBorn.join(',')})`);
    else if (periodic1) notes.push(`big circuits born at every level (${bigBorn.join(',')})`);
    else notes.push(`big circuits born at levels ${bigBorn.join(',')}`);
  } else if (lineLike) {
    kind = 'line';
  } else if (closedShare > 0.9 || (lastBirth >= 0 && n - lastBirth >= 3) || maxBorn.every((m) => m <= 12)) {
    // Nothing big ever closes, and either almost everything is on small loops or no circuit has been born for three levels.
    kind = closedShare > 0.5 ? 'bounded' : 'open';
    if (kind === 'open') notes.push(`${((1 - closedShare) * 100).toFixed(1)}% of segments are on arcs that have not closed by level ${n} (${d.dots / 2} arcs through the Delta supertile, longest ${d.arcMax} segments, dimension ${arcDimension === null ? '-' : arcDimension.toFixed(2)})`);
  }
  if (maxBorn.every((m) => m <= 12) && bigBorn.length === 0 && kind !== 'line') notes.push(`no circuit longer than 12 segments born up to level ${n}`);
  if (lineShare >= 0.25) notes.push(`longest arc carries ${(lineShare * 100).toFixed(1)}% of the Delta supertile's segments`);
  return { kind, growth, dimension, arcGrowth, arcDimension, birthLevels, lineShare, closedShare, closedShareTrend, notes };
}

const fmt = (x: number | null | undefined, digits = 3): string => (x === null || x === undefined || !Number.isFinite(x) ? '-' : x.toFixed(digits));

export function printLevelHeader(): void {
  console.log('level   tiles(Delta)      dots     segs       born  longest-born  distinct   arcs     arcMax  arcMax/segs  top5/segs  big-arcs  closed/segs');
}

export function printLevel(r: LevelRecord): void {
  const d = r.perType[DELTA];
  const born = r.births.reduce((a, b) => a + b[3], 0);
  const longest = r.births.length ? r.births[0][2] : 0;
  const distinct = new Set(r.births.map((b) => b[2])).size;
  console.log(
    `${String(r.level).padStart(5)}  ${String(d.tiles).padStart(13)}  ${String(d.dots).padStart(8)}  ${String(d.segs).padStart(9)}  ${String(born).padStart(7)}  ${String(longest).padStart(12)}  ${String(distinct).padStart(8)}  ${String(d.dots / 2).padStart(6)}  ${String(d.arcMax).padStart(9)}  ${fmt(d.segs ? d.arcMax / d.segs : 0).padStart(11)}  ${fmt(d.segs ? d.arcTop5 / d.segs : 0).padStart(9)}  ${String(d.bigArcs).padStart(8)}  ${fmt(d.segs ? d.closedSegs / d.segs : 0).padStart(11)}`,
  );
}

export function printVerdict(o: Orbit): void {
  const v = readOrbit(o);
  console.log(`verdict: ${v.kind}` +
    (v.growth !== null ? `; longest born circuit x${fmt(v.growth, 2)} per two levels (dimension ${fmt(v.dimension, 2)})` : '') +
    (v.arcGrowth !== null ? `; longest arc x${fmt(v.arcGrowth, 2)} per two levels (dimension ${fmt(v.arcDimension, 2)})` : ''));
  for (const nte of v.notes) console.log(`  ${nte}`);
  for (const r of o.levels.slice(-2)) {
    if (!r.births.length) continue;
    const bySlots = new Map<string, { count: number; lens: number[] }>();
    for (const [t, s, l, c] of r.births) {
      const k = `${t}:${s}`;
      const e = bySlots.get(k) ?? { count: 0, lens: [] };
      e.count += c; e.lens.push(l);
      bySlots.set(k, e);
    }
    const parts = [...bySlots].sort((a, b) => Math.max(...b[1].lens) - Math.max(...a[1].lens)).slice(0, 9)
      .map(([k, e]) => `${k} x${e.count} len ${e.lens.length > 3 ? `${Math.min(...e.lens)}..${Math.max(...e.lens)}` : e.lens.join('/')}`);
    console.log(`  level ${r.level} births: ${parts.join('; ')}${bySlots.size > 9 ? ` ... (${bySlots.size} kinds)` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Comparing combinations
// ---------------------------------------------------------------------------

type Snapshot = { partner: Int32Array; len: Float64Array }[];

/**
 * How differently two combinations route the strands at one level, over all
 * nine types: `dots` is the share of boundary dots whose partner differs;
 * `mass` weights each dot by the segments its arc carries (in either
 * combination), so a handful of rerouted giant arcs count for what they are.
 */
export function routingDistance(a: Snapshot, b: Snapshot): { dots: number; mass: number } {
  let diff = 0, total = 0, mdiff = 0, mtotal = 0;
  for (let t = 0; t < a.length; t++) {
    const pa = a[t].partner, pb = b[t].partner;
    if (pa.length !== pb.length) throw new Error('states of different rules');
    for (let i = 0; i < pa.length; i++) {
      const w = a[t].len[i] + b[t].len[i];
      total++; mtotal += w;
      if (pa[i] !== pb[i]) { diff++; mdiff += w; }
    }
  }
  return { dots: total ? diff / total : 0, mass: mtotal ? mdiff / mtotal : 0 };
}

export const partnerDistance = (a: Snapshot, b: Snapshot): number => routingDistance(a, b).dots;

export function allCombos(family: TileFamilyId, subset: readonly number[]): string[] {
  const counts = comboOptionCounts(family, subset);
  const n = counts.reduce((a, b) => a * b, 1);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(comboDigitsFromIndex(counts, i).map((d) => comboDigitChar(d) ?? '0').join(''));
  return out;
}

export function compare(family: TileFamilyId, subset: readonly number[], combos: readonly string[], maxLevel: number): void {
  const t0 = Date.now();
  const keep = combos.length <= 32;
  const orbits = combos.map((c) => runOrbit(family, subset, c, maxLevel, keep));
  const pad = Math.max(12, combos[0].length + 2);
  console.log(`\n== ${family} ${subset.join('')}: ${combos.length} combinations, boundary classes per level (${((Date.now() - t0) / 1000).toFixed(1)}s) ==`);
  let classes = new Map<string, number[]>();
  for (let k = 0; k <= maxLevel; k++) {
    classes = new Map<string, number[]>();
    orbits.forEach((o, i) => {
      const sig = o.levels[k].sig;
      (classes.get(sig) ?? classes.set(sig, []).get(sig)!).push(i);
    });
    const sizes = [...classes.values()].map((m) => m.length).sort((a, b) => b - a);
    console.log(`level ${String(k).padStart(2)}: ${classes.size} classes, sizes ${sizes.slice(0, 40).join(' ')}${sizes.length > 40 ? ' ...' : ''}`);
  }
  const groups = [...classes.values()].sort((a, b) => b.length - a.length);
  console.log(`\nAt level ${maxLevel}:`);
  for (const g of groups.slice(0, 60)) console.log(`  class of ${g.length}: ${g.map((i) => combos[i]).join(' ')}`);
  if (groups.length > 60) console.log(`  ... ${groups.length - 60} more classes`);
  const loners = groups.filter((g) => g.length === 1);
  const bigs = groups.filter((g) => g.length > 1);
  const hist = (i: number): Snapshot[] => orbits[i].history ?? (orbits[i].history = runOrbit(family, subset, combos[i], maxLevel, true).history!);
  if (loners.length && bigs.length && loners.length <= 8) {
    for (const [i] of loners) {
      console.log(`\n${combos[i]} stays apart. Routing distance by level against the first member of each class (share of dots / share of segments):`);
      const mine = hist(i);
      for (const g of bigs) {
        const theirs = hist(g[0]);
        const row: string[] = [];
        for (let k = 0; k <= maxLevel; k++) { const d = routingDistance(mine[k], theirs[k]); row.push(`${fmt(d.dots, 2)}/${fmt(d.mass, 2)}`); }
        console.log(`  vs ${combos[g[0]]} (class of ${g.length}): ${row.join(' ')}`);
      }
    }
  }
  if (keep && combos.length > 2) {
    // Every pair, at the last level: how much of the large-scale routing they share.
    const D = combos.map(() => new Float64Array(combos.length));
    const W = combos.map(() => new Float64Array(combos.length));
    for (let i = 0; i < combos.length; i++) for (let j = i + 1; j < combos.length; j++) {
      const d = routingDistance(hist(i)[maxLevel], hist(j)[maxLevel]);
      D[i][j] = D[j][i] = d.dots;
      W[i][j] = W[j][i] = d.mass;
    }
    const matrix = (M: Float64Array[], title: string): void => {
      console.log(`\n${title}`);
      console.log(''.padEnd(pad) + combos.map((_, j) => String(j).padStart(5)).join(''));
      combos.forEach((c, i) => console.log(`${c} ${String(i).padStart(2)}`.padEnd(pad) + Array.from(M[i], (x, j) => (j === i ? '    .' : (x * 100).toFixed(0).padStart(5))).join('')));
      console.log('nearest neighbour of each:');
      combos.forEach((c, i) => {
        let best = -1;
        for (let j = 0; j < combos.length; j++) if (j !== i && (best < 0 || M[i][j] < M[i][best])) best = j;
        const mean = Array.from(M[i]).reduce((a, x) => a + x, 0) / (combos.length - 1);
        console.log(`  ${c}: nearest ${combos[best]} at ${(M[i][best] * 100).toFixed(1)}%, mean ${(mean * 100).toFixed(1)}%`);
      });
    };
    matrix(D, `Routing distance at level ${maxLevel}, every pair, by boundary dots (percent joined differently; 0 = same pattern above this level):`);
    matrix(W, `Routing distance at level ${maxLevel}, every pair, by segments (percent of the strands' length on arcs joined differently):`);
  }
  const header = 'combination'.padEnd(pad) + Array.from({ length: maxLevel + 1 }, (_, k) => String(k).padStart(9)).join('');
  console.log('\nLongest circuit born per level:');
  console.log(header);
  for (const o of orbits) console.log(o.share.split('-')[1].padEnd(pad) + o.levels.map((r) => String(r.births.length ? r.births[0][2] : 0).padStart(9)).join(''));
  console.log('\nCircuits born per level (all nine types):');
  console.log(header);
  for (const o of orbits) console.log(o.share.split('-')[1].padEnd(pad) + o.levels.map((r) => String(r.births.reduce((a, b) => a + b[3], 0)).padStart(9)).join(''));
  console.log('\nShare of the Delta supertile\'s segments on circuits closed so far:');
  console.log(header);
  for (const o of orbits) console.log(o.share.split('-')[1].padEnd(pad) + o.levels.map((r) => fmt(r.perType[DELTA].segs ? r.perType[DELTA].closedSegs / r.perType[DELTA].segs : 0, 3).padStart(9)).join(''));
  console.log('\nVerdicts:');
  for (const o of orbits) {
    const v = readOrbit(o);
    console.log(`  ${o.share}: ${v.kind}${v.growth !== null ? ` (circuits x${fmt(v.growth, 2)}, dim ${fmt(v.dimension, 2)})` : ''}${v.arcDimension !== null ? ` (arcs dim ${fmt(v.arcDimension, 2)})` : ''}${v.lineShare >= 0.25 ? ` line share ${fmt(v.lineShare, 2)}` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function expandShares(family: TileFamilyId, shares: readonly string[]): { subset: number[]; combo: string }[] {
  const out: { subset: number[]; combo: string }[] = [];
  for (const share of shares) {
    const [rule, combo] = share.split('-');
    const subset = [...rule].map(Number);
    if (combo === 'all') for (const c of allCombos(family, subset)) out.push({ subset, combo: c });
    else if (combo.includes('?')) {
      // a pattern: '?' matches any digit, e.g. 2578-0????01100 is the 16 pairings with those fixed digits
      const re = new RegExp(`^${combo.replace(/\?/g, '.')}$`);
      for (const c of allCombos(family, subset)) if (re.test(c)) out.push({ subset, combo: c });
    } else out.push({ subset, combo });
  }
  return out;
}

if (process.argv[1]?.endsWith('deep-orbit.ts')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const cmp = args.includes('--compare');
  const rest = args.filter((a) => !a.startsWith('--'));
  const [familyArg, levelsArg, ...shares] = rest;
  const family = familyArg as TileFamilyId;
  const maxLevel = Number(levelsArg);
  if (!family || !Number.isFinite(maxLevel) || shares.length === 0) {
    console.error('usage: deep-orbit.ts [--json|--compare] <family> <maxLevel> <rule-combo|rule-all|rule-pattern> [...]');
    process.exit(2);
  }
  const items = expandShares(family, shares);
  if (cmp) {
    const rule = items[0].subset.join('');
    if (items.some((it) => it.subset.join('') !== rule)) throw new Error('--compare needs combinations of one rule');
    compare(family, items[0].subset, items.map((it) => it.combo), maxLevel);
  } else {
    for (const { subset, combo } of items) {
      const t0 = Date.now();
      if (json) {
        const o = runOrbit(family, subset, combo, maxLevel);
        const v = readOrbit(o);
        console.log(JSON.stringify({ share: o.share, family, verdict: v, levels: o.levels.map((r) => ({ level: r.level, delta: r.perType[DELTA], births: r.births })) }));
      } else {
        console.log(`\n== ${family} ${subset.join('')}-${combo} ==`);
        printLevelHeader();
        const o = runOrbit(family, subset, combo, maxLevel, false, printLevel);
        printVerdict(o);
        console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      }
    }
  }
}
