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
is an evidence dossier on a sibling combination (`spectre/1278/0100100000`);
this one is about proof structure, and it corrects two things that dossier gets
wrong.

Everything numerical below is computed by the scripts in
[`web/fass-proof/`](../web/fass-proof/), which build only on the verified core
library (`web/src/core`) and — unlike the earlier investigation — do every
combinatorial and adjacency computation in **exact `Z[ζ₁₂]` integer
arithmetic**. Welding compares integers, not floats within an epsilon, so every
adjacency statement here is a statement about the substitution system rather
than a numerical observation. The library reproduces every number in
`FASS_1278.md` exactly.

---

## 0. Summary of the answer

Proving "this is a FASS curve" is not one proof. It is six obligations with
very different characters:

| | obligation | status |
|---|---|---|
| **L0** | the leaf tiles actually tile (disjoint interiors, no gaps) | cite for spectre, **checked** for hex |
| **L1** | **Simple** — the strand graph has max degree 2 | **proved, all levels** |
| **L2** | **Self-avoiding** — no drawn chord crosses another | **proved for hex**; finite-but-larger check for spectre |
| **L3** | the substitution's strand composition is level-independent | **open — the crux** |
| **L4** | one arc, no circuits, every tile visited | **proved for all levels given L3** |
| **L5** | the infinite limit | bi-infinite **yes**; whole-plane needs a merge argument |

**The short answer to "how do we do that".** Reduce everything to L3, then
either prove L3 or cite it. L1 and L4 are then genuine theorems; L2 becomes a
finite local check that settles every level at once; L5 is the standard
Hilbert-curve limit argument with its hypotheses made explicit. L3 is the only
thing standing between the current evidence and a proof, and §6 states it
precisely enough to attack or cite.

Six things found while writing this reshape the problem. Three are good news,
three are corrections.

* **The two conjectures are one theorem** (§2). Configurations (A) and (B)
  induce isomorphic strand graphs. Proving either proves the other's
  topological half.
* **These configurations are essentially unique** (§3). Across both families,
  exactly one edge-class selection each admits the property, with exactly four
  combinations, in one-to-one correspondence between the families. The owner's
  two guesses are two of those eight, and they are the *cleanest* two.
* **The limit constants have closed forms** (§4.6), answering `FASS_1278.md`
  Open Question 3.
* **Correction 1 (§4.3).** `FASS_1278.md` justifies the crux lemma by saying
  the gluing data is "pinned by the level-independent child transforms of
  `buildSupertiles`". Those transforms are *not* level-independent —
  `buildSupertiles` recomputes them from each level's own quad — and the
  supertiles are not similar across levels. Their boundaries are fractal in the
  limit, of dimension about 1.396. The crux lemma has no similarity proof.
* **Correction 2 (§4.2).** Four of the spectre chords **leave their own tile**,
  cutting across a reflex corner of the concave 14-gon. So the clean
  "chords stay inside their tiles" proof of self-avoidance works for hexagons
  and fails for the spectre. It is repaired by checking coronas instead of
  single tiles, which is still finite.
* **Correction 3 (§4.5).** The Psi-inside-Psi nesting gives a genuine
  bi-infinite curve, but its inradius about the seed is *exactly constant* at
  every level, so that union fills a sector, not the plane. Whole-plane
  exhaustion needs an address through other supertile types, and along such an
  address the patch is no longer a single arc.

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

Gamma1's class-2 seam is *partial* — it carries only the label `2.2A`, the rest
of that seam living on Gamma2 — so it has no `minor == 0` label and contributes
no dot. Filtering seams on the selected class alone over-reports Gamma1 by one
and misaligns every matching index after it; `activeSeams` in
`web/fass-proof/lib.ts` documents the trap.

### The observed behaviour

Exact arithmetic, rooted at the Psi supertile. Both configurations: zero
circuits, maximum welded degree 2, zero junctions, **exactly one open arc**
carrying every segment and visiting **every** tile.

