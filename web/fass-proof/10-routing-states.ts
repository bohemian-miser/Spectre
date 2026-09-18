/**
 * Routing states: the boundary pairing each supertile type induces, per level.
 *
 * `09-interface-invariant.ts` shows every supertile type's internal arcs form a
 * perfect matching of a CONSTANT number of boundary connection dots, with no
 * circuits. This script computes that matching explicitly, under a canonical
 * labelling of the boundary dots, and asks whether it is level-independent.
 *
 * Canonical labelling. The patch outline is recovered exactly, by edge
 * cancellation over integer vertex keys: a physical tile edge used by one tile
 * is a boundary edge, and the boundary edges chain into a single loop. Boundary
 * dots are the degree-1 welded points; each is located on that loop and the dots
 * are numbered along it. The loop is anchored at the supertile's quad[0] vertex
 * and oriented so quad[1] is reached before quad[3] — a chirality-stable rule,
 * needed because `buildSupertiles` pre-multiplies a reflection, so consecutive
 * levels are mirror images and a naive orientation would flip with the level.
 *
 * If the labelled pairing is eventually periodic in k AND the substitution's
 * gluing data is level-independent (the crux lemma, see 03-substitution-
 * invariance.ts), then iterating the routing operator proves the single-line
 * property for EVERY level rather than for the levels computed.
 *
 * Run: cd web && npx --yes tsx fass-proof/10-routing-states.ts [maxLevel]
 */

import {
  dist,
  zApply,
  zKey,
  zLeafPts,
  zSupertileQuad,
  zToPt,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';
import {
  buildStrands,
  CONFIGS,
  heading,
  pad,
  trace,
  verdict,
  zExpand,
  type Config,
} from './lib';

const MAX = Number(process.argv[2] ?? 5);
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

/** Exact patch outline as a loop of boundary vertices, in order. */
function outlineLoop(family: TileFamilyId, instances: readonly { type: TileTypeId; xform: any }[]): ZVec[] {
  const use = new Map<string, { a: ZVec; b: ZVec; n: number }>();
  for (const inst of instances) {
    const poly = zLeafPts(family, inst.type).map((p) => zApply(inst.xform, p));
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ka = zKey(a);
      const kb = zKey(b);
      const key = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
      const hit = use.get(key);
      if (hit) hit.n += 1;
      else use.set(key, { a, b, n: 1 });
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
  for (const v of nbr.values()) if (v.length !== 2) throw new Error('boundary is not a simple loop');
  const loop: ZVec[] = [coord.get(seed)!];
  const keys: string[] = [seed];
  let prev = '';
  let cur = seed;
  for (;;) {
    const opts = nbr.get(cur)!.filter((x) => x !== prev);
    const next = opts.length ? opts[0] : nbr.get(cur)![0];
    if (next === seed) break;
    loop.push(coord.get(next)!);
    keys.push(next);
    prev = cur;
    cur = next;
    if (loop.length > nbr.size + 1) throw new Error('outline did not close');
  }
  if (loop.length !== nbr.size) throw new Error('outline has multiple loops');
  return loop;
}

/** Index of the loop vertex nearest a quad point; throws if it is not on the loop. */
function anchorAt(loop: readonly Pt[], q: Pt): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < loop.length; i++) {
    const d = dist(loop[i], q);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (bestD > 1e-6) throw new Error(`quad anchor is ${bestD.toFixed(6)} off the outline`);
  return best;
}

function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / c2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

/** The boundary pairing of one supertile type at one level, canonically labelled. */
function routingState(cfg: Config, type: TileTypeId, level: number): string {
  const instances = zExpand(cfg.family, type, level);
  const strands = buildStrands(cfg, instances);
  const tr = trace(strands);
  if (tr.circuits.length) throw new Error(`${type}@${level} has ${tr.circuits.length} circuits`);

  const loopZ = outlineLoop(cfg.family, instances);
  const loop = loopZ.map(zToPt);
  const quad = zSupertileQuad(cfg.family, level).map(zToPt);
  const n = loop.length;
  const i0 = anchorAt(loop, quad[0]);
  const i1 = anchorAt(loop, quad[1]);
  const i3 = anchorAt(loop, quad[3]);
  // Chirality-stable direction: run the way that reaches quad[1] before quad[3].
  const forward = (i1 - i0 + n) % n < (i3 - i0 + n) % n;

  // Cumulative arc length along the canonically oriented loop.
  const ordered: Pt[] = [];
  for (let s = 0; s < n; s++) ordered.push(loop[forward ? (i0 + s) % n : (i0 - s + 2 * n) % n]);
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(ordered[i - 1], ordered[i]));

  // Locate every degree-1 dot on the loop and number the dots along it.
  const dots: { key: string; s: number }[] = [];
  for (const [key, deg] of strands.degree) {
    if (deg !== 1) continue;
    const z = strands.coord.get(key)!;
    const p = { x: zToPt(z).x / 2, y: zToPt(z).y / 2 };
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    for (let i = 0; i < n; i++) {
      const a = ordered[i];
      const b = ordered[(i + 1) % n];
      const d = pointSegDist(p, a, b);
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = dist(a, p) / Math.max(dist(a, b), 1e-12);
      }
    }
    if (bestD > 1e-6) throw new Error(`${type}@${level}: a degree-1 dot is ${bestD.toFixed(6)} off the outline`);
    dots.push({ key, s: cum[best] + Math.min(1, Math.max(0, bestT)) * dist(ordered[best], ordered[(best + 1) % n]) });
  }
  dots.sort((a, b) => a.s - b.s);
  const label = new Map<string, number>();
  dots.forEach((d, i) => label.set(d.key, i));

  // Each arc joins two boundary dots; record the pairing.
  const pairs: [number, number][] = [];
  for (const arc of tr.arcs) {
    const [a, b] = arc.endpoints;
    const la = label.get(a);
    const lb = label.get(b);
    if (la === undefined || lb === undefined) throw new Error(`${type}@${level}: an arc ends off the boundary`);
    pairs.push(la < lb ? [la, lb] : [lb, la]);
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return pairs.map(([a, b]) => `${a}-${b}`).join(' ');
}

