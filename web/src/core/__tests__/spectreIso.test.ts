/**
 * The 'spectre-iso' labels make Tile(1,1) strand-for-strand isomorphic to the
 * hexagons: same valid rules (class 7 riding along inside the Mystic), the
 * same dots in the same order on every non-Gamma tile, and — traced over a
 * real patch — the same strands through the same seams of the same tiles.
 */
import { describe, expect, it } from 'vitest';
import { connectionPoints } from '../edges';
import {
  HEX_EDGE_LABELS,
  SPECTRE_EDGE_LABELS,
  SPECTRE_ISO_EDGE_LABELS,
  type TileFamilyId,
  type TileTypeId,
} from '../families';
import { transPt } from '../geom';
import { subsetToString, validEdgeSubsets } from '../subsets';
import { buildSystem, flatten } from '../tiles';

const dotTag = (family: TileFamilyId, type: TileTypeId, sel: ReadonlySet<number>): string[] =>
  connectionPoints(family, type, sel).map(
    ({ edge }) => `${edge.sign < 0 ? '-' : ''}${edge.major}${edge.variant}`,
  );

const ALL = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);

describe("'spectre-iso' labels", () => {
  it('only touch the seam between Sigma and Gamma2', () => {
    for (const [type, labels] of Object.entries(SPECTRE_EDGE_LABELS)) {
      if (type === 'Sigma' || type === 'Gamma2') expect(SPECTRE_ISO_EDGE_LABELS[type]).not.toEqual(labels);
      else expect(SPECTRE_ISO_EDGE_LABELS[type]).toEqual(labels);
    }
  });

  it('give every non-Gamma tile the hexagon tile’s dots, in order', () => {
    for (const type of Object.keys(HEX_EDGE_LABELS) as TileTypeId[]) {
      if (type === 'Gamma') continue;
      expect(dotTag('spectre-iso', type, ALL), type).toEqual(dotTag('hex', type, ALL));
    }
    // The old labels differ on Sigma: one class-4 seam where the hexagon has a 6 and a 4.
    expect(dotTag('spectre', 'Sigma', ALL)).not.toEqual(dotTag('hex', 'Sigma', ALL));
    // The Mystic is the hexagon Gamma plus the 7 seam inside and a 6 | -6 pair side by side.
    expect(dotTag('spectre-iso', 'Gamma1', ALL)).toEqual(['-1A', '1A', '7A', '-2A']);
    expect(dotTag('spectre-iso', 'Gamma2', ALL)).toEqual(['-7A', '-3A', '6A', '-6A', '-4A', '2A']);
    expect(dotTag('hex', 'Gamma', ALL)).toEqual(['-1A', '1A', '-3A', '-4A', '2A', '-2A']);
  });

  it('have the hexagon kernel, up to class 7', () => {
    const drop7 = (s: string) => s.replace('7', '');
    const iso = validEdgeSubsets('spectre-iso').map((s) => subsetToString(s.mask));
    const hex = validEdgeSubsets('hex').map((s) => subsetToString(s.mask));
    expect(iso.map(drop7).sort()).toEqual([...hex].sort());
    expect(iso).toContain('01346'); // class 4 is usable now, as it is on hexagons
    expect(validEdgeSubsets('spectre').map((s) => subsetToString(s.mask))).not.toContain('01346');
  });

  it('trace the same strands as the hexagons over a real patch', () => {
    let seed = 12345;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const randomPairs = (items: number[]): [number, number][] => {
      const rest = [...items];
      const out: [number, number][] = [];
      while (rest.length) {
        const a = rest.shift()!;
        const b = rest.splice(rand(rest.length), 1)[0];
        out.push([a, b]);
      }
      return out;
    };

    const hexSubsets = validEdgeSubsets('hex').filter((s) => s.mask !== 0);
    const isoSubsets = validEdgeSubsets('spectre-iso');
    let compared = 0;
    for (const hs of hexSubsets) {
      const iso = isoSubsets.find((s) => (s.mask & ~(1 << 7)) === hs.mask)!;
      expect(iso, subsetToString(hs.mask)).toBeDefined();
      const hexSel = new Set(hs.edges);
      const isoSel = new Set(iso.edges);

      for (let trial = 0; trial < 4; trial++) {
        // One random pairing per hexagon type, shared by both families.
        const pairsByType = new Map<string, [number, number][]>();
        for (const type of Object.keys(HEX_EDGE_LABELS) as TileTypeId[]) {
          const n = connectionPoints('hex', type, hexSel).length;
          const idx = Array.from({ length: n }, (_, i) => i);
          let pairs = randomPairs(idx);
          if (type === 'Gamma') {
            // The Mystic can pass one strand between its halves (the 7 seam).
            const tags = dotTag('hex', 'Gamma', hexSel);
            const g1 = (i: number) => ['-1A', '1A', '-2A'].includes(tags[i]);
            while (pairs.filter(([a, b]) => g1(a) !== g1(b)).length > 1) pairs = randomPairs(idx);
          }
          pairsByType.set(type, pairs);
        }

        const hex = strands('hex', hexSel, (type, tags) =>
          pairsByType.get(type)!.map(([a, b]) => [tags[a], tags[b]]),
        );
        const spectre = strands('spectre-iso', isoSel, (type) => {
          if (type !== 'Gamma1' && type !== 'Gamma2') return pairsByType.get(type)!.map(([a, b]) => {
            const tags = dotTag('hex', type, hexSel);
            return [tags[a], tags[b]];
          });
          // Split the hexagon Gamma's pairing across the two halves.
          const tags = dotTag('hex', 'Gamma', hexSel);
          const inG1 = (t: string) => ['-1A', '1A', '-2A'].includes(t);
          const out: [string, string][] = [];
          for (const [a, b] of pairsByType.get('Gamma')!) {
            const [ta, tb] = [tags[a], tags[b]];
            if (inG1(ta) === inG1(tb)) {
              if (inG1(ta) === (type === 'Gamma1')) out.push([ta, tb]);
            } else {
              const mine = inG1(ta) === (type === 'Gamma1') ? ta : tb;
              out.push([mine, type === 'Gamma1' ? '7A' : '-7A']);
            }
          }
          if (type === 'Gamma2' && isoSel.has(6)) out.push(['6A', '-6A']); // the Delta–Sigma bridge
          return out;
        });
        expect(spectre, `${subsetToString(hs.mask)} trial ${trial}`).toEqual(hex);
        compared += hex.length;
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });
});

/**
 * Every strand of a level-3 Delta patch as a sorted list of the dots it
 * passes through (`tile id:seam`), plus whether it closes. The Mystic's two
 * halves count as one tile, and its internal dots (the 7 seam, and the 6 | -6
 * bridge) are left out, so a spectre strand reads like a hexagon strand.
 */
function strands(
  family: TileFamilyId,
  sel: ReadonlySet<number>,
  pairsFor: (type: TileTypeId, tags: string[]) => (readonly [string, string])[],
): string[] {
  const insts = flatten(buildSystem(family, 3)['Delta']);
  const parent: number[] = [];
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const chordOfPoint = new Map<string, number[]>();
  const chordDots: string[][] = [];
  for (const inst of insts) {
    const cps = connectionPoints(family, inst.type, sel);
    if (!cps.length) continue;
    const tags = cps.map(({ edge }) => `${edge.sign < 0 ? '-' : ''}${edge.major}${edge.variant}`);
    const gamma = inst.type === 'Gamma1' || inst.type === 'Gamma2';
    const tile = gamma ? inst.id.replace(/\.[01]$/, '') : inst.id;
    for (const [ta, tb] of pairsFor(inst.type, tags)) {
      const c = chordDots.length;
      parent.push(c);
      const dots: string[] = [];
      for (const t of [ta, tb]) {
        const i = tags.indexOf(t);
        expect(i, `${inst.type} has no ${t} dot`).toBeGreaterThanOrEqual(0);
        const p = transPt(inst.xform, cps[i].pt);
        const key = `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`; // no '-0.000'
        const list = chordOfPoint.get(key) ?? [];
        list.push(c);
        chordOfPoint.set(key, list);
        const internal = gamma && (/7/.test(t) || (inst.type === 'Gamma2' && /^-?6/.test(t)));
        if (!internal) dots.push(`${tile}:${t}`);
      }
      chordDots.push(dots);
    }
  }
  const ends = new Map<number, number>();
  for (const list of chordOfPoint.values()) {
    expect(list.length).toBeLessThanOrEqual(2); // no junctions
    if (list.length === 2) parent[find(list[0])] = find(list[1]);
    else ends.set(list[0], (ends.get(list[0]) ?? 0) + 1);
  }
  const byRoot = new Map<number, { dots: string[]; open: boolean }>();
  chordDots.forEach((dots, c) => {
    const r = find(c);
    const s = byRoot.get(r) ?? { dots: [], open: false };
    s.dots.push(...dots);
    if (ends.has(c)) s.open = true;
    byRoot.set(r, s);
  });
  return [...byRoot.values()]
    .map((s) => `${s.open ? 'open' : 'closed'} ${s.dots.sort().join(' ')}`)
    .sort();
}
