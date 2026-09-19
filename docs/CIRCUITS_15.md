# Edge selection `15` has a fixed, finite set of circuits

**Subject.** Every admissible combination of edge selection `15` on the spectre family, and
the claim that each one admits only finitely many circuits, with the list independent of how
far the supertiling is expanded.

| configuration | selection | combination | circuit lengths | circuits up to congruence |
|---|---|---|---|---|
| `spectre/15/0000000000` | majors 1, 5 | Pi 0, Psi 0 | 3 | **1** |
| `spectre/15/0000000100` | majors 1, 5 | Pi 0, Psi 1 | 3, 6, 9 | **5** |
| `spectre/15/0000100000` | majors 1, 5 | Pi 1, Psi 0 | 3, 6, 9 | **3** |
| `spectre/15/0000100100` | majors 1, 5 | Pi 1, Psi 1 | 3, 6 | **3** |

---

## 0. Summary of the answer

| | obligation | status |
|---|---|---|
| V0 | the tiles actually tile: disjoint interiors, edge-to-edge | cited from `FASS_PROOF.md` §4.1 — **proved, all levels**, given its per-level Jordan-curve step |
| V1 | welded degree ≤ 2, so every strand component is a path or a cycle | cited from `FASS_PROOF.md` §4.1 — **proved, all levels**, given V0 |
| V2 | the local data of `15`: dot counts, four combinations, consecutive seams, 120° corners, the start/end rule | **proved**, from the label tables alone |
| V3 | the two tiles at an active seam cut the **same** tiling vertex | **proved**, from V2 and the gluing convention |
| V4 | the base combination is one triangle per active vertex, of length exactly 3 | **proved**, from V0, V2 and V3 |
| V5 | flipping a four-dot tile is one transposition, so the whole system is a machine on the vertex graph | **proved** |
| V6 | every closed component of the vertex graph is a lone node, or a 3-cycle decorated `Pi Pi Psi`, `Pi Psi Psi` or `Psi Psi Psi` | **checked exactly** over all 9 substitution roots, levels 1–6; **OPEN** to prove |

**The short answer.** Selection `15` is not a space-filling selection — it is the opposite
extreme. It admits **no infinite strand at all**. The plane is partitioned into closed
circuits, every one of length 3, 6 or 9, and up to congruence there are at most five of them
in total across all four combinations. The number of circuits grows without bound with the
patch; the number of *kinds* of circuit does not.

**Where the content sits.** Only V6 needs to look at more than two tiles at once. Everything
else — including the sharp bound "length exactly 3" for the base combination — comes from the
14-entry label tables, the rule that `+k.m` glues to `-k.m` reversed, and the fact that the
tiles tile.

* **The base combination is exactly one triangle per vertex** (§2). Every chord cuts a tile
  corner of interior angle 120°, and the two tiles at any active seam cut the *same* corner, so
  a strand walks round one vertex and closes after three steps. Three 120° corners fill 360°;
  V0 forbids a fourth. This is where the 3 comes from, and it needs no atlas.
* **The other three combinations are transpositions of that** (§3). A four-dot tile flipped to
  its second option trades its two corner cuts for two chords running *between* its two
  vertices. That is a single transposition, which merges two circuits or splits one.
* **9 is the ceiling, and it is sharp** (§3). A component of the vertex graph is a lone node or
  a triangle of three nodes. Flipping one of a triangle's three edges gives `[3,6]`, flipping
  two gives `[9]`, and flipping all three merges twice and then splits again, back to `[3,6]`.
  Nothing reaches 12.
* **`Pi Pi Pi` never occurs** (§3). That single absence is why flipping Pi alone still leaves
  untouched triangles behind, and so why selections `0000100000` and `0000000100` both read
  `[3, 6, 9]` while `0000100100` reads `[3, 6]`.
* **Theta and Gamma2 carry no chord at all.** They are the only two leaf types no strand ever
  enters. This is exactly why `FASS_PROOF.md` §3 drops `15` from the space-filling census,
  which requires every leaf type to carry a chord. Nothing here contradicts that result; `15`
  is being asked a different question.

---

## 1. The exact configuration

Under majors {1, 5} the ten spectre leaf types carry these active dots, one per `minor == 0`
label of a selected class, in `connectionPoints` order:

