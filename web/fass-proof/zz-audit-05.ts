/**
 * ADVERSARIAL AUDIT of fass-proof/05-limit.ts (obligation L5).
 *
 * Independent re-derivations and attacks. Prints PASS/FAIL per objection and
 * exits non-zero if any *audit* check that should hold fails (note: a "FAIL"
 * here labelled ATTACK-LANDS means 05-limit.ts overclaims, and is reported by
 * the exit code too, because the audit's own assertion is "the claim is false").
 *
 * Run: cd web && npx --yes tsx fass-proof/zz-audit-05.ts [maxLevel] [maxGeom]
 */
import {
  connectionPoints, dist, leafOrder, leafPts, SUPER_RULES, zApply, zKey, zLeafPts, zMul,
  zSupertileTransforms, zToPt, Z_IDENT,
  type Pt, type TileFamilyId, type TileTypeId, type ZAffine, type ZVec,
} from '../src/core';
import {
  buildStrands, chosenMatching, CONFIGS, floatChords, trace, zApply2, zExpand,
  type Config, type Strands, type ZInstance,
} from './lib';

const MAX = Number(process.argv[2] ?? 5);
const MAXG = Number(process.argv[3] ?? 5);
const KEYS = ['hex128', 'spectre1278'] as const;
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
const PSI_SLOTS = SUPER_RULES.Psi.map((t, i) => (t === 'Psi' ? i : -1)).filter((i) => i >= 0);
const LAMBDA = 4 + Math.sqrt(15);

let bad = 0;
const H = (s: string) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
const say = (tag: string, label: string, detail = '') => {
  console.log(`  [${tag}] ${label}${detail ? '  — ' + detail : ''}`);
};
const hold = (b: boolean, label: string, detail = '') => { if (!b) bad++; say(b ? 'OK  ' : 'FAIL', label, detail); return b; };
/** The audit ASSERTS the 05 claim is wrong; `b` true means the attack lands. */
const attack = (b: boolean, label: string, detail = '') => { if (b) bad++; say(b ? 'ATTACK LANDS' : 'no objection', label, detail); return b; };

// ---------------------------------------------------------------------------
// independent expansion / trace (does not reuse 05-limit's helpers)
// ---------------------------------------------------------------------------
const expCache = new Map<string, readonly ZInstance[]>();
const expand = (f: TileFamilyId, root: TileTypeId, lv: number) => {
  const k = `${f}:${root}:${lv}`;
  let h = expCache.get(k);
  if (!h) { h = zExpand(f, root, lv); expCache.set(k, h); }
  return h;
};
const strCache = new Map<string, Strands>();
const strands = (cfg: Config, root: TileTypeId, lv: number) => {
  const k = `${cfg.id}:${root}:${lv}`;
  let h = strCache.get(k);
  if (!h) { h = buildStrands(cfg, expand(cfg.family, root, lv)); strCache.set(k, h); }
  return h;
};

/** My own path decomposition: returns component segment-index lists, in order. */
function myTrace(s: Strands): { paths: number[][]; cycles: number[][]; maxDeg: number } {
  const adj = new Map<string, number[]>();
  const push = (k: string, i: number) => { const a = adj.get(k); if (a) a.push(i); else adj.set(k, [i]); };
  s.segs.forEach(([a, b], i) => { push(a, i); push(b, i); });
  let maxDeg = 0;
  for (const v of adj.values()) maxDeg = Math.max(maxDeg, v.length);
  const used = new Array(s.segs.length).fill(false);
  const paths: number[][] = [];
  const cycles: number[][] = [];
  const run = (start: string, first: number) => {
    const out: number[] = [];
    let cur = start, seg = first;
    for (;;) {
      used[seg] = true; out.push(seg);
      const [a, b] = s.segs[seg];
      const nxt = a === cur ? b : a;
      const cand = (adj.get(nxt) ?? []).filter((i) => !used[i]);
      if ((adj.get(nxt) ?? []).length !== 2 || cand.length !== 1) return out;
      cur = nxt; seg = cand[0];
    }
  };
  for (const [k, list] of adj) if (list.length !== 2) for (const i of list) if (!used[i]) paths.push(run(k, i));
  for (let i = 0; i < s.segs.length; i++) if (!used[i]) cycles.push(run(s.segs[i][0], i));
  return { paths, cycles, maxDeg };
}

/** Single arc of a Psi-rooted patch: segment indices in order (throws if not one arc). */
function theArc(cfg: Config, lv: number): number[] {
  const s = strands(cfg, 'Psi', lv);
  const t = myTrace(s);
  if (t.paths.length !== 1 || t.cycles.length !== 0) throw new Error(`not one arc at ${cfg.id} level ${lv}`);
  return t.paths[0];
}

// ===========================================================================
H('A0. Independent recomputation of the headline counts and of arcs(T)');
// ===========================================================================
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  const row: string[] = [];
  for (let lv = 1; lv <= MAX; lv++) {
    const s = strands(cfg, 'Psi', lv);
    const arc = theArc(cfg, lv);
    row.push(`${s.instances.length}/${s.segs.length}`);
    if (arc.length !== s.segs.length) hold(false, `${cfg.id} lv${lv}: arc does not use every segment`);
  }
  say('----', `${cfg.id} Psi tiles/segments lv1..${MAX}`, row.join('  '));
}
const arcsTable: Record<string, Record<string, number[]>> = {};
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  arcsTable[key] = {};
  for (const t of TYPES) arcsTable[key][t] = [];
  for (let j = 1; j <= MAX - 1; j++) {
    for (const t of TYPES) {
      const tr = myTrace(strands(cfg, t, j));
      if (tr.cycles.length) hold(false, `${cfg.id} ${t} lv${j}: has a circuit`);
      arcsTable[key][t].push(tr.paths.length);
    }
  }
  say('----', `${cfg.id} arcs(T), j=1..${MAX - 1}`, TYPES.map((t) => `${t}=${arcsTable[key][t].join('/')}`).join(' '));
}

