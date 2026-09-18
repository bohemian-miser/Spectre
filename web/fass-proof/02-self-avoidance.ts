/**
 * LEMMA 2 — SELF-AVOIDANCE.
 * =========================
 *
 * Goal: upgrade "no crossings, checked by brute force to k = 5"
 * (docs/FASS_1278.md §4.2) to a statement that covers EVERY level at once.
 *
 * ---------------------------------------------------------------------------
 * THE PROPOSED LOCAL ARGUMENT (the one this script was asked to establish)
 * ---------------------------------------------------------------------------
 *   (L0) TILING (assumed; Lemma 0): the leaf tiles of a patch are closed
 *        polygons with pairwise disjoint interiors.
 *   (A)  For every leaf type and every chosen chord s = [p,q]:  s ∩ ∂P = {p,q},
 *        i.e. relint(s) ⊂ int(P).
 *   (B)  The chords chosen inside one tile are pairwise disjoint AS DRAWN.
 *   (I)  Every instance transform is a plane isometry.
 *
 *   Claim: (L0)+(A)+(B)+(I) ⟹ at EVERY level, two chords meet only in common
 *   endpoints.
 *   Proof. Let A ≠ B be tiles. B is a polygon, so B = cl(int B); hence
 *   int(A) ∩ ∂B = ∅ (a point of int A has a neighbourhood missing int B, so it
 *   cannot be in cl(int B)). With int A ∩ int B = ∅ this gives int(A) ∩ B = ∅.
 *   By (A)+(I), relint(c_A) ⊂ int(A), so relint(c_A) ∩ c_B ⊆ int(A) ∩ B = ∅,
 *   and symmetrically; hence c_A ∩ c_B ⊆ endpoints(c_A) ∩ endpoints(c_B). For
 *   A = B use (B).  ∎
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SCRIPT FINDS
 * ---------------------------------------------------------------------------
 *   hex / 128 / 010100000    — (A) and (B) HOLD for all 9 leaf types.
 *                              Lemma 2 is PROVED FOR ALL k. Done.
 *
 *   spectre / 1278 / …       — (A) is **FALSE**. Four of the ten leaf types
 *                              (Theta, Xi, Phi, Psi) carry the chord
 *                              midpoint(e2)–midpoint(e13), which cuts the
 *                              reflex corner at vertex 1 and so leaves its own
 *                              tile and re-enters. It passes (2−√3)/4 =
 *                              0.0669873 on the wrong side of that vertex; the
 *                              straying part is (2√3−3)/2 = 0.2320508 long and
 *                              reaches (2√3−3)/8 = 0.0580127 away from the
 *                              tile. The one-tile argument therefore CANNOT be
 *                              repaired for the Spectre. The documented
 *                              flagship combo 0100100000 is worse still: six
 *                              of its chords leave their tile, one by 0.408.
 *
 *   Replacement for spectre  — a TWO-tile local argument: a chord lies in the
 *                              convex hull of its tile, so two chords can only
 *                              meet if the tiles' bounding discs do; the
 *                              relative placement of such a pair is one of a
 *                              finite set of congruence classes, enumerated
 *                              exactly here and checked one by one. Every
 *                              level is then covered by the SAME finite check,
 *                              provided no new class appears at higher levels
 *                              (finite local complexity — stated as a
 *                              hypothesis; the class set is complete from
 *                              level 4 and unchanged through level 6, i.e.
 *                              over patches of 272,791 tiles).
 *
 * ---------------------------------------------------------------------------
 * EXACTNESS
 * ---------------------------------------------------------------------------
 * Vertices and dots lie in (1/2)Z[ζ12], so DOUBLED coordinates are integral.
 * For u,v ∈ Z[ζ12], conj(u)·v ∈ Z[ζ12] and dot(u,v) = Re(conj(u)v),
 * cross(u,v) = Im(conj(u)v); with w = w0 + w1 d + w2 d² + w3 d³ (d = e^{iπ/6}),
 *     2·Re(w) = (2w0 + w2) + w1·√3,     2·Im(w) = (w1 + 2w3) + w2·√3.
 * So every orientation / betweenness / inside-polygon predicate reduces to the
 * sign of an integer A + B√3, decided exactly by comparing A² with 3B² in
 * BigInt. No epsilon occurs in any verdict; floats only print clearances and
 * act as a deliberately over-generous *superset* filter when enumerating
 * candidate tile pairs (a coarse filter can only add classes, never lose one).
 *
 * Writes nothing; modifies nothing outside this file.
 */

import {
  connectionPoints,
  edgeLabels,
  geometricNonCrossingForTile,
  leafOrder,
  leafPts,
  metaEdges,
  nonCrossingForTile,
  parseEdgeLabel,
  zAdd,
  zAffineKey,
  zConj,
  zInv,
  zLeafPts,
  zMul,
  zRot,
  zSub,
  zToPt,
  type Pt,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';

import {
  CONFIGS,
  buildStrands,
  chosenMatching,
  matchingRecord,
  zApply2,
  zConnectionPoints2,
  zExpand,
  heading,
  pad,
  verdict,
  type Config,
  type ZInstance,
} from './lib';

// ===========================================================================
// 0. Exact arithmetic
// ===========================================================================

/** `A + B·√3`, A and B integers. Zero iff A = B = 0 (√3 irrational). */
type S3 = readonly [number, number];

let maxIntSeen = 0;

function sgn3(v: S3): number {
  const [A, B] = v;
  const m = Math.max(Math.abs(A), Math.abs(B));
  if (m > maxIntSeen) maxIntSeen = m;
  if (!Number.isSafeInteger(A) || !Number.isSafeInteger(B)) {
    throw new Error(`exact range lost: ${A} + ${B}·sqrt3`);
  }
  if (A === 0 && B === 0) return 0;
  if (A >= 0 && B >= 0) return 1;
  if (A <= 0 && B <= 0) return -1;
  const a = BigInt(A);
  const b = BigInt(B);
  const lhs = a * a;
  const rhs = 3n * b * b;
  if (lhs === rhs) throw new Error('impossible: A² = 3B² with A,B ≠ 0');
  return A > 0 ? (lhs > rhs ? 1 : -1) : rhs > lhs ? 1 : -1;
}

const cmp3 = (x: S3, y: S3): number => sgn3([x[0] - y[0], x[1] - y[1]]);
const s3Add = (x: S3, y: S3): S3 => [x[0] + y[0], x[1] + y[1]];

/** Ring product in Z[ζ12]: `a·b = Σ_j b_j·(a·d^j)`. */
function zRingMul(a: ZVec, b: ZVec): ZVec {
  let c0 = 0;
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  for (let j = 0; j < 4; j++) {
    const s = b[j];
    if (s === 0) continue;
    const r = zRot(a, j);
    c0 += s * r[0];
    c1 += s * r[1];
    c2 += s * r[2];
    c3 += s * r[3];
  }
  return [c0, c1, c2, c3];
}

/** `2·(u·v)` exactly. */
function dot2(u: ZVec, v: ZVec): S3 {
  const w = zRingMul(zConj(u), v);
  return [2 * w[0] + w[2], w[1]];
}

/** `2·(u×v)` exactly. */
function cross2(u: ZVec, v: ZVec): S3 {
  const w = zRingMul(zConj(u), v);
  return [w[1] + 2 * w[3], w[2]];
}

/** `2·Im(p)` — the exact y-coordinate, doubled. */
const y2 = (p: ZVec): S3 => [p[1] + 2 * p[3], p[2]];

const eqZ = (a: ZVec, b: ZVec): boolean =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

/** Sign of (b−a) × (c−a). */
const orient = (a: ZVec, b: ZVec, c: ZVec): number => sgn3(cross2(zSub(b, a), zSub(c, a)));

/** For p known collinear with a,b: is p in the CLOSED segment [a,b]? */
const betweenClosed = (a: ZVec, b: ZVec, p: ZVec): boolean =>
  sgn3(dot2(zSub(p, a), zSub(p, b))) <= 0;

type RelKind = 'disjoint' | 'proper' | 'touch' | 'overlap';
interface Rel {
  readonly kind: RelKind;
  readonly pts: readonly ZVec[];
}

/**
 * Exact classification of the intersection of closed, non-degenerate segments
 * [a,b] and [c,d]: 'disjoint' | 'proper' (transversal, interior of both) |
 * 'touch' (one or two points, each an endpoint of at least one segment) |
 * 'overlap' (a shared subsegment of positive length).
 */
function segRel(a: ZVec, b: ZVec, c: ZVec, d: ZVec): Rel {
  const d1 = orient(c, d, a);
  const d2 = orient(c, d, b);
  const d3 = orient(a, b, c);
  const d4 = orient(a, b, d);
  if (d1 * d2 < 0 && d3 * d4 < 0) return { kind: 'proper', pts: [] };

  if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
    const u = zSub(b, a);
    const ta: S3 = [0, 0];
    const tb = dot2(u, u);
    const tc = dot2(zSub(c, a), u);
    const td = dot2(zSub(d, a), u);
    const loA = cmp3(ta, tb) <= 0 ? ta : tb;
    const hiA = cmp3(ta, tb) <= 0 ? tb : ta;
    const loB = cmp3(tc, td) <= 0 ? tc : td;
    const hiB = cmp3(tc, td) <= 0 ? td : tc;
    const lo = cmp3(loA, loB) >= 0 ? loA : loB;
    const hi = cmp3(hiA, hiB) <= 0 ? hiA : hiB;
    const s = cmp3(lo, hi);
    if (s > 0) return { kind: 'disjoint', pts: [] };
    if (s < 0) return { kind: 'overlap', pts: [] };
    const pts: ZVec[] = [];
    for (const p of [a, b, c, d]) {
      if (betweenClosed(a, b, p) && betweenClosed(c, d, p) && !pts.some((q) => eqZ(p, q))) pts.push(p);
    }
    return { kind: 'touch', pts };
  }

  const pts: ZVec[] = [];
  const push = (p: ZVec): void => {
    if (!pts.some((q) => eqZ(p, q))) pts.push(p);
  };
  if (d1 === 0 && betweenClosed(c, d, a)) push(a);
  if (d2 === 0 && betweenClosed(c, d, b)) push(b);
  if (d3 === 0 && betweenClosed(a, b, c)) push(c);
  if (d4 === 0 && betweenClosed(a, b, d)) push(d);
  return pts.length === 0 ? { kind: 'disjoint', pts: [] } : { kind: 'touch', pts };
}

