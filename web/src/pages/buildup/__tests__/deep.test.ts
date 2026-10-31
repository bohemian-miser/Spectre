/**
 * The levels above the build against the build: the exact counts against
 * the built tables and a walk of the substitution tree, and the chains read
 * off the levels up to 7 against what closes at levels 8 to 10.
 */
import { describe, expect, it } from 'vitest';

import { buildSystem, type HexType, type MetaNode } from '../../../core';
import { sameCyclic } from '../../harmonics/readings';
import { CircuitShapes, familyOf } from '../../shapes/circuitShapes';
import { closingsByLevel } from '../buildup';
import { chainsOf, levelCounts, outlineOf, predictAt, readingPolyline, topReading } from '../deep';

const subset = [0, 2, 3, 4, 6, 8];
const digits = [...'111000001'].map((c) => parseInt(c, 36));

/** Tiles under a level-n supertile, by walking its children down to the tiles. */
function leaves(n: number, node: MetaNode): number {
  return n === 0 ? 1 : node.children.reduce((s, ch) => s + leaves(n - 1, ch.node as MetaNode), 0);
}

describe('the levels above the build', () => {
  const cs = new CircuitShapes('hex', subset, digits, 10, 1, true);
  const closings = closingsByLevel(cs);

  it('counts tiles and border crossings as the built tables and the substitution have them', () => {
    const counts = levelCounts(cs, 10);
    for (let n = 0; n <= 10; n++) {
      for (const [t, T] of Object.entries(cs.levels[n])) {
        expect(counts[n].crossings.get(t as HexType), `level ${n} ${t}`).toBe(BigInt(T.size - T.absent()));
        // every crossing is joined to another, so the routes are half the crossings
        expect(BigInt(2 * T.routes())).toBe(counts[n].crossings.get(t as HexType));
        if (n <= 5) expect(counts[n].tiles.get(t as HexType)).toBe(BigInt(leaves(n, buildSystem('hex', n)[t] as MetaNode)));
      }
    }
    const deep = levelCounts(cs, 30)[30];
    expect(deep.tiles.get('Delta')! > 10n ** 25n).toBe(true);
  }, 120000);

  it('finds the two chains of family 07, reading alike four levels down', () => {
    const chains = chainsOf(cs, closings, 9);
    expect(chains.map((c) => c.members.map((m) => `${m.length}@${m.level}`))).toEqual([
      ['57@5', '2154@7', '96645@9'],
      ['60@5', '1572@7', '124449@9'],
    ]);
    for (const c of chains) {
      expect(c.family).toBe('07');
      expect(c.depth).toBe(4);
    }
  }, 120000);

  it('read off levels up to 7, predicts what first closes at 8, 9 and 10, reading as it reads', () => {
    const chains = chainsOf(cs, closings, 7);
    expect(chains.length).toBe(2);
    for (const level of [8, 9, 10]) {
      const predicted = predictAt(chains, level);
      const fresh = closings[level].filter((c) => c.first === level);
      expect(predicted.length, `level ${level}`).toBe(fresh.length);
      for (const p of predicted) {
        // the circuit it stands for: the new one of its family that reads as it does at every depth carried
        const match = fresh.filter((c) => {
          if (familyOf(c.circuit) !== p.chain.family) return false;
          const r = topReading(cs, c.circuit, p.chain.depth);
          for (let d = 1; d <= p.chain.depth; d++) if (!sameCyclic(r.tokens[d], p.reading.tokens[d])) return false;
          return true;
        });
        expect(match.length, `${p.chain.members.at(-1)!.length} carried to level ${level}`).toBe(1);
      }
    }
  }, 120000);

  it('draws a predicted circuit inside its supertile, at level 29 as at level 9', () => {
    const predicted = [...predictAt(chainsOf(cs, closings, 7), 9), ...predictAt(chainsOf(cs, closings, 9), 29)];
    expect(predicted.length).toBe(4);
    for (const q of predicted) {
      for (let depth = 1; depth <= q.chain.depth; depth++) {
        const line = readingPolyline(cs, q, depth);
        expect(line.length).toBe(2 * q.reading.paths[depth].length + 2);
        const ring = outlineOf(cs, q.level, q.type, 2);
        let x0 = Infinity, x1 = -Infinity;
        for (let i = 0; i < ring.length; i += 2) { x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i]); }
        for (let i = 0; i < line.length; i += 2) {
          expect(line[i]).toBeGreaterThanOrEqual(x0);
          expect(line[i]).toBeLessThanOrEqual(x1);
        }
      }
    }
  }, 120000);
});
