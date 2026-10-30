/**
 * The harmonics engine against a reference that reads each level from the
 * top on its own (`visitsAt`), cancels backtracks one at a time by scanning
 * from the start, and measures each circuit tile by tile (`tileLoop`).
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes, familyOf, tileLoop, type BornCircuit } from '../../shapes/circuitShapes';
import { HarmonicsEngine, type CircuitInfo, type HarmonicsResult } from '../harmonicsJob';
import { cancelBacktracks, cancelBacktracksAt, extraRuns, lineages, readDown, token, visitsAt, type Reading, type Visit } from '../readings';

const RULE = [0, 2, 3, 4, 6, 8];

/** Cancels the first backtrack A B A in the sequence as it stands (cyclically), until none is left. */
function cancelOneByOne(visits: readonly Visit[]): Visit[] {
  let out = [...visits];
  for (;;) {
    const n = out.length;
    let hit = -1;
    for (let i = 0; i < n && hit < 0; i++) if (n > 2 && out[(i + 2) % n].id === out[i].id && out[(i + 1) % n].id !== out[i].id) hit = i;
    if (hit < 0) return out;
    const idx = [hit, (hit + 1) % n, (hit + 2) % n];
    const merged: Visit = { ...out[hit], tiles: idx.reduce((s, q) => s + out[q].tiles, 0) };
    const set = new Set(idx);
    out = out.flatMap((v, q) => (q === hit ? [merged] : set.has(q) ? [] : [v]));
  }
}

function readFromTop(cs: CircuitShapes, c: BornCircuit, maxVisits: number): { readings: Reading[]; readFrom: number } {
  const out: Reading[] = [];
  let k = c.level - 1;
  for (; k >= 0; k--) {
    const raw = visitsAt(cs, c, k);
    const cut = cancelOneByOne(raw);
    out.unshift({ level: k, raw: raw.length, tokens: cut.map((v) => token(v, k, c.level)), tiles: cut.map((v) => v.tiles) });
    if (raw.length * 6 > maxVisits) break;
  }
  return { readings: out, readFrom: Math.max(0, k) };
}

/** The engine's result, every part computed the reference way. */
function reference(combo: string, level: number): Omit<HarmonicsResult, 'seconds'> {
  const cs = new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), level, 1, true);
  const top = new Map<string, number>();
  for (const c of cs.born) top.set(familyOf(c), Math.max(top.get(familyOf(c)) ?? 0, c.length));
  const kept: { family: string; length: number; rg: number; circuit: BornCircuit }[] = [];
  for (const c of [...cs.born].sort((a, b) => a.level - b.level || b.length - a.length)) {
    const { rg } = tileLoop(cs.shape(c, 0), 64);
    if (!kept.some((o) => o.length === c.length && Math.abs(o.rg - rg) <= 1e-6 * rg)) kept.push({ family: familyOf(c), length: c.length, rg, circuit: c });
  }
  const rank = (f: string) => -(top.get(f) ?? 0);
  kept.sort((a, b) => rank(a.family) - rank(b.family) || a.family.localeCompare(b.family) || a.circuit.level - b.circuit.level || b.length - a.length);
  const circuits: CircuitInfo[] = kept
    .map(({ circuit: c }) => {
      const { readings, readFrom } = readFromTop(cs, c, 1500000);
      const outlines: Float64Array[] = [];
      let drawnFrom = c.level - 1;
      for (let k = c.level - 1; k >= 0; k--) {
        const raw = readings.find((r) => r.level === k)?.raw;
        if (raw === undefined || raw > 3000) break;
        outlines.unshift(Float64Array.from(cs.shape(c, k).flatMap((p) => [p.x, p.y])));
        drawnFrom = k;
      }
      const { path, chord } = cs.firstTile(c);
      return {
        level: c.level,
        type: c.type,
        length: c.length,
        family: familyOf(c),
        readings,
        readFrom,
        outlines,
        drawnFrom,
        first: { path: path.map((p) => [p.type, p.pos] as [string, number]), chord: chord.flatMap((p) => [p.x, p.y]) },
      };
    })
    .sort((a, b) => a.length - b.length || a.level - b.level);
  const ls = lineages(circuits);
  const extras: Record<string, { unmatched: number; runs: string[][] }> = {};
  for (const l of ls) {
    if (l.levels[0] !== false) continue;
    const a = circuits[l.a].readings.find((r) => r.level === 0);
    const b = circuits[l.b].readings.find((r) => r.level === 2);
    const e = a && b ? extraRuns(a.tokens, b.tokens) : null;
    if (e) extras[`${l.a}-${l.b}`] = e;
  }
  return { level, circuits, lineages: ls, extras };
}

describe('cancelling backtracks', () => {
  it('cancels the same visits as cancelling the first backtrack one at a time', () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    for (let trial = 0; trial < 3000; trial++) {
      const n = rand(14);
      const visits: Visit[] = Array.from({ length: n }, () => ({ id: String(rand(1 + rand(4))), type: '', slot: 0, parent: '', tiles: 1 + rand(9) }));
      visits.forEach((v, i) => Object.assign(v, { slot: i }));
      const want = cancelOneByOne(visits);
      expect(cancelBacktracks(visits)).toEqual(want);
      const got = cancelBacktracksAt(
        visits.map((v) => v.id),
        visits.map((v) => v.tiles),
      );
      expect(Array.from(got.keep, (i) => visits[i].slot)).toEqual(want.map((v) => v.slot));
      expect(Array.from(got.tiles)).toEqual(want.map((v) => v.tiles));
    }
  });
});

describe.each(['000100000', '140000001'])('023468 / %s', (combo) => {
  it('reads every circuit born up to level 6 as it reads each level from the top', () => {
    const cs = new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), 6, 1, true);
    for (const c of cs.born) {
      expect(readDown(cs, c)).toEqual(readFromTop(cs, c, Infinity));
      expect(readDown(cs, c, 300)).toEqual(readFromTop(cs, c, 1800));
    }
  });

  it('gives the reference result at level 6, and again a level higher', () => {
    const engine = new HarmonicsEngine({ family: 'hex', subset: RULE, combo, level: 5 });
    engine.next();
    const { seconds: _, ...got } = engine.result();
    expect(got).toEqual(reference(combo, 6));
    engine.next();
    const { seconds: __, ...up } = engine.result();
    expect(up).toEqual(reference(combo, 7));
    expect(engine.result()).toBe(engine.result());
  }, 120000);
});
