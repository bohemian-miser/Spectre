# How to formally prove the Spectre strand curves are FASS curves

**Subject.** Two configurations conjectured by the repo owner to generate an
infinite space-filling FASS curve (space-**F**illing, self-**A**voiding,
**S**imple, **S**elf-similar):

| | family | edge-class selection | combination string |
|---|---|---|---|
| **(A)** | `hex` (Hexagons) | **128** = {1, 2, 8} | **`010100000`** |
| **(B)** | `spectre` (Tile(1,1)) | **1278** = {1, 2, 7, 8} | **`0101000000`** |

This document is the *proof plan*: what has to be established, in what order,
which parts are genuine theorems, which are finite machine checks, and exactly
what remains open. It is the companion to [`FASS_1278.md`](FASS_1278.md), which
is a dossier on a sibling combination (`spectre/1278/0100100000`); this one is
about proof structure rather than evidence.

Everything numerical below is computed by the scripts in
[`web/fass-proof/`](../web/fass-proof/), which build only on the verified core
library (`web/src/core`) and — unlike the earlier investigation — do every
combinatorial and adjacency computation in **exact `Z[ζ₁₂]` integer
arithmetic**. Welding compares integers, not floats within an epsilon, so every
adjacency statement here is a statement about the substitution system rather
than a numerical observation.

---

## 0. Summary of the answer

Proving "this is a FASS curve" is not one proof. It is six obligations, and
they have very different characters:

| | obligation | character |
|---|---|---|
| **L0** | the leaf tiles actually tile (disjoint interiors, no gaps) | cite + finite check |
| **L1** | **Simple** — the strand graph has max degree 2 | short structural proof |
| **L2** | **Self-avoiding** — no drawn chord crosses another | **finite local check ⇒ all levels** |
| **L3** | the substitution's strand composition is level-independent | **the crux; currently open** |
| **L4** | **Simple/single line** — one arc, no circuits, every tile visited | finite automaton, given L3 |
| **L5** | the infinite limit — bi-infinite, exhausts the plane, space-filling | standard argument + checks |

The headline is that **L1, L2 and L4 are fully provable**, and L2 in particular
can be upgraded from the existing doc's "exhaustively checked to level 5" to a
theorem about every level, via a check over just nine or ten tile types. The
whole thing then rests on a single lemma, **L3**, and this document states that
lemma precisely so it can be attacked or cited rather than assumed.

Two results found while writing this also reshape the problem:

* **The two conjectures are one theorem** (§2). Configuration (A) and
  configuration (B) induce isomorphic strand graphs. Proving either proves the
  other's topological half.
* **These configurations are essentially unique** (§3). Over every edge-class
  selection and every non-crossing combination in both families, exactly one
  selection per family admits the property at all, and it admits exactly four
  combinations, in one-to-one correspondence between the families. The owner's
  two guesses are two of those eight.

---

## 1. The exact configuration

A *connection dot* sits at the midpoint of the `minor == 0` physical edge of
each selected seam. A *combination digit* picks that tile's non-crossing
perfect matching of its dots; each matched pair is drawn as a straight chord.
Welding identifies the coincident dots of abutting tiles, turning the chords
into a strand graph.

### (A) `hex / 128 / 010100000`

| digit | tile | active dots (seams) | options | chosen pairing |
|---|---|---|---|---|
| 0 | Delta | `2A, 1A` | 1 (forced) | `2A—1A` |
| **1** | **Theta** | `2A, 8A, 2B, -2A` | 2 | `2A—-2A`, `8A—2B` |
| 0 | Lambda | `2A, 1A, -8A, -2A` | 2 | `2A—1A`, `-8A—-2A` |
| **1** | **Xi** | `-1A, 8A, 2A, -2A` | 2 | `-1A—-2A`, `8A—2A` |
| 0 | Pi | `-1A, 1A, -8A, -2A` | 2 | `-1A—1A`, `-8A—-2A` |
| 0 | Sigma | `2A, 1A` | 1 (forced) | `2A—1A` |
| 0 | Phi | `2A, -2A` | 1 (forced) | `2A—-2A` |
| 0 | Psi | `-1A, -2A` | 1 (forced) | `-1A—-2A` |
| 0 | Gamma | `-1A, 1A, 2A, -2A` | 2 | `-1A—1A`, `2A—-2A` |

### (B) `spectre / 1278 / 0101000000`

