/**
 * Self-similarity engine: computes, for every supertile type T and level k,
 * the ROUTING (pairing of boundary connection dots by the arcs inside) and
 * the COMPOSITION RULE (how the level-k routing of T is assembled from the
 * level-(k-1) routings of its children under the substitution).
 *
 * Outputs, per (T, k):
 *   - top-level arcs: dot-pair -> segment count (dots in canonical outline
 *     order, chirality-stable anchor at the supertile quad);
 *   - per-child interface: child pos/type, dot count, routing pairing;
 *   - inter-child gluing: which child dot welds to which sibling dot;
 *   - outer map: which child dots become the parent's boundary dots;
 *   - parent arc composition: the exact sequence of (childPos, childArc)
 *     each parent arc traverses.
 *
 * Then compares signatures across levels: expectation is period 2 in k
 * (buildSupertiles mirror-flips each level), i.e. signature(T,k) ==
 * signature(T,k+2), which — together with the base cases — closes the
 * induction for self-similarity.
 *
 * Finally: the nested-Delta merge analysis (child pos 1 of Delta is Delta),
 * deciding whether the arcs join into ONE curve in the nested-union limit.
 *
 * Run: cd web && npx --yes tsx fass-investigation/04-substitution.ts <combo> [maxLevel]
 * e.g. npx --yes tsx fass-investigation/04-substitution.ts 0100100000 5
 */

import { TILE_NAMES, buildSystem, flatten, transPt, type TileTypeId } from '../src/core';
import {
  collectTagged,
  endpointsOf,
  locateOnOutline,
  patchOutline,
  traceIndexed,
  FAMILY,
} from './lib';

const COMBO = process.argv[2] ?? '0100100000';
const MAX_LEVEL = Number(process.argv[3] ?? 5);

interface ChildInterface {
  readonly pos: number;
  readonly type: string;
  readonly dotCount: number;
  /** child dot canonical label -> welded point key */
  readonly dotKeys: readonly string[];
  /** arcs inside the child: 'a-b' dot-pair -> seg count */
  readonly pairing: ReadonlyMap<string, number>;
  /** seg index -> child arc id ('a-b') */
  readonly arcOfSeg: ReadonlyMap<number, string>;
}

interface LevelData {
  readonly type: string;
  readonly level: number;
  /** top-level arcs: 'a-b' (parent outline labels) -> seg count */
  readonly topPairing: ReadonlyMap<string, number>;
  readonly children: readonly ChildInterface[];
  /** 'posA:labA=posB:labB' sorted strings */
  readonly gluing: readonly string[];
  /** parent outer label -> 'pos:lab' */
  readonly outer: readonly string[];
  /** parent arc id -> sequence of 'pos:childArc' visits (runs collapsed) */
  readonly composition: ReadonlyMap<string, readonly string[]>;
  readonly circuits: number;
  readonly junctions: number;
}

