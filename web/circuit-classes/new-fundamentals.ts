/**
 * Per combination of a rule: the circuits born at each level of the
 * renormalisation, and how many of them are new, that is, not a harmonic of a
 * circuit born two levels below (`src/pages/harmonics/readings.ts`). The last
 * level that brings a new fundamental is where a search for circuits could
 * stop, for that combination, as far as the levels run here show.
 *
 *   npx tsx circuit-classes/new-fundamentals.ts 023468 7
 *   npx tsx circuit-classes/new-fundamentals.ts 023468 9 000100000,011000101
 *
 * One line per combination: `lastNew`, the number of distinct circuits, and
 * per level `level:born/new`.
 */
import { comboDigitChar, comboOptionCounts } from '../src/core';
import { HarmonicsEngine } from '../src/pages/harmonics/harmonicsJob';

if (process.argv[1]?.endsWith('new-fundamentals.ts')) {
  const [rule, lvArg, which] = process.argv.slice(2);
  const subset = [...rule].map(Number);
  const level = Number(lvArg);
  const counts = comboOptionCounts('hex', subset);
  const combos: string[] = [];
  const build = (i: number, acc: string): void => {
    if (i === counts.length) { combos.push(acc); return; }
    for (let d = 0; d < Math.max(1, counts[i]); d++) build(i + 1, acc + (comboDigitChar(d) ?? '0'));
  };
  build(0, '');
  for (const combo of which ? which.split(',') : combos) {
    const t0 = Date.now();
    const r = new HarmonicsEngine({ family: 'hex', subset, combo, level }).result();
    const harmonic = new Set(r.lineages.map((l) => l.b));
    const levels = [...new Set(r.circuits.map((c) => c.level))].sort((a, b) => a - b);
    const per = levels.map((l) => {
      const born = r.circuits.filter((c) => c.level === l);
      const fresh = born.filter((c) => !harmonic.has(r.circuits.indexOf(c)));
      return `${l}:${born.length}/${fresh.length}`;
    });
    const lastNew = Math.max(0, ...r.circuits.filter((_, i) => !harmonic.has(i)).map((c) => c.level));
    console.log(`${combo} lastNew=${lastNew} circuits=${r.circuits.length} ${per.join(' ')} ${Date.now() - t0}ms`);
  }
}
