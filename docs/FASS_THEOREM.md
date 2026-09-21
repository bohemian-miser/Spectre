# The Spectre strand curve is a FASS curve: the proof

**Subject.** The two configurations of [`FASS_PROOF.md`](FASS_PROOF.md):

| | family | edge-class selection | combination |
|---|---|---|---|
| **(A)** | `hex` (Hexagons) | {1, 2, 8} | `010100000` |
| **(B)** | `spectre` (Tile(1,1)) | {1, 2, 7, 8} | `0101000000` |

[`FASS_PROOF.md`](FASS_PROOF.md) is the proof *plan*. It reduced everything to
one open lemma (its "L3": the substitution's strand composition is
level-independent), left the tiling property of the hexagon family uncited,
left self-avoidance of the spectre as a finite check that no argument carried to
higher levels, and left exhaustion of the plane ("does the inradius diverge?")
open. This document closes all four. Everything here is either a theorem with
a proof written out, or a finite computation that the scripts in
[`web/fass-theorem/`](../web/fass-theorem/) perform in exact `Z[ζ₁₂]` integer
arithmetic and report as pass/fail. §8 says, for each step, which of the two it
is. §9 lists what is *not* proved.

The idea in one paragraph. Every level-`k` supertile (`k ≥ 1`) is, combinatorially, a
**hexagon**: six distinguished vertices on its outline (corners), and the six
arcs between them (meta-edges) are exactly the arcs along which siblings are
glued inside any parent. A parent's meta-edge is a fixed concatenation of its
children's meta-edges, and glued child edges are reversed copies of each other.
That is a *combinatorial substitution* in the sense of the hat and spectre
papers, and once its tables are known the whole hierarchy is determined by a
finite amount of data: which corners coincide, which words agree, which angles
close up, which dots weld. Each of those is a finite closure condition on the
tables. The one thing finite data cannot give — that the pieces never overlap
anywhere in the plane — comes from a topological argument: the whole
hierarchy assembles into an abstract surface that maps locally isometrically
onto the plane and has no boundary, so the map is a covering of the plane and
therefore a homeomorphism. Non-overlap and exhaustion of the plane both fall
out of that one sentence.

---

## 0. The statement

Fix configuration (A) or (B). Write `S(T,k)` for the level-`k` supertile of
type `T` as the code builds it (`buildSupertiles`, exactly reproduced over
`Z[ζ₁₂]` by `zSupertileTransforms`), a set of placed leaf tiles.

> **Theorem.**
> 1. *(Tiling.)* For every `k ≥ 0` and every type `T`, the leaf tiles of
>    `S(T,k)` have pairwise disjoint interiors, and their union is a closed
>    topological disk whose boundary is a simple closed polygon. Every patch is
>    edge-to-edge.
> 2. *(Simple.)* Every welded connection point of `S(T,k)` has degree exactly
>    2 if it is interior to the patch and degree 1 if it is on the boundary.
>    The strand graph is a disjoint union of simple paths, with no circuit in
>    any supertile of any type at any level.
> 3. *(One arc.)* The strand graph of the Psi supertile `S(Psi,k)` is a
>    **single open arc** for every `k ≥ 1`, passing through every one of its
>    tiles. Every other type carries a fixed number of arcs (Gamma 5, Delta 4,
>    Theta 3, Lambda 3, Xi 2, Pi 2, Sigma 5, Phi 2), a perfect matching of a
>    fixed number of boundary dots.
> 4. *(Self-avoiding.)* No two drawn chords of `S(T,k)` cross, for any `T`,
>    `k`.
> 5. *(Self-similar.)* The way the arcs of the eight children compose into
>    the arcs of the parent is given by one fixed operator `F` on routing
>    states, the same at every level `k ≥ 2`; the states cycle with period 2.
> 6. *(The infinite curve.)* There is an increasing chain of Psi supertiles
>    `T₀ ⊂ T₁ ⊂ T₂ ⊂ …` whose union is the whole plane, each `Tᵢ` interior to
>    `Tᵢ₊₄`, such that the arc of `Tᵢ` is a contiguous sub-path of the arc of
>    `Tᵢ₊₁` with segments added at both ends. The union of the arcs is one
>    bi-infinite, non-self-intersecting polygonal curve that visits every tile
>    of a tiling of the plane exactly once.

Parts 1–5 are the letters of FASS at every finite level (space-**F**illing in
the sense of visiting every tile, self-**A**voiding, **S**imple, **S**elf-
similar); part 6 is the limit object as a curve in the plane. What is *not*
claimed is a continuous surjection `[0,1] → (a region)` obtained by rescaling —
see §9.

---

## 1. Definitions

