/**
 * The circuit index against independent sources: the board tracer against
 * `walkStrand` and against the walk on every tiling at once; the word keys
 * against brute force; the placed-tile key against moving the tiles.
 */
import { describe, expect, it } from 'vitest';

import { HEX_TYPES, addressFromId, walkStrand, zMul, type ZAffine } from '../../src/core';
import { longestCircuit, matchingByType, pairingTable, patternOf } from '../../src/pages/walker/walk';
import { addressOf, board, indexOf, traceAll } from '../board';
import { collect, copyTile, cornerChains, measure } from '../circuits';
import { enumerateCircuits } from '../every-tiling';
import { initialWorlds, makeWalker, stepAll, type World } from '../../src/pages/walker/possible';
import { idOf } from '../../src/core/transducer';
import { TYPE_PREFIX, canonicalWord, circuitKey, leastRotation, placedKey, placedOf, reverseWord, tileLetter, tileSetKey, wordOrder } from '../keys';
import { encode, fitCorners, levenshtein } from '../sides';
import { count, enumerateCircuits as enumerateOnGraph, startBundle, stepBundle, worldsOf, type Bundle } from '../stack-graph';

const triangle = patternOf([0, 2, 3, 4, 6, 8], '111000100');

describe('boards', () => {
  it('numbers tiles so that index and address agree', () => {
    const b = board('Sigma', 3);
    for (let i = 0; i < b.n; i++) expect(indexOf(b, addressOf(b, i))).toBe(i);
  });

  it('glues each edge to the edge that glues back', () => {
    const b = board('Delta', 4);
    for (let k = 0; k < b.across.length; k++) if (b.across[k] >= 0) expect(b.across[b.across[k]]).toBe(k);
  });

  it('traces the longest circuit walkStrand finds, at the same length', () => {
    const best = longestCircuit(triangle, 'Delta', 4)!;
    const traced = traceAll(board('Delta', 4), pairingTable(triangle)).filter((s) => s.kind === 'circuit');
    expect(Math.max(...traced.map((s) => s.tiles.length))).toBe(best.length);
    const w = walkStrand([0, 2, 3, 4, 6, 8], Object.fromEntries(matchingByType(triangle)), { address: addressFromId('Delta', best.id), entry: best.edge });
    expect(w.states).toHaveLength(best.length);
  });
});

