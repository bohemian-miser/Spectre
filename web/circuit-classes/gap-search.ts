/**
 * The Harmonics page's brute force (`src/pages/harmonics/bruteForce.ts`)
 * from the last member of each row of chosen families, at every even gap up
 * to a level: a circuit closing that many levels above the member that
 * reads as it, every tile grown into a supertile of the gap, from the
 * member's chain floor up. The build's circuits are known by their words,
 * so a closed walk with one of them is counted as a copy of it.
 *
 *   node --max-old-space-size=8000 node_modules/.bin/tsx circuit-classes/gap-search.ts <combo> <build level> <top level> <families,…> [rule]
 *
 * One line per family and gap: what was found, the copies by circuit and
 * times, the closings of the family that read otherwise, and the work.
 */
import { harmonicAbove } from '../src/pages/harmonics/bruteForce';
import { BASE } from '../src/pages/harmonics/bruteJob';
import { HarmonicsEngine } from '../src/pages/harmonics/harmonicsJob';
import { SparseRoutes } from '../src/pages/harmonics/sparseRoutes';
import { CircuitShapes } from '../src/pages/shapes/circuitShapes';

const [combo = '110000001', lv = '9', tp = '12', fams = '14,47,147', rule = '023468'] = process.argv.slice(2).filter((a) => a !== '--');
const level = Number(lv), maxTop = Number(tp);
const subset = [...rule].map(Number);
const t0 = Date.now();
const H = new HarmonicsEngine({ family: 'hex', subset, combo, level: Math.min(level, 9) });
for (let l = 10; l <= level; l++) H.next();
const r = H.result();
const known = H.words();
console.log(`${rule} · ${combo} built to ${level} in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${known.map((k) => `${k.length}@${k.level}`).join(' ')}`);
const cs = new CircuitShapes('hex', subset, [...combo].map((ch) => parseInt(ch, 36)), Math.max(BASE, level - 1), Number.MAX_SAFE_INTEGER);
const R = new SparseRoutes(cs, BASE);
for (const ch of r.chains) {
  if (!fams.split(',').includes(ch.family)) continue;
  const top = ch.members[ch.members.length - 1];
  const c = r.circuits[top];
  const link = ch.members.length > 1 ? r.links.find((l) => l.b === top) : undefined;
  const floor = link ? Math.max(1, link.from) : Math.max(0, Math.min(2, c.level - 2));
  const born = H.bornOf(top);
  const from = R.walked({ level: born.level, type: born.type, length: born.length, steps: born.steps });
  for (let gap = 2; c.level + gap <= maxTop; gap += 2) {
    const t1 = Date.now();
    let last = Date.now();
    const res = harmonicAbove(R, from, {
      floor,
      gap,
      known,
      beyond: 0,
      onProgress: (p) => {
        if (Date.now() - last < 60000) return;
        last = Date.now();
        console.log(`    … level ${p.level}, ${p.calls} routes, ${((Date.now() - t1) / 1000).toFixed(0)} s`);
      },
    });
    const found = res.found ? `found ${res.found.length} reading as it from level ${res.found.agreed}${res.found.limited ? ' (as far as read)' : ''}` : 'none';
    const copies = res.copies.map((k) => `${k.length}@${k.level}×${k.times}`).join(' ');
    const others = res.others.filter((o) => o.family === ch.family).map((o) => `${o.length} from ${o.agreed}`).join(', ');
    console.log(
      `family ${ch.family}, ${c.length} L${c.level} floor ${floor}, gap ${gap} → level ${c.level + gap}: ${found}; copies [${copies}]; family closings reading otherwise [${others}]; ${res.windows} windows, ${res.tried} arcs, ${res.open} open, ${res.work.calls} routes, ${res.seconds.toFixed(1)} s`,
    );
  }
}
