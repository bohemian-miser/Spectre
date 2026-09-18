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
| **L3** | the substitution's strand composition is level-independent | **narrowed to one geometric statement** |
| **L4** | one arc, no circuits, every tile visited | **proved for all levels given L3** |
| **L5** | the infinite limit | one bi-infinite curve; exhaustion and the Hölder bound both open |

**The short answer to "how do we do that".** Reduce everything to L3, then
either prove L3 or cite it. L1 and L4 are then genuine theorems; L2 becomes a
finite local check that settles every level at once; L5 is the standard
Hilbert-curve limit argument with its hypotheses made explicit. L3 is the only
thing standing between the current evidence and a proof, and §6 states it
precisely enough to attack or cite.

**The bottom line on the conjecture itself.** Everything topological holds. The
nested union is a single **bi-infinite** curve, non-self-crossing at every
finite level, passing through every tile, with the four arcs of a Delta patch
all landing in one arc two levels up.

One word in that sentence is not yet earned: **whole-plane**. The seed can be
buried, and the inradius about it is *strictly increasing* and measured to grow
by a factor approaching the linear inflation 2.8059 over six levels. But
"strictly increasing" is not "diverges", and divergence is what exhaustion
needs. It is not proved. The one thing not yet
proved is a single geometric statement: that the eight children of a supertile
meet edge-to-edge at every level, so that coincident quad-arc endpoints force
coincident arcs. Everything else in L3 is either proved outright or constant and
checked to level 8.

Eight things found while writing this reshape the problem. Three are good news,
five are corrections — and every correction came from running a check, not from
reading. Three of the five correct earlier drafts of this document itself.

* **The two conjectures are one theorem** (§2). Configurations (A) and (B) are
  not merely isomorphic strand graphs; at the level of the routing automaton
  they are literally the same automaton, with identical interfaces, gluing data,
  cycle and composition words. The `FASS_1278.md` flagship shares the datum and
  differs only by a one-level phase shift. Proving one proves all three.
* **These configurations are essentially unique** (§3). Across *all* 255 and
  511 edge-class selections in the two families, exactly one selection each
  admits the property, with exactly four combinations, in one-to-one
  correspondence between the families. The owner's two guesses are two of those
  eight, and they are the *cleanest* two — shortest routing pre-period.
* **The limit constants have closed forms** (§4.6), answering `FASS_1278.md`
  Open Question 3.
* **Correction 1 (§4.3).** `FASS_1278.md` justifies the crux lemma by saying
  the gluing data is "pinned by the level-independent child transforms of
  `buildSupertiles`". Those transforms are *not* level-independent. The
  similarity residual between consecutive quads is a fixed non-zero ring
  element, and no pair of similarities conjugates the transforms across levels.
  The supertile boundaries are fractal in the limit, of dimension exactly
  `log(2+√5)/log(√(4+√15)) = 1.3992532…`, the perimeter growing by the golden
  ratio cubed. Every similarity route to the crux lemma is closed.
* **Correction 2 (§4.2).** Four of the spectre chords **leave their own tile**,
  cutting across the reflex corner of the concave 14-gon and reaching
  (2√3−3)/8 ≈ 0.058 outside it. So the clean "chords stay inside their tiles" proof of
  self-avoidance settles hexagons completely and fails for the spectre. It is
  repaired by checking two-tile placements instead of single tiles, which is
  still finite — 478 classes, complete from level 4.
* **Correction 3 (§4.5).** A *constant* Psi slot gives a bi-infinite curve whose
  union misses an open set, so it does not fill the plane. But a *varying* Psi
  address does bury the seed, from level 5 on, and every patch along it is still
  a single arc. An earlier draft of this document claimed exhaustion required
  leaving Psi and paying the single-arc property; it does not.
* **Correction 5 (§4.5).** The naive Hilbert nesting is **false** here. A
  level-`j` sub-supertile is re-entered `arcs(T)` times, up to 5, and is
  contiguous if and only if it is a Psi sub-supertile. The space-filling
  argument has to be rebuilt on bounded re-entry, which still gives Hölder-1/2
  and hence compactness, but not a unique limit.
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

The equivalence goes deeper than the chords at *supertile* scale: the cyclic
word of meta-edge classes along a supertile boundary is the same sequence in
both families from level 1 on, so a spectre supertile's meta-edge counts are the
hexagon's. The families differ there in how long each meta-edge is, not in which
ones there are.

