/**
 * Large-scale equivalence of pairings: which pairings of a rule join the
 * crossings on every level-n supertile's outline in the same way.
 *
 * Inside a supertile of type T, a pairing's strands join the crossings on T's
 * outline in pairs (and close some circuits wholly inside). Call that pairing
 * of outline crossings T's *boundary map* at level n. If two pairings have the
 * same boundary map for every type at level n, then every strand that leaves a
 * level-n supertile goes the same way in both, so everything larger than a
 * level-n supertile is identical: they differ only inside level-n supertiles.
 * Equal at level n implies equal at n + 1 (a level-(n + 1) supertile is built
 * from level-n ones), so the classes only merge as n grows.
 *
 * Usage: tsx boundary-classes.ts <family> <rule> <maxLevel> [combo ...]
 *   Prints, per level, how many classes the rule's pairings fall into and the
 *   class of each named combo with all its members.
 */
import {
  buildSystem,
  comboDigitChar,
  comboOptionCounts,
  connectionPoints,
  enumerateMatchings,
  flatten,
  leafOrder,
  nonCrossingForTile,
  transPt,
  type TileFamilyId,
  type TileTypeId,
} from '../src/core';

export interface SupertilePatch {
  readonly type: TileTypeId;
  readonly nTiles: number;
  readonly tileType: Uint8Array;
  readonly tileOcc: Int32Array;
  readonly occNode: Int32Array;
  /** The other occurrence at the same node (-1 on the outline). */
  readonly across: Int32Array;
  /** Outline nodes' first (only) occurrence, in node order. */
  readonly outline: Int32Array;
  readonly nNodes: number;
}

/** A level-`level` supertile of `type`, its tiles' crossings welded into nodes. */
export function supertilePatch(family: TileFamilyId, subset: readonly number[], level: number, type: TileTypeId): SupertilePatch {
  const sel = new Set(subset);
  const types = leafOrder(family);
  const typeIdx = new Map(types.map((t, i) => [t, i]));
  const local = types.map((t) => connectionPoints(family, t, sel).map((c) => c.pt));
  const insts = flatten(buildSystem(family, level)[type]);
  const nTiles = insts.length;
  const tileType = new Uint8Array(nTiles);
  const tileOcc = new Int32Array(nTiles + 1);
  let nOcc = 0;
  insts.forEach((inst, i) => {
    tileType[i] = typeIdx.get(inst.type) as number;
    tileOcc[i] = nOcc;
    nOcc += local[tileType[i]].length;
  });
  tileOcc[nTiles] = nOcc;
  const occNode = new Int32Array(nOcc);
  const firstOcc: number[] = [];
  const across = new Int32Array(nOcc).fill(-1);
  const keyToNode = new Map<string, number>();
  let o = 0;
  insts.forEach((inst, i) => {
    for (const p of local[tileType[i]]) {
      const w = transPt(inst.xform, p);
      const key = `${Math.round(w.x * 200)},${Math.round(w.y * 200)}`;
      let n = keyToNode.get(key);
      if (n === undefined) {
        n = firstOcc.length;
        keyToNode.set(key, n);
        firstOcc.push(o);
      } else {
        const other = firstOcc[n];
        if (across[other] !== -1) throw new Error('three tiles at one crossing');
        across[other] = o;
        across[o] = other;
      }
      occNode[o++] = n;
    }
  });
  const outline = Int32Array.from(firstOcc.filter((occ) => across[occ] === -1));
  return { type, nTiles, tileType, tileOcc, occNode, across, outline, nNodes: firstOcc.length };
}

/** Each tile type's options for a rule (digit -> local index pairs). */
export function ruleOptions(family: TileFamilyId, subset: readonly number[]): (readonly (readonly [number, number])[])[][] {
  const sel = new Set(subset);
  return leafOrder(family).map((t) => {
    const n = connectionPoints(family, t, sel).length;
    const all = enumerateMatchings(n);
    const nc = nonCrossingForTile(family, t, sel);
    return nc.length === 0 ? [[]] : nc.map((m) => all[m] as (readonly [number, number])[]);
  });
}

