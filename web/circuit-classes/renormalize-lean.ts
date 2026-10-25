/**
 * `renormalize.ts` for deep levels: the same gluing, but in typed arrays with
 * numeric point keys, keeping only the previous level and only summary
 * statistics of the circuits born. Level 11 of a hexagon rule (7 billion
 * tiles) fits in a few GB.
 *
 * Usage: tsx renormalize-lean.ts <family> <rule> <combo> <maxLevel> [type]
 */
import { buildSystem, connectionPoints, leafOrder, type MetaNode, type TileFamilyId } from '../src/core';
import { ruleOptions } from './boundary-classes';

interface Lean {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly mate: Int32Array;
  readonly arcLen: Float64Array;
}

export interface LevelStats {
  readonly level: number;
  /** Per supertile type. */
  readonly types: Record<string, { outline: number; born: number; bornTop: number[]; openTop: number[]; openTotal: number }>;
}

const SCALE = 64;
const OFF = 2 ** 25;
const pkey = (x: number, y: number) => (Math.round(x * SCALE) + OFF) * 2 ** 27 + (Math.round(y * SCALE) + OFF);

function top(list: Float64Array | number[], k: number, filter?: (i: number) => boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < list.length; i++) {
    if (filter && !filter(i)) continue;
    const v = list[i];
    if (out.length < k || v > out[out.length - 1]) {
      out.push(v);
      out.sort((a, b) => b - a);
      if (out.length > k) out.pop();
    }
  }
  return out;
}

export function* renormalizeLean(family: TileFamilyId, subset: readonly number[], digits: readonly number[], maxLevel: number): Generator<LevelStats> {
  const sel = new Set(subset);
  const options = ruleOptions(family, subset);
  let prev: Record<string, Lean> = {};
  leafOrder(family).forEach((t, ti) => {
    const pts = connectionPoints(family, t, sel).map((c) => c.pt);
    const mate = new Int32Array(pts.length).fill(-1);
    for (const [a, b] of options[ti][digits[ti]]) {
      mate[a] = b;
      mate[b] = a;
    }
    prev[t] = { x: Float64Array.from(pts, (p) => p.x), y: Float64Array.from(pts, (p) => p.y), mate, arcLen: new Float64Array(pts.length).fill(1) };
  });
  for (let n = 1; n <= maxLevel; n++) {
    const sys = buildSystem(family, n);
    const next: Record<string, Lean> = {};
    const stats: LevelStats = { level: n, types: {} };
    for (const [t, node] of Object.entries(sys)) {
      const meta = node as MetaNode;
      let total = 0;
      for (const ch of meta.children) total += prev[ch.node.type].mate.length;
      const wx = new Float64Array(total);
      const wy = new Float64Array(total);
      const owner = new Int32Array(total);
      const start = new Int32Array(meta.children.length);
      let o = 0;
      meta.children.forEach((ch, ci) => {
        start[ci] = o;
        const b = prev[ch.node.type];
        const [a0, a1, a2, a3, a4, a5] = ch.xform;
        for (let k = 0; k < b.mate.length; k++, o++) {
          wx[o] = a0 * b.x[k] + a1 * b.y[k] + a2;
          wy[o] = a3 * b.x[k] + a4 * b.y[k] + a5;
          owner[o] = ci;
        }
      });
      const across = new Int32Array(total).fill(-1);
      const at = new Map<number, number>();
      for (let i = 0; i < total; i++) {
        const k = pkey(wx[i], wy[i]);
        const j = at.get(k);
        if (j === undefined) at.set(k, i);
        else {
          across[i] = j;
          across[j] = i;
        }
      }
      at.clear();
      const innerJ = (i: number) => {
        const ci = owner[i];
        const b = prev[meta.children[ci].node.type];
        const m = b.mate[i - start[ci]];
        return m < 0 ? -1 : start[ci] + m;
      };
      const innerLen = (i: number) => {
        const ci = owner[i];
        return prev[meta.children[ci].node.type].arcLen[i - start[ci]];
      };
      let nOut = 0;
      const outPos = new Int32Array(total).fill(-1);
      for (let i = 0; i < total; i++) if (across[i] < 0) outPos[i] = nOut++;
      const x = new Float64Array(nOut);
      const y = new Float64Array(nOut);
      const mate = new Int32Array(nOut).fill(-1);
      const arcLen = new Float64Array(nOut);
      const used = new Uint8Array(total);
      for (let i0 = 0; i0 < total; i0++) {
        if (across[i0] >= 0) continue;
        const k0 = outPos[i0];
        x[k0] = wx[i0];
        y[k0] = wy[i0];
        if (used[i0]) continue;
        let i = i0;
        let len = 0;
        for (;;) {
          used[i] = 1;
          const j = innerJ(i);
          if (j < 0) break;
          used[j] = 1;
          len += innerLen(i);
          if (across[j] < 0) {
            const k1 = outPos[j];
            mate[k0] = k1;
            mate[k1] = k0;
            arcLen[k0] = arcLen[k1] = len;
            break;
          }
          i = across[j];
        }
      }
      const born: number[] = [];
      for (let i0 = 0; i0 < total; i0++) {
        if (used[i0] || across[i0] < 0) continue;
        let i = i0;
        let len = 0;
        let ok = true;
        for (;;) {
          used[i] = 1;
          const j = innerJ(i);
          if (j < 0) {
            ok = false;
            break;
          }
          used[j] = 1;
          len += innerLen(i);
          i = across[j];
          if (i < 0) {
            ok = false;
            break;
          }
          if (i === i0) break;
        }
        if (ok) born.push(len);
      }
      let openTotal = 0;
      for (let k = 0; k < nOut; k++) if (mate[k] > k) openTotal += arcLen[k];
      stats.types[t] = {
        outline: nOut,
        born: born.length,
        bornTop: top(born, 5),
        openTop: top(arcLen, 5, (k) => mate[k] > k),
        openTotal,
      };
      next[t] = { x, y, mate, arcLen };
    }
    prev = next;
    yield stats;
  }
}

if (process.argv[1]?.endsWith('renormalize-lean.ts')) {
  const [family, rule, combo, maxArg, typeArg] = process.argv.slice(2);
  const type = typeArg ?? 'Delta';
  const t0 = Date.now();
  for (const s of renormalizeLean(family as TileFamilyId, [...rule].map(Number), [...combo].map((c) => parseInt(c, 36)), Number(maxArg))) {
    const d = s.types[type];
    console.log(
      `L${s.level} ${type}: outline ${d.outline}; ${d.born} born, biggest ${d.bornTop.join(' ') || '-'}; open strands longest ${d.openTop.join(' ')} (${((100 * (d.openTop[0] ?? 0)) / Math.max(1, d.openTotal)).toFixed(1)}% of open length)  [${((Date.now() - t0) / 1000).toFixed(0)}s]`,
    );
  }
}