**Ring and transforms.** Every vertex of every tile lies in `Z[ζ₁₂]`, every
edge is a unit step `ζ^j`, and every transform is `z ↦ ζ^r conj^m(z) + t`
(`web/src/core/exact.ts`). The eight slot transforms `Ts_k[0..7]` of level `k`
are computed by chaining quad points (`T_RULES`) and pre-multiplying the
reflection `R`; their linear parts `L_s = ζ^{r_s} conj` are read off `T_RULES`
alone and do not involve the quad, so they are the same at every level (a
fact about the code, re-verified numerically to level 12 in `01`):

```
slot      0      1      2      3      4      5      6      7
L_s    d^6 c   d^4 c   d^4 c   d^2 c   d^0 c   d^0 c   d^10 c  d^2 c      (c = conjugation)
```

Only the translations depend on the level. Because every `L_s` carries a
mirror, each level is the mirror image of the previous one, and a child's
outline, counter-clockwise in its own frame, is clockwise in its parent's.

**Outline.** For a set of placed leaves, cancel every directed unit edge that
appears in both directions. If what is left is a single simple closed walk and
no undirected edge is used by three tiles, that walk (oriented
counter-clockwise) is the *outline*. `outlineOf` in `geom.ts` computes it or
throws.

**Lemma 1.1 (winding number).** *If the outline of a patch exists, the patch is
a valid tiling patch: its tiles have disjoint interiors and their union is the
closed region bounded by the outline.* Proof: each tile is a simple polygon
traversed counter-clockwise, so the sum of the tiles' winding numbers about a
point equals the winding number of the residual 1-chain, which is the outline;
a simple closed curve has winding number 0 or 1; so the covering multiplicity
is 0 or 1 everywhere. ∎ (This is the argument of `FASS_PROOF.md` §4.1; it is
used here only for the base level.)

**Corners and meta-edges.** For `m ≥ 1`, the *corners* of `S(T,m)` are six
vertices of its outline, and the *meta-edges* `E(T,m,e)`, `e = 0..5`, are the
six outline arcs between consecutive corners. They are fixed as follows.

* At `m = 1, 2` they are *found* intrinsically: place `S(T,m)` inside a
  level-`(m+4)` supertile at an address where it owns no outline edge (a
  *buried* instance) and mark the outline vertices at which the neighbouring
  same-level supertile changes. `01` does this for every buried instance of
  every type inside every level-`(m+4)` root: for each type, **every buried
  instance yields the same six vertices** (thousands of instances per type),
  and every unburied instance changes neighbour only at those six.
* For `m ≥ 3` they are *defined* recursively by the table `CT` below.

Each meta-edge carries a *class*: the six meta-edges of type `T` carry, in
cyclic order, the six signed classes of the hexagon-family leaf `T`
(`HEX_EDGE_LABELS`, e.g. Delta `[3, 2, −5, 1, −3, −6]`). Which rotation of the
six corners matches the label cycle is decided by requiring that glued
meta-edges carry opposite classes (`+c` against `−c`); `01` solves this
constraint over all 115 glued pairs of a level and finds **exactly one**
solution, at level 1 and again at level 2, in both families. Corner `e` is
the start of the class-`c(T,e)` meta-edge.

**Words.** `D_m(T,e)` is the sequence of step directions (in `Z/12`) of
`E(T,m,e)` in `T`'s local frame; `Λ_m(T,e)` is the sequence of leaf edge
labels along it. A *direction map* is `x ↦ σx + c` on `Z/12`; `L_s` acts as
`x ↦ r_s − x`, `neg` is `x ↦ x + 6`, `rev` reverses a word, and
`φ_s = neg ∘ L_s` is what a child's word undergoes when its parent traverses
that child edge backwards.

---

## 2. The substitution tables

`01-tables.ts` reads the following off the level-2 supertiles (children at
level 1), and then re-derives them at levels 3 and 4 with the corners there
*defined* through `CT`. They come out **identical at levels 2, 3 and 4, and
identical in the two families**:

* `B(T,j)` — parent meta-edge `j` is the concatenation, in the parent's
  counter-clockwise order, of the listed child edges `(slot, edge)`, each
  traversed backwards;
* `G(T)` — the pairs of child edges that are glued;
* `CT(T,j) = (s, e+1)` where `(s,e) = B(T,j)[0]` — parent corner `j` is child
  corner `e+1` of the child at slot `s`;
* `Q(T,i)` — which corner of `T` the quad point `i` is, or none.