function analyzeLevel(type: TileTypeId, level: number): LevelData {
  const sys = buildSystem(FAMILY, level);
  const root = sys[type];
  if (root.kind !== 'meta') throw new Error(`${type}@${level} is not a meta node`);
  const instances = flatten(root);
  const tagged = collectTagged(instances, COMBO);
  const segChild = tagged.instOf.map((ii) =>
    Number(tagged.instances[ii].id.split('.')[0]),
  );

  // --- global trace (parent arcs) ---
  const global = traceIndexed(tagged.segs);

  // --- parent outline + outer dots ---
  const outline = patchOutline(instances, root.quad);
  const outerDots = locateOnOutline(outline, endpointsOf(global));
  const outerLabelOf = new Map(outerDots.map((d, i) => [d.key, i]));

  const topPairing = new Map<string, number>();
  const topArcOfSeg = new Map<number, string>();
  for (const t of global.tails) {
    const a = outerLabelOf.get(t.keys[0]);
    const b = outerLabelOf.get(t.keys[t.keys.length - 1]);
    if (a === undefined || b === undefined) throw new Error('tail end not an outer dot');
    const id = `${Math.min(a, b)}-${Math.max(a, b)}`;
    topPairing.set(id, t.segIdxs.length);
    for (const si of t.segIdxs) topArcOfSeg.set(si, id);
  }
  for (const c of global.circuits) {
    for (const si of c.segIdxs) topArcOfSeg.set(si, 'CIRCUIT');
  }

  // --- per-child interfaces ---
  const childPos = [...new Set(segChild)].sort((a, b) => a - b);
  const children: ChildInterface[] = [];
  for (const pos of childPos) {
    const child = root.children.find((c) => c.pos === pos)!;
    const childInsts = instances
      .map((inst, i) => ({ inst, i }))
      .filter(({ inst }) => Number(inst.id.split('.')[0]) === pos);
    const include: number[] = [];
    for (let si = 0; si < tagged.segs.length; si++) {
      if (segChild[si] === pos) include.push(si);
    }
    const trace = traceIndexed(tagged.segs, include);
    if (trace.circuits.length) {
      // record as a pairing entry so it can't be missed
    }
    const quad = child.node.quad.map((p) => transPt(child.xform, p));
    const childOutline = patchOutline(childInsts.map((x) => x.inst), quad);
    const dots = locateOnOutline(childOutline, endpointsOf(trace));
    const labelOf = new Map(dots.map((d, i) => [d.key, i]));
    const pairing = new Map<string, number>();
    const arcOfSeg = new Map<number, string>();
    for (const t of trace.tails) {
      const a = labelOf.get(t.keys[0])!;
      const b = labelOf.get(t.keys[t.keys.length - 1])!;
      const id = `${Math.min(a, b)}-${Math.max(a, b)}`;
      pairing.set(id, t.segIdxs.length);
      for (const si of t.segIdxs) arcOfSeg.set(si, id);
    }
    for (const c of trace.circuits) {
      pairing.set('CIRCUIT', (pairing.get('CIRCUIT') ?? 0) + c.segIdxs.length);
      for (const si of c.segIdxs) arcOfSeg.set(si, 'CIRCUIT');
    }
    children.push({
      pos,
      type: child.node.type,
      dotCount: dots.length,
      dotKeys: dots.map((d) => d.key),
      pairing,
      arcOfSeg,
    });
  }

  // --- gluing: welded keys shared by two children's dots; outer keys map up ---
  const dotOwner = new Map<string, string[]>(); // key -> ['pos:label', ...]
  for (const ch of children) {
    ch.dotKeys.forEach((k, lab) => {
      if (!dotOwner.has(k)) dotOwner.set(k, []);
      dotOwner.get(k)!.push(`${ch.pos}:${lab}`);
    });
  }
  const gluing: string[] = [];
  const outer: string[] = [];
  for (const [k, owners] of dotOwner) {
    if (owners.length === 2) {
      gluing.push([...owners].sort().join('='));
    } else if (owners.length === 1) {
      const lab = outerLabelOf.get(k);
      if (lab === undefined) throw new Error(`lonely child dot ${k} is not a parent outer dot`);
      outer.push(`${lab}<-${owners[0]}`);
    } else {
      throw new Error(`dot ${k} owned by ${owners.length} children`);
    }
  }
  gluing.sort();
  outer.sort((a, b) => Number(a.split('<-')[0]) - Number(b.split('<-')[0]));

  // --- composition: per parent arc, sequence of (child pos:child arc) runs ---
  const composition = new Map<string, string[]>();
  for (const t of global.tails) {
    const a = outerLabelOf.get(t.keys[0])!;
    const b = outerLabelOf.get(t.keys[t.keys.length - 1])!;
    const id = `${Math.min(a, b)}-${Math.max(a, b)}`;
    const seq: string[] = [];
    // walk in canonical direction: from lower label end
    const segsInOrder = a <= b ? t.segIdxs : [...t.segIdxs].reverse();
    for (const si of segsInOrder) {
      const pos = segChild[si];
      const ch = children.find((c) => c.pos === pos)!;
      const arc = ch.arcOfSeg.get(si)!;
      const item = `${pos}:${arc}`;
      if (seq.length === 0 || seq[seq.length - 1] !== item) seq.push(item);
    }
    composition.set(id, seq);
  }

  return {
    type,
    level,
    topPairing,
    children,
    gluing,
    outer,
    composition,
    circuits: global.circuits.length,
    junctions: global.junctionCount,
  };
}

