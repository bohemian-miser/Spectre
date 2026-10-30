/**
 * Linked views: a view framing a supertile in one member of a chain maps to
 * a view framing the supertile with the same slot path in the next member,
 * for every supertile both members visit.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes, familyOf, type BornCircuit } from '../../shapes/circuitShapes';
import { linkBox, supertileAt } from '../chainLink';
import { chainPicture } from '../pairView';
import { readings } from '../readings';

const boxOf = (xy: Float64Array) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < xy.length; i += 2) {
    x0 = Math.min(x0, xy[i]);
    x1 = Math.max(x1, xy[i]);
    y0 = Math.min(y0, xy[i + 1]);
    y1 = Math.max(y1, xy[i + 1]);
  }
  return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
};

const area = (xy: Float64Array) => {
  let a = 0;
  for (let i = 0, j = xy.length / 2 - 1; i < xy.length / 2; j = i++) a += xy[2 * j] * xy[2 * i + 1] - xy[2 * i] * xy[2 * j + 1];
  return a / 2;
};

describe.each(['000100000', '140000001'])('linked views of 023468 / %s', (combo) => {
  const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...combo].map((c) => parseInt(c, 36)), 6, 1, true);
  const big = [...cs.born].sort((x, y) => y.length - x.length);
  const top = big[0];
  const members: BornCircuit[] = [top];
  for (let m = big.find((c) => c.level === top.level - 2 && familyOf(c) === familyOf(top)); m; m = big.find((c) => c.level === m!.level - 2 && familyOf(c) === familyOf(top))) members.unshift(m);

  it('map each supertile both members visit to the one with the same slot path', () => {
    expect(members.length).toBeGreaterThan(1);
    let checked = 0;
    for (let k = 0; k < members[0].level; k++) {
      const p = chainPicture(cs, members.map((c) => ({ circuit: c, readings: readings(cs, c) })), k);
      for (let j = 0; j + 1 < members.length; j++) {
        for (const [from, to] of [[p.sides[j], p.sides[j + 1]], [p.sides[j + 1], p.sides[j]]]) {
          for (const s of from.supertiles) {
            const there = to.supertiles.find((t) => t.path === s.path);
            if (!there) continue;
            const b = linkBox(from, to, boxOf(s.outline))!;
            const centre = { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
            expect(supertileAt(to, centre)!.path).toBe(s.path);
            // the view scaled as the supertile is: by the square root of the ratio of their areas
            const given = boxOf(s.outline);
            const ratio = (b.max.x - b.min.x) / (given.max.x - given.min.x);
            expect(ratio / Math.sqrt(Math.abs(area(there.outline) / area(s.outline)))).toBeCloseTo(1, 1);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});
