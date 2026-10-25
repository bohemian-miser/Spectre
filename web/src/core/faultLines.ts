/**
 * Where a rule's circuits form, in supertile terms, so that different rules
 * (and different pairings of one rule) can be compared by *place* rather than
 * by shape.
 *
 * Every tile of a level-L patch has an address: the path of child positions
 * down the substitution tree, e.g. '3.7.0.2.5'. Two tiles' addresses share a
 * prefix of length p exactly when the smallest supertile holding both is of
 * level L − p. So every seam between two tiles has a *seam level*: the level
 * of the smallest supertile it lies inside. The level-k seams are the fault
 * lines along which the level-(k−1) supertiles meet, and the triangles you see
 * sit along them.
 *
 * A strand is connected, so the smallest supertile holding all of it is
 * reached by crossing seams, and its *level* is the highest seam level it
 * crosses. Circuits that stay inside a level-1 supertile have level 1; open
 * strands (they leave the patch) get level L + 1. In group terms: the address
 * tree is the tree the self-similar structure acts on, each crossing is the
 * gluing involution τ acting at that seam's depth, and a circuit's level is how
 * far up the tree its orbit under ⟨σ, τ⟩ reaches. A rule has bounded circuits
 * exactly when the levels stay bounded as L grows.
 *
 * Comparing two pairings, of one rule or of different rules on the same
 * family: the tiles are the same, so for each level k compare the sets of
 * tiles whose strands reach level k (Jaccard), optionally coarse-grained to
 * supertiles so "roughly the same spot" counts.
 *
 * Pure: no DOM, no workers.
 */

import { buildSystem, flatten } from './tiles';
import {
  buildStrandGraph,
  rasterizeComponents,
  strandComponents,
  strandWorkspace,
  thumbFrame,
  type StrandComponents,
  type StrandGraph,
  type StrandPalette,
  type StrandWorkspace,
} from './strandGraph';
import type { TileFamilyId } from './families';
import { comboDigitValue } from './matchings';

/** Rule-independent addressing of a level-L Delta patch (the tiles `buildStrandGraph` uses, in its order). */
export interface PatchAddresses {
  readonly family: TileFamilyId;
  readonly level: number;
  readonly nTiles: number;
  /**
   * `ancestor[d][t]`: index of tile t's level-d supertile (d = 0 is the tile
   * itself, d = L the whole patch). Indices are dense per d.
   */
  readonly ancestor: readonly Int32Array[];
  /** Number of distinct level-d supertiles. */
  readonly ancestorCount: readonly number[];
}

const addressCache = new Map<string, PatchAddresses>();

export function patchAddresses(family: TileFamilyId, level: number): PatchAddresses {
  const key = `${family}/${level}`;
  const hit = addressCache.get(key);
  if (hit) return hit;
  const insts = flatten(buildSystem(family, level)['Delta']);
  const n = insts.length;
  const parts = insts.map((i) => (i.id ? i.id.split('.') : []));
  const ancestor: Int32Array[] = [];
  const ancestorCount: number[] = [];
  for (let d = 0; d <= level; d++) {
    const arr = new Int32Array(n);
    const ids = new Map<string, number>();
    for (let t = 0; t < n; t++) {
      // The level-d supertile is named by the first L − d steps of the path
      // (Gamma1 and Gamma2 carry one step more, the halves of their Gamma).
      const p = d === 0 ? String(t) : parts[t].slice(0, level - d).join('.');
      let v = ids.get(p);
      if (v === undefined) {
        v = ids.size;
        ids.set(p, v);
      }
      arr[t] = v;
    }
    ancestor.push(arr);
    ancestorCount.push(ids.size);
  }
  const out = { family, level, nTiles: n, ancestor, ancestorCount };
  addressCache.set(key, out);
  return out;
}

/** Level of the smallest supertile holding both tiles (0 when a = b). */
export function sharedLevel(addr: PatchAddresses, a: number, b: number): number {
  for (let d = 0; d <= addr.level; d++) if (addr.ancestor[d][a] === addr.ancestor[d][b]) return d;
  return addr.level;
}

