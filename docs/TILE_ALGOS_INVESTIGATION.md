# Alternative algorithms for computing Spectre tilings

Status: survey + working verification prototypes.
Scope: methods for generating spectre (Tile(1,1)) tilings other than our
root-anchored SMKGS substitution, evaluated against two hard requirements:

1. **Flavours must survive or be exactly recoverable** — the 9 SMKGS metatile
   types `Gamma..Psi` (with `Gamma` realized as the `Gamma1`+`Gamma2` Mystic
   pair). All of our edge-class/matching/circuit machinery keys off these
   (`docs/DESIGN.md` §2–3), and the hierarchical strand router is keyed on
   `(type, level, entry port)` (`docs/BIGMAP_INVESTIGATION.md` §4).
2. **Viewport-addressed generation of enormous patches** — "materialize the
   tiles near an arbitrary point", without a fixed global root (the BIGMAP
   plan expands from a fixed level-9 root today).

Prototype code: `web/algo-investigation/` (commands in §7; both scripts pass).

## 0. Sources and provenance

Direct fetches of `chiark.greenend.org.uk` and `arxiv.org` were **blocked by
this session's egress policy** (proxy 403). Claims about Simon Tatham's blog
articles therefore rest on three legs, in decreasing strength:

- **Primary source, read in full**: Tatham's actual Spectre implementation in
  his puzzle collection — `spectre.c`, `spectre-internal.h`,
  `spectre-tables-manual.h`, `spectre-tables-auto.h` — read from the GitHub
  mirror `chrisboyle/sgtpuzzles` @ `d1e10eb` (upstream is
  `git.tartarus.org/simon/puzzles`), paths `app/src/main/jni/spectre*`.
  `spectre.c:9-10` names its own writeup: "Writeup of the generation
  algorithm: https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-spectre/".
- **Primary source, read in full**: `necocen/spectre` @ `a9c0bc8`
  (github.com/necocen/spectre), the Rust "Infinite Spectres" viewer.
- **Search-result extracts only** (article bodies not fetched — flagged
  inline wherever used): the quasiblog articles
  [aperiodic-spectre](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-spectre/),
  [aperiodic-tilings](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-tilings/) ("Two
  algorithms for randomly generating aperiodic tilings" — this is the
  "aperiodic-hats" piece; there is no separate hats article at that name),
  [aperiodic-transducers](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-transducers/)
  ("Beyond the wall"),
  [aperiodic-followup](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-followup/),
  [aperiodic-refine](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-refine/),
  and Tatham's paper "Finite-state transducers for substitution tilings"
  (arXiv:2512.16595, Dec 2025), which formalizes the blog material.
- The SMKGS chiral paper (Smith, Myers, Kaplan, Goodman-Strauss, *A chiral
  aperiodic monotile*, Combinatorial Theory 4(2), 2024, doi:10.5070/C64264241,
  arXiv:2305.17743) could not be fetched either; the cluster construction
  attributed to it below is identified from necocen's README (which cites it
  as its algorithm source) plus the code structure itself.

## 1. Recap: our current method

`web/src/core/tiles.ts` `buildSystem(family, level)` = base tables +
`level` × `buildSupertiles`: each supertile has up to 8 children placed by
**shared transforms** `Ts[0..7]` derived from `T_RULES`, with the child
*types* per parent type given by `SUPER_RULES`, a reflection `R` premultiplied
each level (odd levels mirror), and `Gamma` realized at the base as the
`Gamma1`+`Gamma2` pair. Flavours are native. Root-anchored: everything is
addressed by a path from one chosen root node. Transforms are float
compositions (drift measured in §6). Two structural facts matter for
everything below:

- **The child placements `Ts` are identical for every parent type** — only
  the type labels in the slots differ (`tiles.ts:185-223`). Geometry is
  flavour-independent; flavours are pure decoration on a type-erased tree.
- In `SUPER_RULES`, **slot 7 is `Gamma` for every parent**, and `Gamma` is
  the only row with a `null` (slot 2). So "which child is the Mystic" is
  structural, not flavour information.

## 2. Taxonomy of known generation methods

### (a) SMKGS 9-metatile substitution — ours

