/**
 * Corner triples as tiles of one patch, and every strand through them.
 *
 * Usage: tsx points.ts <rule> [level] [minLength] [outDir]
 *
 * Every combination of the rule is traced on the same level-L Delta
 * supertile. Each circuit of at least `minLength` tiles gets its fitted
 * corners (`measure`, read in canonical order, so every copy of a circuit
 * gets the copy of the same corners), and its corner triple is three tiles of
 * the patch. Then, for each triple and each combination, the strands passing
 * through all three tiles: the same circuit, another circuit, or an open
 * strand.
 *
 * Writes `outDir/<rule>/points.L.csv`, one row per (triple, strand through
 * it): the triple's tiles as slot paths, the combination, the strand (circuit
 * id, or `open`), its length, whether the triple is that strand's own corner
 * triple, and its tile set.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { comboDigitsFromIndex, comboOptionCounts } from '../src/core';
import { idOf } from '../src/core/transducer';
import { pairingTable, patternOf } from '../src/pages/walker/walk';
import { addressOf, board, traceAll, typeOf, type Traced } from './board';
import { measure } from './circuits';
import { canonicalWord, tileLetter } from './keys';

const [rule, lvArg = '6', minArg = '20', outArg = 'circuit-index/data'] = process.argv.slice(2);
const subset = [...rule].map(Number);
const level = Number(lvArg);
const minLength = Number(minArg);
const b = board('Delta', level);

const counts = comboOptionCounts('hex', subset);
const combos = Array.from({ length: counts.reduce((a, c) => a * c, 1) }, (_, i) => comboDigitsFromIndex(counts, i).map((d) => d.toString(36)).join(''));

interface Strand { readonly id: string; readonly length: number; readonly tilesId: string; readonly triple: string | null }

/** Corner positions and tile key per circuit, measured once. */
const measured = new Map<string, { corners: readonly number[]; tilesId: string }>();
const wordOf = (s: Traced): string[] => Array.from(s.tiles, (t, i) => tileLetter(typeOf(b, t), s.entries[i], s.exits[i]));

/** Board tile at canonical position p of a circuit. */
function tileAt(s: Traced, p: number): number {
  const n = s.tiles.length;
  const can = canonicalWord(wordOf(s));
  return can.reversed ? s.tiles[n - 1 - ((p + can.offset) % n)] : s.tiles[(p + can.offset) % n];
}

function strandsOf(combo: string): { strands: Strand[]; through: Int32Array } {
  const traced = traceAll(b, pairingTable(patternOf(subset, combo)));
  const strands: Strand[] = [];
  // Up to three strands per tile.
  const through = new Int32Array(b.n * 3).fill(-1);
  traced.forEach((s, k) => {
    for (const t of s.tiles) for (let j = 0; j < 3; j++) if (through[3 * t + j] === k) break; else if (through[3 * t + j] < 0) { through[3 * t + j] = k; break; }
    if (s.kind === 'open') { strands.push({ id: 'open', length: s.tiles.length, tilesId: '', triple: null }); return; }
    const word = wordOf(s);
    const key = canonicalWord(word).word.join('');
    let m = measured.get(key);
    if (!m && s.tiles.length >= minLength) {
      const f = measure({ key, word, tiles: Array.from(s.tiles, (t) => addressOf(b, t)) }, 3, 0);
      m = { corners: f.corners.corners, tilesId: f.tilesId };
      measured.set(key, m);
    }
    const triple = m ? m.corners.map((p) => tileAt(s, p)).sort((x, y) => x - y).join(' ') : null;
    strands.push({ id: key, length: s.tiles.length, tilesId: m?.tilesId ?? '', triple });
  });
  return { strands, through };
}

// Pass 1: every corner triple, from every combination.
const triples = new Map<string, Set<string>>();
for (const combo of combos) {
  for (const s of strandsOf(combo).strands) if (s.triple) (triples.get(s.triple) ?? triples.set(s.triple, new Set()).get(s.triple)!).add(combo);
}
console.error(`${triples.size} corner triples from ${combos.length} combinations`);

// Pass 2: per combination, the strands through all three tiles of each triple.
mkdirSync(`${outArg}/${rule}`, { recursive: true });
const out = `${outArg}/${rule}/points.${level}.csv`;
writeFileSync(out, 'triple,combo,strand,length,own_corners,tiles_id\n');
const ids = new Map<string, string>();
const tripleIds = (triple: string): string => ids.get(triple) ?? ids.set(triple, triple.split(' ').map((t) => idOf(addressOf(b, Number(t)))).join(' ')).get(triple)!;
let total = 0;
for (const combo of combos) {
  const rows: string[] = [];
  const { strands, through } = strandsOf(combo);
  for (const triple of triples.keys()) {
    const [a, c, d] = triple.split(' ').map(Number);
    const at = (t: number): number[] => [0, 1, 2].map((j) => through[3 * t + j]).filter((k) => k >= 0);
    const common = at(a).filter((k) => at(c).includes(k) && at(d).includes(k));
    for (const k of common) {
      const s = strands[k];
      rows.push([tripleIds(triple), combo, s.id, s.length, s.triple === triple ? 1 : 0, s.tilesId].join(','));
    }
  }
  if (rows.length) appendFileSync(out, `${rows.join('\n')}\n`);
  total += rows.length;
}
console.error(`${total} rows`);
