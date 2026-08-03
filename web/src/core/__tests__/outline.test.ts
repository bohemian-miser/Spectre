import { describe, expect, it } from 'vitest';
import { curvyOutline, curvyPts, outlinePath, polygonPoints, straightOutline } from '../outline';
import { HEX_PTS, SPECTRE_PTS } from '../families';
import { dist, type Pt } from '../geom';

/**
 * Independent transcription of the OLD `CurvyShape` constructor
 * (tiles.ts:480–505) with p5.Vector replaced by {x,y}.
 */
function legacyCurvyPts(pts: readonly Pt[]): Pt[] {
  let blah = true;
  const out: Pt[] = [pts[pts.length - 1]];
  for (const pt of pts) {
    const prev = out[out.length - 1];
    const v = { x: pt.x - prev.x, y: pt.y - prev.y };
    const w = { x: -v.y, y: v.x };
    if (blah) {
      out.push({ x: prev.x + 0.33 * v.x + 0.6 * w.x, y: prev.y + 0.33 * v.y + 0.6 * w.y });
      out.push({ x: prev.x + 0.67 * v.x + 0.6 * w.x, y: prev.y + 0.67 * v.y + 0.6 * w.y });
    } else {
      out.push({ x: prev.x + 0.33 * v.x - 0.6 * w.x, y: prev.y + 0.33 * v.y - 0.6 * w.y });
      out.push({ x: prev.x + 0.67 * v.x - 0.6 * w.x, y: prev.y + 0.67 * v.y - 0.6 * w.y });
    }
    blah = !blah;
    out.push(pt);
  }
  return out;
}

describe('outlines', () => {
  it('straightOutline emits a closed polygon path', () => {
    expect(straightOutline([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 2 }])).toBe(
      'M 0 0 L 1 0 L 0 2 Z',
    );
    expect(straightOutline([])).toBe('');
    expect(polygonPoints(HEX_PTS.slice(0, 2))).toBe('0,0 1,0');
    expect(outlinePath(HEX_PTS, false)).toBe(straightOutline(HEX_PTS));
    expect(outlinePath(HEX_PTS, true)).toBe(curvyOutline(HEX_PTS));
  });

  it('curvyPts matches the legacy CurvyShape constructor exactly', () => {
    for (const pts of [SPECTRE_PTS, HEX_PTS]) {
      expect(curvyPts(pts)).toEqual(legacyCurvyPts(pts));
      expect(curvyPts(pts).length).toBe(3 * pts.length + 1);
    }
  });

  it('curvy control points alternate sides and start positive', () => {
    const square: Pt[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const cp = curvyPts(square);
    // first edge runs from (0,1) to (0,0): v = (0,-1), left normal w = (1, 0)
    expect(cp[0]).toEqual({ x: 0, y: 1 });
    expect(cp[1].x).toBeCloseTo(0.6, 12);
    expect(cp[2].x).toBeCloseTo(0.6, 12);
    // second edge flips the offset sign
    expect(cp[4].y).toBeCloseTo(-0.6, 12);
  });

  it('curvyOutline is a golden-stable cubic path anchored at the last vertex', () => {
    const path = curvyOutline(HEX_PTS);
    expect(path.startsWith('M -0.5 0.8660254037844386 C ')).toBe(true);
    expect(path.endsWith(' Z')).toBe(true);
    expect((path.match(/ C /g) ?? []).length).toBe(HEX_PTS.length);
    expect(path).toBe(
      'M -0.5 0.8660254037844386 ' +
      'C 0.18461524227066317 0.8802370205355738 0.35461524227066316 0.5857883832488646 0 0 ' +
      'C 0.33 -0.6 0.67 -0.6 1 0 ' +
      'C 0.6453847577293369 0.5857883832488647 0.8153847577293368 0.8802370205355738 1.5 0.8660254037844386 ' +
      'C 1.854615242270663 1.4518137870333034 1.684615242270663 1.7462624243200124 1 1.7320508075688772 ' +
      'C 0.6699999999999999 1.132050807568877 0.32999999999999996 1.132050807568877 0 1.7320508075688772 ' +
      'C -0.6846152422706632 1.7462624243200124 -0.8546152422706632 1.4518137870333032 -0.5 0.8660254037844386 Z',
    );
  });

  it('curvy vertices still pass through every original vertex', () => {
    const cp = curvyPts(SPECTRE_PTS);
    SPECTRE_PTS.forEach((p, i) => {
      expect(dist(cp[3 * i + 3], p)).toBeCloseTo(0, 12);
    });
  });
});
