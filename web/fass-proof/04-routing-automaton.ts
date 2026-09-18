/**
 * Lemma 4 — the routing automaton, and the conditional proof for ALL k.
 *
 * `09-interface-invariant.ts` shows the routing state of a level-k supertile
 * lives in a FINITE set: a perfect matching on a fixed number of boundary
 * connection dots, with no circuits and no interior arc endpoints. This script
 * turns that observation into an induction.
 *
 *   state(T, k) := ( the perfect matching that the arcs inside the level-k
 *                    supertile of type T induce on its canonically-labelled
 *                    boundary dots dB(T, k),
 *                    the number of closed circuits strictly inside,
 *                    the number of arcs with both endpoints interior ).
 *
 * The substitution places the eight (seven, for Gamma) level-k children inside
 * the level-(k+1) parent. Two data describe that placement at the level of the
 * strand graph:
 *
 *   glue(T)  — the involution pairing a child boundary dot with the sibling
 *              boundary dot it welds to;
 *   outer(T) — the bijection from the parent's boundary dot labels to the
 *              unwelded child dots.
 *
 * LEMMA 3 (assumed here; tested elsewhere) says glue/outer do not depend on k.
 * Given that, state(·, k+1) = F( state(·, k) ) for a FIXED combinatorial
 * operator F on the 9-tuple of states, and F is computed here purely
 * abstractly — union-find over child dots, then a walk. Iterating F from
 * state(·, 1) is then a proof by induction for every level, and because the
 * state space is finite the orbit is eventually periodic and the induction
 * terminates.
 *
 * The load-bearing validation is that the ABSTRACTLY iterated states agree,
 * level by level, with the states computed DIRECTLY from exact patch expansion.
 *
 * Everything combinatorial here is exact `Z[zeta12]` integer arithmetic:
 *   - the patch outline is recovered by edge cancellation over exact vertex
 *     keys;
 *   - a boundary dot is located on that outline by matching the exact doubled
 *     midpoint `v_j + v_{j+1}` of an outline edge — an integer key equality,
 *     not a float projection;
 *   - the canonical anchor/orientation of the outline loop is fixed by exact
 *     key equality against the supertile quad's corners.
 * No floating point is used for any claim in this file.
 *
 * Run: cd web && npx --yes tsx fass-proof/04-routing-automaton.ts [maxLevel] [iters]
 * Defaults to maxLevel 6, which expands ~1.5M leaf tiles per configuration and
 * takes ~10 min / ~4 GB; pass 5 for a 40 s run. Nothing below depends on the
 * level reached except how far the direct validation of F goes.
 */

