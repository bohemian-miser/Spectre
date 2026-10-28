/**
 * Indexes over a sweep's CSVs, printed as Markdown tables.
 *
 * Usage: tsx report.ts <dir> [triangleScore]
 *
 * - circuits: each distinct circuit with the combinations that make it;
 * - sides: how many circuits are three copies of one arm, exactly (the word
 *   repeats three times) or within `triangleScore` (largest edit distance
 *   between consecutive arms over the mean arm length, default 0.1);
 * - corners: each corner triple, the circuits whose fitted corners it is, and
 *   whether those circuits cover the same tiles;
 * - segments: for the circuits that are not triangles, the k whose equal
 *   parts are closest.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';

const [dir, scoreArg = '0.1'] = process.argv.slice(2);
const near = Number(scoreArg);

type Row = Record<string, string>;
const read = (prefix: string): Row[] => readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.csv')).flatMap((f) => {
  const [head, ...lines] = readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean);
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
});
const rows = read('circuits.');
const combos = read('combos.');

const group = <T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const x of xs) (m.get(key(x)) ?? m.set(key(x), []).get(key(x))!).push(x);
  return m;
};
const table = (head: readonly string[], body: readonly (readonly (string | number)[])[]): string =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...body.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const byCircuit = group(rows, (r) => r.circuit);
/** A circuit's word, cut to its first 40 characters for a table. */
const show = (id: string): string => (id.length > 40 ? `${id.slice(0, 40)}…` : id);
const one = (id: string): Row => byCircuit.get(id)![0];
const kind = (r: Row): string => {
  if (Number(r.order) % 3 === 0) return 'exact';
  if (Number(r.arm_score) <= near) return 'near';
  return 'other';
};

const out: string[] = [];
out.push(`# ${dir}`, '');
out.push(table(['combinations', 'capped at 1000', 'circuit rows', 'distinct circuits', 'corner triples', 'tile sets'], [[
  combos.length, combos.filter((c) => c.capped === '1').length, rows.length, byCircuit.size,
  new Set(rows.map((r) => r.corner_id)).size, new Set(rows.map((r) => r.tiles_id)).size,
]]), '');

// Sides, by length.
const bins = [[1, 9], [10, 99], [100, 999], [1000, 9999], [10000, Infinity]] as const;
out.push('## Three arms', '', `exact: the word repeats a multiple of 3 times. near: arm score at most ${near}.`, '');
out.push(table(['length', 'circuits', 'exact', 'near', 'other'], bins.map(([lo, hi]) => {
  const ids = [...byCircuit.keys()].filter((id) => { const n = Number(one(id).length); return n >= lo && n <= hi; });
  const c = (k: string) => ids.filter((id) => kind(one(id)) === k).length;
  return [hi === Infinity ? `${lo}+` : `${lo}–${hi}`, ids.length, c('exact'), c('near'), c('other')];
}).filter((r) => r[1] !== 0)), '');

// Circuits shared between combinations.
out.push('## Circuits made by more than one combination', '');
const shared = [...byCircuit].filter(([, rs]) => rs.length > 1 && Number(rs[0].length) >= 10)
  .sort((a, b) => Number(b[1][0].length) - Number(a[1][0].length));
out.push(table(['circuit', 'length', 'level', 'combinations', 'kind', 'arm score'], shared.slice(0, 40).map(([id, rs]) =>
  [show(id), rs[0].length, rs[0].level, rs.length, kind(rs[0]), rs[0].arm_score])), '');

// Corner triples.
out.push('## Corner triples held by more than one circuit', '');
const byCorner = group([...byCircuit.keys()].map(one).filter((r) => Number(r.length) >= 10), (r) => r.corner_id);
const multi = [...byCorner].filter(([, rs]) => rs.length > 1);
out.push(`${multi.length} of ${byCorner.size} corner triples (circuits of 10 tiles or more).`, '');
out.push(table(['corner triple', 'circuits', 'lengths', 'tile sets', 'kinds'], multi.slice(0, 40).map(([id, rs]) =>
  [id, rs.length, rs.map((r) => r.length).join(' '), new Set(rs.map((r) => r.tiles_id)).size, rs.map(kind).join(' ')])), '');

// Tile sets.
const byTiles = group([...byCircuit.keys()].map(one), (r) => r.tiles_id);
out.push('## Tile sets covered by more than one circuit', '');
out.push(table(['tile set', 'circuits', 'length'], [...byTiles].filter(([, rs]) => rs.length > 1).slice(0, 40).map(([id, rs]) => [id, rs.length, rs[0].length])), '');

// Segments for the rest.
out.push('## Not triangles: closest equal parts', '');
const rest = [...byCircuit.keys()].map(one).filter((r) => kind(r) === 'other' && Number(r.length) >= 20);
const K = Object.keys(rest[0] ?? {}).filter((c) => c.startsWith('seg'));
const bestK = (r: Row): [string, number] => K.filter((k) => r[k] !== '').map((k) => [k.slice(3), Number(r[k])] as [string, number]).sort((a, b) => a[1] - b[1])[0] ?? ['', NaN];
out.push(table(['circuit', 'length', 'order', 'arm score', 'best k', 'score'], rest.sort((a, b) => Number(b.length) - Number(a.length)).slice(0, 40).map((r) => {
  const [k, s] = bestK(r);
  return [show(r.circuit), r.length, r.order, r.arm_score, k, s.toFixed(3)];
})), '');

// Corner triples as tiles of one patch (points.ts).
for (const f of readdirSync(dir).filter((x) => /^points\.\d+\.csv$/.test(x))) {
  // Listings past a few hundred MB do not fit in one string; those are summarised in points.L.md.
  if (statSync(`${dir}/${f}`).size > 2 ** 28) { out.push(`## Corner triples on one patch (${f})`, '', `Too large to read here; see ${f.replace('.csv', '.md')}.`, ''); continue; }
  const [head, ...lines] = readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean);
  const cols = head.split(',');
  const pts = lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
  const byTriple = group(pts, (r) => r.triple);
  out.push(`## Corner triples on one patch (${f})`, '');
  out.push('For each triple: the circuits whose corners it is, and the other strands through all three tiles.', '');
  const summary = new Map<string, number>();
  const examples = new Map<string, string>();
  for (const [t, rs] of byTriple) {
    const own = rs.filter((r) => r.own_corners === '1');
    const ownIds = new Set(own.map((r) => r.strand));
    const other = rs.filter((r) => r.own_corners !== '1');
    const otherCircuits = new Set(other.filter((r) => r.strand !== 'open').map((r) => r.strand));
    const sameTiles = other.filter((r) => r.strand !== 'open' && own.some((o) => o.tiles_id === r.tiles_id)).length;
    const k = [
      ownIds.size === 1 ? 'one circuit' : `${ownIds.size} circuits`,
      otherCircuits.size === 0 ? 'no other circuit through it' : `${otherCircuits.size >= 3 ? '3+' : otherCircuits.size} other circuit${otherCircuits.size === 1 ? '' : 's'} through it`,
      other.some((r) => r.strand === 'open') ? 'open strands through it' : '',
      sameTiles ? 'same tiles' : '',
    ].filter(Boolean).join(', ');
    summary.set(k, (summary.get(k) ?? 0) + 1);
    if (!examples.has(k)) examples.set(k, t);
  }
  out.push(table(['triple is the corners of', 'triples', 'example'], [...summary].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n, examples.get(k)!])), '');
}

console.log(out.join('\n'));