| level | (A) hex tiles | (A) segments | (B) spectre tiles | (B) segments |
|---|---|---|---|---|
| 1 | 8 | 9 | 9 | 10 |
| 2 | 63 | 83 | 71 | 91 |
| 3 | 496 | 667 | 559 | 730 |
| 4 | 3,905 | 5,265 | 4,401 | 5,761 |
| 5 | 30,744 | 41,465 | 34,649 | 45,370 |

Rendered at level 4 in
[`fass_hex-128-010100000_Psi_lvl4.svg`](../web/fass-proof/fass_hex-128-010100000_Psi_lvl4.svg)
and
[`fass_spectre-1278-0101000000_Psi_lvl4.svg`](../web/fass-proof/fass_spectre-1278-0101000000_Psi_lvl4.svg),
each with exactly two endpoint markers, which is what one open arc looks like.

---

## 2. The two conjectures are the same theorem

The two configurations agree on all eight shared leaf types: same active seams
in the same cyclic order, same number of non-crossing options, same chosen
pairing. They differ only at Gamma.

* **Hexagons** have one `Gamma` leaf with dots `-1A, 1A, 2A, -2A`, paired
  `-1A—1A` and `2A—-2A`.
* **Spectre** splits it into the composite Mystic pair: `Gamma1` with dots
  `-1A, 1A, 7A, -2A` paired `-1A—1A`, `7A—-2A`, and `Gamma2` with dots
  `-7A, 2A` paired `-7A—2A`. The class-7 dot is an **internal** weld between
  the two halves — it never reaches the composite's boundary.

Chaining through that internal weld, the composite's chords are `-1A—1A` and
`-2A —(Gamma1)— 7A ≡ -7A —(Gamma2)— 2A`, i.e. `-2A … 2A` with one extra
degree-2 vertex in the middle. That is exactly the hexagon Gamma's chord set,
subdivided once. The composite's outer active seams are `{-1A, 1A, 2A, -2A}`,
the hexagon Gamma's four.

**Consequence.** The two strand graphs are isomorphic after suppressing every
degree-2 class-7 vertex. Every *topological* FASS property — circuit-freeness,
the single-arc property, component structure, tile coverage — transfers between
them. The *metric* properties do not transfer automatically: self-avoidance of
the drawn chords, clearances, and the geometry of the space-filling limit must
be established separately in each family, because the two realisations put the
same combinatorics on different polygons. §4.2 shows this distinction has real
teeth — the two families genuinely differ there.

---

## 3. These configurations are essentially unique

For a strand system to be space-filling at all, every leaf type must carry at
least one chord, so every leaf type needs an **even, non-zero** number of active
dots. That is a finite condition on the selection. Sweeping every non-empty
selection of non-zero edge classes in both families
([`00-census.ts`](../web/fass-proof/00-census.ts)):

| family | selections | leave some type with no dot | leave some type with an odd count | survive |
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

Note circuit-free and single-line coincide exactly at the Psi root. The eight
winners, in exact cross-family correspondence (same digits on the eight shared
types, Gamma digits zero):

| | `hex` 128 | `spectre` 1278 | set digits |
|---|---|---|---|
| **(A)/(B)** | `010100000` | `0101000000` | Theta, Xi |
| | `001100000` | `0011000000` | Lambda, Xi |
| | `010010000` | `0100100000` | Theta, Pi — the `FASS_1278.md` flagship |
| | `001010000` | `0010100000` | Lambda, Pi |

So the owner's two guesses are the Theta/Xi member of each family's quartet, and
the quartet is the complete answer: there is nothing else to find. This also
settles the notebook's `2578` guesses (`Spectre_Patterns.ipynb` cells 45 and 50)
in the negative — that selection admits 64 combinations and none is
circuit-free; the script reproduces the 136 circuits `FASS_1278.md` reports.

---

## 4. The proof obligations

### 4.1 L0 — the tiles actually tile, and L1 — Simple

Everything geometric downstream needs the leaf tiles of a patch to have
pairwise disjoint interiors and to cover the patch without gaps. For the spectre
family this is the Smith–Myers–Kaplan–Goodman-Strauss theorem. The `hex` family
is this repo's own reduced realisation and has to be checked. Exact edge census
plus an area identity, rooted at Delta:

