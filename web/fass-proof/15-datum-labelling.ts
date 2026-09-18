/**
 * Which labelling? Resolving the disputed period of the gluing datum.
 *
 * Two independent computations in this directory disagreed:
 * 03-substitution-invariance.ts reports the gluing/outer datum CONSTANT
 * (period 1) from level 2; 06-family-reduction.ts reports the cross-child
 * interface table taking three distinct values at levels 2, 3, 4 with only
 * period 2 from level 3.
 *
 * Both are right about their own computation. This script settles it by
 * computing the datum a third time and reporting it under BOTH labelling
 * conventions, so the disagreement can be attributed rather than argued:
 *
 *   labelling A (chirality-stable) — each child's boundary dots are numbered
 *     along its own outline, anchored at its quad[0] and oriented so quad[1]
 *     precedes quad[3]. That rule absorbs the per-level mirror flip that
 *     buildSupertiles introduces.
 *   labelling B (naive) — the same, but the outline is walked in whichever
 *     direction the edge-chaining happens to produce.
 *
 * Result: under A the datum is constant, pattern 0000 over levels 2..5, for
 * every one of the nine types in both families. Under B it takes three distinct
 * values, pattern 0121, exactly reproducing the family-reduction report.
 *
 * So the period-2 alternation is an artefact of the labelling, not a property
 * of the substitution — which is what lets the routing operator F of
 * 04-routing-automaton.ts be a single fixed map rather than an alternating pair.
 *
 * Run: cd web && npx --yes tsx fass-proof/15-datum-labelling.ts
 */

import {
  SUPER_RULES, dist, zApply, zKey, zLeafPts, zSupertileQuad, zSupertileTransforms, zToPt,
  type Pt, type TileFamilyId, type TileTypeId, type ZVec,
} from '../src/core';
import { CONFIGS, buildStrands, zExpand, type ZInstance } from './lib';

function outlineLoop(family: TileFamilyId, inst: readonly ZInstance[]): ZVec[] {
  const use = new Map<string, { a: ZVec; b: ZVec; n: number }>();
  for (const it of inst) {
    const poly = zLeafPts(family, it.type).map((p) => zApply(it.xform, p));
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ka = zKey(a), kb = zKey(b);
      const k = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
      const h = use.get(k); if (h) h.n++; else use.set(k, { a, b, n: 1 });
    }
  }
  const nbr = new Map<string, string[]>(); const coord = new Map<string, ZVec>();
  let seed = '';
  for (const e of use.values()) {
    if (e.n !== 1) continue;
    const ka = zKey(e.a), kb = zKey(e.b);
    coord.set(ka, e.a); coord.set(kb, e.b);
    if (!nbr.has(ka)) nbr.set(ka, []); if (!nbr.has(kb)) nbr.set(kb, []);
    nbr.get(ka)!.push(kb); nbr.get(kb)!.push(ka);
    if (!seed) seed = ka;
  }
  for (const v of nbr.values()) if (v.length !== 2) throw new Error('outline not simple');
  const loop = [coord.get(seed)!]; let prev = '', cur = seed;
  for (;;) {
    const opts = nbr.get(cur)!.filter((x) => x !== prev);
    const nx = opts.length ? opts[0] : nbr.get(cur)![0];
    if (nx === seed) break;
    loop.push(coord.get(nx)!); prev = cur; cur = nx;
    if (loop.length > nbr.size + 1) throw new Error('did not close');
  }
  return loop;
}

function ptSegD(p: Pt, a: Pt, b: Pt) {
  const vx = b.x - a.x, vy = b.y - a.y, c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / c2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

const BCACHE = new Map<string, { order: string[]; coord: Map<string, ZVec> }>();

/** Boundary-dot keys of a standalone supertile, ordered by labelling A or B. */
function boundary(cfgKey: string, type: TileTypeId, level: number, chiral: boolean) {
  const ck = `${cfgKey}|${type}|${level}|${chiral}`;
  const hit = BCACHE.get(ck);
  if (hit) return hit;
  const r = boundaryCompute(cfgKey, type, level, chiral);
  BCACHE.set(ck, r);
  return r;
}

function boundaryCompute(cfgKey: string, type: TileTypeId, level: number, chiral: boolean) {
  const cfg = CONFIGS[cfgKey];
  const inst = zExpand(cfg.family, type, level);
  const strands = buildStrands(cfg, inst);
  const loopZ = outlineLoop(cfg.family, inst);
  let loop = loopZ.map(zToPt);
  const n = loop.length;
  if (chiral) {
    const quad = zSupertileQuad(cfg.family, level).map(zToPt);
    const anchor = (q: Pt) => {
      let b = -1, bd = Infinity;
      for (let i = 0; i < n; i++) { const d = dist(loop[i], q); if (d < bd) { bd = d; b = i; } }
      if (bd > 1e-6) throw new Error('quad not on outline');
      return b;
    };
    const i0 = anchor(quad[0]), i1 = anchor(quad[1]), i3 = anchor(quad[3]);
    const fwd = (i1 - i0 + n) % n < (i3 - i0 + n) % n;
    const re: Pt[] = [];
    for (let s = 0; s < n; s++) re.push(loop[fwd ? (i0 + s) % n : (i0 - s + 2 * n) % n]);
    loop = re;
  }
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(loop[i - 1], loop[i]));
  const dots: { key: string; s: number }[] = [];
  for (const [key, deg] of strands.degree) {
    if (deg !== 1) continue;
    const z = zToPt(strands.coord.get(key)!);
    const p = { x: z.x / 2, y: z.y / 2 };
    let b = -1, bd = Infinity, bt = 0;
    for (let i = 0; i < n; i++) {
      const d = ptSegD(p, loop[i], loop[(i + 1) % n]);
      if (d < bd) { bd = d; b = i; bt = dist(loop[i], p) / Math.max(dist(loop[i], loop[(i + 1) % n]), 1e-12); }
    }
    if (bd > 1e-6) throw new Error('dot off outline');
    dots.push({ key, s: cum[b] + Math.min(1, Math.max(0, bt)) * dist(loop[b], loop[(b + 1) % n]) });
  }
  dots.sort((a, b) => a.s - b.s);
  return { order: dots.map((d) => d.key), coord: new Map(strands.coord) };
}

