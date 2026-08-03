import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTRACTS,
  connectionCount,
  connectionPoint,
  connectionPoints,
  contractU,
  familyMajors,
  formatEdgeLabel,
  metaEdges,
  parseEdgeLabel,
  seamCenterU,
  validateContracts,
  type EdgeContracts,
} from '../edges';
import {
  FAMILIES,
  HEX_EDGE_LABELS,
  SPECTRE_EDGE_LABELS,
  edgeLabels,
  leafOrder,
  leafPts,
  type TileFamilyId,
  type TileTypeId,
} from '../families';
import { dist, type Pt } from '../geom';

const ALL_LABELS = [
  ...Object.values(SPECTRE_EDGE_LABELS).flat(),
  ...Object.values(HEX_EDGE_LABELS).flat(),
];

/**
 * Independent transcription of the OLD `getEdgeDotMidpoints` (tiles.ts:112–165)
 * with p5 removed — the equivalence oracle for the default contracts.
 */
function legacyEdgeDotMidpoints(
  family: TileFamilyId,
  tileLabel: TileTypeId,
  selectedEdges: Set<number>,
): Pt[] {
  const labels = edgeLabels(family, tileLabel);
  if (labels.length === 0) return [];
  const basePts = leafPts(family, tileLabel);
  const points: Pt[] = [];
  for (let i = 0; i < labels.length; i++) {
    const lab = labels[i] || '';
    const major = parseInt(lab.replace('-', '').charAt(0));
    const sub = parseInt(lab.replace('-', '').substring(2, 3));
    if (selectedEdges.has(major)) {
      if (family === 'hex') {
        if (sub === 0) {
          const a = basePts[i];
          const b = basePts[(i + 1) % basePts.length];
          points.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
      } else if (major === 0) {
        if (sub === 0) points.push(basePts[(i + 1) % basePts.length]);
      } else if (sub === 0) {
        const a = basePts[i];
        const b = basePts[(i + 1) % basePts.length];
        points.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
    }
  }
  return points;
}

/** Legacy `getEdgeDotCount` (analysis.ts:12–25). */
function legacyEdgeDotCount(
  family: TileFamilyId,
  tileLabel: TileTypeId,
  selectedEdges: Set<number>,
): number {
  let count = 0;
  for (const lab of edgeLabels(family, tileLabel)) {
    const major = parseInt(lab.replace('-', '').charAt(0));
    const sub = parseInt(lab.replace('-', '').substring(2, 3));
    if (selectedEdges.has(major) && sub === 0) count++;
  }
  return count;
}

/** Every subset of the majors that occur in a family (masks 0..2^k-1). */
function allSubsets(family: TileFamilyId): Set<number>[] {
  const majors = familyMajors(family);
  const out: Set<number>[] = [];
  for (let i = 0; i < 1 << majors.length; i++) {
    const s = new Set<number>();
    for (let j = 0; j < majors.length; j++) if ((i >> j) & 1) s.add(majors[j]);
    out.push(s);
  }
  return out;
}

/** Vertices of a seam's polyline, in label order. */
function seamPolyline(family: TileFamilyId, type: TileTypeId, indices: readonly number[]): Pt[] {
  const pts = leafPts(family, type);
  const n = pts.length;
  const out = indices.map((i) => pts[i]);
  out.push(pts[(indices[indices.length - 1] + 1) % n]);
  return out;
}

/** Position of `p` along a polyline in edge units (index + fraction). */
function positionAlong(poly: readonly Pt[], p: Pt): number {
  let best = -1;
  let bestErr = Infinity;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const len = dist(a, b);
    const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len);
    const proj = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const err = dist(proj, p) + (t < -1e-9 ? -t : 0) + (t > 1 + 1e-9 ? t - 1 : 0);
    if (err < bestErr) {
      bestErr = err;
      best = i + Math.max(0, Math.min(1, t));
    }
  }
  expect(bestErr).toBeLessThan(1e-9);
  return best;
}