| patch | tiles | distinct placements | max tiles per edge | one boundary loop | Σ tile area vs outline polygon |
|---|---|---|---|---|---|
| `hex` level 3 | 496 | 496 | 2 | yes | agree to 6e-12 |
| `hex` level 4 | 3,905 | 3,905 | 2 | yes | agree to 2e-10 |
| `spectre` level 3 | 559 | 559 | 2 | yes | agree to 1e-11 |
| `spectre` level 4 | 4,401 | 4,401 | 2 | yes | agree to 9e-10 |

Edge-to-edge — no edge used by three tiles — is an *exact* integer statement;
the area identity is the float half and holds to ten significant figures on
patches of area 10⁴. Both families tile.

**L1 (Simple).** *Every welded connection point has degree at most 2, so the
strand graph is a disjoint union of simple paths and cycles.*

*Proof.* Class 0 is the self-gluing class: a class-0 seam glues to another
class-0 seam and three tiles can meet at a class-0 vertex dot, which is exactly
how degree-3 junctions arise. Neither selection contains class 0. Every other
class is signed, so a `+k` seam glues to exactly one neighbouring `-k` seam, and
a dot on such a seam belongs to exactly two tiles — one, on the patch boundary.
Each tile's chosen matching is a *perfect* matching of its dots, so each tile
contributes exactly one chord-end per dot. Hence welded degree is 2 in the
interior and 1 on the boundary, never more. ∎

Structural, so it holds at every level and in the infinite tiling. It is also
why the census in §3 restricts to selections without class 0, and why every arc
ends on the patch boundary rather than stopping somewhere inside.

### 4.2 L2 — Self-avoiding, and why the spectre needs more work than the hexagon

The argument one wants is:

> *If (a) every chord meets the boundary of its own tile in exactly its two
> endpoints and nowhere else, and (b) the chords inside a single tile are
> pairwise non-crossing as drawn, then the strand graph is embedded with no
> crossings, at every level and in the infinite tiling.*
>
> *Proof.* Every chord lies inside its own closed leaf tile. By L0 the tiles
> have disjoint interiors, so two chords from different tiles meet only on the
> shared boundary; by (a) each meets its tile's boundary only at its endpoints,
> which are connection dots, so any such meeting is a weld. By L1 a weld has
> degree at most 2, so it joins two chord-ends rather than crossing. Two chords
> in the same tile do not cross, by (b). ∎

(a) and (b) are checks over nine or ten tile types with one matching each, and
they transfer to every tile instance because every instance is the image of its
leaf type under an isometry — a rotation by a multiple of 30° with or without a
mirror — and isometries preserve incidence and crossing. That would upgrade
`FASS_1278.md`'s level-5 brute force to a theorem about every level.

**It works for the hexagon family and fails for the spectre.** Hexagons are
convex, so (a) is automatic. The Spectre is a concave 14-gon, and four of the
chosen chords cut across a reflex corner and leave their own tile:

| tile | chord | verdict |
|---|---|---|
| Theta | `2A—-2A` | exits, crossing two polygon edges |
| Xi | `-1A—-2A` | exits, crossing two polygon edges |
| Phi | `2A—-2A` | exits, crossing two polygon edges |
| Psi | `-1A—-2A` | exits, crossing two polygon edges |

So (a) is false for configuration (B), and the single-tile argument does not
close. Condition (b) survives: `web/src/core/matchings.ts` warns that the
canonical combination encoding uses the *topological* non-crossing rule, which
is strictly more permissive than the geometric one precisely because the Spectre
is concave, but for these selections the two rules agree.

**The repair keeps the check finite.** A crossing is a *local* event: two chords
that cross both lie within one tile's corona — the tile together with every tile
meeting it. If the set of coronas occurring anywhere in the tiling is finite up
to isometry (finite local complexity), then checking every corona once settles
self-avoidance at every level, exactly as the single-tile check would have.
[`11-local-complexity.ts`](../web/fass-proof/11-local-complexity.ts) enumerates
coronas up to the 24 lattice isometries and the count saturates:

| family | level 2 | level 3 | level 4 | level 5 |
|---|---|---|---|---|
| `hex` distinct interior coronas | 1 | 37 | 38 | **38** |
| `spectre` distinct interior coronas | 3 | 41 | 42 | **42** |

Brute force agrees that no crossing actually occurs, and — tellingly — the
minimum clearance between non-adjacent chords is *constant across levels*,
which is what finitely many local configurations look like:

| configuration | Psi level 4 | Psi level 5 | min clearance |
|---|---|---|---|
| `hex/128/010100000` | 0 crossings, 0 touches | 0 crossings, 0 touches | 0.750 |
| `spectre/1278/0101000000` | 0 crossings, 0 touches | 0 crossings, 0 touches | 0.707 |
| `spectre/1278/0100100000` | 0 crossings, 0 touches | 0 crossings, 0 touches | 0.607 |

The last row reproduces the 0.607 that `FASS_1278.md` reports. Note the
conjectured configuration (B) has a *wider* margin than the documented
flagship.

### 4.3 L3 — the crux: level-independence of the substitution's strand composition

Let `∂(T,k)` be the connection dots on the boundary of the level-`k` supertile
of type `T`, in canonical cyclic order.

> **Lemma (L3).** For each type `T`: `|∂(T,k)|` is constant in `k`; and under a
> canonical labelling, the **gluing** map — which child boundary dot welds to
> which sibling boundary dot inside the parent — and the **outer** map — which
> child boundary dots survive as the parent's boundary dots — are constant in
> `k`, up to the period-2 mirror that `buildSupertiles` introduces.

Given L3, `routing(T,k+1) = F_T(children's routings at level k)` with `F_T`
**fixed**, and the whole problem collapses to iterating a fixed map on a finite
state space.

**The geometric route is closed, and the reason is sharper than expected.**
`FASS_1278.md` §4.4 justifies the gluing and outer maps being level-independent
by saying they are "structurally pinned by the level-independent child
transforms of `buildSupertiles`". `buildSupertiles` *recomputes* `Ts[0..7]` from
each level's own quad. Fitting a similarity from each level's quad to the next:

| step | scale factor | rotation | residual |
|---|---|---|---|
| 0 → 1 | 3.898224 | −22.6307° | 6.7e+0 |
| 1 → 2 | 2.910936 | +10.5959° | 1.7e+0 |
| 2 → 3 | 2.818801 | −11.6832° | 5.9e−1 |
| 3 → 4 | 2.807518 | +11.5501° | 2.1e−1 |
| 4 → 5 | 2.806091 | −11.5669° | 7.5e−2 |
| 5 → 6 | 2.805910 | +11.5648° | 2.7e−2 |

The ratio converges to √(4+√15) = 2.805883701… and the angle to ±11.565°, but
neither is exact at any finite level. The underlying reason
([`08-supertile-outline.ts`](../web/fass-proof/08-supertile-outline.ts)): all
eight non-Gamma supertile types share one identical outline at every level —
every type carries Gamma at slot 7 and only there, so the induction is
immediate, and only Gamma differs — but that outline's perimeter grows by about
4.22 per level:

| level | `hex` perimeter | ratio | `spectre` perimeter | ratio |
|---|---|---|---|---|
| 1 | 22 | — | 46 | — |
| 2 | 90 | 4.0909 | 182 | 3.9565 |
| 3 | 378 | 4.2000 | 758 | 4.1648 |
| 4 | 1,598 | 4.2275 | 3,198 | 4.2190 |

Perimeter grows by 4.22 while diameter grows by only 2.8059, so **the supertile
boundaries are fractal in the limit**, of dimension log(4.22)/log(2.8059) ≈
1.396. Supertiles are genuinely not similar across levels and the crux lemma has
no similarity proof. Two weaker invariants also fail: the boundary *direction*
word grows (22, 90, 378, …) and so does the boundary *meta-edge class* word.

**What does survive is the better invariant.** The boundary grows without bound
but the number of boundary connection dots does not
([`09-interface-invariant.ts`](../web/fass-proof/09-interface-invariant.ts)),
identically in both families and at every computed level:

