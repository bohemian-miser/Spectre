import { describe, expect, it } from 'vitest';
import {
  COS30,
  DEFAULT_LINK_STATE,
  decodeExplorerQuery,
  encodeExplorerQuery,
  SIN30,
  buildSystem,
  createUnrootedEngine,
  decodeWorldChain,
  encodeWorldChain,
  mul,
  transPt,
  zX,
  zY,
  type Affine,
  type MetaNode,
  type ZAffine,
} from '../../../core';
import { CircuitShapes } from '../circuitShapes';
import { circuitChain } from '../explorerLink';

const apply = (W: ZAffine, p: { x: number; y: number }) => {
  const c = COS30[W.k];
  const s = SIN30[W.k];
  const y = W.m ? -p.y : p.y;
  return { x: c * p.x - s * y + zX(W.t), y: s * p.x + c * y + zY(W.t) };
};

describe('a world started from a circuit’s first tile', () => {
  const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'000100000'].map((ch) => parseInt(ch, 36)), 6, 100);
  const born = cs.born.filter((b) => b.level >= 4).sort((a, b) => b.length - a.length).slice(0, 3);

  it('round-trips its chain through text, and refuses a chain the substitution does not allow', () => {
    expect(born.map((c) => c.level)).toEqual(expect.arrayContaining([6]));
    expect(born).toHaveLength(3);
    for (const c of born) {
      const chain = circuitChain(c.type, cs.firstTile(c).path);
      expect(decodeWorldChain(encodeWorldChain(chain))).toEqual(chain);
    }
    expect(decodeWorldChain('Xi-0-Gamma')).toBeNull();
    expect(decodeWorldChain('Nope')).toBeNull();
  });

  it('places the supertile where the substitution’s own transforms put it', () => {
    for (const c of born) {
      const { path } = cs.firstTile(c);
      const engine = createUnrootedEngine(7, 'hex', circuitChain(c.type, path));
      expect(engine.ancestorType(c.level)).toBe(c.type);
      expect(engine.anchorType()).toBe(path[path.length - 1].type);
      // The first tile's frame in the supertile's, composed from buildSystem's float transforms.
      let M: Affine = [1, 0, 0, 0, 1, 0];
      let node = buildSystem('hex', c.level)[c.type] as MetaNode;
      for (const step of path) {
        const child = node.children.find((ch) => ch.pos === step.pos)!;
        expect(child.node.type).toBe(step.type);
        M = mul(M, child.xform as Affine);
        node = child.node as MetaNode;
      }
      // The world is the first tile's frame, so the supertile's world transform undoes M.
      const W = engine.ancestorWorldXform(c.level);
      for (const p of [
        { x: 0, y: 0 },
        { x: 3.5, y: -1.25 },
        { x: -40, y: 17 },
      ]) {
        const back = apply(W, transPt(M, p));
        expect(back.x).toBeCloseTo(p.x, 6);
        expect(back.y).toBeCloseTo(p.y, 6);
      }
    }
  });

  it('draws the first tile at the origin, with the circuit’s first chord across it', () => {
    for (const c of born) {
      const { path, chord } = cs.firstTile(c);
      const engine = createUnrootedEngine(7, 'hex', circuitChain(c.type, path));
      const cut = engine.query({ cx: 0, cy: 0, halfW: 3, halfH: 3 }, 5000);
      expect(cut.cutLevel).toBe(0);
      let found = false;
      for (let i = 0; i < cut.count; i++) if (Math.hypot(cut.pos[2 * i], cut.pos[2 * i + 1]) < 1e-4) found = true;
      expect(found).toBe(true);
      // The chord's ends are crossings on the first tile's edges, a tile's width from the origin at most.
      const W = engine.ancestorWorldXform(c.level);
      for (const p of chord) expect(Math.hypot(apply(W, p).x, apply(W, p).y)).toBeLessThan(2.5);
    }
  });
});

describe('a born circuit’s first tile', () => {
  it('is entered by the circuit: its chord is the first step of the drawn loop', () => {
    const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'000100000'].map((ch) => parseInt(ch, 36)), 5, 100);
    expect(cs.born.length).toBeGreaterThan(4);
    for (const c of cs.born.slice(0, 5)) {
      const pts = cs.shape(c, 0);
      const { chord } = cs.firstTile(c);
      expect(chord[0].x).toBeCloseTo(pts[0].x, 9);
      expect(chord[0].y).toBeCloseTo(pts[0].y, 9);
      expect(chord[1].x).toBeCloseTo(pts[1].x, 9);
      expect(chord[1].y).toBeCloseTo(pts[1].y, 9);
    }
  });
});

describe('the Explorer’s link', () => {
  it('keeps a legal world chain and drops one the substitution does not allow', () => {
    const wc = 'Psi-0-Psi-0-Psi-2-Psi-0-Xi-0-Delta-1-Gamma';
    expect(decodeWorldChain(wc)).not.toBeNull();
    const q = encodeExplorerQuery({ ...DEFAULT_LINK_STATE, family: 'hex', mode: 'infinite', worldChain: wc });
    expect(q).toContain(`wc=${wc}`);
    expect(decodeExplorerQuery(q).worldChain).toBe(wc);
    expect(decodeExplorerQuery(q.replace('Delta-1-Gamma', 'Delta-0-Gamma')).worldChain).toBeUndefined();
  });
});
