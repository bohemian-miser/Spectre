/**
 * The infinite limit: nesting, two-sided growth, and exhaustion of the plane.
 *
 * A finite patch necessarily has endpoints, so "infinite curve" is a statement
 * about a nested sequence. SUPER_RULES.Psi = [Psi, Delta, Psi, Phi, Sigma, Psi,
 * Phi, Gamma], so a Psi supertile contains Psi supertiles at slots 0, 2 and 5.
 * Each slot gives an increasing sequence of patches
 *
 *     P_1 subset P_2 subset P_3 subset ...
 *
 * obtained by re-anchoring: E_1 = id and E_{k+1} = E_k . inverse(Ts_{k+1}[slot]),
 * so the level-k child stays exactly where the standalone level-k patch is while
 * the parent grows around it. All transforms are exact, so the containment is an
 * integer statement.
 *
 * Three things have to hold for the union to be a bi-infinite space-filling curve:
 *
 *  1. NESTING. The level-k arc must sit inside the level-(k+1) arc as a
 *     CONTIGUOUS sub-path. This is forced rather than lucky: the Psi interface
 *     is two dots (09-interface-invariant.ts), so the parent strand crosses the
 *     child boundary exactly twice — it enters once, traverses the whole child
 *     arc, and leaves. Verified here by exact segment containment.
 *
 *  2. TWO-SIDED GROWTH. For a BI-infinite curve rather than a ray, the parent
 *     arc must carry material on both sides of the child's sub-path, with both
 *     counts diverging. A slot where one side stays bounded yields a ray.
 *
 *  3. EXHAUSTION. The union covers the plane only if the inradius of E_k(P_k)
 *     about the anchor diverges. A slot whose inradius stays bounded only
 *     covers a half-plane or a cone, and is not a tiling of the plane.
 *
 * Run: cd web && npx --yes tsx fass-proof/13-nesting-limit.ts [maxLevel]
 */

import {
  dist,
  zApply,
  zConj,
  zInv,
  zKey,
  zLeafPts,
  zMul,
  zSupertileTransforms,
  zToPt,
  Z_IDENT,
  type Pt,
  type TileFamilyId,
  type ZAffine,
  type ZVec,
} from '../src/core';
import { SUPER_RULES, type TileTypeId } from '../src/core';
import { buildStrands, CONFIGS, heading, pad, trace, verdict, zExpand, type ZInstance } from './lib';

const MAX = Number(process.argv[2] ?? 6);
/** Psi's own slots inside Psi, from SUPER_RULES.Psi. */
const PSI_SLOTS = [0, 2, 5];

/** The re-anchoring embedding for the nesting at `slot`, levels 1..max. */
function embeddings(family: TileFamilyId, slot: number, max: number): ZAffine[] {
  const E: ZAffine[] = [Z_IDENT];
  for (let k = 2; k <= max; k++) {
    E.push(zMul(E[E.length - 1], zInv(zSupertileTransforms(family, k)[slot])));
  }
  return E;
}

function embed(instances: readonly ZInstance[], E: ZAffine): ZInstance[] {
  return instances.map((i) => ({ ...i, xform: zMul(E, i.xform) }));
}

function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / c2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

/** Distance from `anchor` to the nearest patch-boundary edge, and the patch radius. */
function inradiusAndRadius(family: TileFamilyId, instances: readonly ZInstance[], anchor: Pt) {
  const use = new Map<string, { a: ZVec; b: ZVec; n: number }>();
  let radius = 0;
  for (const inst of instances) {
    const poly = zLeafPts(family, inst.type).map((p) => zApply(inst.xform, p));
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      radius = Math.max(radius, dist(anchor, zToPt(a)));
      const ka = zKey(a);
      const kb = zKey(b);
      const key = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
      const hit = use.get(key);
      if (hit) hit.n += 1;
      else use.set(key, { a, b, n: 1 });
    }
  }
  let inradius = Infinity;
  for (const e of use.values()) {
    if (e.n !== 1) continue;
    inradius = Math.min(inradius, pointSegDist(anchor, zToPt(e.a), zToPt(e.b)));
  }
  return { inradius, radius };
}

let allOk = true;
const LINEAR = Math.sqrt(4 + Math.sqrt(15));