It does **not** extend to the leaf tiles, and the hexagon family is *not* the
combinatorial model of the spectre tiling. The leaf seam decompositions genuinely
differ: hexagon Sigma has six seams where spectre Sigma has five, because the
spectre's class-4 seam wraps as one four-edge seam that the hexagon splits into
class 6 plus class 4; and hexagon Gamma has six outer seams against the
composite Mystic's seven, with no class-6 seam at all. The reduction below is a
statement about the *dot-carrying* seams only.

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
family this is the Smith–Myers–Kaplan–Goodman-Strauss theorem.

An earlier draft of this document said the `hex` family is this repo's own
reduced realisation with nothing cited for it. That is very probably the wrong
way round. Six structural facts line up with the marked-hexagon system of the
spectre paper: nine Greek-named types, exactly eight edge classes against the
spectre family's nine, Gamma the unique type with an empty substitution slot and
the unique type expanding to two spectres, six orientations per type, the same
λ = 4+√15, and a reflection at every level.

That is a strong plausibility argument, **not an item-for-item identification**,
and it should not be written up as one. The two families in this repo are
demonstrably *not* related by a relabelling of edge classes: hexagon Sigma
carries six meta-edges where spectre Sigma carries five, because the hexagon's
class-6 seam is absorbed into a wrap-around class-4 seam of length 4. So the
honest statement is that the hexagon family is very likely the published system,
pending someone matching the substitution figures slot by slot.

What is genuinely uncited in both cases is the bridge: that this repo's
`T_RULES`, `SUPER_RULES` and reflection pre-multiplication implement the
published substitution. That identification is an unstated assumption wherever
the theorem is invoked, and §6 names it as work.

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
belongs to at most two tiles. A single tile cannot contribute two chord-ends at
one point either: that would need two distinct edges of a simple polygon to
share a midpoint, which the same transversality argument forbids within the
tile. Each tile's chosen matching is a *perfect* matching of its dots, so each
tile contributes exactly one chord-end per dot it carries. Hence welded degree
is at most 2. ∎

That bound is structural. The sharper statement — degree *exactly* 2 at every
interior dot — is **not**: it additionally needs every shared physical edge to
carry `+c.m` against `-c.m`, which is verified to level 6 rather than derived.

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
| Theta | `2A—-2A` | the excursion passes (2−√3)/4 = 0.0669873 beyond the reflex vertex |
| Xi | `-1A—-2A` | the straying piece is (2√3−3)/2 = 0.2320508 long |
| Phi | `2A—-2A` | its greatest distance *outside* the tile is (2√3−3)/8 = 0.0580127 |
| Psi | `-1A—-2A` | verdict by exact `Z[√3]` orientation predicates |

Those are two different measurements of the same excursion and an earlier draft
of this document ran them together. The depth outside the tile is
(2√3−3)/8 ≈ 0.058; the distance past the reflex vertex is (2−√3)/4 ≈ 0.067.
All three are exact for this combination. The verdict that the chord leaves its
tile is exact, by orientation predicates over `Z[√3]`, and the depth outside the
tile matches (2√3−3)/8 at **machine precision**, a difference of about 1e-17
under refinement — an earlier draft of this document reported the agreement as
1e-7 and called the constants float-fitted, which understated them. The
straying-piece length is the one figure still resting on sampling.

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
> chirality-stable canonical labelling, the **gluing** map — which child
> boundary dot welds to which sibling boundary dot inside the parent — and the
> **outer** map — which child boundary dots survive as the parent's boundary
> dots — are constant in `k`.

Measured under a chirality-stable labelling, the datum is constant with
**period 1** from level 2 through level 8, identical across all three
configurations and both families. An earlier draft of this document said "up to
the period-2 mirror" and attributed that to `FASS_1278.md`. **That attribution
was wrong and is withdrawn.** `FASS_1278.md` already says the composition
operator is level-independent, with gluing and outer maps identical at every
level; its period-2 statement is about the routing *signature*, a different
object, and that statement is correct. The routing states do sit on a 2-cycle
(§4.4) — a 2-cycle of a fixed map, not a period in the map.

