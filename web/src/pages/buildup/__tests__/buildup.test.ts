/**
 * The tables, against walking the tiles: for every crossing of every type at
 * levels 1 to 3, a strand entering at the crossing's tile and edge, walked
 * tile by tile with `neighbourOf` until it leaves the supertile, leaves at
 * the tile and edge of the crossing the table pairs it with, after as many
 * tiles as the table says. The circuits closing up to level 6 are the ones
 * the circuit index lists for that combination up to that size.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { neighbourOf, sameAddress, type Address } from '../../../core';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { pairingTable, patternOf } from '../../walker/walk';
import { closingsByLevel, crossingAddress, tablesAt } from '../buildup';

const subset = [0, 2, 3, 4, 6, 8];
const combo = '140000001';

describe('the build-up', () => {
  const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 6, 1, false);

  it('pairs crossings as walking the tiles does, through as many tiles', () => {
    const table = pairingTable(patternOf(subset, combo));
    let checked = 0;
    for (let level = 1; level <= 3; level++) {
      for (const t of tablesAt(cs, level).tables) {
        for (const [from, to, tiles] of t.routes) {
          for (const [a, b] of [[from, to], [to, from]]) {
            const start = crossingAddress(cs, level, t.type, a);
            let at: Address = start.address;
            let entry = start.edge;
            let n = 0;
            for (;;) {
              n++;
              const exit = table.get(at.leaf)!.get(entry)!;
              const nb = neighbourOf(at, exit);
              if (!nb.ok) {
                const end = crossingAddress(cs, level, t.type, b);
                expect(sameAddress(at, end.address) && exit === end.edge).toBe(true);
                break;
              }
              at = nb.address;
              entry = nb.edge;
            }
            expect(n).toBe(tiles);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  }, 60000);

  it('closes on the circuits the circuit index lists', () => {
    const index = JSON.parse(readFileSync(resolve(__dirname, '../../../../public/data/corners/hex-023468/140000001.json'), 'utf8')) as { circuits: { length: number; level: number }[] };
    const closings = closingsByLevel(cs);
    const found = new Set(closings.flat().map((c) => c.length));
    expect([...found].sort((a, b) => a - b)).toEqual(index.circuits.filter((c) => c.level <= 6).map((c) => c.length).sort((a, b) => a - b));
    // each new circuit is reported at the lowest level it closes
    for (const level of closings) for (const c of level) expect(c.first).toBeLessThanOrEqual(c.circuit.level);
  }, 60000);
});
