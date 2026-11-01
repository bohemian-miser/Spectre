/**
 * The tail classes against independent sources, in 023468 · 140000001:
 * the open strands of a level-4 Delta patch, traced from the geometry
 * (`runAnalysis`), followed up by Identify's walk through each ancestor's
 * children (`Strand`, `CircuitShapes.walkAbove`); the shares of what the
 * tails become in the Foundations data (`tailFates`), against level-4
 * supertiles sampled across a level-9 Delta; and the routes above the full
 * tables (`SparseRoutes`) against a build that holds the same levels.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSystem, comboToMatchingIndices, runAnalysis, type HexType, type MetaNode } from '../../../core';
import { matchingVectorToRecord } from '../../../lib/matchingModel';
import { wordKey } from '../../foundations/foundations';
import { tailFates, type PageCombo } from '../../foundations/pageData';
import { ancestry, Strand } from '../../identify/identify';
import { openStrandStart } from '../HarmonicSearch';
import { classKey, placeTiles, slotPath, TailClassifier, tailShapes, type TailInput, type TailShapes } from '../tailClasses';

const RULE = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';
const known = JSON.parse(readFileSync(resolve(__dirname, `../../../../public/data/foundations/hex-023468/${COMBO}.json`), 'utf8')) as PageCombo;
const noLive = (): PageCombo => {
  throw new Error('the data are given');
};

let full: TailShapes | null = null;
const shapes = (): TailShapes => (full ??= tailShapes(RULE, COMBO, known, noLive, 9));

/** The open strands of a level-L patch as the Explorer traces them. */
function patchTails(root: HexType, L: number): TailInput[] {
  const r = runAnalysis({ id: 1, family: 'hex', rootTile: root, level: L, subset: RULE, matchingIndexByType: matchingVectorToRecord('hex', comboToMatchingIndices('hex', RULE, COMBO)), pathTiles: true });
  const node = buildSystem('hex', L)[root];
  return r.tails.map((p, i) => {
    const tiles = r.tailTiles![i];
    return { code: tiles[0], edge: openStrandStart('hex', node, L, tiles[0], p.points[0])!.edge, tiles: tiles.length };
  });
}

describe('the tails of a level-4 Delta patch', () => {
  const L = 4;
  const tails = patchTails('Delta', L);

  it('each closes as Identify follows it, into the circuit the build has there', () => {
    const s = shapes();
    const tc = new TailClassifier({ subset: RULE, combo: COMBO, root: 'Delta', level: L, tails, cap: 10 }, s);
    const fates = tc.run();
    expect(tails.length).toBe(190);
    let closed = 0;
    tails.forEach((t, i) => {
      const f = fates[i];
      expect(f).not.toBeNull();
      const strand = new Strand(s.cs, ancestry(slotPath(t.code, L), L, 9), t.edge);
      let n = 1;
      let found = strand.up(1);
      while (found.kind === 'open' && n < 9) found = strand.up(++n);
      if (found.kind === 'closed') {
        closed++;
        expect(f!.state).toBe('closed');
        const c = tc.closings[(f as { closing: number }).closing];
        expect([c.level, c.length, c.word]).toEqual([found.circuit.level, found.circuit.length, wordKey(s.cs, found.circuit)]);
        // a circuit the combination's data names
        expect(c.named).not.toBeNull();
      } else {
        expect(found.kind).toBe('open');
        expect(f!.state === 'open' || (f!.state === 'closed' && tc.closings[(f as { closing: number }).closing].level === 10)).toBe(true);
      }
    });
    expect(closed).toBe(39);
  }, 60000);

  it('is classified the same from routes above a build cut at the patch level as from the full build', () => {
    const job = { subset: RULE, combo: COMBO, root: 'Delta' as const, level: L, tails, cap: 10 };
    const a = new TailClassifier(job, shapes());
    const b = new TailClassifier(job, tailShapes(RULE, COMBO, known, noLive, 9, undefined, L));
    const fa = a.run();
    const fb = b.run();
    const name = (tc: TailClassifier, f: (typeof fa)[number]) => {
      if (f?.state !== 'closed') return f;
      const c = tc.closings[f.closing];
      return { level: c.level, length: c.length, word: c.word, class: classKey(c), order: c.named?.order };
    };
    let routed = 0;
    fa.forEach((f, i) => {
      expect(name(b, fb[i])).toEqual(name(a, f));
      if (fb[i]?.state === 'closed' && b.closings[(fb[i] as { closing: number }).closing].via === 'routes') routed++;
    });
    // every closing above level 5 came from the routes
    expect(routed).toBeGreaterThan(0);
  }, 60000);
});

