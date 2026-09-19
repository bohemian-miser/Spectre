/**
 * An INDEPENDENT test of V6, against a different generator and different tilings.
 *
 * Everything in `01`–`03` reads patches built by `zExpand`: a single supertile
 * expanded DOWNWARD from a chosen root. That is one family of patches, all
 * anchored at a supertile origin, and all drawn from the substitution's fixed
 * point. If V6 held only for those, the claim would be worthless.
 *
 * `src/core/unrooted.ts` builds the plane the other way round: a level-0 anchor
 * tile at the origin with the hierarchy grown UPWARD on demand, the ancestor
 * chain chosen by a seeded PRNG. Each seed names a different tiling of the whole
 * plane, and a viewport query returns a rectangular window centred wherever you
 * ask — not at a supertile corner. It shares the substitution rules and the leaf
 * geometry with `zExpand` and nothing else.
 *
 * This script re-runs the V6 checks, the atlas, and the circuit vocabulary on
 * such windows, over many seeds and many off-origin centres. A single new
 * cluster type, or one circuit outside the atlas, refutes the paper.
 *
 * Run: cd web && npx --yes tsx sel15-proof/05-unrooted-check.ts [seeds] [budget]
 * Reads `sel15-proof/atlas.json`; writes nothing.
 */

import { readFileSync } from 'node:fs';
import {
  canonicalCluster,
  chordsOf,
  cornerOf,
  decompose,
  finish,
  heading,
  note,
  scanClusters,
  seamsOf,
  verdict,
  zAdd,
  zApply2,
  zKey,
  zLeafPts,
  type Patch,
} from './lib15';
import { zConnectionPoints2 } from '../fass-proof/lib';
import {
  createUnrootedEngine,
  edgeLabels,
  instanceExactAffine,
  instanceTypeId,
  isAggregateType,
  parseEdgeLabel,
  type TileTypeId,
  type ZVec,
} from '../src/core';

const SEEDS = Number(process.argv[2] ?? 12);
const BUDGET = Number(process.argv[3] ?? 60_000);

const cert = JSON.parse(readFileSync(new URL('./atlas.json', import.meta.url), 'utf8')) as {
  combos: string[];
  clusters: { id: string; types: TileTypeId[]; links: [number, number, number, number][] }[];
};
const COMBOS = cert.combos;
const KNOWN = new Map<string, string>();
for (const c of cert.clusters) {
  KNOWN.set(canonicalCluster({ types: c.types, links: c.links }), c.id);
}
const KNOWN_WORDS = new Map<string, Set<string>>();
for (const combo of COMBOS) {
  const s = new Set<string>();
  for (const c of cert.clusters) {
    for (const w of decompose({ types: c.types, links: c.links }, combo).words) s.add(w);
  }
  KNOWN_WORDS.set(combo, s);
}

/** Build a `Patch` from an unrooted viewport query. */
function unrootedPatch(seed: number, cx: number, cy: number, half: number): Patch | null {
  const engine = createUnrootedEngine(seed, 'spectre');
  const cut = engine.query(
    { cx, cy, halfW: half, halfH: half },
    BUDGET,
    { emitExact: true, origin: { x: 0, y: 0 } },
  );
  if (cut.cutLevel !== 0 || !cut.exact) return null;      // need leaves, exactly
  const instances = [];
  for (let i = 0; i < cut.count; i++) {
    if (isAggregateType(cut.type[i])) return null;
    instances.push({
      type: instanceTypeId(cut.type[i], 'spectre'),
      xform: instanceExactAffine(cut.code[i], cut.exact, i),
      id: String(i),
    });
  }
  const dots = new Map<string, { i: number; s: number }[]>();
  const dotsOfTile = new Map<number, string[]>();
  const cache = new Map<TileTypeId, readonly ZVec[]>();
  for (let i = 0; i < instances.length; i++) {
    const type = instances[i].type;
    let pts = cache.get(type);
    if (!pts) { pts = zConnectionPoints2('spectre', type, [1, 5]); cache.set(type, pts); }
    for (let s = 0; s < pts.length; s++) {
      const k = zKey(zApply2(instances[i].xform, pts[s]));
      let list = dots.get(k);
      if (!list) { list = []; dots.set(k, list); }
      list.push({ i, s });
      let own = dotsOfTile.get(i);
      if (!own) { own = []; dotsOfTile.set(i, own); }
      own.push(k);
    }
  }
  return { instances, dots, dotsOfTile };
}

// ---------------------------------------------------------------------------

heading(`Independent check: ${SEEDS} seeds x 4 off-origin windows, budget ${BUDGET.toLocaleString('en-US')}`);

let windows = 0;
let tiles = 0;
let clusters = 0;
let worstMult = 0;
let pairViolations = 0;
let unknownClusters = 0;
let unknownCircuits = 0;
let badLengths = 0;
let badShapes = 0;
const shapes = new Map<string, number>();
const seenTypes = new Set<string>();
const lengths = new Set<number>();
const anchors = new Set<string>();
let skipped = 0;

