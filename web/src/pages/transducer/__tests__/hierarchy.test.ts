/**
 * The hierarchy builder's model. Scenes are checked against geometry worked
 * out a second way: each supertile's outline from its own tiles (edges that
 * occur once), the far tile against the crossed edge by position, and band
 * sizes against the supertiles themselves.
 */
import { describe, expect, it } from 'vitest';

import { buildSystem, flatten, type HexType, type Link } from '../../../core';
import { MAX_BUILD_LEVEL, chainOf, crossingAt, initialBuild, optionsAt, reduceBuild, sceneOf, type Seg } from '../hierarchy';

const key = (s: Seg): string => `${Math.round((s.x1 + s.x2) * 5000)},${Math.round((s.y1 + s.y2) * 5000)}`;
const keys = (segs: readonly Seg[]): string[] => segs.map(key).sort();

function checkScene(start: HexType, edge: number, chain: Link[]): void {
  const s = sceneOf(start, edge, chain);
  const L = chain.length;
  const startIds = [...chain].reverse().map((l) => l.slot);
  for (let k = 1; k <= L; k++) {
    // the level-k supertile is the tiles under the first L−k slots of the start tile's path
    const prefix = startIds.slice(0, L - k).join('.');
    const inside = s.tiles.filter((t) => prefix === '' || t.id === prefix || t.id.startsWith(prefix + '.'));
    const count = new Map<string, { n: number; seg: Seg }>();
    for (const t of inside) for (let e = 0; e < 6; e++) {
      const a = t.pts[e], b = t.pts[(e + 1) % 6];
      const seg = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      const c = count.get(key(seg));
      if (c) c.n++;
      else count.set(key(seg), { n: 1, seg });
    }
    expect(keys(s.outlines[k - 1]), `outline of level ${k}`).toEqual(keys([...count.values()].filter((c) => c.n === 1).map((c) => c.seg)));
    // its tiles are the ones in bands 0..k, and there are as many as the supertile has
    const type = chain[k - 1].parent;
    expect(s.tiles.filter((t) => t.band <= k)).toHaveLength(flatten(buildSystem('hex', k)[type]).length);
    expect(inside.length).toBe(s.tiles.filter((t) => t.band <= k).length);
  }
  const crossed = key(s.crossed);
  if (s.landed) {
    // the far tile is the one whose edge sits on the crossed edge
    const sharing = s.tiles.filter((t) => t.id !== s.startId && t.pts.some((a, i) => key({ x1: a.x, y1: a.y, x2: t.pts[(i + 1) % 6].x, y2: t.pts[(i + 1) % 6].y }) === crossed));
    expect(sharing.map((t) => t.id)).toEqual([s.landed.farId]);
    const far = sharing[0];
    const fe = s.landed.farEdge;
    expect(key({ x1: far.pts[fe].x, y1: far.pts[fe].y, x2: far.pts[(fe + 1) % 6].x, y2: far.pts[(fe + 1) % 6].y })).toBe(crossed);
    expect(keys(s.landed.wall)).toContain(crossed);
    for (let k = 1; k < s.landed.meet; k++) expect(keys(s.landed.farOutlines[k - 1])).toContain(crossed);
  } else {
    // no tile is across the edge yet: it is on every outline
    for (let k = 1; k <= L; k++) expect(keys(s.outlines[k - 1])).toContain(crossed);
    expect(s.tiles.some((t) => t.id !== s.startId && t.pts.some((a, i) => key({ x1: a.x, y1: a.y, x2: t.pts[(i + 1) % 6].x, y2: t.pts[(i + 1) % 6].y }) === crossed))).toBe(false);
  }
}

describe('sceneOf', () => {
  it('the Gamma wall: three Gammas keep edge 0 outside, then a Delta and a Gamma land it on a Pi', () => {
    const g7: Link = { slot: 7, parent: 'Gamma' };
    for (let n = 0; n <= 3; n++) {
      const s = sceneOf('Gamma', 0, Array(n).fill(g7));
      expect(s.landed).toBeNull();
    }
    const s = sceneOf('Gamma', 0, [g7, g7, g7, { slot: 7, parent: 'Delta' }, { slot: 1, parent: 'Gamma' }]);
    expect(s.landed).toMatchObject({ farType: 'Pi', farEdge: 3, meet: 5 });
    checkScene('Gamma', 0, [g7, g7, { slot: 7, parent: 'Delta' }, { slot: 1, parent: 'Gamma' }]);
  });

  it('random chains agree with the geometry', () => {
    let seed = 11;
    const r = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const types: HexType[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
    let landed = 0;
    for (let run = 0; run < 40; run++) {
      const start = types[Math.floor(r() * types.length)];
      let b = initialBuild(start, Math.floor(r() * 6));
      const depth = 1 + Math.floor(r() * 4);
      for (let d = 0; d < depth; d++) {
        const opts = optionsAt(b, b.current);
        if (!opts.length) break;
        const o = opts[Math.floor(r() * opts.length)];
        b = reduceBuild(b, { type: 'choose', link: { slot: o.slot, parent: o.parent } });
      }
      checkScene(b.start, b.edge, chainOf(b, b.current));
      if (crossingAt(b, b.current).ok) landed++;
    }
    expect(landed).toBeGreaterThan(5);
  }, 60_000);
});

describe('the tree of choices', () => {
  const g7 = { slot: 7, parent: 'Gamma' as HexType };
  it('choosing the same parent twice from one node does not add a branch; a different one does', () => {
    let b = initialBuild('Gamma', 0);
    b = reduceBuild(b, { type: 'choose', link: g7 });
    b = reduceBuild(b, { type: 'up' });
    b = reduceBuild(b, { type: 'choose', link: g7 });
    expect(b.nodes).toHaveLength(2);
    b = reduceBuild(b, { type: 'goto', id: 0 });
    const other = optionsAt(b, 0).find((o) => o.parent !== 'Gamma')!;
    b = reduceBuild(b, { type: 'choose', link: { slot: other.slot, parent: other.parent } });
    expect(b.nodes).toHaveLength(3);
    expect(b.nodes[0].children).toEqual([1, 2]);
    expect(chainOf(b, 1)).toEqual([g7]);
  });

  it('a parent that cannot hold the supertile is refused; nothing is offered once the crossing lands or at the cap', () => {
    let b = initialBuild('Gamma', 0);
    expect(reduceBuild(b, { type: 'choose', link: { slot: 0, parent: 'Psi' } })).toBe(b);
    for (let i = 0; i < MAX_BUILD_LEVEL; i++) b = reduceBuild(b, { type: 'choose', link: g7 });
    expect(chainOf(b, b.current)).toHaveLength(MAX_BUILD_LEVEL);
    expect(optionsAt(b, b.current)).toEqual([]);
    let c = initialBuild('Pi', 0);
    c = reduceBuild(c, { type: 'choose', link: { slot: 0, parent: 'Gamma' } });
    expect(crossingAt(c, c.current).ok).toBe(true);
    expect(optionsAt(c, c.current)).toEqual([]);
  });

  it('changing the edge keeps the tree; changing the start type clears it', () => {
    let b = reduceBuild(initialBuild('Gamma', 0), { type: 'choose', link: g7 });
    b = reduceBuild(b, { type: 'edge', edge: 3 });
    expect(b.nodes).toHaveLength(2);
    expect(b.edge).toBe(3);
    b = reduceBuild(b, { type: 'start', start: 'Delta' });
    expect(b.nodes).toHaveLength(1);
    expect(b.start).toBe('Delta');
  });
});