```
        B(T,·): parent edge j = child edges (slot.edge), each backwards
Gamma  7.5+6.4+6.3 | 6.2+5.4+5.3 | 5.2+5.1+4.2+3.4+3.3 | 3.2+3.1+1.3+1.2+0.4 | 0.3+0.2 | 0.1+7.0
Delta  7.5+6.4+6.3+6.2+5.4 | 5.3+5.2 | 5.1+4.2+3.4+3.3 | 3.2+2.4+2.3 | 2.2+2.1+1.2+0.4+0.3 | 0.2+0.1+7.0
Theta  7.5+6.4+6.3+6.2+5.4 | 5.3+5.2 | 5.1+4.2+3.4+3.3+3.2+2.4 | 2.3+2.2 | 2.1+1.2+0.4+0.3+0.2 | 0.1+7.0
Lambda 7.5+6.4+6.3+6.2+5.4 | 5.3+5.2 | 5.1+4.2+3.4+3.3 | 3.2+2.4+2.3 | 2.2+2.1+1.2+0.4+0.3+0.2 | 0.1+7.0
Xi     7.5+6.4+6.3 | 6.2+5.4+5.3+5.2 | 5.1+4.2+3.4+3.3+3.2+2.4 | 2.3+2.2 | 2.1+1.2+0.4+0.3+0.2 | 0.1+7.0
Pi     7.5+6.4+6.3 | 6.2+5.4+5.3+5.2 | 5.1+4.2+3.4+3.3 | 3.2+2.4+2.3 | 2.2+2.1+1.2+0.4+0.3+0.2 | 0.1+7.0
Sigma  6.3+6.2+5.4 | 5.3+5.2 | 5.1+4.2+3.4+3.3 | 3.2+2.4+2.3 | 2.2+2.1+1.2+0.4+0.3 | 0.2+0.1+7.0+7.5+6.4
Phi    7.5+6.4+6.3+6.2+5.4 | 5.3+5.2 | 5.1+4.2+3.4+3.3 | 3.2+2.4+2.3+2.2 | 2.1+1.2+0.4+0.3+0.2 | 0.1+7.0
Psi    7.5+6.4+6.3 | 6.2+5.4+5.3+5.2 | 5.1+4.2+3.4+3.3 | 3.2+2.4+2.3+2.2 | 2.1+1.2+0.4+0.3+0.2 | 0.1+7.0

        G(T): glued child edges (the same 13 pairs for every type; Gamma lacks the two through its empty slot 2)
0.0~7.1  0.5~1.1  1.0~7.2  1.3~2.0  1.4~3.0  1.5~4.0  2.5~3.1  3.5~4.1  4.3~5.0  4.4~6.0  4.5~7.3  5.5~6.1  6.5~7.4

        Q(T,·): quad point i is corner …      (levels ≥ 2; at level 1 only Gamma's quad[2] differs, and it is never used)
Gamma [1,-,-,5]  Delta [-,2,3,-]  Theta [-,2,-,5]  Lambda [-,2,3,5]  Xi [1,2,-,5]  Pi [1,2,3,5]  Sigma [-,2,3,-]  Phi [-,2,3,5]  Psi [1,2,3,5]
```

Two observations that are consequences rather than inputs: the class sequence
of the child edges along a parent edge depends only on the parent edge's
class (e.g. class 3 is always `−2, 0, 5, −5, −8`), which is what the hat and
spectre papers call the substitution's edge rules; and the eight non-Gamma
types have literally the same outline at every level (`01` checks levels 1–4;
it is a one-line induction on `SUPER_RULES`, since every type has Gamma at
slot 7 and only there).

---

## 3. The induction

**Abstract complex.** `A(T,k)` is the 2-complex obtained by taking one copy of
each leaf tile of `S(T,k)` and identifying leaf edges as the hierarchy
identifies them: inside a child, as `A(τ,k−1)` does; between two children,
along the glued pair of meta-edges of `G(T)`, leaf edge by leaf edge in
reverse order. It comes with the map `φ: A(T,k) → ℝ²` that places each leaf by
its transform.

**Induction hypothesis IH(k)**, for every type `T`:

* (a) `A(T,k)` is a closed disk;
* (b) `φ` is a local isometry at every point of `A(T,k)`, boundary points
  included (a boundary point has a neighbourhood that is a sector of angle
  less than `2π`, mapped isometrically);
* (c) the boundary of `A(T,k)` maps onto the outline of `S(T,k)`, which is the
  cyclic concatenation of the six meta-edges; the word of `E(T,k,e)` in `T`'s
  frame is `D_k(T,e)`;
* (d) for every `(T,i)` with `Q(T,i) ≠ none`, quad point `i` of level `k` is
  corner `Q(T,i)` of `S(T,k)`.

Note what is *not* in the hypothesis: that `φ` is injective. Overlap is
settled globally in §4.

**Base, `k = 1`.** `01` computes the level-1 (and level-2) outlines of all nine
types; they exist, so by Lemma 1.1 each `S(T,1)` is a valid patch; the abstract
complex of a valid patch with a simple outline is a disk and `φ` is an
embedding, hence (a), (b). The corners, words and quad-corner table at level 1
are read from geometry; (c), (d) hold by construction.

**Step, `k−1 → k`, for `k ≥ 2`.** Fix `T`. The children are `Tsₖ[s]·S(τ_s,k−1)`
with `τ_s = SUPER_RULES[T][s]`. The following seven finite checks, none of which
mentions `k`, are what `02-closure.ts` performs; each is followed by the
reason it gives the step.

