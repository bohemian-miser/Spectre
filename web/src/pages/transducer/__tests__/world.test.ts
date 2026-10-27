/**
 * The neighbour machine board's reducer, driven by random sequences of
 * crossings, parent choices, selections and resets, and checked after every
 * step against the geometry of the substitution: a crossing's two tiles share
 * the edge it named, growing the world moves no tile already on the board,
 * and every slot path on the board names a tile of the world.
 */
import { describe, expect, it } from 'vitest';

import {
  HEX_TYPES, IDENT, buildSystem, inv, leafPts, mul, transPt,
  type Affine, type HexType, type TileNode,
} from '../../../core';
import { MAX_LEVEL, addressIn, initialBoard, parentOptions, reduce, type Action, type Board, type World } from '../world';

const PTS = leafPts('hex', 'Delta');

/** The tile's transform in the root's frame, by walking its slot path down the supertile tree. */
function xformOf(world: World, id: string): Affine {
  let node: TileNode = buildSystem('hex', world.level)[world.root];
  let x: Affine = IDENT;
  for (const s of id === '' ? [] : id.split('.').map(Number)) {
    if (node.kind !== 'meta') throw new Error(`slot path ${id} goes below a tile`);
    const ch = node.children.find((c) => c.pos === s);
    if (!ch) throw new Error(`no slot ${s} in ${node.type}`);
    x = mul(x, ch.xform);
    node = ch.node;
  }
  if (node.kind !== 'leaf') throw new Error(`slot path ${id} stops above a tile`);
  return x;
}

const edgeMid = (x: Affine, e: number): { x: number; y: number } => {
  const a = transPt(x, PTS[e]), b = transPt(x, PTS[(e + 1) % 6]);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};
const centre = (x: Affine): { x: number; y: number } => transPt(x, { x: 0.5, y: Math.sqrt(3) / 2 });
const close = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;

/** Centres of every revealed tile, relative to the start tile. */
function layoutOf(board: Board): Map<string, { x: number; y: number }> {
  const toStart = inv(xformOf(board.world, board.world.startId));
  const out = new Map<string, { x: number; y: number }>();
  for (const id of board.revealed) out.set(id, centre(mul(toStart, xformOf(board.world, id))));
  return out;
}

function checkBoard(b: Board): void {
  for (const id of b.revealed) expect(addressIn(b.world, id), `revealed ${id} in a level-${b.world.level} ${b.world.root}`).not.toBeNull();
  expect(b.revealed.has(b.selected), `selected ${b.selected} is revealed`).toBe(true);
  expect(b.revealed.has(b.world.startId)).toBe(true);
  for (const id of b.trail) expect(b.revealed.has(id), `trail ${id} is revealed`).toBe(true);
  if (b.pending) {
    expect(b.lookup?.result.ok).toBe(false);
    const opts = parentOptions(b);
    expect(opts.length).toBeGreaterThan(0);
    expect(b.previewIdx).toBeGreaterThanOrEqual(0);
    expect(b.previewIdx).toBeLessThan(opts.length);
    if (b.world.level < MAX_LEVEL - 3) expect(opts[0].needs, 'the first option leads to a landing').not.toBeNull();
  }
}

