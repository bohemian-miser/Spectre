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
this one is about proof structure, and it corrects three things that dossier
gets wrong plus one in the core library.

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
| **L2** | **Self-avoiding** — no drawn chord crosses another | **proved for hex, all levels**; 478 two-tile classes for spectre |
| **L3** | the substitution's strand composition is level-independent | **open — the crux** |
| **L4** | one arc, no circuits, every tile visited | **proved for all levels given L3** |
| **L5** | the infinite limit | **whole plane, one bi-infinite curve**, via the Delta nesting |

**The short answer to "how do we do that".** Reduce everything to L3, then
either prove L3 or cite it. L1 and L4 are then genuine theorems; L2 becomes a
finite local check that settles every level at once; L5 is the standard
Hilbert-curve limit argument with its hypotheses made explicit. L3 is the only
thing standing between the current evidence and a proof, and §6 states it
precisely enough to attack or cite.

Seven things found while writing this reshape the problem. Three are good news,
four are corrections — and every correction came from running a check, not from
reading.

* **The two conjectures are one theorem** (§2). Configurations (A) and (B)
  induce isomorphic strand graphs. Proving either proves the other's
  topological half.
* **These configurations are essentially unique** (§3). Across *all* 255 and
  511 edge-class selections in the two families, exactly one selection each
  admits the property, with exactly four combinations, in one-to-one
  correspondence between the families. The owner's two guesses are two of those
  eight, and they are the *cleanest* two — shortest routing pre-period.
* **The limit constants have closed forms** (§4.6), answering `FASS_1278.md`
  Open Question 3.
* **Correction 1 (§4.3).** `FASS_1278.md` justifies the crux lemma by saying
  the gluing data is "pinned by the level-independent child transforms of
  `buildSupertiles`". Those transforms are *not* level-independent —
  `buildSupertiles` recomputes them from each level's own quad — and the
  supertiles are not similar across levels. Their boundaries are fractal in the
  limit, of dimension about 1.396. The crux lemma has no similarity proof.
* **Correction 2 (§4.2).** Four of the spectre chords **leave their own tile**,
  cutting across the reflex corner of the concave 14-gon by exactly
  (2−√3)/4. So the clean "chords stay inside their tiles" proof of
  self-avoidance settles hexagons completely and fails for the spectre. It is
  repaired by checking two-tile placements instead of single tiles, which is
  still finite — 478 classes, complete from level 4.
* **Correction 3 (§4.5).** The Psi-inside-Psi nesting gives a genuine
  bi-infinite curve, but its inradius about the seed is *exactly constant* at
  every level, so that union fills a sector, not the plane. The nesting that
  does fill the plane is **Delta inside Delta**, whose patches carry four arcs
  rather than one — and those four all land in a single arc two levels up, so
  the whole-plane object is still exactly one bi-infinite curve.
* **Correction 4 (§4.1).** `web/src/core/circuits.ts` says three tiles can meet
  at a class-0 connection point, producing branch points. They cannot. Over all
  511 selections in both families the maximum dot multiplicity is 2, so **no
  selection produces a junction at all** — which is why the census in §3 has to
  include class 0, and does.

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
them. The correspondence is stronger than an isomorphism of graphs: at the level
of the routing automaton (§4.4) the two configurations are **literally the same
automaton**. Identical boundary-dot counts per type, identical gluing and outer
data for all nine types, identical routing cycle, identical Psi composition
words, identical phase. The `FASS_1278.md` flagship shares the same datum and
the same cycle and differs only by a one-level phase shift, which is exactly the
"phase-shifted pair" that document reports. Anything proved about the routing of
one is automatically true of all three. The *metric* properties do not transfer automatically: self-avoidance of
the drawn chords, clearances, and the geometry of the space-filling limit must
be established separately in each family, because the two realisations put the
same combinatorics on different polygons. §4.2 shows this distinction has real
teeth — the two families genuinely differ there.

---

## 3. These configurations are essentially unique

For a strand system to be space-filling at all, every leaf type must carry at
least one chord, so every leaf type needs an **even, non-zero** number of active
dots. That is a finite condition on the selection. Sweeping every non-empty
edge-class selection in both families — class 0 included, since §4.1 shows it is
harmless — ([`00-census.ts`](../web/fass-proof/00-census.ts)):

