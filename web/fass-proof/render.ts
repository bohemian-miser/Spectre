/**
 * Render the single strand curve of a config on a supertile patch to SVG.
 *
 * Family- and selection-parametric twin of
 * `fass-investigation/07-render-svg.ts`, driven by the exact library so the
 * picture is guaranteed to be the object the proof talks about. The arc is
 * drawn with a hue gradient along its length, so you can see that one line
 * wanders the whole patch; endpoints are red dots.
 *
 * Run: cd web && npx --yes tsx fass-proof/render.ts <config> <root> <level> [out.svg]
 *   e.g. npx --yes tsx fass-proof/render.ts hex128 Psi 4
 */

import { writeFileSync } from 'node:fs';
import { leafPts, transPt, zToAffine, zToPt, type Pt, type TileTypeId } from '../src/core';
import { buildStrands, configOf, trace, zExpand } from './lib';

const cfg = configOf(process.argv[2] ?? 'hex128');
const ROOT = (process.argv[3] ?? 'Psi') as TileTypeId;
const LEVEL = Number(process.argv[4] ?? 4);
const OUT =
  process.argv[5] ??
  new URL(`./fass_${cfg.id}_${ROOT}_lvl${LEVEL}.svg`, import.meta.url).pathname;

const instances = zExpand(cfg.family, ROOT, LEVEL);
const strands = buildStrands(cfg, instances);
const tr = trace(strands);

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
const upd = (p: Pt) => {
  if (p.x < minX) minX = p.x;
  if (p.y < minY) minY = p.y;
  if (p.x > maxX) maxX = p.x;
  if (p.y > maxY) maxY = p.y;
};
const tilePolys: string[] = [];
for (const inst of instances) {
  const M = zToAffine(inst.xform);
  const pts = leafPts(cfg.family, inst.type).map((p) => transPt(M, p));
  pts.forEach(upd);
  tilePolys.push(pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' '));
}

const pad = 2;
const W = maxX - minX + 2 * pad;
const H = maxY - minY + 2 * pad;
const out: string[] = [];
out.push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${W.toFixed(2)} ${H.toFixed(2)}" width="1600">`,
);
out.push(
  `<rect x="${(minX - pad).toFixed(2)}" y="${(minY - pad).toFixed(2)}" width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="white"/>`,
);
out.push('<g fill="#f4f1ea" stroke="#c9c2b4" stroke-width="0.06">');
for (const poly of tilePolys) out.push(`<polygon points="${poly}"/>`);
out.push('</g>');

/** Ordered vertex list of a component, in path order. */
function pointsOf(segIdxs: readonly number[], closed: boolean): Pt[] {
  const keys: string[] = [];
  let prev = '';
  for (let i = 0; i < segIdxs.length; i++) {
    const [a, b] = strands.segs[segIdxs[i]];
    if (i === 0) {
      // Orient the first segment against the second one.
      const next = segIdxs[1] !== undefined ? strands.segs[segIdxs[1]] : null;
      const startsAtA = next ? next[0] === b || next[1] === b : true;
      keys.push(startsAtA ? a : b, startsAtA ? b : a);
      prev = keys[keys.length - 1];
      continue;
    }
    const nxt = a === prev ? b : a;
    keys.push(nxt);
    prev = nxt;
  }
  if (closed && keys.length > 1) keys.push(keys[0]);
  return keys.map((k) => {
    const z = zToPt(strands.coord.get(k)!);
    return { x: z.x / 2, y: z.y / 2 };
  });
}

const comps = [...tr.arcs, ...tr.circuits];
const flat = ['#1c6ee8', '#12a35a', '#111111', '#7a28c9'];
comps.forEach((c, ci) => {
  const pts = pointsOf(c.segIdxs, c.closed);
  if (ci === 0 && pts.length > 100) {
    const CHUNK = Math.max(4, Math.floor(pts.length / 720));
    for (let s = 0; s + 1 < pts.length; s += CHUNK) {
      const slice = pts.slice(s, Math.min(pts.length, s + CHUNK + 1));
      const hue = Math.round((360 * s) / pts.length);
      out.push(
        `<polyline fill="none" stroke="hsl(${hue} 85% 45%)" stroke-width="0.34" stroke-linecap="round" stroke-linejoin="round" points="${slice
          .map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)
          .join(' ')}"/>`,
      );
    }
  } else {
    out.push(
      `<polyline fill="none" stroke="${flat[ci % flat.length]}" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round" points="${pts
        .map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)
        .join(' ')}"/>`,
    );
  }
  if (!c.closed) {
    for (const p of [pts[0], pts[pts.length - 1]]) {
      out.push(`<circle cx="${p.x.toFixed(3)}" cy="${p.y.toFixed(3)}" r="0.42" fill="#d62828"/>`);
    }
  }
});
out.push('</svg>');

writeFileSync(OUT, out.join('\n'));
console.log(
  `${cfg.id}  ${ROOT}@${LEVEL}: ${instances.length} tiles, ${strands.segs.length} segments, ` +
    `${tr.arcs.length} arc(s) [${tr.arcs.map((a) => a.segIdxs.length).join(', ')}], ` +
    `${tr.circuits.length} circuit(s), covers ${tr.tilesCovered}/${instances.length} tiles`,
);
console.log(`wrote ${OUT}`);
