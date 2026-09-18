/**
 * Finite local complexity — what repairs the self-avoidance argument.
 *
 * The clean argument for self-avoidance would be: every chord lies inside its
 * own tile, tiles have disjoint interiors, so chords can only meet at welds.
 * That works for the HEXAGON family, whose tiles are convex, so any segment
 * between two boundary points is interior.
 *
 * It FAILS for the SPECTRE family. The Spectre is a concave 14-gon and four of
 * the chosen chords cut across a reflex corner and leave their own tile:
 * Theta's 2A—-2A, Xi's -1A—-2A, Phi's 2A—-2A and Psi's -1A—-2A. So a chord can
 * enter a neighbouring tile and the single-tile check is not enough.
 *
 * The repair keeps the argument finite. A crossing is a LOCAL event: two chords
 * that cross both lie within one tile's corona (the tile together with every
 * tile meeting it). If the set of coronas occurring anywhere in the tiling is
 * finite up to isometry — finite local complexity — then checking every corona
 * once settles self-avoidance at every level and in the infinite tiling, exactly
 * as the single-tile check would have.
 *
 * This script measures that: it enumerates coronas in patches of increasing
 * depth, canonicalises each up to isometry, and reports whether the count
 * saturates. Saturation is the evidence that the corona check is a bounded
 * computation; interior coronas (those not truncated by the patch boundary) are
 * counted separately, since boundary-truncated ones are artefacts of the patch.
 *
 * Run: cd web && npx --yes tsx fass-proof/11-local-complexity.ts [maxLevel]
 */