**C1 (structure).** Every child edge appears exactly once in `B(T)` or `G(T)`;
consecutive entries of `B(T,j)` chain end-to-start; `CT(T,j)` is both the
start of `B(T,j)` and the end of `B(T,j−1)`.

**C2 (word claims).** A *claim* `(a,e,b,e',g)` asserts `g·D(a,e) = revneg D(b,e')`
for a direction map `g` — "the class-`c(a,e)` edge of type `a`, moved by `g`,
is the reversed class-`c(b,e')` edge of type `b`". The claims needed for the
step are the glued pairs: for each `((s,e),(s',e')) ∈ G(T)`, the claim
`(τ_s, e, τ_{s'}, e', L_{s'}⁻¹L_s)`. Expanding both sides by the recursion
`D_k(T,j) = ⊙ rev(φ_{sᵢ} D_{k−1}(τ_{sᵢ}, eᵢ))` (which is (c) for the parent, once
the children's edges are known to abut) turns a claim about level `k` into a
list of claims about level `k−1`, term against term in reverse order, with map
`φ_{s'ⱼ}⁻¹ g φ_{sᵢ}` — provided the two decompositions have the same length.
`02` computes the closure of the seed claims under this expansion: it closes
after three rounds at 101 statements (each glued pair read both ways), every
claim expands, and **every claim in the closure holds at level 1** for the
direction words, and its two label words are complementary (`+c.m` against
`−c.m`, class-0 seams with minors reversed). By induction on `k`, every claim
in the closure holds at every level, directions and labels.

*Consequence.* Two glued child edges have the same shape and, once one common
endpoint is established, coincide as paths with the two children on opposite
sides (both children are clockwise in the parent's frame and traverse the
shared path oppositely). The leaf labels along them match, so every leaf edge
of the hierarchy is either an outline edge or is shared by exactly two tiles
carrying `+c.m` and `−c.m`.

**C3 (corner coincidences).** The code fixes each `Tsₖ[s]` by one point
identification, `Tsₖ[s]·quad[to_s] = Tsₖ[s−1]·quad[from_s]`. By (d) for the
children these are corner identifications; `02` checks each is an
identification the abstract complex makes, then propagates: whenever one end
of a glued pair is known to coincide, C2 forces the other end to coincide;
iterating, **every pair of abstractly identified corners is proved
coincident**. Gamma has an empty slot, which breaks the chain at slot 2; since
the slot transforms are shared by all parent types, the coincidences proved in
a Delta parent transfer to a Gamma parent for every corner that Theta (in
Gamma's slot 3) and Phi (in Delta's slot 3) have in common as a point of the
shared outline. That *SameCorner* relation is the greatest fixed point of
"same `CT` entry and the children there are SameCorner", closed under `CT` by
construction and verified at level 1 — 211 ordered pairs, the four Theta/Phi
ones among them.

*Consequence.* All glued pairs coincide as paths; the outline of the union is
the closed path `B(T,·)`; the parent's corners and meta-edge words are as (c)
says.

**C4 (disk).** Per parent: the children are connected through `G`; the
abstract cell structure (faces = children, edges = meta-edges with glued ones
identified, vertices = corner classes) has Euler characteristic 1; the link of
every vertex is a path (boundary) or a cycle (interior); the outer edges form
one cycle. A compact connected surface with one boundary component and
`χ = 1` is a disk, giving (a).

**C5 (angles).** The first and last directions of every `D_k(T,e)` obey a fixed
recursion (first of the parent edge is `φ` of the last of its first child edge,
and so on), so the vector of all first/last directions is eventually periodic
in `k`: `02` finds **period 2 from level 1**. For each level of the period and
each vertex class of each parent: the interior angles of the children meeting
at an interior class sum to exactly `2π`, at a boundary class to less than
`2π`, and the parent's own corner angle is that sum. At a vertex interior to a
glued pair the two children's interior angles are `π − t` and `π + t` (reversed
paths have opposite turns), summing to `2π` automatically. With (b) for the
children, `φ` is therefore a local isometry at every point of `A(T,k)`: (b).

