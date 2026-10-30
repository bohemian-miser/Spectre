/**
 * The foundational circuits of every combination of a hexagon rule
 * (`src/pages/foundations/foundations.ts`), written for a page to show.
 *
 * Per combination, building up one level at a time: before level n + 1 is
 * built, each circuit closing at level n - 1 has its harmonic predicted
 * (`predictHarmonic`); once built, every closing is sorted into
 * foundational, harmonic and reborn, every prediction is checked against the
 * build, and every chord of every supertile is accounted for, by status and
 * by chain. The predictions from the top level's closings are kept as a
 * forecast of the level above.
 *
 *   node --max-old-space-size=12000 node_modules/.bin/vite-node circuit-classes/foundations-sweep.ts -- 023468 9 [shard shards] [combo,...]
 *
 * Writes `public/data/foundations/hex-<rule>/<combo>.json`; `foundations-index.ts`
 * gathers them into `index.json`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { comboDigitChar, comboOptionCounts } from '../src/core';
import type { BornCircuit } from '../src/pages/shapes/circuitShapes';
import {
  buildShapes,
  chainAccount,
  closingKey,
  foundations,
  longestArcs,
  predictHarmonic,
  seamCrossings,
  tileAccount,
  typeFrequencies,
  type AccountRow,
} from '../src/pages/foundations/foundations';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [rule, lvArg] = args;
const shard = Number(args[2] ?? 0), shards = Number(args[3] ?? 1);
const only = args[4]?.split(',');
const subset = [...rule].map(Number);
const L = Number(lvArg);
const FLOOR = 2;

const counts = comboOptionCounts('hex', subset);
const combos: string[] = [];
const build = (i: number, acc: string): void => {
  if (i === counts.length) { combos.push(acc); return; }
  for (let d = 0; d < counts[i]; d++) build(i + 1, acc + comboDigitChar(d));
};
build(0, '');
const outDir = resolve(__dirname, `../public/data/foundations/hex-${rule}`);
mkdirSync(outDir, { recursive: true });

interface Prediction {
  /** The closing predicted from, and the type it was read in. */
  from: string;
  type: string;
  level: number;
  /** Every closed walk the window gave that reads as the closing from `floor` up, longest first: key, length, steps. */
  walks: { key: string; length: number; steps: number; seams: Record<string, number> }[];
  /** The arcs of the window followed. */
  tried: number;
}

const freq = typeFrequencies('hex');
/** A level's account summed over the types, each weighted by how often a supertile of that type occurs. */
const weighted = (rows: AccountRow[], level: number) => {
  const at = rows.filter((r) => r.level === level);
  const w = (f: (r: AccountRow) => number) => at.reduce((s, r, t) => s + freq[t] * f(r), 0);
  const chords = w((r) => r.chords);
  const buckets = Object.keys(at[0].closed);
  return {
    chords,
    tails: w((r) => r.tails) / chords,
    room: w((r) => r.room) / chords,
    closed: Object.fromEntries(buckets.map((b) => [b, w((r) => r.closed[b]) / chords])),
    closedHere: Object.fromEntries(buckets.map((b) => [b, w((r) => r.closedHere[b]) / chords])),
  };
};