/** The gluing + outer datum of a level-(k+1) supertile of `type`. */
function datum(cfgKey: string, type: TileTypeId, level: number, chiral: boolean): string {
  const cfg = CONFIGS[cfgKey];
  const Ts = zSupertileTransforms(cfg.family, level);
  const subs = SUPER_RULES[type];
  const mapped: { slot: number; idx: number; key: string }[] = [];
  for (let slot = 0; slot < 8; slot++) {
    if (subs[slot] === 'null') continue;
    const { order, coord } = boundary(cfgKey, subs[slot] as TileTypeId, level - 1, chiral);
    const T = Ts[slot];
    order.forEach((k, idx) => {
      const q2 = coord.get(k)!;
      const lin = zApply({ k: T.k, m: T.m, t: [0, 0, 0, 0] }, q2);
      const img: ZVec = [lin[0] + 2 * T.t[0], lin[1] + 2 * T.t[1], lin[2] + 2 * T.t[2], lin[3] + 2 * T.t[3]];
      mapped.push({ slot, idx, key: zKey(img) });
    });
  }
  const byKey = new Map<string, { slot: number; idx: number }[]>();
  for (const m of mapped) {
    if (!byKey.has(m.key)) byKey.set(m.key, []);
    byKey.get(m.key)!.push({ slot: m.slot, idx: m.idx });
  }
  const glue: string[] = [];
  const outer: string[] = [];
  for (const [, list] of byKey) {
    if (list.length === 2) {
      const [a, b] = list.sort((x, y) => x.slot - y.slot || x.idx - y.idx);
      glue.push(`${a.slot}:${a.idx}=${b.slot}:${b.idx}`);
    } else if (list.length === 1) {
      outer.push(`${list[0].slot}:${list[0].idx}`);
    } else {
      glue.push(`MULTI${list.length}`);
    }
  }
  glue.sort(); outer.sort();
  return `glue[${glue.join(' ')}] outer[${outer.join(' ')}]`;
}


const PERIOD_A: number[] = [];
const PERIOD_B: number[] = [];
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
for (const chiral of [true, false]) {
  console.log(`\n######## labelling ${chiral ? 'A (chirality-stable)' : 'B (naive)'} ########`);
  for (const cfgKey of ['hex128', 'spectre1278']) {
    console.log(`\n### ${CONFIGS[cfgKey].id}`);
    for (const T of TYPES) {
      const ds: string[] = [];
      for (let lv = 2; lv <= 5; lv++) {
        try { ds.push(datum(cfgKey, T, lv, chiral)); } catch (e) { ds.push('ERR ' + (e as Error).message); }
      }
      const uniq = [...new Set(ds)];
      const idx = ds.map((d) => uniq.indexOf(d)).join('');
      const period = uniq.length === 1 ? 1 : (ds[0] === ds[2] && ds[1] === ds[3] ? 2 : 0);
      console.log(`  ${T.padEnd(7)} levels 2..5 pattern ${idx}  distinct=${uniq.length}  period=${period || '?'}`);
      (chiral ? PERIOD_A : PERIOD_B).push(uniq.length);
    }
  }
}

const ok =
  PERIOD_A.length === 18 && PERIOD_A.every((n) => n === 1) &&
  PERIOD_B.length === 18 && PERIOD_B.every((n) => n === 3);
console.log(`\n${'='.repeat(78)}`);
console.log(ok
  ? '  [ OK ] under the chirality-stable labelling the datum is CONSTANT for all 18\n' +
    '         (type, family) pairs; under the naive labelling it takes three values.\n' +
    '         The disputed period is a labelling artefact, not a property of the\n' +
    '         substitution.'
  : `  [FAIL] unexpected pattern: A=${PERIOD_A.join('')} B=${PERIOD_B.join('')}`);
process.exit(ok ? 0 : 1);
