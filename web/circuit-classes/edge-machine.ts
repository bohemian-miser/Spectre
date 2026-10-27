/**
 * The edge machine: is a pattern's routing, at every level at once, a finite
 * automaton on crossing addresses?
 *
 * Every supertile is combinatorially a hexagon (FASS_THEOREM.md §1-3): six
 * meta-edges, each a fixed concatenation of child meta-edges, traversed
 * backwards (table B), with the same glued pairs inside every parent (G). So
 * a crossing on meta-edge j of a level-k supertile of type T has an ADDRESS:
 * the edge j, then which piece of B[T][j] it lies in, then which piece of
 * that child edge, and so on down to level 1 (a Dumont-Thomas numeration of
 * the edge substitution).
 *
 * A pattern's boundary state at level k (routing-orbit.ts's operator F) maps
 * each crossing to the one its strand leaves by. Read the two addresses side
 * by side from the top: after r digits the input is in a level-(k-r) piece u
 * and the output in a piece v. The RESIDUAL of (u, v) is the partial map from
 * u's crossings to v's that the strand makes. If only finitely many residuals
 * ever occur, a finite automaton reads any input address and writes its
 * output address, for every level: the edge machine. Its states are the
 * residuals (Myhill-Nerode), and everything about the pattern at any level,
 * including whether strands close and the limit shape, follows from it.
 *
 * `residualCounts` measures this on the exact states to level K: for each
 * piece level m, how many distinct residuals occur. Bounded and settled as m
 * grows means the machine exists; growing means it does not (in this form).
 *
 * Usage: tsx edge-machine.ts <family> <rule-combo> <K>
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zAdd, zKey, type TileFamilyId, type TileTypeId } from '../src/core';
import { buildStrands, trace, zExpand, type Config } from '../fass-proof/lib';
import { TYPES, edgeLabels, leaves, outlineOf } from '../fass-theorem/geom';

interface ChildEdge {
  readonly s: number;
  readonly e: number;
}

export interface Tables {
  readonly B: Record<string, ChildEdge[][]>;
  readonly G: Record<string, [ChildEdge, ChildEdge][]>;
  readonly rules: Record<string, string[]>;
  readonly corners1: Record<string, number[]>;
  readonly words1: Record<string, { lab: string[] }[]>;
}

export function loadTables(family: TileFamilyId): Tables {
  const J = JSON.parse(readFileSync(fileURLToPath(new URL(`../fass-theorem/tables-${family}.json`, import.meta.url)), 'utf8'));
  return { B: J.B, G: J.G, rules: J.rules, corners1: J.corners['1'], words1: J.words['1'] };
}

/** One level: per type, crossings per meta-edge, and the boundary state (partner of each crossing, meta-edge order). */
export interface Level {
  readonly counts: Record<string, number[]>;
  readonly partner: Record<string, Int32Array>;
}

