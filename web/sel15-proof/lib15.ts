/**
 * Shared machinery for the selection-`15` circuit-vocabulary proof
 * (docs/CIRCUITS_15.md).
 *
 * Everything here is built on `fass-proof/lib.ts`, so every position is an
 * exact `Z[zeta12]` integer (doubled, so edge midpoints stay integral) and
 * every adjacency statement below is an integer identity rather than a
 * floating-point observation.
 *
 * Nothing outside this directory is written.
 */

import {
  activeSeams,
  buildStrands,
  trace,
  zApply2,
  zConnectionPoints2,
  zExpand,
  type Config,
  type ZInstance,
} from '../fass-proof/lib';
import {
  comboToMatchingIndices,
  edgeLabels,
  enumerateMatchings,
  leafOrder,
  nonCrossingForTile,
  parseEdgeLabel,
  zAdd,
  zKey,
  zLeafPts,
  type TileTypeId,
  type ZVec,
} from '../src/core';

// ---------------------------------------------------------------------------
// The configuration under proof
// ---------------------------------------------------------------------------

/** Edge-class selection `15`: majors 1 and 5 active, class 0 excluded. */
export const SELECTION: readonly number[] = [1, 5];

/** Leaf order = the notebook's ALL_TILE_NAMES; combo digit i indexes tile i. */
export const ORDER: readonly TileTypeId[] = leafOrder('spectre');

/** The 8 substitution roots (Gamma1/Gamma2 are halves of the composite Gamma). */
export const ROOTS: readonly TileTypeId[] = [
  ...ORDER.filter((t) => t !== 'Gamma1' && t !== 'Gamma2'),
  'Gamma' as TileTypeId,
];

export const cfgOf = (combo: string): Config => ({
  id: `spectre-15-${combo}`,
  family: 'spectre',
  subset: SELECTION,
  combo,
});