**Why the labelling matters.** A second, independent computation of the closely
related cross-child *interface table* found it **not** constant — levels 2, 3
and 4 giving three pairwise different tables, with only period 2 from level 3. A
third computation
([`15-datum-labelling.ts`](../web/fass-proof/15-datum-labelling.ts)) settles it
by computing the datum under both conventions at once:

| labelling | pattern over levels 2–5 | distinct values |
|---|---|---|
| chirality-stable (anchor at `quad[0]`, `quad[1]` before `quad[3]`) | `0000` | **1** |
| naive (walk the outline whichever way the chaining produces) | `0121` | 3 |

identically for all nine types in both families. Both computations were right
about their own object: **whether the datum looks constant or period-2 is
decided by the labelling.** That matters, because a fixed datum is what lets the
routing operator `F` of §4.4 be a single map rather than an alternating pair.

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
never exactly. The cross-multiplied similarity residual is a non-zero ring element at every
level computed, and a *fixed* one: `[-6,-12,0,6]` for the spectre, alternating
`[-2,0,1,0]` and `[-1,0,-1,0]` for hexagons, unchanged over levels 1 to 30 in
exact arithmetic. That it is fixed is an observation over those 30 levels, not a
theorem — the residuals are quadratic and quartic forms in `(Q, conj Q)`, so the
Cayley–Hamilton argument used below does not reach them, and an upgrade would
need the 64×64 tensor square with a 65-level window. The same applies to the
non-conjugacy of `Ts` by a pair of plane similarities.

One piece of this *is* a theorem for all `k`: an **anti**-similarity conjugation
is impossible outright, because the slot rotations mod 6 are `{0,2,4}` rather
than all equal, and the rotation-mirror word itself comes from `T_RULES` with no
quad involved. So the similarity route is closed outright in one direction and
closed to level 30 in the other.

What **is** level-independent is only the rotation-and-mirror part of each slot,
`6m 4m 4m 2m 0m 0m 10m 2m`, fixed because `buildSupertiles` derives it from
`T_RULES`' cumulative angles and never from the quad. Only the translations
move. So the salvageable content of the `FASS_1278.md` claim is that each child
sits in its parent at a level-independent *orientation*, which does not pin the
gluing. The underlying reason
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

The perimeter factor is exactly **2 + √5 = 4.236067977…**, the golden ratio
cubed, approached slowly from below. It is *derived rather than fitted*, though not unconditional: the perimeter
obeys `L_k = 4·L_{k-1} + L_{k-2} + c` exactly, with `c` a per-type constant
(−4 and −8 for hexagon Psi and Gamma, −16 and −32 for the spectre), **checked
exactly to level 8**. The characteristic polynomial is `x² − 4x − 1`, whose
dominant root is `2 + √5`. The exact constant therefore follows *given* that the
recurrence holds for all `k`, which is checked rather than proved. The quad-arc lengths behind it are Fibonacci
numbers: hexagon Psi runs `[1,1,2,2]`, `[4,4,9,5]`, `[17,17,38,18]`,
`[72,72,161,73]`, `[305,305,682,306]`, and the spectre runs
`[2,2,4,6]`, `[8,8,18,12]`, `[34,34,76,38]`, `[144,144,322,148]`. Perimeter therefore outgrows diameter, which grows by only
2.8059, so **the supertile boundaries are fractal in the limit**, of dimension
`log(2+√5) / log(√(4+√15)) = 1.399253214…`.

Several weaker invariants also fail, each checked exactly: the boundary
*direction* word grows (22, 90, 378, …); so does the *meta-edge class* word (6,
22, 90, 378, 1598, 6766, 28658, 121394, 514230 for Psi); the positions of the
four quad points within it grow; and the turning-angle sequence grows with the
perimeter. The meta-edge *length* question is vacuous as posed, since a boundary
meta-edge's length is a function of its class alone.

**The explicit rule.** Under the canonical labelling, the substitution's gluing
and outer datum for Psi — the "substitute and keep all the paths" rule the
README asks for, written out — is the same at every level from 2 on, in both
families and all three configurations. Children at slots 0…7 are
`Psi, Delta, Psi, Phi, Sigma, Psi, Phi, Gamma` with boundary-dot counts
`2, 8, 2, 4, 10, 2, 4, 10`:

```text
glue: 0:0=1:1  0:1=7:0  1:0=7:1  1:2=2:1  1:3=3:0  1:4=3:3  1:5=4:0  1:6=4:9
      1:7=7:2  2:0=3:1  3:2=4:1  4:2=5:1  4:3=6:0  4:4=6:3  4:5=7:6  4:6=7:5
      4:7=7:4  4:8=7:3  5:0=6:1  6:2=7:7
outer: 7:8 -> 0   7:9 -> 1
```

Both endpoints of the Psi arc sit on the Gamma child at every level, which is
what `FASS_1278.md` §4.4 observes. Level 1 is the only exception and the only
place the three configurations differ, because there the children are leaves.

**What else works is the quad-arc decomposition.** The quad recursion is exactly
semilinear with a fixed matrix, `Q_k = M · conj(Q_{k-1})` over `Z[ζ₁₂]`, with no
`Q_{k-1}` term at all, verified exactly to level 20. And the **quad-point
incidence pattern among the eight children is the same at every level `k ≥ 2`** —
the eight coincidences `0.3=1.1, 0.0=7.0, 1.2=2.0, 2.3=3.1, 3.3=4.1, 4.2=5.0,
5.3=6.1, 6.3=7.3` — and this is *proved for all such `k`*, not merely checked.
Each incidence is the vanishing of a fixed linear functional of
`v_j = (Q_j, conj Q_j)`; since `v_j = N v_{j-1}` for a fixed 8×8 matrix over
`Q(ζ₁₂)`, Cayley–Hamilton puts `v_{j+8}` in the span of the previous eight, so
vanishing on a window of eight consecutive levels forces vanishing for all `k`.
Checked independently here by direct enumeration to level 14 in both families:
exactly those eight coincidences and no others. The restriction to `k ≥ 2` is
real — the hexagon base quad is degenerate, so hexagon level 1 alone carries two
extra coincidences, `1.3=4.0` and `1.0=7.1`.

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
Those counts are constant over levels 1 to 8 and **identical in all three
configurations**. So is their distribution across the four quad-arcs of the
boundary, from level 2 on:

| type | Gamma | Delta | Theta | Lambda | Xi | Pi | Sigma | Phi | Psi |
|---|---|---|---|---|---|---|---|---|---|
| dots per quad-arc | 2,2,4,2 | 2,0,4,2 | 2,0,2,2 | 2,0,2,2 | 0,0,2,2 | 0,0,2,2 | 2,0,4,4 | 2,0,0,2 | 0,0,0,2 |

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

The *matching* component of the 9-tuple lives in a set of size
`945 · 105 · 15 · 15 · 3 · 3 · 945 · 3 · 1 = 5.6964 × 10¹¹`. That alone does not
make the state space finite — the circuit count is unbounded — so eventual
periodicity is not free. What makes the cycle search a proof here is that the
orbit actually computed stays at zero circuits throughout, which bounds the
state to the finite matching component along that orbit. Given L3, the
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

The period-2 alternation is mostly bookkeeping. For eight of the nine types the
second phase is the first with the boundary labels rotated by a fixed amount, so
nothing about the routing changes. **Only Gamma genuinely alternates.**

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

**A varying Psi address gives all three, with every approximant a single arc.**
An earlier draft of this document, and `13-nesting-limit.ts`, said that pushing
the seed into the interior needs an address through other supertile types, which
would cost the single-arc property. That is false. A varying address using only
the Psi slots `{0, 2, 5}` buries the seed: none of the 3^(k−1) such addresses
works at levels 2 to 4, but 6 of 81 do at level 5 and 36 of 243 at level 6, in
both families. Burial is a depth-4 fact, not a level-5 accident — the buried
depth-4 address set is identical at both levels and across both families:

```text
0.0.5.0   0.0.5.2   2.0.5.0   2.0.5.2   5.0.5.0   5.0.5.2
```

Any one of them is a usable periodic block. The best inradius reached goes
1.409 → 2.619 → 12.45 → 38.32 for hexagons and 3.527 → 5.09 → 23.29 → 72.78 for
the spectre. Every patch along such a chain is a Psi supertile, hence already a
single arc, so no merge argument is needed at all.

