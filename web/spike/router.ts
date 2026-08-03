/**
 * Spike 4 — hierarchical strand router ("transfer matrix" for circuits).
 *
 * Hypothesis: because (a) every instance of a level-k supertile is literally a
 * rigid transform of ONE shared TileNode object and (b) the matching rule is
 * uniform per leaf type, the strand topology through a level-k supertile is a
 * pure function of the node. So we can compute, once per (type, level):
 *
 *   - the supertile's OPEN PORTS: strand endpoints on its outer boundary,
 *   - live CHAINS between ports (with exact segment lengths),
 *   - finalized totals: circuits by length, tails by length, junction count,
 *
 * by recursion over the substitution children — never materializing interior
 * tiles. Totals for a full patch then come out by pure addition.
 *
 * Semantics replicate core/circuits.ts exactly:
 *   - weld epsilon 0.05 (same sweep as weldSegments),
 *   - tracePaths junction rules: chains never pass through degree>=3 points;
 *     a chain that leaves and returns to the SAME junction is a closed circuit,
 *   - degree-1 ends are tail ends.
 *
 * The one non-local ingredient is "can this point still receive another strand
 * end at a higher level?", which is exactly "is the point on the supertile
 * union's outer boundary?". The boundary is itself computed hierarchically by
 * edge cancellation (an edge shared by two children is interior), so the whole
 * pipeline stays exponential-collapse shaped.
 */

import { transPt, type Affine, type Pt } from '../src/core/geom';
import { leafPts, type TileFamilyId, type TileTypeId } from '../src/core/families';
import { connectionPoints, DEFAULT_CONTRACTS } from '../src/core/edges';
import { enumerateMatchings } from '../src/core/matchings';
import type { TileNode } from '../src/core/tiles';

// ---------------------------------------------------------------------------
// Quantized position keys (numeric, collision-free for |coord| < ~33 000)
// ---------------------------------------------------------------------------

const QOFF = 1 << 25;
const QMUL = 1 << 26;

/**
 * Injective for coordinate SPANS below QMUL/1000 = 67 108 units (keys of two
 * distinct quantized points can only collide when they are exactly 67 108.864
 * units apart in y). The level-9 Delta patch spans ~61.5k units, so lvl9 is
 * collision-free; lvl10+ (x2.81 span per level) needs rebasing or a wider key.
 */
export function qk(x: number, y: number): number {
  const qx = Math.round(x * 1000) + QOFF;
  const qy = Math.round(y * 1000) + QOFF;
  return qx * QMUL + qy;
}

// ---------------------------------------------------------------------------
// Hierarchical union boundary (edge cancellation)
// ---------------------------------------------------------------------------

/** Uncancelled edges as [ax,ay,bx,by]*E. */
const boundaryCache = new WeakMap<TileNode, Float64Array>();

export function boundaryOf(node: TileNode, family: TileFamilyId): Float64Array {
  const hit = boundaryCache.get(node);
  if (hit) return hit;

  let out: Float64Array;
  if (node.kind === 'leaf') {
    const pts = leafPts(family, node.type);
    const n = pts.length;
    out = new Float64Array(n * 4);
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out[i * 4] = a.x;
      out[i * 4 + 1] = a.y;
      out[i * 4 + 2] = b.x;
      out[i * 4 + 3] = b.y;
    }
  } else {
    // key(midpoint) -> [ax,ay,bx,by,count]
    const acc = new Map<number, [number, number, number, number, number]>();
    for (const child of node.children) {
      const b = boundaryOf(child.node, family);
      const T = child.xform;
      for (let i = 0; i < b.length; i += 4) {
        const ax = T[0] * b[i] + T[1] * b[i + 1] + T[2];
        const ay = T[3] * b[i] + T[4] * b[i + 1] + T[5];
        const bx = T[0] * b[i + 2] + T[1] * b[i + 3] + T[2];
        const by = T[3] * b[i + 2] + T[4] * b[i + 3] + T[5];
        const key = qk((ax + bx) / 2, (ay + by) / 2);
        const prev = acc.get(key);
        if (prev) prev[4]++;
        else acc.set(key, [ax, ay, bx, by, 1]);
      }
    }
    let count = 0;
    for (const v of acc.values()) if (v[4] === 1) count++;
    out = new Float64Array(count * 4);
    let w = 0;
    for (const v of acc.values()) {
      if (v[4] !== 1) continue;
      out[w++] = v[0];
      out[w++] = v[1];
      out[w++] = v[2];
      out[w++] = v[3];
    }
  }
  boundaryCache.set(node, out);
  return out;
}