| type | dots | active seams | physical edges | non-crossing options |
|---|---|---|---|---|
| Delta, Lambda, Sigma | 2 | `-5A +1A` | 6, 7 | 1 |
| Xi | 2 | `-1A +5A` | 2, 3 | 1 |
| Phi | 2 | `-5A +5A` | 6, 7 | 1 |
| Gamma1 | 2 | `-1A +1A` | 2, 3 | 1 |
| Pi | 4 | `-1A +5A -5A +1A` | 2, 3, 6, 7 | 2 |
| Psi | 4 | `-1A +5A -5A +5B` | 2, 3, 6, 7 | 2 |
| Theta, Gamma2 | **0** | — | — | 1 |

Every count is even, so `15` lies in the GF(2) kernel of `web/src/core/subsets.ts` and every
type admits a perfect matching — vacuously for the two zero-dot types. The combination count is
`1⁸ × 2 × 2 = 4`, which is the whole of the freedom in this selection, and it matches the four
rows `15` contributes to `graph_analysis/lvl{4,6}.csv`.

Class 0 is not selected, so V1 applies verbatim: the welded strand graph is a disjoint union of
simple paths and simple cycles at every level. No dot anywhere in any patch computed here has
multiplicity 3 or more.

---

## 2. The base combination: one triangle per vertex

Three facts about the label tables, each a finite check with no tiling input
([`00-local-data.ts`](../web/sel15-proof/00-local-data.ts)):

1. **Consecutive seams.** For each of the eight chord-carrying types, the chord of combination
   `0000000000` joins two *consecutive* physical edges, so it cuts a tile corner. There are ten
   such corners: one each for the six two-dot types, two each for Pi and Psi.
2. **Every cut corner is 120°.** All ten, exactly.
3. **The start/end rule.** Physical edge `i` runs from vertex `i` to vertex `i+1`. Every
   **positive** active slot cuts its corner at the **start** of its edge; every **negative** one
   cuts at the **end**. All 20 slots obey this.

> **V3.** *At every active seam of the tiling, the two tiles cut the same vertex.*
>
> *Proof.* A `+k.m` edge glues to a neighbour's `-k.m` edge traversed in reverse, so one tile's
> start is the other's end. By fact 3 the positive side cuts at its start and the negative side
> at its end, and those are the same point of the plane. ∎

That is the whole geometric engine, and it is a theorem rather than a measurement — the
exact-arithmetic run confirms it over 42,310 contacts and finds no exception, which is a
cross-check, not the argument.

> **V4.** *In combination `0000000000` every circuit has length exactly 3, and is the loop
> around a single tiling vertex where three tiles meet.*
>
> *Proof.* Start on any chord. It cuts a corner at some vertex `v` and leaves through one of the
> two edges of the tile at `v`. By V3 the neighbour across that edge also cuts its corner at
> `v`, so the strand stays at `v` and steps to the next tile round `v`. The tiles around an
> interior vertex of an edge-to-edge tiling form a cycle (V0), so the walk returns to its start
> having visited every tile at `v` exactly once. Each of those tiles contributes a 120° corner
> at `v` by fact 2, and by V0 their interiors are disjoint and cover a neighbourhood of `v`, so
> the angles sum to 360° and there are exactly three of them. ∎

So the base strand system is the disjoint union of one triangle per **active vertex**, and
nothing else. At level 6 from the Delta root that is 95,706 triangles and no other component —
which is what `graph_analysis/lvl6.csv` records for `15`/`0000000000`.

---

## 3. The state machine

Call a vertex of the tiling **active** when a chord cuts a corner there. The **vertex graph**
`G` has the active vertices as nodes, and one edge per four-dot tile, joining that tile's two
corners. Flipping a four-dot tile to its second option replaces its two corner cuts by two
chords running between its two vertices:

| type | option 0 | option 1 |
|---|---|---|
| Pi | `(-1A, +5A)` and `(-5A, +1A)` — two corner cuts | `(-1A, +1A)` and `(+5A, -5A)` — two long chords |
| Psi | `(-1A, +5A)` and `(-5A, +5B)` — two corner cuts | `(-1A, +5B)` and `(+5A, -5A)` — two long chords |

