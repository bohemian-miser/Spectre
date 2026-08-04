/**
 * Flavour recovery from a TYPE-ERASED substitution hierarchy.
 *
 * Context (docs/TILE_ALGOS_INVESTIGATION.md): the SMKGS cluster construction
 * (necocen/spectre's SpectreCluster/MysticCluster) and any other "type-erased"
 * representation of the spectre hierarchy keep only the tree *shape*: which
 * child slot each node occupies, plus which child is the Mystic (Gamma).
 * The 9 SMKGS flavours (Gamma..Psi) are not stored per tile.
 *
 * This script verifies computationally that the flavours are nevertheless an
 * exact function of the type-erased tree, and measures how much ancestor
 * context is needed:
 *
 *   Part A — machine-checks that Simon Tatham's hexagon tables
 *            (spectre-tables-manual.h in his puzzle collection: subhexes_G..Y,
 *            child layout indices 0..7) are isomorphic to core's SUPER_RULES
 *            under a fixed slot permutation + the type renaming
 *            G,D,J,L,X,P,S,F,Y -> Gamma,Delta,Theta,Lambda,Xi,Pi,Sigma,Phi,Psi.
 *            (I.e. his combinatorial coordinates carry OUR flavours natively.)
 *
 *   Part B — for buildSystem('spectre', L) with every root type: erase all
 *            types, keep only the child-slot paths from flatten(), then
 *            reconstruct each leaf's flavour from the erased tree alone with
 *            the root type treated as UNKNOWN (candidate set = all 9).
 *            Propagation rule: S(child at slot s) = { SUPER_RULES[t][s] :
 *            t in S(parent) } \ {null}. A leaf is "determined" iff |S| == 1.
 *            Compares determined types tile-by-tile against the true
 *            flatten() output and reports ambiguity statistics.
 *
 *   Part C — per-leaf minimal ancestor context: the smallest k such that the
 *            last k slots of the path alone (ancestor k+1 unknown) already
 *            pin the flavour.
 *
 * Run (from web/):
 *   <path-to>/tsx algo-investigation/flavour-recovery.ts
 * (any TS runner works; the script only imports from ../src/core)
 */

import { buildSystem, flatten } from '../src/core/tiles';
import { TILE_NAMES, type TileTypeId } from '../src/core/families';

// ---------------------------------------------------------------------------
// Shared: SUPER_RULES (re-declared verbatim from core/tiles.ts, where it is
// not exported).
// ---------------------------------------------------------------------------
const SUPER_RULES: Readonly<Record<string, readonly string[]>> = {
  Gamma: ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
  Delta: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
  Theta: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
  Lambda: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
  Xi: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
  Pi: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
  Sigma: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
  Phi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
  Psi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
};

// ---------------------------------------------------------------------------
// Part A: Tatham's subhexes tables (hand-copied from spectre-tables-manual.h,
// sgt-puzzles; child layout indices 0..7 as documented there:
//     0 1
//    2 3
//   4 5 6
//      7
// G expands to 7 children, #7 missing).
// ---------------------------------------------------------------------------
const TATHAM_SUBHEXES: Readonly<Record<string, readonly string[]>> = {
  G: ['F', 'X', 'G', 'S', 'P', 'D', 'J'],
  D: ['F', 'P', 'G', 'S', 'X', 'D', 'F', 'X'],
  J: ['F', 'P', 'G', 'S', 'Y', 'D', 'F', 'P'],
  L: ['F', 'P', 'G', 'S', 'Y', 'D', 'F', 'X'],
  X: ['F', 'Y', 'G', 'S', 'Y', 'D', 'F', 'P'],
  P: ['F', 'Y', 'G', 'S', 'Y', 'D', 'F', 'X'],
  S: ['L', 'P', 'G', 'S', 'X', 'D', 'F', 'X'],
  F: ['F', 'P', 'G', 'S', 'Y', 'D', 'F', 'Y'],
  Y: ['F', 'Y', 'G', 'S', 'Y', 'D', 'F', 'Y'],
};

const RENAME: Readonly<Record<string, TileTypeId>> = {
  G: 'Gamma', D: 'Delta', J: 'Theta', L: 'Lambda', X: 'Xi',
  P: 'Pi', S: 'Sigma', F: 'Phi', Y: 'Psi',
};