/** Per strand-graph node: the seam level it sits on (L + 1 on the patch boundary). */
export interface SeamLevels {
  readonly nodeLevel: Uint8Array;
  /** Tile of each occurrence. */
  readonly occTile: Int32Array;
  /** How many crossings sit on seams of each level (index 0..L+1). */
  readonly perLevel: readonly number[];
}

const seamCache = new WeakMap<StrandGraph, SeamLevels>();

export function seamLevels(g: StrandGraph, addr: PatchAddresses): SeamLevels {
  const hit = seamCache.get(g);
  if (hit) return hit;
  if (addr.nTiles !== g.nTiles) throw new Error('seamLevels: patch and strand graph differ');
  const L = g.level;
  const occTile = new Int32Array(g.occNode.length);
  for (let t = 0; t < g.nTiles; t++) for (let o = g.tileOcc[t]; o < g.tileOcc[t + 1]; o++) occTile[o] = t;
  const nodeLevel = new Uint8Array(g.nNodes);
  const perLevel = new Array<number>(L + 2).fill(0);
  for (let n = 0; n < g.nNodes; n++) {
    const s = g.nodeOccStart[n];
    const e = g.nodeOccStart[n + 1];
    let lv = 0;
    if (e - s < 2) lv = L + 1;
    else {
      const t0 = occTile[g.nodeOcc[s]];
      for (let k = s + 1; k < e; k++) lv = Math.max(lv, sharedLevel(addr, t0, occTile[g.nodeOcc[k]]));
    }
    nodeLevel[n] = lv;
    perLevel[lv]++;
  }
  const out = { nodeLevel, occTile, perLevel };
  seamCache.set(g, out);
  return out;
}

/**
 * Length, in segments, of a curve that just spans the patch: λ^L, with λ the
 * linear inflation per level (√ of the tile-count ratio).
 */
export function patchSpan(addr: PatchAddresses): number {
  const L = addr.level;
  const ratio = L >= 1 ? addr.ancestorCount[0] / addr.ancestorCount[1] : 1;
  return Math.pow(Math.sqrt(ratio), L);
}

/** No strand shorter than this many segments is big, however small the patch. */
export const BIG_MIN = 16;

/** Strands at least this share of the longest one are in band 3, 2, 1 (the thumbnails' colour bands). */
export const FAULT_BANDS = [1 / 40, 1 / 8, 1 / 2] as const;

/** One pairing, placed. */
export interface FaultPlacement {
  readonly level: number;
  /**
   * Per tile: the biggest band of any strand through it: 3 for strands at
   * least half the longest, 2 for an eighth, 1 for a fortieth, 0 otherwise
   * (or no strand at all). Bands are relative to this pairing's own longest
   * strand (or `patchSpan`, if that is longer), so one rule's big circuits
   * compare with another rule's big ones while small circuits stay small.
   */
  readonly tileBand: Uint8Array;
  /** Longest strand, closed or not, in segments. */
  readonly longest: number;
  /**
   * Per seam level s (index 0..L+1): how much likelier a crossing on a level-s
   * seam is to be on a big strand (band ≥ 2) than a crossing picked at random.
   * Above 1 means the big strands follow that level's fault lines. NaN when
   * the level has no crossings or there are no big strands.
   */
  readonly faultAffinity: readonly number[];
}

/**
 * Each component's band (see {@link FaultPlacement.tileBand}). Bands are
 * relative to the longest strand, but never to less than a curve that just
 * spans the patch, and nothing shorter than an eighth of that span (or
 * {@link BIG_MIN}) counts as big at all, so a rule whose circuits stay small
 * has no big ones.
 */
export function componentBands(c: StrandComponents, addr: PatchAddresses): { band: Uint8Array; longest: number } {
  let longest = 0;
  for (let k = 0; k < c.n; k++) if (c.segs[k] > longest) longest = c.segs[k];
  const span = patchSpan(addr);
  const ref = Math.max(longest, span);
  const floor = Math.max(span * FAULT_BANDS[1], BIG_MIN);
  const band = new Uint8Array(c.n);
  for (let k = 0; k < c.n; k++) {
    const len = c.segs[k];
    const r = len / ref;
    band[k] = len < floor ? 0 : r >= FAULT_BANDS[2] ? 3 : r >= FAULT_BANDS[1] ? 2 : r >= FAULT_BANDS[0] ? 1 : 0;
  }
  return { band, longest };
}