/** The exact boundary states, levels 1..K (index 0 is level 1), by routing-orbit.ts's operator F. */
export function routingLevels(family: TileFamilyId, subset: readonly number[], combo: string, K: number, tb = loadTables(family)): Level[] {
  const cfg: Config = { id: `${family}-${subset.join('')}-${combo}`, family, subset: [...subset], combo };
  const sel = new Set(subset);
  const hasDot = (label: string): boolean => {
    const m = /^(-?)(\d+)\.(\d+)[A-Z]$/.exec(label)!;
    return +m[3] === 0 && sel.has(+m[2]);
  };
  const child = (T: string, s: number) => tb.rules[T][s];
  const counts1 = Object.fromEntries(TYPES.map((T) => [T, tb.words1[T].map((w) => w.lab.filter(hasDot).length)]));
  const partner1: Record<string, Int32Array> = {};
  for (const T of TYPES) {
    const tr = trace(buildStrands(cfg, zExpand(family, T as TileTypeId, 1)));
    const lv = leaves(family, T as TileTypeId, 1);
    const o = outlineOf(family, lv);
    const n = o.loop.length;
    const corners = tb.corners1[T];
    const keys: string[] = [];
    for (let j = 0; j < 6; j++) {
      const a = corners[j];
      const len = (((corners[(j + 1) % 6] - a) % n) + n) % n;
      for (let p = 0; p < len; p++) {
        const i = (a + p) % n;
        const ow = o.owner[i];
        if (hasDot(edgeLabels(family, lv[ow.leaf].type)[ow.edge])) keys.push(zKey(zAdd(o.coord.get(o.loop[i])!, o.coord.get(o.loop[(i + 1) % n])!)));
      }
    }
    const index = new Map(keys.map((k, i) => [k, i] as const));
    const partner = new Int32Array(keys.length).fill(-1);
    for (const arc of tr.arcs) {
      const [a, b] = arc.endpoints.map((k) => index.get(k)!);
      partner[a] = b;
      partner[b] = a;
    }
    if (partner.includes(-1)) throw new Error(`${T}@1: a boundary crossing is on no arc`);
    partner1[T] = partner;
  }
  const levels: Level[] = [{ counts: counts1, partner: partner1 }];
  for (let k = 2; k <= K; k++) {
    const prev = levels[k - 2];
    const counts: Record<string, number[]> = {};
    const partner: Record<string, Int32Array> = {};
    for (const T of TYPES) {
      counts[T] = tb.B[T].map((arc) => arc.reduce((a, { s, e }) => a + prev.counts[child(T, s)][e], 0));
      const base = new Int32Array(9);
      const start: number[][] = [];
      for (let s = 0; s < 8; s++) {
        const c = child(T, s) === 'null' ? [0, 0, 0, 0, 0, 0] : prev.counts[child(T, s)];
        let acc = 0;
        start.push(c.map((x) => ((acc += x), acc - x)));
        base[s + 1] = base[s] + acc;
      }
      const N = base[8];
      const arcP = new Int32Array(N);
      for (let s = 0; s < 8; s++) {
        if (child(T, s) === 'null') continue;
        const st = prev.partner[child(T, s)];
        for (let i = 0; i < st.length; i++) arcP[base[s] + i] = base[s] + st[i];
      }
      const node = (s: number, e: number, i: number) => base[s] + start[s][e] + i;
      const weld = new Int32Array(N).fill(-1);
      for (const [a, b] of tb.G[T]) {
        const n = prev.counts[child(T, a.s)][a.e];
        for (let i = 0; i < n; i++) {
          weld[node(a.s, a.e, i)] = node(b.s, b.e, n - 1 - i);
          weld[node(b.s, b.e, n - 1 - i)] = node(a.s, a.e, i);
        }
      }
      const outer = new Int32Array(N).fill(-1);
      let nOuter = 0;
      for (const arc of tb.B[T]) for (const { s, e } of arc) for (let i = prev.counts[child(T, s)][e] - 1; i >= 0; i--) outer[node(s, e, i)] = nOuter++;
      const order = new Int32Array(nOuter);
      for (let x = 0; x < N; x++) if (outer[x] >= 0) order[outer[x]] = x;
      const p = new Int32Array(nOuter).fill(-1);
      for (let o = 0; o < nOuter; o++) {
        if (p[o] >= 0) continue;
        let x = order[o];
        for (;;) {
          const y = arcP[x];
          if (outer[y] >= 0) {
            p[o] = outer[y];
            p[outer[y]] = o;
            break;
          }
          x = weld[y];
        }
      }
      partner[T] = p;
    }
    levels.push({ counts, partner });
  }
  return levels;
}

/**
 * Addresses. At level k a crossing of type T is (j, p): meta-edge j,
 * position p along it. Its piece at the next level down: the index i of the
 * piece of B[T][j] it lies in, the child edge (type, e), and its position
 * inside that child edge (reversed, since parents traverse child edges
 * backwards).
 */
export function descend(tb: Tables, levels: Level[], k: number, T: string, j: number, p: number): { i: number; type: string; e: number; q: number } {
  const prev = levels[k - 2].counts;
  let off = 0;
  const arc = tb.B[T][j];
  for (let i = 0; i < arc.length; i++) {
    const { s, e } = arc[i];
    const type = tb.rules[T][s];
    const n = prev[type][e];
    if (p < off + n) return { i, type, e, q: n - 1 - (p - off) };
    off += n;
  }
  throw new Error('position past the end of the edge');
}

