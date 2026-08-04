/**
 * Exact Z[zeta12] arithmetic (exact.ts) — the integer twin of the float
 * substitution pipeline (docs/TILE_ALGOS_INVESTIGATION.md section 6).
 *
 * The two load-bearing claims verified here:
 *  1. the exact system projects to the SAME transforms the float pipeline
 *     produces (agreement at every leaf of small levels), and
 *  2. exact composition is drift-free at depth where floats visibly drift —
 *     inverses and re-anchoring identities hold with INTEGER equality.
 */
import { describe, expect, it } from 'vitest';
import {
  IDENT,
  REFLECT_X,
  mul,
  type Affine,
} from '../geom';
import { SPECTRE_PTS } from '../families';
import { buildSystem, flatten, type TileNode } from '../tiles';
import {
  Z_COEFF_LIMIT,
  Z_IDENT,
  Z_ONE,
  Z_REFLECT,
  Z_ZERO,
  zAdd,
  zAffineEq,
  zAffineKey,
  zAffineMaxAbsCoeff,
  zApply,
  zConj,
  zEq,
  zGamma2Xform,
  zInv,
  zKey,
  zMul,
  zRot,
  zSpectrePts,
  zSupertileTransforms,
  zToAffine,
  zTranslation,
  zX,
  zY,
  type ZAffine,
  type ZVec,
} from '../exact';

const maxAffineDiff = (a: Affine, b: Affine): number => {
  let m = 0;
  for (let i = 0; i < 6; ++i) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};

/** Small deterministic sample of points and transforms for algebra laws. */
function samples(): { pts: ZVec[]; xfs: ZAffine[] } {
  const pts: ZVec[] = [
    Z_ZERO,
    Z_ONE,
    [3, -2, 5, 7],
    [-11, 13, 0, -4],
    [100, -250, 999, 1],
  ];
  const xfs: ZAffine[] = [];
  let i = 0;
  for (const m of [0, 1] as const) {
    for (const k of [0, 1, 3, 5, 7, 10, 11]) {
      xfs.push({ k, m, t: pts[i % pts.length] });
      i++;
    }
  }
  return { pts, xfs };
}

describe('Z[zeta12] points', () => {
  it('recovers exact SPECTRE_PTS (all 13 edges are unit d^k steps)', () => {
    const zp = zSpectrePts();
    expect(zp).toHaveLength(SPECTRE_PTS.length);
    let err = 0;
    zp.forEach((p, idx) => {
      err = Math.max(
        err,
        Math.abs(zX(p) - SPECTRE_PTS[idx].x),
        Math.abs(zY(p) - SPECTRE_PTS[idx].y),
      );
    });
    expect(err).toBeLessThan(1e-12);
    // closed outline: the last vertex is one unit step from the first
    const closing = zAdd(zp[0], zRot(Z_ONE, 9)); // (0,0) + d^9 = (0,-1)... direction checked by length
    const dx = zX(zp[zp.length - 1]) - zX(zp[0]);
    const dy = zY(zp[zp.length - 1]) - zY(zp[0]);
    expect(Math.hypot(dx, dy)).toBeCloseTo(1, 12);
    expect(zKey(closing)).not.toBe(zKey(zp[0])); // keys are injective
  });

  it('rotation is 12-periodic and additive', () => {
    const { pts } = samples();
    for (const p of pts) {
      expect(zEq(zRot(p, 12), p)).toBe(true);
      expect(zEq(zRot(zRot(p, 5), 9), zRot(p, 14))).toBe(true);
      expect(zEq(zRot(p, -3), zRot(p, 9))).toBe(true);
    }
  });

  it('conjugation is an involution and inverts rotation', () => {
    const { pts } = samples();
    for (const p of pts) {
      expect(zEq(zConj(zConj(p)), p)).toBe(true);
      expect(zEq(zConj(zRot(p, 4)), zRot(zConj(p), -4))).toBe(true);
    }
  });

  it('projection is a ring homomorphism to the plane (rotation = 30 deg)', () => {
    const { pts } = samples();
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    for (const p of pts) {
      const r = zRot(p, 1);
      expect(zX(r)).toBeCloseTo(c * zX(p) - s * zY(p), 10);
      expect(zY(r)).toBeCloseTo(s * zX(p) + c * zY(p), 10);
      expect(zX(zConj(p))).toBeCloseTo(zX(p), 10);
      expect(zY(zConj(p))).toBeCloseTo(-zY(p), 10);
    }
  });
});