| family | selections | leave some type with no dot | leave some type with an odd count | survive |
|---|---|---|---|---|
| `hex` | 255 | 120 | 129 | **6** |
| `spectre` | 511 | 261 | 245 | **5** |

The survivors, with every non-crossing combination classified at the Psi root:

| family | selection | dots per type | combos | single line |
|---|---|---|---|---|
| `hex` | **{1,2,8}** | 2,4,4,4,4,2,2,2,4 | 32 | **4** |
| `hex` | {2,5,8} | 2,4,4,4,4,2,4,4,2 | 64 | 0 |
| `hex` | {0,1,3,4,6} | 4,2,2,2,2,4,2,2,4 | 8 | 0 |
| `hex` | {0,3,4,5,6} | 4,2,2,2,2,4,4,4,2 | 16 | 0 |
| `hex` | {0,2,3,4,6,8} | 4,6,4,4,2,4,4,2,4 | 320 | 0 |
| `hex` | {0,1,2,3,4,5,6,8} | 6 everywhere | 1,953,125 | 0 |
| `spectre` | **{1,2,7,8}** | 2,4,4,4,4,2,2,2,2,4 | 32 | **4** |
| `spectre` | {2,5,7,8} | 2,4,4,4,4,2,4,4,2,2 | 64 | 0 |
| `spectre` | {0,1,3,6} | 4,2,2,2,2,2,2,2,2,2 | 2 | 0 |
| `spectre` | {0,2,3,6,7,8} | 4,6,4,4,2,2,4,2,4,2 | 160 | 0 |
| `spectre` | {0,1,2,3,5,6,7,8} | 6,6,6,6,6,4,6,6,4,4 | 625,000 | 0 |

The two near-full selections are cascaded through levels 1 to 4 rather than
swept flat; single-line at level 4 implies single-line below, so nothing is
lost, and neither yields a survivor at level 1. Circuit-free and single-line
coincide exactly at the Psi root.

**Cross-check.** `core/subsets.ts` independently computes the valid selections
as the kernel of the tiles-by-class count matrix over GF(2) (DESIGN.md §3.8).
The "even dot count" condition reproduces that kernel exactly in both families,
and the census's extra "no leaf type has zero dots" condition drops precisely
`15` for hexagons and `15`, `0356` for the spectre. So the sweep agrees with the
repo's own linear algebra, by a completely different route.

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
settles the notebook's `2578` guesses (`Spectre_Patterns.ipynb` cells 45 and 50)
in the negative — that selection admits 64 combinations and none is
circuit-free; the script reproduces the 136 circuits `FASS_1278.md` reports.

---

## 4. The proof obligations

### 4.1 L0 — the tiles actually tile, and L1 — Simple

Everything geometric downstream needs the leaf tiles of a patch to have
pairwise disjoint interiors and to cover the patch without gaps. For the spectre
family this is the Smith–Myers–Kaplan–Goodman-Strauss theorem. The `hex` family
is this repo's own reduced realisation and **nothing is cited for it** — only
the exact verification below supports it.

The argument that actually proves tiling is a winding-number identity, not an
area check ([`01-local-structure.ts`](../web/fass-proof/01-local-structure.ts)).
Interior edges cancel in opposite-directed pairs, each tile is a simple
counter-clockwise polygon, and winding number is additive over 1-chains, so the
covering multiplicity of a point equals the winding number of the residual
boundary. If that residual boundary is a single simple closed curve, the
multiplicity is 0 or 1 everywhere — which is disjoint interiors *and* no gaps in
one step. Verified exactly at levels 3–6, roots Delta, Psi and Gamma, both
families, the deepest being 272,791 tiles and 1,938,196 distinct edges. Two
supporting facts come for free: every patch edge is a unit step of `Z[ζ₁₂]`, and
a relative-interior point of a unit edge is in the ring only at the endpoints,
so **no patch is ever anything but edge-to-edge**, at any level.

The "sum of tile areas equals the outline polygon" identity that an earlier
draft of this document offered as evidence is *automatic* once directed edges
cancel. It is a bookkeeping check on orientation, not evidence of disjointness,
and it is now computed exactly as integer pairs rather than to a float epsilon.

**L1 (Simple).** *Every welded connection point has degree at most 2, so the
strand graph is a disjoint union of simple paths and cycles.*