**C6 (quad points).** The construction *needs* quad point `i` of type `T` when
a chaining rule reads it or when it feeds a needed quad point of a parent (a
least fixed point; Gamma's `quad[2]` is not needed). Every needed quad point is
a corner, and the parent's quad point `i`, being `Tsₖ[sᵢ]·quad_{k−1}[jᵢ]`, is the
corner the table names, through `CT`. Hence (d).

**C7 (burial).** See §5.

That completes the induction. ∎

**Corollary 3.1 (interface).** The number of connection dots on each meta-edge
of each type, and their positions, are determined by the label words, hence by
the tables. `03-strands.ts` derives them: the boundary dot counts are
`Gamma 10, Delta 8, Theta 6, Lambda 6, Xi 4, Pi 4, Sigma 10, Phi 4, Psi 2` at
every level, the per-edge counts have period 2, and the derived dot pattern
along every meta-edge equals the geometric one at levels 1–4. This is the
"L3" of `FASS_PROOF.md` §4.3, now a corollary: the gluing map (dot `i` of one
glued edge welds to dot `n−1−i` of the other) and the outer map
(concatenation per `B`) are the same at every level `k ≥ 2`.

---

## 4. Non-overlap and exhaustion: the covering argument

Nothing in §3 prevents `φ: A(T,k) → ℝ²` from folding over itself far from any
gluing (an immersed disk need not be embedded — the classical "doodles"). No
finite check can rule that out level by level. The argument that does is
global and uses the whole hierarchy at once.

**Construction.** Let `w = (0, 5, 0, 0)` and build the chain of Psi
supertiles `T₀ ⊂ T₁ ⊂ …`, `T₀ = S(Psi,1)`, where `Tᵢ` sits in `Tᵢ₊₁` at slot
`w_{i mod 4}` (all Psi slots of a Psi parent: `SUPER_RULES.Psi` has Psi at
slots 0, 2, 5). Re-anchor so that `T₀` stays put. Let `Σ = ⋃ᵢ A(Tᵢ)` be the
direct limit of the abstract complexes (each `A(Tᵢ)` is a sub-complex of
`A(Tᵢ₊₁)` by construction), with `φ: Σ → ℝ²` the common placement map.

**Lemma 4.1 (burial, C7).** *The sub-supertile at address `0.0.5.0` of a Psi
supertile owns no edge of that supertile's outline.* This is a computation on
`B` alone: the outline edges a child at slot `s` inherits from its parent are
the `(s,·)` entries of `B` on the parent's exposed edges; iterate down the
address. `02` finds the buried depth-4 Psi-slot addresses to be exactly
`0.0.5.0, 0.0.5.2, 2.0.5.0, 2.0.5.2, 5.0.5.0, 5.0.5.2` (the six that
`FASS_PROOF.md` §4.5 observed at levels 5 and 6), and none of depth 3. Since
being buried is inherited by sub-supertiles, and `Tᵢ` sits in `Tᵢ₊₄` at
address `w_{i+3} w_{i+2} w_{i+1} w_i` which for `i ≡ 0 (mod 4)` is `0.0.5.0`,
**every `Tᵢ` is interior to `T_{4⌈i/4⌉+4}`**.

**Lemma 4.2.** *`Σ` is a connected, simply connected surface without boundary,
and with the path metric induced by the leaf tiles it is a complete length
space. `φ` is a local isometry at every point.*
Each `A(Tᵢ)` is a disk (IH(a)) and `A(Tᵢ) ⊂ int A(Tᵢ₊₄)` (Lemma 4.1), so `Σ` is
an increasing union of disks each in the interior of a later one: an open,
contractible surface. Every point of `Σ` is interior to some `A(Tⱼ)`, where `φ`
is a local isometry by IH(b). Completeness: the complex is locally finite with
cells of bounded size and inradius bounded below, so every bounded set meets
finitely many cells and closed bounded sets are compact. ∎

**Lemma 4.3.** *A local isometry from a complete length space onto a connected
length space is a covering map* (Bridson–Haefliger, *Metric spaces of
non-positive curvature*, Prop. I.3.28). Self-contained sketch for our case:
paths in `ℝ²` lift uniquely from any starting point (a partial lift is
1-Lipschitz, so its closure exists by completeness, and local isometry lets it
be continued), hence homotopies lift; a local homeomorphism with unique path
lifting onto a locally simply connected space is a covering.

**Theorem 4.4.** *`φ: Σ → ℝ²` is a homeomorphism.* A covering of the simply
connected plane by a connected space is a homeomorphism. ∎

**Corollary 4.5 (Theorem part 1).** `φ` is injective on every `A(T,k)`: for
`T = Psi` because `A(Psi,k)` is a sub-complex of `Σ` (choose the chain to
start at it, or note that any level-`k` Psi supertile sits in the chain after
re-anchoring), and for every other type because every type occurs inside a
Psi supertile three levels up (`02` checks the reachability). So the leaf
tiles of every `S(T,k)` have disjoint interiors, the union is the disk
`φ(A(T,k))`, and its boundary is the simple polygon `φ(∂A)` — the outline.
Every patch is edge-to-edge, because the identifications in `A` are whole leaf
edge to whole leaf edge. ∎

**Corollary 4.6 (exhaustion).** `⋃ᵢ int Tᵢ = φ(Σ) = ℝ²`; for every `R` the disk
of radius `R` about the seed lies inside some `Tᵢ`. This answers Open Question
7 of `FASS_PROOF.md` (the inradius diverges) without estimating any collar
gap. The infinite tiling `φ(Σ)` is a tiling of the plane by leaf tiles, and
every one of its patches is a patch of some `Tᵢ`.

`05-chain.ts` follows the chain numerically; for the hexagon family to level 6
(242,047 tiles) the seed's vertices leave the outline at `T₄`, exactly where
Lemma 4.1 says, and the seed-to-outline distance is 8.66 at `T₄` and `T₅`.

---

## 5. The strands

**Lemma 5.1 (degree).** *Every connection dot of `S(T,k)` has degree 2 if it is
interior to the patch and degree 1 if it is on the outline; the strand graph is
a disjoint union of simple paths and cycles.* A dot is the midpoint of a leaf
edge of a selected class (classes 1–8: the `minor 0` edge of the seam). By
Corollary 4.5 the patch is edge-to-edge with disjoint interiors, so a leaf edge
belongs to one tile (outline) or two (interior); by the label statement of C2
an interior edge carries `+c.m` against `−c.m`, so it carries a dot on both
sides or on neither. Each tile's chosen matching is perfect on its dots, so
each tile contributes one chord-end per dot. ∎

**The routing operator.** The *state* of `S(T,k)` is the perfect matching its
arcs induce on its boundary dots (in outline order from corner 0) together
with its circuit count. By Corollary 3.1, the boundary dots of a parent are the
concatenation, per `B`, of its children's boundary dots (each child edge
reversed), and interior dots weld dot `i` of a glued edge to dot `n−1−i` of its
partner. So the parent's state is a fixed function `F` of the children's
states: follow chords and welds from each outer dot to the outer dot it reaches;
closed walks are circuits. `F` is the same at every level `k ≥ 2` (C2, C3, and
the period-2 dot layout, of which `F` reads only the counts).

