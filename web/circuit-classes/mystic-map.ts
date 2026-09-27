/**
 * How the iso labelling's two-tile Mystic (Gamma1 + Gamma2, joined by the
 * class-7 seam) relates to the hexagon family's one-tile Gamma.
 *
 * For every pair (Gamma1 option, Gamma2 option) of an iso rule, compose the
 * two pairings through the single crossing on the internal seam and read off
 * the pairing induced on the Mystic's outer crossings. It is the hexagon Gamma
 * option k when Gamma2's side-by-side 6 | -6 crossings are joined (they stand
 * in for the hexagons' Delta–Sigma edge) and what is left pairs the hexagon
 * Gamma's crossings exactly as option k does.
 *
 * Usage: tsx mystic-map.ts
 */
import {
  connectionPoints, enumerateMatchings, nonCrossingForTile, validEdgeSubsets, type TileFamilyId,
} from '../src/core';

const tag = (e: { sign: number; major: number; variant: string }) =>
  `${e.sign < 0 ? '-' : ''}${e.major}${e.variant}`;

function options(family: TileFamilyId, type: 'Gamma' | 'Gamma1' | 'Gamma2', rule: Set<number>) {
  const pts = connectionPoints(family, type as never, rule).map((c) => tag(c.edge));
  const all = enumerateMatchings(pts.length);
  const nc = nonCrossingForTile(family, type as never, rule);
  const ms = nc.length ? nc.map((i) => all[i]) : [[]];
  // Each option as a map tag -> partner tag.
  return { pts, opts: ms.map((m) => new Map(m.flatMap(([a, b]) => [[pts[a], pts[b]], [pts[b], pts[a]]]))) };
}

const norm = (m: Map<string, string>) => [...m].filter(([a, b]) => a < b).map(([a, b]) => `${a}~${b}`).sort().join(' ');

for (const iso of validEdgeSubsets('spectre-iso')) {
  if (!iso.edges.length) continue;
  const rule = new Set(iso.edges);
  const hexRule = new Set(iso.edges.filter((e) => e !== 7));
  const hex = options('hex', 'Gamma', hexRule);
  const g1 = options('spectre-iso', 'Gamma1', rule);
  const g2 = options('spectre-iso', 'Gamma2', rule);
  const hexKeys = hex.opts.map(norm);
  const hits = new Map<number, number>();
  let noHex = 0;
  for (const a of g1.opts) for (const b of g2.opts) {
    // Compose through the internal seam: Gamma1's '7A' meets Gamma2's '-7A'.
    const out = new Map<string, string>();
    const outer = [...g1.pts.filter((t) => t !== '7A'), ...g2.pts.filter((t) => t !== '-7A')];
    for (const t of outer) {
      let side = g1.pts.includes(t) ? a : b;
      let p = side.get(t) as string;
      if (p === '7A') p = b.get('-7A') as string;
      else if (p === '-7A') p = a.get('7A') as string;
      out.set(t, p);
    }
    if (rule.has(6) && out.get('6A') !== '-6A') { noHex++; continue; }
    out.delete('6A'); out.delete('-6A');
    const k = hexKeys.indexOf(norm(out));
    if (k < 0) noHex++;
    else hits.set(k, (hits.get(k) ?? 0) + 1);
  }
  const reach = hex.opts.map((_, k) => hits.get(k) ?? 0);
  console.log(`iso ${iso.edges.join('')} (hex ${[...hexRule].join('')}): Mystic ${g1.opts.length}x${g2.opts.length}=${g1.opts.length * g2.opts.length} pairs; hex Gamma options ${hex.opts.length}; reached per hex option [${reach.join(' ')}]; no hex equivalent: ${noHex}`);
}