import {
  chosenMatching,
  buildStrands,
  CONFIGS,
  heading,
  pad,
  trace,
  verdict,
  zApply2,
  zExpand,
  type Config,
  type ZInstance,
} from './lib';
import {
  leafOrder,
  SUPER_RULES,
  zAdd,
  zApply,
  zKey,
  zLeafPts,
  zSupertileQuad,
  zSupertileTransforms,
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';

const MAX = Number(process.argv[2] ?? 6);
const ITERS = Number(process.argv[3] ?? 400);
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
const CFG_KEYS = ['hex128', 'spectre1278', 'flagship'] as const;

if (!Number.isInteger(MAX) || MAX < 3) {
  console.error('maxLevel must be an integer >= 3 (two transitions are needed to test level-independence)');
  process.exit(2);
}

let allOk = true;
const note = (ok: boolean, label: string, detail = ''): boolean => {
  allOk = verdict(ok, label, detail) && allOk;
  return ok;
};

// ---------------------------------------------------------------------------
// 0. Exact outline of a patch, as an ordered loop of vertices
// ---------------------------------------------------------------------------

/**
 * The boundary of a patch, exactly: a physical tile edge used by exactly one
 * tile is a boundary edge, and the boundary edges chain into one simple loop.
 * Vertices are compared by `zKey`, which is a canonical identity on Z[zeta12].
 */
function outlineLoop(family: TileFamilyId, instances: readonly ZInstance[]): ZVec[] {
  const use = new Map<string, { a: ZVec; b: ZVec; n: number }>();
  const polyCache = new Map<string, readonly ZVec[]>();
  for (const inst of instances) {
    let base = polyCache.get(inst.type);
    if (!base) {
      base = zLeafPts(family, inst.type);
      polyCache.set(inst.type, base);
    }
    const n = base.length;
    let prev = zApply(inst.xform, base[0]);
    let prevKey = zKey(prev);
    const first = prev;
    const firstKey = prevKey;
    for (let i = 1; i <= n; i++) {
      const cur = i === n ? first : zApply(inst.xform, base[i]);
      const curKey = i === n ? firstKey : zKey(cur);
      const key = prevKey < curKey ? `${prevKey}_${curKey}` : `${curKey}_${prevKey}`;
      const hit = use.get(key);
      if (hit) hit.n += 1;
      else use.set(key, { a: prev, b: cur, n: 1 });
      prev = cur;
      prevKey = curKey;
    }
  }

  const nbr = new Map<string, string[]>();
  const coord = new Map<string, ZVec>();
  let seed = '';
  for (const e of use.values()) {
    if (e.n !== 1) continue;
    const ka = zKey(e.a);
    const kb = zKey(e.b);
    coord.set(ka, e.a);
    coord.set(kb, e.b);
    if (!nbr.has(ka)) nbr.set(ka, []);
    if (!nbr.has(kb)) nbr.set(kb, []);
    nbr.get(ka)!.push(kb);
    nbr.get(kb)!.push(ka);
    if (!seed) seed = ka;
  }
  for (const [k, v] of nbr) if (v.length !== 2) throw new Error(`outline vertex ${k} has degree ${v.length}`);

  const loop: ZVec[] = [];
  let prev = '';
  let cur = seed;
  do {
    loop.push(coord.get(cur)!);
    const nb = nbr.get(cur)!;
    const next = nb[0] !== prev ? nb[0] : nb[1];
    prev = cur;
    cur = next;
    if (loop.length > nbr.size) throw new Error('outline walk did not close');
  } while (cur !== seed);
  if (loop.length !== nbr.size) throw new Error('outline has more than one loop');
  return loop;
}

// ---------------------------------------------------------------------------
// 1. state(T, k), computed directly from the exact patch
// ---------------------------------------------------------------------------

interface Analysis {
  readonly nB: number;
  /** exact key (doubled coords, supertile-local frame) of the dot with label i */
  readonly keyOfLabel: readonly string[];
  /** doubled coords of the dot with label i */
  readonly dotOfLabel: readonly ZVec[];
  readonly matching: readonly (readonly [number, number])[];
  readonly circuits: number;
  readonly interiorEndArcs: number;
  readonly arcs: number;
  readonly segs: number;
  readonly tiles: number;
  readonly tilesCovered: number;
  readonly maxDegree: number;
  readonly junctions: number;
  readonly outlineLen: number;
}

const analysisCache = new Map<string, Analysis>();

function analyze(cfg: Config, T: TileTypeId, level: number): Analysis {
  const ck = `${cfg.id}|${T}|${level}`;
  const hit = analysisCache.get(ck);
  if (hit) return hit;

  const instances = zExpand(cfg.family, T, level);
  const strands = buildStrands(cfg, instances);
  const tr = trace(strands);
  const loop = outlineLoop(cfg.family, instances);
  const n = loop.length;
  const loopKeys = loop.map(zKey);
  const idxOfVertex = new Map<string, number>();
  loopKeys.forEach((k, i) => idxOfVertex.set(k, i));

  // Canonical anchor and orientation, by EXACT key equality against the quad.
  const quad = zSupertileQuad(cfg.family, level);
  const qi = quad.map((q) => {
    const i = idxOfVertex.get(zKey(q));
    if (i === undefined) throw new Error(`${T}@${level}: quad corner is not an outline vertex`);
    return i;
  });
  // Chirality-stable: walk the way that reaches quad[1] before quad[3].
  // (buildSupertiles pre-multiplies a reflection, so a naive orientation would
  //  flip with the parity of the level.)
  const forward = (qi[1] - qi[0] + n) % n < (qi[3] - qi[0] + n) % n;
  const orderedKeys: string[] = new Array(n);
  const ordered: ZVec[] = new Array(n);
  for (let s = 0; s < n; s++) {
    const i = forward ? (qi[0] + s) % n : (qi[0] - s + 2 * n) % n;
    orderedKeys[s] = loopKeys[i];
    ordered[s] = loop[i];
  }
  // Exact doubled midpoint of each outline edge -> its rank along the loop.
  const rankOfMid = new Map<string, number>();
  for (let j = 0; j < n; j++) {
    rankOfMid.set(zKey(zAdd(ordered[j], ordered[(j + 1) % n])), j);
  }

  const dots: { key: string; rank: number }[] = [];
  for (const [key, deg] of strands.degree) {
    if (deg !== 1) continue;
    const rank = rankOfMid.get(key);
    if (rank === undefined) {
      throw new Error(`${T}@${level}: degree-1 dot ${key} is not the midpoint of an outline edge`);
    }
    dots.push({ key, rank });
  }
  dots.sort((a, b) => a.rank - b.rank);
  if (new Set(dots.map((d) => d.rank)).size !== dots.length) {
    throw new Error(`${T}@${level}: two boundary dots share an outline edge`);
  }
  const labelOf = new Map<string, number>();
  dots.forEach((d, i) => labelOf.set(d.key, i));

  const matching: [number, number][] = [];
  let interiorEndArcs = 0;
  for (const arc of tr.arcs) {
    const a = labelOf.get(arc.endpoints[0]);
    const b = labelOf.get(arc.endpoints[1]);
    if (a === undefined || b === undefined) {
      interiorEndArcs++;
      continue;
    }
    matching.push(a < b ? [a, b] : [b, a]);
  }
  matching.sort((x, y) => x[0] - y[0] || x[1] - y[1]);

  const res: Analysis = {
    nB: dots.length,
    keyOfLabel: dots.map((d) => d.key),
    dotOfLabel: dots.map((d) => strands.coord.get(d.key)!),
    matching,
    circuits: tr.circuits.length,
    interiorEndArcs,
    arcs: tr.arcs.length,
    segs: strands.segs.length,
    tiles: instances.length,
    tilesCovered: tr.tilesCovered,
    maxDegree: tr.maxDegree,
    junctions: tr.junctions,
    outlineLen: n,
  };
  analysisCache.set(ck, res);
  return res;
}

// ---------------------------------------------------------------------------
// 2. The abstract state, and the gluing / outer datum
// ---------------------------------------------------------------------------

interface State {
  readonly nB: number;
  readonly matching: readonly (readonly [number, number])[];
  readonly circuits: number;
  readonly interiorEndArcs: number;
}

function stateKey(s: State): string {
  return `${s.matching.map(([a, b]) => `${a}-${b}`).join(',')}|c${s.circuits}|i${s.interiorEndArcs}`;
}

function tupleKey(ss: Record<string, State>): string {
  return TYPES.map((T) => `${T}:${stateKey(ss[T])}`).join(' ');
}

function stateOf(a: Analysis): State {
  return { nB: a.nB, matching: a.matching, circuits: a.circuits, interiorEndArcs: a.interiorEndArcs };
}

type Node = readonly [number, number]; // [slot, child boundary label]

interface Datum {
  readonly type: TileTypeId;
  readonly slots: readonly { slot: number; child: TileTypeId }[];
  readonly glue: readonly (readonly [Node, Node])[];
  /** outer[parentLabel] = the unwelded child dot that becomes it */
  readonly outer: readonly Node[];
  readonly nB: number;
}

function datumKey(d: Datum): string {
  const g = d.glue
    .map(([a, b]) => {
      const x = `${a[0]}:${a[1]}`;
      const y = `${b[0]}:${b[1]}`;
      return x < y ? `${x}=${y}` : `${y}=${x}`;
    })
    .sort()
    .join(' ');
  const o = d.outer.map(([s, l], i) => `${i}<-${s}:${l}`).join(' ');
  const sl = d.slots.map((s) => `${s.slot}${s.child}`).join(',');
  return `slots[${sl}] glue[${g}] outer[${o}]`;
}

/**
 * The gluing/outer datum of the substitution, read off the EXACT geometry of
 * one level transition: level-`parentLevel - 1` children inside a
 * level-`parentLevel` parent.
 */
function datumOf(cfg: Config, T: TileTypeId, parentLevel: number): Datum {
  if (parentLevel < 2) throw new Error('datum needs parentLevel >= 2 (children must be supertiles)');
  const Ts = zSupertileTransforms(cfg.family, parentLevel);
  const subs = SUPER_RULES[T];
  const childLevel = parentLevel - 1;
  const occ = new Map<string, Node[]>();
  const slots: { slot: number; child: TileTypeId }[] = [];
  for (let s = 0; s < 8; s++) {
    if (subs[s] === 'null') continue;
    const ct = subs[s] as TileTypeId;
    slots.push({ slot: s, child: ct });
    const ca = analyze(cfg, ct, childLevel);
    for (let l = 0; l < ca.nB; l++) {
      const k = zKey(zApply2(Ts[s], ca.dotOfLabel[l]));
      const list = occ.get(k);
      if (list) list.push([s, l]);
      else occ.set(k, [[s, l]]);
    }
  }
  const pa = analyze(cfg, T, parentLevel);
  const glue: (readonly [Node, Node])[] = [];
  const unwelded = new Map<string, Node>();
  for (const [k, list] of occ) {
    if (list.length === 2) glue.push([list[0], list[1]]);
    else if (list.length === 1) unwelded.set(k, list[0]);
    else throw new Error(`${T}@${parentLevel}: ${list.length} child dots coincide at ${k}`);
  }
  if (unwelded.size !== pa.nB) {
    throw new Error(
      `${T}@${parentLevel}: ${unwelded.size} unwelded child dots but the parent has ${pa.nB} boundary dots`,
    );
  }
  const outer: Node[] = [];
  for (let l = 0; l < pa.nB; l++) {
    const hit = unwelded.get(pa.keyOfLabel[l]);
    if (!hit) throw new Error(`${T}@${parentLevel}: parent boundary dot ${l} is not an unwelded child dot`);
    outer.push(hit);
  }
  return { type: T, slots, glue, outer, nB: pa.nB };
}

// ---------------------------------------------------------------------------
// 3. F — the routing operator, purely combinatorial
// ---------------------------------------------------------------------------

interface FResult {
  readonly state: State;
  /** one string per parent arc: "slot:a-b > slot:a-b > ..." */
  readonly compositions: readonly string[];
  /** how many child arcs each parent arc consumed, total */
  readonly consumed: number;
  readonly childArcTotal: number;
  readonly newCycles: number;
}

/**
 * state(T, k+1) from the children's states at level k, using only `d`.
 * No geometry, no patch expansion: union-find over child boundary dots, then a
 * walk of the resulting degree-<=2 graph.
 */
function applyF(d: Datum, states: Record<string, State>): FResult {
  const id = (s: number, l: number): string => `${s}:${l}`;
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== undefined && parent.get(c) !== c) {
      const nx = parent.get(c)!;
      parent.set(c, r);
      c = nx;
    }
    return r;
  };
  for (const { slot, child } of d.slots) {
    for (let l = 0; l < states[child].nB; l++) parent.set(id(slot, l), id(slot, l));
  }
  const seen = new Set<string>();
  for (const [a, b] of d.glue) {
    const ka = id(a[0], a[1]);
    const kb = id(b[0], b[1]);
    if (seen.has(ka) || seen.has(kb)) throw new Error(`glue of ${d.type} is not an involution`);
    seen.add(ka);
    seen.add(kb);
    const ra = find(ka);
    const rb = find(kb);
    if (ra === rb) throw new Error(`glue of ${d.type} identifies a dot with itself`);
    parent.set(ra, rb);
  }

  // Edges: one per child arc.
  const edgeA: string[] = [];
  const edgeB: string[] = [];
  const edgeLabel: string[] = [];
  let childCircuits = 0;
  let childInterior = 0;
  for (const { slot, child } of d.slots) {
    const cs = states[child];
    childCircuits += cs.circuits;
    childInterior += cs.interiorEndArcs;
    for (const [a, b] of cs.matching) {
      edgeA.push(find(id(slot, a)));
      edgeB.push(find(id(slot, b)));
      edgeLabel.push(`${slot}:${a}-${b}`);
    }
  }
  const adj = new Map<string, number[]>();
  for (let i = 0; i < edgeA.length; i++) {
    for (const v of [edgeA[i], edgeB[i]]) {
      const l = adj.get(v);
      if (l) l.push(i);
      else adj.set(v, [i]);
    }
  }
  for (const [v, l] of adj) if (l.length > 2) throw new Error(`${d.type}: composed degree ${l.length} at ${v}`);

  // The parent's boundary labels, as reps.
  const repOfParentLabel = d.outer.map(([s, l]) => find(id(s, l)));
  const parentLabelOfRep = new Map<string, number>();
  repOfParentLabel.forEach((r, i) => {
    if (parentLabelOfRep.has(r)) throw new Error(`${d.type}: two parent labels share a node`);
    parentLabelOfRep.set(r, i);
  });
  for (const [v, l] of adj) {
    if (l.length === 1 && !parentLabelOfRep.has(v)) throw new Error(`${d.type}: unglued dot ${v} is not an outer dot`);
    if (l.length === 2 && parentLabelOfRep.has(v)) throw new Error(`${d.type}: outer dot ${v} has degree 2`);
  }

  const used = new Array(edgeA.length).fill(false);
  const matching: [number, number][] = [];
  const compositions: string[] = [];
  let consumed = 0;
  // Walk each parent arc from the endpoint with the smaller parent label.
  for (let start = 0; start < repOfParentLabel.length; start++) {
    const r0 = repOfParentLabel[start];
    const inc = adj.get(r0) ?? [];
    if (inc.length !== 1) throw new Error(`${d.type}: parent label ${start} has degree ${inc.length}`);
    if (used[inc[0]]) continue;
    const seq: string[] = [];
    let cur = r0;
    let e = inc[0];
    for (;;) {
      used[e] = true;
      consumed++;
      seq.push(edgeLabel[e]);
      const next = edgeA[e] === cur ? edgeB[e] : edgeA[e];
      const cont = (adj.get(next) ?? []).filter((x) => !used[x]);
      if (cont.length === 0) {
        const end = parentLabelOfRep.get(next);
        if (end === undefined) throw new Error(`${d.type}: an arc ends at a non-boundary node`);
        matching.push(start < end ? [start, end] : [end, start]);
        compositions.push(seq.join(' > '));
        break;
      }
      cur = next;
      e = cont[0];
    }
  }
  let newCycles = 0;
  for (let i = 0; i < used.length; i++) {
    if (used[i]) continue;
    newCycles++;
    let cur = edgeA[i];
    let e = i;
    for (;;) {
      used[e] = true;
      consumed++;
      const next = edgeA[e] === cur ? edgeB[e] : edgeA[e];
      const cont = (adj.get(next) ?? []).filter((x) => !used[x]);
      if (cont.length === 0) break;
      cur = next;
      e = cont[0];
    }
  }
  matching.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return {
    state: { nB: d.nB, matching, circuits: childCircuits + newCycles, interiorEndArcs: childInterior },
    compositions,
    consumed,
    childArcTotal: edgeA.length,
    newCycles,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function doubleFactorial(n: number): number {
  // number of perfect matchings on n labelled points = (n-1)!!
  let p = 1;
  for (let i = n - 1; i > 0; i -= 2) p *= i;
  return p;
}

interface ConfigReport {
  readonly cfg: Config;
  readonly nB: Record<string, number>;
  readonly direct: Record<string, State>[]; // index 0 = level 1
  readonly datumPeriod: number;
  readonly abstractPeriod: number;
  readonly abstractPre: number;
  readonly psiSingle: boolean;
  readonly circuitFree: boolean;
}

// ---------------------------------------------------------------------------
// 0. What the substitution's child transforms do and do not fix
// ---------------------------------------------------------------------------
heading('0. the child transforms across levels — what is and is not level-independent');
console.log(`  docs/FASS_1278.md section 4.4 justifies level-independence of the gluing by
  "the level-independent child transforms of buildSupertiles". Those transforms
  are recomputed from the CURRENT level's quad, so that justification as stated
  is false. But something weaker and still useful IS true:`);
for (const family of ['hex', 'spectre'] as const) {
  const full: string[] = [];
  const linear: string[] = [];
  const quads: string[] = [];
  for (let lv = 1; lv <= Math.max(6, MAX); lv++) {
    const Ts = zSupertileTransforms(family, lv);
    full.push(Ts.map((T) => `${T.k},${T.m},${T.t.join('.')}`).join('|'));
    linear.push(Ts.map((T) => `${T.k},${T.m}`).join('|'));
    quads.push(zSupertileQuad(family, lv).map(zKey).join('|'));
  }
  const nFull = new Set(full).size;
  const nLin = new Set(linear).size;
  const nQuad = new Set(quads).size;
  console.log(`  ${pad(family, 8)}: full Ts distinct across levels 1..${Math.max(6, MAX)}: ${nFull}; quads distinct: ${nQuad}; LINEAR parts distinct: ${nLin}`);
  console.log(`            linear parts (rotK,mirror per slot 0..7) = ${linear[0]}`);
  note(nFull > 1, `${family}: the child transforms really do vary with the level (the doc's stated reason is wrong)`);
  note(nLin === 1, `${family}: but every slot's ROTATION+MIRROR is the same at every level; only translations move`);
}
console.log(`  Reading: each child sits in its parent at a level-independent ORIENTATION.
  That is a genuine lead towards Lemma 3 — the combinatorics of which boundary
  dot meets which is an orientation-and-adjacency question — but it is not a
  proof, because the translations (and hence the actual dot positions) differ
  at every level. Lemma 3 remains an assumption here; what this script does is
  re-verify it exactly at every transition it computes.`);

const reports: ConfigReport[] = [];
const datumByConfig = new Map<string, string>();
const cycleByConfig = new Map<string, string>();
const compByConfig = new Map<string, string>();

for (const key of CFG_KEYS) {
  const cfg = CONFIGS[key];
  heading(`${cfg.id} — 1. state(T,k) computed DIRECTLY, exact, levels 1..${MAX}`);

  const direct: Record<string, State>[] = [];
  const analyses: Record<string, Analysis>[] = [];
  for (let lv = 1; lv <= MAX; lv++) {
    const row: Record<string, State> = {};
    const arow: Record<string, Analysis> = {};
    for (const T of TYPES) {
      const a = analyze(cfg, T, lv);
      arow[T] = a;
      row[T] = stateOf(a);
    }
    direct.push(row);
    analyses.push(arow);
  }

  console.log(`  | type | |dB| | arcs | ${Array.from({ length: MAX }, (_, i) => `state@lv${i + 1}`).join(' | ')} |`);
  console.log(`  |---|---|---|${'---|'.repeat(MAX)}`);
  const nB: Record<string, number> = {};
  for (const T of TYPES) {
    const sizes = direct.map((r) => r[T].nB);
    nB[T] = sizes[0];
    const cells = direct.map((r) => r[T].matching.map(([a, b]) => `${a}-${b}`).join(' '));
    console.log(`  | ${pad(T, 7)} | ${pad(sizes[0], 3)} | ${sizes[0] / 2} | ${cells.join(' | ')} |`);
    note(new Set(sizes).size === 1, `${T}: |dB(T,k)| constant over k=1..${MAX}`, `= ${sizes[0]}`);
    note(
      direct.every((r) => r[T].matching.length * 2 === r[T].nB),
      `${T}: arcs are a perfect matching of dB`,
    );
    note(direct.every((r) => r[T].circuits === 0), `${T}: zero circuits, k=1..${MAX}`);
    note(direct.every((r) => r[T].interiorEndArcs === 0), `${T}: zero arcs with an interior endpoint`);
    note(
      analyses.every((r) => r[T].maxDegree <= 2 && r[T].junctions === 0),
      `${T}: welded degree <= 2, no junctions`,
    );
    note(
      analyses.every((r) => r[T].tilesCovered === r[T].tiles),
      `${T}: the arcs together visit EVERY tile of the patch, k=1..${MAX}`,
    );
  }

  console.log(`\n  the interface is constant while the BOUNDARY is not — outline edge counts:`);
  console.log(`  | type | ${Array.from({ length: MAX }, (_, i) => `lv${i + 1}`).join(' | ')} | |dB| |`);
  console.log(`  |---|${'---|'.repeat(MAX + 1)}`);
  for (const T of TYPES) {
    console.log(
      `  | ${pad(T, 7)} | ${analyses.map((r) => pad(r[T].outlineLen, 7)).join(' | ')} | ${pad(nB[T], 3)} |`,
    );
  }
  console.log(`  (the outline grows without bound — the supertile boundary is fractal in the
   limit — yet the number of places a strand can cross it is fixed. That is the
   whole reason the state space is finite.)`);

  heading(`${cfg.id} — 2. the state space is finite`);
  let space = 1;
  console.log(`  | type | |dB| | matchings (|dB|-1)!! |`);
  console.log(`  |---|---|---|`);
  for (const T of TYPES) {
    const m = doubleFactorial(nB[T]);
    space *= m;
    console.log(`  | ${pad(T, 7)} | ${pad(nB[T], 3)} | ${pad(m, 6)} |`);
  }
  console.log(`  product over the 9 types = ${space.toExponential(4)} possible 9-tuples`);
  console.log(`  (the circuit count is the only unbounded component of the state; it is 0
   along the whole computed orbit and F is shown below to preserve 0, so the
   reachable state space is exactly the matching part — finite.)`);
  note(space > 0 && Number.isFinite(space), 'state space is finite');

  heading(`${cfg.id} — 3. the gluing/outer datum, and F`);
  const data: Record<string, Datum>[] = [];
  for (let pl = 2; pl <= MAX; pl++) {
    const row: Record<string, Datum> = {};
    for (const T of TYPES) row[T] = datumOf(cfg, T, pl);
    data.push(row);
  }
  const keys = data.map((row) => TYPES.map((T) => `${T} :: ${datumKey(row[T])}`).join('\n'));
  let datumPeriod = 0;
  if (keys.length >= 2) {
    if (keys.every((k) => k === keys[0])) datumPeriod = 1;
    else if (keys.every((k, i) => k === keys[i % 2])) datumPeriod = 2;
  }
  console.log(`  datum computed for parent levels 2..${MAX} (children at 1..${MAX - 1}).`);
  for (const T of TYPES) {
    const ks = data.map((row) => datumKey(row[T]));
    const p1 = ks.every((k) => k === ks[0]);
    console.log(`    ${pad(T, 7)}: ${p1 ? 'level-INDEPENDENT' : 'VARIES with the level'}`);
  }
  note(
    datumPeriod === 1,
    `glue/outer identical at every computed transition (Lemma 3, re-verified k=1..${MAX - 1})`,
    datumPeriod === 1 ? 'period 1' : datumPeriod === 2 ? 'PERIOD 2 — F is not a single map' : 'no period',
  );
  const D = data[0];
  console.log(`\n  the datum in full for Psi and Delta (the two roots the conjecture talks about).
  "s:l" = boundary dot l of the child in slot s; "p <- s:l" = parent dot p is that child dot.`);
  for (const T of ['Psi', 'Delta'] as TileTypeId[]) {
    const d = D[T];
    console.log(`    ${T}: children ${d.slots.map((x) => `${x.slot}=${x.child}`).join(' ')}`);
    console.log(`      glue : ${d.glue.map(([a, b]) => `${a[0]}:${a[1]}=${b[0]}:${b[1]}`).join('  ')}`);
    console.log(`      outer: ${d.outer.map(([sl, l], i) => `${i}<-${sl}:${l}`).join('  ')}`);
  }
  datumByConfig.set(cfg.id, TYPES.map((T) => `${T} :: ${datumKey(D[T])}`).join('\n'));

  // --- iterate F abstractly from state(.,1) -------------------------------
  const orbit: Record<string, State>[] = [direct[0]];
  const seenAt = new Map<string, number>([[tupleKey(direct[0]), 0]]);
  let pre = -1;
  let per = -1;
  let compAtStep: Record<string, FResult>[] = [];
  for (let step = 0; step < ITERS; step++) {
    const cur = orbit[orbit.length - 1];
    const next: Record<string, State> = {};
    const comps: Record<string, FResult> = {};
    for (const T of TYPES) {
      const r = applyF(D[T], cur);
      next[T] = r.state;
      comps[T] = r;
    }
    compAtStep.push(comps);
    orbit.push(next);
    const k = tupleKey(next);
    const prevAt = seenAt.get(k);
    if (prevAt !== undefined && pre < 0) {
      pre = prevAt;
      per = orbit.length - 1 - prevAt;
    }
    seenAt.set(k, orbit.length - 1);
  }
  console.log(`  iterated F for ${ITERS} steps from state(.,1).`);
  note(pre >= 0, 'the abstract orbit of F is eventually periodic', pre >= 0 ? `pre-period ${pre} (level ${pre + 1}), period ${per}` : 'no repeat found');

  // --- the load-bearing check --------------------------------------------
  let agree = true;
  for (let lv = 1; lv <= MAX; lv++) {
    const a = tupleKey(orbit[lv - 1]);
    const b = tupleKey(direct[lv - 1]);
    if (a !== b) {
      agree = false;
      console.log(`    MISMATCH at level ${lv}:\n      F-iterated: ${a}\n      direct    : ${b}`);
    }
  }
  note(agree, `abstract F-orbit == directly computed states at every level 1..${MAX}`, 'this validates F');

  // --- conclusions --------------------------------------------------------
  heading(`${cfg.id} — 4. conclusions from the cycle`);
  const cyc = pre >= 0 ? orbit.slice(pre, pre + per) : orbit.slice(0, 1);
  const circuitFree = orbit.every((r) => TYPES.every((T) => r[T].circuits === 0));
  note(circuitFree, `circuits == 0 for every type at EVERY level (conditional on Lemma 3)`);
  const psiSingle = orbit.every((r) => r['Psi'].nB === 2 && r['Psi'].matching.length === 1);
  note(psiSingle, `Psi is ONE arc joining its 2 boundary dots at EVERY level`, `matching ${cyc[0]['Psi'].matching.map(([a, b]) => `${a}-${b}`).join(' ')}`);

  console.log(`\n  per-type arc count (= |dB|/2, constant in k) and the pairing over one period:`);
  console.log(`  | type | arcs | ${cyc.map((_, i) => `phase ${i}`).join(' | ')} |`);
  console.log(`  |---|---|${'---|'.repeat(cyc.length)}`);
  for (const T of TYPES) {
    console.log(
      `  | ${pad(T, 7)} | ${pad(nB[T] / 2, 2)} | ${cyc
        .map((r) => r[T].matching.map(([a, b]) => `${a}-${b}`).join(' '))
        .join(' | ')} |`,
    );
  }
  const singleArcTypes = TYPES.filter((T) => nB[T] === 2);
  console.log(`  root types whose supertile is a SINGLE arc at every level: ${singleArcTypes.join(', ') || '(none)'}`);
  note(
    singleArcTypes.length === 1 && singleArcTypes[0] === 'Psi',
    'Psi is the ONLY root type with a single arc; every other type has |dB|/2 >= 2 arcs at every level',
    TYPES.filter((T) => nB[T] !== 2).map((T) => `${T}=${nB[T] / 2}`).join(' '),
  );
  cycleByConfig.set(
    cfg.id,
    cyc.map((r) => tupleKey(r)).join('  ||  '),
  );
  const deltaPhases = cyc.map((r) => r['Delta'].matching.map(([a, b]) => `${a}-${b}`).join(' '));
  console.log(`  Delta profile: ${nB['Delta'] / 2} arcs at every level; pairing alternates`);
  deltaPhases.forEach((p, i) => console.log(`     phase ${i}: ${p}`));
  note(
    new Set(deltaPhases).size === Math.min(2, cyc.length) || cyc.length === 1,
    `Delta's pairing has period ${cyc.length}`,
  );

  // --- coverage -----------------------------------------------------------
  heading(`${cfg.id} — 5. coverage: the parent consumes every child arc exactly once`);
  let consumeOk = true;
  for (let ph = 0; ph < Math.max(1, Math.min(cyc.length, compAtStep.length)); ph++) {
    const comps = compAtStep[pre + ph] ?? compAtStep[ph];
    for (const T of TYPES) {
      const r = comps[T];
      if (r.consumed !== r.childArcTotal || r.newCycles !== 0) {
        consumeOk = false;
        console.log(`    ${T} phase ${ph}: consumed ${r.consumed} of ${r.childArcTotal}, ${r.newCycles} new cycles`);
      }
    }
  }
  note(consumeOk, 'every parent arc decomposition uses every child arc exactly once, no cycles formed');

  const leafTypes = leafOrder(cfg.family);
  const chordCounts = leafTypes.map((t) => chosenMatching(cfg, t as TileTypeId).length);
  console.log(`  chords per leaf type: ${leafTypes.map((t, i) => `${t}=${chordCounts[i]}`).join(', ')}`);
  note(
    chordCounts.every((c) => c >= 1),
    'every leaf type carries at least one chord',
  );
  // BASE CASE of the coverage induction: at level 1 the arcs of every supertile
  // type already visit every LEAF of that supertile.
  note(
    TYPES.every((T) => {
      const a = analyze(cfg, T, 1);
      return a.tilesCovered === a.tiles && a.circuits === 0;
    }),
    'base case: at level 1 every type\'s arcs visit every leaf, no circuits',
  );

  console.log(`\n  the Psi composition sequence (p:a-b = child at slot p, its arc joining its boundary dots a,b):`);
  for (let ph = 0; ph < Math.min(cyc.length, 2); ph++) {
    const comps = compAtStep[pre + ph] ?? compAtStep[ph];
    const r = comps['Psi'];
    const childArcs = D['Psi'].slots
      .map(({ slot, child }) => `${slot}=${child}(${orbit[pre + ph][child].matching.length})`)
      .join(' ');
    console.log(`    phase ${ph}  children: ${childArcs}   total child arcs ${r.childArcTotal}`);
    r.compositions.forEach((c, i) => console.log(`      parent arc ${i}: ${c}`));
  }

  compByConfig.set(
    cfg.id,
    [0, 1]
      .map((ph) => ((compAtStep[pre + ph] ?? compAtStep[ph])['Psi'].compositions.join(' ;; ')))
      .join('\n'),
  );

  // cross-check coverage against the directly expanded patches
  let coverOk = true;
  for (let lv = 1; lv <= MAX; lv++) {
    const a = analyze(cfg, 'Psi', lv);
    if (a.tilesCovered !== a.tiles || a.arcs !== 1) {
      coverOk = false;
      console.log(`    Psi@${lv}: ${a.arcs} arcs, ${a.tilesCovered}/${a.tiles} tiles covered`);
    }
  }
  note(coverOk, `directly-computed Psi patches: 1 arc covering every tile, k=1..${MAX}`);
  console.log(`  | level | tiles | segments | arcs | tiles covered |`);
  console.log(`  |---|---|---|---|---|`);
  for (let lv = 1; lv <= MAX; lv++) {
    const a = analyze(cfg, 'Psi', lv);
    console.log(`  | ${pad(lv, 3)} | ${pad(a.tiles, 8)} | ${pad(a.segs, 8)} | ${pad(a.arcs, 3)} | ${pad(a.tilesCovered, 8)} |`);
  }

  reports.push({ cfg, nB, direct, datumPeriod, abstractPeriod: per, abstractPre: pre, psiSingle, circuitFree });
}

// ---------------------------------------------------------------------------
// 6. Is the 2-cycle an attractor? (an experiment, NOT part of the proof)
// ---------------------------------------------------------------------------
heading('6. robustness experiment — F iterated from random routing states');
console.log(`  Not needed for the proof (the proof starts from the true state(.,1)), but it
  says how much of the conclusion is forced by the substitution alone rather
  than by the seed. 9-tuples of RANDOM perfect matchings are fed to F.`);
{
  const cfg = CONFIGS['spectre1278'];
  const D: Record<string, Datum> = {};
  for (const T of TYPES) D[T] = datumOf(cfg, T, 2);
  const nB: Record<string, number> = {};
  for (const T of TYPES) nB[T] = analyze(cfg, T, 1).nB;
  const trueCycle = new Set<string>();
  {
    let s0: Record<string, State> = {};
    for (const T of TYPES) s0[T] = stateOf(analyze(cfg, T, 1));
    for (let i = 0; i < 8; i++) {
      trueCycle.add(tupleKey(s0));
      const nx: Record<string, State> = {};
      for (const T of TYPES) nx[T] = applyF(D[T], s0).state;
      s0 = nx;
    }
  }
  let rng = 20260918;
  const rnd = (): number => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const randomMatching = (n: number): [number, number][] => {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    const m: [number, number][] = [];
    for (let i = 0; i < n; i += 2) m.push(a[i] < a[i + 1] ? [a[i], a[i + 1]] : [a[i + 1], a[i]]);
    m.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return m;
  };
  const TRIALS = 2000;
  let landed = 0;
  let withCircuits = 0;
  const endCycles = new Map<string, number>();
  for (let t = 0; t < TRIALS; t++) {
    let cur: Record<string, State> = {};
    for (const T of TYPES) cur[T] = { nB: nB[T], matching: randomMatching(nB[T]), circuits: 0, interiorEndArcs: 0 };
    for (let i = 0; i < 40; i++) {
      const nx: Record<string, State> = {};
      for (const T of TYPES) nx[T] = applyF(D[T], cur).state;
      cur = nx;
    }
    const noCirc: Record<string, State> = {};
    for (const T of TYPES) {
      if (cur[T].circuits !== 0) withCircuits++;
      noCirc[T] = { ...cur[T], circuits: 0 };
    }
    const k = tupleKey(noCirc);
    endCycles.set(k, (endCycles.get(k) ?? 0) + 1);
    if (trueCycle.has(k)) landed++;
  }
  console.log(`  ${TRIALS} random seeds, 40 iterations each:`);
  console.log(`    distinct matching-tuples reached: ${endCycles.size}`);
  console.log(`    landed on the TRUE 2-cycle (ignoring circuit count): ${landed} / ${TRIALS}`);
  console.log(`    type-states still carrying circuits after 40 steps: ${withCircuits} (of ${TRIALS * 9})`);
  console.log(`  Reading: the matching part of the state is ${landed === TRIALS ? 'a GLOBAL attractor' : 'NOT a global attractor'} — the boundary
  pairing of a deep supertile ${landed === TRIALS ? 'does not depend on the seed at all' : 'does depend on the seed'}.  Circuits, however, are
  never destroyed by F (a child circuit stays a circuit), so circuit-freeness
  genuinely needs the true base state and is not forced by the substitution.`);
}

// ---------------------------------------------------------------------------
heading('7. are the two configurations the same automaton?');
{
  const ids = reports.map((r) => r.cfg.id);
  const dKeys = ids.map((i) => datumByConfig.get(i) ?? '');
  const cKeys = ids.map((i) => cycleByConfig.get(i) ?? '');
  const pKeys = ids.map((i) => compByConfig.get(i) ?? '');
  note(dKeys[0] === dKeys[1], 'hex-128 and spectre-1278 have the IDENTICAL glue/outer datum for all 9 types');
  note(cKeys[0] === cKeys[1], 'hex-128 and spectre-1278 have the IDENTICAL routing cycle');
  note(pKeys[0] === pKeys[1], 'hex-128 and spectre-1278 have the IDENTICAL Psi composition sequences');
  console.log(`  flagship (spectre-1278-0100100000) datum identical to spectre-1278-0101000000: ${dKeys[2] === dKeys[1]}`);
  console.log(`  flagship cycle identical to spectre-1278-0101000000 cycle: ${cKeys[2] === cKeys[1]}`);
  console.log(`  flagship Psi compositions identical: ${pKeys[2] === pKeys[1]}`);
  console.log(`  (flagship's pre-period is 1, the other two 0: its level-1 routing states are
   transient and only its level-2 states join the cycle. That is the
   "phase shift by one substitution level" docs/FASS_1278.md section 1.1 reports.)`);
}

// ---------------------------------------------------------------------------
heading('Cross-configuration summary');
console.log(`  | config | ${TYPES.map((T) => pad(T, 6)).join(' | ')} | glue period | F pre/period | Psi single | circuit-free |`);
console.log(`  |---|${'---|'.repeat(TYPES.length + 4)}`);
for (const r of reports) {
  console.log(
    `  | ${pad(r.cfg.id, 22)} | ${TYPES.map((T) => pad(r.nB[T], 6)).join(' | ')} | ${r.datumPeriod} | ${r.abstractPre}/${r.abstractPeriod} | ${r.psiSingle} | ${r.circuitFree} |`,
  );
}

heading('What is proved, and what it rests on');
console.log(`  UNCONDITIONAL (exact integer arithmetic, levels 1..${MAX}, both configs):
    - |dB(T,k)| is the same at every computed level; the internal arcs are a
      perfect matching of it; zero circuits; zero interior arc endpoints;
      welded degree <= 2 and no junctions.
    - every degree-1 welded dot is EXACTLY the midpoint of an outline edge,
      so "boundary dot" is an exact notion, not a tolerance.
    - the gluing/outer datum read off the geometry is byte-identical at every
      computed transition (this is Lemma 3 re-verified, not assumed, for the
      transitions computed here).
    - the abstractly iterated F reproduces the directly computed states at
      every computed level. F is therefore the right operator.

  CONDITIONAL ON LEMMA 3 (glue/outer level-independent for ALL k):
    - state(.,k+1) = F(state(.,k)) for every k >= 1, so the whole orbit of F is
      the true sequence of routing states. The orbit is eventually periodic
      (finite state space), hence:
        * circuits = 0 for every type at every level;
        * the level-k Psi supertile is a single arc joining its two boundary
          dots, for every k;
        * each type's arc count is |dB|/2 at every level, and the pairings
          cycle with the detected period.
    - coverage: every leaf carries a chord, circuits are 0, so every component
      is an arc and every tile lies on one; at the Psi root there is exactly
      one arc, so it visits every tile, at every level.

  THE INDUCTION, stated precisely. Let G be the glue/outer datum read off the
  level-2 geometry. Lemma 3 says the datum read off the level-(k+1) geometry
  equals G for every k >= 1. The strand graph of a level-(k+1) patch is the
  disjoint union of its children's strand graphs with the pairs named by
  glue(G) identified (a child's interior dots already have degree 2, so no
  child dot can weld to anything but a sibling BOUNDARY dot). Hence
  state(.,k+1) = F_G(state(.,k)) with F_G the operator computed here. The base
  state(.,1) is computed exactly. F_G's orbit is eventually periodic because
  the matching component lives in a finite set and F_G is verified to map
  circuits 0 -> 0 on the whole orbit. Reading the cycle gives every level.

  WHAT IS *NOT* PROVED HERE:
    - Lemma 3 itself, at levels beyond the ones computed.
    - anything about the circuit count at a level whose state is not on the
      computed orbit: F never destroys a circuit, so circuit-freeness is a
      property of the true base state, NOT of the substitution (see section 6).
    - self-avoidance in the plane (geometric crossings) and the Hausdorff
      limit. Those are other lemmas.`);

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