As above. Flavours: native. Exactness: float (but exactly representable, §6).
Viewport: root-anchored today; §5 shows the root can be made lazy.

### (b) The hexagonal marked-metatile system ("the stunt double")

Not actually a different method: the 9 marked hexagons of the SMKGS proof
*are* the flavours. Our `hex` family (`families.ts` `HEX_PTS`,
`HEX_EDGE_LABELS`, single-`Gamma` leaf) is that system, and the spectre
family is the same combinatorial substitution re-realized with spectre
geometry. Tatham's implementation makes this identity concrete: his hexagon
types are literally named after the metatiles —
`HEX_LETTERS(Z) Z(G) Z(D) Z(J) Z(L) Z(X) Z(P) Z(S) Z(F) Z(Y)`
(`spectre-internal.h:10`), G expanding to 7 sub-hexes and 2 spectres, all
others to 8 and 1 (`num_subhexes`/`num_spectres`, `spectre-internal.h:18-26`).
**Machine-verified** (§4, Part A): his `subhexes_*` tables are exactly our
`SUPER_RULES` under the renaming `G,D,J,L,X,P,S,F,Y →
Gamma,Delta,Theta,Lambda,Xi,Pi,Sigma,Phi,Psi` and the slot permutation
`tatham[i] → ours[6,5,7,4,0,1,3,2][i]` (his missing G-child #7 = our `null`
slot 2; his always-G child #2 = our always-`Gamma` slot 7). So any method
built on the hex system gives flavours directly.

### (c) Cluster / Mystic-doubling construction (chiral paper; necocen/spectre)

necocen's viewer builds the tiling from `SpectreCluster` (8 children `a..g` =
sub-clusters, `h` = `MysticCluster`) and `MysticCluster` (7 children — no
`e`), bottoming out at `Spectre` (position + rotation) and `Mystic` (a
`lower`+`upper` spectre pair, upper rotated 270°: `spectre.rs:70-74`)
(`src/tiles/spectre_cluster.rs`, `mystic_cluster.rs`, `mystic.rs`). This is
the same 8/7-ary, mystic-in-a-fixed-slot tree as (a)/(b) **with the 9 type
labels erased** — the erasure is sound precisely because of the shared-`Ts`
fact in §1. Notable engineering (all confirmed in source):

- **Exact coordinates**: `HexValue = (i + j·√3)/2` with `i32` coefficients
  (`utils/hex_value.rs:9-14`), angles quantized to 30° (`utils/angle.rs`),
  no reflections anywhere (spectre tilings are chiral). `MAX_CLUSTER_LEVEL
  = 18` "because coordinates exceed the i32 range beyond that"
  (`controller.rs:72-73`).
- **Rootless upward growth**: `SpectreCluster::with_child_a` /
  `with_child_f` wrap the current cluster as child *a* or *f* of a
  brand-new parent, alternating by level parity to keep growth centered
  (`spectre_cluster.rs:128-156`, `controller.rs:82-101`). Growth is
  triggered by the camera leaving the covered bbox (`controller.rs:126-176`).
- **Viewport-driven expansion/eviction**: `update(bbox)` converts
  off-screen subtrees to `Skeleton` placeholders (anchor + level + estimated
  bbox) and re-expands skeletons that intersect the view
  (`spectre_like.rs:52-71`), below a granularity floor
  (`MIN_PARTIAL_CLUSTER_LEVEL = 4`, `tiles.rs:22`).

**What identity survives**: the per-tile iterator output is only
`{vertices, rotation}` (`spectre_iter.rs:146-167`; renderer instance =
position + angle, `controller.rs:55-64`) — flavours, and even the
mystic-membership of a tile, are gone at the point of use. That is the
owner's "the flavours of tile are lost". **But the tree retains child slots
and mystic-hood**, and §4 verifies computationally that flavours are an
exact function of that erased tree (up to a measure-zero ambiguity —
recoverable tile-by-tile everywhere in practice). Caveat: mapping necocen's
`a..h` chain order onto our slot numbering is a fixed permutation that
exists by construction, but we did not derive its value; anyone porting his
exact letters must first compute it (one afternoon: match child anchor
geometry against our `Ts`).

### (d) Tatham: combinatorial coordinates + BFS placement

