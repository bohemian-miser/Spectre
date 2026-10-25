/**
 * Where circuits are born, at every level, from the FASS routing operator.
 *
 * fass-theorem/03-strands.ts shows that a supertile's strands are determined
 * by a "routing state" per type (the matching its arcs make on its boundary
 * dots) and that the substitution acts on states by one fixed operator F. That
 * script runs F for the two FASS configurations; nothing in F depends on the
 * rule or the combination beyond the level-1 states, so it runs for any
 * (rule, combination) of the hex and spectre families.
 *
 * Here F also carries arc lengths (in segments), and records every circuit a
 * supertile closes that none of its children contained: its length and the
 * child slots it passes through. For the FASS rules the state space is finite
 * and the orbit periodic; in general a supertile's boundary dots grow with its
 * perimeter, so this is an exact computation level by level (cheap: the state
 * is the size of the boundary, not of the patch), not a periodicity proof.
 *
 * Usage (from web/): tsx circuit-classes/routing-orbit.ts <family> <levels> <rule-combo> [...]
 * Prints one JSON object per combination:
 *   { share, dots: [per level, per type: boundary dots], births: [[level, type, slots, length, count], ...] }
 * where slots is the sorted child slots the new circuit passes through ('*' at level 1).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zAdd, zKey, type TileFamilyId, type TileTypeId } from '../src/core';
import { buildStrands, trace, zExpand, type Config } from '../fass-proof/lib';
import { TYPES, edgeLabels, leaves, outlineOf } from '../fass-theorem/geom';

const [familyArg, levelsArg, ...shares] = process.argv.slice(2);
const family = familyArg as TileFamilyId;
const maxLevel = Number(levelsArg);
const J = JSON.parse(readFileSync(fileURLToPath(new URL(`../fass-theorem/tables-${family}.json`, import.meta.url)), 'utf8'));
const B: Record<string, { s: number; e: number }[][]> = J.B;
const G: Record<string, [{ s: number; e: number }, { s: number; e: number }][]> = J.G;
const rules: Record<string, string[]> = J.rules;
const child = (T: string, s: number): string => rules[T][s];

/** Per boundary dot of a supertile: the dot its arc ends at, and the arc's length. */
interface State { partner: Int32Array; len: Float64Array }
type States = Record<string, State>;
/** Per type, per meta-edge: how many dots it carries. */
type Counts = Record<string, number[]>;
interface Birth { type: string; slots: string; len: number }

