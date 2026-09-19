/**
 * Does the PERMITTED superset already force the circuits?
 *
 * `01`–`03` all lean on the observed joins: the two-tile contacts measured in
 * real patches. That is why V6 is a finite check. But the observed joins are a
 * strict subset of what label algebra allows — Lambda's `+1A` is only ever seen
 * against Gamma1, though `-1A` also exists on Xi, Pi and Psi — so a statement
 * proved over the SUPERSET would need no atlas at all.
 *
 * The superset needs one pruning rule to be worth anything, and there is an
 * exact one: every spectre corner is a whole multiple of 30 degrees, so the
 * angles a walk puts at any one tiling vertex can be summed as integers, and a
 * walk that exceeds 360 degrees there is in no tiling. That test is necessary for
 * every real circuit, so:
 *
 *     if every closed ADMISSIBLE walk has length in {3, 6, 9},
 *     then every real circuit does, with no atlas and no local-complexity input.
 *
 * This script searches that space exhaustively to a depth bound and reports what
 * it finds — including whether admissible walks can run on without closing, which
 * is what decides whether the bound is a theorem or just an absence of evidence.
 *
 * Run: cd web && npx --yes tsx sel15-proof/07-permitted-search.ts [subset] [depth]
 *   e.g.  ... 07-permitted-search.ts 15 14
 *         ... 07-permitted-search.ts 1278 12
 * Writes nothing.
 */

import {
  allSlots,
  zApply,
  zToPt,
  chordPairing,
  comboToMatchingIndices,
  interiorAngleUnits,
  joinTransform,
  leafOrder,
  options,
  permittedJoins,
  slotsOfType,
  startWalk,
  step,
  subsetFromString,
  subsetToEdges,
  zLeafPts,
  type TileTypeId,
  type WalkState,
} from '../src/core';
import { finish, heading, note, verdict } from './lib15';

const SUBSET_ARG = process.argv[2] ?? '15';
const DEPTH = Number(process.argv[3] ?? 14);
const SUBSET = subsetToEdges(subsetFromString(SUBSET_ARG));
const FAMILY = 'spectre' as const;

/** The combination strings to sweep: all non-crossing combos of this selection. */
function combos(): readonly string[] {
  const opts = leafOrder(FAMILY).map((t) => {
    const n = slotsOfType(FAMILY, t, SUBSET).length;
    if (n < 2 || n % 2 !== 0) return 1;
    // count non-crossing matchings of n points in cyclic order = Catalan(n/2)
    let cat = 1;
    for (let i = 0; i < n / 2; i++) cat = (cat * 2 * (2 * i + 1)) / (i + 2);
    return Math.round(cat);
  });
  let out: string[] = [''];
  for (const n of opts) {
    const next: string[] = [];
    for (const p of out) for (let d = 0; d < n; d++) next.push(p + String(d));
    out = next;
  }
  return out;
}

function matchingRecord(combo: string): Record<string, number> {
  const idx = comboToMatchingIndices(FAMILY, SUBSET, combo);
  const rec: Record<string, number> = {};
  leafOrder(FAMILY).forEach((t, i) => {
    rec[t] = idx[i];
  });
  return rec;
}

heading(`Selection ${SUBSET.join('')}: the permitted superset versus the observed joins`);

const slots = allSlots(FAMILY, SUBSET);
const permitted = permittedJoins(FAMILY, SUBSET);
let permittedEdges = 0;
for (const l of permitted.values()) permittedEdges += l.length;
console.log(`        slots: ${slots.length}   permitted joins: ${permittedEdges}`);
console.log('        per-slot fan-out:');
for (const s of slots) {
  console.log(`          ${s.id.padEnd(12)} -> ${(permitted.get(s.id) ?? []).map((x) => x.id).join(', ')}`);
}

heading('Corner angles, in units of 30 degrees (exact)');
const angleHist = new Map<number, number>();
for (const t of leafOrder(FAMILY)) {
  const n = zLeafPts(FAMILY, t).length;
  const row: number[] = [];
  for (let v = 0; v < n; v++) {
    const u = interiorAngleUnits(FAMILY, t, v);
    row.push(u);
    angleHist.set(u, (angleHist.get(u) ?? 0) + 1);
  }
  if (t === 'Delta') console.log(`        ${t}: ${row.map((u) => u * 30).join(' ')}`);
}
console.log(
  `        angle histogram over all types: ${[...angleHist]
    .sort((a, b) => a[0] - b[0])
    .map(([u, n]) => `${u * 30}deg x${n}`)
    .join(', ')}`,
);
verdict(
  [...angleHist.keys()].every((u) => Number.isInteger(u) && u > 0 && u < 12),
  'every corner is a whole number of 30-degree units, strictly between 0 and 360',
);

// ---------------------------------------------------------------------------
// Exhaustive search of admissible walks
// ---------------------------------------------------------------------------