> **V5.** *Flipping one four-dot tile is a single transposition of the base permutation, so it
> either merges two circuits into one or splits one into two.*

That makes the whole system a machine with no geometry in it. Give a component of `G` with `n`
nodes and `f` flipped edges `3n` chord slots, three per node; the base permutation is `n`
disjoint 3-cycles, and each flipped edge transposes two images
([`03-vertex-machine.ts`](../web/sel15-proof/03-vertex-machine.ts), and
[`lean/Sel15/Machine.lean`](../lean/Sel15/Machine.lean)):

| component | flips | circuit lengths |
|---|---|---|
| lone node | 0 | `[3]` |
| 3-cycle | 0 | `[3, 3, 3]` |
| 3-cycle | 1 | `[3, 6]` |
| 3-cycle | 2 | `[9]` |
| 3-cycle | 3 | `[3, 6]` |

The last row is the ceiling: a triangle has only three edges, and the third flip splits what
the first two merged. **Nothing in this table reaches 12.**

> **V6 (the one finite check).** *Every closed component of `G` is a lone node, or a 3-cycle
> whose three edges are decorated `Pi Pi Psi`, `Pi Psi Psi` or `Psi Psi Psi`.*

Verified in exact `Z[ζ₁₂]` arithmetic over all nine substitution roots at levels 1–5 and at
level 6 for the Delta and Psi roots: 297,268 interior active vertices, every one with exactly
three tiles around it and either zero or two four-dot tiles, giving 111,640 lone-node
components and 61,876 three-cycles and **nothing else**. `Pi Pi Pi` never appears. Promoting
this to a theorem needs the finite-local-complexity step that `FASS_PROOF.md` §5 records as
**OPEN**; it is the same gap, at the same place.

Feeding V6 into the table gives the answer, because the flip count of a 3-cycle is just how
many of its three decorations the combination flips:

| combination | flipped types | reachable flip counts | vocabulary |
|---|---|---|---|
| `0000000000` | none | {0} | `[3]` |
| `0000000100` | Psi | {1, 2, 3} | `[3, 6, 9]` |
| `0000100000` | Pi | {0, 1, 2} | `[3, 6, 9]` |
| `0000100100` | Pi, Psi | {3} | `[3, 6]` |

Flipping Pi alone still meets a `Psi Psi Psi` component with no flipped edge at all, which is
where its 3s come from; flipping both types flips all three edges of every component, which is
why the 9 disappears again.

---

## 4. The cluster atlas, and how many circuits there are

The same content, stated without the vertex graph, is the **active-adjacency graph**: tiles as
nodes, joined once per shared active dot. Its components are the **clusters**, and the
decomposition does not depend on the combination string at all, so one atlas settles all four
([`01-clusters.ts`](../web/sel15-proof/01-clusters.ts)). A cluster with `d` dots carries exactly
`d` chords, so the largest cluster bounds the longest circuit.

| patch | roots | tiles | complete clusters | contact types | cluster types |
|---|---|---|---|---|---|
| level 1 | 9 | 80 | 0 | 9 | 0 |
| level 2 | 9 | 630 | 45 | 19 | 4 |
| level 3 | 9 | 4,960 | 658 | 24 | 9 |
| level 4 | 9 | 39,050 | 6,579 | **24** | **10** |
| level 5 | 9 | 307,440 | 57,832 | **24** | **10** |
| level 6 | 2 | 545,582 | 108,402 | **24** | **10** |

Ten cluster types: five of 3 tiles and 3 chords, five of 6 tiles and 9 chords. Every six-tile
cluster has exactly three four-dot tiles, hence `3 + 2×3 = 9` chords — the 9 of §3, seen from
the other side. The 24 two-tile contact types are complete from level 3 and the atlas from
level 4.

The circuit vocabulary read off the atlas agrees with the machine on all forty
cluster-combination pairs, and every circuit traced in a real patch at levels 3–6 is one of the
atlas circuits, word for word ([`02-vocabulary.ts`](../web/sel15-proof/02-vocabulary.ts)).
Counting the circuits themselves, modulo translation and the 24 lattice isometries:

