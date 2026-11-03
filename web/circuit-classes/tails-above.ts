/**
 * Tails at a level of a combination followed up a sampled ancestry to a
 * cap, as the Tail fates page follows them (`src/pages/fates/above.ts`),
 * keeping every closing whose word the build does not hold: the circuits
 * above the build that the tails reach. Each is read level by level and
 * compared with every circuit of the build at every level (the share of
 * the readings alike, `harmonics/similarity.ts`), and drawn beside the
 * build's circuits of level 5 and below.
 *
 *   node --max-old-space-size=8000 node_modules/.bin/tsx circuit-classes/tails-above.ts <combo> [build level] [sample level] [cap] [samples] [routes per tail] [seed] [rule]
 *
 * Writes `circuit-classes/data/tails-above/<rule>-<combo>.json` (each
 * circuit's level, type, tiles, family, times met and deep addresses,
 * `SparseRoutes.deepStep`) and `.svg` beside it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { liftArc } from '../src/pages/fates/follow';
import { random } from '../src/pages/fates/above';
import { placements } from '../src/pages/fates/placements';
import { typeFrequencies, wordKeyOf } from '../src/pages/foundations/foundations';
import { familyOfSteps, readWalked, walkedWordCodes } from '../src/pages/harmonics/bruteForce';
import { bornOfFound, foundThumb, Placed, readRows, SparseRows } from '../src/pages/harmonics/found';
import { HarmonicsEngine } from '../src/pages/harmonics/harmonicsJob';
import { cyclicDistance } from '../src/pages/harmonics/similarity';
import { RouteLimit, SparseRoutes, TYPES, typeIndex, type Walked } from '../src/pages/harmonics/sparseRoutes';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [combo = '110000001', lv = '11', sl = '9', cp = '14', sm = '300', rt = '300000', sd = '1', rule = '023468'] = args;
const build = Number(lv), top = Number(sl), cap = Number(cp), count = Number(sm), routes = Number(rt), seed = Number(sd);
const subset = [...rule].map(Number);

const t0 = Date.now();
const H = new HarmonicsEngine({ family: 'hex', subset, combo, level: Math.min(build, 9) });
for (let l = 10; l <= build; l++) H.next();
const r = H.result();
const known = new Map(H.words().map((k) => [k.key, k]));
const cs = H.cs;
console.log(`${rule} · ${combo} built to ${build} in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${[...known.values()].map((k) => `${k.length}@${k.level}`).join(' ')}`);
const fresh = () => new SparseRoutes(cs, cs.maxLevel);

// tiles on tails at `top`: a type by its frequency, an arc by its tiles; an ancestry by how often each placement occurs
const rnd = random(seed);
const freq = typeFrequencies('hex');
const place = placements();
const arcs = TYPES.map((X) => {
  const T = cs.levels[top][X];
  const at: number[] = [];
  const cum: number[] = [];
  let s = 0;
  for (const k of T.crossings()) {
    if (T.mate(k) < k) continue;
    at.push(k);
    cum.push((s += T.len(k)));
  }
  return { at, cum, total: s };
});
const typeCum: number[] = [];
let ts = 0;
TYPES.forEach((_, i) => typeCum.push((ts += freq[i] * arcs[i].total)));
const pick = (cum: readonly number[], x: number): number => {
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] > x) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};

let R = fresh();
const above = new Map<string, { walk: Walked; deep: number[]; family: string; times: number; levels: Map<number, number> }>();
const fates = new Map<string, number>();
for (let i = 0; i < count; i++) {
  const ti = pick(typeCum, rnd() * ts);
  const X = TYPES[ti];
  const k = arcs[ti].at[pick(arcs[ti].cum, rnd() * arcs[ti].total)];
  const ancestry: { parent: string; slot: number }[] = [];
  let below: string = X;
  for (let n = top; n < cap; n++) {
    let q = rnd();
    const ps = place[below as keyof typeof place];
    const p = ps.find((x) => (q -= x.weight) < 0) ?? ps[ps.length - 1];
    ancestry.push({ parent: p.parent, slot: p.slot });
    below = p.parent;
  }
  if (R.work.routes > 2e7) R = fresh();
  R.limit = R.work.calls + routes;
  let a = k;
  let fate = 'open';
  try {
    for (let level = top; level < cap; level++) {
      const st = ancestry[level - top];
      const up = liftArc(R, level, a, typeIndex.get(st.parent)!, st.slot, TYPES);
      if (up.kind === 'ends') {
        fate = 'ends';
        break;
      }
      if (up.kind === 'closed') {
        const w = up.walk;
        const key = wordKeyOf(walkedWordCodes(R, w));
        const kn = known.get(key);
        if (kn) fate = `${kn.length}@${kn.level}`;
        else {
          fate = `above ${w.length}`;
          const had = above.get(key);
          if (had) {
            had.times++;
            had.levels.set(w.level, (had.levels.get(w.level) ?? 0) + 1);
            // keep the lowest placement met: its birth, as far as the tails show
            if (w.level < had.walk.level) Object.assign(had, { walk: w, deep: w.steps.map((s) => R.deepStep(w.level, s)), family: familyOfSteps(w.steps) });
          } else {
            above.set(key, { walk: w, deep: w.steps.map((s) => R.deepStep(w.level, s)), family: familyOfSteps(w.steps), times: 1, levels: new Map([[w.level, 1]]) });
            console.log(`closing above the build: ${w.length.toLocaleString('en-US')} tiles at level ${w.level} in a ${w.type}, through children ${familyOfSteps(w.steps)} (tail ${i})`);
          }
        }
        break;
      }
      a = up.a;
    }
  } catch (err) {
    if (!(err instanceof RouteLimit)) throw err;
    fate = 'out of routes';
  }
  fates.set(fate, (fates.get(fate) ?? 0) + 1);
  if ((i + 1) % 50 === 0) console.log(`… ${i + 1} tails, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
console.log(`\nfates of ${count} tails from level ${top} to ${cap}: ${[...fates].sort((x, y) => y[1] - x[1]).map(([f, n]) => `${f} ${n}`).join(', ')}`);

// each circuit above the build read and compared with the build's, level by level at the gap between them
const R0 = fresh();
const built = r.circuits.map((c, i) => {
  const b = H.bornOf(i);
  return { c, i, read: readWalked(R0, R0.walked({ level: b.level, type: b.type, length: b.length, steps: b.steps }), 0, 3e6) };
});
const alike = (xl: Int32Array | null, yl: Int32Array | null): string => {
  if (!xl || !yl) return '?';
  const x = Array.from(xl, String), y = Array.from(yl, String);
  const { distance } = cyclicDistance(x, y);
  return `${(100 * (1 - distance / Math.max(x.length, y.length))).toFixed(0)}% (${x.length}/${y.length})`;
};
R.limit = Infinity;
const pics: { name: string; pts: Float64Array }[] = [];
for (const { c, i } of built) if (c.level <= 5) pics.push({ name: `${c.length.toLocaleString('en-US')} L${c.level} through ${c.family}`, pts: H.thumbs([i], 3000)[0].pts });
const out: unknown[] = [];
for (const u of above.values()) {
  const w = u.walk;
  console.log(`\n${w.length.toLocaleString('en-US')} tiles, lowest at level ${w.level} in a ${w.type}, through children ${u.family}; met ${u.times} times (${[...u.levels].map(([l, n]) => `level ${l} ${n}`).join(', ')})`);
  const rb = readWalked(R, w, Math.max(0, w.level - 9), 3e6);
  const against: Record<string, string[]> = {};
  for (const { c, read } of built) {
    const gap = w.level - c.level;
    const parts: string[] = [];
    for (let k = c.level - 1; k >= 0; k--) parts.push(`k${k}: ${alike(read.levels[k], rb.levels[k + gap] ?? null)}`);
    against[`${c.length}@${c.level}`] = parts;
    console.log(`  vs ${c.length.toLocaleString('en-US')} L${c.level} through ${c.family}, ${gap} levels down${gap % 2 ? ' (odd)' : ''}: ${parts.join('  ')}`);
  }
  const rows = new SparseRows(cs, R, bornOfFound(R, { level: w.level, type: w.type, length: w.length, family: u.family, deep: u.deep }));
  const thumb = foundThumb(new Placed(cs, rows), readRows(rows, 250000).readings, 3000);
  pics.push({ name: `${w.length.toLocaleString('en-US')} L${w.level} ${w.type} through ${u.family}`, pts: thumb.pts });
  out.push({ level: w.level, type: w.type, length: w.length, family: u.family, times: u.times, levels: Object.fromEntries(u.levels), against, deep: u.deep });
}

const dir = resolve(__dirname, 'data/tails-above');
mkdirSync(dir, { recursive: true });
const base = `${dir}/${rule}-${combo}`;
writeFileSync(`${base}.json`, JSON.stringify({ rule, combo, build, top, cap, count, routes, seed, fates: Object.fromEntries(fates), above: out }));
const S = 300, cols = 4;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * S}" height="${Math.ceil(pics.length / cols) * S}" style="background:#fff">`;
pics.forEach((p, i) => {
  const g = p.pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let j = 0; j < g.length; j += 2) {
    x0 = Math.min(x0, g[j]);
    x1 = Math.max(x1, g[j]);
    y0 = Math.min(y0, g[j + 1]);
    y1 = Math.max(y1, g[j + 1]);
  }
  const k = (S - 40) / Math.max(x1 - x0, y1 - y0);
  const ox = (i % cols) * S + 10, oy = Math.floor(i / cols) * S + 25;
  let d = '';
  for (let j = 0; j < g.length; j += 2) d += `${j ? 'L' : 'M'}${(ox + (g[j] - x0) * k).toFixed(1)},${(oy + (S - 40) - (g[j + 1] - y0) * k).toFixed(1)}`;
  svg += `<path d="${d}" fill="none" stroke="#222" stroke-width="0.7"/><text x="${ox}" y="${oy - 8}" font-size="12" font-family="sans-serif">${p.name}</text>`;
});
writeFileSync(`${base}.svg`, `${svg}</svg>`);
console.log(`\nwrote ${base}.json and .svg`);