/** Meta-edge and position of crossing index x (meta-edge order) of a level-k T. */
export function edgeOf(levels: Level[], k: number, T: string, x: number): { j: number; p: number } {
  const c = levels[k - 1].counts[T];
  let j = 0;
  while (x >= c[j]) x -= c[j++];
  return { j, p: x };
}

/**
 * Residuals, measured at top level K for every type: for every depth r (piece
 * level m = K - r) and every pair (u, v) of depth-r pieces of the top
 * supertile's outline that some strand joins, the partial map from u's
 * crossings (in u's own order) to v's. Returns per m: pieces, residuals, and
 * distinct residuals (keyed by the two pieces' edge types and the map).
 */
export function residualCounts(tb: Tables, levels: Level[], K: number, types: readonly string[] = TYPES) {
  // For every top-level crossing, its depth-r piece key and position in that piece, for r = 0..K-1.
  const rows: { m: number; pieces: number; pairs: number; distinct: number }[] = [];
  const distinct: Set<string>[] = Array.from({ length: K + 1 }, () => new Set());
  const pairsAt = new Array<number>(K + 1).fill(0);
  const piecesAt = new Array<number>(K + 1).fill(0);
  for (const T of types) {
    const top = levels[K - 1];
    const n = top.partner[T].length;
    // path[x][r] = {pieceId, type, e, q} after r descents
    const pieceId: Int32Array[] = [];
    const pieceType: string[][] = [];
    const posIn: Int32Array[] = [];
    let curType = new Array<string>(n).fill(T);
    let curE = new Int32Array(n);
    let curQ = new Int32Array(n);
    let curId = new Int32Array(n);
    for (let x = 0; x < n; x++) {
      const { j, p } = edgeOf(levels, K, T, x);
      curE[x] = j;
      curQ[x] = p;
      curId[x] = j;
    }
    pieceId.push(curId.slice());
    pieceType.push(curType.map((t, x) => `${t}.${curE[x]}`));
    posIn.push(curQ.slice());
    for (let r = 1; r < K; r++) {
      const k = K - r + 1; // level of the current piece
      const nextType = new Array<string>(n);
      const nextE = new Int32Array(n);
      const nextQ = new Int32Array(n);
      const nextId = new Int32Array(n);
      const ids = new Map<string, number>();
      for (let x = 0; x < n; x++) {
        const d = descend(tb, levels, k, curType[x], curE[x], curQ[x]);
        nextType[x] = d.type;
        nextE[x] = d.e;
        nextQ[x] = d.q;
        const key = `${curId[x]}/${d.i}`;
        let id = ids.get(key);
        if (id === undefined) ids.set(key, (id = ids.size));
        nextId[x] = id;
      }
      curType = nextType;
      curE = nextE;
      curQ = nextQ;
      curId = nextId;
      pieceId.push(curId.slice());
      pieceType.push(curType.map((t, x) => `${t}.${curE[x]}`));
      posIn.push(curQ.slice());
    }
    const partner = top.partner[T];
    for (let r = 0; r < K; r++) {
      const m = K - r;
      const groups = new Map<string, number[]>();
      const pieceSizes = new Map<number, number>();
      for (let x = 0; x < n; x++) {
        pieceSizes.set(pieceId[r][x], (pieceSizes.get(pieceId[r][x]) ?? 0) + 1);
        const y = partner[x];
        const key = `${pieceId[r][x]}>${pieceId[r][y]}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(x);
      }
      piecesAt[m] += pieceSizes.size;
      for (const [, xs] of groups) {
        const x0 = xs[0];
        const y0 = partner[x0];
        const size = pieceSizes.get(pieceId[r][x0])!;
        const map = new Int32Array(size).fill(-1);
        for (const x of xs) map[posIn[r][x]] = posIn[r][partner[x]];
        distinct[m].add(`${pieceType[r][x0]}>${pieceType[r][y0]}|${map.join(',')}`);
        pairsAt[m]++;
      }
    }
  }
  for (let m = K; m >= 1; m--) rows.push({ m, pieces: piecesAt[m], pairs: pairsAt[m], distinct: distinct[m].size });
  return rows;
}

if (process.argv[1]?.endsWith('edge-machine.ts')) {
  const [family, share, kArg] = process.argv.slice(2);
  const [rule, combo] = share.split('-');
  const K = Number(kArg);
  const fam = family as TileFamilyId;
  const tb = loadTables(fam);
  const t0 = Date.now();
  const levels = routingLevels(fam, [...rule].map(Number), combo, K, tb);
  console.log(`${family} ${share}: states to level ${K} in ${((Date.now() - t0) / 1000).toFixed(1)}s; crossings per type at level ${K}: ${TYPES.map((T) => levels[K - 1].partner[T].length).join(' ')}`);
  const pi = process.argv.indexOf('--predicts');
  if (pi >= 0) {
    const K1 = Number(process.argv[pi + 1]);
    console.log(`classes of the level-${K} residuals missing from the level-${K1} machine, by refinement depth:`);
    for (const r of predicts(tb, levels, K1, K)) console.log(`  d=${r.d}: level-${K1} classes ${r.small}, level-${K} classes ${r.big}, new ones ${r.missing} (plus ${r.missingTop} among the top two levels)`);
  } else if (process.argv.includes('--overlap')) {
    const ti = process.argv.indexOf('--top');
    const res = residualGraph(tb, levels, K, ti >= 0 ? [process.argv[ti + 1]] : TYPES);
    console.log(`${res.length} residuals`);
    const { sigs } = refine(res, 2);
    for (const d of [1, 2]) {
      console.log(`depth ${d}: shared classes between piece levels (rows m, columns m'), levels ${d + 2}..${K - 2}`);
      const ms: number[] = [];
      for (let m = d + 2; m <= K - 2; m++) ms.push(m);
      const union = new Set<string>();
      const sets = ms.map((m) => new Set(res.map((r, i) => (r.m === m ? sigs[d][i] : null)).filter((x) => x !== null)));
      console.log(`        ${ms.map((m) => `m=${m}`.padStart(6)).join('')}`);
      sets.forEach((A, a) => {
        for (const x of A) union.add(x);
        console.log(`  m=${ms[a]} ${sets.map((B) => String([...A].filter((x) => B.has(x)).length).padStart(6)).join('')}   (${A.size}; all levels to here ${union.size})`);
      });
    }
  } else if (process.argv.includes('--period')) {
    const res = residualGraph(tb, levels, K);
    const { sigs } = refine(res, 5);
    console.log('state classes on level m against level m + 2 (levels with at least three levels of context above):');
    for (let d = 1; d <= 5; d++) {
      const parts: string[] = [];
      for (let m = d + 2; m + 2 <= K - 3; m++) {
        const A = new Set(res.map((r, i) => (r.m === m ? sigs[d][i] : null)).filter((x) => x !== null));
        const B = new Set(res.map((r, i) => (r.m === m + 2 ? sigs[d][i] : null)).filter((x) => x !== null));
        const both = [...A].filter((x) => B.has(x)).length;
        parts.push(`m=${m}: ${A.size} vs ${B.size}, shared ${both}`);
      }
      console.log(`  d=${d}: ${parts.join(' | ')}`);
    }
  } else if (process.argv.includes('--refine')) {
    const res = residualGraph(tb, levels, K);
    console.log(`${res.length} residuals; classes per piece level m = 1..${K}, by refinement depth d:`);
    for (const row of refine(res, 6).table) console.log(`  d=${row.d}: ${row.perLevel.join(' ')}`);
  } else {
    console.log('piece level m | pieces | (u,v) pairs | distinct residuals');
    for (const r of residualCounts(tb, levels, K)) console.log(`  m=${r.m}  ${r.pieces}  ${r.pairs}  ${r.distinct}`);
  }
}

/** FNV-1a over a partial map, two independent 32-bit lanes. */
function mapHash(map: Int32Array): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < map.length; i++) {
    const v = map[i] + 2;
    h1 = Math.imul(h1 ^ v, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (v + i * 7919), 0x5bd1e995) >>> 0;
  }
  return `${map.length}:${h1.toString(36)}:${h2.toString(36)}`;
}