| combination | congruence classes | distinct tile-type words | circuits at level 6 |
|---|---|---|---|
| `0000000000` | **1** | 11 | 95,706 |
| `0000000100` | **5** | 12 | 60,381 |
| `0000100000` | **3** | 10 | 72,773 |
| `0000100100` | **3** | 13 | 73,909 |

Five shapes in total across all four combinations. The class counts are constant from level 4
through level 6 while the circuit counts grow by a factor near 74 per two levels, which is the
whole point: the vocabulary is fixed and the census is not.

**On the tails.** The open paths in the CSV are pure patch-boundary artefacts. They are
combination-independent — 609 at level 4 and 10,945 at level 6, which are `F(15) − 1` and
`F(21) − 1` — and V4 plus V6 say the infinite tiling has none: every component is a closed
circuit. That is the sharpest contrast with the space-filling selections, where the whole
object of interest is a single infinite arc.

---

## 5. What is proved, checked, and assumed

| claim | status |
|---|---|
| Patches are edge-to-edge; leaf transforms are lattice isometries | cited from `FASS_PROOF.md` §4.1–§4.2 — **proved, all levels** |
| Welded degree ≤ 2; components are paths and cycles | cited from `FASS_PROOF.md` §4.1 — **proved, all levels**, given V0 |
| `15` is in the GF(2) kernel; dot counts 0, 2, 4; exactly 4 combinations | **proved**, label tables |
| Theta and Gamma2 carry no chord, so no strand enters them | **proved**, label tables |
| Every base chord cuts a pair of consecutive edges | **proved**, label tables |
| Every cut corner has interior angle exactly 120° | **proved**, label tables |
| Positive slots cut at the edge start, negative slots at the end | **proved**, label tables, all 20 slots |
| The two tiles at an active seam cut the same vertex (V3) | **proved**, from the start/end rule and the gluing convention |
| Base combination: every circuit is the 3-loop at a 3-valent vertex (V4) | **proved**, given V0 |
| A flipped four-dot tile is one transposition (V5) | **proved** |
| The machine's five rows, and the four vocabularies they force | **proved**, and machine-checked in `lean/` |
| Every closed component of `G` is a lone node or a 3-cycle (V6) | **checked exactly**, 9 roots, levels 1–6 — **OPEN** |
| `Pi Pi Pi` never decorates a component | **checked exactly**, same run — **OPEN** |
| The cluster atlas is exactly 10 types | **checked exactly**, levels 1–6, unchanged from level 4 — **OPEN**, equivalent to V6 |
| The two-tile contact set is exactly 24 types | **checked exactly**, levels 1–6, unchanged from level 3 |
| Circuit congruence classes: 1, 5, 3, 3 | **checked exactly**, constant over levels 4–6 |
| No dot in any computed patch has multiplicity 3 or more | **checked exactly**, levels 1–6 |
| The level-4 and level-6 census agrees with `graph_analysis/lvl{4,6}.csv` | **checked exactly** — independent recomputation of code not in the repo |
| Selection `15` admits no infinite strand | **established**, given V0 and V6 |
| Finite local complexity | **OPEN** — inherited unchanged from `FASS_PROOF.md` §5 |

---

## 6. Closing the one gap

V6 is the only obligation that inspects more than two tiles, and it reduces to a single
statement:

> Whenever three tiles meet at a vertex whose corners are all cut, the two four-dot tiles among
> them lead to two further such vertices, and those three vertices close up into a triangle.

Two routes look plausible. The first is the generic one: prove that the set of two-tile
relative-placement classes is closed under one substitution step, which is
`FASS_PROOF.md` §8 open question 2 and would settle V6 along with much else. The second is
specific to this selection and may be cheaper: the vertex-graph edge contributed by a four-dot
tile is a fixed vector in that tile's own frame, so walking a component composes a fixed set of
lattice isometries. If every such step turns by ±120° then a component's length is forced to be
a multiple of 3, and non-overlap (V0) rules out 6. That would make V6 a theorem with no
local-complexity input, and it is the obvious next thing to try.

---

## 7. Scripts and the Lean development

All in [`web/sel15-proof/`](../web/sel15-proof/); run from `web/` with
`npx --yes tsx sel15-proof/<script>.ts [maxLevel]`. Each prints a pass/fail report and exits
non-zero on failure. Positions are exact `Z[ζ₁₂]` integers throughout, doubled so edge midpoints
stay integral, reusing [`web/fass-proof/lib.ts`](../web/fass-proof/lib.ts).