**Proposition 5.2 (Theorem parts 2, 3, 5).** `03-strands.ts` reads the level-1
states from geometry and iterates `F`. For (A) and (B) the orbit is a
**2-cycle entered immediately** (for the flagship `0100100000` of
`FASS_1278.md`, after a pre-period of 1). Along the orbit every type has
**zero circuits**, so — since `F` never destroys a circuit — no supertile of any
type has a circuit at any level; Psi's state is the single pair `0–1` at every
level; the iterated states agree with the traced geometry at levels 2–4 for all
nine types. Every leaf type carries a chord (an even, non-zero dot count), and
a chord that is on no circuit is on an arc; with one arc, every tile of
`S(Psi,k)` is on it. ∎

**Nesting (Theorem part 6).** Psi has two boundary dots, so a strand entering
a Psi child must traverse all of its single arc before leaving: the arc of a
Psi child is a *contiguous* sub-path of the parent's arc. Both boundary dots
of a Psi supertile lie on its Gamma child (the dot pattern puts the two Psi
dots on edges `7.5` and `7.0` of `B(Psi,·)`), so a Psi child at slot 0, 2 or 5
is strictly inside the parent's arc, with at least one segment beyond it on
each side. Along the chain of §4 the arc therefore grows at both ends without
bound; the union is a bi-infinite polygonal path, injective because any two of
its segments lie in a common finite simple arc, proper because a bounded set
meets finitely many tiles, and it visits every tile of the plane tiling `φ(Σ)`
exactly once. `05-chain.ts` confirms contiguity and two-sided growth to level 6.

---

## 6. Self-avoidance at every level (Theorem part 4)

Two chords of the same tile do not cross: every matching the combination
digits can select is geometrically non-crossing (`FASS_PROOF.md` §4.2). For the
hexagon family, chords stay inside their convex tiles, and disjoint interiors
(Corollary 4.5) finish the proof. For the spectre four chords leave their tile
across the reflex corner, by at most `ε = (2√3 − 3)/8 = 0.0580`, so two cases
remain: tiles that touch, and tiles that do not.

**Tiles that touch share a vertex** (edge-to-edge), so they lie in that
vertex's *star*, the cyclic sequence of (leaf type, leaf vertex) around it.

**Proposition 6.1 (finite local complexity).** *The set of vertex stars over
all supertiles of all levels is finite and computable.* A vertex is interior at
the level where it stops being an outline vertex, and there it is either a
corner class of a parent (its star is the concatenation of the children's
*corner fans* in the order of the vertex link) or interior to a glued pair of
meta-edges (its star is the union of the two supertiles' boundary fans there;
by C2 the junctions of sub-edges pair up as junction `i` against `m−i`, and
deeper points are junctions of sub-claims). Corner and junction fans of a
parent are concatenations of the children's corner fans, so the vector of all
corner fans is a deterministic sequence in `k` with bounded entries, hence
eventually periodic; `04-stars.ts` finds **period 2 from level 2**. ∎