function run(cfg: Config) {
  const sel = new Set(cfg.subset);
  const hasDot = (label: string): boolean => {
    const m = /^(-?)(\d+)\.(\d+)[A-Z]$/.exec(label)!;
    return +m[3] === 0 && sel.has(+m[2]);
  };
  // A parent's meta-edge is its children's meta-edges, each traversed backwards,
  // so the dots of a child edge appear in the parent as one reversed block.
  // For the FASS rules the counts have period 2 in the level; in general they
  // grow with the perimeter, so keep every level.
  const countsAt: Counts[] = [Object.fromEntries(TYPES.map((T) => [T, J.words['1'][T].map((w: { lab: string[] }) => w.lab.filter(hasDot).length)]))];
  for (let k = 2; k < maxLevel; k++) {
    const prev = countsAt[countsAt.length - 1];
    countsAt.push(Object.fromEntries(TYPES.map((T) => [T, B[T].map((arc) => arc.reduce((a, { s, e }) => a + prev[child(T, s)][e], 0))])));
  }

  function geoState(T: TileTypeId): { state: State; circuits: number[] } {
    const tr = trace(buildStrands(cfg, zExpand(cfg.family, T, 1)));
    const lv = leaves(cfg.family, T, 1);
    const o = outlineOf(cfg.family, lv);
    const n = o.loop.length;
    const corners: number[] = J.corners['1'][T];
    const keys: string[] = [];
    for (let j = 0; j < 6; j++) {
      const a = corners[j];
      const len = ((corners[(j + 1) % 6] - a) % n + n) % n;
      for (let p = 0; p < len; p++) {
        const i = (a + p) % n;
        const ow = o.owner[i];
        if (hasDot(edgeLabels(cfg.family, lv[ow.leaf].type)[ow.edge])) {
          keys.push(zKey(zAdd(o.coord.get(o.loop[i])!, o.coord.get(o.loop[(i + 1) % n])!)));
        }
      }
    }
    const index = new Map(keys.map((k, i) => [k, i] as const));
    if (tr.junctions > 0) throw new Error('junction');
    const partner = new Int32Array(keys.length).fill(-1);
    const len = new Float64Array(keys.length);
    for (const arc of tr.arcs) {
      const [a, b] = arc.endpoints.map((k) => {
        const i = index.get(k);
        if (i === undefined) throw new Error(`${T}@1: an arc ends off the boundary dots`);
        return i;
      });
      partner[a] = b;
      partner[b] = a;
      len[a] = len[b] = arc.segIdxs.length;
    }
    if (partner.includes(-1)) throw new Error(`${T}@1: a boundary dot is on no arc`);
    return { state: { partner, len }, circuits: tr.circuits.map((c) => c.segIdxs.length) };
  }

  /**
   * The routing operator. Nodes are the children's boundary dots; each has one
   * child arc and either a weld to a sibling's dot or a place on the parent's
   * boundary. Walking arc, weld, arc, ... from a boundary dot gives a parent
   * arc; what is left over closes into circuits born at this level.
   */
  function F(T: string, prev: Counts, states: States, births: Birth[]): State {
    const base = new Int32Array(9);
    const start: number[][] = [];
    for (let s = 0; s < 8; s++) {
      const c = child(T, s) === 'null' ? [0, 0, 0, 0, 0, 0] : prev[child(T, s)];
      let acc = 0;
      start.push(c.map((x) => ((acc += x), acc - x)));
      base[s + 1] = base[s] + acc;
    }
    const N = base[8];
    const slotOf = new Uint8Array(N);
    for (let s = 0; s < 8; s++) slotOf.fill(s, base[s], base[s + 1]);
    const arcP = new Int32Array(N);
    const arcLen = new Float64Array(N);
    for (let s = 0; s < 8; s++) {
      if (child(T, s) === 'null') continue;
      const st = states[child(T, s)];
      for (let i = 0; i < st.partner.length; i++) {
        arcP[base[s] + i] = base[s] + st.partner[i];
        arcLen[base[s] + i] = st.len[i];
      }
    }
    const node = (s: number, e: number, i: number): number => base[s] + start[s][e] + i;
    const weld = new Int32Array(N).fill(-1);
    for (const [a, b] of G[T]) {
      const n = prev[child(T, a.s)][a.e];
      if (n !== prev[child(T, b.s)][b.e]) throw new Error('glued edges carry different dot counts');
      for (let i = 0; i < n; i++) {
        const x = node(a.s, a.e, i);
        const y = node(b.s, b.e, n - 1 - i);
        weld[x] = y;
        weld[y] = x;
      }
    }
    const outer = new Int32Array(N).fill(-1);
    let nOuter = 0;
    for (const arc of B[T]) for (const { s, e } of arc) for (let i = prev[child(T, s)][e] - 1; i >= 0; i--) outer[node(s, e, i)] = nOuter++;
    const order = new Int32Array(nOuter);
    for (let x = 0; x < N; x++) {
      if (outer[x] >= 0) order[outer[x]] = x;
      else if (weld[x] < 0) throw new Error(`a dot of ${T} is neither welded nor on the boundary`);
    }
    const seen = new Uint8Array(N);
    const partner = new Int32Array(nOuter);
    const len = new Float64Array(nOuter);
    for (let o = 0; o < nOuter; o++) {
      let x = order[o];
      if (seen[x]) continue;
      let l = 0;
      for (;;) {
        seen[x] = 1;
        const y = arcP[x];
        l += arcLen[x];
        seen[y] = 1;
        if (outer[y] >= 0) {
          partner[o] = outer[y];
          partner[outer[y]] = o;
          len[o] = len[outer[y]] = l;
          break;
        }
        x = weld[y];
      }
    }
    for (let x0 = 0; x0 < N; x0++) {
      if (seen[x0]) continue;
      let x = x0;
      let l = 0;
      let slots = 0;
      do {
        seen[x] = 1;
        slots |= 1 << slotOf[x];
        const y = arcP[x];
        l += arcLen[x];
        seen[y] = 1;
        slots |= 1 << slotOf[y];
        x = weld[y];
      } while (x !== x0);
      let label = '';
      for (let s = 0; s < 8; s++) if (slots & (1 << s)) label += s;
      births.push({ type: T, slots: label, len: l });
    }
    return { partner, len };
  }

  const level1 = Object.fromEntries(TYPES.map((T) => [T, geoState(T)]));
  let states: States = Object.fromEntries(TYPES.map((T) => [T, level1[T].state]));
  const births: [number, string, string, number, number][] = [];
  const tally = (k: number, list: Birth[]): void => {
    const m = new Map<string, number>();
    for (const b of list) {
      const key = `${b.type}|${b.slots}|${b.len}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    for (const [key, count] of m) {
      const [type, slots, len] = key.split('|');
      births.push([k, type, slots, Number(len), count]);
    }
  };
  tally(1, TYPES.flatMap((T) => level1[T].circuits.map((len) => ({ type: T, slots: '*', len }))));
  for (let k = 2; k <= maxLevel; k++) {
    const list: Birth[] = [];
    const prev = states;
    states = Object.fromEntries(TYPES.map((T) => [T, F(T, countsAt[k - 2], prev, list)]));
    tally(k, list);
  }
  const dots = countsAt.map((c) => TYPES.map((T) => c[T].reduce((a, x) => a + x, 0)));
  return { dots, births };
}

for (const share of shares) {
  const [rule, combo] = share.split('-');
  const cfg: Config = { id: `${family}-${share}`, family, subset: [...rule].map(Number), combo };
  console.log(JSON.stringify({ share, ...run(cfg) }));
}