describe('edge labels', () => {
  it('parses and round-trips every label in both tables', () => {
    expect(ALL_LABELS.length).toBeGreaterThan(140);
    for (const raw of ALL_LABELS) {
      const l = parseEdgeLabel(raw);
      expect(formatEdgeLabel(l)).toBe(raw);
      expect(l.major).toBeGreaterThanOrEqual(0);
      expect(l.major).toBeLessThanOrEqual(8);
      expect(['A', 'B']).toContain(l.variant);
      // agrees with the old ad-hoc parse for these (single-digit) labels
      expect(l.major).toBe(parseInt(raw.replace('-', '').charAt(0)));
      expect(l.minor).toBe(parseInt(raw.replace('-', '').substring(2, 3)));
      expect(l.sign).toBe(raw.startsWith('-') ? -1 : 1);
    }
  });

  it('handles multi-digit labels the old substring parse could not', () => {
    expect(parseEdgeLabel('10.12B')).toMatchObject({ major: 10, minor: 12, variant: 'B', sign: 1 });
    expect(() => parseEdgeLabel('bogus')).toThrow();
  });

  it('class 0 never has a negative version; class 7 is Mystic-internal', () => {
    for (const raw of ALL_LABELS) {
      const l = parseEdgeLabel(raw);
      if (l.major === 0) expect(l.sign).toBe(1);
    }
    const sevens = Object.entries(SPECTRE_EDGE_LABELS)
      .filter(([, labs]) => labs.some((l) => parseEdgeLabel(l).major === 7))
      .map(([k]) => k)
      .sort();
    expect(sevens).toEqual(['Gamma1', 'Gamma2']);
  });
});

describe('meta-edges (seams)', () => {
  it('groups consecutive labels sharing sign/major/variant', () => {
    const delta = metaEdges('spectre', 'Delta');
    expect(delta.map((e) => e.id)).toEqual([
      'Delta/3A',
      'Delta/2A',
      'Delta/-5A',
      'Delta/1A',
      'Delta/-3A',
      'Delta/-6A',
    ]);
    expect(delta[1].edgeIndices).toEqual([2, 3, 4]);
    expect(delta[1].minors).toEqual([0, 1, 2]);
  });

  it('keeps Theta 2A and 2B apart', () => {
    const ids = metaEdges('spectre', 'Theta').map((e) => e.id);
    expect(ids).toContain('Theta/2A');
    expect(ids).toContain('Theta/2B');
  });

  it('joins the seam that wraps the end of Sigma’s label array', () => {
    const four = metaEdges('spectre', 'Sigma').find((e) => e.major === 4);
    expect(four).toBeDefined();
    expect(four?.edgeIndices).toEqual([12, 13, 0, 1]);
    expect(four?.minors).toEqual([0, 1, 2, 3]);
  });

  it('covers every physical edge exactly once, in every family', () => {
    for (const family of FAMILIES) {
      for (const type of leafOrder(family)) {
        const seen = metaEdges(family, type).flatMap((e) => [...e.edgeIndices]);
        expect([...seen].sort((a, b) => a - b)).toEqual(
          edgeLabels(family, type).map((_, i) => i),
        );
      }
    }
  });
});

describe('connection points', () => {
  it('reproduce the legacy getEdgeDotMidpoints for every family/type/subset', () => {
    for (const family of FAMILIES) {
      for (const type of leafOrder(family)) {
        for (const subset of allSubsets(family)) {
          const got = connectionPoints(family, type, subset).map((c) => c.pt);
          const want = legacyEdgeDotMidpoints(family, type, subset);
          expect(got.length, `${family}/${type}`).toBe(want.length);
          got.forEach((p, i) => {
            expect(p.x).toBeCloseTo(want[i].x, 12);
            expect(p.y).toBeCloseTo(want[i].y, 12);
          });
        }
      }
    }
  });

  it('connectionCount ports getEdgeDotCount exactly', () => {
    for (const family of FAMILIES) {
      for (const type of leafOrder(family)) {
        for (const subset of allSubsets(family)) {
          expect(connectionCount(family, type, subset)).toBe(
            legacyEdgeDotCount(family, type, subset),
          );
          expect(connectionCount(family, type, subset)).toBe(
            connectionPoints(family, type, subset).length,
          );
        }
      }
    }
  });
});

