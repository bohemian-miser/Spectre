/**
 * A strand graph built for sweeping many combinations of one rule.
 *
 * `analyze` (circuits.ts) re-collects and re-welds every segment of every tile
 * for each configuration. But for a fixed (family, rule, level) the connection
 * points never move — only the pairing inside each tile changes with the
 * combination string. So the points are welded once into integer nodes, and a
 * combination is then just "which occurrence of a node pairs with which other
 * occurrence in the same tile", after which components are a flood fill over
 * typed arrays. At level 6 (272,791 tiles) that is ~70 ms a combination.
 *
 * Used by the Classifications page (hover thumbnails, in a worker) and by the
 * offline sweep in `web/circuit-classes/`.
 */

import type { Rgb } from './colors';
import { connectionPoints } from './edges';
import { leafOrder, leafPts, type TileFamilyId, type TileTypeId } from './families';
import { transPt } from './geom';
import { enumerateMatchings, nonCrossingForTile } from './matchings';
import { buildSystem, flatten } from './tiles';

export interface StrandGraph {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly level: number;
  readonly nTiles: number;
  readonly types: readonly TileTypeId[];
  /** Per occurrence (tile-local connection point): the node it welds to. */
  readonly occNode: Int32Array;
  /** Per tile: first occurrence index (occurrences of a tile are contiguous). */
  readonly tileOcc: Int32Array;
  /** Per tile: index into `types`. */
  readonly tileType: Uint8Array;
  readonly nNodes: number;
  readonly nodeX: Float64Array;
  readonly nodeY: Float64Array;
  /** Node multiplicity: 1 on the patch boundary, 2 inside, 3+ at a junction. */
  readonly nodeDeg: Uint8Array;
  /** Node -> occurrences, CSR. */
  readonly nodeOccStart: Int32Array;
  readonly nodeOcc: Int32Array;
  /** Per leaf type: its non-crossing matchings (combo digit -> index pairs). */
  readonly options: readonly (readonly (readonly [number, number])[])[][];
  /** Sum of tile areas, for density normalisation. */
  readonly patchArea: number;
}

