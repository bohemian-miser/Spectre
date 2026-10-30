/**
 * Where the circuits the search finds first close: each circuit the walker
 * finds for 023468 140000001 up to 5,000 tiles closes in some supertile,
 * at the lowest level and with the family that the build-up's table of
 * closings (`closingsByLevel`) gives it, and the worker's job says the same.
 */
import { describe, expect, it } from 'vitest';

import { closingsByLevel, firstClosings } from '../../buildup/buildup';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { ClosingsJob } from '../../../workers/closingsClient';
import { FRESH } from '../canon';
import { foundIn } from '../circuits';
import { makeWalker, startWalk } from '../possible';
import { SearchTreeData, Subtrees, branchOf } from '../search';
import { patternOf } from '../walk';

const subset = [0, 2, 3, 4, 6, 8];
const combo = '140000001';
const digits = [...combo].map((c) => parseInt(c, 36));

describe('where the circuits found first close', () => {
  const wk = makeWalker(patternOf(subset, combo), 'Xi', 2, 5);
  const sub = new Subtrees(wk, 'w0', 5000);
  sub.add([branchOf('0', startWalk(wk).stage, FRESH)]);
  const data = new SearchTreeData();
  while (sub.waiting > 0) data.put(sub.run(1000));
  const found = foundIn(data.nodes).map((f) => ({ key: f.key, length: f.tiles }));

  it('gives every circuit up to 5,000 tiles the level and family the build-up gives it', () => {
    const got = firstClosings(new CircuitShapes('hex', subset, digits, 0, 1, false), found, 8);
    expect(found.length).toBeGreaterThan(4);
    expect([...got.keys()].sort()).toEqual(found.map((f) => f.key).sort());
    const top = Math.max(...[...got.values()].map((c) => c.level));
    const table = closingsByLevel(new CircuitShapes('hex', subset, digits, top, 1, true));
    for (const f of found) {
      const c = got.get(f.key)!;
      const there = table[c.level].find((x) => x.key === f.key);
      expect(there?.first).toBe(c.level);
      expect(there?.family).toBe(c.family);
      expect(there?.length).toBe(f.length);
    }
  }, 120000);

  it('leaves out a circuit that does not close by the level asked', () => {
    const job = new ClosingsJob();
    const answers = new Map(job.answer({ subset, combo, circuits: found, upTo: 8 }));
    const longest = found.reduce((a, b) => (b.length > a.length ? b : a));
    const level = answers.get(longest.key)!.level;
    expect(level).toBeGreaterThan(0);
    expect(new Map(job.answer({ subset, combo, circuits: [longest], upTo: level - 1 })).get(longest.key)).toBeNull();
  }, 120000);
});