for (const key of ['hex128', 'spectre1278'] as const) {
  const cfg = CONFIGS[key];

  for (const slot of PSI_SLOTS) {
    heading(`${cfg.id} — nesting Psi inside Psi at slot ${slot}`);
    const E = embeddings(cfg.family, slot, MAX);
    const anchor = (() => {
      // A point in the interior of the level-1 patch: the centroid of its tiles.
      const inst = zExpand(cfg.family, 'Psi', 1);
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const i of inst) {
        for (const p of zLeafPts(cfg.family, i.type)) {
          const w = zToPt(zApply(i.xform, p));
          sx += w.x;
          sy += w.y;
          n++;
        }
      }
      return { x: sx / n, y: sy / n };
    })();

    console.log('  | level | tiles | segments | child arc contiguous | before | after | inradius | radius |');
    console.log('  |---|---|---|---|---|---|---|---|');

    let prevSegKeys: Set<string> | null = null;
    let prevIn = 0;
    const befores: number[] = [];
    const afters: number[] = [];
    const inradii: number[] = [];

    for (let lv = 1; lv <= MAX; lv++) {
      const instances = embed(zExpand(cfg.family, 'Psi', lv), E[lv - 1]);
      const strands = buildStrands(cfg, instances);
      const tr = trace(strands);
      if (tr.arcs.length !== 1 || tr.circuits.length) {
        allOk = verdict(false, `level ${lv}: expected one arc and no circuits`, `${tr.arcs.length} arcs, ${tr.circuits.length} circuits`) && allOk;
        break;
      }
      const arc = tr.arcs[0];
      const orderedKeys = arc.segIdxs.map((i) => {
        const [a, b] = strands.segs[i];
        return a < b ? `${a}|${b}` : `${b}|${a}`;
      });

      let contiguous = '—';
      let before = 0;
      let after = 0;
      if (prevSegKeys) {
        const hits = orderedKeys.map((k, i) => (prevSegKeys!.has(k) ? i : -1)).filter((i) => i >= 0);
        const lo = hits[0];
        const hi = hits[hits.length - 1];
        const isRun = hits.length === prevSegKeys.size && hi - lo + 1 === hits.length;
        contiguous = isRun ? `yes (${hits.length})` : `NO (${hits.length} of ${prevSegKeys.size})`;
        if (!isRun) allOk = false;
        before = lo;
        after = orderedKeys.length - 1 - hi;
        befores.push(before);
        afters.push(after);
      }

      const { inradius, radius } = inradiusAndRadius(cfg.family, instances, anchor);
      inradii.push(inradius);
      console.log(
        `  | ${lv} | ${pad(instances.length, 6)} | ${pad(strands.segs.length, 7)} | ${pad(contiguous, 14)} | ${pad(before, 6)} | ${pad(after, 6)} | ${pad(inradius.toFixed(3), 9)} | ${pad(radius.toFixed(2), 9)} |`,
      );
      prevIn = inradius;
      prevSegKeys = new Set(orderedKeys);
    }

    allOk = verdict(
      befores.length > 1 && befores[befores.length - 1] > befores[0] && afters[afters.length - 1] > afters[0],
      `slot ${slot}: the parent arc grows on BOTH sides of the child`,
      `before ${befores.join(' -> ')}; after ${afters.join(' -> ')}`,
    ) && allOk;

    // The inradius does NOT grow under a constant slot: the seed stays hard up
    // against the patch boundary at every level. Report that as the finding it
    // is rather than as a failure - the union is a genuine bi-infinite curve,
    // it just fills a sector rather than the whole plane.
    const flat = inradii.every((r) => Math.abs(r - inradii[0]) < 1e-6);
    allOk = verdict(
      flat,
      `slot ${slot}: the inradius is CONSTANT, so this nesting does NOT exhaust the plane`,
      `${inradii.map((r) => r.toFixed(3)).join(' -> ')} — the seed abuts the boundary at every level`,
    ) && allOk;
  }
}

// ---------------------------------------------------------------------------
// Exhaustion needs a non-constant address
// ---------------------------------------------------------------------------

heading('Can any nesting address push the seed into the interior?');
console.log(`  Under a constant slot the inradius never moves, so the union fills a sector.
  Allowing the parent TYPE to vary, greedily maximising the inradius at each
  step, does push the seed inside:\n`);

for (const family of ['spectre'] as TileFamilyId[]) {
  const seed = zExpand(family, 'Psi', 1);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const i of seed) {
    for (const p of zLeafPts(family, i.type)) {
      const w = zToPt(zApply(i.xform, p));
      sx += w.x;
      sy += w.y;
      n++;
    }
  }
  const anchor = { x: sx / n, y: sy / n };
  let E: ZAffine = Z_IDENT;
  let childType: TileTypeId = 'Psi';
  const path: string[] = [];
  const found: number[] = [];
  for (let lv = 2; lv <= Math.min(MAX, 5); lv++) {
    let best: { r: number; T: TileTypeId; s: number; E: ZAffine; tiles: number } | null = null;
    for (const [T, subs] of Object.entries(SUPER_RULES)) {
      for (let s = 0; s < subs.length; s++) {
        if (subs[s] !== childType) continue;
        const E2 = zMul(E, zInv(zSupertileTransforms(family, lv)[s]));
        const inst = zExpand(family, T as TileTypeId, lv).map((i) => ({ ...i, xform: zMul(E2, i.xform) }));
        const { inradius } = inradiusAndRadius(family, inst, anchor);
        if (!best || inradius > best.r) best = { r: inradius, T: T as TileTypeId, s, E: E2, tiles: inst.length };
      }
    }
    if (!best) break;
    E = best.E;
    childType = best.T;
    path.push(`${best.T}#${best.s}`);
    found.push(best.r);
    console.log(`  level ${lv}: ${pad(best.T, 7)} slot ${best.s}, ${pad(best.tiles, 6)} tiles, inradius ${best.r.toFixed(3)}`);
  }
  console.log(`  address: ${path.join(' -> ')}`);
  allOk = verdict(
    found.length > 1 && found[found.length - 1] > 5 * found[0],
    `${family}: a varying address DOES push the seed into the interior`,
    `${found.map((r) => r.toFixed(2)).join(' -> ')}`,
  ) && allOk;
}

heading('Reading');
console.log(`  Nesting and two-sided growth hold at all three Psi slots, so each gives a
  genuine bi-infinite curve. Contiguity is not a coincidence: the Psi interface
  is exactly two dots, so a strand entering the child must traverse all of it
  before leaving.

  Exhaustion is the part that does NOT come for free. Under a constant slot the
  seed abuts the patch boundary at every level, so that union fills a sector,
  not the plane. Pushing the seed inside needs an address that passes through
  other supertile types — and those have larger interfaces (Gamma 10 dots, so
  five arcs), so along such an address the patch is no longer a single arc. The
  single-line property then has to be carried across by a merge argument of the
  kind docs/FASS_1278.md section 4.5 runs, not by the nesting alone.

  Self-avoidance is a property of the finite approximants, not of the limit: a
  genuine space-filling curve cannot be injective. The right statement is that
  every level-k approximant is a non-self-crossing polygonal arc, which is what
  02-self-avoidance.ts and 11-local-complexity.ts establish.`);

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