let allOk = true;

for (const key of ['hex128', 'spectre1278', 'flagship'] as const) {
  const cfg = CONFIGS[key];
  heading(`${cfg.id} — routing state per type and level`);
  const stable: string[] = [];
  for (const T of TYPES) {
    const states: string[] = [];
    for (let lv = 1; lv <= MAX; lv++) {
      try {
        states.push(routingState(cfg, T, lv));
      } catch (e) {
        states.push(`ERROR: ${(e as Error).message}`);
      }
    }
    console.log(`  ${pad(T, 7)}:`);
    states.forEach((s, i) => console.log(`    lv${i + 1}  ${s}`));

    // Look for eventual periodicity: the mirror flip makes period 2 the natural
    // candidate, so test both period 1 and period 2 from each starting level.
    let verdictText = 'no period found in the computed range';
    outer: for (let p = 1; p <= 2; p++) {
      for (let k0 = 0; k0 + 2 * p <= MAX; k0++) {
        let ok = true;
        for (let i = k0; i + p < MAX; i++) if (states[i] !== states[i + p]) ok = false;
        if (ok) {
          verdictText = `period ${p} from level ${k0 + 1}`;
          stable.push(`${T}:p${p}@${k0 + 1}`);
          break outer;
        }
      }
    }
    console.log(`    -> ${verdictText}`);
    allOk = verdict(!verdictText.startsWith('no period'), `${T}: routing state is eventually periodic`, verdictText) && allOk;
  }

  // Psi is the one that matters, and its state space is a singleton.
  const psi = routingState(cfg, 'Psi', MAX);
  allOk = verdict(psi === '0-1', `Psi is the single arc 0-1 at level ${MAX}`, psi) && allOk;
}

heading('Reading');
console.log(`  A period in this table is NOT yet a proof for every level: the routing state
  at level k+1 is a function of the children's states at level k only if the
  substitution's gluing and outer maps are level-independent. That is the crux
  lemma (03-substitution-invariance.ts). Given it, the period here closes the
  induction and the single-line property holds at every level.

  The period is 2 rather than 1 because buildSupertiles pre-multiplies a
  reflection, so consecutive levels are mirror images of one another.`);

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