export interface Residual {
  readonly m: number;
  /** Edge types of the input and output pieces, `Type.edge`. */
  readonly from: string;
  readonly to: string;
  readonly hash: string;
  /** Transitions: input digit, output digit, residual one level down. */
  readonly next: [number, number, number][];
}

/**
 * Every distinct residual of a pattern's level-K states (all types as the
 * top supertile), with its transitions. Residuals are identified by their
 * edge types and the partial map itself, so two equal residuals have equal
 * transitions wherever they occur.
 *
 * Every piece is a contiguous run of the top supertile's crossings (a child
 * edge's crossings appear in its parent edge as one reversed block), so the
 * pieces are found as intervals, level by level, without visiting crossings.
 */
export function residualGraph(tb: Tables, levels: Level[], K: number, types: readonly string[] = TYPES): Residual[] {
  const out: Residual[] = [];
  const ids = new Map<string, number>();
  const edgeName = (t: string, e: number) => `${t}.${e}`;
  for (const T of types) {
    const top = levels[K - 1];
    const partner = top.partner[T];
    const n = partner.length;
    // Pieces per depth: start (in top order), length, type, edge, reversed, digit.
    interface Piece { start: number; len: number; type: string; e: number; rev: boolean; digit: number }
    let pieces: Piece[] = [];
    {
      let off = 0;
      top.counts[T].forEach((c, j) => {
        pieces.push({ start: off, len: c, type: T, e: j, rev: false, digit: j });
        off += c;
      });
    }
    const pid: Int32Array[] = [];
    const pos: Int32Array[] = [];
    const dig: Int32Array[] = [];
    const ptype: string[][] = [];
    for (let r = 0; r < K; r++) {
      const k = K - r; // level of these pieces
      const id = new Int32Array(n);
      const q = new Int32Array(n);
      const dg = new Int32Array(n);
      const names: string[] = [];
      pieces.forEach((pc, i) => {
        names.push(edgeName(pc.type, pc.e));
        id.fill(i, pc.start, pc.start + pc.len);
        dg.fill(pc.digit, pc.start, pc.start + pc.len);
        for (let t = 0; t < pc.len; t++) q[pc.start + t] = pc.rev ? pc.len - 1 - t : t;
      });
      pid.push(id);
      pos.push(q);
      dig.push(dg);
      ptype.push(names);
      if (k === 1) break;
      const prev = levels[k - 2].counts;
      const next: Piece[] = [];
      for (const pc of pieces) {
        // In the piece's own order the parts of B are consecutive, each reversed relative to the piece.
        const arc = tb.B[pc.type][pc.e];
        let off = 0;
        const parts = arc.map(({ s, e }, i) => {
          const type = tb.rules[pc.type][s];
          const len = prev[type][e];
          const part = { ownStart: off, len, type, e, digit: i };
          off += len;
          return part;
        });
        for (const part of parts) {
          // Own coordinate u in [ownStart, ownStart+len) maps to top position start + (rev ? pc.len-1-u : u).
          const start = pc.rev ? pc.start + pc.len - (part.ownStart + part.len) : pc.start + part.ownStart;
          // The child's own order runs backwards along its parent's, so it is reversed relative to top order unless the parent was.
          next.push({ start, len: part.len, type: part.type, e: part.e, rev: !pc.rev, digit: part.digit });
        }
      }
      pieces = next;
    }
    const depth = pid.length;
    const resAt: Map<number, number>[] = Array.from({ length: depth }, () => new Map());
    for (let r = depth - 1; r >= 0; r--) {
      const m = K - r;
      const groups = new Map<number, number[]>();
      for (let x = 0; x < n; x++) {
        const key = pid[r][x] * 4194304 + pid[r][partner[x]];
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(x);
      }
      const sizes = new Map<number, number>();
      for (let x = 0; x < n; x++) sizes.set(pid[r][x], (sizes.get(pid[r][x]) ?? 0) + 1);
      for (const [key, xs] of groups) {
        const x0 = xs[0];
        const y0 = partner[x0];
        const map = new Int32Array(sizes.get(pid[r][x0])!).fill(-1);
        for (const x of xs) map[pos[r][x]] = pos[r][partner[x]];
        const from = ptype[r][pid[r][x0]];
        const to = ptype[r][pid[r][y0]];
        const h = mapHash(map);
        const sig = `${m}|${from}>${to}|${h}`;
        let id = ids.get(sig);
        if (id === undefined) {
          id = out.length;
          ids.set(sig, id);
          const next: [number, number, number][] = [];
          if (r + 1 < depth) {
            const seen = new Set<number>();
            for (const x of xs) {
              const ck = pid[r + 1][x] * 4194304 + pid[r + 1][partner[x]];
              if (seen.has(ck)) continue;
              seen.add(ck);
              next.push([dig[r + 1][x], dig[r + 1][partner[x]], resAt[r + 1].get(ck)!]);
            }
            next.sort((p1, p2) => p1[0] - p2[0] || p1[1] - p2[1]);
          }
          out.push({ m, from, to, hash: h, next });
        }
        resAt[r].set(key, id);
      }
    }
  }
  return out;
}

