/**
 * The three sides of a triangle circuit.
 *
 * A circuit is written as its word: one letter per tile, the tile's type and
 * the edges the strand enters and leaves by (`Phi45`). The letter does not
 * change when a tile is rotated, so if a circuit is three copies of one side
 * turned by 120 degrees, its word is a side's word three times over. For the
 * longest circuit at each height (the highest cell of the address tape it
 * reads, `strand-machine.ts`) this splits the word into thirds and compares
 * them:
 *
 *  - the positions where the three thirds disagree, in runs;
 *  - for each run, whether the odd third is the others' block walked
 *    backwards (letters in reverse order, entry and exit swapped);
 *  - the joins: the tiles round each corner (the tile of each third farthest
 *    from the circuit's centre), and whether the three joins agree;
 *  - geometry: for each position, the centre of the 120-degree turn taking
 *    its tile in one third to its tile in the next; one centre for every
 *    agreeing position means the clean part is an exact rotation.
 *
 * Usage: tsx triangle-sides.ts <rule-combo> <level>
 */
import { buildSystem, flatten, slotsOfType, transPt, type LeafNode, type MetaNode, type Pt } from '../src/core';
import { addressFromId, type HexType } from '../src/core/transducer';
import { leafIds, patternRows, run, strandMachine } from './strand-machine';

export const reverseLetter = (w: string) => `${w.slice(0, -2)}${w[w.length - 1]}${w[w.length - 2]}`;

export interface Run { readonly from: number; readonly to: number; readonly odd: number; readonly reversed: boolean }

/** Where the thirds of `word` disagree; `odd` is the third that differs from the other two (-1 if all three differ). */
export function sideRuns(word: readonly string[]): Run[] {
  const S = word.length / 3;
  const runs: Run[] = [];
  for (let i = 0; i < S; i++) {
    const [a, b, c] = [word[i], word[i + S], word[i + 2 * S]];
    if (a === b && b === c) continue;
    const odd = a === b ? 2 : a === c ? 1 : b === c ? 0 : -1;
    const last = runs[runs.length - 1];
    if (last && last.to === i - 1 && last.odd === odd) runs[runs.length - 1] = { ...last, to: i };
    else runs.push({ from: i, to: i, odd, reversed: false });
  }
  return runs.map((r) => {
    if (r.odd < 0) return r;
    const ref = (r.odd + 1) % 3;
    const block = (k: number) => word.slice(r.from + k * S, r.to + 1 + k * S);
    const back = block(ref).map(reverseLetter).reverse();
    return { ...r, reversed: back.every((w, i) => w === block(r.odd)[i]) };
  });
}

if (process.argv[1]?.endsWith('triangle-sides.ts')) {
  const [spec, lvArg] = process.argv.slice(2);
  const [rule, combo] = spec.split('-');
  const subset = [...rule].map(Number);
  const level = Number(lvArg);
  const root: HexType = 'Delta';
  const machine = strandMachine(subset, combo);
  const pattern = patternRows(subset, combo);
  const base = buildSystem('hex', 0);
  const pos = new Map<string, Pt>();
  for (const t of flatten(buildSystem('hex', level)[root] as MetaNode)) {
    const q = (base[t.type] as LeafNode | MetaNode).quad;
    pos.set(t.id, transPt(t.xform, { x: q.reduce((s, p) => s + p.x, 0) / q.length, y: q.reduce((s, p) => s + p.y, 0) / q.length }));
  }
  const best = new Map<number, string[]>();
  const seen = new Set<string>();
  for (const id of leafIds(root, level)) {
    const a = addressFromId(root, id);
    for (const seam of slotsOfType('hex', a.leaf, subset)) {
      if (seen.has(`${id} ${seam.edge}`)) continue;
      const r = run(machine, a, seam.edge);
      for (const v of r.visited) seen.add(v);
      if (r.end === 'circuit' && r.visited.length > (best.get(r.height)?.length ?? 0)) best.set(r.height, r.visited);
    }
  }
  for (const [h, visited] of [...best].sort((x, y) => x[0] - y[0])) {
    const N = visited.length;
    if (N < 20 || N % 3) continue;
    const S = N / 3;
    const word = visited.map((v) => {
      const [id, e] = v.split(' ');
      const t = addressFromId(root, id).leaf;
      return `${t}${e}${pattern.get(`A${e} ${t}`)!.next.slice(1)}`;
    });
    const P = visited.map((v) => pos.get(v.split(' ')[0])!);
    const c = P.reduce((s, p) => ({ x: s.x + p.x / N, y: s.y + p.y / N }), { x: 0, y: 0 });
    const runs = sideRuns(word);
    const differ = runs.reduce((s, r) => s + r.to - r.from + 1, 0);
    console.log(`height ${h}: ${N} tiles, sides of ${S}; ${differ} positions differ, in ${runs.length} runs`);
    for (const r of runs) {
      const k = r.odd < 0 ? 0 : r.odd;
      const ref = (k + 1) % 3;
      console.log(`  ${r.from}-${r.to}: ${r.odd < 0 ? 'all three differ' : `third ${r.odd} ${r.reversed ? 'walks the block backwards' : 'differs'}`}: ${word.slice(r.from + ref * S, r.to + 1 + ref * S).join(' ')} | ${word.slice(r.from + k * S, r.to + 1 + k * S).join(' ')}`);
    }
    // Joins.
    const corner = [0, 1, 2].map((k) => {
      let b = k * S;
      for (let i = k * S; i < (k + 1) * S; i++) if (Math.hypot(P[i].x - c.x, P[i].y - c.y) > Math.hypot(P[b].x - c.x, P[b].y - c.y)) b = i;
      return b;
    });
    const around = (i: number) => Array.from({ length: 9 }, (_, d) => word[(i - 4 + d + N) % N]).join(' ');
    console.log(`  corners at ${corner.map((i) => i % S).join(' ')} along each third; joins ${new Set(corner.map(around)).size === 1 ? 'agree' : 'differ'}: ${corner.map(around).join(' || ')}`);
    // Geometry: centre of the +120 turn taking P[i] to P[i + S].
    const centres = new Map<string, number>();
    const turn = (dir: number) => {
      centres.clear();
      const w = (dir * 2 * Math.PI) / 3;
      for (let i = 0; i < 2 * S; i++) {
        const p = P[i];
        const q = P[i + S];
        // q - z = R (p - z)  =>  z = (q - R p) / (1 - R), as complex numbers
        const rx = Math.cos(w) * p.x - Math.sin(w) * p.y;
        const ry = Math.sin(w) * p.x + Math.cos(w) * p.y;
        const nx = q.x - rx;
        const ny = q.y - ry;
        const dx = 1 - Math.cos(w);
        const dy = -Math.sin(w);
        const d2 = dx * dx + dy * dy;
        const z = `${((nx * dx + ny * dy) / d2).toFixed(3)},${((ny * dx - nx * dy) / d2).toFixed(3)}`;
        centres.set(z, (centres.get(z) ?? 0) + 1);
      }
      return [...centres].sort((x, y) => y[1] - x[1]);
    };
    const t = [1, -1].map(turn).sort((x, y) => y[0][1] - x[0][1])[0];
    console.log(`  turn by 120 degrees about ${t[0][0]} carries ${t[0][1]} of ${2 * S} tiles to the next third; ${t.length - 1} other centres`);
  }
}