/** Quantized keys of boundary endpoints AND midpoints (port liveness test). */
const boundaryKeyCache = new WeakMap<TileNode, Set<number>>();

export function boundaryKeysOf(node: TileNode, family: TileFamilyId): Set<number> {
  const hit = boundaryKeyCache.get(node);
  if (hit) return hit;
  const edges = boundaryOf(node, family);
  const keys = new Set<number>();
  for (let i = 0; i < edges.length; i += 4) {
    keys.add(qk(edges[i], edges[i + 1]));
    keys.add(qk(edges[i + 2], edges[i + 3]));
    keys.add(qk((edges[i] + edges[i + 2]) / 2, (edges[i + 1] + edges[i + 3]) / 2));
  }
  boundaryKeyCache.set(node, keys);
  return keys;
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export type NodeKind = 'seam' | 'vertex' | 'junction';

export interface RNode {
  readonly x: number;
  readonly y: number;
  readonly kind: NodeKind;
  /** Junction identity for the circuit-through-one-junction rule. */
  readonly jkey: number | null;
  /** Chain-end incidences: [chain index, side]. */
  readonly ends: (readonly [number, 0 | 1])[];
}

export type EndState =
  | { readonly t: 'node'; readonly idx: number }
  | { readonly t: 'dead'; readonly j: number | null };

export interface RChain {
  readonly len: number;
  readonly a: EndState;
  readonly b: EndState;
}

export interface Summary {
  readonly nodes: readonly RNode[];
  readonly chains: readonly RChain[];
  readonly circuits: Map<number, number>;
  readonly tails: Map<number, number>;
  readonly junctions: number;
}

export interface RouterConfig {
  readonly family: TileFamilyId;
  readonly selected: ReadonlySet<number>;
  readonly matchingIndexByType: Readonly<Record<string, number>>;
}

function addTo(map: Map<number, number>, len: number, n = 1): void {
  map.set(len, (map.get(len) ?? 0) + n);
}

function mergeInto(dst: Map<number, number>, src: Map<number, number>): void {
  for (const [len, n] of src) addTo(dst, len, n);
}

// ---------------------------------------------------------------------------
// Leaf summary
// ---------------------------------------------------------------------------

function leafSummary(type: TileTypeId, cfg: RouterConfig): Summary {
  const empty: Summary = {
    nodes: [],
    chains: [],
    circuits: new Map(),
    tails: new Map(),
    junctions: 0,
  };
  const cps = connectionPoints(cfg.family, type, cfg.selected, DEFAULT_CONTRACTS);
  if (cps.length < 2 || cps.length % 2 !== 0) return empty;
  const matching = enumerateMatchings(cps.length)[cfg.matchingIndexByType[type] ?? 0];
  if (!matching) return empty;

  const nodes: RNode[] = cps.map((cp) => ({
    x: cp.pt.x,
    y: cp.pt.y,
    kind: cp.edge.major === 0 && cfg.family !== 'hex' ? 'vertex' : 'seam',
    jkey: null,
    ends: [],
  }));
  const chains: RChain[] = [];
  matching.forEach(([i, j], ci) => {
    chains.push({ len: 1, a: { t: 'node', idx: i }, b: { t: 'node', idx: j } });
    nodes[i].ends.push([ci, 0]);
    nodes[j].ends.push([ci, 1]);
  });
  return { nodes, chains, circuits: new Map(), tails: new Map(), junctions: 0 };
}

// ---------------------------------------------------------------------------
// Weld + resolve (the per-level transfer step)
// ---------------------------------------------------------------------------

interface WNode {
  x: number;
  y: number;
  kind: NodeKind;
  jkey: number | null;
  ends: [number, 0 | 1][];
}

interface WChain {
  len: number;
  a: EndState;
  b: EndState;
}

let nextJunctionKey = 1;

export function resetJunctionKeys(): void {
  nextJunctionKey = 1;
}

/**
 * Weld coincident workspace nodes (epsilon sweep identical in spirit to
 * weldSegments), classify every welded group, then run a tracePaths-style walk
 * that collapses through-groups, finalizes circuits/tails, and emits the
 * surviving summary.
 */
export function resolveWorkspace(
  wNodes: WNode[],
  wChains: WChain[],
  boundaryKeys: ReadonlySet<number>,
  circuits: Map<number, number>,
  tails: Map<number, number>,
  junctionsBox: { n: number },
  epsilon = 0.05,
): Summary {
  const n = wNodes.length;

  // --- weld into groups ---
  const groupOf = new Int32Array(n).fill(-1);
  const order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => wNodes[a].x - wNodes[b].x);
  const groups: WNode[] = []; // group representative accumulators
  const epsSq = epsilon * epsilon;
  for (let i = 0; i < n; i++) {
    const idx = order[i];
    if (groupOf[idx] >= 0) continue;
    const p = wNodes[idx];
    const g = groups.length;
    groups.push({ x: p.x, y: p.y, kind: p.kind, jkey: p.jkey, ends: [...p.ends] });
    groupOf[idx] = g;
    for (let j = i + 1; j < n; j++) {
      const cand = order[j];
      const q = wNodes[cand];
      if (q.x - p.x > epsilon) break;
      if (groupOf[cand] >= 0) continue;
      const dy = q.y - p.y;
      if ((q.x - p.x) * (q.x - p.x) + dy * dy < epsSq) {
        groupOf[cand] = g;
        const gg = groups[g];
        gg.ends.push(...q.ends);
        if (q.kind === 'junction') {
          gg.kind = 'junction';
          gg.jkey = q.jkey;
        } else if (q.kind === 'vertex' && gg.kind === 'seam') {
          gg.kind = 'vertex';
        }
      }
    }
  }

  // --- classify groups ---
  // fate of incident ends: 0 = frozen (stays live), 1 = through, 2 = die
  const FROZEN = 0;
  const THROUGH = 1;
  const DIE = 2;
  const fate = new Uint8Array(groups.length);
  const dieKey: (number | null)[] = new Array(groups.length).fill(null);
  const keep = new Uint8Array(groups.length);

  for (let g = 0; g < groups.length; g++) {
    const grp = groups[g];
    const deg = grp.ends.length;
    const onB = boundaryKeys.has(qk(grp.x, grp.y));
    if (grp.kind === 'junction') {
      // Pre-existing junction: any newly arriving end dies with its key.
      fate[g] = DIE;
      dieKey[g] = grp.jkey;
      keep[g] = onB ? 1 : 0;
    } else if (deg >= 3) {
      junctionsBox.n++;
      const key = nextJunctionKey++;
      grp.kind = 'junction';
      grp.jkey = key;
      fate[g] = DIE;
      dieKey[g] = key;
      keep[g] = onB ? 1 : 0;
    } else if (grp.kind === 'vertex') {
      if (onB) {
        fate[g] = FROZEN;
        keep[g] = 1;
      } else if (deg === 2) {
        fate[g] = THROUGH;
      } else {
        fate[g] = DIE; // interior degree-1 vertex end -> tail end
        dieKey[g] = null;
      }
    } else {
      // seam: final degree is always 2 (only two tiles border an edge)
      if (deg === 2) {
        fate[g] = THROUGH;
      } else if (onB) {
        fate[g] = FROZEN;
        keep[g] = 1;
      } else {
        fate[g] = DIE;
        dieKey[g] = null;
      }
    }
  }

  // group end lists must reference chains; rebuild from chains for integrity
  for (const g of groups) g.ends.length = 0;
  for (let ci = 0; ci < wChains.length; ci++) {
    const c = wChains[ci];
    if (c.a.t === 'node') groups[groupOf[c.a.idx]].ends.push([ci, 0]);
    if (c.b.t === 'node') groups[groupOf[c.b.idx]].ends.push([ci, 1]);
  }

  type Terminal =
    | { t: 'frozen'; g: number }
    | { t: 'dead'; j: number | null };

  const endGroup = (c: WChain, side: 0 | 1): number | -1 => {
    const e = side === 0 ? c.a : c.b;
    return e.t === 'node' ? groupOf[e.idx] : -1;
  };
  const endDead = (c: WChain, side: 0 | 1): { j: number | null } | null => {
    const e = side === 0 ? c.a : c.b;
    return e.t === 'dead' ? { j: e.j } : null;
  };

  const terminalOf = (c: WChain, side: 0 | 1): Terminal | 'through' => {
    const dead = endDead(c, side);
    if (dead) return { t: 'dead', j: dead.j };
    const g = endGroup(c, side);
    if (fate[g] === FROZEN) return { t: 'frozen', g };
    if (fate[g] === DIE) return { t: 'dead', j: dieKey[g] };
    return 'through';
  };

  const otherEndAt = (g: number, chain: number, side: 0 | 1): readonly [number, 0 | 1] => {
    const ends = groups[g].ends;
    // through groups have exactly two incident ends
    const [c0, s0] = ends[0];
    if (c0 === chain && s0 === side) return ends[1];
    return ends[0];
  };

  const visited = new Uint8Array(wChains.length);

  // Output summary under construction.
  const outNodes: RNode[] = [];
  const outChains: RChain[] = [];
  const outIdxOfGroup = new Map<number, number>();
  const outNodeFor = (g: number): number => {
    let idx = outIdxOfGroup.get(g);
    if (idx === undefined) {
      idx = outNodes.length;
      outNodes.push({
        x: groups[g].x,
        y: groups[g].y,
        kind: groups[g].kind,
        jkey: groups[g].jkey,
        ends: [],
      });
      outIdxOfGroup.set(g, idx);
    }
    return idx;
  };

  const emitComposite = (termA: Terminal, termB: Terminal, len: number): void => {
    if (termA.t === 'dead' && termB.t === 'dead') {
      if (termA.j !== null && termA.j === termB.j) addTo(circuits, len);
      else addTo(tails, len);
      return;
    }
    const ci = outChains.length;
    const mk = (term: Terminal, side: 0 | 1): EndState => {
      if (term.t === 'dead') return { t: 'dead', j: term.j };
      const idx = outNodeFor(term.g);
      outNodes[idx].ends.push([ci, side]);
      return { t: 'node', idx };
    };
    const a = mk(termA, 0);
    const b = mk(termB, 1);
    outChains.push({ len, a, b });
  };

  // Pass 1: composites anchored at a non-through end.
  for (let ci = 0; ci < wChains.length; ci++) {
    if (visited[ci]) continue;
    const t0 = terminalOf(wChains[ci], 0);
    const t1 = terminalOf(wChains[ci], 1);
    if (t0 === 'through' && t1 === 'through') continue; // cycle or mid-chain
    const startSide: 0 | 1 = t0 !== 'through' ? 0 : 1;
    const termA = (startSide === 0 ? t0 : t1) as Terminal;

    visited[ci] = 1;
    let total = wChains[ci].len;
    let cur = ci;
    let exitSide: 0 | 1 = startSide === 0 ? 1 : 0;
    let termB: Terminal;
    for (;;) {
      const t = terminalOf(wChains[cur], exitSide);
      if (t !== 'through') {
        termB = t;
        break;
      }
      const g = endGroup(wChains[cur], exitSide);
      const [c2, s2] = otherEndAt(g, cur, exitSide);
      cur = c2;
      visited[cur] = 1;
      total += wChains[cur].len;
      exitSide = s2 === 0 ? 1 : 0;
    }
    emitComposite(termA, termB, total);
  }

  // Pass 2: remaining chains are pure cycles among through-groups.
  for (let ci = 0; ci < wChains.length; ci++) {
    if (visited[ci]) continue;
    visited[ci] = 1;
    let total = wChains[ci].len;
    let cur = ci;
    let exitSide: 0 | 1 = 1;
    for (;;) {
      const g = endGroup(wChains[cur], exitSide);
      const [c2, s2] = otherEndAt(g, cur, exitSide);
      if (c2 === ci && s2 === 0) break; // closed the cycle
      cur = c2;
      visited[cur] = 1;
      total += wChains[cur].len;
      exitSide = s2 === 0 ? 1 : 0;
    }
    addTo(circuits, total);
  }

  // Keep boundary junction shells (no live ends) so future arrivals die there.
  for (let g = 0; g < groups.length; g++) {
    if (keep[g] && groups[g].kind === 'junction' && !outIdxOfGroup.has(g)) {
      outNodeFor(g);
    }
  }

  return {
    nodes: outNodes,
    chains: outChains,
    circuits,
    tails,
    junctions: junctionsBox.n,
  };
}