/** Level-independent part of the structure (segment counts stripped). */
function signature(d: LevelData): string {
  const parts: string[] = [];
  parts.push(`top:${[...d.topPairing.keys()].sort().join(',')}`);
  for (const ch of d.children) {
    parts.push(
      `child${ch.pos}(${ch.type}):dots=${ch.dotCount};pairs=${[...ch.pairing.keys()].sort().join(',')}`,
    );
  }
  parts.push(`glue:${d.gluing.join(',')}`);
  parts.push(`outer:${d.outer.join(',')}`);
  const comp = [...d.composition.entries()]
    .sort()
    .map(([id, seq]) => `${id}=>${seq.join('>')}`);
  parts.push(`comp:${comp.join(' | ')}`);
  return parts.join('\n  ');
}

// ---------------------------------------------------------------------------
const store = new Map<string, LevelData>();
const types = TILE_NAMES as readonly TileTypeId[];

for (let k = 1; k <= MAX_LEVEL; k++) {
  for (const t of types) {
    const d = analyzeLevel(t, k);
    store.set(`${t}@${k}`, d);
  }
}

console.log(`combo ${COMBO} — routing & composition signatures, levels 1..${MAX_LEVEL}\n`);

// 1. circuits / junctions anywhere?
let anyCircuit = false;
for (const [key, d] of store) {
  if (d.circuits || d.junctions) {
    console.log(`!! ${key}: circuits=${d.circuits} junctions=${d.junctions}`);
    anyCircuit = true;
  }
}
console.log(anyCircuit ? '' : `No circuits and no junctions in ANY supertile type at any level 1..${MAX_LEVEL}.`);

// 2. interface sizes and top pairings per type/level
for (const t of types) {
  const row: string[] = [];
  for (let k = 1; k <= MAX_LEVEL; k++) {
    const d = store.get(`${t}@${k}`)!;
    const pairs = [...d.topPairing.entries()]
      .sort()
      .map(([id, n]) => `${id}:${n}`)
      .join(' ');
    row.push(`k${k}[${pairs}]`);
  }
  console.log(`${t.padEnd(7)} ${row.join('  ')}`);
}

// 3. signature comparisons: k vs k+2 (expect EQUAL), k vs k+1 (report)
console.log('\nSignature stability (structure only, seg counts stripped):');
for (const t of types) {
  const eq2: string[] = [];
  for (let k = 1; k + 2 <= MAX_LEVEL; k++) {
    const a = signature(store.get(`${t}@${k}`)!);
    const b = signature(store.get(`${t}@${k + 2}`)!);
    eq2.push(`${k}==${k + 2}:${a === b ? 'YES' : 'NO'}`);
  }
  const eq1: string[] = [];
  for (let k = 1; k + 1 <= MAX_LEVEL; k++) {
    const a = signature(store.get(`${t}@${k}`)!);
    const b = signature(store.get(`${t}@${k + 1}`)!);
    eq1.push(`${k}==${k + 1}:${a === b ? 'YES' : 'no'}`);
  }
  console.log(`${t.padEnd(7)} period-2: ${eq2.join(' ')}   adjacent: ${eq1.join(' ')}`);
}

// 3b. gluing/outer level-independence (needed for the induction: if the
// composition operator F (gluing+outer) is the SAME at every level, then
// sig(T,3)==sig(T,5) propagates to all k>=3 of both parities).
console.log('\nGluing/outer level-independence (k=2..maxLevel):');
for (const t of types) {
  const gl: string[] = [];
  for (let k = 2; k <= MAX_LEVEL; k++) {
    const d = store.get(`${t}@${k}`)!;
    gl.push(`${d.gluing.join(',')}##${d.outer.join(',')}`);
  }
  const allEq = gl.every((g) => g === gl[0]);
  console.log(`  ${t.padEnd(7)} gluing+outer identical for all levels 2..${MAX_LEVEL}: ${allEq ? 'YES' : 'NO'}`);
}