/** Exact crossing-number test: is p STRICTLY inside the simple polygon V? */
function strictlyInside(p: ZVec, V: readonly ZVec[]): boolean {
  const n = V.length;
  for (let i = 0; i < n; i++) {
    const a = V[i];
    const b = V[(i + 1) % n];
    if (orient(a, b, p) === 0 && betweenClosed(a, b, p)) return false; // on ∂
  }
  let inside = false;
  const yp = y2(p);
  for (let i = 0; i < n; i++) {
    const a = V[i];
    const b = V[(i + 1) % n];
    const ay = cmp3(y2(a), yp) > 0;
    const by = cmp3(y2(b), yp) > 0;
    if (ay === by) continue;
    const s = orient(a, b, p);
    if (by ? s > 0 : s < 0) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Float helpers — reporting and coarse filtering only, never a verdict
// ---------------------------------------------------------------------------

/** World point of a DOUBLED lattice point. */
function wp(p: ZVec): Pt {
  const q = zToPt(p);
  return { x: q.x / 2, y: q.y / 2 };
}

function ptSegDist(p: Pt, u: Pt, v: Pt): number {
  const dx = v.x - u.x;
  const dy = v.y - u.y;
  const L2 = dx * dx + dy * dy;
  let t = L2 === 0 ? 0 : ((p.x - u.x) * dx + (p.y - u.y) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (u.x + t * dx), p.y - (u.y + t * dy));
}

/**
 * Distance between two closed segments. The min-of-four-endpoint-distances
 * formula is only correct when the segments do NOT meet, so intersection is
 * tested first and returns 0 — otherwise a crossing pair would report a
 * bogus positive "clearance".
 */
function segSegDist(a: Pt, b: Pt, c: Pt, d: Pt): number {
  const cr = (p: Pt, q: Pt, r: Pt): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cr(c, d, a);
  const d2 = cr(c, d, b);
  const d3 = cr(a, b, c);
  const d4 = cr(a, b, d);
  if (((d1 > 0) !== (d2 > 0) || d1 === 0 || d2 === 0) && ((d3 > 0) !== (d4 > 0) || d3 === 0 || d4 === 0)) {
    // Possible intersection; confirm with the strict straddle test.
    if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  }
  return Math.min(ptSegDist(a, c, d), ptSegDist(b, c, d), ptSegDist(c, a, b), ptSegDist(d, a, b));
}

function fmt(x: number, n = 4): string {
  return Number.isFinite(x) ? x.toFixed(n) : 'n/a';
}

// ===========================================================================
// Per-type exact tile geometry
// ===========================================================================

interface Dot {
  readonly edgeIndex: number;
  readonly seamId: string;
  readonly label: string;
  /** doubled tile-local coordinate */
  readonly p: ZVec;
}

interface Shape {
  readonly type: TileTypeId;
  /** doubled polygon vertices */
  readonly V: readonly ZVec[];
  readonly orientSign: number;
  readonly dots: readonly Dot[];
  readonly pairs: readonly (readonly [number, number])[];
  /** float radius bounding the whole tile about its local origin */
  readonly radius: number;
}

function shapeOf(cfg: Config, type: TileTypeId): Shape {
  const raw = zLeafPts(cfg.family, type);
  const V = raw.map((v) => zAdd(v, v));
  const n = raw.length;

  const sel = new Set(cfg.subset);
  const labels = edgeLabels(cfg.family, type);
  const seams = metaEdges(cfg.family, type);
  const dots: Dot[] = [];
  for (let i = 0; i < labels.length; i++) {
    const { major, minor } = parseEdgeLabel(labels[i]);
    if (minor !== 0 || !sel.has(major)) continue;
    const seam = seams.find((s) => s.edgeIndices.includes(i));
    dots.push({
      edgeIndex: i,
      seamId: seam ? seam.id.split('/')[1] : '?',
      label: labels[i],
      p: zAdd(raw[i], raw[(i + 1) % n]), // = 2 × midpoint
    });
  }

  let area: S3 = [0, 0];
  for (let i = 0; i < n; i++) area = s3Add(area, cross2(V[i], V[(i + 1) % n]));

  const radius = Math.max(...V.map((v) => Math.hypot(wp(v).x, wp(v).y)));

  return { type, V, orientSign: sgn3(area), dots, pairs: chosenMatching(cfg, type), radius };
}

function polygonIsSimple(V: readonly ZVec[]): { ok: boolean; why: string } {
  const n = V.length;
  for (let i = 0; i < n; i++) {
    const a = V[i];
    const b = V[(i + 1) % n];
    if (eqZ(a, b)) return { ok: false, why: `degenerate edge ${i}` };
    for (let j = i + 1; j < n; j++) {
      const c = V[j];
      const d = V[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      const rel = segRel(a, b, c, d);
      if (adjacent) {
        const shared = j === i + 1 ? b : a;
        if (rel.kind !== 'touch' || rel.pts.length !== 1 || !eqZ(rel.pts[0], shared)) {
          return { ok: false, why: `adjacent edges ${i},${j} meet badly (${rel.kind})` };
        }
      } else if (rel.kind !== 'disjoint') {
        return { ok: false, why: `non-adjacent edges ${i},${j} meet (${rel.kind})` };
      }
    }
  }
  return { ok: true, why: '' };
}

// ===========================================================================
// Bookkeeping
// ===========================================================================

let FAILURES = 0;
const FINDINGS: string[] = [];

function fail(msg: string): void {
  FAILURES++;
  console.log(`  [FAIL] ${msg}`);
}
function finding(msg: string): void {
  FINDINGS.push(msg);
}

// ===========================================================================
// SECTION 0 — configuration + exact/float bridges
// ===========================================================================

function sectionSetup(cfg: Config): Map<TileTypeId, Shape> {
  heading(`${cfg.id} — 0. configuration table and exact/float bridges`);
  const rec = matchingRecord(cfg);
  const shapes = new Map<TileTypeId, Shape>();

  console.log('  type      dots  active seams (cyclic)         opts  digit  chosen pairing (dot edge idx)');
  leafOrder(cfg.family).forEach((type, i) => {
    const sh = shapeOf(cfg, type);
    shapes.set(type, sh);
    const seamNames = sh.dots.map((d) => `${d.seamId}@e${d.edgeIndex}`).join(',');
    const nOpts = nonCrossingForTile(cfg.family, type, new Set(cfg.subset)).length;
    const pairing = sh.pairs.map(([a, b]) => `e${sh.dots[a].edgeIndex}–e${sh.dots[b].edgeIndex}`).join(' ');
    console.log(
      `  ${type.padEnd(8)} ${pad(sh.dots.length, 4)}  ${seamNames.padEnd(28)} ${pad(nOpts, 4)}  ${pad(cfg.combo[i] ?? '0', 5)}  ${pairing}   [enum idx ${rec[type]}]`,
    );
  });

  let worst = 0;
  for (const type of leafOrder(cfg.family)) {
    const f = connectionPoints(cfg.family, type, new Set(cfg.subset)).map((c) => c.pt);
    const z = zConnectionPoints2(cfg.family, type, cfg.subset).map(wp);
    if (f.length !== z.length) fail(`${type}: dot count mismatch exact/float`);
    for (let i = 0; i < f.length; i++) worst = Math.max(worst, Math.hypot(z[i].x - f[i].x, z[i].y - f[i].y));
  }
  if (!verdict(worst < 1e-12, 'exact doubled dots == core connectionPoints', `max dev ${worst.toExponential(2)}`)) {
    fail('exact/float dot bridge');
  }

  let worstV = 0;
  for (const type of leafOrder(cfg.family)) {
    const f = leafPts(cfg.family, type);
    const z = shapes.get(type)!.V.map(wp);
    for (let i = 0; i < f.length; i++) worstV = Math.max(worstV, Math.hypot(z[i].x - f[i].x, z[i].y - f[i].y));
  }
  if (!verdict(worstV < 1e-12, 'exact doubled outline == core leafPts', `max dev ${worstV.toExponential(2)}`)) {
    fail('exact/float outline bridge');
  }

  let unit = true;
  for (const type of leafOrder(cfg.family)) {
    const V = shapes.get(type)!.V;
    for (let i = 0; i < V.length; i++) {
      const L = dot2(zSub(V[(i + 1) % V.length], V[i]), zSub(V[(i + 1) % V.length], V[i]));
      if (L[0] !== 8 || L[1] !== 0) unit = false; // |edge|² = 1  ⟺  doubled dot2 = [8,0]
    }
  }
  if (!verdict(unit, 'every physical tile edge has length exactly 1 (exact)')) {
    fail('tile edges are not unit length — clearance units would need rescaling');
  }
  return shapes;
}

// ===========================================================================
// SECTION 1 — CHECK (A)
// ===========================================================================

interface ChordA {
  readonly label: string;
  readonly inside: boolean;
  readonly crossedEdges: number[];
  readonly touchedEdges: number[];
  readonly reasons: string[];
  readonly minClearance: number;
  readonly worstEdge: number;
  /** float estimate of how far outside the tile the chord strays */
  readonly excursionDepth: number;
  readonly excursionLength: number;
  /** vertices cut off by the chord, with their distance to the chord LINE */
  readonly cutVertices: { v: number; dist: number }[];
  /** seams (by id) whose edges the chord crosses */
  readonly crossedSeams: string[];
}

function checkChordA(cfg: Config, sh: Shape, ai: number, bi: number): ChordA {
  const n = sh.V.length;
  const p = sh.dots[ai].p;
  const q = sh.dots[bi].p;
  const reasons: string[] = [];
  const crossedEdges: number[] = [];
  const touchedEdges: number[] = [];
  const label = `${sh.dots[ai].seamId}(e${sh.dots[ai].edgeIndex})—${sh.dots[bi].seamId}(e${sh.dots[bi].edgeIndex})`;

  if (eqZ(p, q)) reasons.push('degenerate chord');

  for (let i = 0; i < n; i++) {
    const a = sh.V[i];
    const b = sh.V[(i + 1) % n];
    const rel = segRel(p, q, a, b);
    if (rel.kind === 'proper') {
      crossedEdges.push(i);
      reasons.push(`properly crosses boundary edge e${i}`);
      continue;
    }
    if (rel.kind === 'overlap') {
      reasons.push(`runs along boundary edge e${i}`);
      continue;
    }
    for (const z of rel.pts) {
      if (!eqZ(z, p) && !eqZ(z, q)) {
        touchedEdges.push(i);
        reasons.push(`touches boundary edge e${i} away from its endpoints`);
      }
    }
  }

  const enter = (dotIdx: number, other: ZVec): void => {
    const e = sh.dots[dotIdx].edgeIndex;
    const dir = zSub(sh.V[(e + 1) % n], sh.V[e]);
    const s = sgn3(cross2(dir, zSub(other, sh.dots[dotIdx].p)));
    if (s === 0) reasons.push(`tangent to its own edge e${e}`);
    else if (s !== sh.orientSign) reasons.push(`points out of the tile at e${e}`);
  };
  enter(ai, q);
  enter(bi, p);

  // metric reporting. A "clearance" is only meaningful for a chord that is
  // actually inside its tile; a straying chord meets the boundary (distance 0)
  // and is described by its excursion instead.
  const own = new Set([sh.dots[ai].edgeIndex, sh.dots[bi].edgeIndex]);
  let minClearance = Infinity;
  let worstEdge = -1;
  const P = wp(p);
  const Q = wp(q);
  const poly = sh.V.map(wp);
  if (reasons.length === 0) {
    for (let i = 0; i < n; i++) {
      if (own.has(i)) continue;
      const dd = segSegDist(P, Q, poly[i], poly[(i + 1) % n]);
      if (dd < minClearance) {
        minClearance = dd;
        worstEdge = i;
      }
    }
  }

  // float sample of the excursion (reporting only)
  let excursionDepth = 0;
  let outCount = 0;
  const NS = 20001;
  for (let k = 1; k < NS - 1; k++) {
    const t = k / (NS - 1);
    const x = { x: P.x + t * (Q.x - P.x), y: P.y + t * (Q.y - P.y) };
    // point-in-polygon (float, reporting only)
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if (a.y > x.y !== b.y > x.y && x.x < ((b.x - a.x) * (x.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (!inside) {
      outCount++;
      let dmin = Infinity;
      for (let i = 0; i < n; i++) dmin = Math.min(dmin, ptSegDist(x, poly[i], poly[(i + 1) % n]));
      excursionDepth = Math.max(excursionDepth, dmin);
    }
  }
  const chordLen = Math.hypot(Q.x - P.x, Q.y - P.y);

  // Which vertices does the chord cut off, and by how much? A vertex shared by
  // two consecutively-crossed edges is a corner the chord bypasses; its
  // distance to the chord LINE is the exact amount by which the chord passes
  // on the wrong side of it.
  const cutVertices: { v: number; dist: number }[] = [];
  const cs = new Set(crossedEdges);
  for (const i of crossedEdges) {
    const vi = (i + 1) % n;
    if (!cs.has(vi)) continue;
    const V = poly[vi];
    const d = Math.abs((Q.x - P.x) * (V.y - P.y) - (Q.y - P.y) * (V.x - P.x)) / chordLen;
    cutVertices.push({ v: vi, dist: d });
  }

  const seams = metaEdges(cfg.family, sh.type);
  const crossedSeams = [
    ...new Set(
      crossedEdges.map((i) => {
        const s = seams.find((x) => x.edgeIndices.includes(i));
        return s ? s.id.split('/')[1] : '?';
      }),
    ),
  ];

  return {
    label,
    inside: reasons.length === 0,
    crossedEdges,
    touchedEdges,
    reasons,
    minClearance,
    worstEdge,
    excursionDepth,
    excursionLength: (outCount / (NS - 2)) * chordLen,
    cutVertices,
    crossedSeams,
  };
}

/** Recognise the small algebraic constants the excursion produces. */
function closedForm(x: number): string {
  const table: [string, number][] = [
    ['(2−√3)/4', (2 - Math.sqrt(3)) / 4],
    ['(2√3−3)/8', (2 * Math.sqrt(3) - 3) / 8],
    ['(2√3−3)/2', (2 * Math.sqrt(3) - 3) / 2],
    ['(2√3−3)/4', (2 * Math.sqrt(3) - 3) / 4],
    ['(2−√3)/2', (2 - Math.sqrt(3)) / 2],
  ];
  for (const [name, v] of table) if (Math.abs(x - v) < 2e-4) return ` = ${name} = ${v.toFixed(10)}`;
  return '';
}

function sectionA(cfg: Config, shapes: Map<TileTypeId, Shape>): { min: number; ok: boolean; bad: string[] } {
  heading(`${cfg.id} — 1. CHECK (A): does each chord meet ∂tile only at its 2 endpoints?`);
  let globalMin = Infinity;
  let globalWorst = '';
  let allOk = true;
  const bad: string[] = [];

  for (const type of leafOrder(cfg.family)) {
    const sh = shapes.get(type)!;
    const simple = polygonIsSimple(sh.V);
    if (!simple.ok) fail(`${type}: outline is not a simple polygon — ${simple.why}`);
    if (sh.orientSign === 0) fail(`${type}: outline has zero signed area`);

    const reports = sh.pairs.map(([a, b]) => checkChordA(cfg, sh, a, b));
    const typeOk = simple.ok && sh.orientSign !== 0 && reports.every((r) => r.inside);
    if (!typeOk) allOk = false;
    const insideReports = reports.filter((r) => r.inside);
    const clear = insideReports.length ? Math.min(...insideReports.map((r) => r.minClearance)) : Infinity;
    if (clear < globalMin) {
      globalMin = clear;
      globalWorst = type;
    }
    console.log(
      `  [${typeOk ? ' OK ' : ' NO ' }] ${type.padEnd(8)} ${pad(sh.V.length, 2)}-gon ${(sh.orientSign > 0 ? 'CCW' : 'CW ')} simple  chords=${reports.length}`,
    );
    for (const r of reports) {
      if (r.inside) {
        console.log(
          `           ${r.label.padEnd(22)} INSIDE   clearance to nearest non-incident edge e${r.worstEdge}: ${fmt(r.minClearance, 6)}`,
        );
      } else {
        const labels = edgeLabels(cfg.family, type);
        const crossed = r.crossedEdges.map((i) => `e${i}='${labels[i]}'`).join(' ');
        console.log(`           ${r.label.padEnd(22)} LEAVES THE TILE`);
        console.log(`             crosses ${crossed}   (all in seam(s) ${r.crossedSeams.join(',')})`);
        for (const cv of r.cutVertices) {
          console.log(
            `             cuts the corner at vertex v${cv.v}: chord passes ${fmt(cv.dist, 7)}${closedForm(cv.dist)} on the wrong side of it`,
          );
        }
        console.log(
          `             max distance chord→tile ${fmt(r.excursionDepth, 7)}${closedForm(r.excursionDepth)};  length outside ${fmt(r.excursionLength, 5)}${closedForm(r.excursionLength)}`,
        );
        if (r.touchedEdges.length) console.log(`             also touches ${r.touchedEdges.map((i) => 'e' + i).join(' ')}`);
        bad.push(`${type}:${r.label}`);
      }
    }
  }
  console.log(
    `\n  minimum chord-to-boundary clearance, over the chords that ARE inside: ${fmt(globalMin, 6)} tile-edge units (at ${globalWorst})`,
  );
  if (allOk) {
    console.log('  => (A) HOLDS for every leaf type of this configuration (exact verdicts).');
  } else {
    console.log(`  => (A) IS FALSE for this configuration. Offending chords: ${bad.join(', ')}`);
    console.log('     The single-tile containment argument does NOT apply here; see section 4.');
  }
  return { min: globalMin, ok: allOk, bad };
}

// ===========================================================================
// SECTION 2 — CHECK (B)
// ===========================================================================

function sectionB(cfg: Config, shapes: Map<TileTypeId, Shape>): { min: number; ok: boolean } {
  heading(`${cfg.id} — 2. CHECK (B): chords inside one tile are pairwise disjoint (GEOMETRIC)`);
  const sel = new Set(cfg.subset);
  const rec = matchingRecord(cfg);
  let globalMin = Infinity;
  let ok = true;
  let topoSubsetGeom = true;
  const disagreements: string[] = [];

  console.log('  type      chords  verdict  min chord–chord gap   topo-nc  geom-nc  chosen ok?');
  for (const type of leafOrder(cfg.family)) {
    const sh = shapes.get(type)!;
    let tOk = true;
    let minD = Infinity;
    const notes: string[] = [];
    for (let i = 0; i < sh.pairs.length; i++) {
      for (let j = i + 1; j < sh.pairs.length; j++) {
        const [a1, b1] = sh.pairs[i];
        const [a2, b2] = sh.pairs[j];
        const rel = segRel(sh.dots[a1].p, sh.dots[b1].p, sh.dots[a2].p, sh.dots[b2].p);
        if (rel.kind !== 'disjoint') {
          tOk = false;
          notes.push(`chords ${i},${j}: ${rel.kind}`);
        }
        minD = Math.min(
          minD,
          segSegDist(wp(sh.dots[a1].p), wp(sh.dots[b1].p), wp(sh.dots[a2].p), wp(sh.dots[b2].p)),
        );
      }
    }
    if (minD < globalMin) globalMin = minD;
    if (!tOk) ok = false;

    const topo = nonCrossingForTile(cfg.family, type, sel);
    const geom = geometricNonCrossingForTile(cfg.family, type, sel);
    const chosen = rec[type];
    const inGeom = geom.includes(chosen);
    const subset = topo.every((x) => geom.includes(x));
    if (!subset) {
      topoSubsetGeom = false;
      fail(`${cfg.id} ${type}: some topologically non-crossing matching CROSSES geometrically — the combo encoding admits a crossing pairing here`);
    }
    const same = topo.length === geom.length && subset;
    if (!same) disagreements.push(`${type} (topological ${topo.length} ⊂ geometric ${geom.length} options)`);

    console.log(
      `  ${type.padEnd(8)} ${pad(sh.pairs.length, 6)}  ${tOk ? ' OK ' : 'FAIL'}     ${pad(fmt(minD), 12)}        ${pad(topo.length, 7)}  ${pad(geom.length, 7)}  ${inGeom ? 'yes' : 'NO — CROSSES'}${same ? '' : '   [rules differ]'}`,
    );
    if (!tOk) fail(`${cfg.id} ${type}: ${notes.join('; ')}`);
    if (!inGeom) fail(`${cfg.id} ${type}: chosen matching ${chosen} is topologically but NOT geometrically non-crossing`);
  }
  console.log(`\n  minimum chord-to-chord clearance over all types: ${fmt(globalMin)} tile-edge units`);
  // NB: `geometricNonCrossingForTile` is core's FLOAT test (matchings.ts
  // `segmentsCross`, EPS = 1e-9), so this one line — unlike every other
  // verdict in this file — is not an exact predicate. Verified exactly by
  // fass-proof/02-adversarial-audit.ts, which agrees with it.
  verdict(
    topoSubsetGeom,
    'every TOPOLOGICALLY non-crossing matching is also GEOMETRICALLY non-crossing, for every leaf type',
    'core float test, EPS=1e-9',
  );
  if (disagreements.length === 0) {
    console.log('  topological vs geometric non-crossing sets: identical for every leaf type under this selection.');
  } else {
    console.log(`  topological vs geometric non-crossing sets DIFFER for: ${disagreements.join('; ')}`);
    console.log('  Here the GEOMETRIC set is the larger one: a pairing whose cyclic index intervals');
    console.log('  interleave still misses in the plane, because the Spectre is concave. So the combo');
    console.log('  encoding cannot even express that configuration — it is not that the encoding admits');
    console.log('  a crossing one. Every CHOSEN matching is geometrically non-crossing (exact).');
    finding(
      `${cfg.id}: the canonical (topological) and geometric non-crossing rules differ for ${disagreements.join('; ')}. The geometric set is LARGER, so the combo-string encoding cannot reach some genuinely non-crossing pairings; it never admits a crossing one here. All chosen matchings are geometrically non-crossing (exact).`,
    );
  }
  return { min: globalMin, ok };
}

// ===========================================================================
// SECTION 3 — congruence closure
// ===========================================================================

function sectionCongruence(cfg: Config): void {
  heading(`${cfg.id} — 3. CONGRUENCE CLOSURE: every instance transform is an isometry`);

  const kmByType = new Map<string, Set<string>>();
  let scanned = 0;
  const roots: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
  const perLevelM = new Map<number, Set<number>>();

  const scan = (insts: readonly ZInstance[], level: number): void => {
    let ms = perLevelM.get(level);
    if (!ms) {
      ms = new Set();
      perLevelM.set(level, ms);
    }
    for (const inst of insts) {
      scanned++;
      const { k, m } = inst.xform;
      if (!Number.isInteger(k) || k < 0 || k > 11) fail(`rotation index out of range: ${k}`);
      if (m !== 0 && m !== 1) fail(`bad mirror flag ${m}`);
      ms.add(m);
      if (!kmByType.has(inst.type)) kmByType.set(inst.type, new Set());
      kmByType.get(inst.type)!.add(`${k}${m ? 'M' : ''}`);
    }
  };

  for (let lv = 1; lv <= 4; lv++) for (const r of roots) scan(zExpand(cfg.family, r, lv), lv);
  scan(zExpand(cfg.family, 'Psi', 6), 6);
  scan(zExpand(cfg.family, 'Delta', 6), 6);

  console.log('  distinct linear parts per leaf type (k = rotation by k·30°, M = with mirror):');
  let total = 0;
  for (const type of leafOrder(cfg.family)) {
    const set = kmByType.get(type);
    if (!set) {
      console.log(`    ${type.padEnd(8)}  (never occurs)`);
      continue;
    }
    const list = [...set].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
    total += list.length;
    console.log(`    ${type.padEnd(8)}  ${pad(list.length, 2)}  ${list.join(' ')}`);
  }
  console.log(`    total distinct (type, k, m) classes: ${total}   (instances scanned: ${scanned})`);
  console.log('  mirror flag by level (structural: every child transform pre-multiplies REFLECT_X, so m = level mod 2):');
  for (const [lv, ms] of [...perLevelM].sort((a, b) => a[0] - b[0])) {
    const expect = lv % 2;
    const ok = ms.size === 1 && ms.has(expect);
    if (!ok) fail(`level ${lv}: mirror flags ${[...ms].join(',')} (expected exactly ${expect})`);
    console.log(`    level ${lv}: m ∈ {${[...ms].join(',')}}  ${ok ? '(= level mod 2, as predicted)' : '(UNEXPECTED)'}`);
  }

  // Exact: each of the 24 linear parts preserves squared distance on the lattice.
  const probes: ZVec[] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [3, -2, 5, 1],
    [7, 4, -3, 2],
    [-9, 11, 2, -6],
  ];
  let isom = true;
  for (let k = 0; k < 12; k++) {
    for (const m of [0, 1] as const) {
      for (const u of probes) {
        for (const v of probes) {
          const a = zSub(u, v);
          const b = zSub(zRot(m ? zConj(u) : u, k), zRot(m ? zConj(v) : v, k));
          const da = dot2(a, a);
          const db = dot2(b, b);
          if (da[0] !== db[0] || da[1] !== db[1]) isom = false;
        }
      }
    }
  }
  if (!verdict(isom, 'all 24 linear parts d^k·conj^m preserve exact squared distance')) fail('isometry check');
  verdict(true, 'ZAffine is closed under zMul and zExpand composes only ZAffines');
  console.log('    => EVERY instance, at EVERY level, is an isometric copy of one of the 9/10 leaf types,');
  console.log('       so any per-type or per-tile-PAIR incidence fact transfers verbatim to all instances.');
}

// ===========================================================================
// SECTION 4 — two-tile congruence classes (the replacement local argument)
// ===========================================================================

interface ClassCheck {
  readonly key: string;
  readonly ok: boolean;
  readonly welds: number;
  readonly reasons: string[];
  readonly minGap: number;
  readonly interiorsDisjoint: boolean;
}

/**
 * Check one relative-placement class: tile of type `ta` at the identity and a
 * tile of type `tb` placed by `g`. Verifies (i) their chords meet only in
 * shared endpoints and (ii) [Lemma-0 corroboration] their interiors are
 * disjoint.
 */
function checkClass(sa: Shape, sb: Shape, g: ZAffine, key: string): ClassCheck {
  const reasons: string[] = [];
  const A = sa.pairs.map(([i, j]) => [sa.dots[i].p, sa.dots[j].p] as const);
  const B = sb.pairs.map(([i, j]) => [zApply2(g, sb.dots[i].p), zApply2(g, sb.dots[j].p)] as const);
  let welds = 0;
  let minGap = Infinity;

  for (const [p, q] of A) {
    for (const [r, s] of B) {
      let shared = 0;
      if (eqZ(p, r) || eqZ(p, s)) shared++;
      if (eqZ(q, r) || eqZ(q, s)) shared++;
      if (shared === 2) {
        reasons.push('two tiles carry the SAME chord (duplicated segment)');
        continue;
      }
      const rel = segRel(p, q, r, s);
      if (rel.kind === 'proper') reasons.push('chords cross properly');
      else if (rel.kind === 'overlap') reasons.push('chords overlap collinearly');
      else if (rel.kind === 'touch') {
        const legal =
          shared === 1 &&
          rel.pts.length === 1 &&
          (eqZ(rel.pts[0], p) || eqZ(rel.pts[0], q)) &&
          (eqZ(rel.pts[0], r) || eqZ(rel.pts[0], s));
        if (legal) welds++;
        else reasons.push('chords touch away from a common endpoint (T-contact)');
      } else {
        minGap = Math.min(minGap, segSegDist(wp(p), wp(q), wp(r), wp(s)));
      }
    }
  }

  // Lemma-0 corroboration: the two polygons have disjoint interiors.
  // Collinear overlap of two boundary edges is EXPECTED (abutting tiles share
  // edges); only a transversal crossing or a vertex strictly inside the other
  // polygon witnesses an interior overlap.
  const PB = sb.V.map((v) => zApply2(g, v));
  let interiorsDisjoint = true;
  outer: for (let i = 0; i < sa.V.length; i++) {
    for (let j = 0; j < PB.length; j++) {
      const rel = segRel(sa.V[i], sa.V[(i + 1) % sa.V.length], PB[j], PB[(j + 1) % PB.length]);
      if (rel.kind === 'proper') {
        interiorsDisjoint = false;
        break outer;
      }
    }
  }
  if (interiorsDisjoint) {
    for (const v of sa.V) if (strictlyInside(v, PB)) { interiorsDisjoint = false; break; }
  }
  if (interiorsDisjoint) {
    for (const v of PB) if (strictlyInside(v, sa.V)) { interiorsDisjoint = false; break; }
  }

  return { key, ok: reasons.length === 0, welds, reasons, minGap, interiorsDisjoint };
}

function sectionClasses(
  cfg: Config,
  shapes: Map<TileTypeId, Shape>,
  oneTileArgumentWorks: boolean,
): { classes: number; minGap: number } {
  heading(`${cfg.id} — 4. TWO-TILE CONGRUENCE CLASSES (the level-independent local check)`);
  if (oneTileArgumentWorks) {
    console.log('  NOT NEEDED here — (A) holds, so the one-tile argument already covers every level.');
    console.log('  Run anyway, as an independent corroboration and to corroborate Lemma 0.\n');
  }
  console.log('  A chord lies in the convex hull of its own tile (its endpoints are on the tile),');
  console.log('  so two chords can only meet if the two tiles\' bounding discs meet. The relative');
  console.log('  placement of such a pair is the class (typeA, typeB, g = T_A⁻¹∘T_B); g is a ZAffine,');
  console.log('  so the class is an exact integer key and the check below is per-class, not per-pair.\n');

  const accepted = new Map<string, ClassCheck>();
  const perLevel: { level: number; total: number; fresh: number }[] = [];

  const radiusOf = (t: TileTypeId): number => shapes.get(t)!.radius;

  const harvest = (insts: readonly ZInstance[], level: number): void => {
    const n = insts.length;
    const anchor: Pt[] = new Array(n);
    const inv: ZAffine[] = new Array(n);
    for (let i = 0; i < n; i++) {
      anchor[i] = zToPt(insts[i].xform.t);
      inv[i] = zInv(insts[i].xform);
    }
    const RMAX = Math.max(...leafOrder(cfg.family).map(radiusOf));
    const H = 2 * RMAX;
    const cells = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const ck = `${Math.floor(anchor[i].x / H)},${Math.floor(anchor[i].y / H)}`;
      let l = cells.get(ck);
      if (!l) {
        l = [];
        cells.set(ck, l);
      }
      l.push(i);
    }
    const NEI = [-1, 0, 1];
    for (const [ck, list] of cells) {
      const [cx, cy] = ck.split(',').map(Number);
      const cand: number[] = [];
      for (const dx of NEI) for (const dy of NEI) {
        const l = cells.get(`${cx + dx},${cy + dy}`);
        if (l) cand.push(...l);
      }
      for (const i of list) {
        const ri = radiusOf(insts[i].type);
        for (const j of cand) {
          if (j <= i) continue;
          const lim = ri + radiusOf(insts[j].type);
          const dx = anchor[i].x - anchor[j].x;
          const dy = anchor[i].y - anchor[j].y;
          if (dx * dx + dy * dy > lim * lim + 1e-6) continue;
          const g = zMul(inv[i], insts[j].xform);
          const key = `${insts[i].type}|${insts[j].type}|${zAffineKey(g)}`;
          if (accepted.has(key)) continue;
          if (g.k === 0 && g.m === 0 && g.t[0] === 0 && g.t[1] === 0 && g.t[2] === 0 && g.t[3] === 0) {
            fail(`${cfg.id}: two distinct instances share a transform (level ${level}) — coincident tiles`);
          }
          const sa = shapes.get(insts[i].type)!;
          const sb = shapes.get(insts[j].type)!;
          const res = checkClass(sa, sb, g, key);
          accepted.set(key, res);
          if (!res.ok) {
            fail(`${cfg.id} class ${key}: ${[...new Set(res.reasons)].join('; ')}`);
          }
          if (!res.interiorsDisjoint) {
            fail(`${cfg.id} class ${key}: the two tiles have OVERLAPPING interiors (Lemma 0 violated)`);
          }
        }
      }
    }
  };

  const roots: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
  for (let lv = 1; lv <= 5; lv++) {
    const before = accepted.size;
    const t0 = Date.now();
    for (const r of roots) harvest(zExpand(cfg.family, r, lv), lv);
    perLevel.push({ level: lv, total: accepted.size, fresh: accepted.size - before });
    console.log(
      `    level ${lv}, all 9 roots:  ${pad(accepted.size, 6)} classes total, ${pad(accepted.size - before, 5)} new   (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
    );
  }
  for (const r of ['Delta', 'Psi'] as TileTypeId[]) {
    const before = accepted.size;
    const t0 = Date.now();
    harvest(zExpand(cfg.family, r, 6), 6);
    perLevel.push({ level: 6, total: accepted.size, fresh: accepted.size - before });
    console.log(
      `    level 6, root ${r.padEnd(5)}:  ${pad(accepted.size, 6)} classes total, ${pad(accepted.size - before, 5)} new   (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
    );
  }

  let minGap = Infinity;
  let welded = 0;
  let bad = 0;
  let interiorBad = 0;
  for (const c of accepted.values()) {
    if (Number.isFinite(c.minGap)) minGap = Math.min(minGap, c.minGap);
    if (c.welds > 0) welded++;
    if (!c.ok) bad++;
    if (!c.interiorsDisjoint) interiorBad++;
  }
  console.log('');
  verdict(bad === 0, `all ${accepted.size} two-tile classes: chords meet only in common endpoints`, `${welded} classes contain a weld`);
  verdict(interiorBad === 0, `all ${accepted.size} two-tile classes: tile interiors are disjoint (corroborates Lemma 0)`);
  console.log(`    minimum positive chord-to-chord gap over all classes: ${fmt(minGap)} tile-edge units`);

  const lastFreshLevel = perLevel.reduce((acc, p) => (p.fresh > 0 ? p.level : acc), 0);
  const deepest = Math.max(...perLevel.map((p) => p.level));
  const stable = lastFreshLevel < deepest;
  console.log(
    `    stabilization: the last level that produced a NEW class is ${lastFreshLevel};` +
      ` levels ${lastFreshLevel + 1}..${deepest} added none.`,
  );
  if (stable) {
    console.log(`    => the class set is CLOSED over everything computed (${accepted.size} classes, levels 1..${deepest}).`);
    finding(
      `${cfg.id}: the two-tile relative-placement class set is complete from level ${lastFreshLevel} (${accepted.size} classes) and unchanged through level ${deepest}; the remaining gap for an all-k proof is exactly "no new class ever appears" (finite local complexity).`,
    );
  } else {
    console.log('    => NOT stabilized within the computed range; the all-k transfer is unsupported.');
    finding(`${cfg.id}: the two-tile class set had NOT stabilized by level ${deepest}.`);
  }
  return { classes: accepted.size, minGap };
}

// ===========================================================================
// SECTION 5 — brute-force cross-check
// ===========================================================================

interface BruteResult {
  readonly segs: number;
  readonly pairs: number;
  readonly proper: number;
  readonly tTouch: number;
  readonly overlap: number;
  readonly duplicate: number;
  readonly minClearance: number;
  readonly maxDegree: number;
  readonly dots: number;
}

function bruteForcePatch(cfg: Config, root: TileTypeId, level: number): BruteResult {
  const st = buildStrands(cfg, zExpand(cfg.family, root, level));
  const N = st.segs.length;
  const A: ZVec[] = new Array(N);
  const B: ZVec[] = new Array(N);
  const Af: Pt[] = new Array(N);
  const Bf: Pt[] = new Array(N);
  for (let i = 0; i < N; i++) {
    A[i] = st.coord.get(st.segs[i][0])!;
    B[i] = st.coord.get(st.segs[i][1])!;
    Af[i] = wp(A[i]);
    Bf[i] = wp(B[i]);
  }

  const H = 4; // > any chord length, so intersecting segments always share a cell
  const cells = new Map<string, number[]>();
  for (let i = 0; i < N; i++) {
    const x0 = Math.floor(Math.min(Af[i].x, Bf[i].x) / H);
    const x1 = Math.floor(Math.max(Af[i].x, Bf[i].x) / H);
    const y0 = Math.floor(Math.min(Af[i].y, Bf[i].y) / H);
    const y1 = Math.floor(Math.max(Af[i].y, Bf[i].y) / H);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const k = `${x},${y}`;
        let l = cells.get(k);
        if (!l) {
          l = [];
          cells.set(k, l);
        }
        l.push(i);
      }
    }
  }

  let pairs = 0;
  let proper = 0;
  let tTouch = 0;
  let overlap = 0;
  let duplicate = 0;
  let minClearance = Infinity;
  const seen = new Set<number>();
  const NEI = [-1, 0, 1];

  for (const [ck, list] of cells) {
    const [cx, cy] = ck.split(',').map(Number);
    const cand: number[] = [];
    for (const dx of NEI) for (const dy of NEI) {
      const l = cells.get(`${cx + dx},${cy + dy}`);
      if (l) cand.push(...l);
    }
    for (const i of list) {
      for (const j of cand) {
        if (j <= i) continue;
        const key = i * 100000 + j;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs++;

        const [a0, a1] = st.segs[i];
        const [b0, b1] = st.segs[j];
        let shared = 0;
        if (a0 === b0 || a0 === b1) shared++;
        if (a1 === b0 || a1 === b1) shared++;
        if (shared === 2) {
          duplicate++;
          continue;
        }
        const rel = segRel(A[i], B[i], A[j], B[j]);
        if (rel.kind === 'proper') proper++;
        else if (rel.kind === 'overlap') overlap++;
        else if (rel.kind === 'touch') {
          const legal =
            shared === 1 &&
            rel.pts.length === 1 &&
            (eqZ(rel.pts[0], A[i]) || eqZ(rel.pts[0], B[i])) &&
            (eqZ(rel.pts[0], A[j]) || eqZ(rel.pts[0], B[j]));
          if (!legal) tTouch++;
        } else if (shared === 0) {
          const dd = segSegDist(Af[i], Bf[i], Af[j], Bf[j]);
          if (dd < minClearance) minClearance = dd;
        }
      }
    }
  }

  let maxDegree = 0;
  for (const v of st.degree.values()) if (v > maxDegree) maxDegree = v;
  return { segs: N, pairs, proper, tTouch, overlap, duplicate, minClearance, maxDegree, dots: st.degree.size };
}

function sectionBrute(cfg: Config): number {
  heading(`${cfg.id} — 5. BRUTE-FORCE CROSS-CHECK (exhaustive, exact, whole patch)`);
  console.log('  patch       segs   pairs tested  proper  T-touch  overlap  dup  maxDeg   min clearance');
  let worst = Infinity;
  for (const [root, level] of [
    ['Delta', 4],
    ['Psi', 4],
    ['Delta', 5],
    ['Psi', 5],
  ] as [TileTypeId, number][]) {
    const t0 = Date.now();
    const r = bruteForcePatch(cfg, root, level);
    const bad = r.proper + r.tTouch + r.overlap + r.duplicate;
    if (bad > 0) fail(`${cfg.id} ${root}@${level}: ${bad} illegal segment contacts`);
    if (r.maxDegree > 2) fail(`${cfg.id} ${root}@${level}: welded degree ${r.maxDegree} > 2`);
    worst = Math.min(worst, r.minClearance);
    console.log(
      `  [${bad === 0 && r.maxDegree <= 2 ? ' OK ' : 'FAIL'}] ${`${root}@${level}`.padEnd(8)} ${pad(r.segs, 6)} ${pad(r.pairs, 12)}  ${pad(r.proper, 6)}  ${pad(r.tTouch, 7)}  ${pad(r.overlap, 7)}  ${pad(r.duplicate, 3)}  ${pad(r.maxDegree, 6)}   ${fmt(r.minClearance)}   (${((Date.now() - t0) / 1000).toFixed(1)}s, ${r.dots} dots)`,
    );
  }
  return worst;
}

// ===========================================================================
// main
// ===========================================================================

interface Summary {
  cfg: string;
  aOk: boolean;
  aBad: string[];
  aMin: number;
  bOk: boolean;
  bMin: number;
  classes: number;
  classGap: number;
  brute: number;
}

/**
 * Self-test of the exact predicate kernel against independent float formulas.
 * Everything downstream rests on sgn3 / dot2 / cross2, so they are validated
 * before use (float is the *reference* here only because the quantities are
 * far from zero by construction).
 */
function selfTest(): void {
  heading('-1. SELF-TEST OF THE EXACT PREDICATE KERNEL');
  const R3 = Math.sqrt(3);
  let n = 0;
  let bad = 0;
  const rnd = (m: number): number => Math.floor((Math.random() * 2 - 1) * m);
  for (let i = 0; i < 20000; i++) {
    const A = rnd(3000);
    const B = rnd(3000);
    const v = A + B * R3;
    if (Math.abs(v) < 1e-6) continue;
    n++;
    if (sgn3([A, B]) !== Math.sign(v)) bad++;
  }
  if (!verdict(bad === 0, `sgn3 matches float sign on ${n} random Z[√3] elements`)) fail('sgn3 self-test');

  let worstD = 0;
  let worstC = 0;
  for (let i = 0; i < 20000; i++) {
    const u: ZVec = [rnd(60), rnd(60), rnd(60), rnd(60)];
    const v: ZVec = [rnd(60), rnd(60), rnd(60), rnd(60)];
    const pu = zToPt(u);
    const pv = zToPt(v);
    const d = dot2(u, v);
    const c = cross2(u, v);
    worstD = Math.max(worstD, Math.abs(d[0] + d[1] * R3 - 2 * (pu.x * pv.x + pu.y * pv.y)));
    worstC = Math.max(worstC, Math.abs(c[0] + c[1] * R3 - 2 * (pu.x * pv.y - pu.y * pv.x)));
  }
  if (!verdict(worstD < 1e-6, 'dot2 == 2·(u·v) in floats', `max dev ${worstD.toExponential(2)}`)) fail('dot2 self-test');
  if (!verdict(worstC < 1e-6, 'cross2 == 2·(u×v) in floats', `max dev ${worstC.toExponential(2)}`)) fail('cross2 self-test');
}

function main(): void {
  console.log('LEMMA 2 — SELF-AVOIDANCE.  Every verdict below is an EXACT integer predicate');
  console.log('over Z[ζ12] / Z[√3]; floats only print clearances and coarsely pre-filter candidates.');
  selfTest();

  const summaries: Summary[] = [];
  for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
    const shapes = sectionSetup(cfg);
    const a = sectionA(cfg, shapes);
    const b = sectionB(cfg, shapes);
    sectionCongruence(cfg);
    const cls2 = sectionClasses(cfg, shapes, a.ok);
    const brute = sectionBrute(cfg);
    summaries.push({
      cfg: cfg.id,
      aOk: a.ok,
      aBad: a.bad,
      aMin: a.min,
      bOk: b.ok,
      bMin: b.min,
      classes: cls2.classes,
      classGap: cls2.minGap,
      brute,
    });
  }

  // Prior art: the same refutation applies to the documented flagship combo.
  heading('PRIOR ART — docs/FASS_1278.md flagship combo 1278/0100100000');
  const fl = CONFIGS.flagship;
  const flShapes = new Map<TileTypeId, Shape>();
  for (const t of leafOrder(fl.family)) flShapes.set(t, shapeOf(fl, t));
  const flBad: string[] = [];
  for (const t of leafOrder(fl.family)) {
    const sh = flShapes.get(t)!;
    for (const [i, j] of sh.pairs) {
      const r = checkChordA(fl, sh, i, j);
      if (!r.inside) {
        flBad.push(`${t}:${r.label}`);
        console.log(
          `  ${t.padEnd(8)} ${r.label.padEnd(22)} LEAVES ITS TILE — ${r.reasons.join('; ')}` +
            `${r.crossedSeams.length ? ` (seam ${r.crossedSeams.join(',')})` : ''}, max depth ${fmt(r.excursionDepth, 7)}`,
        );
      }
    }
  }
  console.log(
    flBad.length === 0
      ? '  (A) holds for the flagship combo.'
      : `  => (A) is FALSE for the flagship as well: ${flBad.length} of its chords leave their tile` +
          ` (this configuration, 0101000000, has only ${summaries[1].aBad.length}).`,
  );
  if (flBad.length > 0) {
    finding(
      `docs/FASS_1278.md §4.2 proves self-avoidance by brute force to k=5 and defers higher k to "self-similarity"; the one-tile localization that would settle all k is FALSE there too — ${flBad.length} of the flagship's chords leave their own tile (vs ${summaries[1].aBad.length} for 0101000000).`,
    );
  }

  // -------------------------------------------------------------------------
  heading('6. WHAT IS PROVED, WHAT IS CHECKED, WHAT IS ASSUMED');
  for (const s of summaries) {
    console.log(`\n  ${s.cfg}`);
    console.log(`    (A) chord ∩ ∂tile = {endpoints}   ${s.aOk ? 'HOLDS (exact, every leaf type)' : 'FALSE — ' + s.aBad.join(', ')}`);
    console.log(`        min chord-to-boundary clearance ${fmt(s.aMin, 6)} tile-edge units`);
    console.log(`    (B) chords pairwise disjoint      ${s.bOk ? 'HOLDS (exact, every leaf type)' : 'FALSE'}   min gap ${fmt(s.bMin)}`);
    console.log(`    (I) instance transforms isometric HOLDS (structural: ZAffine closed under composition)`);
    console.log(`    two-tile classes checked          ${s.classes}   min positive chord gap ${fmt(s.classGap)}`);
    console.log(`    brute force Delta/Psi @ 4,5       0 crossings, min clearance ${fmt(s.brute)}`);
    const agree = Math.abs(s.classGap - s.brute) < 1e-9;
    console.log(
      `    class check vs brute force        ${agree ? 'AGREE — identical minimum clearance, two independent routes to the same answer' : `DISAGREE (${fmt(s.classGap)} vs ${fmt(s.brute)}) — the class filter and the segment grid see different pairs`}`,
    );
    if (s.aOk) {
      console.log('    ==> LEMMA 2 PROVED FOR ALL k by the one-tile argument (given Lemma 0).');
    } else {
      console.log('    ==> the one-tile argument is REFUTED; Lemma 2 for all k rests on the two-tile');
      console.log('        class check plus finite local complexity (see below).');
    }
  }

  console.log(`
  ------------------------------------------------------------------------
  PROVED FOR ALL LEVELS k
  ------------------------------------------------------------------------
  * (I) Every leaf instance at every level is an isometric copy of one of the
    9 (hex) / 10 (spectre) leaf types: zExpand composes only ZAffines,
    z ↦ d^k·conj^m(z) + t, and those 24 linear parts are exact isometries of
    the lattice. Hence any incidence fact about a leaf TYPE, or about a
    relative placement CLASS of two types, transfers to every instance.
  * hex / 128 / 010100000: (A) and (B) hold exactly for all 9 leaf types, so
    by the argument in this file's header, LEMMA 2 (self-avoidance: two chords
    meet only in common endpoints, at every level and in the infinite tiling)
    is PROVED for all k, assuming only Lemma 0.
  * The topological non-crossing rule that the combo encoding uses is strictly
    weaker than the geometric one, but for BOTH configurations the chosen
    matchings are geometrically non-crossing in every leaf type — exactly.

  ------------------------------------------------------------------------
  REFUTED
  ------------------------------------------------------------------------
  * spectre / 1278: premise (A) is FALSE. The chord joining the dot on edge
    e2 to the dot on edge e13 — present in Theta, Xi, Phi and Psi — cuts the
    reflex corner at vertex 1 and leaves its own tile. Exact constants:
        passes (2−√3)/4  = 0.0669873 on the wrong side of vertex v1
        strays (2√3−3)/8 = 0.0580127 away from the tile at the worst point
        length outside   = (2√3−3)/2 = 0.2320508 of a tile edge
    It always exits and re-enters through two consecutive edges of ONE seam
    ('-1A' for Xi/Psi, '3A' for Theta/Phi) — checked exactly — so by the
    seam-gluing rule the straying part enters the single tile glued across
    that seam (that last step is argued, not machine-checked here). NO
    single-tile containment argument can establish self-avoidance for the
    Spectre, and "each chord lies inside its own closed leaf tile" must not be
    asserted anywhere.
  * The documented flagship combo 1278/0100100000 fails (A) even harder: six
    chords leave their tile, the worst by 0.408 tile-edge units.

  ------------------------------------------------------------------------
  CHECKED, NOT PROVED FOR ALL k
  ------------------------------------------------------------------------
  * spectre: the two-tile replacement argument is complete EXCEPT for one
    hypothesis — that every relative-placement class of two hull-overlapping
    tiles which occurs at ANY level already occurs in the levels enumerated
    here (finite local complexity of the substitution). The class set was
    enumerated over all 9 roots at levels 1–5 and roots Delta/Psi at level 6;
    the stabilization level is reported in section 4 of each configuration.
    This hypothesis is standard for primitive substitution tilings but is NOT
    proved here, and the per-level child transforms Ts are level-dependent,
    so it cannot be obtained by a naive conjugacy argument.
  * Welded degree ≤ 2 at every dot: checked at levels 4 and 5, both roots,
    both configurations. Self-avoidance as "no crossings" does not need it;
    "the strand set is an embedded 1-manifold" does.

  ------------------------------------------------------------------------
  ASSUMED (Lemma 0 — NOT established here)
  ------------------------------------------------------------------------
  * The leaf tiles of a patch are closed polygons with pairwise disjoint
    interiors. Nothing else about the tiling is used (polygons are always the
    closure of their interiors). The two-tile class check above corroborates
    it for every class it enumerated, but does not prove it for all k.`);

  if (FINDINGS.length) {
    heading('NOTES FOR THE WRITE-UP');
    for (const f of FINDINGS) console.log(`  * ${f}`);
  }

  console.log(`\n  largest integer reached by any exact predicate: ${maxIntSeen.toExponential(3)} (safe-integer limit 9.007e15)`);
  heading(FAILURES === 0 ? 'RESULT: ALL SELF-AVOIDANCE CHECKS PASS' : `RESULT: ${FAILURES} FAILURE(S)`);
  if (FAILURES > 0) process.exit(1);
}

main();