| type | Gamma | Delta | Theta | Lambda | Xi | Pi | Sigma | Phi | **Psi** |
|---|---|---|---|---|---|---|---|---|---|
| boundary dots | 10 | 8 | 6 | 6 | 4 | 4 | 10 | 4 | **2** |
| internal arcs | 5 | 4 | 3 | 3 | 2 | 2 | 5 | 2 | **1** |
| circuits | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

A supertile therefore has a fixed, small number of *ports*, which is exactly the
structure the Hilbert-curve argument needs. The internal arcs form a perfect
matching of those ports, with no circuits and no interior endpoints anywhere.

**A consequence worth stating separately: Psi's routing state space is a
singleton.** With two boundary dots, no circuits and no interior endpoints, the
only possible routing of a level-`k` Psi supertile is the single arc joining its
two dots. So the single-line property at the Psi root does not need the full
routing automaton — it follows from the interface invariant, L1, and
circuit-freeness.

### 4.4 L4 — one line, no circuits, every tile visited

[`10-routing-states.ts`](../web/fass-proof/10-routing-states.ts) computes the
pairing each type induces on its canonically-labelled boundary dots. The
labelling anchors the outline at the supertile's `quad[0]` and orients it so
`quad[1]` precedes `quad[3]` — chirality-stable, which is essential because
consecutive levels are mirror images.

Every type in all three configurations is eventually periodic with period 2, and
for **both conjectured configurations the pre-period is 1** — cleaner than the
`FASS_1278.md` flagship, whose Gamma and Sigma need pre-period 2. Psi is the arc
`0-1` at every level with period 1. For example, Delta alternates between
`0-7 1-6 2-3 4-5` and `0-1 2-7 3-4 5-6`; Xi between `0-1 2-3` and `0-3 1-2`.

Given L3, the state at level `k+1` is a fixed function of the children's states
at level `k`, so a period **is** an induction and the following hold at *every*
level, not just the computed ones: zero circuits for every type; the Psi
supertile is a single arc; the Delta profile alternates with period 2.

Coverage is separate and structural: every leaf type carries at least one chord
(§1 — no type has zero dots), and the parent's arc decomposition consumes every
arc of every child exactly once, so by induction the single Psi arc visits every
tile of its patch at every level. Verified directly at levels 1–5 in both
families: tiles covered equals tiles present.

### 4.5 L5 — the infinite limit

`SUPER_RULES.Psi = [Psi, Delta, Psi, Phi, Sigma, Psi, Phi, Gamma]`, so Psi
contains Psi at slots 0, 2 and 5. Each gives an increasing sequence of patches
by re-anchoring, `E₁ = id` and `E_{k+1} = E_k ∘ Ts_{k+1}[slot]⁻¹`, so the
level-`k` child stays put while the parent grows around it. All transforms are
exact, so containment is an integer statement.
[`13-nesting-limit.ts`](../web/fass-proof/13-nesting-limit.ts) checks three
things.

1. **Nesting holds, and is forced rather than lucky.** The level-`k` arc sits
   inside the level-`(k+1)` arc as a *contiguous* sub-path at every level, in
   both families, at all three slots. This is forced by the interface invariant:
   the Psi interface is exactly two dots, so a strand entering the child must
   traverse all of it before leaving.
2. **Two-sided growth holds.** The parent arc carries material both before and
   after the child's sub-path, and both counts diverge — at spectre slot 2, for
   instance, `before` runs 41, 176, 2646, 10994 and `after` runs 40, 463, 2385,
   28615. So each slot gives a genuine **bi-infinite** curve, not a ray.
3. **Exhaustion does not hold for a constant slot.** The inradius about the seed
   is *exactly constant* at every level — 1.409 for hexagons, 3.527 for the
   spectre — so the seed abuts the patch boundary forever and that union fills a
   sector, not the plane.