// ===========================================================================
H('A1. ATTACK: the modulus-of-continuity step "S <= 1/c" in the 05 header');
// ===========================================================================
console.log(`  05-limit.ts's repaired argument says: an interval I of length delta =
  lambda^(j-k) meets S distinct level-j sub-supertiles; "by (H5) their total
  parameter time is at least S*c*delta, and it is at most delta", hence
  S <= 1/c. With the measured c ~ 0.83 that asserts S <= 1.2, i.e. S <= 1:
  an interval of relative length delta may touch only ONE sub-supertile.
  The step is invalid because (H5) bounds each sub-supertile's TOTAL time over
  the whole arc, not the part of it inside I. Measured below: the true maximum
  of S over all windows of that length.\n`);
console.log('    | config | k | depth d | window (segs) | max distinct subs S | max runs R | 1/c claim |');
console.log('    |---|---|---|---|---|---|---|');
let worstS = 0;
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  for (let lv = 2; lv <= MAX; lv++) {
    const s = strands(cfg, 'Psi', lv);
    const arc = theArc(cfg, lv);
    const N = arc.length;
    for (let d = 1; d < lv; d++) {
      const pre = arc.map((seg) => s.instances[s.instOf[seg]].id.split('.').slice(0, d).join('.'));
      const W = Math.max(1, Math.round(N * LAMBDA ** -d));
      const cnt = new Map<string, number>();
      let distinct = 0, maxS = 0;
      const add = (p: string) => { const c = cnt.get(p) ?? 0; if (c === 0) distinct++; cnt.set(p, c + 1); };
      const rem = (p: string) => { const c = cnt.get(p) as number; if (c === 1) distinct--; cnt.set(p, c - 1); };
      for (let i = 0; i < N; i++) {
        add(pre[i]);
        if (i >= W) rem(pre[i - W]);
        if (i >= W - 1) maxS = Math.max(maxS, distinct);
      }
      // max runs in a window of the same length
      let maxR = 0;
      for (let i = 0; i + W <= N; i++) {
        let r = 1;
        for (let t = i + 1; t < i + W; t++) if (pre[t] !== pre[t - 1]) r++;
        maxR = Math.max(maxR, r);
        if (W > 4000) break; // runs scan is O(N*W); only meaningful for small windows
      }
      worstS = Math.max(worstS, maxS);
      console.log(`    | ${cfg.id.padEnd(24)} | ${lv} | ${d} | ${String(W).padStart(13)} | ${String(maxS).padStart(19)} | ${String(maxR).padStart(10)} | ${'<= 1.2'.padStart(9)} |`);
    }
  }
}
attack(worstS > 1.21, 'the header\'s "S <= 1/c" bound (S <= 1.2) is false',
  `the true maximum over all windows is S = ${worstS}, ${(worstS / 1.2).toFixed(0)}x the claimed bound`);

// ===========================================================================
H('A2. Is the CONCLUSION (uniform Hoelder-1/2) supported anyway?');
// ===========================================================================
console.log(`  Even a broken proof can have a true conclusion. Measured directly:
  sup over segment gaps g of |A(i) - A(i+g)| / (D_k * sqrt(g/N)), the Hoelder-1/2
  constant of the rescaled arc. If it is bounded in k the conclusion stands and
  only the argument needs replacing.\n`);
console.log('    | config | k | N segments | patch diam D_k | Hoelder-1/2 const | worst gap g |');
console.log('    |---|---|---|---|---|---|');
const holder: Record<string, number[]> = {};
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  holder[key] = [];
  for (let lv = 2; lv <= MAX; lv++) {
    const s = strands(cfg, 'Psi', lv);
    const arc = theArc(cfg, lv);
    const N = arc.length;
    // arc vertex polyline
    const pts: Pt[] = [];
    let cur = s.segs[arc[0]][0];
    const other = (i: number, k: string) => (s.segs[i][0] === k ? s.segs[i][1] : s.segs[i][0]);
    // orient: pick the endpoint of the first segment that is not shared with the 2nd
    if (arc.length > 1) {
      const [a, b] = s.segs[arc[0]];
      const nxt = s.segs[arc[1]];
      cur = (nxt[0] === a || nxt[1] === a) ? b : a;
    }
    const toPt = (k: string) => { const z = s.coord.get(k) as ZVec; const p = zToPt(z); return { x: p.x / 2, y: p.y / 2 }; };
    pts.push(toPt(cur));
    for (const i of arc) { cur = other(i, cur); pts.push(toPt(cur)); }
    let diam = 0;
    for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 800))) {
      for (let j = i + 1; j < pts.length; j += Math.max(1, Math.floor(pts.length / 800))) {
        const d = dist(pts[i], pts[j]); if (d > diam) diam = d;
      }
    }
    let best = 0, bestG = 0;
    for (let g = 1; g <= N; g *= 2) {
      let m = 0;
      for (let i = 0; i + g < pts.length; i++) { const d = dist(pts[i], pts[i + g]); if (d > m) m = d; }
      const h = m / (diam * Math.sqrt(g / N));
      if (h > best) { best = h; bestG = g; }
    }
    holder[key].push(best);
    console.log(`    | ${cfg.id.padEnd(24)} | ${lv} | ${String(N).padStart(10)} | ${diam.toFixed(3).padStart(14)} | ${best.toFixed(4).padStart(17)} | ${String(bestG).padStart(11)} |`);
  }
}
for (const key of KEYS) {
  const h = holder[key];
  const growing = h.length >= 3 && h[h.length - 1] > 1.35 * h[0];
  hold(!growing, `${CONFIGS[key].id}: the measured Hoelder-1/2 constant does not blow up in k`,
    `${h.map((v) => v.toFixed(3)).join(' -> ')} (levels 2..${MAX})`);
}