/**
 * The boundary map of one pairing on one supertile: for each outline crossing
 * (by its position in `patch.outline`), the position of the one its strand
 * comes out at. Also how many circuits close inside.
 */
export function boundaryMap(
  patch: SupertilePatch,
  options: (readonly (readonly [number, number])[])[][],
  digits: readonly number[],
): { mate: Int32Array; closed: number } {
  const nOcc = patch.occNode.length;
  const partner = new Int32Array(nOcc).fill(-1);
  for (let i = 0; i < patch.nTiles; i++) {
    const base = patch.tileOcc[i];
    const ti = patch.tileType[i];
    for (const [a, b] of options[ti][digits[ti]]) {
      partner[base + a] = base + b;
      partner[base + b] = base + a;
    }
  }
  const outlinePos = new Map<number, number>();
  patch.outline.forEach((occ, k) => outlinePos.set(occ, k));
  const seen = new Uint8Array(nOcc);
  const mate = new Int32Array(patch.outline.length).fill(-1);
  // Walk: occ -> partner in its tile -> across the seam -> ...
  const walk = (start: number): number => {
    let occ = start;
    for (;;) {
      seen[occ] = 1;
      const p = partner[occ];
      if (p < 0) return -2; // a dead end (unpaired crossing)
      seen[p] = 1;
      const q = patch.across[p];
      if (q < 0) return p; // left the supertile
      occ = q;
    }
  };
  patch.outline.forEach((occ, k) => {
    if (seen[occ]) return;
    const end = walk(occ);
    if (end >= 0) {
      const j = outlinePos.get(end) as number;
      mate[k] = j;
      mate[j] = k;
    }
  });
  let closed = 0;
  for (let occ = 0; occ < nOcc; occ++) {
    if (seen[occ] || partner[occ] < 0) continue;
    closed++;
    let o = occ;
    while (!seen[o]) {
      seen[o] = 1;
      const p = partner[o];
      seen[p] = 1;
      o = patch.across[p];
      if (o < 0) break;
    }
  }
  return { mate, closed };
}

export function comboString(digits: readonly number[]): string {
  return digits.map((d) => comboDigitChar(d) ?? '0').join('');
}

export function allDigits(counts: readonly number[]): number[][] {
  const out: number[][] = [[]];
  for (const k of counts) {
    const next: number[][] = [];
    for (const d of out) for (let v = 0; v < k; v++) next.push([...d, v]);
    out.splice(0, out.length, ...next);
  }
  return out;
}

/** Group a rule's pairings by their boundary maps at one level (every supertile type). */
export function boundaryClasses(family: TileFamilyId, subset: readonly number[], level: number): { classOf: Int32Array; combos: string[]; keys: string[] } {
  const counts = comboOptionCounts(family, subset);
  const combos = allDigits(counts);
  const options = ruleOptions(family, subset);
  const types = Object.keys(buildSystem(family, level)) as TileTypeId[];
  const patches = types.map((t) => supertilePatch(family, subset, level, t));
  const keyOf = combos.map((d) => patches.map((p) => Array.from(boundaryMap(p, options, d).mate).join(',')).join('|'));
  const ids = new Map<string, number>();
  const classOf = Int32Array.from(keyOf, (k) => {
    if (!ids.has(k)) ids.set(k, ids.size);
    return ids.get(k) as number;
  });
  return { classOf, combos: combos.map(comboString), keys: [...ids.keys()] };
}

if (process.argv[1]?.endsWith('boundary-classes.ts')) {
  const [family, rule, maxArg, ...wanted] = process.argv.slice(2);
  const subset = [...rule].map(Number);
  for (let level = 1; level <= Number(maxArg); level++) {
    const t0 = Date.now();
    const { classOf, combos } = boundaryClasses(family as TileFamilyId, subset, level);
    const n = new Set(classOf).size;
    console.log(`level ${level}: ${combos.length} pairings in ${n} classes (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    for (const w of wanted) {
      const i = combos.indexOf(w);
      if (i < 0) {
        console.log(`  ${w}: not a pairing of ${rule}`);
        continue;
      }
      const members = combos.filter((_, j) => classOf[j] === classOf[i]);
      console.log(`  ${w}: class of ${members.length}: ${members.join(' ')}`);
    }
  }
}
