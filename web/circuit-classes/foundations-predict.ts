/**
 * Harmonics predicted before their level is built, then built and checked,
 * for one combination, level after level.
 *
 * With the renormalisation built to level n + 1, each circuit closing at
 * level n that does not repeat an earlier one has its harmonic at level
 * n + 2 predicted (`predictHarmonic`): the closed walk through the children
 * of a level-(n + 2) supertile of its type that reads as it from the floor
 * up. Then level n + 2 is built and the prediction looked up among the
 * circuits closing there: same length, same family, same cyclic sequence of
 * child slots (so the same seam crossings, in order).
 *
 *   node --max-old-space-size=12000 node_modules/.bin/vite-node circuit-classes/foundations-predict.ts -- 023468 140000001 11
 *
 * Writes `public/data/foundations/hex-<rule>/<combo>-predicted.json`.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { familyOf, type BornCircuit } from '../src/pages/shapes/circuitShapes';
import { agreement, buildShapes, closingKey, foundations, predictHarmonic, readCircuit, seamCrossings } from '../src/pages/foundations/foundations';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [rule, combo, lvArg] = args;
const subset = [...rule].map(Number);
const L = Number(lvArg);
const FLOOR = 2;

interface Row {
  fromLevel: number;
  fromLength: number;
  family: string;
  type: string;
  predicted: { length: number; steps: number; seams: Record<string, number> } | null;
  /** The agreement of the prediction with the circuit it came from: the lowest level of the latter from which every level up agrees. */
  floor: number | null;
  /** Visits per level of the prediction, top down, as far as read. */
  visits: number[];
  built: 'closes there' | 'not among the closings' | 'not built';
  status: string | null;
  seconds: number;
}

const cs = buildShapes(subset, combo, 2);
const rows: Row[] = [];
const seen = new Set<number>();
for (let n = 2; n + 2 <= L; n++) {
  cs.extend(n + 1);
  const reps = new Map<string, BornCircuit>();
  for (const c of cs.born) {
    if (c.level !== n || seen.has(c.length)) continue;
    const k = closingKey(c);
    if (!reps.has(k) || c.type === 'Delta') reps.set(k, c);
  }
  for (const c of cs.born) if (c.level === n) seen.add(c.length);
  const pending: { row: Row; key: string | null }[] = [];
  for (const a of reps.values()) {
    if (n <= FLOOR) continue;
    const t0 = Date.now();
    const p = predictHarmonic(cs, a, FLOOR);
    const b = p.predicted.sort((x, y) => y.length - x.length)[0];
    let floor: number | null = null;
    let visits: number[] = [];
    if (b) {
      const rb = readCircuit(cs, b, FLOOR + 2);
      floor = agreement(p.reading, a.level, rb).floor;
      visits = rb.raw.slice(rb.lowest).reverse();
    }
    const row: Row = {
      fromLevel: n, fromLength: a.length, family: familyOf(a), type: a.type,
      predicted: b ? { length: b.length, steps: b.steps.length, seams: seamCrossings(b) } : null,
      floor, visits, built: 'not built', status: null, seconds: (Date.now() - t0) / 1000,
    };
    pending.push({ row, key: b ? closingKey(b) : null });
    rows.push(row);
  }
  console.log(`level ${n + 2}: ${pending.length} predicted from level ${n}; building`);
  cs.extend(n + 2);
  const f = foundations(cs, { floor: FLOOR });
  const byKey = new Map(f.closings.map((c) => [c.key, c] as const));
  for (const { row, key } of pending) {
    const c = key ? byKey.get(key) : undefined;
    row.built = c ? 'closes there' : 'not among the closings';
    row.status = c ? c.status : null;
    console.log(`  ${row.fromLength}@${n} ${row.family} -> ${row.predicted ? `${row.predicted.length} tiles, ${row.predicted.steps} steps` : 'none'}: ${row.built}${c ? ` (${c.status})` : ''}, agrees from level ${row.floor} of ${n}`);
  }
}
writeFileSync(resolve(__dirname, `../public/data/foundations/hex-${rule}/${combo}-predicted.json`), JSON.stringify({ family: 'hex', rule, combo, floor: FLOOR, levels: L, rows }));