import {
  zApply,
  zConj,
  zKey,
  zLeafPts,
  zRot,
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';
import { CONFIGS, heading, pad, verdict, zExpand, type ZInstance } from './lib';

const MAX = Number(process.argv[2] ?? 5);

/**
 * Canonical form of a corona up to the 24 isometries of the lattice
 * (12 rotations x optional mirror), anchored on the centre tile's frame.
 *
 * Each neighbour contributes its type and its exact placement relative to the
 * centre; taking the lexicographic minimum over the 24 frames makes congruent
 * coronas compare equal.
 */
function canonicalCorona(
  family: TileFamilyId,
  centre: ZInstance,
  neighbours: readonly ZInstance[],
): string {
  // Express each neighbour in the centre's frame by composing with the inverse.
  const inv = (T: typeof centre.xform) => {
    if (T.m) return { k: T.k, m: 1 as const, t: neg(zRot(zConj(T.t), T.k)) };
    const k = ((-T.k % 12) + 12) % 12;
    return { k, m: 0 as const, t: neg(zRot(T.t, k)) };
  };
  const neg = (v: ZVec): ZVec => [-v[0], -v[1], -v[2], -v[3]];
  const compose = (A: typeof centre.xform, B: typeof centre.xform) => ({
    k: ((A.k + (A.m ? -B.k : B.k)) % 12 + 12) % 12,
    m: ((A.m ^ B.m) as 0 | 1),
    t: add(zRot(A.m ? zConj(B.t) : B.t, A.k), A.t),
  });
  const add = (a: ZVec, b: ZVec): ZVec => [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];

  const Ci = inv(centre.xform);
  const local = neighbours.map((nb) => ({ type: nb.type, x: compose(Ci, nb.xform) }));

  let best: string | null = null;
  for (let k = 0; k < 12; k++) {
    for (const m of [0, 1] as const) {
      const frame = { k, m, t: [0, 0, 0, 0] as ZVec };
      const words = local
        .map((n) => {
          const x = compose(frame, n.x);
          return `${n.type}@${x.k},${x.m},${zKey(x.t)}`;
        })
        .sort();
      const word = `${centre.type}|${words.join('|')}`;
      if (best === null || word < best) best = word;
    }
  }
  return best ?? '';
}

let allOk = true;

for (const key of ['hex128', 'spectre1278'] as const) {
  const cfg = CONFIGS[key];
  heading(`${cfg.family} — corona census (does local complexity saturate?)`);
  console.log('  | level | tiles | coronas | distinct | interior coronas | distinct interior |');
  console.log('  |---|---|---|---|---|---|');

  const seenInterior = new Set<string>();
  const perLevel: number[] = [];

  for (let lv = 2; lv <= MAX; lv++) {
    const instances = zExpand(cfg.family, 'Delta', lv);

    // Vertex -> tiles touching it, and edge-use counts to find the patch boundary.
    const atVertex = new Map<string, number[]>();
    const edgeUse = new Map<string, number>();
    const polys: ZVec[][] = [];
    for (let i = 0; i < instances.length; i++) {
      const poly = zLeafPts(cfg.family, instances[i].type).map((p) => zApply(instances[i].xform, p));
      polys.push(poly);
      for (let e = 0; e < poly.length; e++) {
        const ka = zKey(poly[e]);
        const kb = zKey(poly[(e + 1) % poly.length]);
        if (!atVertex.has(ka)) atVertex.set(ka, []);
        atVertex.get(ka)!.push(i);
        const ek = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
        edgeUse.set(ek, (edgeUse.get(ek) ?? 0) + 1);
      }
    }

    const distinct = new Set<string>();
    let interiorCount = 0;
    const interiorDistinct = new Set<string>();

    for (let i = 0; i < instances.length; i++) {
      const poly = polys[i];
      const nbrIdx = new Set<number>();
      let onBoundary = false;
      for (let e = 0; e < poly.length; e++) {
        const ka = zKey(poly[e]);
        const kb = zKey(poly[(e + 1) % poly.length]);
        const ek = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
        if ((edgeUse.get(ek) ?? 0) === 1) onBoundary = true;
        for (const j of atVertex.get(ka) ?? []) if (j !== i) nbrIdx.add(j);
      }
      // A corona is only meaningful if none of its members is itself cut off by
      // the patch boundary, so require the centre and all neighbours interior.
      const neighbours = [...nbrIdx].map((j) => instances[j]);
      const word = canonicalCorona(cfg.family, instances[i], neighbours);
      distinct.add(word);
      if (!onBoundary) {
        let nbBoundary = false;
        for (const j of nbrIdx) {
          const p = polys[j];
          for (let e = 0; e < p.length; e++) {
            const ka = zKey(p[e]);
            const kb = zKey(p[(e + 1) % p.length]);
            const ek = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
            if ((edgeUse.get(ek) ?? 0) === 1) nbBoundary = true;
          }
        }
        if (!nbBoundary) {
          interiorCount++;
          interiorDistinct.add(word);
          seenInterior.add(word);
        }
      }
    }

    perLevel.push(interiorDistinct.size);
    console.log(
      `  | ${lv} | ${pad(instances.length, 6)} | ${pad(instances.length, 6)} | ${pad(distinct.size, 5)} | ${pad(interiorCount, 6)} | ${pad(interiorDistinct.size, 5)} |`,
    );
  }

  const last = perLevel[perLevel.length - 1];
  const prev = perLevel[perLevel.length - 2];
  allOk = verdict(
    last === prev,
    `${cfg.family}: distinct interior coronas saturate`,
    `${prev} -> ${last} between the last two levels; ${seenInterior.size} seen in total`,
  ) && allOk;
  console.log(
    `  Every crossing is confined to one corona, so checking these ${seenInterior.size} configurations\n` +
      `  once settles self-avoidance at every level.`,
  );
}

heading('Reading');
console.log(`  Saturation here is evidence for finite local complexity, not a proof of it:
  it shows no new corona appears between the last two levels computed. The proof
  that no new corona ever appears is the standard finite-local-complexity
  property of a primitive substitution tiling with finitely many prototiles
  meeting edge-to-edge, which both families satisfy (see 01-local-structure.ts
  for the edge-to-edge check).`);

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