| digit | tile | active dots (seams) | options | chosen pairing |
|---|---|---|---|---|
| 0 | Delta | `2A, 1A` | 1 (forced) | `2A—1A` |
| **1** | **Theta** | `2A, 8A, 2B, -2A` | 2 | `2A—-2A`, `8A—2B` |
| 0 | Lambda | `2A, 1A, -8A, -2A` | 2 | `2A—1A`, `-8A—-2A` |
| **1** | **Xi** | `-1A, 8A, 2A, -2A` | 2 | `-1A—-2A`, `8A—2A` |
| 0 | Pi | `-1A, 1A, -8A, -2A` | 2 | `-1A—1A`, `-8A—-2A` |
| 0 | Sigma | `2A, 1A` | 1 (forced) | `2A—1A` |
| 0 | Phi | `2A, -2A` | 1 (forced) | `2A—-2A` |
| 0 | Psi | `-1A, -2A` | 1 (forced) | `-1A—-2A` |
| 0 | Gamma2 | `-7A, 2A` | 1 (forced) | `-7A—2A` |
| 0 | Gamma1 | `-1A, 1A, 7A, -2A` | 2 | `-1A—1A`, `7A—-2A` |

Note Gamma1's class-2 seam is *partial* — it carries only the label `2.2A`, the
rest of that seam living on Gamma2 — so it has no `minor == 0` label and
contributes no dot. Filtering seams on the selected class alone over-reports
Gamma1 by one and misaligns every matching index after it; `activeSeams` in
`web/fass-proof/lib.ts` documents the trap.

### The observed behaviour

Exact arithmetic, rooted at the Psi supertile, levels 1–5. Both configurations:
zero circuits, maximum welded degree 2, zero junctions, **exactly one open arc**
carrying every segment and visiting **every** tile.

| level | (A) hex tiles | (A) segments | (B) spectre tiles | (B) segments |
|---|---|---|---|---|
| 1 | 8 | 9 | 9 | 10 |
| 2 | 63 | 83 | 71 | 91 |
| 3 | 496 | 667 | 559 | 730 |
| 4 | 3,905 | 5,265 | 4,401 | 5,761 |
| 5 | 30,744 | 41,465 | 34,649 | 45,370 |

Rooted at Delta both give four arcs with a period-2 alternating profile; those
four are boundary-cut windows onto the same line, not four curves (§7.4).

---

## 2. The two conjectures are the same theorem

The two configurations agree on all eight shared leaf types: same active seams
in the same cyclic order, same number of non-crossing options, same chosen
pairing. They differ only at Gamma.

* **Hexagons** have one `Gamma` leaf with dots `-1A, 1A, 2A, -2A`, paired
  `-1A—1A` and `2A—-2A`.
* **Spectre** splits it into the composite Mystic pair: `Gamma1` with dots
  `-1A, 1A, 7A, -2A` paired `-1A—1A`, `7A—-2A`, and `Gamma2` with dots
  `-7A, 2A` paired `-7A—2A`. The class-7 dot is an **internal** weld between the
  two halves — it never reaches the composite's boundary.

Chaining through that internal weld, the composite's chords are `-1A—1A` and
`-2A —(Gamma1)— 7A ≡ -7A —(Gamma2)— 2A`, i.e. `-2A … 2A` with one extra
degree-2 vertex in the middle. That is exactly the hexagon Gamma's chord set,
subdivided once.

**Consequence.** The two strand graphs are isomorphic after suppressing every
degree-2 class-7 vertex. Every *topological* FASS property — circuit-freeness,
the single-arc property, component structure, tile coverage — transfers between
them. The *metric* properties do not transfer automatically: self-avoidance of
the drawn chords, clearances, and the geometry of the space-filling limit must
be established separately in each family, because the two realisations put the
same combinatorics on different polygons.

---

## 3. These configurations are essentially unique

For a strand system to be space-filling at all, every leaf type must carry at
least one chord, so every leaf type needs an **even, non-zero** number of active
dots. That is a finite condition on the selection. Sweeping every non-empty
selection of non-zero edge classes in both families:

| family | selections | leave some tile with no dot | leave some tile with an odd count | survive |
|---|---|---|---|---|
| `hex` | 127 | 33 | 92 | **2** |
| `spectre` | 255 | 76 | 177 | **2** |

The survivors, with every non-crossing combination classified at the Psi root:

| family | selection | dots per type | combos | circuit-free | single line |
|---|---|---|---|---|---|
| `hex` | **{1,2,8}** | 2,4,4,4,4,2,2,2,4 | 32 | 4 | **4** |
| `hex` | {2,5,8} | 2,4,4,4,4,2,4,4,2 | 64 | 0 | 0 |
| `spectre` | **{1,2,7,8}** | 2,4,4,4,4,2,2,2,2,4 | 32 | 4 | **4** |
| `spectre` | {2,5,7,8} | 2,4,4,4,4,2,4,4,2,2 | 64 | 0 | 0 |

The eight winners, in exact cross-family correspondence (same digits on the
eight shared types, Gamma digits zero):