for (let seed = 1; seed <= SEEDS; seed++) {
  for (const [cx, cy] of [[0, 0], [37.5, -19.25], [-88.125, 61.5], [211.75, 143.375]] as const) {
    const patch = unrootedPatch(seed, cx, cy, 26);
    if (!patch) { skipped++; continue; }
    windows++;
    tiles += patch.instances.length;
    anchors.add(createUnrootedEngine(seed, 'spectre').anchorType());

    // (a) dot multiplicity, and the +k.m / -k.m pairing
    for (const [, slots] of patch.dots) {
      worstMult = Math.max(worstMult, slots.length);
      if (slots.length !== 2) continue;
      const [a, b] = slots.map((x) => {
        const t = patch.instances[x.i].type;
        return parseEdgeLabel(edgeLabels('spectre', t)[seamsOf(t)[x.s].labelIndex]);
      });
      if (!(a.major === b.major && a.sign === -b.sign && a.minor === b.minor)) pairViolations++;
    }

    // (b) the cluster atlas
    const scan = scanClusters(patch, new Map(), false);
    for (const [key, v] of scan.atlas) {
      clusters += v.count;
      const id = KNOWN.get(key);
      if (id === undefined) { unknownClusters++; seenTypes.add('NEW: ' + key); }
      else seenTypes.add(id);
    }

    // (c) the vertex graph: components must be lone nodes or 3-cycles
    const nodes = new Map<string, { tile: number; type: TileTypeId }[]>();
    const edges = new Map<number, string[]>();
    for (let i = 0; i < patch.instances.length; i++) {
      const inst = patch.instances[i];
      const zp = zLeafPts('spectre', inst.type);
      for (const pair of chordsOf(inst.type, COMBOS[0])) {
        const c = cornerOf(inst.type, pair);
        if (c === null) continue;
        const k = zKey(zApply2(inst.xform, zAdd(zp[c], zp[c])));
        let l = nodes.get(k);
        if (!l) { l = []; nodes.set(k, l); }
        l.push({ tile: i, type: inst.type });
        if (seamsOf(inst.type).length === 4) {
          let e = edges.get(i);
          if (!e) { e = []; edges.set(i, e); }
          e.push(k);
        }
      }
    }
    const interior = new Set<string>();
    for (const [k, list] of nodes) {
      if (list.length !== 3) continue;
      if (list.every((x) => (patch.dotsOfTile.get(x.tile) ?? []).every((d) => patch.dots.get(d)!.length === 2))) {
        interior.add(k);
      }
    }
    const adj = new Map<string, string[]>();
    for (const k of interior) adj.set(k, []);
    for (const [, vs] of edges) {
      if (vs.length !== 2 || !interior.has(vs[0]) || !interior.has(vs[1])) continue;
      adj.get(vs[0])!.push(vs[1]);
      adj.get(vs[1])!.push(vs[0]);
    }
    const seen = new Set<string>();
    for (const k of interior) {
      if (seen.has(k)) continue;
      const stack = [k];
      const comp: string[] = [];
      seen.add(k);
      while (stack.length) {
        const x = stack.pop()!;
        comp.push(x);
        for (const y of adj.get(x) ?? []) if (!seen.has(y)) { seen.add(y); stack.push(y); }
      }
      const closed = comp.every((x) =>
        nodes.get(x)!.filter((y) => seamsOf(y.type).length === 4)
          .every((y) => (edges.get(y.tile) ?? []).every((z) => interior.has(z))));
      if (!closed) continue;
      const degs = comp.map((x) => (adj.get(x) ?? []).length).sort().join('');
      const shape = `${comp.length} node(s), degrees ${degs}`;
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
      if (shape !== '1 node(s), degrees 0' && shape !== '3 node(s), degrees 222') badShapes++;
    }

    // (d) every circuit of every complete cluster is a known atlas circuit
    for (const [, v] of scan.atlas) {
      for (const combo of COMBOS) {
        const d = decompose(v.cluster, combo);
        for (const L of d.cycles) {
          lengths.add(L);
          if (L !== 3 && L !== 6 && L !== 9) badLengths++;
        }
        for (const w of d.words) if (!KNOWN_WORDS.get(combo)!.has(w)) unknownCircuits++;
      }
    }
  }
}

console.log(`        windows analysed: ${windows} (skipped ${skipped} that came back as supertile aggregates)`);
console.log(`        tiles: ${tiles.toLocaleString('en-US')}   complete clusters: ${clusters.toLocaleString('en-US')}`);
console.log(`        distinct level-0 anchor types across seeds: ${[...anchors].sort().join(', ')}`);
console.log(`        vertex-graph component shapes: ${[...shapes].sort().map(([s, n]) => `${s} x${n.toLocaleString('en-US')}`).join('  |  ')}`);
console.log(`        cluster types encountered: ${[...seenTypes].filter((x) => !x.startsWith('NEW')).sort().join(' ')}`);

verdict(windows >= 20, 'enough independent windows were analysed', `${windows}`);
verdict(worstMult <= 2, 'no dot has multiplicity 3 or more', `max = ${worstMult}`);
verdict(pairViolations === 0, 'every interior active seam pairs +k.m against -k.m', `${pairViolations} violations`);
verdict(unknownClusters === 0, 'no cluster type outside the ten-type atlas', `${unknownClusters} new`);
verdict(badShapes === 0, 'V6: every closed vertex-graph component is a lone node or a 3-cycle', `${badShapes} bad`);
verdict(unknownCircuits === 0, 'no circuit outside the atlas word list', `${unknownCircuits} new`);
verdict(badLengths === 0, 'every circuit length is 3, 6 or 9', `lengths seen {${[...lengths].sort((a, b) => a - b).join(',')}}`);
note(
  'this is still a finite check',
  'but it is a different generator, different tilings, and windows centred away from any supertile origin',
);

finish();