describe('edge contracts', () => {
  it('+ and - sides of a class agree for arbitrary minor/t (mirror rule)', () => {
    for (const family of FAMILIES) {
      for (const major of familyMajors(family)) {
        if (major === 0) continue; // self-gluing, handled below
        // collect one + seam and one - seam of this class
        let pos: { type: TileTypeId; seam: ReturnType<typeof metaEdges>[number] } | null = null;
        let neg: { type: TileTypeId; seam: ReturnType<typeof metaEdges>[number] } | null = null;
        for (const type of leafOrder(family)) {
          for (const seam of metaEdges(family, type)) {
            if (seam.major !== major) continue;
            if (seam.sign > 0 && !pos) pos = { type, seam };
            if (seam.sign < 0 && !neg) neg = { type, seam };
          }
        }
        if (!pos || !neg) continue;

        const polyPos = seamPolyline(family, pos.type, pos.seam.edgeIndices);
        const polyNeg = seamPolyline(family, neg.type, neg.seam.edgeIndices);
        const M = pos.seam.edgeIndices.length;
        expect(neg.seam.edgeIndices.length).toBe(M);

        // the negative seam traversed in reverse is congruent to the positive one
        const lensPos = polyPos.slice(0, -1).map((p, i) => dist(p, polyPos[i + 1]));
        const lensNeg = polyNeg.slice(0, -1).map((p, i) => dist(p, polyNeg[i + 1]));
        [...lensNeg].reverse().forEach((l, i) => expect(l).toBeCloseTo(lensPos[i], 9));

        for (let minor = 0; minor < M; minor++) {
          for (const t of [0, 0.25, 0.5, 0.6, 1]) {
            const contracts: EdgeContracts = { [major]: { minor, t } };
            const uPos = positionAlong(polyPos, connectionPoint(family, pos.type, pos.seam, contracts));
            const uNegRaw = positionAlong(polyNeg, connectionPoint(family, neg.type, neg.seam, contracts));
            // measured from the far end, because the seams glue in reverse
            expect(M - uNegRaw).toBeCloseTo(uPos, 9);
            expect(uPos).toBeCloseTo(minor + t, 9);
          }
        }
      }
    }
  });

  it('class 0 sits at the seam center and only accepts symmetric contracts', () => {
    // spectre: two-edge eta seam -> the shared vertex; hex: a single edge midpoint
    const spectreSeam = metaEdges('spectre', 'Theta').find((e) => e.major === 0)!;
    expect(seamCenterU(spectreSeam)).toBe(1);
    expect(contractU(DEFAULT_CONTRACTS[0]!)).toBe(1);

    const hexSeam = metaEdges('hex', 'Theta').find((e) => e.major === 0)!;
    expect(seamCenterU(hexSeam)).toBe(0.5);

    // asymmetric class-0 contracts are clamped back to the center...
    const clamped = validateContracts('spectre', { 0: { minor: 0, t: 0.25 } });
    expect(contractU(clamped[0]!)).toBeCloseTo(1, 12);
    // ...and rejected outright in strict mode
    expect(() => validateContracts('spectre', { 0: { minor: 0, t: 0.25 } }, { strict: true })).toThrow();
    // the default is symmetric everywhere
    expect(() =>
      validateContracts('spectre', { 0: DEFAULT_CONTRACTS[0]! }, { strict: true }),
    ).not.toThrow();
  });

  it('moving a contract moves points without reordering them', () => {
    const sel = new Set([2, 5, 7, 8]);
    const base = connectionPoints('spectre', 'Theta', sel);
    const moved = connectionPoints('spectre', 'Theta', sel, { 2: { minor: 2, t: 0.6 } });
    expect(moved.map((c) => c.edge.id)).toEqual(base.map((c) => c.edge.id));
    const changed = moved.filter((c, i) => dist(c.pt, base[i].pt) > 1e-9);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every((c) => c.edge.major === 2)).toBe(true);
  });

  it('validateContracts clamps out-of-range values', () => {
    const v = validateContracts('spectre', { 2: { minor: 99, t: 5 }, 5: { minor: -3, t: -1 } });
    expect(v[2]).toEqual({ minor: 2, t: 1 });
    expect(v[5]).toEqual({ minor: 0, t: 0 });
  });
});