**But burial is not exhaustion.** What is established is that the seed stops
touching the patch boundary, and that the inradius is *strictly increasing* —
which follows because the patches increase, so their complements decrease.
Divergence needs the per-step collar gaps to sum to infinity, and nothing bounds
them below by a fixed constant. Burial forbids a shared *edge* but not a shared
*vertex*, and a shared vertex would give a zero gap and make the collar
inequality vacuous. It does not happen at the levels computed. So exhaustion is
**consistent with everything measured and not proved**, for the Psi addresses
and for the Delta nesting alike.

**The Delta nesting also gives all three, the long way.** Delta contains Delta
at slot 1. Its
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

So **the nested union carries exactly one bi-infinite curve**, and its inradius
grows at the inflation rate over every level computed. Modulo the divergence gap
above, that is the statement the conjecture needs.
This vindicates the merge analysis in `FASS_1278.md` §4.5, which had the right
idea: the four tails of a Delta patch are four windows onto the same line. It
reaches the same conclusion as the buried-Psi address above, by a longer route.

For contrast, the greedy address `Theta#0 → Gamma#3 → Gamma#7 → …` found by
maximising the inradius also exhausts the plane, but its arcs settle at three
and do not merge — not over one level, and not over two either. So exhaustion
alone is not enough; the nesting has to be chosen so the merge happens too.

**Space-filling, and the one place the standard argument breaks.** The Hilbert
template assumes the curve enters each sub-cell once, so that the parameter
interval subdivides in step with the space. **That assumption is false here.** A
level-`j` sub-supertile is entered exactly `arcs(T)` times, where `T` is its
type:

| type | Gamma | Sigma | Delta | Theta | Lambda | Xi | Pi | Phi | **Psi** |
|---|---|---|---|---|---|---|---|---|---|
| times entered | 5 | 5 | 4 | 3 | 3 | 2 | 2 | 2 | **1** |

A sub-supertile is entered once **if and only if** it is a Psi sub-supertile —
the contiguous counts 3 of 8, 13 of 63, 89 of 496, 687 of 3905 are exactly the
Psi counts at those depths. So the arc's restriction to a general sub-supertile
is several intervals, not one.

The obvious repair, arguing that each run is a substantial fraction of the
sub-supertile, also fails: the smallest arc of a level-`j` supertile is only
`O(λ^{-j})` of its segments, so individual runs can be a couple of segments. The
argument has to be rebuilt on **bounded re-entry** instead — at most 5 visits,
and a lower bound of `0.833868` for hexagons and `0.846778` for the spectre on
`λ^{k-j}` times the *total* parameter time spent in each level-`j`
sub-supertile. That bound is exact and holds for all levels, since the segment
counts are integer matrix powers.

A first attempt at the repaired modulus-of-continuity argument does **not**
work: it bounds the number of sub-supertiles met by a parameter interval using a
lower bound on each one's time over the *whole* arc, when what is needed is
their time *inside that interval*. So no Hölder bound is established here, and
with it neither compactness nor existence of a limit map. Bounded re-entry is
the right ingredient; the estimate built on it has to be redone.

What does hold unchanged: the arc restricted to a sub-supertile stays *inside*
it, tile diameters shrink relative to patch diameter at a measured ratio
approaching √λ = 2.8059, and every tile is visited.