// 4. consistency: child pairing inside parent == standalone routing of child type
console.log('\nChild-in-parent vs standalone routing consistency:');
let allConsistent = true;
for (const t of types) {
  for (let k = 2; k <= MAX_LEVEL; k++) {
    const d = store.get(`${t}@${k}`)!;
    for (const ch of d.children) {
      const standalone = store.get(`${ch.type}@${k - 1}`);
      if (!standalone) continue; // leaves at k=1 have no standalone meta record
      const a = [...ch.pairing.entries()].sort().map(([i, n]) => `${i}:${n}`).join(',');
      const b = [...standalone.topPairing.entries()].sort().map(([i, n]) => `${i}:${n}`).join(',');
      if (a !== b) {
        console.log(`  MISMATCH ${t}@${k} child${ch.pos}(${ch.type}): [${a}] vs standalone [${b}]`);
        allConsistent = false;
      }
    }
  }
}
console.log(allConsistent ? '  all child interfaces IDENTICAL to standalone routings (arc-by-arc, including segment counts)' : '  inconsistencies found!');

// 5. full composition rule for Delta and Psi at the top two levels (for the doc)
for (const key of [
  `Delta@${MAX_LEVEL - 1}`,
  `Delta@${MAX_LEVEL}`,
  `Psi@${MAX_LEVEL - 1}`,
  `Psi@${MAX_LEVEL}`,
]) {
  const d = store.get(key)!;
  const k = d.level;
  console.log(`\n${d.type}@${k} composition (parent arc => child arc sequence):`);
  for (const [id, seq] of [...d.composition.entries()].sort()) {
    console.log(`  ${id} (${d.topPairing.get(id)} segs) => ${seq.join(' > ')}`);
  }
  console.log(`  gluing: ${d.gluing.join('  ')}`);
  console.log(`  outer: ${d.outer.join('  ')}`);
}

// 6. nested-Delta merge analysis: child pos 1 of Delta@k is Delta@(k-1).
console.log('\nNested-Delta merge (does the limit curve stay ONE?):');
function mergePass(k: number): void {
  const type: TileTypeId = 'Delta';
  const root = buildSystem(FAMILY, k)[type];
  if (root.kind !== 'meta') return;
  const instances = flatten(root);
  const tagged = collectTagged(instances, COMBO);
  const segChild = tagged.instOf.map((ii) => Number(tagged.instances[ii].id.split('.')[0]));
  const global = traceIndexed(tagged.segs);
  const outline = patchOutline(instances, root.quad);
  const outerDots = locateOnOutline(outline, endpointsOf(global));
  const outerLabelOf = new Map(outerDots.map((d, i) => [d.key, i]));
  const parentArcOfSeg = new Map<number, string>();
  const parentLen = new Map<string, number>();
  for (const t of global.tails) {
    const a = outerLabelOf.get(t.keys[0])!;
    const b = outerLabelOf.get(t.keys[t.keys.length - 1])!;
    const id = `${Math.min(a, b)}-${Math.max(a, b)}`;
    parentLen.set(id, t.segIdxs.length);
    for (const si of t.segIdxs) parentArcOfSeg.set(si, id);
  }
  // child pos 1 restricted trace
  const include: number[] = [];
  for (let si = 0; si < tagged.segs.length; si++) if (segChild[si] === 1) include.push(si);
  const childTrace = traceIndexed(tagged.segs, include);
  const child = root.children.find((c) => c.pos === 1)!;
  const childInsts = instances.filter((inst) => Number(inst.id.split('.')[0]) === 1);
  const quad = child.node.quad.map((p) => transPt(child.xform, p));
  const childOutline = patchOutline(childInsts, quad);
  const dots = locateOnOutline(childOutline, endpointsOf(childTrace));
  const labelOf = new Map(dots.map((d, i) => [d.key, i]));
  const rows: string[] = [];
  for (const t of [...childTrace.tails].sort((x, y) => y.segIdxs.length - x.segIdxs.length)) {
    const a = labelOf.get(t.keys[0])!;
    const b = labelOf.get(t.keys[t.keys.length - 1])!;
    const parents = new Set(t.segIdxs.map((si) => parentArcOfSeg.get(si)!));
    rows.push(
      `child arc ${Math.min(a, b)}-${Math.max(a, b)} (${t.segIdxs.length} segs) -> parent arc(s) ${[...parents]
        .map((p) => `${p}(${parentLen.get(p)} segs)`)
        .join(', ')}`,
    );
  }
  console.log(`  Delta@${k-1} inside Delta@${k}:`);
  for (const r of rows) console.log(`    ${r}`);
}
for (let k = 2; k <= MAX_LEVEL; k++) mergePass(k);