// ===========================================================================
H('A3. ATTACK: Lemma A\'s radius "less than half the shortest tile edge"');
// ===========================================================================
const ukey = (a: ZVec, b: ZVec) => { const ka = zKey(a), kb = zKey(b); return ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`; };
function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x, vy = b.y - a.y, c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / c2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}
function pointInPoly(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const distToPoly = (p: Pt, poly: readonly Pt[]) => {
  if (pointInPoly(p, poly)) return 0;
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, pointSegDist(p, poly[i], poly[(i + 1) % poly.length]));
  return d;
};

interface Patch { inst: readonly ZInstance[]; mult: Map<string, number>; poly: Pt[][]; bkeys: Set<string>; touches: boolean[]; }
const patchCache = new Map<string, Patch>();
function patchOf(f: TileFamilyId, lv: number): Patch {
  const ck = `${f}:${lv}`;
  const hit = patchCache.get(ck); if (hit) return hit;
  const inst = expand(f, 'Psi', lv);
  const mult = new Map<string, number>();
  const poly: Pt[][] = [];
  const zpolys: ZVec[][] = [];
  for (const i of inst) {
    const zp = zLeafPts(f, i.type).map((p) => zApply(i.xform, p));
    zpolys.push(zp);
    poly.push(zp.map(zToPt));
    for (let j = 0; j < zp.length; j++) { const u = ukey(zp[j], zp[(j + 1) % zp.length]); mult.set(u, (mult.get(u) ?? 0) + 1); }
  }
  const bkeys = new Set<string>();
  const touches = new Array(inst.length).fill(false);
  for (let t = 0; t < inst.length; t++) {
    const zp = zpolys[t];
    for (let j = 0; j < zp.length; j++) {
      const u = ukey(zp[j], zp[(j + 1) % zp.length]);
      if (mult.get(u) === 1) { touches[t] = true; bkeys.add(u); }
    }
  }
  const out = { inst, mult, poly, bkeys, touches };
  patchCache.set(ck, out);
  return out;
}
function seedXform(f: TileFamilyId, slots: readonly number[]): ZAffine {
  let T = Z_IDENT; const lv = slots.length + 1;
  for (let i = 0; i < slots.length; i++) T = zMul(T, zSupertileTransforms(f, lv - i)[slots[i]]);
  return T;
}

console.log(`  Lemma A as stated in 05-limit.ts: "the open half-disc D on the empty side
  of e, of radius LESS THAN HALF THE SHORTEST TILE EDGE, misses every P_k".
  Every edge in both families has length exactly 1, so the claimed radius is
  0.5. Measured below: rho_k = min over all tiles of P_k that do NOT own e of
  the distance from e's midpoint to that tile. If rho_k < 0.5 the stated
  radius is wrong (the qualitative conclusion may survive with the true rho).\n`);
console.log('    | family | slot | level | frozen seed edges | rho_k = clearance at the midpoint | 0.5? |');
console.log('    |---|---|---|---|---|---|');
let minRho = Infinity;
for (const f of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const slot of PSI_SLOTS) {
    for (let lv = 2; lv <= MAXG; lv++) {
      const p = patchOf(f, lv);
      const A = seedXform(f, new Array(lv - 1).fill(slot));
      const seed = patchOf(f, 1);
      // frozen seed outline edges, as exact endpoint pairs in P_lv's frame
      const frozen: [ZVec, ZVec][] = [];
      for (let t = 0; t < seed.inst.length; t++) {
        const zp = zLeafPts(f, seed.inst[t].type).map((q) => zApply(seed.inst[t].xform, q));
        for (let j = 0; j < zp.length; j++) {
          const u = ukey(zp[j], zp[(j + 1) % zp.length]);
          if (seed.mult.get(u) !== 1) continue;
          const a = zApply(A, zp[j]), b = zApply(A, zp[(j + 1) % zp.length]);
          if (p.bkeys.has(ukey(a, b))) frozen.push([a, b]);
        }
      }
      let rho = Infinity;
      for (const [za, zb] of frozen) {
        const a = zToPt(za), b = zToPt(zb);
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const ek = ukey(za, zb);
        let r = Infinity;
        for (let t = 0; t < p.inst.length; t++) {
          let nearT = false;
          for (const q of p.poly[t]) if (Math.abs(q.x - m.x) < 3 && Math.abs(q.y - m.y) < 3) { nearT = true; break; }
          if (!nearT) continue;
          const zp = zLeafPts(f, p.inst[t].type).map((q) => zApply(p.inst[t].xform, q));
          let owns = false;
          for (let j = 0; j < zp.length; j++) if (ukey(zp[j], zp[(j + 1) % zp.length]) === ek) owns = true;
          if (owns) continue;
          const d = distToPoly(m, p.poly[t]);
          if (d < r) r = d;
        }
        rho = Math.min(rho, r);
      }
      minRho = Math.min(minRho, rho);
      if (lv === MAXG || lv === 2) {
        console.log(`    | ${f.padEnd(7)} | ${slot} | ${lv} | ${String(frozen.length).padStart(17)} | ${rho.toFixed(9).padStart(33)} | ${(rho >= 0.5 - 1e-9 ? 'ok (sharp)' : 'TOO SMALL').padStart(9)} |`);
      }
    }
  }
}
attack(minRho < 0.5 - 1e-12, 'Lemma A\'s stated radius (half the shortest tile edge = 0.5) is too large',
  `the smallest measured clearance at a frozen seed edge midpoint is ${minRho.toFixed(9)}`);
hold(minRho > 1e-9, 'a positive clearance does exist, so Lemma A\'s CONCLUSION survives with the measured radius',
  `rho >= ${minRho.toFixed(9)} at every level checked (still a per-level measurement, not a uniform bound)`);

// ===========================================================================
H('A4. ATTACK: the collar gap is measured for the WRONG address');
// ===========================================================================
console.log(`  05-limit.ts §3d proposes the periodic root-down block alpha = 0.0.5.0, but
  §3c measures the Lemma B collar gap only for the BEST-inradius address of the
  top level (5.0.5.2 at level 5, 5.0.5.0.2 at level 6). The gap for the block it
  actually proposes is never computed. Lemma B needs boundary(Q) disjoint from
  boundary(P): a shared VERTEX gives gap 0 and makes the inequality vacuous.
  All six buried depth-4 addresses, measured here at M = 5.\n`);
console.log('    | family | root-down alpha | buried | tiles in Q | collar gap d(bdyQ,bdyP) | shares a vertex? |');
console.log('    |---|---|---|---|---|---|');
let gapMin = Infinity;
const buriedSets: Record<string, string[]> = {};
for (const f of ['hex', 'spectre'] as TileFamilyId[]) {
  const M = 5;
  const p = patchOf(f, M);
  const groups = new Map<string, number[]>();
  for (let t = 0; t < p.inst.length; t++) {
    const pre = p.inst[t].id.split('.').slice(0, 4).join('.');
    const g = groups.get(pre); if (g) g.push(t); else groups.set(pre, [t]);
  }
  const buried: string[] = [];
  for (const [pre, idxs] of groups) {
    const slots = pre.split('.').map(Number);
    if (slots.length !== 4 || !slots.every((s) => PSI_SLOTS.includes(s))) continue;
    if (!idxs.some((t) => p.touches[t])) buried.push(pre);
  }
  buried.sort();
  buriedSets[f] = buried;
  // outline vertex set of P
  const pv = new Set<string>();
  for (const u of p.bkeys) { const [a, b] = u.split('_'); pv.add(a); pv.add(b); }
  const outline: [Pt, Pt][] = [];
  for (let t = 0; t < p.inst.length; t++) {
    const zp = zLeafPts(f, p.inst[t].type).map((q) => zApply(p.inst[t].xform, q));
    for (let j = 0; j < zp.length; j++) {
      const u = ukey(zp[j], zp[(j + 1) % zp.length]);
      if (p.mult.get(u) === 1) outline.push([zToPt(zp[j]), zToPt(zp[(j + 1) % zp.length])]);
    }
  }
  for (const alpha of buried) {
    const idxs = groups.get(alpha) as number[];
    const qm = new Map<string, number>();
    const qzp: ZVec[][] = [];
    for (const t of idxs) { const zp = zLeafPts(f, p.inst[t].type).map((q) => zApply(p.inst[t].xform, q)); qzp.push(zp); for (let j = 0; j < zp.length; j++) { const u = ukey(zp[j], zp[(j + 1) % zp.length]); qm.set(u, (qm.get(u) ?? 0) + 1); } }
    const qEdges: [Pt, Pt][] = [];
    const qv = new Set<string>();
    qzp.forEach((zp) => { for (let j = 0; j < zp.length; j++) { const u = ukey(zp[j], zp[(j + 1) % zp.length]); if (qm.get(u) === 1) { qEdges.push([zToPt(zp[j]), zToPt(zp[(j + 1) % zp.length])]); qv.add(zKey(zp[j])); qv.add(zKey(zp[(j + 1) % zp.length])); } } });
    let gap = Infinity;
    for (const [qa, qb] of qEdges) for (const [a, b] of outline) {
      gap = Math.min(gap, pointSegDist(qa, a, b), pointSegDist(qb, a, b), pointSegDist(a, qa, qb), pointSegDist(b, qa, qb));
    }
    let shared = false;
    for (const v of qv) if (pv.has(v)) shared = true;
    gapMin = Math.min(gapMin, gap);
    console.log(`    | ${f.padEnd(7)} | ${alpha.padEnd(15)} | yes | ${String(idxs.length).padStart(10)} | ${gap.toFixed(6).padStart(23)} | ${(shared ? 'YES (gap 0)' : 'no').padStart(16)} |`);
  }
}
hold(gapMin > 1e-9, 'all six buried depth-4 blocks do have a strictly positive collar gap at M = 5',
  `min gap over both families and all six blocks = ${gapMin.toFixed(6)}; 05-limit.ts measured only one of them`);
say('----', 'buried depth-4 sets at M=5 (independently recomputed)',
  `hex ${buriedSets.hex.join(' ')} | spectre ${buriedSets.spectre.join(' ')}`);

// ===========================================================================
H('A5. The chord-excursion constant, checked far past 4001 samples');
// ===========================================================================
console.log(`  05-limit.ts samples 4001 points per chord. Re-measured at 4,000,001 samples
  plus a local golden-section refinement of the best sample.\n`);
const C1 = (2 * Math.sqrt(3) - 3) / 8;   // 0.0580127
const C2 = (2 - Math.sqrt(3)) / 4;       // 0.0669873
console.log('    | config | leaf type | excursion (4001) | excursion (4e6 + refine) | vs (2sqrt3-3)/8 | vs (2-sqrt3)/4 |');
console.log('    |---|---|---|---|---|---|');
let specWorst = 0; const specWorstTypes: string[] = [];
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  for (const type of leafOrder(cfg.family)) {
    const poly = leafPts(cfg.family, type);
    let coarse = 0, fine = 0;
    for (const [a, b] of floatChords(cfg, type)) {
      const at = (t: number) => distToPoly({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, poly);
      for (let s = 0; s <= 4000; s++) coarse = Math.max(coarse, at(s / 4000));
      let bt = 0, bv = 0;
      const NS = 4_000_000;
      for (let s = 0; s <= NS; s++) { const t = s / NS; const v = at(t); if (v > bv) { bv = v; bt = t; } }
      // golden-section refine on [bt - h, bt + h]
      let lo = Math.max(0, bt - 1 / NS), hi = Math.min(1, bt + 1 / NS);
      const gr = (Math.sqrt(5) - 1) / 2;
      let x1 = hi - gr * (hi - lo), x2 = lo + gr * (hi - lo);
      let f1 = at(x1), f2 = at(x2);
      for (let it = 0; it < 200; it++) {
        if (f1 < f2) { lo = x1; x1 = x2; f1 = f2; x2 = lo + gr * (hi - lo); f2 = at(x2); }
        else { hi = x2; x2 = x1; f2 = f1; x1 = hi - gr * (hi - lo); f1 = at(x1); }
      }
      bv = Math.max(bv, f1, f2);
      fine = Math.max(fine, bv);
    }
    if (fine > 1e-12) {
      console.log(`    | ${cfg.id.padEnd(24)} | ${type.padEnd(9)} | ${coarse.toFixed(9).padStart(16)} | ${fine.toFixed(12).padStart(24)} | ${Math.abs(fine - C1).toExponential(2).padStart(15)} | ${Math.abs(fine - C2).toExponential(2).padStart(14)} |`);
    }
    if (key === 'spectre1278' && fine > specWorst - 1e-12) {
      if (fine > specWorst + 1e-12) { specWorst = fine; specWorstTypes.length = 0; }
      specWorstTypes.push(type);
      specWorst = Math.max(specWorst, fine);
    }
  }
}
hold(Math.abs(specWorst - C1) < 1e-9, 'the spectre max excursion really is (2 sqrt3 - 3)/8, to 1e-9, at 4e6 samples + refinement',
  `measured ${specWorst.toFixed(12)}, (2sqrt3-3)/8 = ${C1.toFixed(12)}`);
say('----', 'leaf types attaining that maximum', specWorstTypes.join(', ') +
  '  — 05-limit.ts reports only the first one it meets (Theta), which is a tie-break artefact, not a fact about Theta');

// ===========================================================================
H('A6. (H5) is PROVABLE for all levels, not merely checked to k = 5');
// ===========================================================================
console.log(`  The number of segments inside a level-j sub-supertile of type T is exactly
  (chord vector) . M^j e_T, with M the integer substitution matrix. So the time
  share of a sub-supertile is an exact rational and (H5)'s constant c can be
  computed for EVERY (j, k), not sampled. Below: min over T of
  segs_j(T) / segs_k(Psi) * lambda^(k-j), for k up to 60 with exact BigInt.\n`);
const tIdx = new Map(TYPES.map((t, i) => [t, i]));
const M9: bigint[][] = TYPES.map(() => TYPES.map(() => 0n));
for (let j = 0; j < 9; j++) for (const c of SUPER_RULES[TYPES[j]]) if (c !== 'null') M9[tIdx.get(c as TileTypeId) as number][j] += 1n;
function segsVec(cfg: Config, j: number): bigint[] {
  const sel = new Set(cfg.subset);
  const chordsOf = (t: TileTypeId): bigint => {
    if (t === 'Gamma' && cfg.family !== 'hex') {
      return BigInt(connectionPoints(cfg.family, 'Gamma1', sel).length / 2 + connectionPoints(cfg.family, 'Gamma2', sel).length / 2);
    }
    return BigInt(connectionPoints(cfg.family, t, sel).length / 2);
  };
  let v = TYPES.map((_, i) => (0n as bigint));
  // start from e_T for each T: do it by powering M and dotting with chord row
  const chord = TYPES.map((t) => chordsOf(t));
  // row vector r_j = chord^T M^j  -> segs_j(T) = r_j[T]
  let r = chord.slice();
  for (let s = 0; s < j; s++) {
    const nr = TYPES.map((_, col) => TYPES.reduce((acc, _t, i) => acc + r[i] * M9[i][col], 0n));
    r = nr;
  }
  v = r;
  return v;
}
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  const KMAX = 60;
  const rows: bigint[][] = [];
  for (let j = 0; j <= KMAX; j++) rows.push(segsVec(cfg, j));
  // sanity: segs_j(Psi) must equal the measured segment counts
  const meas: number[] = [];
  for (let lv = 1; lv <= MAX; lv++) meas.push(strands(cfg, 'Psi', lv).segs.length);
  const pred = [1, 2, 3, 4, 5].slice(0, MAX).map((lv) => Number(rows[lv][tIdx.get('Psi') as number]));
  hold(meas.every((v, i) => v === pred[i]), `${cfg.id}: exact segs_j(Psi) from the substitution matrix matches the built strand graphs`,
    `predicted ${pred.join(',')} measured ${meas.join(',')}`);
  let inf = Infinity; let argm = '';
  for (let k = 2; k <= KMAX; k++) {
    for (let j = 1; j < k; j++) {
      for (const t of TYPES) {
        const share = Number(rows[j][tIdx.get(t) as number]) / Number(rows[k][tIdx.get('Psi') as number]);
        const val = share * LAMBDA ** (k - j);
        if (val < inf) { inf = val; argm = `T=${t}, j=${j}, k=${k}`; }
      }
    }
  }
  hold(inf > 0.05, `${cfg.id}: (H5) holds with c = ${inf.toFixed(6)} for ALL j < k <= ${KMAX} (exact counts)`,
    `infimum attained at ${argm}; 05-limit.ts only sampled k <= 5 and reported 0.83`);
  // exact segments/tile at high level, vs the closed form -- a far better test than
  // 05-limit.ts's "measured 1.3448 vs exact 1.3488, tolerance 5e-3" at level 5.
  {
    const leafW = TYPES.map((t) => (t === 'Gamma' && cfg.family !== 'hex' ? 1n : 1n));
    // tiles_j(T) = (leaf-count row) . M^j e_T, leaf weight 2 for a composite Gamma
    const w: bigint[] = TYPES.map((t) => (t === 'Gamma' && cfg.family !== 'hex' ? 2n : 1n));
    let rt = w.slice();
    const tilesRow: bigint[][] = [rt.slice()];
    for (let s2 = 0; s2 < KMAX; s2++) {
      rt = TYPES.map((_, col) => TYPES.reduce((acc, _t, i) => acc + rt[i] * M9[i][col], 0n));
      tilesRow.push(rt.slice());
    }
    void leafW;
    const pi = tIdx.get('Psi') as number;
    const closed = cfg.family === 'hex' ? 13 * Math.sqrt(15) - 49 : (3 * Math.sqrt(15) - 9) / 2;
    const at = (j: number) => Number(rows[j][pi]) / Number(tilesRow[j][pi]);
    const measTiles: number[] = [];
    for (let lv = 1; lv <= MAX; lv++) measTiles.push(strands(cfg, 'Psi', lv).instances.length);
    const predTiles = [1, 2, 3, 4, 5].slice(0, MAX).map((lv) => Number(tilesRow[lv][pi]));
    hold(measTiles.every((v, i) => v === predTiles[i]), `${cfg.id}: exact tiles_j(Psi) matches the built patches`,
      `predicted ${predTiles.join(',')} measured ${measTiles.join(',')}`);
    hold(Math.abs(at(40) - closed) < 1e-11, `${cfg.id}: EXACT segments/tile at level 40 equals the Q(sqrt15) closed form`,
      `level 5 ${at(5).toFixed(9)}, level 20 ${at(20).toFixed(12)}, level 40 ${at(40).toFixed(12)}, closed form ${closed.toFixed(12)}, |diff| ${Math.abs(at(40) - closed).toExponential(2)}`);
  }
}

// ===========================================================================
H('A7. Cross-check against graph_analysis/lvl4.csv (external, independent data)');
// ===========================================================================
console.log(`  lvl4.csv row: combo 0101000000, edge_selection 1278 -> tails 4, circuits 0,
  tail_lengths {1583:1, 1313:1, 2867:1, 1:1} (total 5764). leafOrder(spectre) is
  exactly that file's ALL_TILE_NAMES order, so the combo string means the same
  thing. Which root reproduces it?\n`);
{
  const cfg = CONFIGS.spectre1278;
  const target = [1, 1313, 1583, 2867];
  let found = '';
  for (const root of TYPES) {
    const tr = myTrace(strands(cfg, root, 4));
    const lens = tr.paths.map((p) => p.length).sort((a, b) => a - b);
    const total = lens.reduce((a, b) => a + b, 0);
    console.log(`    root ${root.padEnd(7)} lv4: ${tr.paths.length} arcs, ${tr.cycles.length} circuits, total ${total}, lengths [${lens.join(', ')}]`);
    if (lens.length === target.length && lens.every((v, i) => v === target[i])) found = root;
  }
  hold(found !== '', 'lvl4.csv is reproduced exactly by this repo\'s exact strand builder',
    found ? `root ${found}, 4 arcs, 0 circuits, lengths 1,1313,1583,2867` : 'NO root reproduces the CSV row');
}

// ===========================================================================
H('A8. Structural check: the induced sub-supertile graph IS the standalone one');
// ===========================================================================
console.log(`  05-limit.ts verifies the key-containment identity only for the three Psi
  slots. The "runs = arcs(type)" claim needs it for ALL eight. Checked here for
  every slot, both families, levels 2..${Math.min(MAX, 4)} — exact integer keys.\n`);
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  for (let lv = 2; lv <= Math.min(MAX, 4); lv++) {
    const s = strands(cfg, 'Psi', lv);
    const Ts = zSupertileTransforms(cfg.family, lv);
    let allOkSlots = true;
    for (let slot = 0; slot < 8; slot++) {
      const ty = SUPER_RULES.Psi[slot];
      if (ty === 'null') continue;
      const child = strands(cfg, ty as TileTypeId, lv - 1);
      const want = new Set(child.segs.map(([a, b]) => {
        const pa = zKey(zApply2(Ts[slot], child.coord.get(a) as ZVec));
        const pb = zKey(zApply2(Ts[slot], child.coord.get(b) as ZVec));
        return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
      }));
      const got = new Set<string>();
      for (let i = 0; i < s.segs.length; i++) {
        if (Number(s.instances[s.instOf[i]].id.split('.')[0]) !== slot) continue;
        const [a, b] = s.segs[i];
        got.add(a < b ? `${a}|${b}` : `${b}|${a}`);
      }
      const eq = want.size === got.size && [...want].every((k) => got.has(k));
      if (!eq) allOkSlots = false;
      // and the run count must equal the standalone arc count
      const arc = theArc(cfg, lv);
      let runs = 0; let prev = -1;
      for (const seg of arc) { const sl = Number(s.instances[s.instOf[seg]].id.split('.')[0]); if (sl !== prev) { if (sl === slot) runs++; } prev = sl; }
      const nArcs = myTrace(child).paths.length;
      if (runs !== nArcs) { allOkSlots = false; say('FAIL', `${cfg.id} lv${lv} slot ${slot}: runs ${runs} != arcs ${nArcs}`); }
    }
    hold(allOkSlots, `${cfg.id} level ${lv}: all 8 children are exact images of the standalone patch, and runs = arcs(type)`);
  }
}

// ===========================================================================
H('A9. Lemma A, verified as stated: sample the open half-disc itself');
// ===========================================================================
console.log(`  The clearance above is the distance from e's MIDPOINT to the other tiles.
  Lemma A asserts more: the whole open half-disc of radius r < 0.5 on the empty
  side misses every tile of P_k, INCLUDING the tile that owns e (which is a
  concave 14-gon in the spectre family and could in principle wrap around).
  Sampled on a polar grid, r = 0.4999, 200 radii x 400 angles, per frozen edge
  of one seed per family.\n`);
for (const f of ['hex', 'spectre'] as TileFamilyId[]) {
  const lv = Math.min(MAXG, 5);
  const p = patchOf(f, lv);
  const A = seedXform(f, new Array(lv - 1).fill(PSI_SLOTS[0]));
  const seed = patchOf(f, 1);
  let hits = 0, tested = 0, minClear = Infinity;
  for (let t = 0; t < seed.inst.length; t++) {
    const zp = zLeafPts(f, seed.inst[t].type).map((q) => zApply(seed.inst[t].xform, q));
    for (let j = 0; j < zp.length; j++) {
      const u = ukey(zp[j], zp[(j + 1) % zp.length]);
      if (seed.mult.get(u) !== 1) continue;
      const za = zApply(A, zp[j]), zb = zApply(A, zp[(j + 1) % zp.length]);
      if (!p.bkeys.has(ukey(za, zb))) continue;
      tested++;
      const a = zToPt(za), b = zToPt(zb);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // outward normal: the side with no tile. Test both normals, keep the empty one.
      const nx = -(b.y - a.y), ny = (b.x - a.x);
      const nl = Math.hypot(nx, ny);
      const probe = (sgn: number) => {
        const q = { x: m.x + sgn * 1e-6 * nx / nl, y: m.y + sgn * 1e-6 * ny / nl };
        for (let ti = 0; ti < p.inst.length; ti++) {
          const c0 = p.poly[ti][0];
          if (Math.abs(c0.x - m.x) > 12 || Math.abs(c0.y - m.y) > 12) continue;
          if (pointInPoly(q, p.poly[ti])) return true;
        }
        return false;
      };
      const sgn = probe(1) ? -1 : 1;
      if (probe(sgn)) { hold(false, `${f}: neither side of a frozen edge is empty (edge ${u})`); continue; }
      // spatial pre-filter: only tiles whose vertices come within 3 of m can matter
      const near: number[] = [];
      for (let ti = 0; ti < p.inst.length; ti++) {
        for (const q of p.poly[ti]) if (Math.abs(q.x - m.x) < 3 && Math.abs(q.y - m.y) < 3) { near.push(ti); break; }
      }
      for (let ia = 1; ia < 400; ia++) {
        const th = (Math.PI * ia) / 400;
        const dx = Math.cos(th) * (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y) + Math.sin(th) * sgn * nx / nl;
        const dy = Math.cos(th) * (b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y) + Math.sin(th) * sgn * ny / nl;
        for (let ir = 1; ir <= 200; ir++) {
          const r = (0.4999 * ir) / 200;
          const q = { x: m.x + r * dx, y: m.y + r * dy };
          for (const ti of near) {
            if (pointInPoly(q, p.poly[ti])) { hits++; minClear = Math.min(minClear, r); ir = 1e9; break; }
          }
        }
      }
    }
  }
  hold(hits === 0, `${f} level ${lv}: the open half-disc of radius 0.4999 at every frozen seed edge is empty`,
    `${tested} frozen edges x 400 directions x 200 radii; hits ${hits}${hits ? ` (closest ${minClear.toFixed(6)})` : ''}`);
}

// ===========================================================================
H('A10. Push the finite checks one level further than 05-limit.ts did');
// ===========================================================================
console.log(`  05-limit.ts checks arcs(T) at j <= 4 and the visit sequence / single-arc
  property at k <= 5, so its "period-2" claim rests on exactly two samples per
  parity. Extended here to j = 5 and k = 6.\n`);
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  const row: string[] = [];
  let circuits = 0;
  for (const t of TYPES) {
    const tr = myTrace(strands(cfg, t, 5));
    circuits += tr.cycles.length;
    row.push(`${t}=${tr.paths.length}`);
  }
  const want = TYPES.map((t) => arcsTable[key][t][0]);
  const got = TYPES.map((t) => myTrace(strands(cfg, t, 5)).paths.length);
  hold(circuits === 0 && want.every((v, i) => v === got[i]),
    `${cfg.id}: arcs(T) at j = 5 still equals the j = 1 profile, 0 circuits`, row.join(' '));
}
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  const s = strands(cfg, 'Psi', 6);
  const tr = myTrace(s);
  hold(tr.paths.length === 1 && tr.cycles.length === 0 && tr.maxDeg <= 2,
    `${cfg.id}: the level-6 Psi patch is still exactly ONE open arc (not checked by 05-limit.ts)`,
    `${s.instances.length} tiles, ${s.segs.length} segments, ${tr.paths.length} arcs, ${tr.cycles.length} circuits, maxdeg ${tr.maxDeg}`);
  if (tr.paths.length !== 1) continue;
  const arc = tr.paths[0];
  const seq: number[] = [];
  for (const seg of arc) {
    const sl = Number(s.instances[s.instOf[seg]].id.split('.')[0]);
    if (seq.length === 0 || seq[seq.length - 1] !== sl) seq.push(sl);
  }
  const fwd = seq.join(' ');
  const rev = [...seq].reverse().join(' ');
  const canon = fwd < rev ? fwd : rev;
  const EVEN = '7 4 7 1 7 0 1 4 1 3 1 2 3 4 7 4 6 4 5 6 7';
  hold(canon === EVEN, `${cfg.id}: the level-6 top-level visit sequence equals the level-2/4 (even-parity) one`,
    `21 runs? ${seq.length === 21}; got "${canon}"`);
  // contiguity at depth 1 and 2 of the level-6 arc
  for (const d of [1, 2]) {
    const pre = arc.map((seg) => s.instances[s.instOf[seg]].id.split('.').slice(0, d).join('.'));
    const runs = new Map<string, number>();
    let prev = '';
    for (const x of pre) { if (x !== prev) runs.set(x, (runs.get(x) ?? 0) + 1); prev = x; }
    let match = 0, contig = 0, psi = 0;
    for (const [q, r] of runs) {
      let ty: TileTypeId = 'Psi';
      for (const sl of q.split('.').map(Number)) ty = SUPER_RULES[ty][sl] as TileTypeId;
      if (ty === 'Psi') psi++;
      if (r === arcsTable[key][ty][0]) match++;
      if (r === 1) contig++;
    }
    hold(match === runs.size && contig === psi,
      `${cfg.id} level 6 depth ${d}: runs = arcs(type) for all ${runs.size}, contiguous iff Psi`,
      `${match}/${runs.size} matched, ${contig} contiguous vs ${psi} Psi`);
  }
}

// ===========================================================================
H('A11. Independent characteristic polynomial (Bareiss det, not Faddeev)');
// ===========================================================================
{
  const N = 9;
  const detBig = (Ain: bigint[][]): bigint => {
    const A = Ain.map((r) => r.slice());
    let sign = 1n, prev = 1n;
    for (let k = 0; k < N - 1; k++) {
      if (A[k][k] === 0n) {
        let sw = -1;
        for (let i = k + 1; i < N; i++) if (A[i][k] !== 0n) { sw = i; break; }
        if (sw < 0) return 0n;
        const t = A[k]; A[k] = A[sw]; A[sw] = t; sign = -sign;
      }
      for (let i = k + 1; i < N; i++) for (let j = k + 1; j < N; j++) {
        A[i][j] = (A[i][j] * A[k][k] - A[i][k] * A[k][j]) / prev;
      }
      prev = A[k][k];
    }
    return sign * A[N - 1][N - 1];
  };
  const claimed = (x: bigint) => x ** 9n - 8n * x ** 8n + 8n * x ** 6n - x ** 5n;
  let allMatch = true;
  const pts: string[] = [];
  for (let xi = -5; xi <= 6; xi++) {
    const x = BigInt(xi);
    const A = M9.map((r, i) => r.map((v, j) => (i === j ? x - v : -v)));
    const d = detBig(A);
    const c = claimed(x);
    if (d !== c) allMatch = false;
    pts.push(`p(${xi})=${d}`);
  }
  hold(allMatch, 'det(xI - M) agrees with x^9 - 8x^8 + 8x^6 - x^5 at 12 integer points (degree 9, so they are equal)',
    pts.slice(0, 6).join(' '));
  const disc = 64 - 4;
  hold(Math.abs((8 + Math.sqrt(disc)) / 2 - LAMBDA) < 1e-12, 'the Perron root of x^2 - 8x + 1 is 4 + sqrt(15)', LAMBDA.toFixed(12));
}

// ===========================================================================
H('A12. Is (2 - sqrt3)/4 a REAL quantity for these chords? (the doc\'s claim)');
// ===========================================================================
console.log(`  05-limit.ts "refutes" docs/FASS_PROOF.md §4.2 by measuring the max distance
  OUTSIDE the tile. The doc's §4.2 table labels its rows with three DIFFERENT
  measurements. All three are computed here for every straying spectre chord.\n`);
console.log('    | leaf | max depth outside | length of straying piece | dist(reflex vertex, chord) |');
console.log('    |---|---|---|---|');
{
  const cfg = CONFIGS.spectre1278;
  for (const type of leafOrder(cfg.family)) {
    const poly = leafPts(cfg.family, type);
    // reflex vertices: interior angle > 180 (polygon assumed CCW or CW - test both signs)
    let area = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a.x * b.y - b.x * a.y; }
    const ccw = area > 0;
    const reflex: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p0 = poly[(i - 1 + poly.length) % poly.length], p1 = poly[i], p2 = poly[(i + 1) % poly.length];
      const cr = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
      if (ccw ? cr < -1e-12 : cr > 1e-12) reflex.push(p1);
    }
    for (const [a, b] of floatChords(cfg, type)) {
      const NS = 200000;
      let depth = 0, outLen = 0;
      for (let s = 0; s <= NS; s++) {
        const t = s / NS;
        const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        const d = distToPoly(q, poly);
        depth = Math.max(depth, d);
        if (d > 1e-12) outLen += dist(a, b) / NS;
      }
      if (depth < 1e-9) continue;
      let dv = Infinity;
      for (const v of reflex) dv = Math.min(dv, pointSegDist(v, a, b));
      console.log(`    | ${type.padEnd(7)} | ${depth.toFixed(9).padStart(17)} | ${outLen.toFixed(9).padStart(24)} | ${dv.toFixed(9).padStart(26)} |`);
    }
  }
  console.log(`    reference constants: (2sqrt3-3)/8 = ${C1.toFixed(9)}   (2-sqrt3)/4 = ${C2.toFixed(9)}   (2sqrt3-3)/2 = ${((2 * Math.sqrt(3) - 3) / 2).toFixed(9)}`);
}

// ===========================================================================
H('A13. Two claims in the 05 header that its code never computes');
// ===========================================================================
console.log(`  (i) 05-limit.ts's LEMMA A paragraph says the edge-to-edge check verifies
      "no directed edge repeats". Its section 3a computes only UNDIRECTED edge
      multiplicities (helper ukey); there is no directed-edge test anywhere in
      the file. The check is supplied here.
  (ii) Its section 3a says the outline is "a disjoint union of simple cycles",
      which permits HOLES. Whether the patch region is simply connected is never
      computed, though the inradius and the burial argument read more naturally
      if it is. Counted here.\n`);
for (const f of ['hex', 'spectre'] as TileFamilyId[]) {
  for (let lv = 1; lv <= MAXG; lv++) {
    const p = patchOf(f, lv);
    const dseen = new Set<string>();
    let dup = 0;
    for (const i of p.inst) {
      const zp = zLeafPts(f, i.type).map((q) => zApply(i.xform, q));
      for (let j = 0; j < zp.length; j++) {
        const k = `${zKey(zp[j])}>${zKey(zp[(j + 1) % zp.length])}`;
        if (dseen.has(k)) dup++; else dseen.add(k);
      }
    }
    const par = new Map<string, string>();
    const find = (x: string): string => { let r = x; while (par.get(r) !== r) r = par.get(r) as string; return r; };
    for (const u of p.bkeys) { const [a, b] = u.split('_'); if (!par.has(a)) par.set(a, a); if (!par.has(b)) par.set(b, b); }
    for (const u of p.bkeys) { const [a, b] = u.split('_'); const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); }
    const roots = new Set<string>();
    for (const k of par.keys()) roots.add(find(k));
    hold(dup === 0 && roots.size === 1,
      `${f} level ${lv}: no repeated DIRECTED edge, and the outline is ONE cycle (no holes)`,
      `${p.inst.length} tiles, ${p.bkeys.size} outline edges, ${roots.size} outline cycle(s), ${dup} repeated directed edge(s)`);
  }
}

console.log(`\n${bad === 0 ? 'AUDIT: no objection survived' : `AUDIT: ${bad} objection(s)/failure(s)`}\n`);
process.exit(bad === 0 ? 0 : 1);