The method of `spectre.c` (writeup: quasiblog/aperiodic-spectre; formalized
in arXiv:2512.16595):

- **Coordinates**: `SpectreCoords` = index of the spectre within its
  order-0 hexagon (0, or 1 only inside a G) plus a chain of
  `HexCoord {index within parent's expansion, hex type}`
  (`spectre-internal.h:43-72`). This is a path *upward* from the tile, with
  the topmost entry's index `-1` = "not decided yet". **Flavours are
  native** — every level of the chain carries a metatile type, and even the
  odd-orientation class is characterized as "expanded from a G hex with
  index 1" (= our `Gamma2`) (`spectre.c:240-242`).
- **Rootless lazy ancestry**: when a step needs an undecided ancestor,
  `spectrectx_extend_coords` appends one at random from per-type
  `Possibility` tables weighted by the substitution matrix's **Perron
  eigenvector** — comment: "the probability of a hex of each type tending to
  a limit as the expansion process is iterated … eigenvector that goes with
  its limiting eigenvalue", with exact algebraic weights (e.g.
  `PROB_J = 4−√15`) (`spectre-tables-manual.h:144-160`, `spectre.c:300-349`).
  Decisions are recorded in a shared `prototype`, so all tiles agree and a
  patch is exactly reproducible from the recorded coordinate string
  (`spectrectx_init_from_params`).
- **Neighbor stepping, no geometry**: `spectrectx_step` maps (spectre,
  exit edge) → neighbor by table lookup (`specmap`); if the edge leaves the
  order-0 hexagon it recurses upward through `spectrectx_step_hex`
  (`hexmap`), which ascends until the edge becomes internal, then maps back
  down (`spectre.c:351-432`). The tables are machine-generated by
  `spectre-gen.c`. His transducer articles (aperiodic-transducers,
  arXiv:2512.16595 — search extracts only) recast this as finite-state
  transducers on coordinate strings, with output lagging input by a bounded
  distance; ascent cost is amortized O(1) per step, worst-case O(depth).
- **Patch generation**: BFS from a seed spectre; each neighbor is placed
  geometrically from the shared edge (`spectre_place`) and deduplicated in a
  balanced tree keyed on its first two vertices (`spectrectx_generate`,
  `spectre.c:434-479`). Region = whatever the callback accepts, i.e.
  viewport-addressed by construction.
- **Exact coordinates**: `Point` = integer coefficients over
  `{1, d, d², d³}`, `d = exp(iπ/6)`, reduced by `d⁴ = d²−1`
  (`spectre-internal.h:79-156`) — the ring **Z[ζ₁₂]**, closed under 30°
  rotation; x/y extract as `(a + b√3)/2` (`point_x/point_y`). Equivalent to
  necocen's representation; no floats anywhere.

His earlier "Two algorithms" article (aperiodic-tilings; search extract)
contrasts this with the naive method — generate a huge patch by repeated
expansion, cut a random window — which he reports works for Penrose but
"rather badly for hats because of the distortion problem" (hat metatiles
change shape under substitution; spectre supertile boundaries similarly
converge only in the limit — our LOD glyphs already deal with this).

### (e) Cut-and-project / model sets

Literature only (fetches blocked; via search abstracts): the hat tiling is
mutually locally derivable with a Euclidean model set (Baake–Gähler–Sadun;
Socolar, *Quasicrystalline structure of the hat monotile tilings*, Phys.
Rev. B 108, 224109 (2023)), and recent work extends CAP/diffraction analysis
to Spectre tilings (arXiv:2502.03268 *Diffraction of the Hat and Spectre
tilings*; *On the Long-Range Order of the Spectre Tilings*, Discrete Comput.
Geom. 2025). In principle a CAP scheme is the ideal viewport oracle (test
lattice points against a window — O(1) per candidate, no hierarchy at all).
In practice: nobody has published a tile-level (let alone flavour-level)
spectre generator on this basis; recovering metatile identity would go
through mutual-local-derivability rules that exist as theorems, not
algorithms. **Not viable for us now**; worth revisiting if someone
publishes explicit windows for the spectre.

## 3. Verdict table