describe('what the tails become, summed over patches', () => {
  it('matches the Foundations data level by level, within the sampling', () => {
    const s = shapes();
    const L = 4;
    const TOP = 9;
    const size = new Map<string, number>();
    const tilesIn = (n: number, t: string): number => {
      const k = `${n}/${t}`;
      if (!size.has(k)) size.set(k, n === 0 ? 1 : (buildSystem('hex', n)[t] as MetaNode).children.reduce((x, c) => x + tilesIn(n - 1, c.node.type), 0));
      return size.get(k)!;
    };
    let seed = 12345;
    const random = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    // per patch: its tail tiles, and its closed tiles by chain root and level
    const patches: { total: number; closed: Map<number, number[]> }[] = [];
    for (let k = 0; k < 40; k++) {
      // a level-4 supertile at random in a level-9 Delta, each tile as likely
      let type = 'Delta';
      const above: { type: HexType; slot: number }[] = [];
      for (let n = TOP; n > L; n--) {
        const kids = (buildSystem('hex', n)[type] as MetaNode).children;
        let r = random() * kids.reduce((x, c) => x + tilesIn(n - 1, c.node.type), 0);
        const ch = kids.find((c) => (r -= tilesIn(n - 1, c.node.type)) < 0) ?? kids[kids.length - 1];
        above.unshift({ type: type as HexType, slot: ch.pos });
        type = ch.node.type;
      }
      const T = s.cs.levels[L][type];
      const tails: TailInput[] = [];
      for (const [at, p] of placeTiles(s.cs, type, L)) if (T.mate(p) > p) tails.push({ code: Math.floor(at / 8), edge: at % 8, tiles: T.len(p) });
      const tc = new TailClassifier({ subset: RULE, combo: COMBO, root: type as HexType, level: L, tails, cap: TOP + 1, above }, s);
      const closed = new Map<number, number[]>();
      let total = 0;
      tc.run().forEach((f, i) => {
        total += tails[i].tiles;
        if (f?.state !== 'closed') return;
        const c = tc.closings[f.closing];
        expect(c.named).not.toBeNull();
        const row = closed.get(c.named!.root.id) ?? closed.set(c.named!.root.id, []).get(c.named!.root.id)!;
        row[c.level] = (row[c.level] ?? 0) + tails[i].tiles;
      });
      patches.push({ total, closed });
    }
    const N = patches.length;
    const all = patches.reduce((x, p) => x + p.total, 0);
    const fates = tailFates(known, L);
    let compared = 0;
    for (const f of fates) {
      const m = L + f.k;
      if (m > TOP) break;
      for (const [root, share] of f.chains) {
        const by = patches.map((p) => (p.closed.get(root) ?? []).slice(0, m + 1).reduce((x, v) => x + (v ?? 0), 0));
        const got = by.reduce((x, v) => x + v, 0) / all;
        // the standard error of a share taken over patches of unequal size
        const se = Math.sqrt(by.reduce((x, c, i) => x + (c - got * patches[i].total) ** 2, 0) / (N * (N - 1))) / (all / N);
        expect(Math.abs(got - share)).toBeLessThan(3 * se + 0.002);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(10);
  }, 120000);
});
