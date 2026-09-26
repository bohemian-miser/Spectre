/**
 * A hexagon rule drawn on 'spectre-iso' tiles with the Mystic as one tile
 * (`hexRuleSpectreChords`) traces exactly the hexagons' strands — for EVERY
 * hexagon Gamma pairing, including the ones that send several strands across
 * the Mystic's middle, which per-half matchings cannot do.
 */
import { describe, expect, it } from 'vitest';
import type { Segment } from '../circuits';
import { connectionPoints } from '../edges';
import { HEX_LEAF_ORDER, type TileFamilyId, type TileTypeId } from '../families';
import { transPt, type Pt } from '../geom';
import { hexRuleSpectreChords, mysticChords } from '../hexRule';
import { enumerateMatchings, matchingCount, nonCrossingForTile, segmentsCross } from '../matchings';
import { subsetToString, validEdgeSubsets } from '../subsets';
import { buildSystem, flatten } from '../tiles';
import { runAnalysis } from '../analysis-request';

const LEVEL = 3;

describe('hexRuleSpectreChords', () => {
  it('traces the hexagon strands for every valid rule and every Gamma pairing', () => {
    let seed = 777;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    let compared = 0;
    for (const vs of validEdgeSubsets('hex')) {
      if (vs.mask === 0) continue;
      const sel = new Set(vs.edges);
      const gammaCount = matchingCount(connectionPoints('hex', 'Gamma', sel).length);
      for (let g = 0; g < gammaCount; g++) {
        const record: Record<string, number> = {};
        for (const type of HEX_LEAF_ORDER) {
          record[type] = rand(Math.max(1, matchingCount(connectionPoints('hex', type, sel).length)));
        }
        record.Gamma = g;
        const hex = strands('hex', perType('hex', sel, record));
        const spectre = strands('spectre-iso', hexRuleSpectreChords(sel, record));
        expect(spectre, `${subsetToString(vs.mask)} Gamma ${g}`).toEqual(hex);
        compared += hex.length;
      }
    }
    expect(compared).toBeGreaterThan(2000);
  });

  it('gives the hexagons\' circuit and tail lengths through runAnalysis', () => {
    let seed = 99;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (const vs of validEdgeSubsets('hex')) {
      if (vs.mask === 0) continue;
      const sel = new Set(vs.edges);
      for (let trial = 0; trial < 3; trial++) {
        const record = Object.fromEntries(
          HEX_LEAF_ORDER.map((t) => [t, rand(Math.max(1, matchingCount(connectionPoints('hex', t, sel).length)))]),
        );
        const base = { rootTile: 'Delta' as TileTypeId, level: LEVEL, subset: vs.edges, matchingIndexByType: record };
        const hex = runAnalysis({ id: 1, family: 'hex', ...base });
        const spectre = runAnalysis({ id: 2, family: 'spectre-iso', hexRule: true, ...base });
        const label = `${subsetToString(vs.mask)} ${JSON.stringify(record)}`;
        expect(spectre.circuitSummary, label).toEqual(hex.circuitSummary);
        expect(spectre.tailSummary, label).toEqual(hex.tailSummary);
        expect(spectre.junctionCount).toBe(0);
      }
    }
  });

  it('keeps a non-crossing hexagon Gamma pairing non-crossing on the Mystic', () => {
    const sel = new Set([0, 1, 2, 3, 4, 5, 6, 8]);
    for (const g of nonCrossingForTile('hex', 'Gamma', sel)) {
      const { Gamma1, Gamma2 } = mysticChords(sel, g);
      for (const half of [Gamma1, Gamma2]) {
        for (let i = 0; i < half.length; i++) {
          for (let j = i + 1; j < half.length; j++) {
            expect(segmentsCross(half[i][0], half[i][1], half[j][0], half[j][1]), `Gamma ${g}`).toBe(false);
          }
        }
      }
    }
  });

  it('can send three strands across the Mystic, which per-half matchings cannot', () => {
    const sel = new Set([0, 1, 2, 3, 4, 5, 6, 8]);
    const tags = connectionPoints('hex', 'Gamma', sel).map((c) => `${c.edge.sign < 0 ? '-' : ''}${c.edge.major}`);
    const g1 = (i: number) => ['-1', '1', '-2'].includes(tags[i]);
    const g = enumerateMatchings(tags.length).findIndex((m) => m.every(([a, b]) => g1(a) !== g1(b)));
    expect(mysticChords(sel, g).Gamma1).toHaveLength(3);
  });
});

function perType(family: TileFamilyId, sel: ReadonlySet<number>, record: Record<string, number>) {
  const out: Record<string, Segment[]> = {};
  for (const type of HEX_LEAF_ORDER) {
    const pts = connectionPoints(family, type, sel).map((c) => c.pt);
    const m = pts.length >= 2 && pts.length % 2 === 0 ? enumerateMatchings(pts.length)[record[type]] : [];
    out[type] = m.map(([a, b]) => [pts[a], pts[b]]);
  }
  return out;
}

/**
 * Strands of a level-3 Delta patch as sorted `tile:seam` dot lists. Chord
 * ends that are not a dot of their tile (the Mystic's internal crossings) are
 * left out, and the Mystic's halves count as one tile.
 */
function strands(family: TileFamilyId, chords: Readonly<Record<string, readonly Segment[]>>): string[] {
  const sel = new Set([0, 1, 2, 3, 4, 5, 6, 8]);
  const insts = flatten(buildSystem(family, LEVEL)['Delta']);
  const parent: number[] = [];
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const at = new Map<string, number[]>();
  const dotsOf: string[][] = [];
  for (const inst of insts) {
    const dots = connectionPoints(family, inst.type, sel);
    const tile = inst.type.startsWith('Gamma') && family !== 'hex' ? inst.id.replace(/\.[01]$/, '') : inst.id;
    const tagAt = (p: Pt) => {
      const d = dots.find((c) => Math.hypot(c.pt.x - p.x, c.pt.y - p.y) < 1e-9);
      if (!d) return null;
      const t = `${d.edge.sign < 0 ? '-' : ''}${d.edge.major}${d.edge.variant}`;
      return inst.type === 'Gamma2' && /^-?6/.test(t) ? null : t; // the bridge
    };
    for (const seg of chords[inst.type] ?? []) {
      const c = dotsOf.length;
      parent.push(c);
      const tags: string[] = [];
      for (const p of seg) {
        const w = transPt(inst.xform, p);
        const key = `${Math.round(w.x * 1000)},${Math.round(w.y * 1000)}`;
        at.set(key, [...(at.get(key) ?? []), c]);
        const t = tagAt(p);
        if (t) tags.push(`${tile}:${t}`);
      }
      dotsOf.push(tags);
    }
  }
  const open = new Set<number>();
  for (const list of at.values()) {
    expect(list.length).toBeLessThanOrEqual(2);
    if (list.length === 2) parent[find(list[0])] = find(list[1]);
    else open.add(list[0]);
  }
  const byRoot = new Map<number, { dots: string[]; open: boolean }>();
  dotsOf.forEach((tags, c) => {
    const s = byRoot.get(find(c)) ?? { dots: [], open: false };
    s.dots.push(...tags);
    if (open.has(c)) s.open = true;
    byRoot.set(find(c), s);
  });
  return [...byRoot.values()].map((s) => `${s.open ? 'open' : 'closed'} ${s.dots.sort().join(' ')}`).sort();
}
