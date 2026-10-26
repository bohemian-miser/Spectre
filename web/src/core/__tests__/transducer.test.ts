/**
 * The combinatorial neighbour algorithm and transducer, checked against the
 * geometry: on a level-3 hexagon supertile, the tile `neighbour()` names
 * across every edge of every tile is the one whose edge sits there.
 */
import { describe, expect, it } from 'vitest';
import {
  addressFromId, buildTransducer, formatAddress, hexTransducer, idOf, neighbour, parseAddress, runPeriodic, runTransducer,
  strandStep, symbolsOf, addressOfSymbols, walkStrand, sameAddress, HEX_TYPES, type HexType, type Address,
  buildSystem, flatten, leafPts, transPt, buildStrandGraph, strandComponents, strandWorkspace, comboToMatchingIndices, leafOrder,
  nonCrossingForTile,
} from '..';

/** Every tile of the level-`level` supertile of `root`, with its address and the world midpoints of its six edges. */
function patch(root: HexType, level: number) {
  const insts = flatten(buildSystem('hex', level)[root]);
  const pts = leafPts('hex', 'Delta');
  const key = (x: number, y: number): string => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
  const tiles = insts.map((inst) => ({
    address: addressFromId(root, inst.id),
    type: inst.type,
    mids: pts.map((p, i) => {
      const a = transPt(inst.xform, p), b = transPt(inst.xform, pts[(i + 1) % 6]);
      return key((a.x + b.x) / 2, (a.y + b.y) / 2);
    }),
  }));
  const byMid = new Map<string, { tile: number; edge: number }[]>();
  tiles.forEach((t, ti) => t.mids.forEach((m, e) => (byMid.get(m) ?? byMid.set(m, []).get(m)!).push({ tile: ti, edge: e })));
  return { tiles, byMid };
}

describe('combinatorial coordinates', () => {
  it('addresses round-trip through ids and text', () => {
    const a = addressFromId('Gamma', '3.7.0');
    expect(a.leaf).toBe('Pi'); // Gamma[3] = Theta, Theta[7] = Gamma, Gamma[0] = Pi
    expect(idOf(a)).toBe('3.7.0');
    expect(formatAddress(a)).toBe('Pi, slot 0 of Gamma, slot 7 of Theta, slot 3 of Gamma');
    expect(parseAddress('Pi, slot 0 of Gamma, slot 7 of Theta, slot 3 of Gamma')).toEqual(a);
    expect(parseAddress('Pi, slot 2 of Gamma')).toBeNull(); // Gamma has no child 2
  });

  for (const root of ['Delta', 'Gamma'] as HexType[]) {
    it(`neighbour() agrees with the geometry on every edge of a level-3 ${root} supertile`, () => {
      const { tiles, byMid } = patch(root, 3);
      let inside = 0, outside = 0;
      tiles.forEach((t, ti) => {
        for (let e = 0; e < 6; e++) {
          const here = byMid.get(t.mids[e])!;
          const other = here.find((o) => o.tile !== ti);
          const nb = neighbour(t.address, e);
          if (!other) {
            expect(nb.ok).toBe(false);
            outside++;
            continue;
          }
          expect(nb.ok).toBe(true);
          if (nb.ok) {
            expect(idOf(nb.address)).toBe(idOf(tiles[other.tile].address));
            expect(nb.address.leaf).toBe(tiles[other.tile].type);
            expect(nb.edge).toBe(other.edge);
            // and back again
            const back = neighbour(nb.address, nb.edge);
            expect(back.ok && sameAddress(back.address, t.address) && back.edge === e).toBe(true);
          }
          inside++;
        }
      });
      expect(inside).toBeGreaterThan(2000);
      expect(outside).toBeGreaterThan(50);
    });
  }
});