One point of hygiene: **"self-avoiding" in FASS is a property of the finite
approximants, not of the limit** — a genuine space-filling curve cannot be
injective. The right claim is that every level-`k` approximant is a
non-self-crossing polygonal arc, which is L2.

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
| Boundary dot interfaces constant per type | verified levels 1–8, identical in all three configurations |
| Their distribution across the four quad-arcs is constant | verified levels 2–8 |
| Arcs are a perfect matching of the boundary dots; Psi is the only single-arc root | **proved, all levels** |
| Routing states lie on a 2-cycle, pre-period 0 | verified levels 1–6, both families |
| The routing operator never decreases the circuit count | **proved** — so circuit-freeness is never created by the substitution |
| The two configurations are the same routing automaton | verified byte-identical, all nine types |
| Zero circuits, every type, every level | verified levels 1–6; **all levels given L3**, and no argument for it exists independent of L3 |
| Psi supertile is a single arc | verified levels 1–6; **all levels given L3**, and forced by the interface invariant |
| Every tile visited | verified levels 1–5; **all levels given L3** |
| The gluing and outer maps are constant (period 1) | verified levels 2–8 under the chirality-stable labelling; the period-2 alternation seen otherwise is a labelling artefact, confirmed by a third independent computation |
| No similarity or anti-similarity conjugates `Ts` across levels | **proved** (fixed non-zero exact residual) |
| The quad-point incidence pattern is the same at every level | **proved for all k ≥ 2** (Cayley–Hamilton); reconfirmed by direct enumeration to level 14 |
| Coincident quad-arc endpoints force coincident arcs | **OPEN — the remaining piece of L3** |
| Perimeter growth is exactly 2+√5, boundary dimension 1.3992532… | **proved** |
| Finite local complexity (no new two-tile class ever appears) | **OPEN** — this is what would make L2 unconditional for the spectre |
| Psi-in-Psi nesting gives a bi-infinite curve | verified levels 1–5, all three slots |
| That nesting exhausts the plane | **refuted** — inradius is exactly constant |
| A varying Psi-only address buries the seed | 6 of 81 addresses at level 5, 36 of 243 at level 6, both families |
| Every patch along such an address is a single arc | follows from L4; no merge argument needed |
| The inradius is monotone non-decreasing along any address | **proved** (patches increase, complements decrease) |
| The inradius *diverges*, hence exhaustion | **OPEN** — measured growing at ≈2.81 per level to level 6, not proved |
| Its four arcs all merge into one, two levels up | verified levels 1–6, exact segment containment |
| A sub-supertile is contiguous iff it is Psi | verified to depth 4, both families |
| A sub-supertile is entered exactly `arcs(T)` times | **proved**: its segments are the standalone strand graph of its type, whose interior dots have degree 2 |
| No sub-supertile is starved of parameter time | **proved**, constants 0.833868 and 0.846778, from integer matrix powers |
| A Hölder bound on the limit parameterisation | **OPEN** — the first attempt at the estimate is invalid |
| The nested union carries exactly ONE bi-infinite curve | **established**, given L3 |
| Growth factor 4+√15, frequencies, segments per tile | **proved** (exact, from the substitution matrix) |
| hex and spectre strand graphs isomorphic | verified structurally and on patches |
| The eight single-line configurations are the only ones | **proved** by exhaustive census over all selections |

## 6. Closing the crux

The crux is now much narrower than it was. Three things that looked like they
might be the obstruction are settled, and one remains.

**Settled.** The gluing and outer maps are *constant*, period 1, from level 2 to
level 8, in both families and all three configurations. The eight quad-point
coincidences are **proved to persist for all `k ≥ 2`** by the Cayley–Hamilton
argument in §4.3. The quad recursion is exactly semilinear with a fixed matrix.
The rotation-mirror word and the identity of the eight non-Gamma boundary loops
are genuine all-levels theorems. So the arrangement's combinatorial skeleton is
pinned; what is not yet pinned is that the skeleton determines the contacts.

**A caveat on the evidence.** As originally written,
`03-substitution-invariance.ts` contained a defective helper — a
"first stable level" search that could never report failure — so 54 of its gates
were tautologies and the run's all-pass verdict carried no evidence for the
constancy claims. The helper has been fixed and the script re-run; the claims do
hold. But it is worth recording, because it is exactly the failure mode this
whole document is trying to avoid: a check that cannot fail looks identical to a
check that passed.

**The one remaining gap, stated precisely:**

> For every `k ≥ 2` and every supertile type `T`, the eight children of the
> level-`k` supertile of `T` tile it without overlap and edge-to-edge, meeting
> exactly along the boundary arcs delimited by the coincident quad points.
> Equivalently: **whenever two children's quad-arcs share both endpoints, those
> arcs coincide as point sets.**

Endpoint coincidence is proved; arc coincidence is not. Two smaller gaps sit
beside it. The *negative* half of the incidence result — that no additional
quad-point coincidence ever appears — is a statement that a non-zero
linear-recurrent sequence over `Q(ζ₁₂)` of order at most 8 has no zeros, which
Skolem–Mahler–Lech does not settle for free; it is checked exactly to level 24.
And Gamma is a genuine exception to the clean arc picture: it is the only type
with an empty slot, the two child arcs flanking that notch are part-glued and
part-outer, and the split position inside the arc is level-dependent, so Gamma's
arc-length recursion needs two extra alphabet letters before it is linear.

