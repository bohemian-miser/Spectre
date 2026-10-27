/**
 * The wall view's object, checked against the placed geometry rather than
 * against the slot-path arithmetic that built it: the crossed edge lies on
 * every drawn supertile outline, the far tile really is across it, and the
 * far side's chain agrees with the machine's infinite answer below the top.
 */
import { describe, expect, it } from 'vitest';

import { MAX_WALL_LEVELS, WALL_PRESETS, buildWall, type Seg } from '../wall';

const key = (s: Seg): string => `${Math.round((s.x1 + s.x2) * 5000)},${Math.round((s.y1 + s.y2) * 5000)}`;

describe('buildWall', () => {
  for (const preset of WALL_PRESETS) {
    for (let n = 1; n <= MAX_WALL_LEVELS; n++) {
      it(`${preset.label}, ${n} levels`, () => {
        const w = buildWall(preset, n);
        const crossed = key(w.crossed);
        // the crossed edge is on the outline of every supertile drawn, on both sides
        for (const side of [w.outlines.near, w.outlines.far]) {
          expect(side).toHaveLength(n);
          for (const segs of side) expect(segs.map(key)).toContain(crossed);
        }
        // the far tile has an edge on the crossed edge: it is the tile across it
        const far = w.tiles.find((t) => t.id === w.farId && t.side === 'far')!;
        const farEdges = far.pts.map((a, i) => key({ x1: a.x, y1: a.y, x2: far.pts[(i + 1) % 6].x, y2: far.pts[(i + 1) % 6].y }));
        expect(farEdges[w.farEntry]).toBe(crossed);
        // the wall holds the crossed edge, and every wall edge is an edge of both sides
        expect(w.wall.map(key)).toContain(crossed);
        // below the top rung the far chain is the machine's
        for (const r of w.rungs.slice(0, n)) expect(r.far, `level ${r.level}`).toBe(r.machine);
      });
    }

    it(`${preset.label}: the wall gets no shorter as levels are added`, () => {
      let prev = 0;
      for (let n = 1; n <= MAX_WALL_LEVELS; n++) {
        const edges = buildWall(preset, n).wall.length;
        expect(edges).toBeGreaterThanOrEqual(prev);
        prev = edges;
      }
    });
  }
});