A varying address does push the seed inside. Greedily maximising the inradius
finds `Theta#0 → Gamma#3 → Gamma#7 → Gamma#7`, where it jumps from 3.53 to
40.35 at level 4. But such an address passes through types with larger
interfaces — Gamma has ten boundary dots and five arcs — so along it the patch
is no longer a single arc, and the single-line property must be carried by a
merge argument of the kind `FASS_1278.md` §4.5 runs, rather than by the nesting
itself.

**Space-filling, and one point of hygiene.** The standard argument needs: the
level-`k` arc restricted to any level-`j` sub-supertile stays inside that
sub-supertile (true, and the same fact as nesting); tile diameters shrink
relative to patch diameter like λ^(−k/2); and every tile is visited (L4).
Together these give uniformly convergent parameterisations and a continuous
surjection onto a set of positive area. But **"self-avoiding" in FASS is a
property of the finite approximants, not of the limit** — a genuine
space-filling curve cannot be injective. The right claim is that every level-`k`
approximant is a non-self-crossing polygonal arc, which is L2.

### 4.6 The limit constants, in closed form

[`12-limit-constants.ts`](../web/fass-proof/12-limit-constants.ts) builds the
substitution matrix from `SUPER_RULES` and derives the constants instead of
measuring them, answering `FASS_1278.md` Open Question 3.

The characteristic polynomial is `x⁹ − 8x⁸ + 8x⁶ − x⁵`, and `x² − 8x + 1`
divides it exactly over the integers. So the tile growth factor is the algebraic
integer **4 + √15 = 7.872983346…**, whose conjugate 4 − √15 is its reciprocal;
the linear inflation factor is √(4+√15) = 2.805883701….

The Perron eigenvector gives the limiting frequency of each supertile type, and
every entry lies in `Z[√15]`:

| type | frequency | closed form |
|---|---|---|
| Gamma, Delta, Sigma | 0.127016654 | 4 − √15 |
| Theta, Lambda | 0.016133230 | 31 − 8√15 |
| Xi, Pi | 0.094750193 | 15√15 − 58 |
| Phi | 0.221766847 | 14√15 − 54 |
| Psi | 0.175416345 | 97 − 25√15 |

They sum to 1. Segments per tile is the corresponding eigenvector combination,
and it too is closed-form:

| family | segments per tile | closed form |
|---|---|---|
| `hex` | 1.348783500696… | **13√15 − 49** |
| `spectre` | 1.309475019311… | **3(√15 − 3)/2** |

The spectre value matches the 1.30949 that `FASS_1278.md` reports as a measured
limit.

---

## 5. What is proved, checked, and assumed

| claim | status |
|---|---|
| Both families tile edge-to-edge with disjoint interiors | exact edge census; area identity to 1e-10; cited for spectre |
| Welded degree ≤ 2; components are paths and cycles | **proved, all levels** (§4.1) |
| Arcs end only on the patch boundary | **proved, all levels** (follows from L1) |
| Chords within a tile do not cross as drawn | finite check, 9 or 10 types |
| Chords stay inside their own tile | **true for hex; FALSE for spectre** (4 chords exit) |
| No crossings anywhere | **proved for hex, all levels**; for spectre, reduced to 42 coronas, which saturate by level 4 and are verified |
| Boundary dot interfaces constant per type | verified levels 1–5, both families |
| Routing states eventually periodic (period 2, pre-period 1) | verified levels 1–5, both families |
| Zero circuits, every type, every level | verified levels 1–5; **all levels given L3** |
| Psi supertile is a single arc | verified levels 1–5; **all levels given L3**, and forced by the interface invariant |
| Every tile visited | verified levels 1–5; **all levels given L3** |
| The gluing and outer maps are level-independent | **OPEN — this is L3** |
| Psi-in-Psi nesting gives a bi-infinite curve | verified levels 1–5, all three slots |
| That nesting exhausts the plane | **refuted** — inradius is exactly constant |
| Growth factor 4+√15, frequencies, segments per tile | **proved** (exact, from the substitution matrix) |
| hex and spectre strand graphs isomorphic | verified structurally and on patches |
| The eight single-line configurations are the only ones | **proved** by exhaustive census |

---

## 6. Closing the crux