describe('ZAffine transforms', () => {
  it('composition matches application (exact integer equality)', () => {
    const { pts, xfs } = samples();
    for (const A of xfs) {
      for (const B of xfs) {
        const AB = zMul(A, B);
        for (const p of pts) {
          expect(zEq(zApply(AB, p), zApply(A, zApply(B, p)))).toBe(true);
        }
      }
    }
  });

  it('composition is associative and projects to float mul()', () => {
    const { xfs } = samples();
    for (let i = 0; i < xfs.length; ++i) {
      const A = xfs[i];
      const B = xfs[(i * 3 + 1) % xfs.length];
      const C = xfs[(i * 5 + 2) % xfs.length];
      expect(zAffineEq(zMul(zMul(A, B), C), zMul(A, zMul(B, C)))).toBe(true);
      expect(maxAffineDiff(zToAffine(zMul(A, B)), mul(zToAffine(A), zToAffine(B)))).toBeLessThan(
        1e-12,
      );
    }
  });

  it('inverse is exact on both sides, for both mirror flags', () => {
    const { xfs } = samples();
    for (const T of xfs) {
      expect(zAffineEq(zMul(T, zInv(T)), Z_IDENT)).toBe(true);
      expect(zAffineEq(zMul(zInv(T), T), Z_IDENT)).toBe(true);
    }
  });

  it('Z_REFLECT is core REFLECT_X and Z_IDENT is IDENT', () => {
    expect(maxAffineDiff(zToAffine(Z_REFLECT), REFLECT_X)).toBe(0);
    expect(maxAffineDiff(zToAffine(Z_IDENT), IDENT)).toBe(0);
  });

  it('canonical keys are value keys (order of computation does not matter)', () => {
    const a = zMul(zTranslation([1, 2, 3, 4]), zRotation5());
    const b = zMul(zMul(zTranslation([1, 2, 3, 4]), zRotation3()), zRotation2());
    expect(zAffineKey(a)).toBe(zAffineKey(b));
    const { xfs } = samples();
    const keys = new Set(xfs.map(zAffineKey));
    expect(keys.size).toBe(xfs.length);
  });
});

// tiny local helpers for the key test (avoid importing zRotation twice)
function zRotation5(): ZAffine {
  return { k: 5, m: 0, t: Z_ZERO };
}
function zRotation3(): ZAffine {
  return { k: 3, m: 0, t: Z_ZERO };
}
function zRotation2(): ZAffine {
  return { k: 2, m: 0, t: Z_ZERO };
}