*Proof.* With class 0 excluded, every dot is the midpoint of exactly one
physical **unit** edge of its tile: the default contract for classes 1–8 is
(minor 0, t = ½), and t = ½ is the fixed point of the gluing involution
t ↦ 1 − t, which is exactly why abutting tiles' dots coincide at all. Two
distinct unit segments with a common midpoint either coincide or cross
transversally at an interior point of both, and the latter would make the two
tiles overlap in a sector of positive area, contradicting L0. So any two tiles
carrying a dot at the same point carry the *same* edge, and by L0 an edge
belongs to at most two tiles. Each tile's chosen matching is a *perfect*
matching of its dots, so each tile contributes exactly one chord-end per dot.
Hence welded degree is 2 in the interior and 1 on the boundary, never more. ∎

Structural, so it holds at every level and in the infinite tiling, conditional
on L0. It is why every arc ends on the patch boundary rather than stopping
inside — and it gives a free corollary used throughout: once degree ≤ 2 holds,
the number of open arcs is exactly half the number of degree-1 dots, with no
tracing at all. That reads off 1 arc at Psi, 4 at Delta, 5 at Gamma directly.

**A correction about class 0.** An earlier draft of this document justified
excluding class 0 by claiming that three tiles can meet at a class-0 vertex dot,
producing degree-3 junctions. That is **false**, and so is the same claim in
`web/src/core/circuits.ts`'s header comment and DESIGN.md §3.7, which calls that
vertex "the source of degree-3 junctions". Over every selection that admits a
perfect matching at all, in **all four** tile families and with the default
contracts, the maximum welded degree is 2 and the junction count is 0.

The mechanism is real but class 0 does not trigger it: sliding a *class 1–8*
contract onto a tile vertex does produce junctions, of degree up to 4. So the
tracer's junction handling is worth having as a defence against edited
contracts. It is the attribution to class 0 that does not hold.

What is true is narrower. A class-0 seam glues to another class-0 seam with the
minors *reversed*, so the mate's own centre lands on the same point. In the
spectre that seam has two physical edges, so its centre is the vertex between
them; the mate lies across both edges, and the two corners are complementary
sectors filling a whole neighbourhood of that vertex, leaving no room for a
third tile. Multiplicity is exactly 2. In the hexagons the class-0 seam is a
single edge, so its centre is an ordinary edge midpoint and class 0 is not
special at all.

What excluding class 0 actually buys is the *proof above*: it is what makes
every dot an edge midpoint, and the midpoint argument is what turns L1 into a
theorem rather than a per-level check. Since class 0 is otherwise harmless, the
census in §3 must — and does — include it.

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
convex, so (a) is automatic and **L2 is proved in full, for all `k`, for
configuration (A)**, assuming only L0. The Spectre is a concave 14-gon, and one
forced chord — the diagonal joining the dots on physical edges `e2` and `e13` —
cuts across the reflex corner at vertex 1 and leaves its own tile. It occurs in
four leaf types:

| tile | chord | exact excursion |
|---|---|---|
| Theta | `2A—-2A` | passes (2−√3)/4 = 0.0669873 beyond the reflex vertex |
| Xi | `-1A—-2A` | straying piece (2√3−3)/2 = 0.2320508 long |
| Phi | `2A—-2A` | reaching (2√3−3)/8 = 0.0580127 outside the tile |
| Psi | `-1A—-2A` | verdict by exact `Z[√3]` orientation predicates |

So (a) is false for configuration (B) and no single-tile argument can work.
Because the offending chord is Psi's *forced* diagonal, this is not specific to
this combination: it hits every 1278 combination, and the documented flagship
`0100100000` fails harder — six chords stray, one to a depth of 0.408. So
`FASS_1278.md` §4.2's "non-crossing at higher levels follows from
self-similarity" has no localisation behind it either.

Condition (b) is free, and an earlier draft of this document had the reason
backwards. `web/src/core/matchings.ts` says the **geometric** rule is the more
permissive one, and that is what holds: topological ⊆ geometric for every leaf
type of both configurations. So every matching a combo digit can select is
already geometrically non-crossing, and the encoding can never express a
crossing pair. The single strict inclusion is spectre Gamma1 under 1278
(topological 2 options ⊂ geometric 3) — a genuinely non-crossing pairing the
encoding cannot reach, which is the harmless direction.

**The repair keeps the check finite.** A crossing is a *local* event, so it is
enough to check every *relative placement* of two tiles that occurs anywhere.
[`02-self-avoidance.ts`](../web/fass-proof/02-self-avoidance.ts) enumerates
classes `(typeA, typeB, T_A⁻¹∘T_B)` exactly and every one passes — the two
tiles' chords meet only in common endpoints:

| family | level 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| `hex` two-tile classes | — | — | — | 272 | 272 | **272** |
| `spectre` two-tile classes | 93 | 309 | 470 | 478 | 478 | **478** |

The set is complete from level 4 and unchanged through level 6, on patches up to
272,791 tiles. What carries a finite check to every level is isometry closure:
every leaf-instance transform, at every level, is `z ↦ dᵏ·conj^m(z) + t`, so at
most 24 distinct linear parts occur in total and any incidence fact proved once
per type — or once per two-type placement class — transfers verbatim everywhere.

The same saturation shows at corona granularity
([`11-local-complexity.ts`](../web/fass-proof/11-local-complexity.ts)), which
enumerates a tile together with every tile meeting it, up to the 24 lattice
isometries:

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
neither is exact at any finite level. Exactly: the eight child transforms are
*distinct* at every one of levels 1 to 6, in both families, and so are the
supertile quads. What **is** level-independent is only the rotation-and-mirror
part of each slot, which is `6,1 | 4,1 | 4,1 | 2,1 | 0,1 | 0,1 | 10,1 | 2,1` at
every level and identical for hexagons and the spectre. So the salvageable
content of the `FASS_1278.md` claim is that each child sits in its parent at a
level-independent *orientation*; only the translations move. That is not enough
to pin the gluing. The underlying reason
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

Define the state of a supertile type at level `k` as the pairing its internal
arcs induce on its canonically-labelled boundary dots, together with the number
of circuits strictly inside. The labelling anchors the outline at the
supertile's `quad[0]` and orients it so `quad[1]` precedes `quad[3]` —
chirality-stable, which is essential because consecutive levels are mirror
images.

The state space is finite and that is what makes a cycle search a proof rather
than a table: the matching component of the 9-tuple lives in a set of size
`945 · 105 · 15 · 15 · 3 · 3 · 945 · 3 · 1 = 5.6964 × 10¹¹`. Given L3, the
substitution induces one **fixed** combinatorial operator `F` on that 9-tuple,
and its orbit from the exact level-1 state is a **2-cycle entered with
pre-period 0** for both conjectured configurations. The flagship has pre-period
1, its transient confined to Gamma and Sigma. (`FASS_1278.md` §4.4 reports
stabilisation at `k₀ = 3`; for the boundary-pairing state that is not tight.)

Three things are unconditional, needing no part of L3:

* Arcs are a perfect matching of the boundary dots, so `arcs(T,k) = |∂(T,k)|/2`.
  Since Psi is the only type with two boundary dots, **Psi is the only root that
  is ever a single arc** — Gamma always has 5, Delta 4, Theta and Lambda 3,
  Sigma 5, and Xi, Pi and Phi 2, at every level.
* A supertile with two boundary dots, no circuits and no interior arc endpoint
  *is* one arc joining those dots. There is no alternative.
* Zero circuits at level `k` implies the arcs visit every tile, because every
  leaf type carries at least one chord and every chord lies in some component.

Given L3, the following then hold at *every* level: zero circuits for every
type; the Psi supertile is a single arc through every one of its tiles; and the
Delta pairing alternates with period 2 between `0-7 1-6 2-3 4-5` and
`0-1 2-7 3-4 5-6`.

**A negative result that matters.** `F` never *decreases* the circuit count:
`circuits(F(s))` is the sum of the children's circuits plus whatever the gluing
newly closes. So circuit-freeness can only be inherited, never created. The
routing cycle is correspondingly **not an attractor** — of 2000 random 9-tuples
iterated 40 times, none reached the true cycle and most retained circuits. The
README's intuition that substituting "maintains all the paths" is therefore not
by itself an argument for circuit-freeness at every level. Circuit-freeness is a
property of the exact level-1 base state, which has to be computed, and the
all-levels conclusion rests on that base state *together with* L3.

### 4.5 L5 — the infinite limit

A finite patch necessarily has endpoints, so "infinite curve" is a statement
about a nested sequence. Nesting works by re-anchoring: `E₁ = id` and
`E_{k+1} = E_k ∘ Ts_{k+1}[slot]⁻¹`, so the level-`k` child stays put while the
parent grows around it. All transforms are exact, so containment is an integer
statement. Three things have to hold.

