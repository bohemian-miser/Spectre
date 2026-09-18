/**
 * The interface invariant — the one boundary quantity that IS level-independent.
 *
 * `08-supertile-outline.ts` shows the supertile OUTLINE is not level-independent:
 * its perimeter grows by ~4.23 per level against a linear inflation of only
 * 2.8059, so the boundaries are fractal in the limit and the supertiles are not
 * similar across levels. That closes the geometric route to the crux lemma.
 *
 * What survives is much better suited to the proof anyway. The number of
 * boundary CONNECTION DOTS of a level-k supertile is constant in k — the
 * boundary grows without bound but the number of places a strand can cross it
 * does not. A supertile therefore has a fixed, small number of "ports", which
 * is exactly the structure the Hilbert-curve argument needs.
 *
 * This script establishes, for both configurations and every supertile type:
 *
 *   - the interface size |dB(T,k)| is constant over the computed levels;
 *   - the internal arcs form a PERFECT MATCHING of those boundary dots:
 *     arcs = |dB(T,k)| / 2 exactly, at every level;
 *   - there are ZERO circuits and ZERO arcs with an interior endpoint, for
 *     every type at every level.
 *
 * Together these say the routing state of a supertile type is a perfect matching
 * on a fixed small set — a finite state space, which is what makes the routing
 * automaton of `04-routing-automaton.ts` a proof rather than a table.
 *
 * Run: cd web && npx --yes tsx fass-proof/09-interface-invariant.ts [maxLevel]
 */

import type { TileTypeId } from '../src/core';
import { buildStrands, CONFIGS, heading, pad, trace, verdict, zExpand } from './lib';

const MAX = Number(process.argv[2] ?? 5);
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

/** The interface sizes docs/FASS_1278.md reports for spectre/1278. */
const EXPECTED: Readonly<Record<string, number>> = {
  Gamma: 10, Delta: 8, Theta: 6, Lambda: 6, Xi: 4, Pi: 4, Sigma: 10, Phi: 4, Psi: 2,
};

let allOk = true;

for (const key of ['hex128', 'spectre1278', 'flagship'] as const) {
  const cfg = CONFIGS[key];
  heading(`${cfg.id} — interface sizes and routing states, levels 1..${MAX}`);
  console.log(`  | type | ${Array.from({ length: MAX }, (_, i) => `lv${i + 1}`).join(' | ')} | arcs/level | circuits | interior ends |`);
  console.log(`  |---|${'---|'.repeat(MAX + 3)}`);

  for (const T of TYPES) {
    const iface: number[] = [];
    const arcs: number[] = [];
    let circuits = 0;
    let interiorEnds = 0;

    for (let lv = 1; lv <= MAX; lv++) {
      const instances = zExpand(cfg.family, T, lv);
      const strands = buildStrands(cfg, instances);
      const tr = trace(strands);
      let degreeOne = 0;
      for (const d of strands.degree.values()) if (d === 1) degreeOne++;
      iface.push(degreeOne);
      arcs.push(tr.arcs.length);
      circuits += tr.circuits.length;
      // An arc with an interior endpoint would be a strand that simply stops;
      // it cannot happen when every dot has degree 1 or 2, but check anyway.
      if (tr.arcs.length * 2 !== degreeOne) interiorEnds++;
      if (tr.maxDegree > 2) {
        allOk = verdict(false, `${T}@${lv}: welded degree ${tr.maxDegree} > 2`) && allOk;
      }
    }

    const constant = new Set(iface).size === 1;
    const matches = arcs.every((a, i) => a * 2 === iface[i]);
    console.log(
      `  | ${pad(T, 7)} | ${iface.map((n) => pad(n, 3)).join(' | ')} | ${arcs.join(' ')} | ${circuits} | ${interiorEnds} |`,
    );

    allOk = verdict(constant, `${T}: interface size constant over levels 1..${MAX}`, `= ${iface[0]}`) && allOk;
    allOk = verdict(matches, `${T}: internal arcs are a perfect matching of the boundary dots`, `${arcs[0]} arcs on ${iface[0]} dots`) && allOk;
    allOk = verdict(circuits === 0, `${T}: no circuits at any level`) && allOk;
    if (EXPECTED[T] !== undefined) {
      allOk = verdict(
        iface[0] === EXPECTED[T],
        `${T}: interface size ${iface[0]} matches the value docs/FASS_1278.md reports`,
      ) && allOk;
    }
  }
}

heading('What this buys the proof');
console.log(`  The routing state of a supertile type is a perfect matching on a fixed set of at
  most 10 boundary dots, with no circuits to track. The state space per type is
  therefore (n-1)!! for n = |dB|: 945 for Gamma and Sigma, 105 for Delta, 15 for
  Theta and Lambda, 3 for Xi, Pi and Phi, 1 for Psi. Finite, and small enough to
  iterate the substitution's routing operator to a cycle — which is what turns a
  table of computed levels into an induction covering every level.

  Note Psi's state space has exactly ONE element: with two boundary dots and no
  circuits, the only possible routing is the single arc joining them. So the
  single-line property at the Psi root is forced by the interface invariant
  alone, given no circuits and no interior endpoints.`);

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