/** The four admissible combination strings, derived rather than hardcoded. */
export function admissibleCombos(): readonly string[] {
  const opts = ORDER.map((t) => nonCrossingForTile('spectre', t, new Set(SELECTION)).length || 1);
  let out: string[] = [''];
  for (const n of opts) {
    const next: string[] = [];
    for (const p of out) for (let d = 0; d < n; d++) next.push(p + String(d));
    out = next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-tile local data
// ---------------------------------------------------------------------------

export interface SeamInfo {
  /** `-5A`, `+1A`, `+5B`, … */
  readonly name: string;
  /** Index into the tile's 14-entry physical label array of the `.0` label. */
  readonly labelIndex: number;
}

const seamCache = new Map<TileTypeId, readonly SeamInfo[]>();

/** Active seams of a leaf type, in `connectionPoints` order. */
export function seamsOf(type: TileTypeId): readonly SeamInfo[] {
  const hit = seamCache.get(type);
  if (hit) return hit;
  const seams = activeSeams(cfgOf('0000000000'), type);
  const labels = edgeLabels('spectre', type);
  const idxs: number[] = [];
  for (let i = 0; i < labels.length; i++) {
    const { major, minor } = parseEdgeLabel(labels[i]);
    if (minor === 0 && SELECTION.includes(major)) idxs.push(i);
  }
  const out = seams.map((s, i) => ({
    name: (s.sign < 0 ? '-' : '+') + s.major + s.variant,
    labelIndex: idxs[i],
  }));
  seamCache.set(type, out);
  return out;
}

/** Chosen chords of a leaf type under a combo, as pairs of active-seam indices. */
export function chordsOf(type: TileTypeId, combo: string): readonly (readonly [number, number])[] {
  const n = seamsOf(type).length;
  if (n < 2 || n % 2 !== 0) return [];
  const digit = comboToMatchingIndices('spectre', SELECTION, combo)[ORDER.indexOf(type)];
  return enumerateMatchings(n)[digit] ?? [];
}

/**
 * The tile vertex a chord cuts off, as an index into the tile's vertex array,
 * or `null` when the chord's two seams are not consecutive edges of the tile.
 */
export function cornerOf(type: TileTypeId, pair: readonly [number, number]): number | null {
  const seams = seamsOf(type);
  const n = edgeLabels('spectre', type).length;
  const a = seams[pair[0]].labelIndex;
  const b = seams[pair[1]].labelIndex;
  // physical edge i runs from vertex i to vertex i+1 (mod n)
  for (const v of [a, (a + 1) % n]) if (v === b || v === (b + 1) % n) return v;
  return null;
}

// ---------------------------------------------------------------------------
// Dots, contacts and clusters of a patch
// ---------------------------------------------------------------------------

export interface Patch {
  readonly instances: readonly ZInstance[];
  /** exact dot key -> the (tile, active-seam) slots that produce it. */
  readonly dots: ReadonlyMap<string, readonly { i: number; s: number }[]>;
  /** tile index -> its dot keys. */
  readonly dotsOfTile: ReadonlyMap<number, readonly string[]>;
}

export function buildPatch(root: TileTypeId, level: number): Patch {
  const instances = zExpand('spectre', root, level);
  const dots = new Map<string, { i: number; s: number }[]>();
  const dotsOfTile = new Map<number, string[]>();
  const cache = new Map<TileTypeId, readonly ZVec[]>();
  for (let i = 0; i < instances.length; i++) {
    const type = instances[i].type;
    let pts = cache.get(type);
    if (!pts) {
      pts = zConnectionPoints2('spectre', type, SELECTION);
      cache.set(type, pts);
    }
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

/** Relative linear part of `T_a^{-1} o T_b`, as (rotation steps, mirror). */
export function relativeLinear(
  a: ZInstance,
  b: ZInstance,
): { readonly k: number; readonly m: 0 | 1 } {
  const k = a.xform.m ? -(b.xform.k - a.xform.k) : b.xform.k - a.xform.k;
  return { k: ((k % 12) + 12) % 12, m: ((a.xform.m + b.xform.m) % 2) as 0 | 1 };
}

/** A two-tile contact across one active seam, up to lattice isometry. */
export interface Contact {
  readonly a: TileTypeId;
  readonly sa: number;
  readonly b: TileTypeId;
  readonly sb: number;
  readonly k: number;
  readonly m: 0 | 1;
}

export function contactKey(c: Contact): string {
  return `${c.a}.${c.sa}|${c.b}.${c.sb}|${c.k}.${c.m}`;
}

/** Orientation-independent key: the same physical contact read from either side. */
export function canonicalContact(p: Patch, key: string): Contact | null {
  const slots = p.dots.get(key);
  if (!slots || slots.length !== 2) return null;
  const [x, y] = slots;
  const ax = p.instances[x.i];
  const ay = p.instances[y.i];
  const fwd: Contact = {
    a: ax.type, sa: x.s, b: ay.type, sb: y.s, ...relativeLinear(ax, ay),
  };
  const rev: Contact = {
    a: ay.type, sa: y.s, b: ax.type, sb: x.s, ...relativeLinear(ay, ax),
  };
  return contactKey(fwd) <= contactKey(rev) ? fwd : rev;
}

// ---------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------

/** A cluster as an abstract labelled graph: what the strand structure needs. */
export interface Cluster {
  readonly types: readonly TileTypeId[];
  /** (nodeA, seamA, nodeB, seamB) — one entry per shared dot. */
  readonly links: readonly (readonly [number, number, number, number])[];
}

/** Total chords of a cluster: one per dot, since every dot has degree 2. */
export function chordCount(c: Cluster): number {
  return c.types.reduce((a, t) => a + seamsOf(t).length / 2, 0);
}

/** Canonical form of a cluster, minimised over all node relabellings. */
export function canonicalCluster(c: Cluster): string {
  const n = c.types.length;
  const used = new Array<boolean>(n).fill(false);
  const perm: number[] = [];
  let best: string | null = null;
  const emit = (): void => {
    const inv = new Array<number>(n);
    for (let i = 0; i < n; i++) inv[perm[i]] = i;
    const nodes = new Array<string>(n);
    for (let i = 0; i < n; i++) nodes[inv[i]] = c.types[i];
    const es = c.links
      .map(([a, sa, b, sb]) => {
        const x: [number, number] = [inv[a], sa];
        const y: [number, number] = [inv[b], sb];
        const [p, q] = x[0] < y[0] || (x[0] === y[0] && x[1] <= y[1]) ? [x, y] : [y, x];
        return `${p[0]}.${p[1]}-${q[0]}.${q[1]}`;
      })
      .sort()
      .join(',');
    const s = nodes.join('|') + '#' + es;
    if (best === null || s < best) best = s;
  };
  const rec = (): void => {
    if (perm.length === n) { emit(); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; perm.push(i); rec(); perm.pop(); used[i] = false;
    }
  };
  rec();
  return best!;
}

/** Cheap isomorphism invariant, used to memoise {@link canonicalCluster}. */
export function clusterPreKey(c: Cluster): string {
  const deg = new Array<number>(c.types.length).fill(0);
  for (const [a, , b] of c.links) { deg[a]++; deg[b]++; }
  const nodeSig = c.types.map((t, i) => `${t}:${deg[i]}`).sort().join('|');
  const linkSig = c.links
    .map(([a, sa, b, sb]) => {
      const x = `${c.types[a]}.${sa}`;
      const y = `${c.types[b]}.${sb}`;
      return x <= y ? `${x}~${y}` : `${y}~${x}`;
    })
    .sort()
    .join(',');
  return `${nodeSig}#${linkSig}`;
}

export interface ClusterScan {
  /** Complete (untruncated) clusters, keyed by canonical form. */
  readonly atlas: ReadonlyMap<string, { readonly cluster: Cluster; count: number }>;
  readonly truncated: number;
  readonly contacts: ReadonlyMap<string, Contact>;
  readonly dotMultiplicity: ReadonlyMap<number, number>;
}

/**
 * Split a patch into active-adjacency components. A cluster is COMPLETE when
 * every dot of every member tile is shared by two tiles, i.e. the patch
 * boundary does not truncate it; only complete clusters occur in the infinite
 * tiling, so only those enter the atlas.
 */
export function scanClusters(
  p: Patch,
  memo: Map<string, string> = new Map(),
  verifyMemo = false,
): ClusterScan {
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    if (!parent.has(x)) parent.set(x, x);
    let r = x;
    while (parent.get(r)! !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c)! !== c) { const nx = parent.get(c)!; parent.set(c, r); c = nx; }
    return r;
  };
  const uni = (a: number, b: number): void => {
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const dotMultiplicity = new Map<number, number>();
  const contacts = new Map<string, Contact>();
  for (const [key, slots] of p.dots) {
    dotMultiplicity.set(slots.length, (dotMultiplicity.get(slots.length) ?? 0) + 1);
    for (const x of slots) find(x.i);
    for (let j = 1; j < slots.length; j++) uni(slots[0].i, slots[j].i);
    const c = canonicalContact(p, key);
    if (c) contacts.set(contactKey(c), c);
  }

  const groups = new Map<number, number[]>();
  for (const x of parent.keys()) {
    const r = find(x);
    let g = groups.get(r);
    if (!g) { g = []; groups.set(r, g); }
    g.push(x);
  }

  const atlas = new Map<string, { cluster: Cluster; count: number }>();
  let truncated = 0;
  for (const g of groups.values()) {
    const complete = g.every((i) =>
      (p.dotsOfTile.get(i) ?? []).every((k) => p.dots.get(k)!.length === 2),
    );
    if (!complete) { truncated++; continue; }
    const idx = new Map<number, number>();
    g.forEach((t, j) => idx.set(t, j));
    const seen = new Set<string>();
    const links: (readonly [number, number, number, number])[] = [];
    for (const i of g) {
      for (const k of p.dotsOfTile.get(i) ?? []) {
        if (seen.has(k)) continue;
        seen.add(k);
        const [x, y] = p.dots.get(k)!;
        links.push([idx.get(x.i)!, x.s, idx.get(y.i)!, y.s]);
      }
    }
    const cluster: Cluster = { types: g.map((t) => p.instances[t].type), links };
    const pre = clusterPreKey(cluster);
    let key = memo.get(pre);
    if (key === undefined || verifyMemo) {
      const full = canonicalCluster(cluster);
      if (key === undefined) { key = full; memo.set(pre, full); }
      else if (key !== full) throw new Error(`cluster pre-key collision: ${pre}`);
    }
    const hit = atlas.get(key);
    if (hit) hit.count++;
    else atlas.set(key, { cluster, count: 1 });
  }
  return { atlas, truncated, contacts, dotMultiplicity };
}

// ---------------------------------------------------------------------------
// Strand decomposition of a cluster
// ---------------------------------------------------------------------------

export interface Decomposition {
  readonly cycles: readonly number[];
  readonly paths: readonly number[];
  /** One canonical word per cycle: `Type in>out` per step, rotation/reversal-minimal. */
  readonly words: readonly string[];
}

/**
 * Decompose a cluster's strand graph under one combo. Strand-graph vertices
 * are the cluster's shared dots; strand-graph edges are the tiles' chords.
 */
export function decompose(c: Cluster, combo: string): Decomposition {
  const dotOf = new Map<string, number>();
  c.links.forEach(([a, sa, b, sb], i) => {
    dotOf.set(`${a}.${sa}`, i);
    dotOf.set(`${b}.${sb}`, i);
  });
  const chords: [number, number][] = [];
  const owner: number[] = [];
  const ends = new Map<string, number>();       // `chordId.dotId` -> seam index
  const adj = new Map<number, number[]>();
  c.types.forEach((t, node) => {
    for (const pair of chordsOf(t, combo)) {
      const dp = dotOf.get(`${node}.${pair[0]}`);
      const dq = dotOf.get(`${node}.${pair[1]}`);
      if (dp === undefined || dq === undefined) continue;
      const id = chords.length;
      chords.push([dp, dq]);
      ends.set(`${id}.${dp}`, pair[0]);
      ends.set(`${id}.${dq}`, pair[1]);
      owner.push(node);
      for (const d of [dp, dq]) {
        let l = adj.get(d);
        if (!l) { l = []; adj.set(d, l); }
        l.push(id);
      }
    }
  });
  const used = new Array<boolean>(chords.length).fill(false);
  const cycles: number[] = [];
  const paths: number[] = [];
  const words: string[] = [];
  const walk = (start: number, first: number): void => {
    const visited: number[] = [];
    const steps: string[] = [];
    let cur = start;
    let ch = first;
    for (;;) {
      used[ch] = true;
      visited.push(ch);
      const [x, y] = chords[ch];
      const next = x === cur ? y : x;
      const t = c.types[owner[ch]];
      steps.push(
        `${t}${seamsOf(t)[ends.get(`${ch}.${cur}`)!].name}>${seamsOf(t)[ends.get(`${ch}.${next}`)!].name}`,
      );
      if (next === start) {
        cycles.push(visited.length);
        const seq = steps;
        // canonical rotation of the cyclic word, and of its reversal
        const rots: string[] = [];
        for (const s of [seq, [...seq].reverse()]) {
          for (let r = 0; r < s.length; r++) rots.push(s.slice(r).concat(s.slice(0, r)).join(' | '));
        }
        words.push(rots.sort()[0]);
        return;
      }
      const cont = (adj.get(next) ?? []).filter((z) => !used[z]);
      if ((adj.get(next) ?? []).length !== 2 || cont.length !== 1) {
        paths.push(visited.length);
        return;
      }
      cur = next;
      ch = cont[0];
    }
  };
  for (const [d, list] of adj) if (list.length !== 2) for (const ch of list) if (!used[ch]) walk(d, ch);
  for (let ch = 0; ch < chords.length; ch++) if (!used[ch]) walk(chords[ch][0], ch);
  return {
    cycles: [...cycles].sort((a, b) => a - b),
    paths: [...paths].sort((a, b) => a - b),
    words,
  };
}

// ---------------------------------------------------------------------------
// Reporting helpers (same shape as fass-proof)
// ---------------------------------------------------------------------------

let failures = 0;

export function heading(title: string): void {
  console.log(`\n${title}\n${'-'.repeat(title.length)}`);
}

export function verdict(ok: boolean, label: string, detail = ''): boolean {
  if (!ok) failures++;
  console.log(`  [${ok ? ' OK ' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

export function note(label: string, detail = ''): void {
  console.log(`  [NOTE] ${label}${detail ? ` — ${detail}` : ''}`);
}

export function finish(): never {
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `SOME CHECKS FAILED (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
}

export { buildStrands, trace, zExpand, zAdd, zLeafPts, zKey, zApply2 };