| script | what it establishes |
|---|---|
| [`lib15.ts`](../web/sel15-proof/lib15.ts) | shared machinery: active seams, exact patches, contacts, clusters, strand decomposition |
| [`00-local-data.ts`](../web/sel15-proof/00-local-data.ts) | V2: dot counts; the four combinations; consecutive seams; the start/end rule; the 120° corners |
| [`01-clusters.ts`](../web/sel15-proof/01-clusters.ts) | the 24 contact types and the 10-cluster atlas; emits `atlas.json` |
| [`02-vocabulary.ts`](../web/sel15-proof/02-vocabulary.ts) | the four vocabularies; every traced circuit is an atlas circuit; congruence-class counts; the CSV cross-check; V4's vertex loops |
| [`03-vertex-machine.ts`](../web/sel15-proof/03-vertex-machine.ts) | the V3 cross-check over 42,310 interior seams; V6; the machine's five rows; the vocabularies it forces; emits `machine.json` |
| [`04-emit-lean.ts`](../web/sel15-proof/04-emit-lean.ts) | generates `lean/Sel15/Certificate.lean` from `atlas.json` |

The Lean 4 development is in [`lean/`](../lean/): `lake build`, no Mathlib, no `sorry`, no
`native_decide`. Every theorem is closed by `decide`, so the kernel re-runs the arithmetic, and
`#print axioms` reports that none of them depends on any axiom at all.

| file | what it checks |
|---|---|
| `Sel15/Basic.lean` | tile kinds, the four combinations, the chord rule |
| `Sel15/Machine.lean` | the machine's five rows; `vocabulary` for each combination; every length is 3, 6 or 9 and divisible by 3; 9 is attained |
| `Sel15/Certificate.lean` | generated: the ten cluster graphs from the exact-arithmetic atlas |
| `Sel15/Atlas.lean` | recomputes each cluster's circuits from the raw certificate, with no machine input, and shows the two legs agree |

What Lean does **not** check is V6 — that the ten clusters are the only ones. That is geometry,
it is stated as a hypothesis in `Sel15.lean`, and it is the open item of §6.

---

## 8. Open questions

1. **V6 as a theorem.** Either of the two routes in §6. The ±120° route is the more promising
   and is self-contained.
2. **The other families.** Everything here is spectre-only. The hexagon family's `15` has the
   same dot counts except that its single Gamma carries 2 dots rather than 0 and 2, so the
   combination count is again 4; whether the atlas and the vocabulary transfer is untested.
   `FASS_PROOF.md` §2's family reduction is itself conditional, so this is not free.
3. **Why 120°.** All ten cut corners have the same angle, across eight unrelated tile types.
   That looks like a statement about the spectre's angle multiset rather than a coincidence, and
   a reason would probably also explain why only majors 1 and 5 behave this way.
4. **The other frozen selections.** `STATS_NOTES.md` finding 3 reports that `1278` freezes 27 of
   its 32 combinations and `2578` 57 of its 64. The machine of §3 is the `15` case of something
   more general; what plays the part of the vertex graph there is not obvious.
5. **The tail Fibonacci numbers.** Tail counts are combination-independent and equal
   `F(15) − 1` and `F(21) − 1` at levels 4 and 6. They are boundary artefacts, so this is a
   statement about the supertile outline under `15`, not about circuits — but it should have a
   clean derivation from the outline recurrence.

---

## 9. Where this sits

`FASS_PROOF.md` asks which configurations give a single self-avoiding space-filling curve, and
answers: one selection per family, four combinations each, and `15` is not among them — it
fails the very first screen, because Theta carries no chord. This document takes the same
machinery to the opposite end of the same census. Selection `15` is the most rigid entry in
`graph_analysis`: `STATS_NOTES.md` finding 3 already noted it as the only selection whose
circuit-length set is frozen in *all* of its combinations between levels 4 and 6. The reason is
now visible, and it is not subtle. The strands never travel. They sit on single vertices of the
tiling, three tiles at a time, and the only thing a combination string can do is staple a few
of those triangles together in threes.