/**
 * Minimise the residual graph by depth: sig_0 is the two edge types (and the
 * map itself at level 1); sig_(d+1) adds the transitions' digits and
 * children's sig_d. Reports, per depth d and piece level m, how many classes
 * there are. The machine is finite when, for some d, refining once more
 * splits nothing on the deep levels and the classes on level m are those on
 * level m + 2.
 */
export function refine(res: Residual[], maxDepth: number) {
  const K = Math.max(...res.map((r) => r.m));
  let sig = res.map((r) => (r.m === 1 ? `${r.from}>${r.to}|${r.hash}` : `${r.from}>${r.to}`));
  const table: { d: number; perLevel: number[] }[] = [];
  const sigs: string[][] = [sig];
  for (let d = 0; d <= maxDepth; d++) {
    const perLevel: number[] = [];
    for (let m = 1; m <= K; m++) perLevel.push(new Set(res.map((r, i) => (r.m === m ? sig[i] : null)).filter((s) => s !== null)).size);
    table.push({ d, perLevel });
    const ids = new Map<string, number>();
    const intern = (s: string) => {
      let v = ids.get(s);
      if (v === undefined) ids.set(s, (v = ids.size));
      return v;
    };
    const flat = sig.map(intern);
    sig = res.map((r, i) => `${r.m === 1 ? sigs[0][i] : `${r.from}>${r.to}`}|${r.next.map(([a, b, c]) => `${a},${b},${flat[c]}`).join(';')}`);
    sigs.push(sig);
  }
  return { table, sigs };
}