L3 is the only thing between the evidence and a proof. Three routes, in
decreasing order of how well they are understood.

**Route 1 — cite the metatile substitution.** The hat and spectre metatile
systems of Smith, Myers, Kaplan & Goodman-Strauss are genuine *combinatorial*
substitutions: the supertile adjacency and edge-matching structure is fixed and
level-independent by construction, which is exactly L3. Under this route the
repo's job is not to prove L3 but to verify that *this implementation* realises
that substitution — which the exact scripts here do, at every computed level.
That is an honest and complete proof structure; the assumption is named and
external rather than hidden.

**Route 2 — a linear-recursion invariant plus Perron–Frobenius.** The boundary
word is not level-independent, but the vector of meta-edge extents plausibly
satisfies a fixed linear recursion `v(k+1) = M v(k)`. The contact computation
depends on `v` only through finitely many linear predicates ("do these two
boundary walks coincide"). By Perron–Frobenius, `v(k)` converges in direction to
the Perron eigenvector; if each predicate is strict at the limit, it is constant
for all `k` beyond an effectively computable `k₀`, and checking up to `k₀`
finishes the proof. This is a concrete research programme, not a finished
argument, and the first step is to establish the recursion exactly.

**Route 3 — shrink what L3 has to carry.** §4.3 shows the single-line property
at the Psi root needs only three things: the interface `|∂(Psi,k)| = 2`, L1, and
circuit-freeness. Interfaces are a much weaker statement than the full gluing
map, and `|∂(Psi,k)| = 2` may be provable directly — for instance by showing the
level-`k` Psi boundary meets a selected seam class exactly twice. That would
reduce L3 to circuit-freeness alone.

**For a machine-checked proof**, the finite parts — matchings, the corona check,
automaton iteration, exact `Z[ζ₁₂]` arithmetic — are all well suited to a proof
assistant, since the ring has a unique integer representation and every
predicate is decidable. The limit argument in §4.5 is the hard part and would
need real analysis, not just decidable arithmetic.

---

## 7. Scripts

All in [`web/fass-proof/`](../web/fass-proof/); run from `web/` with
`npx --yes tsx fass-proof/<script>.ts`. Each prints a pass/fail report and exits
non-zero on failure.

| script | what it establishes |
|---|---|
| `lib.ts` | exact `Z[ζ₁₂]` patch expansion, strand building, tracing; reproduces every `FASS_1278.md` number |
| `00-census.ts` | the uniqueness classification of §3 |
| `08-supertile-outline.ts` | all non-Gamma outlines identical; perimeter grows 4.22 per level; boundaries fractal |
| `09-interface-invariant.ts` | boundary dot counts constant; arcs a perfect matching; no circuits |
| `10-routing-states.ts` | canonical routing states; period 2 with pre-period 1 |
| `11-local-complexity.ts` | coronas saturate at 38 (hex) and 42 (spectre) |
| `12-limit-constants.ts` | substitution matrix; 4+√15; closed-form frequencies and segments per tile |
| `13-nesting-limit.ts` | nesting, two-sided growth, and the exhaustion refutation |
| `render.ts` | SVG of a configuration's curve on a patch |

---

## 8. Open questions

1. **L3 itself** (§6) — the one real gap.
2. **Whole-plane exhaustion with a single curve.** The constant-slot nesting is
   bi-infinite but fills a sector. An address that exhausts the plane passes
   through types with several arcs. Does the merge argument close, and is the
   whole-plane object one curve or several?
3. **`|∂(Psi,k)| = 2` directly.** A direct proof would collapse most of L3 for
   the single-line property (Route 3).
4. **The other three combinations.** Each family's quartet has the same Psi-root
   single-line property. Are the four limit curves the same curve up to mirror,
   or genuinely different FASS curves?
5. **Why 4.22?** The boundary growth factor is measured, not derived. It should
   be the Perron eigenvalue of a boundary substitution matrix; finding that
   matrix would also feed Route 2.
6. **The hexagon realisation's geometry.** The topological half transfers from
   the spectre, but the hexagon tiling is a different metric object. Its
   space-filling limit deserves its own statement.
