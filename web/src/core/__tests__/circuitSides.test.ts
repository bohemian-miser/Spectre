/** `sideRuns` on words built by hand; `walker/__tests__/walk.test.ts` runs it on a walked circuit. */
import { describe, expect, it } from 'vitest';

import { reverseLetter, sideRuns } from '../circuitSides';

describe('sideRuns', () => {
  it('finds nothing in three equal sides', () => {
    const side = ['Phi45', 'Gamma45', 'Xi35'];
    expect(sideRuns([...side, ...side, ...side]).runs).toEqual([]);
  });

  it('marks a block walked backwards on one side', () => {
    const side = ['Pi54', 'Delta10', 'Gamma23', 'Sigma54', 'Xi24'];
    const odd = [side[0], ...side.slice(1, 4).map(reverseLetter).reverse(), side[4]];
    const sides = sideRuns([...side, ...odd, ...side]);
    // cut at the longest agreeing stretch (Xi24 then Pi54), which puts the odd block in the first third
    expect(sides.offset).toBe(4);
    expect(sides.runs).toEqual([{ from: 2, to: 4, odd: 0, reversed: true }]);
  });

  it('does not split a run across the cut', () => {
    const side = ['A01', 'B01', 'C01', 'D01', 'E01', 'F01'];
    const odd = ['A01', 'B01', 'C01', 'D01', 'E10', 'F10'];
    // the odd block wraps from the end of the second third into the third
    const word = [...side, ...odd, ...side];
    const rotated = [...word.slice(5), ...word.slice(0, 5)];
    const sides = sideRuns(rotated);
    expect(sides.runs).toHaveLength(1);
    expect(sides.runs[0].to - sides.runs[0].from).toBe(1);
  });
});