combos.forEach((combo, ci) => {
  if (ci % shards !== shard || (only && !only.includes(combo))) return;
  const t0 = Date.now();
  const cs = buildShapes(subset, combo, 1);
  const predictions: Prediction[] = [];
  const seenLengths = new Set<number>();
  for (let n = 1; n < L; n++) {
    // closings at level n, one per closing (a Delta's when there is one), before level n + 1 is built
    cs.extend(n + 1);
    const reps = new Map<string, BornCircuit>();
    for (const c of cs.born) {
      if (c.level !== n || seenLengths.has(c.length)) continue;
      const k = closingKey(c);
      if (!reps.has(k) || c.type === 'Delta') reps.set(k, c);
    }
    for (const c of cs.born) if (c.level === n) seenLengths.add(c.length);
    for (const [k, a] of reps) {
      if (n < FLOOR + 1) continue;
      const tp = Date.now();
      const p = predictHarmonic(cs, a, FLOOR);
      if (process.env.FOUNDATIONS_TRACE) console.log(`  predict ${k} in ${a.type}: ${(Date.now() - tp) / 1000}s, ${p.tried} arcs`);
      predictions.push({
        from: k, type: a.type, level: n,
        walks: p.predicted.sort((x, y) => y.length - x.length).map((b) => ({ key: closingKey(b), length: b.length, steps: b.steps.length, seams: seamCrossings(b) })),
        tried: p.tried,
      });
    }
  }
  const built = (Date.now() - t0) / 1000;
  const f = foundations(cs, { floor: FLOOR });
  const byKey = new Map(f.closings.map((c) => [c.key, c] as const));
  const checked = predictions.map((p) => {
    const a = byKey.get(p.from);
    const top = p.walks[0];
    if (p.level + 2 > L) return { ...p, verdict: 'forecast' };
    const b = top ? byKey.get(top.key) : undefined;
    const harmonicOf = f.closings.filter((c) => c.status === 'harmonic' && c.of === a?.id).map((c) => c.key);
    const verdict = !top ? (harmonicOf.length ? 'missed' : 'none')
      : !b ? 'not built'
      : b.status === 'harmonic' && b.of === a?.id ? 'confirmed'
      : `built as ${b.status}`;
    return { ...p, verdict };
  });
  const status = tileAccount(cs, f);
  const chains = chainAccount(cs, f);
  const levels = Array.from({ length: L + 1 }, (_, n) => n);
  const arcs = longestArcs(cs);
  const out = {
    family: 'hex', rule, combo, levels: L, floor: FLOOR, lastNew: f.lastNew,
    seconds: { build: built, total: (Date.now() - t0) / 1000 },
    closings: f.closings.filter((c) => c.status !== 'reborn').map((c) => ({
      id: c.id, level: c.level, length: c.length, family: c.family, steps: c.steps, status: c.status, of: c.of, floor: c.floor, root: c.root,
      copies: Object.values(c.copies).reduce((s, x) => s + x, 0), types: Object.keys(c.copies).length,
    })),
    /** Reborn closings, gathered by the closing they repeat and the level: how many closings, and their copies over all types. */
    reborn: (() => {
      const m = new Map<string, { of: number; level: number; length: number; closings: number; copies: number }>();
      for (const c of f.closings) {
        if (c.status !== 'reborn') continue;
        const k = `${c.of}/${c.level}`;
        const e = m.get(k) ?? m.set(k, { of: c.of!, level: c.level, length: c.length, closings: 0, copies: 0 }).get(k)!;
        e.closings++;
        e.copies += Object.values(c.copies).reduce((s, x) => s + x, 0);
      }
      return [...m.values()];
    })(),
    predictions: checked.map((p) => ({
      from: byKey.get(p.from)?.id ?? null, level: p.level, type: p.type, verdict: p.verdict, tried: p.tried,
      walk: p.walks[0] ? { length: p.walks[0].length, steps: p.walks[0].steps, seams: p.walks[0].seams } : null, others: p.walks.slice(1).map((w) => [w.length, w.steps]),
    })),
    account: {
      byStatus: levels.map((n) => weighted(status, n)),
      byChain: levels.map((n) => weighted(chains, n).closed),
      delta: status.filter((r) => r.type === 'Delta').map((r) => ({ level: r.level, chords: r.chords, tails: r.tails, room: r.room, closed: r.closed, closedHere: r.closedHere })),
    },
    longestArcs: levels.map((n) => {
      const at = arcs.filter((a) => a.level === n);
      return { level: n, length: Math.max(...at.map((a) => a.length)), nested: at.filter((a) => a.nested).length };
    }),
  };
  writeFileSync(resolve(outDir, `${combo}.json`), JSON.stringify(out));
  const verdicts = checked.reduce<Record<string, number>>((m, p) => ((m[p.verdict] = (m[p.verdict] ?? 0) + 1), m), {});
  const fnd = f.closings.filter((c) => c.status === 'foundational');
  console.log(`${combo} lastNew=${f.lastNew} foundational=${fnd.length} closings=${f.closings.length} tails@${L}=${out.account.byStatus[L].tails.toFixed(4)} predictions=${JSON.stringify(verdicts)} ${out.seconds.total.toFixed(1)}s`);
});