// ---------------------------------------------------------------------------
// Recursive summarization
// ---------------------------------------------------------------------------

export interface RouterRun {
  readonly cfg: RouterConfig;
  readonly cache: Map<TileNode, Summary>;
}

export function newRun(cfg: RouterConfig): RouterRun {
  return { cfg, cache: new Map() };
}

export function summarize(node: TileNode, run: RouterRun): Summary {
  const hit = run.cache.get(node);
  if (hit) return hit;

  let out: Summary;
  if (node.kind === 'leaf') {
    out = leafSummary(node.type, run.cfg);
  } else {
    const wNodes: WNode[] = [];
    const wChains: WChain[] = [];
    const circuits = new Map<number, number>();
    const tails = new Map<number, number>();
    const junctionsBox = { n: 0 };

    for (const child of node.children) {
      const s = summarize(child.node, run);
      mergeInto(circuits, s.circuits);
      mergeInto(tails, s.tails);
      junctionsBox.n += s.junctions;

      const T = child.xform;
      const base = wNodes.length;
      // Junction identities are per PHYSICAL junction. The child summary is
      // shared between sibling instances of the same type, so its jkeys must
      // be re-keyed per instance or two distinct junctions would compare equal
      // (which would misclassify junction-to-junction chains as circuits).
      const keyMap = new Map<number, number>();
      const remapKey = (j: number | null): number | null => {
        if (j === null) return null;
        let fresh = keyMap.get(j);
        if (fresh === undefined) {
          fresh = nextJunctionKey++;
          keyMap.set(j, fresh);
        }
        return fresh;
      };
      for (const rn of s.nodes) {
        const p = transPt(T, { x: rn.x, y: rn.y });
        wNodes.push({ x: p.x, y: p.y, kind: rn.kind, jkey: remapKey(rn.jkey), ends: [] });
      }
      const cBase = wChains.length;
      for (const rc of s.chains) {
        const remap = (e: EndState): EndState =>
          e.t === 'node' ? { t: 'node', idx: base + e.idx } : { t: 'dead', j: remapKey(e.j) };
        wChains.push({ len: rc.len, a: remap(rc.a), b: remap(rc.b) });
      }
      // rebuild ends lazily inside resolveWorkspace (from chains); but the
      // welding step reads node.ends to carry them into groups — fill now.
      for (let ci = cBase; ci < wChains.length; ci++) {
        const c = wChains[ci];
        if (c.a.t === 'node') wNodes[c.a.idx].ends.push([ci, 0]);
        if (c.b.t === 'node') wNodes[c.b.idx].ends.push([ci, 1]);
      }
    }

    out = resolveWorkspace(
      wNodes,
      wChains,
      boundaryKeysOf(node, run.cfg.family),
      circuits,
      tails,
      junctionsBox,
    );
  }
  run.cache.set(node, out);
  return out;
}