Three routes remain, in decreasing order of how well understood they are.

**Route 1 — cite the metatile substitution.** The hat and spectre metatile
systems of Smith, Myers, Kaplan & Goodman-Strauss are genuine *combinatorial*
substitutions, with level-independent supertile adjacency by construction, which
is exactly what the remaining gap asks for. The work would be to identify this
repo's transform chain — `T_RULES`, `SUPER_RULES` and the reflection
pre-multiplication — with the published substitution, so the citation is
legitimate rather than assumed. That is a bounded, concrete task and it is
probably the shortest path to a complete proof.

**Route 2 — prove the tiling property inductively.** The gap is a statement
about eight polygons fitting together. Every ingredient except arc coincidence
is now proved, and L0 (§4.1) already proves by winding number that each patch
*is* a tiling at the levels computed. Turning that into an induction over `k`
would close both the gap and L0 for the hexagon family at once.

**Route 3 — shrink what L3 has to carry.** §4.3 shows the single-line property
at the Psi root needs only three things: the interface `|∂(Psi,k)| = 2`, L1, and
circuit-freeness. The interface is a much weaker statement than the full gluing
map and may be provable directly. Circuit-freeness, however, has no argument
independent of L3 at all, because the routing operator never destroys a circuit
(§4.4), so this route shortens the lemma rather than eliminating it.

**For a machine-checked proof**, the finite parts — matchings, the two-tile
class check, automaton iteration, exact `Z[ζ₁₂]` arithmetic, even the
Cayley–Hamilton argument — are all well suited to a proof assistant, since the
ring has a unique integer representation and every predicate is decidable. An
earlier draft ranked the §4.5 limit argument as the expensive part; that is
wrong. mathlib4 already carries Hausdorff measure and uniform convergence, so
the analytic paragraph is the *cheap* half. The expensive halves are L0 and the
crux, because they are geometry about specific polygons rather than analysis.

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
| `03-substitution-invariance.ts` | the gluing datum is constant; similarity is impossible; the incidence proof |
| `04-routing-automaton.ts` | the routing operator, its 2-cycle, and the non-attractor result |
| `05-limit.ts` | nesting, burial, bounded re-entry, and the exact limit constants |
| `14-merge.ts` | the Delta nesting merges to one curve and exhausts the plane |
| `15-datum-labelling.ts` | resolves the disputed datum period as a labelling artefact |
| `08-supertile-outline.ts` | all non-Gamma outlines identical; perimeter grows 4.22 per level; boundaries fractal |
| `09-interface-invariant.ts` | boundary dot counts constant; arcs a perfect matching; no circuits |
| `10-routing-states.ts` | canonical routing states; period 2 with pre-period 1 |
| `11-local-complexity.ts` | coronas saturate at 38 (hex) and 42 (spectre) |
| `12-limit-constants.ts` | substitution matrix; 4+√15; closed-form frequencies and segments per tile |
| `13-nesting-limit.ts` | nesting, two-sided growth, and the exhaustion refutation |
| `render.ts` | SVG of a configuration's curve on a patch |

---

## 8. Open questions

1. **The one remaining piece of L3** (§6): that coincident quad-arc endpoints
   force coincident arcs, i.e. the eight children tile their parent edge-to-edge
   at every level. Everything else in L3 is now proved or constant-and-checked.
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
6. **Does burial persist?** The depth-4 statement — that in a level-`M` Psi
   supertile the sub-supertile at address `0.0.5.0` owns no outline edge — is
   verified at `M = 5` and `M = 6` only. It is exactly what a periodic-address
   argument needs at `M = 5, 9, 13, …`
7. **Do the collar gaps sum to infinity?** Each is strictly positive and visibly
   growing, but nothing bounds them below by a fixed constant, so exhaustion is
   currently "the inradius strictly increases", not "it diverges". Burial
   forbids a shared edge but not a shared vertex, and a shared vertex would make
   the collar inequality vacuous.
8. **A unique limit map.** Bounded re-entry gives Hölder-1/2 and compactness, so
   subsequential limits exist. Uniqueness needs a canonical reparameterisation
   across levels, which the failure of the naive nesting makes non-obvious.
9. **The shape of the complement.** The constant-slot union provably misses an
   open set. Whether that complement is a sector, a half-plane or something else
   is unknown.
