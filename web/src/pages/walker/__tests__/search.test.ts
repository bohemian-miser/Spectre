/**
 * The search in subtrees, against `explore` on the whole tree: walked to
 * the end within a tile limit, the records put together give the same tree,
 * landing for landing, with the same forks and the same ends. Following a
 * branch's landings from the start walks to the same end. Cutting branches
 * that are not a circuit's first reading keeps every circuit the whole tree
 * closes on, each on one branch, and finds the circuits the circuit index
 * lists.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { FRESH } from '../canon';

import { circuitKey } from '../circuits';
import { explore, makeWalker, reducePossible, startWalk, type PossibleWalk } from '../possible';
import { SearchTreeData, Subtrees } from '../search';
import { patternOf } from '../walk';

const triangle = patternOf([0, 2, 3, 4, 6, 8], '000100000');

/** Each node of a tree by the landings to it: where its branch forks (the landings offered) or how it ends. */
function byPath(nodes: readonly { parent: number | null; key: string | null; fork?: { options: readonly { key: string }[] } | null; end?: { status: string; seen?: readonly { type: string }[] } }[], tilesOf: (i: number) => number) {
  const path = (i: number): string => (nodes[i].parent === null ? '' : `${path(nodes[i].parent!)}/${nodes[i].key}`);
  return new Map(nodes.map((n, i) => [path(i), n.fork ? `fork ${n.fork.options.map((o) => o.key).join(',')} at ${tilesOf(i)}` : n.end ? `${n.end.status} ${tilesOf(i)}${n.end.status === 'closed' ? ` ${circuitKey(n.end.seen as never)}` : ''}` : 'waiting']));
}

describe('the search in subtrees', () => {
  it('walks the tree explore walks, and a branch is walked again by its landings', () => {
    const wk = makeWalker(triangle, 'Delta', 0, 5);
    const pw = startWalk(wk);
    const sub = new Subtrees(wk, 'w0', 400);
    sub.add([{ handle: '0', stage: pw.stage }]);
    const data = new SearchTreeData();
    while (sub.waiting > 0) data.put(sub.run(1000));
    const ex = explore(pw, { forks: Infinity, tiles: 400 }).pw;
    const exTiles = (i: number): number => (ex.nodes[i].end ?? ex.nodes[i].stage).seen.length;
    const viaFork = (i: number): number => ex.nodes[ex.nodes[i].children[0]].stage.seen.length - 1;
    const want = byPath(ex.nodes, (i) => (ex.nodes[i].fork ? viaFork(i) : exTiles(i)));
    const got = byPath(data.nodes, (i) => data.nodes[i].tiles!);
    expect(data.nodes.length).toBeGreaterThan(20);
    expect(got).toEqual(want);
    // a closed branch, walked again from the start by its landings
    const closed = data.nodes.find((n) => n.end?.status === 'closed')!;
    const again: PossibleWalk = reducePossible(pw, { type: 'follow', keys: data.keysTo(closed.id), cap: 100000 });
    expect(again.stage.status).toBe('closed');
    expect(circuitKey(again.stage.seen)).toBe(circuitKey(closed.end!.seen!));
  }, 60000);
});

describe('one branch per circuit', () => {
  const walkAll = (wk: ReturnType<typeof makeWalker>, tiles: number, oneReading: boolean) => {
    const sub = new Subtrees(wk, 'w0', tiles);
    sub.add([{ handle: '0', stage: startWalk(wk).stage, ...(oneReading ? { reading: FRESH } : {}) }]);
    const data = new SearchTreeData();
    while (sub.waiting > 0) data.put(sub.run(1000));
    const closed = data.nodes.filter((n) => n.end?.status === 'closed').map((n) => circuitKey(n.end!.seen!));
    return { data, closed };
  };

  it('closes on every circuit the whole tree closes on, each by one branch', () => {
    const wk = makeWalker(triangle, 'Delta', 0, 5);
    const all = walkAll(wk, 400, false);
    const one = walkAll(wk, 400, true);
    expect(new Set(all.closed).size).toBeGreaterThan(2);
    expect(all.closed.length).toBeGreaterThan(new Set(all.closed).size);
    expect(one.closed.sort()).toEqual([...new Set(all.closed)].sort());
    expect(one.data.nodes.length).toBeLessThan(all.data.nodes.length);
  }, 60000);

  it('finds the circuits the circuit index lists for 023468 140000001, up to 5,000 tiles', () => {
    const index = JSON.parse(readFileSync(resolve(__dirname, '../../../../public/data/corners/hex-023468/140000001.json'), 'utf8')) as { circuits: { length: number }[] };
    const wk = makeWalker(patternOf([0, 2, 3, 4, 6, 8], '140000001'), 'Xi', 2, 5);
    const one = walkAll(wk, 5000, true);
    const lengths = one.closed.map((k) => k.split(' ').length).sort((a, b) => a - b);
    expect(lengths).toEqual(index.circuits.map((c) => c.length).filter((n) => n <= 5000).sort((a, b) => a - b));
  }, 120000);
});