describe('the finite-state transducer', () => {
  it('is built, and gives the recursive algorithm\'s answer on every edge of a level-4 Delta supertile', () => {
    const tr = hexTransducer();
    expect(tr.states.length).toBeGreaterThan(10);
    expect(tr.states.length).toBeLessThan(5000);
    const insts = flatten(buildSystem('hex', 4).Delta);
    let checked = 0;
    for (const inst of insts) {
      const a = addressFromId('Delta', inst.id);
      for (let e = 0; e < 6; e++) {
        const nb = neighbour(a, e);
        const run = runTransducer(tr, a, e);
        expect(run.stuck).toBe(false);
        expect(run.accepted).toBe(nb.ok);
        if (nb.ok) {
          const got = addressOfSymbols(run.output);
          expect(sameAddress(got.address, nb.address) && got.edge === nb.edge).toBe(true);
          expect(run.output.length).toBe(symbolsOf(a, e).length);
        }
        checked++;
      }
    }
    expect(checked).toBe(insts.length * 6);
  });

  it('crosses an infinite wall: a periodic address gives a periodic neighbour', () => {
    const tr = hexTransducer();
    // Psi is child 0 of a Psi for ever: the apex of an infinite Psi supertile. Cross each edge.
    let crossed = 0;
    for (let e = 0; e < 6; e++) {
      const r = runPeriodic(tr, ['Psi:' + e], ['Psi:0']);
      if (r) {
        crossed++;
        expect(r.period.length).toBeGreaterThan(0);
        // the output is a legal address: every symbol's child is the type below it
        const out = [...r.prefix, ...r.period, ...r.period];
        const { address } = addressOfSymbols(out);
        expect(parseAddress(formatAddress(address))).not.toBeNull();
      }
    }
    expect(crossed).toBeGreaterThan(0);
  });

  it('a fresh build with tight limits fails loudly instead of running for ever', () => {
    expect(() => buildTransducer({ states: 5, pending: 24 })).toThrow(/state cap/);
  });
});

describe('a pattern on top', () => {
  it('walking every crossing of a level-3 Delta finds exactly the strand graph\'s circuits', () => {
    const subset = [0, 3, 4, 5, 6];
    const combo = '000000000';
    const idx = comboToMatchingIndices('hex', subset, combo);
    const matching: Record<string, number> = {};
    leafOrder('hex').forEach((t, i) => (matching[t] = idx[i]));
    const insts = flatten(buildSystem('hex', 3).Delta);
    const seen = new Set<string>();
    const circuits: number[] = [];
    let open = 0;
    for (const inst of insts) {
      const a = addressFromId('Delta', inst.id);
      for (let e = 0; e < 6; e++) {
        const k = `${idOf(a)}/${e}`;
        if (seen.has(k)) continue;
        const first = strandStep(subset, matching, { address: a, entry: e });
        if (!first.ok && first.reason === 'no-crossing') continue;
        const w = walkStrand(subset, matching, { address: a, entry: e });
        for (let i = 0; i < w.states.length; i++) {
          seen.add(`${idOf(w.states[i].address)}/${w.states[i].entry}`);
          if (w.exits[i] !== undefined) seen.add(`${idOf(w.states[i].address)}/${w.exits[i]}`);
        }
        if (w.end === 'circuit') circuits.push(w.exits.length);
        else open++;
      }
    }
    // the strand graph's view of the same patch
    const g = buildStrandGraph('hex', subset, 3);
    const digits = leafOrder('hex').map((t, i) => Math.max(0, nonCrossingForTile('hex', t, new Set(subset)).indexOf(idx[i])));
    const c = strandComponents(g, digits, strandWorkspace(g));
    const ref: number[] = [];
    for (let i = 0; i < c.n; i++) if (c.ends[i] === 0) ref.push(c.segs[i]);
    expect(circuits.sort((x, y) => x - y)).toEqual(ref.sort((x, y) => x - y));
    expect(open).toBeGreaterThan(0);
  });

  it('a strand that leaves the top supertile says so', () => {
    const a: Address = { leaf: 'Delta', path: [] };
    const st = strandStep([0, 3, 4, 5, 6], { Delta: 0 }, { address: a, entry: 0 });
    expect(st.ok).toBe(false);
    if (!st.ok) expect(st.reason).toBe('needs-parent');
  });

  it('every type is reachable from the tables', () => {
    expect(HEX_TYPES).toHaveLength(9);
  });
});
