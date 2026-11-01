/**
 * Shared ancestry (`ancestry.ts`) against the slot paths `pathFromAncestor`
 * spells out: two tiles' shared level is the root level less the length of
 * their paths' common prefix, on real ids from an infinite-plane cut.
 */
import { describe, expect, it } from 'vitest';
import { createUnrootedEngine } from '../../../core';
import { pathFromAncestor } from '../../explorer/xray';
import { levelCss, levelOfFrom, levelRgb, parseTileId, sharedLevel } from '../ancestry';

describe('shared ancestry', () => {
  const engine = createUnrootedEngine(7, 'hex');
  const cut = engine.query({ cx: 300, cy: -120, halfW: 60, halfH: 60 }, 100000, { emitIds: true });
  const ids = cut.ids!;
  const ROOT = 24;
  engine.ensureLevel(ROOT);
  const chain = engine.chain();

  const viaPaths = (a: string, b: string): number => {
    const pa = pathFromAncestor(chain, ROOT, a)!.split('.');
    const pb = pathFromAncestor(chain, ROOT, b)!.split('.');
    let k = 0;
    while (k < pa.length && pa[k] === pb[k]) k++;
    return ROOT - k;
  };

  it('agrees with the common prefix of the slot paths, for every pair of a sample', () => {
    expect(ids.length).toBeGreaterThan(1000);
    const sample = ids.filter((_, i) => i % 97 === 0);
    let pairs = 0;
    const seen = new Set<number>();
    for (const a of sample) {
      for (const b of sample) {
        const got = sharedLevel(parseTileId(a)!, parseTileId(b)!, chain);
        expect(got).toBe(viaPaths(a, b));
        seen.add(got);
        pairs++;
      }
    }
    expect(pairs).toBeGreaterThan(100);
    expect(seen.has(0)).toBe(true);
    expect(Math.max(...seen)).toBeGreaterThan(3);
    // From a tile in the middle of the cut, its level-1 and level-2
    // supertiles are whole in the cut: every low level is met.
    let mid = 0;
    for (let i = 1; i < cut.count; i++) {
      if (Math.hypot(cut.pos[2 * i], cut.pos[2 * i + 1]) < Math.hypot(cut.pos[2 * mid], cut.pos[2 * mid + 1])) mid = i;
    }
    const fromMid = new Set<number>();
    for (const b of ids) fromMid.add(sharedLevel(parseTileId(ids[mid])!, parseTileId(b)!, chain));
    for (const level of [0, 1, 2, 3]) expect(fromMid.has(level), `level ${level} from the middle tile`).toBe(true);
  });

  it('reads the same levels through the engine-backed function, and -1 for what it cannot read', () => {
    const start = ids[0];
    const levelOf = levelOfFrom(engine, start);
    for (let i = 0; i < ids.length; i += 50) expect(levelOf(ids[i])).toBe(viaPaths(start, ids[i]));
    expect(levelOf(start)).toBe(0);
    expect(levelOf(undefined)).toBe(-1);
    expect(levelOf('not an id')).toBe(-1);
  });

  it('inks levels apart and the unknown grey', () => {
    const inks = new Set<string>();
    for (let level = 0; level <= 12; level++) inks.add(levelCss(level));
    expect(inks.size).toBe(13);
    expect(levelRgb(-1)).toEqual([0.5, 0.5, 0.5]);
    for (const c of levelRgb(5)) expect(c).toBeGreaterThanOrEqual(0);
  });
});
