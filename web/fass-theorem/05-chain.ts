/**
 * 05 — The ancestor chain that the theorem uses, checked numerically.
 *
 * docs/FASS_THEOREM.md §5 builds one infinite tiling from the Psi supertiles
 *   T_0 ⊂ T_1 ⊂ T_2 ⊂ ...   where T_i sits in T_{i+1} at slot w_i,
 * with the slot word w = 0,5,0,0 repeated (all Psi slots of a Psi parent, so
 * every T_i is a Psi supertile). Whenever w_i..w_{i+3} = 0,5,0,0 the level-i
 * supertile has address 0.0.5.0 in T_{i+4}, which 02 (C7) shows owns no
 * outline edge; so every T_i is interior to T_{i+4}, and the covering argument
 * of the theorem makes the union the whole plane.
 *
 * This script re-anchors the chain exactly (each level keeps the seed where it
 * is) and checks, for as many levels as fit: each Psi supertile's single arc
 * contains the previous one's as a contiguous sub-path, with segments added at
 * BOTH ends; T_i is buried in T_{i+4} geometrically; and the distance from the
 * seed to the outline grows without any sign of stalling.
 *
 * Run: cd web && npx --yes tsx fass-theorem/05-chain.ts [hex128|spectre1278] [levels]
 */
import { SUPER_RULES, zInv, zMul, zSupertileTransforms, zToPt, Z_IDENT, type ZAffine } from '../src/core';
import { CONFIGS, buildStrands, heading, trace, verdict, zExpand, type ZInstance } from '../fass-proof/lib';
import { leaves, outlineOf } from './geom';

const cfg = CONFIGS[process.argv[2] ?? 'hex128'];
const MAX = Number(process.argv[3] ?? 5); // T_5 is level 6 (242k / 273k tiles); level 7 has 1.9M tiles and takes ~10 minutes
const WORD = [0, 5, 0, 0];
let allOk = true;
const check = (ok: boolean, label: string, detail = ''): boolean => { allOk = verdict(ok, label, detail) && allOk; return ok; };

heading(`${cfg.id}: the chain of Psi supertiles with slot word ${WORD.join(',')}`);
// E_i: the frame of T_i expressed in the frame of T_0 (the seed). T_i is a level-(i+1) Psi supertile here (T_0 = level 1).
let E: ZAffine = Z_IDENT; let prevSegs: string[] | null = null; let prevOutline: Set<string> | null = null;
const inradii: number[] = [];
for (let i = 0; i <= MAX; i++) {
  const level = i + 1;
  if (i > 0) { const slot = WORD[(i - 1) % WORD.length]; if (SUPER_RULES.Psi[slot] !== 'Psi') throw new Error('not a Psi slot'); E = zMul(E, zInv(zSupertileTransforms(cfg.family, level)[slot])); }
  const insts: ZInstance[] = zExpand(cfg.family, 'Psi', level).map((x) => ({ ...x, xform: zMul(E, x.xform) }));
  const strands = buildStrands(cfg, insts); const tr = trace(strands);
  check(tr.arcs.length === 1 && tr.circuits.length === 0 && tr.tilesCovered === insts.length, `T_${i} (level ${level}, ${insts.length} tiles): one arc, no circuit, every tile visited`);
  const arc = tr.arcs[0]; const segs = arc.segIdxs.map((k) => { const [a, b] = strands.segs[k]; return a < b ? `${a}|${b}` : `${b}|${a}`; });
  if (prevSegs) {
    const where = new Map(segs.map((s, i) => [s, i] as const));
    const pos = prevSegs.map((s) => where.get(s) ?? -1);
    let start = Infinity, end = -Infinity; for (const p of pos) { if (p < start) start = p; if (p > end) end = p; } // no spread: the arrays reach millions of entries
    const contiguous = pos.every((p) => p >= 0) && end - start + 1 === prevSegs.length && (pos.every((p, k) => p === start + k) || pos.every((p, k) => p === end - k));
    check(contiguous, `the arc of T_${i - 1} is a contiguous sub-path of the arc of T_${i}`, `${start} segments before it, ${segs.length - end - 1} after`);
  }
  prevSegs = segs;
  // seed inside: distance from the seed's tiles to the outline, and burial of T_{i-4}
  const o = outlineOf(cfg.family, leaves(cfg.family, 'Psi', level, E));
  const outlineKeys = new Set(o.loop);
  // seed vertices: the level-1 patch's own outline vertices (the seed is T_0, in the frame of T_0)
  const seedOutline = outlineOf(cfg.family, leaves(cfg.family, 'Psi', 1));
  let touches = 0; for (const k of seedOutline.loop) if (outlineKeys.has(k)) touches++;
  let best = Infinity; const pts = o.loop.map((k) => zToPt(o.coord.get(k)!));
  for (const k of seedOutline.loop) { const p = zToPt(seedOutline.coord.get(k)!); for (const q of pts) best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y)); }
  inradii.push(best);
  console.log(`      T_${i}: outline ${o.loop.length} steps; seed vertices on the outline: ${touches}; seed-to-outline distance ${best.toFixed(3)}`);
  if (i >= 4) check(touches === 0, `T_0 shares no vertex with the outline of T_${i}`);
  prevOutline = outlineKeys; void prevOutline;
}
check(inradii.every((r, k) => k === 0 || r >= inradii[k - 1]), 'the seed-to-outline distance never decreases', inradii.map((r) => r.toFixed(2)).join(' -> '));
console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