1. **Nesting.** The level-`k` arcs must sit inside the level-`(k+1)` arcs.
2. **Exhaustion.** The inradius about the seed must diverge, or the union covers
   only a sector.
3. **One curve.** The patch's arcs must all end up in a single arc higher up, or
   the limit is several curves.

**The Psi nesting gives 1 and not 2.** `SUPER_RULES.Psi` contains Psi at slots
0, 2 and 5. At all three, in both families, the level-`k` arc sits inside the
level-`(k+1)` arc as a *contiguous* sub-path — forced, not lucky, because the
Psi interface is exactly two dots, so a strand entering the child must traverse
all of it before leaving. Both ends grow without bound, so it is genuinely
bi-infinite: at spectre slot 2 the segments before the child run 41, 176, 2646,
10994 and those after run 40, 463, 2385, 28615. But the inradius about the seed
is *exactly constant* — 1.409 for hexagons, 3.527 for the spectre — so the seed
abuts the patch boundary forever and that union fills a sector, not the plane.

**The Delta nesting gives all three.** Delta contains Delta at slot 1. Its
patches are never a single arc: Delta has eight boundary dots, hence four arcs
at every level. But those four are *boundary cuts, not components*
([`14-merge.ts`](../web/fass-proof/14-merge.ts), exact segment containment):

| step | child arcs | distinct parent arcs they land in |
|---|---|---|
| 1 → 2 | 4 | 2 |
| 2 → 3 | 4 | **1** |
| 3 → 4 | 4 | 2 |
| 4 → 5 | 4 | **1** |
| 5 → 6 | 4 | 2 |

Over *any two consecutive levels* everything a patch holds lands in one arc.
Checked directly rather than inferred: a level-`k` patch lands in exactly
**one** arc of the level-`(k+2)` patch, at every step computed, in both
families. And this nesting does exhaust the plane — the inradius about the seed diverges at a
rate approaching the linear inflation 2.8059:

| level | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| `hex` inradius | 1.41 | 1.41 | 4.68 | 12.02 | 35.10 | 96.91 |
| `spectre` inradius | 3.53 | 3.53 | 8.68 | 22.84 | 66.86 | 183.60 |

So **the nested union is an infinite tiling of the whole plane carrying exactly
one bi-infinite curve**, which is the statement the conjecture actually needs.
This vindicates the merge analysis in `FASS_1278.md` §4.5, which had the right
idea: the four tails of a Delta patch are four windows onto the same line.