`04` enumerates the stars: **45 for the hexagon family, 125 for the spectre**,
and validates the enumeration against exact geometry: the recursion reproduces
the geometric corner and junction fans of levels 2 and 3 tile by tile and in
order; every interior vertex star occurring in the level 1–5 patches of all
nine roots is in the enumeration, every enumerated star first formed at level
≤ 5 occurs there, and none occurs before the level the recursion forms it.
Every star closes to exactly 360° when its tiles are placed, and **in every
star no two chords cross**, with minimum clearance 0.750 (hexagons) and 0.707
(spectre) between chords without a common endpoint — the same numbers the
level-4/5 brute force of `FASS_PROOF.md` §4.2 measured.

**Lemma 6.2 (separation).** *Two spectres of a tiling that do not share a
vertex are at distance at least `d = min(w, r sin θ / (1 + sin θ)) = 0.448`,
where `r = 0.8966` is the least distance from a vertex of the spectre to a
non-incident edge, `w = 0.8966` the least distance between non-adjacent edges,
and `θ = 90°` its smallest interior angle.* Let `x ∈ A`, `y ∈ B` realise the
distance `δ` and suppose `δ < d`. Around any vertex `u`, the tiles of the star
of `u` fill a full neighbourhood (Theorem 4.4), each covering its own sector
out to radius `r`; so the open disk `D(u,r)` is covered by star tiles, and a
tile meeting `D(u,r)` in an interior point is a star tile of `u`. If `x` is
within `r − δ` of a vertex `u` of `A`, then `y ∈ D(u,r)` and `B` is a star tile
of `u`, sharing `u` with `A`. Otherwise `x` is interior to an edge `e` of `A`,
at distance at least `r − δ` from both its endpoints, and the tile `A'` across
`e` has every other edge at distance at least `min(w, (r−δ) sin θ)` from `x`;
the segment from `x` to `y` starts into `A'` and must leave it through such an
edge, so `δ ≥ min(w, (r−δ) sin θ)`, i.e. `δ ≥ d`. ∎

Since `2ε = 0.116 < 0.448`, two chords of tiles that do not share a vertex are
at least `d − 2ε > 0` apart. Together with the star check this proves part 4
for (B). ∎ (The flagship `0100100000` is *not* covered by this argument: six of
its chords stray, one by 0.408, so `2ε > d`; its star check passes, with
clearance 0.607, but the non-touching case would need a larger neighbourhood.)

---

## 7. What the reduction of `FASS_PROOF.md` becomes

| `FASS_PROOF.md` | here |
|---|---|
| L0 tiling: cited for spectre, nothing for hex, checked to level 6 | **Theorem 4.4 / Cor. 4.5**, both families, all levels, no citation |
| L1 degree ≤ 2 structural; = 2 at interior dots checked to level 6 | **Lemma 5.1**, all levels |
| L2 self-avoiding: hex proved; spectre 478 two-tile classes to level 6 | **§6**, all levels, via 125 vertex stars and Lemma 6.2 |
| L3 the crux: gluing/outer datum constant, checked to level 8 | **Corollary 3.1**, a consequence of the substitution tables |
| the "one remaining gap": coincident endpoints force coincident arcs | **C2 + C3**: equal words plus one shared endpoint, propagated |
| finite local complexity: open | **Proposition 6.1** |
| L4 one arc, no circuits, every tile: all levels given L3 | **Proposition 5.2** |
| L5 exhaustion: inradius monotone, divergence open | **Corollary 4.6**, topological |
| burial at address `0.0.5.0`: verified at levels 5, 6 | **Lemma 4.1**, all levels, from `B` |

---

## 8. What is proved and what is computed

Each line is a theorem (a proof written above), a finite check (a computation
that could in principle fail and is run by the named script, exiting non-zero
on failure), or a fact about the code.

| statement | kind | where |
|---|---|---|
| slot linear parts do not depend on the level | code (`buildLevel` derives them from `T_RULES` only); re-checked to level 12 | `01` |
| level-1 and level-2 patches are valid, outlines simple | finite check + Lemma 1.1 | `01` |
| six corners per type at levels 1, 2, the same in every buried instance | finite check (4392 … 559 instances per type) | `01` |
| meta-edge classes forced by the gluings, uniquely | finite check (115 glued pairs) | `01` |
| tables `B, G, CT, Q` identical at levels 2, 3, 4 and in both families | finite check | `01` |
| C1–C7 | finite checks, level-free | `02` |
| IH(1) ⇒ IH(k) for all `k` | theorem (§3) | — |
| non-overlap, edge-to-edge, outline simple, all levels | theorem (§4) | — |
| exhaustion of the plane | theorem (§4) | — |
| dot datum level-independent; dot patterns match geometry at levels 1–4 | theorem (Cor. 3.1) + finite check | `03` |
| `F` fixed; orbit a 2-cycle; zero circuits; Psi one arc; matches geometry at levels 2–4 | theorem + finite check | `03` |
| vertex stars: 45 / 125; complete and exact against levels 1–5 | theorem (Prop. 6.1) + finite check | `04` |
| no chord crossing in any star; clearance 0.750 / 0.707 | finite check (floating point, clearance ≫ rounding) | `04` |
| separation constants `r, w, θ, ε` | finite computation (`ε` sampled; closed form from `FASS_PROOF.md`) | `04` |
| chain: contiguity, two-sided growth, burial at `T₄`, seed distance 8.66 | finite check to level 6 (confirmation only) | `05` |