export function placeStrands(
  g: StrandGraph,
  addr: PatchAddresses,
  digits: readonly number[],
  ws?: StrandWorkspace,
): FaultPlacement {
  const L = g.level;
  const seams = seamLevels(g, addr);
  const c = strandComponents(g, digits, ws);
  const { band, longest } = componentBands(c, addr);

  const tileBand = new Uint8Array(g.nTiles);
  for (let o = 0; o < g.occNode.length; o++) {
    const t = seams.occTile[o];
    const b = band[c.comp[g.occNode[o]]];
    if (b > tileBand[t]) tileBand[t] = b;
  }

  const on = new Array<number>(L + 2).fill(0);
  const big = new Array<number>(L + 2).fill(0);
  let bigAll = 0;
  for (let n = 0; n < g.nNodes; n++) {
    const s = seams.nodeLevel[n];
    on[s]++;
    if (band[c.comp[n]] >= 2) {
      big[s]++;
      bigAll++;
    }
  }
  const base = bigAll / Math.max(1, g.nNodes);
  const faultAffinity = on.map((v, i) => (v && bigAll ? big[i] / v / base : NaN));
  return { level: L, tileBand, longest, faultAffinity };
}

/**
 * Packed tile sets for fast comparison: `bits[i]` holds the (coarse-grained)
 * cells holding a strand of band ≥ `bands[i]`. Grain c compares level-c
 * supertiles instead of tiles, so "roughly the same spot" counts.
 */
export interface FaultSignature {
  readonly grain: number;
  readonly bands: readonly number[];
  readonly bits: readonly Uint32Array[];
  readonly counts: readonly number[];
}

export function faultSignature(p: FaultPlacement, addr: PatchAddresses, grain = 0): FaultSignature {
  const g = Math.max(0, Math.min(grain, p.level - 1));
  const cell = addr.ancestor[g];
  const words = Math.ceil(addr.ancestorCount[g] / 32);
  const bands = [1, 2, 3];
  const bits: Uint32Array[] = [];
  const counts: number[] = [];
  for (const k of bands) {
    const b = new Uint32Array(words);
    for (let t = 0; t < p.tileBand.length; t++) {
      if (p.tileBand[t] < k) continue;
      const i = cell[t];
      b[i >>> 5] |= 1 << (i & 31);
    }
    let n = 0;
    for (let w = 0; w < words; w++) n += popcount(b[w]);
    bits.push(b);
    counts.push(n);
  }
  return { grain: g, bands, bits, counts };
}

function popcount(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** Per band, Jaccard of the two placements' cell sets (NaN when both are empty). */
export function levelAgreement(a: FaultSignature, b: FaultSignature): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.bits.length; i++) {
    const x = a.bits[i];
    const y = b.bits[i];
    let inter = 0;
    for (let w = 0; w < x.length; w++) inter += popcount(x[w] & y[w]);
    const union = a.counts[i] + b.counts[i] - inter;
    out.push(union ? inter / union : NaN);
  }
  return out;
}

/**
 * Mean agreement over the bands either placement uses: 1 for identical
 * placement, 0 for disjoint. Two placements with no big strands at all (both
 * bounded) count as identical.
 */
export function faultSimilarity(a: FaultSignature, b: FaultSignature): number {
  const per = levelAgreement(a, b).filter((v) => !Number.isNaN(v));
  return per.length ? per.reduce((s, v) => s + v, 0) / per.length : 1;
}

/** Pairwise similarity matrix, row-major n × n. */
export function similarityMatrix(sigs: readonly FaultSignature[]): Float32Array {
  const n = sigs.length;
  const m = new Float32Array(n * n);
  for (let i = 0; i < n; i++) {
    m[i * n + i] = 1;
    for (let j = i + 1; j < n; j++) {
      const s = faultSimilarity(sigs[i], sigs[j]);
      m[i * n + j] = s;
      m[j * n + i] = s;
    }
  }
  return m;
}

export interface FaultClustering {
  /** Clusters, biggest first, each a list of item indices (most typical first). */
  readonly clusters: readonly (readonly number[])[];
  /** Leaf order of the merge tree, for drawing the matrix with clusters as blocks. */
  readonly order: readonly number[];
}