/** A seeded generator, so a failure names the run that found it. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAction(b: Board, r: () => number): Action {
  const x = r();
  if (b.pending && x < 0.55) {
    const opts = parentOptions(b);
    // mostly the first option, sometimes any, sometimes the one that repeats the root's own type
    const y = r();
    const o = y < 0.5 ? opts[0] : y < 0.8 ? opts[Math.floor(r() * opts.length)] : opts.find((p) => p.repeats) ?? opts[0];
    return { type: 'grow', parent: o.parent, slot: o.slot };
  }
  if (x < 0.75) return { type: 'cross', edge: Math.floor(r() * 6) };
  if (x < 0.85) { const ids = [...b.revealed]; return { type: 'select', id: ids[Math.floor(r() * ids.length)] }; }
  if (x < 0.9) return { type: 'previewStep', delta: r() < 0.5 ? 1 : -1 };
  if (x < 0.93) return { type: 'cross', edge: 7 }; // not an edge: ignored
  if (x < 0.96) return { type: 'select', id: '9.9.9' }; // not on the board: ignored
  return { type: 'reset', start: HEX_TYPES[Math.floor(r() * HEX_TYPES.length)] };
}

describe('neighbour machine board', () => {
  it('a crossing that leaves the root lands within three parents when the first option is taken, from every type and edge', () => {
    for (const T of HEX_TYPES) {
      for (let e = 0; e < 6; e++) {
        let b = reduce(initialBoard(T), { type: 'cross', edge: e });
        let grows = 0;
        while (b.pending && grows < MAX_LEVEL) {
          const o = parentOptions(b)[0];
          b = reduce(b, { type: 'grow', parent: o.parent, slot: o.slot });
          grows++;
          checkBoard(b);
        }
        expect(b.pending, `${T} edge ${e}`).toBeNull();
        expect(grows, `${T} edge ${e}`).toBeLessThanOrEqual(3);
        expect(close(edgeMid(xformOf(b.world, b.lookup!.from), e), edgeMid(xformOf(b.world, b.selected), b.entry!))).toBe(true);
      }
    }
  });

  it('edge 0 of a Gamma: no single parent lands it, a Gamma parent repeats, and repeating it to the cap leaves a waiting board, not a broken one', () => {
    let b = reduce(initialBoard('Gamma'), { type: 'cross', edge: 0 });
    const opts = parentOptions(b);
    expect(opts.every((o) => o.landing === null)).toBe(true);
    expect(opts.find((o) => o.parent === 'Gamma')?.repeats).toBe(true);
    expect(opts[0].parent).not.toBe('Gamma');
    for (let i = 0; i < MAX_LEVEL + 2; i++) {
      b = reduce(b, { type: 'grow', parent: 'Gamma', slot: 7 });
      checkBoard(b);
    }
    expect(b.world.level).toBe(MAX_LEVEL);
    expect(b.pending).not.toBeNull();
    expect(b.selected).toBe('7.7.7.7.7.7');
  });

  it('random walks keep the board consistent with the geometry', () => {
    let crossings = 0, grows = 0;
    for (let run = 0; run < 120; run++) {
      const r = rng(run + 1);
      let b = initialBoard(HEX_TYPES[run % HEX_TYPES.length]);
      for (let step = 0; step < 40; step++) {
        const a = randomAction(b, r);
        const before = b;
        const beforeLayout = a.type === 'grow' ? layoutOf(b) : null;
        b = reduce(b, a);
        try {
          checkBoard(b);
          if (a.type === 'cross' && b.lookup !== before.lookup && b.lookup?.result.ok) {
            crossings++;
            const from = xformOf(b.world, b.lookup.from);
            const to = xformOf(b.world, b.selected);
            expect(close(edgeMid(from, b.lookup.edge), edgeMid(to, b.entry!)), 'the two tiles share the crossed edge').toBe(true);
            expect(close(centre(from), centre(to)), 'the neighbour is a different tile').toBe(false);
          }
          if (a.type === 'grow' && b.world !== before.world) {
            grows++;
            const after = layoutOf(b);
            for (const [id, c] of beforeLayout!) expect(close(after.get(`${a.slot}${id === '' ? '' : '.' + id}`)!, c), `${id} stays put`).toBe(true);
          }
        } catch (err) {
          throw new Error(`run ${run}, step ${step}, ${JSON.stringify(a)}: ${(err as Error).message}`);
        }
      }
    }
    expect(crossings).toBeGreaterThan(1000);
    expect(grows).toBeGreaterThan(100);
  });

  it('a grow with no crossing waiting, or a parent that cannot hold the root, changes nothing', () => {
    const b = initialBoard('Pi' as HexType);
    expect(reduce(b, { type: 'grow', parent: 'Gamma', slot: 0 })).toBe(b);
    const w = reduce(b, { type: 'cross', edge: 0 });
    expect(reduce(w, { type: 'grow', parent: 'Delta', slot: 0 })).toBe(w); // Delta's slot 0 holds a Xi
  });
});