Everything the scripts compute is in exact integer arithmetic except the chord
geometry of §6 and the constants of Lemma 6.2, which are floating point with
margins of order 0.1 against rounding of order 10⁻¹⁵.

---

## 9. What is not proved

1. **A continuous space-filling limit.** Part 6 gives a bi-infinite polygonal
   curve through every tile of a tiling of the plane. It does not give a
   continuous map `[0,1] → ℝ²` onto a region as the limit of *rescaled*
   approximants: that needs an equicontinuity (Hölder) bound on the rescaled
   arcs, and as `FASS_PROOF.md` §4.5 shows the naive Hilbert-curve argument
   fails because a sub-supertile is re-entered up to five times and some of
   its internal arcs stay `O(1)` segments long at every level. Bounded
   re-entry is the right ingredient; the estimate is not written.
2. **Uniqueness of the plane tiling.** The chain of §4 is one tiling of the
   plane; other addresses give others. Nothing here says they are all the
   same up to isometry, or how many curves a different chain produces.
3. **The flagship** `spectre/1278/0100100000`: parts 1–3, 5, 6 hold verbatim
   (its orbit has pre-period 1), but part 4 is established only for tiles that
   share a vertex (§6).
4. **Identification with the published metatile system.** The tables of §2
   have the shape of the hat/spectre papers' combinatorial substitution and
   the edge rules are class-determined, but no item-by-item comparison with
   the published figures has been made. Nothing above depends on it.
5. **Lemma 4.3** is quoted, with a sketch, from Bridson–Haefliger; it is
   standard. Everything else is self-contained.

---

## 10. Scripts

All in [`web/fass-theorem/`](../web/fass-theorem/); run from `web/` with
`npx --yes tsx fass-theorem/<script>.ts [args]`. Each exits non-zero on any
failed check.

| script | argument | what it establishes | time |
|---|---|---|---|
| `geom.ts` | — | exact leaves, outlines (ccw), sub-supertile addressing | — |
| `01-tables.ts` | `hex` \| `spectre` | corners, classes, tables `B, G, CT, Q`, level-1 words; writes `tables-<family>.json` | 40 s / 3 min |
| `02-closure.ts` | `hex` \| `spectre` | C1–C7 and SameCorner, from the JSON alone | 1 s |
| `03-strands.ts` | `hex128` \| `spectre1278` \| `flagship` | dot datum, `F`, its 2-cycle, zero circuits, Psi one arc | 1 min |
| `04-stars.ts` | config, `[validation level]` | 45 / 125 vertex stars, validated to level 5; chord crossings; separation constants | 4 min |
| `05-chain.ts` | config, `[levels]` | the chain `0,5,0,0`: contiguity, growth, burial, seed distance | 5 min at 5 |
| `06-isabelle-data.ts` | config | emits the data theories of the Isabelle development (§11) | 1 min |

The `tables-*.json` files are committed so that `02`–`05` can be run without
re-deriving them; `01` regenerates them.

---

## 11. The combinatorial core in Isabelle/HOL

[`isabelle/`](../isabelle/) carries the finite part of this proof as an Isabelle
session, in the same spirit as the Lean check of selection 15 in `lean/`. The
kernel re-runs the computations and the all-levels statements are proved from
them by induction:

* `claims_all_levels` and `labclaims_all_levels` are C2 as theorems: if the
  claim set is closed under one substitution step and every claim holds at
  level 1, every claim holds at every level. The step lemma `holds_step` is
  the algebra of §3 (reverse, negate, and the direction maps) written out.
* `routing_all_levels`: a period-2 orbit of the routing operator from the
  level-1 states, with zero circuits and a one-arc Psi on both states of the
  period, gives zero circuits and a one-arc Psi at every level.
* `angles_all_levels`, and the constancy of the boundary dot counts, by the
  same periodicity argument (`funpow_period_all`).
* C1, C3 (with SameCorner), C4, C6 and C7 are executable checks run by `eval`.

The data theories are generated from the verified pipeline by
`06-isabelle-data.ts`. The session has not yet been run through Isabelle in
this repository (no installation was reachable when it was written); every
`eval` statement was validated by `isabelle/shadow.py`, a third independent
implementation of the same definitions. What the session does not cover is
what no combinatorics covers: that the tables describe the real level-1 and
level-2 patches, the winding-number lemma, the covering argument of §4, and the
vertex stars of §6.