/**
 * Final answer for a full patch of `node`: everything still live becomes
 * interior-resolved exactly like tracePaths does on the residual graph
 * (degree-2 merges close circuits, degree-1 ends are tails, degree>=3 break).
 */
export interface RouterResult {
  readonly circuits: Map<number, number>;
  readonly tails: Map<number, number>;
  readonly junctions: number;
  readonly circuitCount: number;
  readonly tailCount: number;
}

export function finalize(node: TileNode, run: RouterRun): RouterResult {
  const s = summarize(node, run);
  // One more resolve round with an empty boundary: nothing survives.
  const wNodes: WNode[] = s.nodes.map((rn) => ({
    x: rn.x,
    y: rn.y,
    kind: rn.kind,
    jkey: rn.jkey,
    ends: rn.ends.map((e) => [e[0], e[1]] as [number, 0 | 1]),
  }));
  const wChains: WChain[] = s.chains.map((rc) => ({ len: rc.len, a: rc.a, b: rc.b }));
  const circuits = new Map(s.circuits);
  const tails = new Map(s.tails);
  const junctionsBox = { n: s.junctions };
  resolveWorkspace(wNodes, wChains, new Set<number>(), circuits, tails, junctionsBox);

  let circuitCount = 0;
  for (const n of circuits.values()) circuitCount += n;
  let tailCount = 0;
  for (const n of tails.values()) tailCount += n;
  return { circuits, tails, junctions: junctionsBox.n, circuitCount, tailCount };
}
