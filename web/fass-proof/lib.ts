/**
 * Shared machinery for the FASS *proof* scripts (docs/FASS_PROOF.md).
 *
 * Differences from `web/fass-investigation/lib.ts`:
 *  - family- and selection-parametric (the investigation lib hard-codes
 *    spectre/1278);
 *  - every position is computed in EXACT `Z[zeta12]` integer arithmetic
 *    (`src/core/exact.ts`), doubled so that edge midpoints stay integral.
 *    Welding therefore compares integers, not floats within an epsilon, so
 *    every adjacency statement below is a theorem about the substitution
 *    system rather than a numerical observation.
 *
 * Builds only on the verified core library; writes nothing outside this dir.
 */

import {
  comboToMatchingIndices,
  connectionPoints,
  enumerateMatchings,
  leafOrder,
  edgeLabels,
  leafPts,
  metaEdges,
  nonCrossingForTile,
  parseEdgeLabel,
  SUPER_RULES,
  zAdd,
  zBasePairXform,
  zConj,
  zKey,
  zRot,
  zLeafPts,
  zMul,
  zSupertileTransforms,
  zToPt,
  Z_IDENT,
  type MetaEdge,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';

// ---------------------------------------------------------------------------
// The configurations under proof
// ---------------------------------------------------------------------------

export interface Config {
  readonly id: string;
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
}

/** The two configurations the owner conjectured, plus the documented twin. */
export const CONFIGS: Readonly<Record<string, Config>> = {
  hex128: { id: 'hex-128-010100000', family: 'hex', subset: [1, 2, 8], combo: '010100000' },
  spectre1278: {
    id: 'spectre-1278-0101000000',
    family: 'spectre',
    subset: [1, 2, 7, 8],
    combo: '0101000000',
  },
  /** The combo already documented in docs/FASS_1278.md, for cross-checking. */
  flagship: {
    id: 'spectre-1278-0100100000',
    family: 'spectre',
    subset: [1, 2, 7, 8],
    combo: '0100100000',
  },
};

export function configOf(name: string): Config {
  const c = CONFIGS[name];
  if (!c) throw new Error(`unknown config ${name}; try ${Object.keys(CONFIGS).join(' | ')}`);
  return c;
}

/** matchingIndexByType record for a config (leafOrder aligned). */
export function matchingRecord(cfg: Config): Record<string, number> {
  const idxs = comboToMatchingIndices(cfg.family, cfg.subset, cfg.combo);
  const rec: Record<string, number> = {};
  leafOrder(cfg.family).forEach((t, i) => {
    rec[t] = idxs[i];
  });
  return rec;
}

/** The chosen matching of a leaf type, as index pairs into its active dots. */
export function chosenMatching(cfg: Config, type: TileTypeId): readonly (readonly [number, number])[] {
  const n = connectionPoints(cfg.family, type, new Set(cfg.subset)).length;
  const rec = matchingRecord(cfg);
  return enumerateMatchings(n)[rec[type] ?? 0] ?? [];
}

/**
 * Seams of a leaf type that actually carry a connection dot, in the SAME order
 * as `connectionPoints` (physical-label order of the `minor == 0` labels).
 *
 * A selected class is not enough: Gamma1's class-2 seam is PARTIAL (it holds
 * only the label `2.2A`, the rest of that seam living on Gamma2), so it has no
 * `minor == 0` label and contributes no dot. Filtering on the class alone
 * over-reports Gamma1 by one seam and misaligns every matching index after it.
 */
export function activeSeams(cfg: Config, type: TileTypeId): readonly MetaEdge[] {
  const sel = new Set(cfg.subset);
  const labels = edgeLabels(cfg.family, type);
  const seams = metaEdges(cfg.family, type);
  const out: MetaEdge[] = [];
  for (let i = 0; i < labels.length; i++) {
    const { major, minor } = parseEdgeLabel(labels[i]);
    if (minor !== 0 || !sel.has(major)) continue;
    const seam = seams.find((s) => s.edgeIndices.includes(i));
    if (seam) out.push(seam);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Exact connection points (doubled)
// ---------------------------------------------------------------------------

/**
 * 2x the tile-local connection point of each active seam, in `Z[zeta12]`, in
 * the same cyclic order as `connectionPoints()`.
 *
 * Only classes 1..8 are handled: their DEFAULT_CONTRACT is the midpoint of the
 * seam's `minor == 0` physical edge, so twice it is `v[i] + v[i+1]` — integral.
 * Class 0 (the self-gluing seam, whose contract is a vertex) never appears in
 * the selections proved here and is rejected loudly.
 */
export function zConnectionPoints2(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
): readonly ZVec[] {
  const sel = new Set(subset);
  const labels = edgeLabels(family, type);
  const zpts = zLeafPts(family, type);
  const n = zpts.length;
  const seams = metaEdges(family, type);
  const out: ZVec[] = [];
  // Mirrors core `connectionPoints` EXACTLY: physical-label order, one dot per
  // `minor == 0` label of a selected class. That order is load-bearing — the
  // combo digits index matchings defined against it.
  for (let i = 0; i < labels.length; i++) {
    const { major, minor } = parseEdgeLabel(labels[i]);
    if (minor !== 0 || !sel.has(major)) continue;
    if (major !== 0) {
      // Classes 1..8 use DEFAULT_CONTRACTS (minor 0, t = 1/2): the midpoint of
      // this physical edge. t = 1/2 is the fixed point of the gluing involution
      // t -> 1 - t, which is exactly why abutting tiles' dots coincide.
      out.push(zAdd(zpts[i], zpts[(i + 1) % n]));
      continue;
    }
    // Class 0 glues to itself, so core forces its contract to the seam CENTRE:
    // u = M/2 in edge units. A one-edge seam (hexagons) centres on the edge
    // midpoint; a two-edge seam (spectre) centres on the vertex between them,
    // which core writes canonically as (minor 0, t = 1).
    const seam = seams.find((e) => e.edgeIndices.includes(i));
    const M = seam ? seam.edgeIndices.length : 1;
    if (M % 2 === 0) {
      // Centre falls on a vertex: minor M/2 - 1 at t = 1, i.e. the far end of
      // that edge. Doubling keeps it integral.
      const idx = seam!.edgeIndices[M / 2 - 1];
      const v = zpts[(idx + 1) % n];
      out.push(zAdd(v, v));
    } else {
      const idx = seam!.edgeIndices[(M - 1) / 2];
      out.push(zAdd(zpts[idx], zpts[(idx + 1) % n]));
    }
  }
  return out;
}

/**
 * Apply a `ZAffine` to a DOUBLED lattice point and return the doubled image:
 * `2*T(p) = d^k conj^m(2p) + 2t`. Using `zApply` directly on a doubled point
 * would add an undoubled translation — the doubling has to be carried through.
 */
export function zApply2(T: ZAffine, q2: ZVec): ZVec {
  const lin = zRot(T.m ? zConj(q2) : q2, T.k);
  return zAdd(lin, zAdd(T.t, T.t));
}

/** Sanity bridge: the exact doubled points agree with the float core ones. */
export function checkExactMatchesFloat(cfg: Config, type: TileTypeId): number {
  const f = connectionPoints(cfg.family, type, new Set(cfg.subset)).map((c) => c.pt);
  const z = zConnectionPoints2(cfg.family, type, cfg.subset).map(zToPt);
  let worst = 0;
  for (let i = 0; i < f.length; i++) {
    worst = Math.max(worst, Math.hypot(z[i].x / 2 - f[i].x, z[i].y / 2 - f[i].y));
  }
  return worst;
}

// ---------------------------------------------------------------------------
// Exact patch expansion
// ---------------------------------------------------------------------------

export interface ZInstance {
  readonly type: TileTypeId;
  readonly xform: ZAffine;
  /** Path of child slots from the root, e.g. '3.7.0'. */
  readonly id: string;
}

/**
 * Exact twin of `flatten(buildSystem(family, level)[root])`.
 *
 * `zSupertileTransforms(family, L)` maps a level-(L-1) child frame into its
 * level-L parent frame, so expanding a level-`level` root walks L down to 1.
 * The composite `Gamma` leaf of the non-hex families is expanded last, via the
 * base pair transform.
 */
export function zExpand(
  family: TileFamilyId,
  root: TileTypeId,
  level: number,
): readonly ZInstance[] {
  const out: ZInstance[] = [];
  const walk = (type: TileTypeId, xform: ZAffine, lv: number, id: string): void => {
    if (lv > 0) {
      const Ts = zSupertileTransforms(family, lv);
      const subs = SUPER_RULES[type];
      if (!subs) throw new Error(`no substitution rule for ${type}`);
      for (let slot = 0; slot < 8; slot++) {
        if (subs[slot] === 'null') continue;
        walk(
          subs[slot] as TileTypeId,
          zMul(xform, Ts[slot]),
          lv - 1,
          id === '' ? String(slot) : `${id}.${slot}`,
        );
      }
      return;
    }
    if (family !== 'hex' && type === 'Gamma') {
      // The composite Mystic: Gamma1 in place, Gamma2 rotated onto it.
      out.push({ type: 'Gamma1', xform, id: id === '' ? '0' : `${id}.0` });
      out.push({
        type: 'Gamma2',
        xform: zMul(xform, basePairXform(family)),
        id: id === '' ? '1' : `${id}.1`,
      });
      return;
    }
    out.push({ type, xform, id });
  };
  walk(root, Z_IDENT, level, '');
  return out;
}

function basePairXform(family: TileFamilyId): ZAffine {
  const x = zBasePairXform(family);
  if (!x) throw new Error(`family ${family} has no composite Gamma`);
  return x;
}

// ---------------------------------------------------------------------------
// Exact strand graph
// ---------------------------------------------------------------------------

export interface Strands {
  /** segs[i] = [dotKeyA, dotKeyB]; both are exact keys. */
  readonly segs: readonly (readonly [string, string])[];
  /** instances[instOf[i]] owns segs[i]. */
  readonly instOf: readonly number[];
  readonly instances: readonly ZInstance[];
  /** exact key -> doubled lattice point */
  readonly coord: ReadonlyMap<string, ZVec>;
  readonly degree: ReadonlyMap<string, number>;
}

/** Build the welded strand graph of a patch, exactly. */
export function buildStrands(cfg: Config, instances: readonly ZInstance[]): Strands {
  const rec = matchingRecord(cfg);
  const localCache = new Map<string, { pairs: readonly (readonly [number, number])[]; pts: readonly ZVec[] }>();
  const segs: (readonly [string, string])[] = [];
  const instOf: number[] = [];
  const coord = new Map<string, ZVec>();
  const degree = new Map<string, number>();

  for (let ii = 0; ii < instances.length; ii++) {
    const inst = instances[ii];
    let local = localCache.get(inst.type);
    if (!local) {
      const pts = zConnectionPoints2(cfg.family, inst.type, cfg.subset);
      const pairs = pts.length >= 2 && pts.length % 2 === 0
        ? enumerateMatchings(pts.length)[rec[inst.type] ?? 0] ?? []
        : [];
      local = { pairs, pts };
      localCache.set(inst.type, local);
    }
    for (const [a, b] of local.pairs) {
      const pa = zApply2(inst.xform, local.pts[a]);
      const pb = zApply2(inst.xform, local.pts[b]);
      const ka = zKey(pa);
      const kb = zKey(pb);
      coord.set(ka, pa);
      coord.set(kb, pb);
      degree.set(ka, (degree.get(ka) ?? 0) + 1);
      degree.set(kb, (degree.get(kb) ?? 0) + 1);
      segs.push([ka, kb]);
      instOf.push(ii);
    }
  }
  return { segs, instOf, instances, coord, degree };
}

export interface Component {
  /** Indices into `segs`, in path order. */
  readonly segIdxs: readonly number[];
  readonly closed: boolean;
  /** Distinct tiles the component passes through. */
  readonly tiles: ReadonlySet<number>;
  readonly endpoints: readonly string[];
}

export interface Trace {
  readonly arcs: readonly Component[];
  readonly circuits: readonly Component[];
  readonly maxDegree: number;
  readonly junctions: number;
  readonly tilesCovered: number;
}

/** Decompose the strand graph into paths and cycles. */
export function trace(s: Strands): Trace {
  const adj = new Map<string, { seg: number; other: string }[]>();
  for (let i = 0; i < s.segs.length; i++) {
    const [a, b] = s.segs[i];
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ seg: i, other: b });
    adj.get(b)!.push({ seg: i, other: a });
  }
  let maxDegree = 0;
  let junctions = 0;
  for (const list of adj.values()) {
    if (list.length > maxDegree) maxDegree = list.length;
    if (list.length > 2) junctions++;
  }

  const used = new Array<boolean>(s.segs.length).fill(false);
  const arcs: Component[] = [];
  const circuits: Component[] = [];

  const walk = (startKey: string, startSeg: number, closed: boolean): Component => {
    const segIdxs: number[] = [];
    const tiles = new Set<number>();
    let cur = startKey;
    let seg = startSeg;
    for (;;) {
      used[seg] = true;
      segIdxs.push(seg);
      tiles.add(s.instOf[seg]);
      const [a, b] = s.segs[seg];
      const next = a === cur ? b : a;
      if (next === startKey) return { segIdxs, closed: true, tiles, endpoints: [] };
      const cont = (adj.get(next) ?? []).filter((x) => !used[x.seg]);
      if ((adj.get(next)?.length ?? 0) !== 2 || cont.length !== 1) {
        return { segIdxs, closed, tiles, endpoints: [startKey, next] };
      }
      cur = next;
      seg = cont[0].seg;
    }
  };

  for (const [key, list] of adj) {
    if (list.length === 2) continue;
    for (const x of list) {
      if (used[x.seg]) continue;
      arcs.push(walk(key, x.seg, false));
    }
  }
  for (let i = 0; i < s.segs.length; i++) {
    if (used[i]) continue;
    circuits.push(walk(s.segs[i][0], i, true));
  }

  const covered = new Set<number>();
  for (const c of [...arcs, ...circuits]) for (const t of c.tiles) covered.add(t);

  arcs.sort((a, b) => b.segIdxs.length - a.segIdxs.length);
  circuits.sort((a, b) => b.segIdxs.length - a.segIdxs.length);
  return { arcs, circuits, maxDegree, junctions, tilesCovered: covered.size };
}

// ---------------------------------------------------------------------------
// Small reporting helpers
// ---------------------------------------------------------------------------

export function pad(s: unknown, n: number): string {
  return String(s).padStart(n);
}

export function heading(title: string): void {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`);
}

export function verdict(ok: boolean, label: string, detail = ''): boolean {
  console.log(`  [${ok ? ' OK ' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}

/** Float geometry of a leaf type's chords, for the geometric checks. */
export function floatChords(cfg: Config, type: TileTypeId): readonly (readonly [Pt, Pt])[] {
  const pts = connectionPoints(cfg.family, type, new Set(cfg.subset)).map((c) => c.pt);
  return chosenMatching(cfg, type).map(([a, b]) => [pts[a], pts[b]] as const);
}

export function leafPolygon(cfg: Config, type: TileTypeId): readonly Pt[] {
  return leafPts(cfg.family, type);
}

export function ncOptionCount(cfg: Config, type: TileTypeId): number {
  return nonCrossingForTile(cfg.family, type, new Set(cfg.subset)).length;
}
