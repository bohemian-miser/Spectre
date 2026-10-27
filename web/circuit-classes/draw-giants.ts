/**
 * Draw a combination's giants: the largest circuits born in the level-L and
 * level-(L - 2) Delta supertiles and the longest strand still open through the
 * level-L Delta, each from the hierarchy (circuit-shapes.ts), at the finest
 * level of detail that stays under MAXPTS points (environment, default 80k).
 *
 * Usage: tsx draw-giants.ts <rule> <combo> <level> <keepCircuitsFrom> <out.json>   (hexagons)
 */
import { writeFileSync } from 'node:fs';
import { CircuitShapes } from './circuit-shapes';
const [rule, combo, Ls, minKeep, out] = process.argv.slice(2);
const L = Number(Ls);
const t0 = Date.now();
const cs = new CircuitShapes('hex', [...rule].map(Number), [...combo].map((c) => parseInt(c, 36)), L, Number(minKeep));
console.error(`built ${((Date.now() - t0) / 1000).toFixed(0)}s`);
type P = { x: number; y: number };
// The finest level that keeps the drawing under 80k points; estimate from the length first.
const pick = (len: number, f: (s: number) => P[]) => {
  for (let s = 0; s < L; s++) {
    if (len / Math.pow(4.4, s) > Number(process.env.MAXPTS ?? 80000) * 5) continue;
    const p = f(s);
    if (p.length <= Number(process.env.MAXPTS ?? 80000)) return { s, p };
  }
  return { s: L - 1, p: f(L - 1) };
};
const shapes: { what: string; length: number; stop: number; pts: number[][] }[] = [];
for (const lv of [L, L - 2]) {
  const here = cs.born.filter((b) => b.level === lv && b.type === 'Delta').sort((a, b) => b.length - a.length);
  if (!here[0]) continue;
  const { s, p } = pick(here[0].length, (st) => cs.shape(here[0], st));
  shapes.push({ what: `largest circuit born in a level-${lv} Delta`, length: here[0].length, stop: s, pts: p.map((q) => [q.x, q.y]) });
}
const Ld = cs.levels[L].Delta;
let best = 0; for (let k = 1; k < Ld.arcLen.length; k++) if (Ld.arcLen[k] > Ld.arcLen[best]) best = k;
{ const { s, p } = pick(Ld.arcLen[best], (st) => cs.longestArc(L, 'Delta', st).pts); shapes.push({ what: `longest open strand through a level-${L} Delta`, length: Ld.arcLen[best], stop: s, pts: p.map((q) => [q.x, q.y]) }); }
writeFileSync(out, JSON.stringify(shapes));
console.error(shapes.map((x) => `${x.what}: ${x.length} tiles, drawn to L${x.stop}, ${x.pts.length} pts`).join('\n'), `\n${((Date.now() - t0) / 1000).toFixed(0)}s`);
