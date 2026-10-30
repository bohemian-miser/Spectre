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
import { agreement, buildShapes, closingKey, foundations, predictHarmonic, readCircuit, seamCrossings, tileAccount } from '../src/pages/foundations/foundations';

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
  /** Copies of the circuit predicted from in a Delta supertile. */
  copies: number;
}

/** A level of a Delta supertile: its room (the children's tails), what closes there, the chords the predictions say harmonics take, and the tails left. */
interface LevelRow {
  level: number;
  chords: number;
  room: number;
  predictedHarmonic: number;
  harmonic: number;
  reborn: number;
  foundational: number;
  tails: number;
}
const levelRows: LevelRow[] = [];

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
  for (const a of [...reps.values()].filter((x) => x.type === 'Delta')) {
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
      floor, visits, built: 'not built', status: null, seconds: (Date.now() - t0) / 1000, copies: cs.copiesOf(a),
    };
    pending.push({ row, key: b ? closingKey(b) : null });
    rows.push(row);
  }
  console.log(`level ${n + 2}: ${pending.length} predicted from level ${n}; building`);
  cs.extend(n + 2);
  const f = foundations(cs, { floor: FLOOR });
  const byKey = new Map(f.closings.map((c) => [c.key, c] as const));
  const acc = tileAccount(cs, f).find((r) => r.level === n + 2 && r.type === 'Delta')!;
  levelRows.push({
    level: n + 2, chords: acc.chords, room: acc.room,
    predictedHarmonic: pending.reduce((s, { row }) => s + (row.predicted ? row.predicted.length * row.copies : 0), 0),
    harmonic: acc.closedHere.harmonic ?? 0, reborn: acc.closedHere.reborn ?? 0, foundational: acc.closedHere.foundational ?? 0, tails: acc.tails,
  });
  console.log(`  Delta at ${n + 2}: room ${acc.room}, harmonics predicted ${levelRows[levelRows.length - 1].predictedHarmonic}, built ${acc.closedHere.harmonic}, reborn ${acc.closedHere.reborn}, new ${acc.closedHere.foundational}, tails ${acc.tails}`);
  for (const { row, key } of pending) {
    const c = key ? byKey.get(key) : undefined;
    row.built = c ? 'closes there' : 'not among the closings';
    row.status = c ? c.status : null;
    console.log(`  ${row.fromLength}@${n} ${row.family} -> ${row.predicted ? `${row.predicted.length} tiles, ${row.predicted.steps} steps` : 'none'}: ${row.built}${c ? ` (${c.status})` : ''}, agrees from level ${row.floor} of ${n}`);
  }
}
writeFileSync(resolve(__dirname, `../public/data/foundations/hex-${rule}/${combo}-predicted.json`), JSON.stringify({ family: 'hex', rule, combo, floor: FLOOR, levels: L, rows, levelRows }));
