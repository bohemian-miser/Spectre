import { describe, expect, it } from 'vitest';
import { directedClasses, flowOverlay } from '../flowOverlay';
import { pointKey } from '../circuits';
import { buildSystem, flatten } from '../tiles';

const run = (family: 'hex' | 'spectre', subset: number[], level = 3) =>
  flowOverlay({ family, instances: flatten(buildSystem(family, level)['Delta']), selected: new Set(subset), matchingIndexByType: {} });

describe('flowOverlay', () => {
  it('only classes labelled both ways carry a direction', () => {
    expect([...directedClasses('spectre')].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...directedClasses('hex')].sort()).toEqual([1, 2, 3, 4, 5, 6, 8]);
  });

  it('15 is a true flow: every strand runs through, no sources or sinks', () => {
    const f = run('hex', [1, 5]);
    expect(f.chords.every((c) => c.kind === 'through')).toBe(true);
    expect(f.sources).toHaveLength(0);
    expect(f.sinks).toHaveLength(0);
    expect(f.runs.some((r) => r.closed)).toBe(true);
  });

  it('128 with every class +1 is not a flow: runs break at sources and sinks', () => {
    const f = run('hex', [1, 2, 8]);
    expect(f.sources.length).toBeGreaterThan(0);
    expect(f.sinks.length).toBeGreaterThan(0);
    // Each source sends two runs out and each sink takes two in, so in a patch they come close to even.
    expect(Math.abs(f.sources.length - f.sinks.length)).toBeLessThanOrEqual(2);
    expect(f.runs.every((r) => !r.closed)).toBe(true);
  });

  it('runs chain head to tail and cover every through strand once', () => {
    for (const subset of [[1, 5], [1, 2, 8], [2, 5, 8]]) {
      const f = run('spectre', subset);
      f.chords.forEach((c, i) => expect(c.kind !== 'through' || f.runOf[i] >= 0).toBe(true));
      const seen = new Set<number>();
      for (const r of f.runs) {
        r.chords.forEach((i, n) => {
          expect(seen.has(i)).toBe(false);
          seen.add(i);
          const next = r.chords[n + 1];
          if (next !== undefined) expect(pointKey(f.chords[i].b)).toBe(pointKey(f.chords[next].a));
        });
        if (r.closed) expect(pointKey(f.chords[r.chords[r.chords.length - 1]].b)).toBe(pointKey(f.chords[r.chords[0]].a));
      }
    }
  });

  it('class 0 strands have no direction', () => {
    const f = run('hex', [0, 1, 3, 4, 6], 2);
    expect(f.chords.some((c) => c.kind === 'neutral')).toBe(true);
  });
});