interface Result {
  readonly closed: Map<number, number>;
  readonly openAtDepth: number;
  readonly maxClosed: number;
  readonly deadEnds: number;
  readonly prunedOutOfReach: number;
}

/**
 * Centroid of a placed tile, in floats — only ever used for a reachability
 * bound, never for a geometric decision.
 */
function centroid(family: typeof FAMILY, type: TileTypeId, xform: Parameters<typeof zApply>[0]) {
  const pts = zLeafPts(family, type).map((v) => zToPt(zApply(xform, v)));
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/**
 * The furthest one step can move a tile's centroid, over every permitted join.
 *
 * A closed walk of length L has every prefix within `reach * (L - k)` of its
 * origin, so a walk further out than its remaining budget can never close and is
 * pruned. That is what makes the search exhaustive FOR CLOSURES at a given depth,
 * even where admissible walks themselves run on.
 */
function stepReach(): number {
  let worst = 0;
  for (const a of slots) {
    for (const b of permitted.get(a.id) ?? []) {
      const rel = joinTransform(FAMILY, a.type, a.edge, b.type, b.edge);
      const c0 = centroid(FAMILY, a.type, { k: 0, m: 0, t: [0, 0, 0, 0] });
      const c1 = centroid(FAMILY, b.type, rel);
      worst = Math.max(worst, Math.hypot(c1.x - c0.x, c1.y - c0.y));
    }
  }
  return worst;
}

function search(combo: string): Result {
  const matching = matchingRecord(combo);
  const closed = new Map<number, number>();
  let openAtDepth = 0;
  let deadEnds = 0;
  let maxClosed = 0;
  let prunedOutOfReach = 0;

  const dfs = (state: WalkState, origin: { x: number; y: number }): void => {
    if (state.tiles.length > DEPTH) {
      openAtDepth++;
      return;
    }
    const opts = options(state).filter((o) => o.admissible);
    if (opts.length === 0) {
      deadEnds++;
      return;
    }
    for (const o of opts) {
      if (o.closes) {
        const len = state.tiles.length;
        closed.set(len, (closed.get(len) ?? 0) + 1);
        maxClosed = Math.max(maxClosed, len);
        continue;
      }
      const next = step(state, o);
      const c = centroid(FAMILY, o.slot.type, o.xform);
      const budget = DEPTH - next.tiles.length + 1;
      if (Math.hypot(c.x - origin.x, c.y - origin.y) > REACH * budget + 1e-9) {
        prunedOutOfReach++;
        continue;
      }
      dfs(next, origin);
    }
  };

  for (const s of slots) {
    if (chordPairing(FAMILY, s.type, SUBSET, matching[s.type] ?? 0)[s.seam] < 0) continue;
    const start = startWalk(FAMILY, SUBSET, matching, s.type as TileTypeId, s.seam);
    dfs(start, centroid(FAMILY, s.type as TileTypeId, start.tiles[0].xform));
  }
  return { closed, openAtDepth, maxClosed, deadEnds, prunedOutOfReach };
}

const REACH = stepReach();
heading(`Exhaustive search of CLOSABLE admissible walks, depth bound ${DEPTH}`);
console.log(`        one step moves a tile centre at most ${REACH.toFixed(6)}, so a walk further`);
console.log(`        from its origin than that times its remaining budget is pruned: it can never close`);
const all = combos();
console.log(`        ${all.length} combination string(s) to sweep`);
let anyLong = false;
let anyOpen = false;
for (const combo of all) {
  const r = search(combo);
  const lens = [...r.closed.keys()].sort((a, b) => a - b);
  const bad = lens.filter((L) => L !== 3 && L !== 6 && L !== 9);
  anyLong = anyLong || bad.length > 0;
  anyOpen = anyOpen || r.openAtDepth > 0;
  console.log(
    `        ${combo}  closed lengths ${JSON.stringify(lens)}` +
      `  dead ends ${r.deadEnds}` +
      `  pruned as unable to return ${r.prunedOutOfReach}` +
      `  still open at depth ${DEPTH}: ${r.openAtDepth}` +
      (bad.length ? `  OUTSIDE {3,6,9}: ${bad.join(',')}` : ''),
  );
}

verdict(!anyLong, `no closed admissible walk of length <= ${DEPTH} lies outside {3,6,9}`);
if (anyOpen) {
  note(
    `admissible walks still reach depth ${DEPTH} without closing`,
    'those cannot be circuits of this length, but a LONGER circuit is not ruled out by this run',
  );
} else {
  verdict(
    true,
    'no admissible walk survives to the depth bound at all',
    'the search is exhaustive without needing the reachability bound',
  );
}
note(
  'what this does and does not assume',
  'it uses only label compatibility, the exact 30-degree angle count and non-overlap — no cluster atlas, so V6 is not needed here; it still assumes V0b',
);

finish();
