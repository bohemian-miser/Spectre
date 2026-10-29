/**
 * The search in subtrees, against `explore` on the whole tree: walked to
 * the end within a tile limit, the records put together give the same tree,
 * landing for landing, with the same forks and the same ends. Following a
 * branch's landings from the start walks to the same end.
 */
import { describe, expect, it } from 'vitest';

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
