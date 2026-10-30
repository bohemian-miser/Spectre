/**
 * The lengths along a harmonic chain against a linear recurrence, and the
 * recurrence's next term against the circuit the renormalisation closes there.
 *
 * In 023468 / 140000001 the chains of families 147 and 07 close one circuit
 * a level, and their lengths s(n) satisfy, from level 4 on,
 *
 *   s(n + 3) - 8 s(n + 2) + 7 s(n + 1) - 3 s(n) = c(n mod 2),
 *
 * with c alternating between two constants, so (x^3 - 8x^2 + 7x - 3)(x^2 - 1)
 * annihilates them. This script builds to `level`, lists each chain's
 * lengths and the left-hand side, takes the next length from the recurrence,
 * and finds the circuit closing at `level + 1` from the tables up to `level`
 * alone (`predictHarmonic` from the chain's circuit at `level - 1`, walks
 * unread, since they run to billions of tiles).
 *
 *   node --max-old-space-size=12000 node_modules/.bin/vite-node circuit-classes/foundations-recurrence.ts -- 023468 140000001 11 147,07
 */
import { buildShapes, predictHarmonic, substitutionMatrix } from '../src/pages/foundations/foundations';
import { leafOrder } from '../src/core';
import { familyOf } from '../src/pages/shapes/circuitShapes';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [rule, combo, lvArg, famArg] = args;
const L = Number(lvArg);
const families = famArg.split(',');
const cs = buildShapes([...rule].map(Number), combo, L);
for (const fam of families) {
  // the chain: the longest circuit of the family closing in a Delta at each level
  const byLevel = new Map<number, number>();
  for (const c of cs.born) if (c.type === 'Delta' && familyOf(c) === fam) byLevel.set(c.level, Math.max(byLevel.get(c.level) ?? 0, c.length));
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const s = levels.map((n) => byLevel.get(n)!);
  const lhs = s.slice(3).map((_, i) => s[i + 3] - 8 * s[i + 2] + 7 * s[i + 1] - 3 * s[i]);
  console.log(`family ${fam}: levels ${levels.join(' ')}`);
  console.log(`  lengths ${s.join(' ')}`);
  console.log(`  s(n+3) - 8 s(n+2) + 7 s(n+1) - 3 s(n): ${lhs.join(' ')}`);
  const k = s.length;
  const next = 8 * s[k - 1] - 7 * s[k - 2] + 3 * s[k - 3] + lhs[lhs.length - 2];
  const a = cs.born.find((c) => c.level === L - 1 && c.type === 'Delta' && familyOf(c) === fam && c.length === s[k - 2]);
  if (!a) { console.log('  no circuit to predict from'); continue; }
  const p = predictHarmonic(cs, a, 2, 3e6, false);
  const lengths = p.predicted.map((b) => b.length).sort((x, y) => y - x);
  console.log(`  recurrence at level ${L + 1}: ${next}; closed walks through the window at level ${L + 1}: ${lengths.join(' ')}; ${lengths.includes(next) ? 'equal' : 'differ'}`);

  // The chain's share of a Delta's chords at level N, its members carried on by the recurrence (exact integers):
  // the chain closes at level m in every level-m supertile of type u with the copies it has at the top level.
  const types = leafOrder('hex') as readonly string[];
  const M = substitutionMatrix('hex').map((r) => r.map(BigInt));
  const copies = types.map((t) => BigInt(cs.born.filter((c) => c.type === t && familyOf(c) === fam && c.level === L && c.length === s[k - 1]).reduce((x, c) => x + cs.copiesOf(c), 0)));
  const chords0 = types.map((t) => BigInt(cs.levels[0][t].crossings().length / 2));
  const len = new Map<number, bigint>(levels.map((n, i) => [n, BigInt(s[i])]));
  const c = [BigInt(lhs[lhs.length - 2]), BigInt(lhs[lhs.length - 1])];
  for (let n = L + 1; n <= 200; n++) len.set(n, 8n * len.get(n - 1)! - 7n * len.get(n - 2)! + 3n * len.get(n - 3)! + c[(n - L - 1) % 2]);
  let chords = chords0.slice();
  let closed = types.map(() => 0n);
  const D = types.indexOf('Delta');
  const shares: string[] = [];
  for (let n = 1; n <= 200; n++) {
    chords = types.map((_, t) => types.reduce((x, _u, u) => x + M[t][u] * chords[u], 0n));
    closed = types.map((_, t) => types.reduce((x, _u, u) => x + M[t][u] * closed[u], 0n) + (len.has(n) && n >= levels[0] ? len.get(n)! * copies[t] : 0n));
    if ([L, 40, 100, 200].includes(n)) shares.push(`level ${n}: ${(Number((closed[D] * 10n ** 12n) / chords[D]) / 1e12).toFixed(9)}`);
  }
  console.log(`  its share of a Delta's chords, members past level ${L} from the recurrence (copies per type ${copies.join(' ')}): ${shares.join('; ')}`);
}