/**
 * Average-linkage clustering, merging while the two closest groups are at
 * least `threshold` similar. O(n³) but n is a few hundred.
 */
export function clusterBySimilarity(m: Float32Array, n: number, threshold: number): FaultClustering {
  type Group = { items: number[]; order: number[] };
  const groups: (Group | null)[] = Array.from({ length: n }, (_, i) => ({ items: [i], order: [i] }));
  // Pairwise group similarity sums, so average linkage updates in O(n).
  const sum = Float64Array.from(m);
  let clusters: Group[] | null = null;
  for (;;) {
    let best = -1;
    let bi = -1;
    let bj = -1;
    for (let i = 0; i < n; i++) {
      const gi = groups[i];
      if (!gi) continue;
      for (let j = i + 1; j < n; j++) {
        const gj = groups[j];
        if (!gj) continue;
        const avg = sum[i * n + j] / (gi.items.length * gj.items.length);
        if (avg > best) {
          best = avg;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi < 0) break;
    if (best < threshold && !clusters) clusters = groups.filter((g): g is Group => !!g).map((g) => ({ ...g, items: [...g.items] }));
    const a = groups[bi]!;
    const b = groups[bj]!;
    a.items.push(...b.items);
    a.order = [...a.order, ...b.order];
    groups[bj] = null;
    for (let k = 0; k < n; k++) {
      if (!groups[k] || k === bi) continue;
      sum[bi * n + k] += sum[bj * n + k];
      sum[k * n + bi] = sum[bi * n + k];
    }
  }
  const root = groups.find((g): g is Group => !!g);
  const order = root ? root.order : [];
  const final = clusters ?? (root ? [root] : []);
  const pos = new Map(order.map((v, i) => [v, i]));
  const typical = (items: number[]) =>
    [...items].sort((x, y) => {
      const sx = items.reduce((s, j) => s + m[x * n + j], 0);
      const sy = items.reduce((s, j) => s + m[y * n + j], 0);
      return sy - sx || pos.get(x)! - pos.get(y)!;
    });
  return {
    clusters: final.map((g) => typical(g.items)).sort((a, b) => b.length - a.length || pos.get(a[0])! - pos.get(b[0])!),
    order,
  };
}

/**
 * Draw a pairing coloured by band, the way the comparison sees it: band 3 in
 * the palette's strongest colour down to band 1, everything else faint.
 */
export function rasterizeFaultBands(
  g: StrandGraph,
  addr: PatchAddresses,
  digits: readonly number[],
  size: number,
  palette: StrandPalette,
  ws?: StrandWorkspace,
): Uint8ClampedArray {
  const c = strandComponents(g, digits, ws);
  const { band } = componentBands(c, addr);
  const colours = [palette.smallCircuit, palette.bands[2], palette.bands[1], palette.bands[0]];
  return rasterizeComponents(g, c, size, (k) => colours[band[k]], (k) => band[k] * 1e9 + c.segs[k]);
}

/**
 * One digit pattern per rule in a group: the shared digit where every member
 * of that rule agrees, '·' where they differ. Those are the tiles whose
 * pairing does not move the big strands, within this group.
 */
export function sharedDigits(members: readonly { readonly rule: string; readonly combo: string }[]): { rule: string; pattern: string; count: number }[] {
  const by = new Map<string, string[]>();
  for (const m of members) by.set(m.rule, [...(by.get(m.rule) ?? []), m.combo]);
  return [...by].map(([rule, combos]) => ({
    rule,
    count: combos.length,
    pattern: [...combos[0]].map((ch, i) => (combos.every((c) => c[i] === ch) ? ch : '·')).join(''),
  }));
}

export interface FaultSurveyRule {
  readonly subset: readonly number[];
  /** Combination strings to place. */
  readonly combos: readonly string[];
}

export interface FaultSurveyItem {
  readonly rule: string;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly longest: number;
  /** Share of tiles holding a strand of band ≥ 1, ≥ 2, ≥ 3. */
  readonly coverage: readonly number[];
  readonly faultAffinity: readonly number[];
}

export interface FaultSurvey {
  readonly level: number;
  readonly grain: number;
  readonly items: readonly FaultSurveyItem[];
  /** Pairwise {@link faultSimilarity}, row-major items × items. */
  readonly matrix: Float32Array;
}

/**
 * Place every listed pairing of every rule on one level-L patch and compare
 * them all. `onProgress(done, total)` is called after each pairing.
 */
export function surveyFaults(
  family: TileFamilyId,
  level: number,
  rules: readonly FaultSurveyRule[],
  grain: number,
  onProgress?: (done: number, total: number) => void,
): FaultSurvey {
  const addr = patchAddresses(family, level);
  const total = rules.reduce((n, r) => n + r.combos.length, 0);
  const items: FaultSurveyItem[] = [];
  const sigs: FaultSignature[] = [];
  for (const r of rules) {
    const g = buildStrandGraph(family, r.subset, level);
    const ws = strandWorkspace(g);
    for (const combo of r.combos) {
      const p = placeStrands(g, addr, comboDigits(combo, g.types.length), ws);
      const sig = faultSignature(p, addr, grain);
      const coverage = [1, 2, 3].map((k) => {
        let n = 0;
        for (let t = 0; t < p.tileBand.length; t++) if (p.tileBand[t] >= k) n++;
        return n / p.tileBand.length;
      });
      items.push({ rule: r.subset.join(''), subset: r.subset, combo, longest: p.longest, coverage, faultAffinity: p.faultAffinity });
      sigs.push(sig);
      onProgress?.(items.length, total);
    }
  }
  return { level, grain: sigs[0]?.grain ?? grain, items, matrix: similarityMatrix(sigs) };
}

/** A combination string's digits, padded with zeros. */
export function comboDigits(combo: string, length: number): number[] {
  return Array.from({ length }, (_, i) => (i < combo.length ? Math.max(0, comboDigitValue(combo[i])) : 0));
}

/**
 * Draw a pairing as its circuits' centres: a disc per closed circuit at the
 * average of its points, coloured by band like {@link rasterizeFaultBands},
 * biggest first. Sized by the square of the log of its length like the
 * Explorer's dots, but in pixels: at thumbnail scale the world-sized dots
 * would all be specks.
 */
/** Thumbnail dot radius per (log length)², as a share of the thumbnail: about 10px for 30,000 segments at 132px. */
const THUMB_CENTRE = 0.00072;

export function rasterizeFaultCentres(
  g: StrandGraph,
  addr: PatchAddresses,
  digits: readonly number[],
  size: number,
  palette: StrandPalette,
  ws?: StrandWorkspace,
): Uint8ClampedArray {
  const c = strandComponents(g, digits, ws);
  const { band } = componentBands(c, addr);
  const colours = [palette.smallCircuit, palette.bands[2], palette.bands[1], palette.bands[0]];
  const sx = new Float64Array(c.n);
  const sy = new Float64Array(c.n);
  const nodes = new Int32Array(c.n);
  for (let n = 0; n < g.nNodes; n++) {
    const k = c.comp[n];
    sx[k] += g.nodeX[n];
    sy[k] += g.nodeY[n];
    nodes[k]++;
  }
  const { minX, minY, sc, ox, oy } = thumbFrame(g, size);
  const img = new Uint8ClampedArray(size * size * 4);
  const order: number[] = [];
  for (let k = 0; k < c.n; k++) if (c.ends[k] === 0 && c.junc[k] === 0 && c.segs[k] > 1) order.push(k);
  order.sort((a, b) => c.segs[b] - c.segs[a]);
  for (const k of order) {
    const cx = ox + (sx[k] / nodes[k] - minX) * sc;
    const cy = size - oy - (sy[k] / nodes[k] - minY) * sc;
    const l = Math.log(1 + c.segs[k]);
    const r = Math.max(0.6, THUMB_CENTRE * l * l * size);
    const [cr, cg, cb] = colours[band[k]];
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(size - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(size - 1, Math.ceil(cx + r)); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > r * r && !(r < 1 && x === Math.floor(cx) && y === Math.floor(cy))) continue;
        const p = (y * size + x) * 4;
        img[p] = cr;
        img[p + 1] = cg;
        img[p + 2] = cb;
        img[p + 3] = 255;
      }
    }
  }
  return img;
}
