import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTRACTS,
  FAMILIES,
  connectionPoint,
  det,
  dist,
  familyMajors,
  leafOrder,
  leafPts,
  metaEdges,
  transPt,
} from '../../core';
import { findSeam, findSeamPartner, poseSeam, rigidAlign } from '../seam';
import { seamPolyline } from '../tilingModel';

describe('rigidAlign', () => {
  it('maps the source segment onto the target and preserves orientation', () => {
    const m = rigidAlign({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 3 });
    const a = transPt(m, { x: 0, y: 0 });
    const b = transPt(m, { x: 2, y: 0 });
    expect(a.x).toBeCloseTo(5, 9);
    expect(a.y).toBeCloseTo(1, 9);
    expect(b.x).toBeCloseTo(5, 9);
    expect(b.y).toBeCloseTo(3, 9);
    expect(det(m)).toBeCloseTo(1, 9);
  });
});

describe('seam lookup', () => {
  it('finds the signed seam of a class', () => {
    const plus = findSeam('spectre', 'Delta', 2, 1);
    expect(plus?.id).toBe('Delta/2A');
    expect(findSeam('spectre', 'Delta', 2, -1)).toBeNull();
    expect(findSeam('spectre', 'Delta', 5, -1)?.id).toBe('Delta/-5A');
  });

  it('picks a partner with the opposite sign (same sign for class 0)', () => {
    const p = findSeamPartner('spectre', 'Delta', 2, 1);
    expect(p).not.toBeNull();
    expect(p!.seam.sign).toBe(-1);
    expect(p!.seam.major).toBe(2);

    const zero = findSeamPartner('spectre', 'Theta', 0, 1);
    expect(zero!.seam.sign).toBe(1);
  });
});

describe('poseSeam', () => {
  it('glues B onto A without reflecting it', () => {
    const pose = poseSeam('spectre', 'Theta', 2);
    expect(pose).not.toBeNull();
    expect(det(pose!.xformB)).toBeCloseTo(1, 9);
  });

  it('lays B seam vertices exactly onto A seam vertices, reversed', () => {
    const pose = poseSeam('spectre', 'Theta', 2)!;
    const chainA = seamPolyline(leafPts('spectre', pose.typeA), pose.seamA);
    const chainB = seamPolyline(leafPts('spectre', pose.typeB), pose.seamB).map((p) =>
      transPt(pose.xformB, p),
    );
    expect(chainB).toHaveLength(chainA.length);
    const reversedA = [...chainA].reverse();
    chainB.forEach((p, i) => expect(dist(p, reversedA[i])).toBeLessThan(1e-9));
  });

  it('the shared crossing dot coincides for every signed class of every family', () => {
    for (const family of FAMILIES) {
      for (const major of familyMajors(family)) {
        for (const type of leafOrder(family)) {
          if (!findSeam(family, type, major, 1)) continue;
          const pose = poseSeam(family, type, major);
          if (!pose) continue;
          expect(
            pose.sharedDotError,
            `${family}/${type} class ${major}: dots ${pose.sharedDotError} apart`,
          ).toBeLessThan(1e-9);
          break;
        }
      }
    }
  });

  it('non-default contracts still coincide (the §3.3 mirror rule)', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      for (const minor of [0, 1, 2]) {
        const pose = poseSeam('spectre', 'Theta', 2, { contracts: { 2: { minor, t } } });
        expect(pose!.sharedDotError, `minor ${minor} t ${t}`).toBeLessThan(1e-9);
      }
    }
  });

  it('the shared dot really sits on the seam', () => {
    const pose = poseSeam('spectre', 'Theta', 2, { contracts: { 2: { minor: 2, t: 0.6 } } })!;
    const chain = seamPolyline(leafPts('spectre', pose.typeA), pose.seamA);
    const onSegment = chain.slice(0, -1).some((a, i) => {
      const b = chain[i + 1];
      const len = dist(a, b);
      return Math.abs(dist(a, pose.sharedPoint) + dist(pose.sharedPoint, b) - len) < 1e-9;
    });
    expect(onSegment).toBe(true);
  });

  it('honours a pinned neighbour type', () => {
    const pose = poseSeam('spectre', 'Delta', 2, { tileB: 'Xi' });
    expect(pose?.typeB).toBe('Xi');
  });

  it('returns null when the tile has no such seam', () => {
    expect(poseSeam('spectre', 'Delta', 4)).toBeNull();
  });

  it('the default contract point is the old getEdgeDotMidpoints position', () => {
    const pose = poseSeam('spectre', 'Theta', 2)!;
    const direct = connectionPoint('spectre', pose.typeA, pose.seamA, DEFAULT_CONTRACTS);
    expect(dist(pose.sharedPoint, direct)).toBeLessThan(1e-12);
    expect(metaEdges('spectre', pose.typeA)).toContain(pose.seamA);
  });
});