| method | flavours? | viewport-addressable? | exact coords? | notes |
|---|---|---|---|---|
| (a) ours: 9-metatile substitution | native | root-anchored (fixed lvl-9 root in BIGMAP plan) | float (drift §6) | all analysis machinery already keyed to it |
| (b) hex marked-metatile system | native (it *is* the flavours) | same as (a) | same as (a) | not a distinct method |
| (c) cluster/Mystic (necocen) | **erased per-tile**; recoverable from tree (§4, verified) | yes — upward root growth + bbox-driven expand/evict | yes, Z[√3]/2 ints (i32 to lvl 18) | per-tile output loses flavours; tree keeps enough |
| (d) Tatham combinatorial coords | **native** (typed ancestor chain; isomorphism verified §4A) | yes — lazy eigenvector-weighted ancestry, BFS region | yes, Z[ζ₁₂] ints | per-step table walk; O(area) BFS; reproducible patches |
| (e) cut-and-project | theoretical only | ideal in principle | algebraic | no practical spectre generator exists |

## 4. Flavour recovery — theory and computational verification

`web/algo-investigation/flavour-recovery.ts` (results below from this
machine; run commands in §7).

**Part A — Tatham's tables ≅ our SUPER_RULES.** Backtracking search over
slot permutations finds exactly one, and re-verifies all 72 cells:

```
PASS: renaming G,D,J,L,X,P,S,F,Y -> Gamma,Delta,Theta,Lambda,Xi,Pi,Sigma,Phi,Psi
      slot permutation tatham index i -> our slot: [6, 5, 7, 4, 0, 1, 3, 2]
```

So method (d) carries our flavours natively — no recovery needed, only the
fixed renaming + slot permutation above.

**Part B — recovery from a type-erased tree (= what method (c) retains).**
For `buildSystem('spectre', L)`, every root type: erase all types, keep only
`flatten()`'s child-slot paths, then reconstruct each leaf's flavour with
the root treated as unknown (candidate set = all 9; propagate
`S_child = {SUPER_RULES[t][slot] : t ∈ S_parent}`; the Mystic pair resolves
`Gamma1`/`Gamma2` structurally). Level 5, all 9 roots — **307,440 leaves:
307,396 determined, all 307,396 exactly equal to core's type; 44 ambiguous,
every ambiguous candidate set contains the true type**. Level 4: 39,050
leaves, 39,006 determined, 0 mismatches, same 44 ambiguous.

Why it works, from `SUPER_RULES`' column structure: slots 1, 4, 7 are
constant columns (`Delta`, `Sigma`, `Gamma`); slots 3 and 6 are constant
once you know whether the parent is `Gamma`/`Sigma`, which is structural
(mystic-hood / slot 4); only slots 0, 2, 5 depend on finer parent identity,
and propagating the unknown upward, slot-0 and slot-5 chains collapse after
one step — **only slot-2 chains stay ambiguous**. Measured: the 44
ambiguous leaves (a level-independent constant) are exactly the paths ending
in an unbroken `…2.2.2` chain at the unknown root, ambiguity sets of size
2–3. In a rootless map with a *typed* ancestor chain (§5) there is no
unknown root, hence **zero ambiguity**; even fully type-erased, ambiguity is
confined to at most one infinite slot-2 spine per tiling. (This matches
Tatham's observation — search extract from aperiodic-transducers — that some
substitution systems are "unambiguous: a single tile address uniquely
determines the rest of the plane".)

**Part C — how much ancestry a tile needs**: minimal suffix context to pin
a leaf's flavour, level 4, all roots: 0 levels 8,802 leaves (the Mystic
pairs), 1 level 8,802, 2 levels 18,722, 3 levels 2,378, 4 levels 302 —
**93.0% determined within ≤2 levels of ancestry**, >99.1% within 3.

Together, Parts B+C are the "generate the same region both ways and compare
tile-by-tile" check: the erased tree is byte-for-byte what a cluster-style
generator materializes, and re-typing it reproduces `buildSystem`'s flavour
assignment exactly on every determined tile (paths double as positional
identity, so the match is per-tile, not just per-histogram).

## 5. Infinite-plane addressing

What (c) and (d) both actually demonstrate is not a different tiling — it is
**the same hierarchy with a lazily-grown, typed ancestor chain instead of a
fixed root**. That composes cleanly with everything in the BIGMAP plan:

- **Keep the shared-DAG DFS-cull expansion** (measured 2–3 M inst/s;
  BIGMAP §2). `buildSystem` levels are memoized and shared; "the root" is
  merely the node you start the DFS from. Replace "fixed level-9 `Delta`
  root" with a growing chain `seed = c₀ ∈ c₁ ∈ c₂ ∈ …` where each step
  records `(parentType, slot)` — chosen eigenvector-weighted (Tatham's
  `Possibility` tables; `PROB_*` values in `spectre-tables-manual.h`) for a
  statistically honest infinite tiling, or by a fixed legal cycle for a
  deterministic shareable world. When the camera (plus margin) exits the
  current top ancestor's bbox, grow one level (necocen's
  `with_child_a`/`with_child_f` trigger, `controller.rs:149-172`) and
  re-anchor the world transform by the new ancestor's child transform —
  exact if coordinates are exact (§6). Growth slots must alternate/vary so
  the seed ends up interior to the limit patch, not on a boundary spine
  (necocen alternates `a`/`f` for exactly this reason; an all-slot-0 chain
  would pin the seed to the patch corner forever).
- **LOD-cut renderer**: unchanged — the cut level is relative to leaf
  level, not to the root, and aggregate glyphs are per `(type, level)`.
- **Strand router**: *needs* flavours, and gets them — the ancestor chain
  is typed, so every DAG node the DFS or router touches has its
  `(type, level)`; router summaries are cached per shared `TileNode` and
  don't care where the root is. Only the boundary-port weld keys need
  rebasing as the world grows (exact integer keys solve this permanently;
  today's quantized float keys cap at ~2²⁶ units, BIGMAP §4.1).
- **Tile ids / URLs**: today's `TileInstance.id` is a root-relative path,
  which breaks every time the root grows. Adopt Tatham's convention:
  address = seed-relative, i.e. store the path *upward* (slot within
  parent, parent type, …) and prepend on growth — ids stay stable forever,
  and a patch is reproducible from (seed address, ancestor chain), which is
  exactly his `SpectrePatchParams` replay design.
- **Where BFS stepping fits**: we do *not* need per-tile neighbor
  transducers for rendering (DFS-cull is strictly cheaper for bulk
  materialization and already measured). The neighbor-step algorithm is
  worth having later for O(1) "what's across this seam?" queries (picking,
  strand-following across the viewport edge) without expanding a region.

## 6. Exact arithmetic

`web/algo-investigation/exact-coords.ts` re-derives the entire substitution
in **Z[ζ₁₂]** (integer 4-vectors over `{1, d, d², d³}`, `d = e^{iπ/6}`,
`d⁴ = d²−1`; transform = `(k, m, t)` meaning `p ↦ d^k·conj^m(p) + t`;
`REFLECT_X = d⁶·conj`). Findings (this machine):

- `SPECTRE_PTS` is exactly a Z[ζ₁₂] walk: all 13 edge vectors are unit
  `d^k` (max float deviation 8.0e-16). All of `buildSupertiles`' rotations
  are multiples of 30°, so **every transform in the system is exactly
  representable with integer coefficients — no denominators at all**.
- Side-by-side walk of exact vs float systems: max |float − exact| over all
  6 affine entries of **every leaf transform: 8.5e-14 at level 4 (4,401
  leaves), 3.4e-13 at level 5 (34,649 leaves)** — for roots `Delta`,
  `Gamma`, `Xi` alike. Max integer coefficient at level 5: 537 (10 bits).
- Deep composition (16 levels, alternating slots 5/3, floats rounded once
  per child like a table-driven renderer would): cumulative drift
  **1.1e-2 tile-edge units absolute** (4.7e-10 relative to the ~2.4e7-unit
  translation). Extrapolating the same relative error to level 9 spans
  (~6e4 units) gives ~3e-5 units — rendering-safe, but uncomfortably close
  to seam-weld epsilons (0.05) a few levels beyond, and float *keys* (weld,
  dedup) already cap patch spans today (BIGMAP §4.1).
- Coefficient growth ≈ 1.53 bits/level (25 bits at level 16, consistent
  with necocen's i32 ceiling of level 18). JS doubles hold exact integers
  to 53 bits — **exact coords in plain numbers are safe to ~level 34**;
  BigInt never needed for any plausible map.

Adoption cost in core: small and additive. A `ZPoint`(4 ints) +
`(k, m, t)` transform type (~120 lines in the prototype), exact tables for
`SPECTRE_PTS`/quads, and an exact twin of `buildSupertiles`' `Ts`
derivation. The float pipeline stays as the render path (convert once at
emit; the 10-byte wire format from BIGMAP §2 is unchanged — or grows to 18
bytes if we ship exact ints to the GPU worker and convert there, which is
what rebasing-under-growth wants). The win: drift-free deep zoom, exact
weld/dedup keys at any span, and exact re-anchoring when the lazy root
grows.

## 7. Prototypes — how to run

Both scripts import only from `../src/core` and touch nothing else. Any TS
runner works; with `tsx` installed (e.g. `npm i -D tsx` or a scratch
install), from `web/`:

```
tsx algo-investigation/flavour-recovery.ts 4   # Part A + B(level 4) + C
tsx algo-investigation/flavour-recovery.ts 5   # B at level 5 (307k leaves)
tsx algo-investigation/exact-coords.ts 5       # exactness + drift + bits
```

Expected: `PASS` lines as quoted in §4/§6; both exit 0. (This session ran
them with node v22.22.2.)

## 8. Recommendation

**Do not replace the substitution — un-root it.** The survey's punchline is
that every viable alternative (necocen's clusters, Tatham's coordinates) is
our own hierarchy in different clothes; the two things they genuinely do
better are (i) no fixed root and (ii) exact integers. Both retrofit onto
`buildSystem` without disturbing the flavour machinery, which methods (c)
and (e) would forfeit or complicate.

Staged plan (compatible with BIGMAP's stages; roughly +1.5–2 weeks total):

1. **Exact-coords module in core** (small, standalone): Z[ζ₁₂] point +
   `(k,m,t)` transform + exact `Ts`/base tables, with the §6 script promoted
   to a unit test pinning exact↔float agreement. No behavior change.
2. **Typed lazy ancestor chain** ("world" object): seed at origin,
   `(parentType, slot)` growth steps — deterministic cycle for the shared
   mega-map, eigenvector-weighted option behind a flag; camera-margin growth
   trigger; world re-anchoring in exact arithmetic; seed-relative tile ids.
   BIGMAP stage-1/2 renderer consumes it by treating "current top ancestor"
   as the DFS root. This delivers unlimited pan.
3. **Rebase-safe keys**: switch weld/dedup/router-port keys from quantized
   floats to exact integer keys (removes the 2²⁶-unit span cap noted in
   BIGMAP §4.1 and any lvl-10+ rebasing hack).
4. *(Optional, later)* **Neighbor-step tables** for O(1) cross-seam queries
   (Tatham's `hexmap`/`specmap`, regenerable by a script like his
   `spectre-gen.c`) — useful for picking/strand-following UX, not needed
   for rendering.

Risks:

- **Id/URL migration**: seed-relative addresses change `TileInstance.id`
  semantics; existing deep links and the analysis-request wire format need a
  compatibility shim (worst risk; contained if ids are versioned).
- **Parity bookkeeping**: `levelMirror` is defined from the root today; in
  a rootless world parity must anchor to the seed. Wrong handling flips
  chirality of alternate rebuilds — cheap invariant test: all rendered
  leaves must be same-handed after the view transform.
- **Seed-on-boundary growth**: a bad deterministic growth cycle leaves the
  camera perpetually near the patch edge (growth every pan). Mitigate by
  alternating slots (necocen) and asserting the seed's distance to the top
  ancestor's boundary grows geometrically.
- **Statistical honesty**: a deterministic chain is *one* legal tiling of
  the infinite plane, not a uniformly sampled one; if the stats page ever
  aggregates "over the plane", use the eigenvector-weighted chain (Tatham's
  probabilities) or state the caveat.
- **Flavour ambiguity is a non-issue in this design** (typed chain ⇒ none),
  but any future import of *foreign* type-erased data (e.g. necocen dumps)
  inherits the §4 slot-2-chain caveat and the undetermined `a..h`↔slot
  permutation.
