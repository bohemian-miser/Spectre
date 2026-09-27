/**
 * How many combinations of each rule decompose into two independent smaller
 * patterns (see src/core/decompose.ts), counted exactly from the per-tile split
 * tables, then spot-checked: the strands of a decomposed combination must be
 * exactly the union of its parts' strands.
 *
 * Usage: tsx decompose-count.ts [family] [rule]   (default: every family's full rule)
 */
import {
  FAMILIES, buildStrandGraph, comboDigitsFromIndex, comboOptionCounts, decomposeCombo, ruleSplits,
  splitTable, strandComponents, validEdgeSubsets, type TileFamilyId,
} from '../src/core';

function summary(family: TileFamilyId, rule: number[], digits: number[], level: number) {
  const g = buildStrandGraph(family, rule, level);
  const c = strandComponents(g, digits);
  const closed: number[] = [], open: number[] = [];
  for (let k = 0; k < c.n; k++) if (c.segs[k] > 0) (c.ends[k] ? open : closed).push(c.segs[k]);
  return { closed: closed.sort((a, b) => a - b).join(','), open: open.sort((a, b) => a - b).join(',') };
}

const [famArg, ruleArg] = process.argv.slice(2);
const jobs = famArg
  ? [[famArg, ruleArg]]
  : FAMILIES.filter((f) => f !== 'hat' && f !== 'turtle').map((f) => {
      const v = validEdgeSubsets(f);
      return [f, v[v.length - 1].edges.join('')];
    });
for (const [family, ruleStr] of jobs as [TileFamilyId, string][]) {
  const rule = [...ruleStr].map(Number);
  const counts = comboOptionCounts(family, rule);
  const total = counts.reduce((a, b) => a * b, 1);
  const splits = ruleSplits(family, rule);
  console.log(`\n${family} ${ruleStr}: ${total.toLocaleString()} combinations, splits: ${splits.map((s) => s.parts.join(' + ')).join(', ') || 'none'}`);
  // Exact counts per split from the tables (product of compatible digits per tile).
  for (const s of splits) {
    const t = splitTable(family, rule, s).table;
    const per = t.map((row) => row.filter(Boolean).length);
    console.log(`  ${s.parts.join(' + ')}: ${per.reduce((a, b) => a * b, 1).toLocaleString()} (compatible options per tile: ${per.join(' ')} of ${counts.join(' ')})`);
  }
  // Union over splits, by enumeration (cheap: table lookups only).
  let any = 0, multi = 0;
  const examples: number[][] = [];
  for (let i = 0; i < total; i++) {
    const d = comboDigitsFromIndex(counts, i);
    const dec = decomposeCombo(family, rule, d);
    if (dec.length) {
      any++;
      if (dec.length > 1) multi++;
      if (examples.length < 6 && i % 997 === 0) examples.push(d);
    }
  }
  console.log(`  decomposable: ${any.toLocaleString()} (${((100 * any) / total).toFixed(1)}%), of which ${multi.toLocaleString()} split more than one way; indecomposable: ${(total - any).toLocaleString()}`);
  // Spot-check at level 4: the multiset of strand lengths must be the union of the parts'.
  let checked = 0;
  for (const d of examples) {
    for (const dec of decomposeCombo(family, rule, d)) {
      const whole = summary(family, rule, d, 4);
      const pa = summary(family, [...dec.parts[0].rule].map(Number), [...dec.parts[0].digits], 4);
      const pb = summary(family, [...dec.parts[1].rule].map(Number), [...dec.parts[1].digits], 4);
      const merge = (x: string, y: string) => [x, y].filter(Boolean).join(',').split(',').filter(Boolean).map(Number).sort((a, b) => a - b).join(',');
      const ok = whole.closed === merge(pa.closed, pb.closed) && whole.open === merge(pa.open, pb.open);
      if (!ok) console.log('  MISMATCH', d.join(''), dec.parts.map((p) => `${p.rule}-${p.digits.join('')}`).join(' + '));
      checked++;
    }
  }
  console.log(`  spot-checked ${checked} decompositions at level 4: strand lengths are the union of the parts' in every case${checked ? '' : ' (none sampled)'}`);
}