For contrast, the greedy address `Theta#0 → Gamma#3 → Gamma#7 → …` found by
maximising the inradius also exhausts the plane, but its arcs settle at three
and do not merge — not over one level, and not over two either. So exhaustion
alone is not enough; the nesting has to be chosen so the merge happens too.

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
| Every patch is edge-to-edge; every patch vertex is in `Z[ζ₁₂]` | **proved, all levels** (unit steps; ring closure) |
| Both families tile (disjoint interiors, no gaps) | **proved** by winding number at levels 3–6, roots Delta/Psi/Gamma; cited for spectre; **nothing cited for hex** |
| Welded degree ≤ 2; components are paths and cycles | **proved, all levels**, given L0 (§4.1) |
| Arcs end only on the patch boundary; arc count = half the degree-1 dots | **proved, all levels** (corollary of L1) |
| No selection produces a junction, class 0 included | verified over all 511 selections, level 4 |
| Every matching the encoding can select is geometrically non-crossing | **proved, all levels** (finite per type + isometry closure) |
| Chords stay inside their own tile | **true for hex; FALSE for spectre** — 4 chords stray by (2−√3)/4 |
| No crossings anywhere | **proved for hex, all levels**; for spectre reduced to 478 two-tile classes, complete from level 4, unchanged to level 6 |
| Every leaf-instance transform is an isometry of the lattice | **proved, all levels** (≤ 24 linear parts in total) |
| Boundary dot interfaces constant per type | verified levels 1–6, both families |
| Arcs are a perfect matching of the boundary dots; Psi is the only single-arc root | **proved, all levels** |
| Routing states lie on a 2-cycle, pre-period 0 | verified levels 1–6, both families |
| The routing operator never decreases the circuit count | **proved** — so circuit-freeness is never created by the substitution |
| The two configurations are the same routing automaton | verified byte-identical, all nine types |
| Zero circuits, every type, every level | verified levels 1–6; **all levels given L3**, and no argument for it exists independent of L3 |
| Psi supertile is a single arc | verified levels 1–6; **all levels given L3**, and forced by the interface invariant |
| Every tile visited | verified levels 1–5; **all levels given L3** |
| The gluing and outer maps are level-independent | **OPEN — this is L3** |
| Finite local complexity (no new two-tile class ever appears) | **OPEN** — this is what would make L2 unconditional for the spectre |
| Psi-in-Psi nesting gives a bi-infinite curve | verified levels 1–5, all three slots |
| That nesting exhausts the plane | **refuted** — inradius is exactly constant |
| Delta-in-Delta nesting exhausts the plane | verified levels 1–6, inradius diverges at ≈2.81 per level |
| Its four arcs all merge into one, two levels up | verified levels 1–6, exact segment containment |
| The whole-plane tiling carries exactly ONE bi-infinite curve | **established**, given L3 |
| Growth factor 4+√15, frequencies, segments per tile | **proved** (exact, from the substitution matrix) |
| hex and spectre strand graphs isomorphic | verified structurally and on patches |
| The eight single-line configurations are the only ones | **proved** by exhaustive census over all selections |

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
| `00-census.ts` | the complete classification of §3, class 0 included |
| `01-local-structure.ts` | L0 by winding number; L1; the class-0 refutation |
| `02-self-avoidance.ts` | the straying chords, exactly; the 272/478 two-tile classes |
| `04-routing-automaton.ts` | the routing operator, its 2-cycle, and the non-attractor result |
| `14-merge.ts` | the Delta nesting merges to one curve and exhausts the plane |
| `08-supertile-outline.ts` | all non-Gamma outlines identical; perimeter grows 4.22 per level; boundaries fractal |
| `09-interface-invariant.ts` | boundary dot counts constant; arcs a perfect matching; no circuits |
| `10-routing-states.ts` | canonical routing states; period 2 with pre-period 1 |
| `11-local-complexity.ts` | coronas saturate at 38 (hex) and 42 (spectre) |
| `12-limit-constants.ts` | substitution matrix; 4+√15; closed-form frequencies and segments per tile |
| `13-nesting-limit.ts` | nesting, two-sided growth, and the exhaustion refutation |
| `render.ts` | SVG of a configuration's curve on a patch |

---

## 8. Open questions

1. **L3 itself** (§6) — the main gap. Everything topological rests on it.
2. **Finite local complexity.** Prove the set of two-tile relative-placement
   classes is closed under one substitution step. That single step turns L2 into
   an unconditional all-levels theorem for the spectre. The difficulty is the
   same one that blocks L3: the child transforms depend on the level, so the
   relative placement of two child *patches* is level-dependent even though the
   relative placement of individual *tiles* is observed to stabilise. A proof
   needs the edge-matching rules, not a conjugacy.
3. **L0 for the hexagon family.** Nothing is cited for it — only the exact
   winding-number verification at levels 3–6. Deriving it from the label tables,
   or showing the two families' tables isomorphic, would settle it.
4. **`|∂(Psi,k)| = 2` directly.** A direct proof would collapse most of L3 for
   the single-line property (Route 3 in §6). Everything about the single Psi arc
   fails if the interface size can change at some deep level.
5. **Circuit-freeness independent of L3.** There is currently no such argument,
   and no fixed-point or attractor argument can supply one, because the routing
   operator is monotone non-decreasing in circuits.
6. **Other exhausting addresses.** The Delta nesting settles the conjecture, but
   the greedy Gamma address also exhausts the plane and its arcs settle at three
   without merging within six levels. Classify which addresses in the hull give
   one curve and which give several.
7. **The other three combinations.** Each family's quartet has the same Psi-root
   single-line property. Are the four limit curves the same curve up to mirror,
   or genuinely different FASS curves?
8. **Why 4.22?** The boundary growth factor is measured, not derived. It should
   be the Perron eigenvalue of a boundary substitution matrix; finding that
   matrix would also feed Route 2.
9. **A structural reason two unit edges never cross at a non-lattice point.**
   The ambient ring permits it — there is an explicit witness — so the
   "residual boundary is a Jordan curve" step of L0 is currently a per-level
   check rather than a corollary.
10. **The hexagon realisation's geometry.** The topological half transfers from
   the spectre, but the hexagon tiling is a different metric object. Its
   space-filling limit deserves its own statement.