describe('every stack the walk on every tiling carries', () => {
  it.each([['15', '000000000'], ['023468', '111000100']] as const)('%s-%s: is a tile of a board, and steps where that tile does', (rule, combo) => {
    const p = patternOf([...rule].map(Number), combo);
    const table = pairingTable(p);
    let checked = 0;
    for (const [start, edge] of [['Psi', 0], ['Delta', [...(table.get('Delta')?.keys() ?? [])][0]]] as const) {
      if (edge === undefined) continue;
      const wk = makeWalker(p, start, edge, 3, false);
      let live: World[][] = [initialWorlds(wk)];
      for (let step = 0; step < 12 && live.length; step++) {
        const next: World[][] = [];
        for (const worlds of live) {
          for (const o of stepAll(wk, worlds).outcomes) {
            if (o.key === 'open') continue;
            for (const w of o.worlds) {
              // The stack w.chain, with the strand having stepped from `before` to `w.at`.
              const before = [...worlds].sort((x, y) => y.chain.length - x.chain.length).find((x) => x.chain.length <= w.chain.length && x.chain.every((l, i) => l.slot === w.chain[i].slot && l.parent === w.chain[i].parent))!;
              const b = board(w.chain.length ? w.chain[w.chain.length - 1].parent : start, w.chain.length);
              const from = indexOf(b, { leaf: before.at.leaf, path: [...before.at.path, ...w.chain.slice(before.chain.length)] });
              const exit = wk.table.get(before.at.leaf)!.get(before.entry)!;
              const to = b.across[6 * from + exit];
              expect(idOf(addressOf(b, (to / 6) | 0))).toBe(idOf(w.at));
              expect(to % 6).toBe(w.entry);
              checked++;
            }
            if (o.key !== 'closes') next.push([...o.worlds]);
          }
        }
        live = next;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('the walk with bundles kept as merged graphs', () => {
  const worldKey = (w: World): string =>
    `${w.chain.map((l) => `${l.parent}:${l.slot}`).join(' ')}|${w.at.leaf} ${w.entry}|${w.at.path.map((l) => `${l.parent}:${l.slot}`).join(' ')}`;

  it.each([['15', '000010010', 4], ['023468', '111000100', 4]] as const)(
    '%s-%s, at most %i levels: every step holds the same worlds as the list walk, grouped the same way',
    (rule, combo, level) => {
      const p = patternOf([...rule].map(Number), combo);
      const table = pairingTable(p);
      let compared = 0;
      for (const t of HEX_TYPES) for (const e of table.get(t)?.keys() ?? []) {
        const wk = makeWalker(p, t, e, level, false);
        const gw = { start: t, startEdge: e, maxLevel: level, table };
        let live: [World[], Bundle][] = [[initialWorlds(wk), startBundle(gw)]];
        for (let step = 0; step < 8 && live.length; step++) {
          const next: [World[], Bundle][] = [];
          for (const [worlds, bundle] of live) {
            const listed = stepAll(wk, worlds).outcomes;
            const merged = stepBundle(gw, bundle);
            expect(merged.map((o) => o.key).sort()).toEqual(listed.map((o) => o.key).sort());
            for (const o of listed) {
              if (o.key === 'open') continue;
              const g = merged.find((x) => x.key === o.key)!.bundle!;
              expect(count(g.graph)).toBe(o.worlds.length);
              expect(new Set(worldsOf(g).map(worldKey))).toEqual(new Set(o.worlds.map(worldKey)));
              compared++;
              if (o.key !== 'closes') next.push([[...o.worlds], g]);
            }
          }
          live = next;
        }
      }
      expect(compared).toBeGreaterThan(100);
    },
  );

  it.each([['15', '000000000', 4], ['15', '000010010', 4], ['023468', '111000100', 4]] as const)(
    '%s-%s to level %i: the same circuits as the boards, born at the same level',
    (rule, combo, level) => {
      const sub = [...rule].map(Number);
      const onGraph = enumerateOnGraph(pairingTable(patternOf(sub, combo)), { maxLevel: level, maxLength: 10000, maxCircuits: 1e9 }, tileLetter, circuitKey);
      const onBoards = collect(sub, combo, level, 1e9);
      const byKey = (cs: readonly { key: string; level: number }[]) => new Map(cs.map((c) => [c.key, c.level]));
      expect(byKey(onGraph.circuits)).toEqual(byKey(onBoards.circuits));
    },
    // The 023468 case walks open strands to 10,000 tiles: about 4 s here, longer on CI.
    60_000,
  );
});

describe('every circuit of a combination', () => {
  it.each([['15', '000010010', 4], ['023468', '111000100', 3], ['023468', '000100000', 3]] as const)(
    '%s-%s to level %i: the same circuits as the walk on every tiling, born at the same level',
    (rule, combo, level) => {
      const sub = [...rule].map(Number);
      const p = patternOf(sub, combo);
      const walked = enumerateCircuits(p, pairingTable(p), { maxLevel: level, maxLength: 10000, maxCircuits: 1e9, maxWorlds: 1e7 });
      const traced = collect(sub, combo, level, 1e9);
      const byKey = (cs: readonly { key: string; level: number }[]) => new Map(cs.map((c) => [c.key, c.level]));
      expect(byKey(walked.circuits)).toEqual(byKey(traced.circuits));
      expect(traced.circuits.length).toBeGreaterThan(0);
    },
  );
});

describe('word keys', () => {
  const words = Array.from({ length: 200 }, (_, s) => {
    let x = s * 7919 + 13;
    const n = 1 + (s % 17);
    return Array.from({ length: n }, () => { x = (x * 1103515245 + 12345) % 2147483648; return ['Pi01', 'Psi45', 'Xi10', 'Delta23'][x % (2 + (s % 3))]; });
  });

  it('finds the least rotation', () => {
    for (const w of words) {
      const all = w.map((_, i) => [...w.slice(i), ...w.slice(0, i)].join('|')).sort();
      const k = leastRotation(w);
      expect([...w.slice(k), ...w.slice(0, k)].join('|')).toBe(all[0]);
    }
  });

  it('gives one key to every rotation and both directions', () => {
    for (const w of words) {
      const key = circuitKey(w);
      for (let i = 0; i < w.length; i++) {
        const r = [...w.slice(i), ...w.slice(0, i)];
        expect(circuitKey(r)).toBe(key);
        expect(circuitKey(reverseWord(r))).toBe(key);
      }
    }
  });

  it('counts how often a word repeats', () => {
    for (const w of words) {
      const n = w.length;
      let order = 1;
      for (let r = n; r > 1; r--) if (n % r === 0 && w.every((l, i) => l === w[(i + n / r) % n])) { order = r; break; }
      expect(wordOrder(w)).toBe(order);
    }
  });

  it('maps canonical positions back to the walked word', () => {
    for (const w of words) {
      const c = canonicalWord(w);
      const read = c.reversed ? reverseWord(w) : w;
      expect([...read.slice(c.offset), ...read.slice(0, c.offset)]).toEqual(c.word);
    }
  });
});

describe('placed tiles', () => {
  it('gives the same key after a turn, a mirror and a shift', () => {
    const tiles = collect([0, 2, 3, 4, 6, 8], '111000100', 4).circuits.at(-1)!.tiles.map(placedOf);
    const key = placedKey(tiles);
    const moves: ZAffine[] = [{ k: 5, m: 0, t: [3, -1, 2, 7] }, { k: 2, m: 1, t: [0, 4, 0, -9] }];
    for (const G of moves) expect(placedKey(tiles.map((p) => ({ type: p.type, T: zMul(G, p.T) })))).toBe(key);
    expect(placedKey(tiles.slice(1))).not.toBe(key);
  });

  it('gives a circuit the same tiles and corners in every supertile that holds it, read from any tile', () => {
    const { circuits } = collect([0, 2, 3, 4, 6, 8], '111000100', 4, 1e9);
    const table = pairingTable(triangle);
    for (const root of ['Delta', 'Psi', 'Gamma'] as const) {
      const b = board(root, 4);
      for (const s of traceAll(b, table)) {
        if (s.kind !== 'circuit') continue;
        const tiles = Array.from(s.tiles, (t) => addressOf(b, t));
        const word = tiles.map((a, i) => tileLetter(a.leaf, s.entries[i], s.exits[i]));
        const f = circuits.find((c) => c.key === circuitKey(word))!;
        expect(measure({ ...f, tiles, word }).corners.corners).toEqual(measure(f).corners.corners);
        expect(tileSetKey(tiles)).toBe(tileSetKey(f.tiles));
      }
    }
  });
});

describe('corner chains', () => {
  it.each([['023468', '000100000', 5], ['15', '000010010', 4]] as const)(
    '%s-%s to level %i: every copy has the chain, and the copies disagree one level above it',
    (rule, combo, level) => {
      const { circuits } = collect([...rule].map(Number), combo, level, 1e9);
      let checked = 0;
      for (const f of circuits) {
        const corners = measure(f, 3, 0).corners.corners;
        const chains = cornerChains(f, corners);
        corners.forEach((p, j) => {
          // Read each copy's corner tile and its ancestors straight from the board.
          const addrs = f.at.map((c) => addressOf(c.board, copyTile(c, p)));
          const links = chains[j].split('<').slice(1);
          for (const a of addrs) {
            expect(TYPE_PREFIX[a.leaf]).toBe(chains[j].split('<')[0]);
            links.forEach((l, k) => expect(l).toBe(/\D$/.test(l) ? `${a.path[k].slot}${TYPE_PREFIX[a.path[k].parent]}` : `${a.path[k].slot}`));
          }
          // One more level would not hold for every copy (or there is none), unless symmetry folds corners together.
          const k = links.length;
          const last = links.at(-1) ?? '';
          if (k < f.level && /\D$/.test(last || 'x')) {
            const next = new Set(addrs.map((a) => `${a.path[k].slot}`));
            if (corners.every((q) => q === p || (q - p) % (f.word.length / wordOrder(canonicalWord(f.word).word)) !== 0)) expect(next.size).toBeGreaterThan(1);
          }
          checked++;
        });
      }
      expect(checked).toBeGreaterThan(20);
    },
  );
});

describe('sides', () => {
  it('measures edit distance', () => {
    const [a, b, c, d] = encode([['k', 'i', 't', 't', 'e', 'n'], ['s', 'i', 't', 't', 'i', 'n', 'g'], [], ['s']]);
    expect(levenshtein(a, b)).toBe(3);
    expect(levenshtein(a, c)).toBe(6);
    expect(levenshtein(c, d)).toBe(1);
  });

  it('puts the corners of points along a triangle at its vertices', () => {
    const V = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 15, y: 26 }];
    const pts = V.flatMap((a, i) => {
      const b = V[(i + 1) % 3];
      return Array.from({ length: 10 }, (_, t) => ({ x: a.x + ((b.x - a.x) * t) / 10, y: a.y + ((b.y - a.y) * t) / 10 }));
    });
    // Start the walk part way along a side so the corners are not at 0, n/3, 2n/3 by accident.
    const rolled = [...pts.slice(4), ...pts.slice(0, 4)];
    expect(fitCorners(rolled, 3).corners).toEqual([6, 16, 26]);
  });
});
