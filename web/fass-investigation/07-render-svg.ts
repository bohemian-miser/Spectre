/**
 * Render the strand curve(s) of 1278/<combo> on a supertile patch to SVG:
 * light tile outlines + arcs as polylines. The longest arc is drawn with a
 * hue gradient along its length (so you can SEE it is one line wandering the
 * whole patch); other arcs get flat colors; 1-segment stubs are black.
 *
 * Run: cd web && npx --yes tsx fass-investigation/07-render-svg.ts <combo> <root> <level> [out.svg]
 * e.g. npx --yes tsx fass-investigation/07-render-svg.ts 0100100000 Psi 4
 */

import { writeFileSync } from 'node:fs';
import { leafPts, transPt, type Pt, type TileTypeId } from '../src/core';
import { buildPatch, collectTagged, traceIndexed, FAMILY } from './lib';

const COMBO = process.argv[2] ?? '0100100000';
const ROOT = (process.argv[3] ?? 'Psi') as TileTypeId;
const LEVEL = Number(process.argv[4] ?? 4);
const OUT =
  process.argv[5] ??
  new URL(`./fass_1278_${COMBO}_${ROOT}_lvl${LEVEL}.svg`, import.meta.url).pathname;

const { instances } = buildPatch(ROOT, LEVEL);
const tagged = collectTagged(instances, COMBO);
const trace = traceIndexed(tagged.segs);
const tails = [...trace.tails].sort((a, b) => b.segIdxs.length - a.segIdxs.length);

// bounds
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const upd = (p: Pt) => {
  if (p.x < minX) minX = p.x;
  if (p.y < minY) minY = p.y;
  if (p.x > maxX) maxX = p.x;
  if (p.y > maxY) maxY = p.y;
};
const tilePolys: string[] = [];
for (const inst of instances) {
  const pts = leafPts(FAMILY, inst.type).map((p) => transPt(inst.xform, p));
  pts.forEach(upd);
  tilePolys.push(pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' '));
}
const pad = 2;
const W = maxX - minX + 2 * pad;
const H = maxY - minY + 2 * pad;

const parts: string[] = [];
parts.push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${W.toFixed(2)} ${H.toFixed(2)}" width="1600">`,
);
parts.push(`<rect x="${(minX - pad).toFixed(2)}" y="${(minY - pad).toFixed(2)}" width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="white"/>`);
parts.push('<g fill="#f4f1ea" stroke="#c9c2b4" stroke-width="0.06">');
for (const poly of tilePolys) parts.push(`<polygon points="${poly}"/>`);
parts.push('</g>');

const flat = ['#1c6ee8', '#12a35a', '#111111', '#7a28c9'];
tails.forEach((t, ti) => {
  const pts = t.keys.map((k) => trace.coords.get(k)!);
  if (ti === 0 && pts.length > 100) {
    // hue gradient along the longest arc, drawn in chunks
    const CHUNK = Math.max(4, Math.floor(pts.length / 720));
    for (let s = 0; s + 1 < pts.length; s += CHUNK) {
      const e = Math.min(s + CHUNK, pts.length - 1);
      const hue = (300 * s) / pts.length;
      const seg = pts.slice(s, e + 1).map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
      parts.push(
        `<polyline points="${seg}" fill="none" stroke="hsl(${hue.toFixed(1)},85%,45%)" stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    }
  } else {
    const seg = pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
    parts.push(
      `<polyline points="${seg}" fill="none" stroke="${flat[Math.min(ti, flat.length - 1)]}" stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
  // arc endpoints
  for (const p of [pts[0], pts[pts.length - 1]]) {
    parts.push(`<circle cx="${p.x.toFixed(3)}" cy="${p.y.toFixed(3)}" r="0.30" fill="#d40000"/>`);
  }
});
parts.push('</svg>');
writeFileSync(OUT, parts.join('\n'));
console.log(
  `wrote ${OUT}: ${ROOT}@${LEVEL}, ${instances.length} tiles, arcs=[${tails
    .map((t) => t.segIdxs.length)
    .join(', ')}]`,
);