function polyArea(pts: readonly { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Weld the connection points of a level-`level` Delta supertile once. */
export function buildStrandGraph(
  family: TileFamilyId,
  subset: readonly number[],
  level: number,
): StrandGraph {
  const sel = new Set(subset);
  const types = leafOrder(family);
  const typeIdx = new Map(types.map((t, i) => [t, i]));
  const local = types.map((t) => connectionPoints(family, t, sel).map((c) => c.pt));
  const options = types.map((t, i) => {
    const all = enumerateMatchings(local[i].length);
    const nc = nonCrossingForTile(family, t, sel);
    return nc.length === 0
      ? [[] as (readonly [number, number])[]]
      : nc.map((m) => all[m] as (readonly [number, number])[]);
  });

  const insts = flatten(buildSystem(family, level)['Delta']);
  const nTiles = insts.length;
  const tileOcc = new Int32Array(nTiles + 1);
  const tileType = new Uint8Array(nTiles);
  const areaByType = types.map((t) => polyArea(leafPts(family, t)));
  let nOcc = 0;
  let patchArea = 0;
  for (let i = 0; i < nTiles; i++) {
    const ti = typeIdx.get(insts[i].type) as number;
    tileType[i] = ti;
    tileOcc[i] = nOcc;
    nOcc += local[ti].length;
    patchArea += areaByType[ti];
  }
  tileOcc[nTiles] = nOcc;

  const occNode = new Int32Array(nOcc);
  const keyToNode = new Map<string, number>();
  const xs: number[] = [];
  const ys: number[] = [];
  let o = 0;
  for (let i = 0; i < nTiles; i++) {
    for (const p of local[tileType[i]]) {
      const w = transPt(insts[i].xform, p);
      const key = `${Math.round(w.x * 200)},${Math.round(w.y * 200)}`;
      let n = keyToNode.get(key);
      if (n === undefined) {
        n = xs.length;
        keyToNode.set(key, n);
        xs.push(w.x);
        ys.push(w.y);
      }
      occNode[o++] = n;
    }
  }
  const nNodes = xs.length;
  const nodeDeg = new Uint8Array(nNodes);
  for (let k = 0; k < nOcc; k++) nodeDeg[occNode[k]]++;
  const nodeOccStart = new Int32Array(nNodes + 1);
  for (let n = 0; n < nNodes; n++) nodeOccStart[n + 1] = nodeOccStart[n] + nodeDeg[n];
  const fill = nodeOccStart.slice(0, nNodes);
  const nodeOcc = new Int32Array(nOcc);
  for (let k = 0; k < nOcc; k++) nodeOcc[fill[occNode[k]]++] = k;

  return {
    family,
    subset,
    level,
    nTiles,
    types,
    occNode,
    tileOcc,
    tileType,
    nNodes,
    nodeX: Float64Array.from(xs),
    nodeY: Float64Array.from(ys),
    nodeDeg,
    nodeOccStart,
    nodeOcc,
    options,
    patchArea,
  };
}

/** How many combination strings the rule has (product of option counts). */
export function strandComboCount(g: Pick<StrandGraph, 'options'>): number {
  return g.options.reduce((a, o) => a * o.length, 1);
}

/**
 * Combination index -> digits, in enumeration order (rightmost tile varies
 * fastest, so index order is lexicographic in the combination string).
 */
export function comboDigitsFromIndex(optionCounts: readonly number[], index: number): number[] {
  const digits = new Array<number>(optionCounts.length);
  let rest = index;
  for (let i = optionCounts.length - 1; i >= 0; i--) {
    const k = optionCounts[i];
    digits[i] = rest % k;
    rest = Math.floor(rest / k);
  }
  return digits;
}

/** Per leaf type, how many combo digits it offers under a rule (>= 1). */
export function comboOptionCounts(family: TileFamilyId, subset: readonly number[]): number[] {
  const sel = new Set(subset);
  return leafOrder(family).map((t) => Math.max(1, nonCrossingForTile(family, t, sel).length));
}

/** partner[occ] = the occurrence it is paired with inside its own tile. */
export function pairOccurrences(
  g: StrandGraph,
  digits: readonly number[],
  out?: Int32Array,
): Int32Array {
  const partner = out ?? new Int32Array(g.occNode.length);
  for (let i = 0; i < g.nTiles; i++) {
    const base = g.tileOcc[i];
    const ti = g.tileType[i];
    for (const [a, b] of g.options[ti][digits[ti]]) {
      partner[base + a] = base + b;
      partner[base + b] = base + a;
    }
  }
  return partner;
}

export interface StrandComponents {
  readonly partner: Int32Array;
  /** Component id per node. */
  readonly comp: Int32Array;
  /** Per component (first `n` entries): segments, boundary ends, junctions. */
  readonly segs: Int32Array;
  readonly ends: Int32Array;
  readonly junc: Int32Array;
  readonly n: number;
}

/** Reusable buffers, so sweeping many combinations allocates nothing per combo. */
export interface StrandWorkspace {
  readonly partner: Int32Array;
  readonly comp: Int32Array;
  readonly stack: Int32Array;
}

export function strandWorkspace(g: StrandGraph): StrandWorkspace {
  return {
    partner: new Int32Array(g.occNode.length),
    comp: new Int32Array(g.nNodes),
    stack: new Int32Array(g.nNodes + 1),
  };
}

/**
 * Connected components of the strands. A component with no boundary end is a
 * circuit (closed); one with ends reaches the edge of the patch (open).
 */
export function strandComponents(
  g: StrandGraph,
  digits: readonly number[],
  ws: StrandWorkspace = strandWorkspace(g),
): StrandComponents {
  const partner = pairOccurrences(g, digits, ws.partner);
  const { comp, stack } = ws;
  comp.fill(-1);
  const segs = new Int32Array(g.nNodes);
  const ends = new Int32Array(g.nNodes);
  const junc = new Int32Array(g.nNodes);
  let nc = 0;
  for (let s = 0; s < g.nNodes; s++) {
    if (comp[s] !== -1) continue;
    let sp = 0;
    let occs = 0;
    let e = 0;
    let j = 0;
    stack[sp++] = s;
    comp[s] = nc;
    while (sp) {
      const n = stack[--sp];
      const d = g.nodeDeg[n];
      if (d === 1) e++;
      else if (d >= 3) j++;
      occs += d;
      for (let k = g.nodeOccStart[n]; k < g.nodeOccStart[n + 1]; k++) {
        const m = g.occNode[partner[g.nodeOcc[k]]];
        if (comp[m] === -1) {
          comp[m] = nc;
          stack[sp++] = m;
        }
      }
    }
    segs[nc] = occs / 2;
    ends[nc] = e;
    junc[nc] = j;
    nc++;
  }
  return { partner, comp, segs, ends, junc, n: nc };
}

/**
 * Colours for {@link rasterizeStrands}. Circuits are banded by length relative
 * to the largest circuit, so the top few generations of a nested pattern stand
 * out at thumbnail size; open strands (they reach the patch edge) are neutral,
 * the three longest in darker ink.
 */
export interface StrandPalette {
  /** Circuits >= 1/2, >= 1/8, >= 1/40 of the largest. */
  readonly bands: readonly [Rgb, Rgb, Rgb];
  readonly smallCircuit: Rgb;
  readonly open: Rgb;
  readonly openInk: readonly [Rgb, Rgb, Rgb];
}

export const LIGHT_STRAND_PALETTE: StrandPalette = {
  bands: [
    [200, 30, 45],
    [240, 120, 20],
    [230, 190, 30],
  ],
  smallCircuit: [212, 224, 236],
  open: [205, 200, 194],
  openInk: [
    [40, 40, 40],
    [90, 90, 110],
    [120, 100, 90],
  ],
};

export const DARK_STRAND_PALETTE: StrandPalette = {
  bands: [
    [255, 84, 96],
    [255, 150, 60],
    [240, 205, 70],
  ],
  smallCircuit: [52, 70, 92],
  open: [70, 74, 82],
  openInk: [
    [235, 237, 242],
    [170, 180, 205],
    [200, 180, 160],
  ],
};

/**
 * Draw one combination into an RGBA buffer (transparent background), each
 * segment a 1px straight chord, small components first so big ones sit on top.
 */
export function rasterizeStrands(
  g: StrandGraph,
  digits: readonly number[],
  size: number,
  palette: StrandPalette = LIGHT_STRAND_PALETTE,
  ws?: StrandWorkspace,
): Uint8ClampedArray {
  const c = strandComponents(g, digits, ws);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let n = 0; n < g.nNodes; n++) {
    if (g.nodeX[n] < minX) minX = g.nodeX[n];
    if (g.nodeX[n] > maxX) maxX = g.nodeX[n];
    if (g.nodeY[n] < minY) minY = g.nodeY[n];
    if (g.nodeY[n] > maxY) maxY = g.nodeY[n];
  }
  const pad = 2;
  const sc = (size - 2 * pad) / Math.max(maxX - minX, maxY - minY, 1e-9);
  const ox = pad + (size - 2 * pad - (maxX - minX) * sc) / 2;
  const oy = pad + (size - 2 * pad - (maxY - minY) * sc) / 2;
  const img = new Uint8ClampedArray(size * size * 4);

  let maxClosed = 2;
  for (let i = 0; i < c.n; i++) if (c.ends[i] === 0 && c.segs[i] > maxClosed) maxClosed = c.segs[i];
  const openTop: number[] = [];
  for (let i = 0; i < c.n; i++) {
    if (c.ends[i] === 0 || c.segs[i] <= 30) continue;
    openTop.push(i);
    openTop.sort((a, b) => c.segs[b] - c.segs[a]);
    if (openTop.length > 3) openTop.pop();
  }
  const color = (ci: number): Rgb => {
    if (c.ends[ci] > 0) {
      const k = openTop.indexOf(ci);
      return k >= 0 ? palette.openInk[k] : palette.open;
    }
    const r = c.segs[ci] / maxClosed;
    if (r >= 0.5) return palette.bands[0];
    if (r >= 1 / 8) return palette.bands[1];
    if (r >= 1 / 40) return palette.bands[2];
    return palette.smallCircuit;
  };

  // Occurrence pairs, drawn in order of component size.
  const pairs: number[] = [];
  for (let o = 0; o < g.occNode.length; o++) if (o < c.partner[o]) pairs.push(o);
  pairs.sort((a, b) => c.segs[c.comp[g.occNode[a]]] - c.segs[c.comp[g.occNode[b]]]);

  for (const o of pairs) {
    const a = g.occNode[o];
    const b = g.occNode[c.partner[o]];
    const [cr, cg, cb] = color(c.comp[a]);
    let x0 = Math.round(ox + (g.nodeX[a] - minX) * sc);
    let y0 = Math.round(size - oy - (g.nodeY[a] - minY) * sc);
    const x1 = Math.round(ox + (g.nodeX[b] - minX) * sc);
    const y1 = Math.round(size - oy - (g.nodeY[b] - minY) * sc);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (x0 >= 0 && y0 >= 0 && x0 < size && y0 < size) {
        const p = (y0 * size + x0) * 4;
        img[p] = cr;
        img[p + 1] = cg;
        img[p + 2] = cb;
        img[p + 3] = 255;
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  return img;
}