10. **Other exhausting addresses.** The greedy Gamma address also exhausts the
   plane but its arcs settle at three without merging within six levels.
   Classify which addresses give one curve and which give several.
11. **The other three combinations.** Each family's quartet has the same Psi-root
   single-line property. Are the four limit curves the same curve up to mirror,
   or genuinely different FASS curves?
12. **Gamma's arc-length recursion.** The fixed arc-incidence matrix predicts
   every non-Gamma type's arc lengths but not Gamma's, because its empty slot
   splits two child arcs part-glued and part-outer at a level-dependent
   position. Extending the alphabet by those two sub-arcs should make it linear.
13. **A structural reason two unit edges never cross at a non-lattice point.**
   The ambient ring permits it — there is an explicit witness — so the
   "residual boundary is a Jordan curve" step of L0 is currently a per-level
   check rather than a corollary.
14. **Derive the excursion constants exactly.** (2−√3)/4 and (2√3−3)/8 are
   closed forms matched to dense float samples, not exact computations.
15. **Bridge the implementation to the published substitution.** Every
   invocation of the Smith-Myers-Kaplan-Goodman-Strauss theorem assumes this
   repo's transform chain implements it. That identification is unstated work,
   and it is needed for the hexagon family as much as for the spectre.
16. **Fix `SUBSTITUTION_GROWTH` in `web/src/core/unrooted.ts`**, which reads
   7.8730178 and is documented as the dominant eigenvalue. The true value is
   4+√15 = 7.872983346207417. `docs/BIGMAP_INVESTIGATION.md` repeats the wrong
   figure. The relative error is 4.5e-6, harmless for level-of-detail budgeting
   and wrong in a write-up.
17. **The hexagon realisation's geometry.** The topological half transfers from
   the spectre, but the hexagon tiling is a different metric object. Its
   space-filling limit deserves its own statement.

---

## 9. Where this sits in the literature

A briefing with full tagging is at
[`web/fass-proof/07-literature.md`](../web/fass-proof/07-literature.md). **Read
its §0 first.** The session that produced it had almost every scholarly host
blocked by the egress proxy, so most of its claims rest on a search engine's
server-side read of a page rather than on the source text. Each is tagged, and
nothing tagged `[EXTRACT]` should go into a write-up before someone opens the
PDF. Its §6.2 ranks the five fetches to redo.

Subject to that, four things bear directly on this document.

**The construction appears to be new.** Repeated targeted searches found no
published space-filling curve, plane-filling curve, FASS curve, Hamiltonian path
or Hamiltonian cycle on the hat or spectre tiling. An absence established by
search is weak evidence, so the right phrasing is "we are not aware of", and the
nearest neighbours should be named: Hassell 2014 for a FASS curve on an
aperiodic tile set, Singh, Lloyd & Flicker 2024 for a rigorous
hierarchy-exploiting Hamiltonian construction on an aperiodic tiling, and Henle
for the Penrose attempt. Henle's obstruction is worth mentioning, though not as a selling point: here a
supertile's region *is by construction* the union of its children, so
containment is definitional and carries no content. The substantive comparison
is elsewhere — in whether the approximant restricted to a window stays in that
window, which §4.5 shows holds at supertile granularity and fails at tile
granularity for the spectre.

**The single-arc property has a second name.** An arc visiting every tile of
every supertile is a Hamiltonian path in the dual graph. That framing reaches a
different audience than FASS does, and both are accurate.

**The literature confirms the negative result rather than contradicting it.**
The published inflation is *combinatorial*: supertile adjacency and edge
matching are level-independent while the metatiles themselves change shape at
every deflation. That is precisely §4.3. The self-similar representative CASPr
exists but is only topologically conjugate to the Spectre, not mutually locally
derivable from it, so a locally defined decoration such as our chords cannot be
transported to it. The similarity shortcut is closed for good.

**Two citations could shorten real work.** Özkaraca (arXiv:2204.11111) states a
mild condition on a planar substitution that yields a Lebesgue-type
space-filling curve; if this system satisfies it, §4.5 becomes a citation rather
than a rebuilt argument. And a Lean project by Joseph Myers, one of the monotile
papers' authors, already formalises parts of that work with a roadmap of about
24 steps, which is the realistic starting point for anything machine-checked.