/**
 * Does the machine read off level-K1 data generate level K2? Refine the two
 * residual graphs together and list, per depth d, the classes of the level-K2
 * graph that the level-K1 graph does not have. None (for a d at which the
 * refinement has settled) means every residual of level K2, the new top
 * levels included, is a state of the smaller machine with the same moves.
 */
export function predicts(tb: Tables, levels: Level[], K1: number, K2: number, maxDepth = 5) {
  const a = residualGraph(tb, levels, K1);
  const b = residualGraph(tb, levels, K2);
  const all: Residual[] = [...a, ...b.map((r) => ({ ...r, next: r.next.map(([x, y, c]) => [x, y, c + a.length] as [number, number, number]) }))];
  const { sigs } = refine(all, maxDepth);
  const rows: { d: number; small: number; big: number; missing: number; missingTop: number }[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const s = sigs[d];
    // A depth-d signature is the same object at every level only above level d + 1 (below that it reaches the level-1 maps).
    const above = (i: number) => all[i].m > d + 1;
    const small = new Set(s.slice(0, a.length).filter((_, i) => above(i)));
    const big = new Set(s.slice(a.length).filter((_, i) => above(i + a.length)));
    let missing = 0;
    let missingTop = 0;
    const seen = new Set<string>();
    for (let i = a.length; i < all.length; i++) {
      if (!above(i) || small.has(s[i]) || seen.has(s[i])) continue;
      seen.add(s[i]);
      if (all[i].m > K1 - 2) missingTop++;
      else missing++;
    }
    rows.push({ d, small: small.size, big: big.size, missing, missingTop });
  }
  return rows;
}