function partA(): void {
  console.log('=== Part A: Tatham subhexes tables vs core SUPER_RULES ===');
  // Search for a permutation perm: tathamIndex -> ourSlot such that for every
  // type T and every tatham child index i, RENAME[subhexes_T[i]] ==
  // SUPER_RULES[RENAME[T]][perm[i]], with G's missing #7 mapping to our
  // 'null' slot.
  const tathamLetters = Object.keys(TATHAM_SUBHEXES);
  const ourSlots = [0, 1, 2, 3, 4, 5, 6, 7];

  // Build constraint: for tatham index i, the candidate our-slots are those s
  // where the whole column matches under renaming.
  const candidates: number[][] = [];
  for (let i = 0; i < 8; ++i) {
    const cands: number[] = [];
    for (const s of ourSlots) {
      let ok = true;
      for (const t of tathamLetters) {
        const ours = SUPER_RULES[RENAME[t]][s];
        const theirs = TATHAM_SUBHEXES[t][i]; // undefined for G at i=7
        if (t === 'G' && i === 7) {
          if (ours !== 'null') ok = false; // G's missing child = our null slot
        } else if (theirs === undefined) {
          ok = false;
        } else if (ours !== RENAME[theirs]) {
          ok = false;
        }
      }
      if (ok) cands.push(s);
    }
    candidates.push(cands);
  }
  // But G only has indices 0..6; index 7 must map to our null slot (2).
  // Verify a full permutation exists (backtracking; columns are near-unique
  // so this is instant).
  const used = new Set<number>();
  const perm: number[] = new Array(8).fill(-1);
  const solve = (i: number): boolean => {
    if (i === 8) return true;
    for (const s of candidates[i]) {
      if (used.has(s)) continue;
      used.add(s);
      perm[i] = s;
      if (solve(i + 1)) return true;
      used.delete(s);
    }
    return false;
  };
  const found = solve(0);
  if (!found) {
    console.log('FAIL: no slot permutation matches — tables are NOT isomorphic');
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: unique renaming G,D,J,L,X,P,S,F,Y -> ${tathamLetters.map((t) => RENAME[t]).join(',')}`);
  console.log(`      slot permutation tatham index i -> our slot: [${perm.join(', ')}]`);
  // Double-check exhaustively.
  let checks = 0;
  for (const t of tathamLetters) {
    for (let i = 0; i < 8; ++i) {
      const ours = SUPER_RULES[RENAME[t]][perm[i]];
      const theirs = TATHAM_SUBHEXES[t][i];
      if (t === 'G' && i === 7) {
        if (ours !== 'null') throw new Error('G null mismatch');
      } else if (RENAME[theirs] !== ours) {
        throw new Error(`mismatch ${t}[${i}]`);
      }
      ++checks;
    }
  }
  console.log(`      ${checks} cells re-verified\n`);
}

// ---------------------------------------------------------------------------
// Part B: flavour recovery from type-erased slot paths.
// ---------------------------------------------------------------------------
const ALL9: readonly TileTypeId[] = TILE_NAMES; // Gamma..Psi

function stepSet(S: ReadonlySet<string>, slot: number): Set<string> {
  const out = new Set<string>();
  for (const t of S) {
    const c = SUPER_RULES[t]?.[slot];
    if (c && c !== 'null') out.add(c);
  }
  return out;
}

interface LeafRecord {
  path: readonly number[]; // child pos at each level, root-first
  trueType: TileTypeId;
}

function leafRecords(rootLabel: TileTypeId, level: number): LeafRecord[] {
  const sys = buildSystem('spectre', level);
  const insts = flatten(sys[rootLabel]);
  return insts.map((inst) => ({
    path: inst.id.split('.').map(Number),
    trueType: inst.type,
  }));
}

function partB(level: number): void {
  console.log(`=== Part B: recovery from erased tree, level ${level}, all 9 roots ===`);
  let total = 0;
  let determined = 0;
  let correct = 0;
  let ambiguous = 0;
  let ambiguousContainingTruth = 0;
  const ambiguousSetSizes = new Map<number, number>();
  const ambiguousSlotProfile = new Map<string, number>();

  for (const rootLabel of ALL9) {
    for (const leaf of leafRecords(rootLabel, level)) {
      ++total;
      // Type-erased data: leaf.path only. Root type unknown -> all 9.
      let S: Set<string> = new Set(ALL9);
      // In the spectre family a leaf path has `level` segments for plain
      // leaves and `level+1` for the Gamma pair (last segment 0/1 inside the
      // level-0 Gamma meta). The pair segment is NOT a SUPER_RULES slot.
      const hasPairSegment = leaf.path.length === level + 1;
      const slots = hasPairSegment ? leaf.path.slice(0, level) : leaf.path;
      for (const s of slots) S = stepSet(S, s);
      // Resolve the Gamma pair structurally (Mystic lower/upper).
      let result: Set<string>;
      if (hasPairSegment) {
        // Parent must be Gamma for a pair segment to exist; sanity-check that
        // the erased propagation agrees (or at least allows it).
        if (!S.has('Gamma')) throw new Error('pair segment under non-Gamma?');
        result = new Set([leaf.path[level] === 0 ? 'Gamma1' : 'Gamma2']);
        // Erased-tree view: we know the node is the mystic iff |S|==1 here;
        // structurally the pair itself is the giveaway, so this is exact.
        if (S.size !== 1) {
          // Type of the *pair parent* was ambiguous by slots alone, but the
          // existence of the 2-tile mystic resolves it to Gamma. Count as
          // determined via structure.
        }
      } else {
        result = S;
      }

      if (result.size === 1) {
        ++determined;
        const got = [...result][0];
        if (got === leaf.trueType) ++correct;
        else {
          console.log(`MISMATCH root=${rootLabel} path=${leaf.path.join('.')} got=${got} true=${leaf.trueType}`);
          process.exitCode = 1;
        }
      } else {
        ++ambiguous;
        if (result.has(leaf.trueType)) ++ambiguousContainingTruth;
        ambiguousSetSizes.set(result.size, (ambiguousSetSizes.get(result.size) ?? 0) + 1);
        const profile = slots.join('.');
        ambiguousSlotProfile.set(profile, (ambiguousSlotProfile.get(profile) ?? 0) + 1);
      }
    }
  }
  console.log(`leaves: ${total}; determined: ${determined}; correct: ${correct}; ambiguous: ${ambiguous}`);
  console.log(`ambiguous sets containing the true type: ${ambiguousContainingTruth}/${ambiguous}`);
  console.log(`ambiguous set-size histogram: ${JSON.stringify([...ambiguousSetSizes])}`);
  const profiles = [...ambiguousSlotProfile.keys()];
  console.log(`distinct ambiguous slot paths: ${profiles.length}`);
  console.log(`  e.g. ${profiles.slice(0, 8).join('  ')}`);
  // Verify the structural claim: every ambiguous path is a chain whose slots
  // all lie in {0,2,5} (the only columns of SUPER_RULES that are not
  // determined by slot + structurally-known parent info).
  const bad = profiles.filter((p) => p.split('.').some((s) => !['0', '2', '5'].includes(s)));
  console.log(`ambiguous paths with a slot outside {0,2,5}: ${bad.length}${bad.length ? ' e.g. ' + bad.slice(0, 3).join(' ') : ''}`);
  console.log(determined === correct + 0 && determined + ambiguous === total ? 'PART B PASS (all determined leaves match core exactly)\n' : 'PART B FAIL\n');
}

// ---------------------------------------------------------------------------
// Part C: minimal ancestor-context depth per leaf.
// ---------------------------------------------------------------------------
function partC(level: number): void {
  console.log(`=== Part C: minimal suffix context needed, level ${level} ===`);
  const hist = new Map<number, number>();
  let unresolvedAtRoot = 0;
  for (const rootLabel of ALL9) {
    for (const leaf of leafRecords(rootLabel, level)) {
      const hasPair = leaf.path.length === level + 1;
      const slots = hasPair ? leaf.path.slice(0, level) : leaf.path;
      if (hasPair) {
        // Mystic pair members are always determined with zero extra context.
        hist.set(0, (hist.get(0) ?? 0) + 1);
        continue;
      }
      let k = -1;
      for (let ctx = 1; ctx <= slots.length; ++ctx) {
        let S: Set<string> = new Set(ALL9);
        for (const s of slots.slice(slots.length - ctx)) S = stepSet(S, s);
        if (S.size === 1) { k = ctx; break; }
      }
      if (k === -1) ++unresolvedAtRoot;
      else hist.set(k, (hist.get(k) ?? 0) + 1);
    }
  }
  const keys = [...hist.keys()].sort((a, b) => a - b);
  for (const k of keys) console.log(`  context ${k} level(s) of ancestry: ${hist.get(k)} leaves`);
  console.log(`  unresolved with the full path (root-type-dependent): ${unresolvedAtRoot}`);
  const totalLeaves = [...hist.values()].reduce((a, b) => a + b, 0) + unresolvedAtRoot;
  const withinTwo = (hist.get(0) ?? 0) + (hist.get(1) ?? 0) + (hist.get(2) ?? 0);
  console.log(`  share determined with <=2 levels of ancestry: ${(100 * withinTwo / totalLeaves).toFixed(2)}%\n`);
}

const LEVEL = Number(process.argv[2] ?? 4);
partA();
partB(LEVEL);
partC(Math.min(LEVEL, 4));