describe('exact substitution system vs float oracle', () => {
  it('supertile transforms match buildSystem child xforms at levels 1..5', () => {
    for (let level = 1; level <= 5; ++level) {
      const Ts = zSupertileTransforms(level);
      expect(Ts).toHaveLength(8);
      for (const T of Ts) expect(T.m).toBe(1); // every substitution child mirrors
      const sys = buildSystem('spectre', level);
      for (const label of ['Delta', 'Gamma', 'Sigma', 'Psi'] as const) {
        const node = sys[label];
        if (node.kind !== 'meta') throw new Error('supertile is not meta');
        for (const child of node.children) {
          expect(maxAffineDiff(zToAffine(Ts[child.pos]), child.xform)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('Gamma2 pair transform matches buildSpectreBase', () => {
    const base = buildSystem('spectre', 0);
    const gamma = base['Gamma'];
    if (gamma.kind !== 'meta') throw new Error('Gamma base is not meta');
    expect(maxAffineDiff(zToAffine(zGamma2Xform()), gamma.children[1].xform)).toBeLessThan(1e-12);
  });

  it('every leaf transform agrees with the float pipeline at level 4 (Delta and Gamma roots)', () => {
    const level = 4;
    const sys = buildSystem('spectre', level);
    for (const rootLabel of ['Delta', 'Gamma'] as const) {
      let count = 0;
      let maxErr = 0;
      const walk = (node: TileNode, depth: number, fx: Affine, zx: ZAffine): void => {
        if (node.kind === 'leaf') {
          maxErr = Math.max(maxErr, maxAffineDiff(zToAffine(zx), fx));
          count++;
          return;
        }
        for (const child of node.children) {
          const zchild =
            depth === 0
              ? child.pos === 0
                ? Z_IDENT
                : zGamma2Xform()
              : zSupertileTransforms(depth)[child.pos];
          walk(
            child.node,
            depth > 0 ? depth - 1 : 0,
            mul(fx, child.xform),
            zMul(zx, zchild),
          );
        }
      };
      walk(sys[rootLabel], level, IDENT, Z_IDENT);
      expect(count).toBe(flatten(sys[rootLabel]).length);
      expect(maxErr).toBeLessThan(1e-10);
    }
  });
});

describe('drift-free depth (the reason this module exists)', () => {
  it('floats drift on a 20-level path; exact composition stays exactly invertible', () => {
    // Compose child transforms root-first down a 20-level path (alternating
    // slots 5/3), the way flatten() does. The float twin rounds each child to
    // floats ONCE (table-driven, like any float renderer would).
    let zc: ZAffine = Z_IDENT;
    let fc: Affine = IDENT;
    let drift = 0;
    for (let level = 24; level >= 1; --level) {
      const child = zSupertileTransforms(level)[level % 2 ? 5 : 3];
      zc = zMul(zc, child);
      fc = mul(fc, zToAffine(child));
      drift = Math.max(drift, maxAffineDiff(zToAffine(zc), fc));
    }
    // float pipeline drifts measurably (deterministic on IEEE754 doubles)...
    expect(drift).toBeGreaterThan(1e-8);
    // ...while the exact transform is still exactly invertible
    expect(zAffineEq(zMul(zInv(zc), zc), Z_IDENT)).toBe(true);
    // and stays far inside the int53 safety envelope (~1.53 bits/level)
    expect(zAffineMaxAbsCoeff(zc)).toBeLessThan(2 ** 40);
    expect(zAffineMaxAbsCoeff(zc)).toBeLessThan(Z_COEFF_LIMIT);
  });

  it('re-anchoring identity: inv(X_l) o Ts_l[s] == inv(X_{l-1}) exactly, 24 levels', () => {
    // X_l = anchor -> A_l composed transform for an arbitrary slot chain; the
    // world transform of a node must not change when the chain grows. This is
    // the exact identity the un-rooted engine relies on.
    const slots = [1, 4, 7, 3, 5, 0, 6, 1, 4, 7, 3, 5, 0, 6, 1, 4, 7, 3, 5, 0, 6, 1, 4, 7];
    let X: ZAffine = Z_IDENT;
    let prevWorld: ZAffine = Z_IDENT;
    for (let level = 1; level <= slots.length; ++level) {
      const Ts = zSupertileTransforms(level)[slots[level - 1]];
      X = zMul(Ts, X);
      const world = zInv(X);
      expect(zAffineEq(zMul(world, Ts), prevWorld)).toBe(true);
      prevWorld = world;
    }
    expect(zAffineMaxAbsCoeff(X)).toBeLessThan(Z_COEFF_LIMIT);
  });
});