| | `hex` 128 | `spectre` 1278 | set digits |
|---|---|---|---|
| **(A)/(B)** | `010100000` | `0101000000` | Theta, Xi |
| | `001100000` | `0011000000` | Lambda, Xi |
| | `010010000` | `0100100000` | Theta, Pi — the `FASS_1278.md` flagship |
| | `001010000` | `0010100000` | Lambda, Pi |

So the owner's two guesses are the Theta/Xi member of each family's quartet, and
the quartet is the complete answer: there is nothing else to find. This also
settles the notebook's `2578` guesses (cells 45 and 50) in the negative — that
selection admits 64 combinations and **none** of them is circuit-free.

---

## 4. The proof obligations

### L0 — the tiles actually tile

Everything geometric downstream needs the leaf tiles of a patch to have
pairwise disjoint interiors and to cover the patch without gaps. For the spectre
family this is the Smith–Myers–Kaplan–Goodman-Strauss theorem. The `hex` family
is this repo's own reduced realisation and has to be checked; it passes.

Exact edge census plus an area identity, rooted at Delta:

| patch | tiles | distinct placements | max tiles per edge | boundary edges | one boundary loop | Σ tile area vs outline polygon |
|---|---|---|---|---|---|---|
| `hex` level 3 | 496 | 496 | 2 | 378 | yes | agree to 6e-12 |
| `hex` level 4 | 3,905 | 3,905 | 2 | 1,598 | yes | agree to 2e-10 |
| `spectre` level 3 | 559 | 559 | 2 | 758 | yes | agree to 1e-11 |
| `spectre` level 4 | 4,401 | 4,401 | 2 | 3,198 | yes | agree to 9e-10 |

Edge-to-edge (no edge used by three tiles) is an *exact* integer statement; the
area identity is the float half, and it holds to ten significant figures on
patches of area 10⁴. Both families tile.

### L1 — Simple

*Claim.* Every welded connection point has degree at most 2, so the strand graph
is a disjoint union of simple paths and cycles.

*Proof.* Class 0 is the self-gluing class: a class-0 seam glues to another
class-0 seam and three tiles can meet at a class-0 vertex dot, which is exactly
how junctions of degree 3 arise. Neither selection contains class 0. Every other
class is signed, so a `+k` seam glues to exactly one neighbouring `-k` seam, and
a dot on such a seam belongs to exactly two tiles (one, on the patch boundary).
Each tile's chosen matching is a *perfect* matching of its dots, so each tile
contributes exactly one chord-end per dot. Hence welded degree is 2 in the
interior and 1 on the boundary, never more. ∎

This is structural and holds at every level and in the infinite tiling. It is
the reason the census in §3 restricts to selections without class 0.

### L2 — Self-avoiding, for all levels from a finite check

`FASS_1278.md` establishes self-avoidance by checking every bounding-box-close
pair of welded segments up to level 5. That is weaker than necessary. The
following argument settles every level at once.

*Claim.* If (a) every chord meets the boundary of its own tile in exactly its
two endpoints and nowhere else, and (b) the chords inside a single tile are
pairwise non-crossing **as drawn**, then the strand graph is embedded in the
plane with no crossings, at every level and in the infinite tiling.

*Proof.* Every chord lies inside its own closed leaf tile. By L0 the tiles have
pairwise disjoint interiors, so two chords from different tiles can meet only on
the shared boundary; by (a) each meets its tile's boundary only at its two
endpoints, which are connection dots, so any such meeting is a weld. By L1 a
weld has degree at most 2, so it is a join of two chord-ends, not a crossing.
Two chords in the same tile do not cross, by (b). ∎

(a) and (b) are checks over nine or ten tile types with one chosen matching
each — a finite computation. They transfer to every tile instance because every
instance is the image of its leaf type under an isometry (a rotation by a
multiple of 30° with or without a mirror), and isometries preserve incidence and
crossing.

Condition (b) needs stating carefully. `web/src/core/matchings.ts` is explicit
that the canonical combination encoding uses the **topological** non-crossing
rule (interleaving of cyclic dot indices), and warns that it is strictly more
permissive than the geometric one *because the Spectre is concave*: chords
between midpoints of interleaved seams can still miss each other in the plane.
So topological non-crossing does not by itself imply the drawn chords miss each
other, and (b) has to be checked geometrically. Likewise (a) is not free for a
concave 14-gon: a straight chord between two edge midpoints could in principle
leave the tile.

### L3 — the crux: level-independence of the substitution's strand composition

Let `∂(T,k)` be the connection dots on the boundary of the level-`k` supertile
of type `T`, in canonical cyclic order. The claim that everything else rests on:

> **Lemma (L3).** For each type `T`: `|∂(T,k)|` is constant in `k`; and under a
> canonical labelling, the **gluing** map (which child boundary dot welds to
> which sibling boundary dot inside the parent) and the **outer** map (which
> child boundary dots survive as the parent's boundary dots) are constant in
> `k` — up to the period-2 mirror that `buildSupertiles` introduces.

If L3 holds, then `routing(T,k+1) = F_T(routing of the children at level k)`
with `F_T` a **fixed** function, and the whole problem collapses to iterating a
fixed map on a finite state space (L4).

**The obvious route to L3 is closed.** `FASS_1278.md` §4.4 justifies the gluing
and outer maps being level-independent by saying they are "structurally pinned
by the level-independent child transforms of `buildSupertiles`". That
justification does not hold: `buildSupertiles` *recomputes* its child transforms
`Ts[0..7]` from each level's own quad, and those quads are **not** exact
similarity images of one another. Fitting a similarity from each level's quad to
the next:

| step | scale factor | rotation | residual |
|---|---|---|---|
| 0 → 1 | 3.898224 | −22.6307° | 6.7e+0 |
| 1 → 2 | 2.910936 | +10.5959° | 1.7e+0 |
| 2 → 3 | 2.818801 | −11.6832° | 5.9e−1 |
| 3 → 4 | 2.807518 | +11.5501° | 2.1e−1 |
| 4 → 5 | 2.806091 | −11.5669° | 7.5e−2 |
| 5 → 6 | 2.805910 | +11.5648° | 2.7e−2 |

The ratio converges to √(4+√15) = 2.805883701… and the angle to ±11.565°, but
neither is exact at any finite level — the residual only shrinks. So the child
transforms are **not** conjugate across levels, the arrangement is not exactly
self-similar, and any proof of L3 must be **combinatorial**, not
geometric-similarity based.

This is the single open point. §6 lays out the routes to closing it.

### L4 — one line, no circuits, every tile visited

Given L3, define the state of a supertile type at level `k` as the partial
matching its internal arcs induce on its canonically-labelled boundary dots,
plus the number of closed circuits strictly inside. The state space is finite:
`|∂(T,k)|` is small and constant, so there are at most a few hundred matchings
per type. L3 says the substitution acts on the 9-tuple of states by a fixed map
`F`. Compute the states at level 1, iterate `F` abstractly, and find the cycle.
A cycle **is** an induction: it proves the property for every level, not just
the ones computed.

The conclusions this yields — zero circuits at every level for every type, the
Psi supertile being a single arc joining its two boundary dots at every level,
and the Delta profile's period-2 alternation — are then theorems for all `k`,
conditional only on L3.

Coverage is separate and structural: every leaf type carries at least one chord
(§1 tables, no type has zero dots), and the parent's arc decomposition consumes
every arc of every child exactly once, so by induction the single Psi arc
visits every tile of its patch at every level.

### L5 — the infinite limit

A FASS curve is an infinite-limit object; finite patches necessarily have
endpoints. The limit needs four things.

1. **Nesting.** `SUPER_RULES.Psi = [Psi, Delta, Psi, Phi, Sigma, Psi, Phi, Gamma]`,
   so Psi occurs as its own child at slots 0, 2 and 5. Each gives a nested
   increasing sequence of Psi supertiles whose arcs nest as contiguous
   sub-paths.
2. **Both ends grow.** For the union to be a *bi-infinite* curve rather than a
   ray, the child's sub-path must have parent-arc material on both sides, with
   both counts growing without bound.
3. **Exhaustion.** The nested union covers the plane only if the inradius of the
   patches about the nesting's fixed point diverges. If it does not, that
   nesting covers only a cone or half-plane.
4. **Space-filling.** The standard Hilbert-curve argument: the level-`k` arc
   restricted to any level-`j` sub-supertile stays inside that sub-supertile, so
   the composition sequence gives a nested subdivision of the parameter
   interval; tile diameters shrink relative to patch diameter, so the
   parameterisations converge uniformly; the limit is a continuous surjection
   onto a set of positive area.

One point of hygiene: **"self-avoiding" in FASS is a property of the finite
approximants, not of the limit.** A genuine space-filling curve cannot be
injective. The proof must say that the level-`k` polygons are non-self-crossing
(L2) and must not claim the limit curve is.

---

## 5. What is proved, checked, and assumed

*(filled in from the verification scripts — see §8)*

---

## 6. Closing the crux

*(routes to L3 — see §8)*

---

## 7. Scripts

All in [`web/fass-proof/`](../web/fass-proof/); run from `web/` with
`npx --yes tsx fass-proof/<script>.ts`.

---

## 8. Open questions

*(to be completed)*
