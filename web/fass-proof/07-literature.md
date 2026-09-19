# 07 — The mathematical literature and the exact definitions

A briefing for the FASS proof of `hex-128-010100000` and `spectre-1278-0101000000`.
No code in this file; it is the citation layer for `docs/FASS_PROOF.md`.

---

## 0. Provenance: what I could and could not verify

**This session's egress proxy blocked almost every scholarly host.** Direct
`WebFetch` returned `EGRESS_BLOCKED` for `arxiv.org`, `archive.org`,
`algorithmicbotany.org`, `en.wikipedia.org`, `link.springer.com`,
`escholarship.org`, `semanticscholar.org`, `cs.uwaterloo.ca`,
`strauss.hosted.uark.edu`, `archive.bridgesmathart.org`,
`gathering4gardner.org`, `pages.vassar.edu`, `scispace.com`, `aperiodical.com`
and `leanprover-community.github.io`. `curl` to `arxiv.org` failed the same way
(`CONNECT tunnel failed, response 403`). Only `github.com` and
`raw.githubusercontent.com` were reachable, plus the `WebSearch` tool, which
retrieves and paraphrases page content server-side.

So every claim below carries one of three tags. **Do not promote a tag when
writing the paper.**

| tag | meaning |
|---|---|
| **[FULL]** | I fetched the source and read the actual text (GitHub only). |
| **[EXTRACT]** | Content came back through `WebSearch`'s server-side read of the source page. The wording is close to the source but is *not* a verified verbatim quote; the *fact* is attributed to the named source by the search engine, not by me reading it. |
| **[BIBLIO]** | Bibliographic metadata only (authors, title, venue, year, arXiv id), cross-checked across at least two independent result sets. |
| **[MINE]** | My own inference or a check I ran against this repo. Not a citation. |

Anything below tagged **[EXTRACT]** must be re-verified against the PDF before it
goes into a paper. I have flagged the five places where that matters most in
§6.2.

---

## 1. FASS curves: the actual definition

### 1.1 Where the acronym comes from

The acronym is due to Prusinkiewicz, Lindenmayer and Fracchia. The primary
source is not *The Algorithmic Beauty of Plants* but the earlier chapter:

> P. Prusinkiewicz, A. Lindenmayer, F. D. Fracchia, *Synthesis of space-filling
> curves on the square grid*, in H.-O. Peitgen, J. M. Henriques, L. F. Penedo
> (eds.), **Fractals in the Fundamental and Applied Sciences**, North-Holland,
> Amsterdam, 1991, pp. 341–366. **[BIBLIO]**

*The Algorithmic Beauty of Plants* (Prusinkiewicz & Lindenmayer, Springer 1990;
corrected 2nd printing 1996, and free from the Algorithmic Botany site) presents
the same material in **Chapter 1, "Graphical modeling using L-systems", §1.4
"Synthesis of DOL-systems", subsection §1.4.1 "Edge rewriting"** (§1.4.2 is
"Node rewriting"). **[EXTRACT]** — the section numbering came back from a
server-side read of the book PDF; I could not open the PDF myself. The Hilbert
curve, the "SquaRecurve" and the "E-tour" are the worked FASS examples there.
**[EXTRACT]**

### 1.2 What the acronym expands to — and the word everybody drops

The expansion in the primary source is:

> **approximately** space-**F**illing, self-**A**voiding, **S**imple, and
> self-**S**imilar. **[EXTRACT]**

with the gloss:

> conditions are imposed to ensure that the resulting curve is approximately
> space-filling, self-avoiding, simple (single-stroke) and self-similar; such
> curves are referred to as FASS curves. **[EXTRACT]**

and the component definitions as they are usually restated:

* **self-avoiding** — the curve "does not cross or touch itself"; **[EXTRACT]**
* **simple** — "single-stroke", i.e. drawable without lifting the pen: one
  component, a path (or a closed tour), not a branching network; **[EXTRACT]**
* **self-similar** — "the structure of the curve is, up to scale, identical to
  the structure of its parts"; **[EXTRACT]**
* **approximately space-filling** — FASS curves "can be thought of as finite,
  self-avoiding approximations of curves that pass through all points of a
  square". **[EXTRACT]**

The repo's own `docs/FASS_1278.md` expands FASS as "space-Filling,
self-Avoiding, Simple, Self-similar", dropping *approximately*. That is the
usual informal expansion and it is not wrong, but the dropped adverb is exactly
the load-bearing word.

### 1.3 The decisive question: approximants or limit?

**Self-avoidance is a property of the finite approximants. It cannot be a
property of the limit.**

The reason is not a convention, it is a theorem:

> **Netto's theorem (E. Netto, 1878/79).** There is no continuous bijection from
> $[0,1]$ onto $[0,1]^2$. **[EXTRACT]**
>
> Consequently a space-filling curve, being a continuous surjection, cannot be
> injective: many points of the square are covered more than once by the Peano
> and Hilbert curves. **[EXTRACT]**

(The date is given as 1878 in some sources and 1879 in others; check before
printing. **[EXTRACT]**)

A modern, clean definition of the limit object, which is the one to adopt:

> A **plane-filling curve** is a continuous surjective map from the unit
> interval onto a subset of the plane of positive area (positive Jordan
> content). — H. Haverkort, *Plane-filling trails*, SoCG 2020 (Media
> Exposition), LIPIcs 164, art. 81; arXiv:2003.12745. **[EXTRACT]**

Note what that definition does *not* require: injectivity, self-avoidance,
simplicity or self-similarity. Those four are the FASS decorations, and in the
original source they are conditions on the *generated* (finite) curves, which
are polygonal arcs.

### 1.4 What must actually be proved, for a substitution-generated curve

Assembling §1.2 and §1.3, the standard obligation for "this substitution system
generates a FASS curve" is a statement about a **sequence** $\gamma_k$ of
polygonal arcs plus one statement about their limit:

1. **(Simple, all $k$)** Each $\gamma_k$ is a single polygonal arc: one
   connected component, no branch points. In graph terms: the drawn graph has
   maximum degree 2 and exactly one component with two degree-1 ends.
2. **(Self-avoiding, all $k$)** Each $\gamma_k$ is non-self-intersecting as a
   point set — no proper crossings, no T-touches, no collinear overlaps.
3. **(Self-similar, all $k$)** $\gamma_{k+1}$ is produced from $\gamma_k$ by a
   *fixed* rule — the same substitution at every level. Note: "fixed rule", not
   "geometrically similar picture". §3 below shows the hat/spectre systems
   satisfy the first and *fail* the second.
4. **(Nesting)** $\gamma_k$ sits inside $\gamma_{k+1}$ (as a sub-arc, or with a
   controlled reparameterisation), so the parameterisations converge.
5. **(Approximately space-filling, all $k$)** Every point of the region is
   within $\varepsilon_k \to 0$ of $\gamma_k$.
6. **(Limit)** The uniform limit $\gamma = \lim \gamma_k$ exists, is continuous,
   and its image has positive area. Injectivity is *not* claimed and is false.

### What this means for our proof

* `docs/FASS_PROOF.md` §4.5 already states the right thing — *"'self-avoiding'
  in FASS is a property of the finite approximants, not of the limit — a genuine
  space-filling curve cannot be injective"*. The literature backs that exactly,
  and the citation to hang on it is **Netto's theorem**, not a stylistic choice.
  Add the citation; the sentence needs no change.
* `docs/FASS_1278.md` §4.6's status table says "Self-avoiding (no geometric
  crossings) — **Proved computationally k ≤ 5**". Under the correct definition
  that row is *the right thing to be proving*: obligation (2) above is a
  per-level statement, so a proof for all $k$ closes it outright. There is no
  extra limiting statement owed for self-avoidance. Say so explicitly, because a
  reader who thinks FASS demands an injective limit will think the proof has a
  hole where it has none.
* Conversely, **obligation (6) is the only genuinely analytic one**, and we do
  not currently have it: the repo's status table lists the Hausdorff-limit
  statement as "argued". §2 below is the template for closing it.
* The word to use in the write-up is "approximately space-filling at every
  level, space-filling in the limit". Using the bare phrase "space-filling
  curve" for a finite $\gamma_k$ is the single most likely source of a referee
  objection.

---

## 2. The canonical proof template (Hilbert), and its transplant

### 2.1 How Hilbert's curve is actually proved space-filling

Standard reference: **H. Sagan, *Space-Filling Curves*, Universitext, Springer,
New York, 1994** — Chapter 2 is Hilbert's curve. **[BIBLIO]** The original is
D. Hilbert, *Über die stetige Abbildung einer Linie auf ein Flächenstück*,
Math. Ann. **38** (1891), 459–460. **[BIBLIO]**

The argument, as the secondary literature states it: **[EXTRACT]**

> Hilbert's geometric generation principle partitions the unit interval into
> four equal sub-intervals and the unit square into four congruent sub-squares,
> mapping each sub-interval continuously onto one of the sub-squares, and the
> process is repeated for all the sub-intervals and sub-squares. The Hilbert
> curve arises as the uniform limit of continuous functions, and uniform
> convergence preserves continuity. From the recursive definition it follows
> that the Hilbert curve is surjective: every point of $[0,1]^2$ is covered in
> the limit.

Unpacked into the hypotheses that do the work:

| # | hypothesis | what it buys |
|---|---|---|
| H1 | **Nested subdivision with vanishing diameter.** Each level-$k$ cell splits into level-$(k+1)$ cells; $\max_k \operatorname{diam} \to 0$. | The intersection of a nested cell sequence is a single point. |
| H2 | **Interval/cell correspondence.** A fixed order on the children assigns each level-$k$ cell a dyadic (here: 4-adic) sub-interval, nested compatibly. | Turns a combinatorial order into a map $[0,1]\to$ plane. |
| H3 | **Containment / locality.** The approximant restricted to a level-$j$ sub-interval stays inside the corresponding level-$j$ cell, at *every* level $k \ge j$. | $\|\gamma_k-\gamma_m\|_\infty \le \operatorname{diam}(\text{level-}j\text{ cell})$ for $k,m\ge j$ — this is *exactly* what makes $(\gamma_k)$ uniformly Cauchy. |
| H4 | **Adjacency of consecutive children.** Consecutive cells in the order share a boundary. | The approximants are connected; the limit is continuous, not just a limit of maps. |
| H5 | **Exhaustion.** Every cell is used. | Surjectivity onto the closure of the union; positive area is then immediate. |

**H3 is the one that carries the analysis.** H1, H2, H4, H5 are combinatorial or
metric bookkeeping; H3 is what converts them into uniform convergence.

### 2.2 The template rewritten for a non-integer inflation and no grid

Here is the form the argument has to take for a hierarchical tiling whose
inflation factor is irrational and whose cells are not squares. Write
$\mathcal S_k(T)$ for the level-$k$ supertile of type $T$, $\lambda$ for the
tile-count inflation and $\sqrt\lambda$ for the linear one.

> **Template.** Fix a nested sequence of supertiles
> $\mathcal S_1 \subset \mathcal S_2 \subset \cdots$ exhausting the plane, and
> for each $k$ let $\gamma_k$ be the strand arc carried by $\mathcal S_k$,
> parameterised proportionally to segment count.
>
> **(T1) Combinatorial substitution.** There is a *fixed* rule
> $F$ (independent of $k$) such that the arc structure of $\mathcal S_{k+1}$ is
> $F$ applied to the arc structures of its children. — *Replaces H2. This is
> where "self-similar" lives once geometric similarity is unavailable.*
>
> **(T2) Containment.** The arc of $\mathcal S_{k}$ restricted to the parameter
> window of a level-$j$ child lies inside that child, for all $k \ge j$. —
> *H3, verbatim, and the crux of the whole thing.*
>
> **(T3) Vanishing relative diameter.** $\operatorname{diam}(\text{tile}) /
> \operatorname{diam}(\mathcal S_k) = O(\lambda^{-k/2})$. — *H1.*
>
> **(T4) Exhaustion.** $\operatorname{inradius}(\mathcal S_k) \to \infty$ about
> a fixed seed. — *H5, and it is a real hypothesis, not a formality: see below.*
>
> **(T5) Every tile carries a chord and every tile is visited.** — *H5's other
> half; gives positive area rather than a measure-zero limit set.*
>
> Then $(\gamma_k)$ is uniformly Cauchy after rescaling to constant diameter, the
> limit $\gamma$ is a continuous curve, and $\gamma([0,1])$ has positive Lebesgue
> measure (indeed it contains the whole supertile region, by T2+T5 and
> compactness).

Two remarks that matter specifically here:

1. **Nothing in the template needs geometric self-similarity.** H2 is replaced by
   T1, which is purely combinatorial. The non-integer, irrational $\sqrt\lambda$
   enters only through T3, as a rate. This is why the repo's negative result
   (§3.4) is survivable.
2. **T4 is not automatic and the repo has already refuted one instance of it.**
   `docs/FASS_PROOF.md` records that Psi-in-Psi nesting has *exactly constant*
   inradius (1.409 hex / 3.527 spectre) — it fills a sector, not the plane — and
   that Delta-in-Delta nesting does diverge (≈2.81 per level). That is precisely
   H5/T4 doing real work and failing for the naive choice. Any write-up should
   present this as a feature of the template, not an embarrassment.

### 2.3 Two published generalisations worth citing instead of re-deriving

* **M. İ. Özkaraca**, *Planar substitutions to Lebesgue type space-filling
  curves and relatively dense fractal-like sets in the plane*, J. Math. Anal.
  Appl. **530** (2024), no. 2; arXiv:2204.11111. **[BIBLIO]** The abstract
  states the construction "generalizes Lebesgue's construction to generate
  space-filling curves from **any given planar substitution satisfying a mild
  condition**", by linear interpolation. **[EXTRACT]** — *I could not retrieve
  the statement of the "mild condition".* If that condition is satisfied by the
  spectre substitution, this is a citable off-the-shelf limit theorem and
  obligation (6) reduces to checking a hypothesis. **This is the single highest-value
  follow-up fetch.**
* **X.-R. Dai, H. Rao, S.-Q. Zhang**, *Space-filling curves of self-similar sets
  (II): edge-to-trail substitution rule*, Nonlinearity **32** (2019), no. 5,
  1772–…; arXiv:1511.05411; with (I) arXiv:1509.06276 and (III) *Skeletons*,
  arXiv:1804.10480. **[BIBLIO]** Their theorem: a connected self-similar set
  satisfying the open set condition and possessing a *skeleton* admits a
  space-filling curve, constructed by an Euler-tour / edge-to-trail substitution;
  connected self-similar sets of finite type always possess skeletons.
  **[EXTRACT]** The construction — replace each edge by a trail inside the tile
  and weld — is *structurally the same idea as our chords-and-seams
  construction*. **Caveat: it is stated for self-similar sets, and §3.4 shows our
  object is not one.** Cite it as the closest theorem-shaped precedent for the
  method, not as a theorem we can apply.

### What this means for our proof

* Our §4.5 "argued" limit statement should be restructured as T1–T5 with each
  item pointing at an existing repo result: T1 = the routing automaton
  (`04-routing-automaton.ts`, "routing states lie on a 2-cycle"), T2 = the
  nesting/containment result in `14-merge.ts`, T3 = the inflation constants in
  `12-limit-constants.ts`, T4 = the inradius table, T5 = L4 plus the per-type
  chord census. Then the only unproved piece is the standard uniform-Cauchy
  paragraph, which is three lines of real analysis.
* **T2 is H3 is the crux.** It is the same statement as the repo's open lemma
  ("whenever two children's quad-arcs share both endpoints, those arcs coincide
  as point sets") wearing a different hat: containment of the arc inside the
  child is what the child actually being a sub-tiling gives you. Presenting the
  open gap as "the Hilbert argument's H3" makes it legible to anyone who knows
  space-filling curves, and makes clear it is *the* hypothesis, not a technicality.
* Do **not** phrase the limit argument as "by self-similarity". Phrase it as
  "by containment plus vanishing relative diameter". The first is false here
  (§3.4); the second is true and is all Hilbert ever needed.

---

## 3. The hat / spectre substitution structure — the crux citation

### 3.1 The two primary papers

* D. Smith, J. S. Myers, C. S. Kaplan, C. Goodman-Strauss, **"An aperiodic
  monotile"**, *Combinatorial Theory* **4** (1) (2024), #6;
  doi:10.5070/C64163843 (check); arXiv:2303.10798. **[BIBLIO]**
* D. Smith, J. S. Myers, C. S. Kaplan, C. Goodman-Strauss, **"A chiral aperiodic
  monotile"**, *Combinatorial Theory* **4** (2) (2024), #13;
  doi:10.5070/C64264241; arXiv:2305.17743 (submitted 2023-05-29, published
  2024-09-30). **[BIBLIO]**

The second paper is the one that governs this repo: it is the Tile(1,1) /
Spectre paper.

### 3.2 What the hat paper proves about the metatile system

From the abstract and secondary readings: the hat "can form clusters called
'metatiles', for which substitution rules can be defined", and the authors "give
a combinatorial, computer-assisted proof that the hat must form hierarchical —
and hence aperiodic — tilings", using "a computer-assisted case analysis to show
that every tiling by the hat polykite arises from the substitution rules".
**[EXTRACT]**

The level-independence statement, in the words the secondary literature uses:

> The Hats and anti-Hats assemble into four larger 'meta-tiles', called T, H, F
> and P... The meta-tiles assemble into larger 'supertiles' **whose adjacencies
> are combinatorially the same as those of the basic meta-tiles**. **[EXTRACT]**

and, restating the paper:

> Through a set of substitution rules they form larger, **combinatorially
> equivalent** supertiles that fit together following **the same matching
> conditions**. **[EXTRACT]**

That is the assertion our crux lemma wants. **But see §3.4 for the price.**

**Section numbering, independently corroborated.** Joseph Myers' own Lean
formalisation roadmap (he is the second author) names the paper's sections when
listing what has to be formalised: **[FULL]**

> Step 8: "Computer-generated case analysis of patches of hats showing they form
> certain clusters (Section 4 ..."
> Step 9: "Proof of aperiodicity for the four-tile system in Section 5 of [hat],
> via that four-tile system"

So: **[hat] §4 = the cluster/metatile case analysis; [hat] §5 = the four-tile
substitution system and the aperiodicity proof.** That is a reliable pointer
even though I could not open the PDF.

### 3.3 What the chiral (spectre) paper proves — and why it is *our* paper

This is the important one, because the repo's nine types and eight edge classes
come straight out of it.

> Most of the aperiodicity proof for the Spectre relies on the marked clusters
> defined in **Figure 4.1**. The clusters have the comparatively simple
> combinatorics of **regular hexagons**, and **labelled edges make it easier to
> verify that supertiles and clusters have combinatorially equivalent matching
> rules**. **[EXTRACT]**

> It is possible to annotate the Spectres themselves with the same markings as
> the marked hexagons. **Figure 5.3** shows a **Mystic and eight Spectres** with
> the same tile and edge markings as the associated marked hexagons. **The tiling
> substitution rules on marked hexagons apply equally to these marked Spectres**,
> and erasing the markings restores the Spectre tiling substitution rules.
> **[EXTRACT]**

And, from the Bielefeld group's reading of it:

> Smith et al. provided a **combinatorial inflation for marked hexagons**, which
> gives rise to the Spectre tiling. This inflation acts on **nine different
> hexagons (Γ, Δ, Θ, Λ, Ξ, Π, Σ, Φ, Ψ)**, each appearing in six different
> orientations, which gives **54 translational prototiles** in total. **[EXTRACT]**
> — M. Baake, F. Gähler, J. Mazáč, L. Sadun, *On the long-range order of the
> Spectre tilings*, Discrete Comput. Geom. (2025), doi:10.1007/s00454-025-00756-z;
> arXiv:2411.15503.

> There is a substitution system involving **nine hexagonal metatiles and eight
> different types of edge**, with one set of deflation rules turning **hexagons
> into more hexagons**, and a second set turning them **into Spectre tiles**.
> **[EXTRACT]**

> **Eight of the nine hexagon types expand to just one Spectre, with the
> exception being the G tile, which expands to two.** **[EXTRACT]**

#### Cross-check against this repo **[MINE]**

| literature | this repo |
|---|---|
| nine marked hexagons Γ, Δ, Θ, Λ, Ξ, Π, Σ, Φ, Ψ | `TILE_NAMES = [Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi]` (`src/core/families.ts`) |
| "eight different types of edge" on the hexagons | `HEX_EDGE_LABELS` uses major classes **{0,1,2,3,4,5,6,8} — exactly 8**, class 7 absent |
| spectre realisation adds the Mystic's extra edge type | `SPECTRE_EDGE_LABELS` uses **{0,…,8} — 9 classes**, i.e. hex's eight plus class **7** |
| "the G tile expands to two [Spectres]", the Mystic | `Gamma` realised as the pair `Gamma1` + `Gamma2`; `SUPER_RULES.Gamma` is the only row with a `null` slot |
| "one set of deflation rules ... hexagons into hexagons, a second ... into Spectre tiles" | the repo's two families `hex` and `spectre`, sharing `SUPER_RULES` and `T_RULES` |
| six orientations × 9 types = 54 translational prototiles | the repo carries orientation in the exact `Z[ζ₁₂]` transform rather than in the type label |

The agreement is item-for-item, including the otherwise-arbitrary fact that the
**hexagon system has exactly eight edge classes and the spectre system nine**.
The repo's selection strings reflect it too: the conjectured configurations are
`hex` **{1,2,8}** and `spectre` **{1,2,7,8}** — the same three classes plus
exactly the one class (7) that only exists in the spectre realisation.

**Consequence, and it is a correction to our own documentation.**
`docs/FASS_PROOF.md` §4.1 says: *"For the spectre family this is the
Smith–Myers–Kaplan–Goodman-Strauss theorem. The `hex` family is this repo's own
reduced realisation and **nothing is cited for it**."* On the evidence above that
is backwards. The **marked-hexagon system is the primary object in [spectre]
§4–§5**; the Spectre tiling is obtained *from it* by re-marking (Fig. 5.3). Our
`hex` family is not an uncited invention — it is (up to identification of
labels) SMKGS's own combinatorial inflation, and if anything it is the family
with the *stronger* citation, because the hexagon combinatorics is where the
published proof lives. **[MINE, resting on [EXTRACT] sources — verify against
Figs. 4.1 and 5.3 before relying on it.]**

### 3.4 The inflation factor, the mirror, and the negative result — all confirmed

> The square of the edge inflation must scale the edge vectors by a factor
> **λ = 4 + √15**. ... One inflation step **scales the tiling by √(4+√15),
> reflects it** (thus obtaining a tiling of left-handed supertiles), and replaces
> each of these by a patch of right-handed tiles. **[EXTRACT]** (BGMS, arXiv:2411.15503)

> The leading eigenvalue of the inflation matrix is **λ = 4 + √15, a PV unit**.
> **[EXTRACT]**

> The Z-module Z[ξ, λ] with **ξ = e^{2πi/6}** and λ = 4 + √15 is a ring, a
> non-maximal order of the quartic field K = Q(√−3, √−5); the edge module E is a
> submodule of index 9. **[EXTRACT]**

Three separate matches with this repo, none of them coincidence: **[MINE]**

1. **λ = 4 + √15 = 7.872983346…** — exactly the repo's measured tile-count
   growth (272791/34649 = 7.872983…) and exactly the root that
   `12-limit-constants.ts` derives in closed form from the characteristic
   polynomial $x^9-8x^8+8x^6-x^5$, of which $x^2-8x+1$ is a factor. The
   literature and the repo's linear algebra agree, by independent routes. The
   constant `SUBSTITUTION_GROWTH = 7.8730178` in `src/core/unrooted.ts`
   (docstring: "Dominant eigenvalue of the substitution matrix") is **wrong in
   the 5th decimal**: the true value is 4+√15 = 7.872983346207417…, and the
   repo's own tile counts confirm it to 14 significant digits (exactly,
   133121449/16908641 = 7.87298334620742140… against λ = 7.87298334620741688…;
   the "15 digits" a `double` appears to show is a rounding artefact — see
   `fass-proof/zz-audit-07.ts` §J). `docs/BIGMAP_INVESTIGATION.md` repeats the bad value as
   "converges to 7.87302". Relative error ≈ 4.5e-6 — harmless for LOD budgeting,
   embarrassing in a paper. Fix both.
2. **Linear factor √(4+√15) = 2.805883701…** — the repo's measured inradius
   growth rate (≈2.81 per level) and the convergent similarity ratio.
3. **"…and reflects it."** The repo's `buildSupertiles` pre-multiplies
   `REFLECT_X` at every level, producing the period-2 alternation that shows up
   everywhere in our results (routing signatures on a 2-cycle, Delta's boundary
   pairing alternating, arc profiles alternating). **That mirror is in the
   published inflation.** It is not an implementation artefact and it should be
   presented as structural.

One refinement: BGMS work in Z[ξ,λ] with ξ a **6th** root of unity; the repo
works in **Z[ζ₁₂]**, d = e^{iπ/6}, d⁴ = d²−1. The finer ring is needed because
tiles appear in twelve orientations (30° steps), and Tatham's implementation
uses the same Z[ζ₁₂] representation. No conflict, but do not quote BGMS's ring
as ours. **[MINE]**

#### The negative result is *confirmed by the literature*, not contradicted by it

This repo established (and `docs/FASS_PROOF.md` records) that **no similarity or
anti-similarity conjugates the child transforms `Ts` across levels** — the
supertile quad is not an exact similarity image of the previous level's quad,
with a fixed non-zero exact residual. The literature says the same thing about
the published systems:

> In the HTPF system of metatiles for the hat tiling, the geometry is much more
> distorted by the deflation process, and **even the metatiles themselves change
> their shape slightly in every deflation**. **[EXTRACT]**

> The self-similar tiling is related by a **shape change** to the combinatorially
> equivalent tiling by **regular hexagons**, and hence is related by a shape
> change to the original Spectre tiling. ... Based on the combinatorial
> inflation, a **self-similar version of the Spectre tiling was derived, called
> CASPr**. It is **topologically conjugate (but not MLD)** to the Spectre, and it
> possesses a model set description. **[EXTRACT]** (BGMS)

> Both the Hat and the Spectre tilings are **(combinatorial) substitution
> tilings**, and so can be studied with a variety of well-established topological
> and dynamical tools. **[EXTRACT]**

> The outlines of the supertiles are left-handed, however the individual tiles
> within them have different handedness, indicating that **supertile shape does
> change relative to the tiles they contain**. **[EXTRACT]**

The picture that emerges, and it is exactly ours:

* SMKGS's inflation is **combinatorial**. Supertile *adjacency and matching
  rules* are level-independent; supertile *shapes* are not.
* An exactly self-similar representative **exists** but is a **different
  tiling** — CAP for the hat, **CASPr** for the spectre — obtained by a shape
  change. It is topologically conjugate to the Spectre but **not MLD**.
* "Not MLD" is the sting in the tail for us: mutual local derivability is
  precisely what would let us transport a locally-defined decoration (our chords
  and seams) between the two tilings. **Because CASPr is not MLD to the Spectre,
  we cannot evade our own negative result by passing to the self-similar
  representative and inheriting the strand structure.** **[MINE]**

### 3.5 The rest of the substitution-structure literature

* **M. Baake, F. Gähler, L. Sadun**, *Dynamics and topology of the Hat family of
  tilings*, Israel J. Math. (2025); arXiv:2305.05639 (v1 2023-05-09, v4
  2025-05-15). **[BIBLIO]** Result: the Hat admits a 4-dimensional family of
  shape deformations; **all the continuous hulls are topologically conjugate
  dynamical systems**, hence share dynamics and topology; a self-similar member
  **CAP** is constructed, has **pure point dynamical spectrum**, and comes from a
  **cut-and-project scheme with 2-dimensional Euclidean internal space**; all
  other members arise by small modifications of the projection. **[EXTRACT]**
* **M. Baake, F. Gähler, J. Mazáč, L. Sadun**, *On the long-range order of the
  Spectre tilings*, Discrete Comput. Geom. (2025);
  doi:10.1007/s00454-025-00756-z; arXiv:2411.15503. **[BIBLIO]** The spectre
  analogue: combinatorial inflation on 9 marked hexagons (54 translational
  prototiles), λ = 4+√15 a PV unit, the self-similar representative **CASPr**,
  model-set description. **[EXTRACT]**
* **M. Baake, F. Gähler, J. Mazáč, A. Mitchell**, *Diffraction of the Hat and
  Spectre tilings and some of their relatives*, J. Math. Phys. **66** (2025),
  092707; arXiv:2502.03268. **[BIBLIO]** Pure-point diffraction computed via the
  CAP/CASPr model sets; windows have **fractal boundaries**, so Fourier–Bohr
  coefficients need an exact renormalisation cocycle in internal space.
  **[EXTRACT]**
* **A. Chéritat**, *Observations on the hex clusters of the Spectre tilings*,
  arXiv:2407.05359 (2024-07-07). **[BIBLIO]** Decorates the Spectre with
  hexagons, studies the resulting clusters, and — the reason it matters here —
  **reproves that the Spectre tilings exist and are uniquely hierarchical, with a
  proof that is not computer-assisted**. **[EXTRACT]** If we need a
  human-checkable citation for uniqueness of the hierarchy rather than a
  computer-assisted one, this is the paper.
* **S. Tatham**, *Finite-state transducers for substitution tilings*,
  arXiv:2512.16595 (2025-12-18, rev. 2026-03-15), 53 pp. **[BIBLIO]** Handles a
  tile's hierarchy of supertiles "in a purely combinatorial fashion using finite
  state automata"; constructs recognisers and deterministic transducers for
  neighbour relations; produces two **unambiguous** substitution systems for the
  hat. **[EXTRACT]** This is the closest published framework to our own routing
  automaton, and it is the natural citation for "the combinatorial substitution
  data is level-independent and finite-state".
* **S. Labbé, P. Selinger**, *A construction of the hat tilings by a Markov
  partition*, arXiv:2604.20964 (2026-04-22). **[BIBLIO]** Hat tilings are read
  off a coloured image via a triangular grid; they prove the construction gives
  valid hat tilings and that **every** valid hat tiling arises this way.
  **[EXTRACT]**
* **Tile(1,1) homochiral variants.** *Homochiral inflation for the aperiodic
  monotile Tile(1,1)*, arXiv:2502.15608 (2025). **[BIBLIO]** Decomposes the
  tiling into just **two** clusters Γ and Ω in six orientations (12 metatiles),
  mappable onto a triangular lattice, with chirality **fixed at every inflation
  step** instead of alternating. **[EXTRACT]** The Perron root of that 2×2
  inflation matrix is again **4 + √15 ≈ 7.873**. **[EXTRACT]** Relevant to us
  because it is precisely a published construction that **removes the per-level
  mirror**; if the period-2 alternation in our routing automaton ever becomes an
  obstacle, this is the literature to mine.

### What this means for our proof

* **Route 1 in `docs/FASS_PROOF.md` §6 ("cite the metatile substitution") is
  legitimate, and it is the shortest path.** The citable statement is
  [spectre] §4–§5: the marked hexagons have **labelled edges** precisely so that
  "supertiles and clusters have combinatorially equivalent matching rules" can be
  verified, and the substitution rules on marked hexagons apply verbatim to the
  marked Spectres. **[EXTRACT]** That is level-independence of supertile
  adjacency and edge matching — exactly what the open lemma needs.
* **But the identification work is real and must be done.** §6 already says so.
  What §3.3's table shows is that the identification is much closer to hand than
  feared: nine types with the same Greek names, eight hexagon edge classes vs
  nine spectre ones, Gamma the unique type expanding to two spectres, and the
  per-level mirror in the published inflation. The remaining task is to match our
  `T_RULES`/`SUPER_RULES` slot-by-slot against [spectre] Figures 4.1 / 4.2 / 5.3.
  That is an afternoon with the PDF, not a research project.
* **Delete the appeal to geometric similarity wherever it survives.**
  `docs/FASS_1278.md` §4.4's justification ("structurally pinned by the
  level-independent child transforms of `buildSupertiles`") is wrong, as our own
  negative result shows — and the literature explains *why* it is wrong (the
  metatiles change shape at every deflation). The correct replacement sentence is
  "pinned by the level-independence of the *combinatorial* substitution, per
  SMKGS [spectre] §4–5", not by any property of the transforms.
* **Do not try to rescue similarity via CASPr.** It is not MLD to the Spectre.
  Say this explicitly; it forecloses an obvious reviewer suggestion.
* **Fix `SUBSTITUTION_GROWTH`.** 7.8730178 should be 7.872983346… = 4+√15.

---

## 4. Prior art: curves drawn on aperiodic tilings

### 4.1 What exists

**Closest in kind — a FASS curve on an aperiodic tile set:**

* **R. Hassell**, *A Plane-Filling Curve Using Ammann A5 Tiles*, Bridges 2014,
  pp. 389–392. **[BIBLIO]** Presents "a new **FASS curve** using the Ammann A5
  aperiodic tile set", using marked-tile notation together with L-system
  replacement; notes that the aperiodicity comes from the asymmetric matching
  rules and that tiles recursively substitute. **[EXTRACT]** This is a Bridges
  (art/mathematics) paper: a **construction and exhibition, not a theorem with a
  proof**. It is nevertheless the nearest published thing to what we have.

**Closest in kind — space-filling curves on Penrose tilings:**

* **F. Henle**, *Space-Filling Curves on Non-Periodic Tilings*, Gathering for
  Gardner 12 gift exchange (≈2016). **[BIBLIO]** Targets the Penrose **kite and
  dart** tiling, working via the chair tiling and the Robinson-triangle
  decomposition; the curve traverses each subdivision in turn. Henle explicitly
  notes the obstruction: **the Penrose deflation rules are not "bounding volume
  hierarchical"** — subdividing a kite or dart does not keep the children inside
  the parent. **[EXTRACT]** That is exactly hypothesis **H3/T2** of §2 failing,
  and it is the reason a Hilbert-style argument is hard on Penrose. *Our
  substitution does not have that problem* (children of a supertile do lie in the
  supertile), which is a genuine structural advantage worth stating.
* **S. Le**, *The Art of Space Filling in Penrose Tilings and Fractals*,
  arXiv:1106.2750 (2011). **[BIBLIO]** Despite the title this is about
  **Escher-style decorative art** on Penrose tiles — "space filling" in the
  ornamental sense. **Not mathematical prior art.** **[EXTRACT]** Do not cite it
  as such.

**Closest in kind — Hamiltonian structure on an aperiodic tiling:**

* **S. Singh, J. Lloyd, F. Flicker**, *Hamiltonian Cycles on Ammann–Beenker
  Tilings*, Phys. Rev. X **14**, 031005 (2024); arXiv:2302.01940. **[BIBLIO]**
  They give "a simple algorithm for constructing Hamiltonian graph cycles
  (visiting every vertex exactly once) on a set of **arbitrarily large finite
  subgraphs** of aperiodic two-dimensional Ammann–Beenker tilings", and use the
  **discrete scale symmetry** of AB tilings to solve, exactly, problems that are
  NP-complete in general: equal-weight TSP, longest path, three-colouring. They
  observe that AB is "a previously unknown special case of the Hamiltonian cycle
  problem which does not lie in NP-complete", and that discrete scale symmetry is
  "as powerful as ... translational invariance". **[EXTRACT]** This is the closest
  *rigorous* neighbour: same mechanism (hierarchy), same trick (do it once per
  supertile type, induct), different tiling, and **vertices** rather than tiles.
* **S. Singh, F. Flicker**, *Exact solution to the quantum and classical dimer
  models on the spectre aperiodic monotiling*, Phys. Rev. B **109**, L220303
  (2024). **[BIBLIO]** Spectre-specific, and about **dimers** (perfect matchings
  of the tiling graph), not paths. Our construction also chooses a matching —
  of *dots on a tile*, not of tiles — so the vocabulary is adjacent but the
  object is different. Still the nearest spectre-specific combinatorial-structure
  paper.

**General machinery for turning substitutions into space-filling curves:**
Özkaraca (arXiv:2204.11111) and Dai–Rao–Zhang (I/II/III), both already detailed
in §2.3.

### 4.2 What does not exist, as far as I can determine

**I found no published space-filling curve, plane-filling curve, FASS curve,
Hamiltonian path or Hamiltonian cycle construction on the hat or the spectre
tiling.** Repeated targeted searches over hat/spectre + {space-filling curve,
plane-filling, Hamiltonian path, Hamiltonian cycle, single curve, FASS} returned
only the substitution/diffraction/dynamics literature of §3 and the
Ammann–Beenker work above. **[EXTRACT — an absence established by search, which
is weaker evidence than a presence. It does not rule out a preprint, a blog post,
a Bridges paper not indexed, or a thesis.]**

### What this means for our proof

* **The construction appears to be new.** State it that way — "we are not aware
  of a published construction of a space-filling curve on a hat or spectre
  tiling" — and name the neighbours rather than claiming priority outright.
* **The three neighbours to cite in the introduction**, in order of relevance:
  Hassell 2014 (a FASS curve on an aperiodic tile set — closest in kind),
  Singh–Lloyd–Flicker 2024 (the rigorous hierarchy-exploiting Hamiltonian
  construction on an aperiodic tiling — closest in rigour), Henle (the Penrose
  attempt, and the containment obstruction we do not suffer).
* **Use Henle's obstruction as a selling point.** "Penrose deflation is not
  bounding-volume-hierarchical" is precisely H3/T2 failing; our supertiles do
  contain their children, which is why the Hilbert template transplants at all.
* **Frame the result in Singh–Flicker's language as well as Prusinkiewicz's.**
  A single arc visiting every tile of every supertile is a **Hamiltonian path in
  the dual graph** (restricted to the chords we drew). That framing reaches the
  physics/combinatorics audience; FASS reaches the graphics/L-systems audience.
  Both are accurate.

---

## 5. Formalisation: what a machine-checked proof would realistically cost

### 5.1 There is already a Lean project by one of the paper's authors

**`github.com/jsm28/AperiodicMonotilesLean`** — Joseph Samuel Myers (second
author of both monotile papers), Apache-2.0, a personal staging repository for
material intended for mathlib. **[FULL]** It formalises results from `[hat]` and
`[spectre]` and lays out a roadmap of roughly **24 numbered steps**. **[FULL]**
Exact step wordings I was able to read: **[FULL]**

* Step 3 — "A discrete version of unique hierarchical structure in a tiling
  implying it is not periodic"
* Step 7 — "Defining a type corresponding to the tiles of the Laves tiling
  [3.4.6.4], the group of its symmetries"
* Step 8 — "Computer-generated case analysis of patches of hats showing they form
  certain clusters (Section 4 …"
* Step 9 — "Proof of aperiodicity for the four-tile system in Section 5 of [hat],
  via that four-tile system"
* Step 12 — "General definitions and lemmas about tilings, in a metric space
  context, analogous to those for …"
* Step 13 — "The connection between geometric and discrete tilings for the hat,
  based on the series of more …"
* Step 18 — "Learn enough Lean metaprogramming to write a replacement in the form
  of Lean tactics or similar"
* Step 19 — "Likewise, for step 11 (the case analysis for the spectre). The
  original case analysis involved …"

Status notes read: steps 1–2 "In progress in this repository (PRing parts to
mathlib also in progress…)"; most later steps carry "Most of the proposed work is
unlikely to start before August 2024 at the earliest." **[FULL]**

Two remarks the README makes that we should internalise: **[FULL]**

* **Step 13 "could involve as much work as all other steps combined"**, and may
  need mathematics not in mathlib — Euler's theorem for plane maps, properties of
  plane divisions by curves, possibly the **Jordan Curve Theorem**.
* The hat case analysis is **Lean code generated by an external program**, which
  "would probably not be suitable for the mathlib archive"; hence steps 18–19,
  replacing generated code by tactics.

Current contents: `AM/Mathlib/Combinatorics/Tiling/` holds `Isohedral.lean`,
`Patch.lean`, `Periodic.lean`, `TileSet.lean`, `TileSetCard.lean`, plus a
`Function/` subdirectory. **[FULL]**

### 5.2 What has already landed in mathlib

`Mathlib/Combinatorics/Tiling/Tile.lean` exists in mathlib4 master. **[FULL]**
Its docstring opens: **[FULL]**

> "This file defines some basic concepts related to individual tiles for tilings
> in a discrete context (with definitions in a continuous context to be developed
> separately but analogously). Work in the field of tilings does not generally
> try to define or state things in any kind of maximal generality, so it is
> necessary to adapt definitions and statements from the literature…"

It defines `Prototile G X` (carrier set plus a symmetry subgroup), `Protoset G X
ιₚ`, and `PlacedTile ps` (image of a prototile under a group action, as a
quotient), for a multiplicative group `G` acting on `X`. **[FULL]** So the
*discrete* tiling vocabulary is upstream already; the metric/geometric side is
not.

Also relevant and present: **Hausdorff measure and Hausdorff dimension**,
`Mathlib/MeasureTheory/Measure/Hausdorff.lean`, main definition
`MeasureTheory.Measure.hausdorffMeasure`, notation `μH[d]`. **[FULL]**

**Not present:** the **Jordan Curve Theorem**. It is formalised in **Mizar**
(Korniłowicz et al., 2005) and **HOL Light** (Hales, 2007) but not in mathlib4;
an independent Lean 4 attempt exists (`github.com/alok/JordanCurveTheorem`,
following Kanovei–Reeken's nonstandard proof) and is explicitly a work in
progress with JCT itself not yet proved. **[EXTRACT]**

There is a **Coq** mechanisation of the undecidability of the tiling problem, in
the Coq Library of Undecidability Proofs. **[EXTRACT]** That is about Wang
tiles and decidability, not about geometry, so it is not a foundation for us.

### 5.3 Concrete assessment for *our* proof

**Would formalise well — genuinely finite, decidable, and already exact here:**

| our obligation | why it is easy in a proof assistant |
|---|---|
| Exact `Z[ζ₁₂]` arithmetic | Unique integer representation (4 coefficients, d⁴ = d²−1). `decide`-able equality. A `Zeta12` structure over `ℤ` with a ring instance is a day's work. Our `zKey` is already a canonical form. |
| Non-crossing matchings per leaf type | Finite enumeration per type (≤ 5 dots ⇒ ≤ 2 options in our configs). `Finset` + `decide`. |
| Welded degree ≤ 2, junction-freeness | A finite predicate on a finite patch, plus the structural argument that no class-0 edge is selected. |
| Routing automaton iteration and its 2-cycle | A function on a finite state set; "routing states lie on a 2-cycle with pre-period 0" is `decide` on a finite orbit. This is the mathematically interesting part and it is *finite*. |
| The Cayley–Hamilton argument for quad-point incidence | Linear algebra over a number field; mathlib has `Matrix.charpoly` / `aeval_self_charpoly`. Moderate. |
| Growth factor, Perron eigenvector, frequencies, segments-per-tile | Exact algebra in ℚ(√15); mathlib handles `ℚ⟮√15⟯` fine. Cheap. |
| Circuit-freeness at each level, given the automaton | Falls out of the automaton once it is formalised. |

**Would formalise badly, or not at all yet:**

| our obligation | obstruction |
|---|---|
| **L0 — the patch is a tiling** (disjoint interiors, no gaps) | Our proof is a **winding-number identity on 1-chains**. mathlib has winding numbers for loops in ℂ but not a packaged "additivity of covering multiplicity over a chain of simple polygons". This is Myers' **step 13** territory, and he estimates it at "as much work as all the other steps combined", possibly needing Euler's formula for plane maps and/or the **Jordan Curve Theorem — which is not in mathlib**. |
| **The crux lemma** (children tile the parent, arcs coincide) | Same category: a statement about polygons fitting together. Either it is cited from SMKGS (and then you must formalise SMKGS, i.e. Myers' steps 8–11 + 13), or it is proved geometrically (step-13-hard). |
| **The limit argument** (T1–T5 ⇒ continuous surjection onto positive measure) | Genuinely analytic. mathlib *does* have uniform convergence, `Metric.completeSpace`, Hausdorff measure and Lebesgue measure, so the three-line real-analysis paragraph is plausible — **conditional on the geometry above already being formalised**. Realistically this is the *least* of the problems, not the most. |
| **Finite local complexity** (our open gap for the spectre) | Needs the geometric layer. In the abstract it is a standard hypothesis (Frank–Sadun: "a tiling has FLC with respect to G if it contains only finitely many connected two-tile patches up to motions from G" **[EXTRACT]**), but proving it for our patches is geometry. |

**The honest bottom line.** A machine-checked proof of the FASS theorem is
**not currently realistic as a standalone project**, for one reason: it sits on
top of L0 and the crux, which sit on top of exactly the formalisation that the
paper's own author estimates as the dominant cost and which depends on results
(Jordan curve / Euler for plane maps) that mathlib does not have. What **is**
realistic, and worth doing:

1. **Formalise the combinatorial core in isolation**, taking L0 and the crux as
   *hypotheses*. That gives a theorem of the shape "*if* the level-`k` patch is a
   tiling and the gluing/outer maps are level-independent, *then* the strand
   diagram at the Psi root is a single arc visiting every tile, for all `k`". The
   routing automaton, circuit-freeness, degree bounds and the arithmetic are all
   inside it. This is a self-contained, achievable Lean project — weeks, not
   years — and it isolates precisely what we do not yet know.
2. **Watch `jsm28/AperiodicMonotilesLean`.** When its steps 8–13 land, the
   hypotheses in (1) become discharge-able by citation rather than assumption.
   Our combinatorial core is designed to plug into exactly that interface.
3. **Do not attempt the geometry independently.** Winding numbers over polygon
   chains in Lean is a research project in its own right.

### What this means for our proof

* The paper should say: *the finite combinatorial content is decidable and
  mechanisable; the tiling and limit layers are not, and the limiting factor is
  the absence of plane topology (Jordan curve / Euler) in current libraries.*
  That is a defensible, checkable claim and it names the actual blocker.
* `docs/FASS_PROOF.md` §6's closing paragraph ("the finite parts … are all well
  suited to a proof assistant … the limit argument … would need real analysis")
  is **right about the finite parts but wrong about the ranking**. The limit
  argument is the *cheap* analytic part (mathlib has Hausdorff measure and
  uniform convergence). The expensive part is **L0 and the crux — plane
  topology**, not the limit. Rewrite that paragraph.
* If a formalisation is ever attempted, structure the Lean development to take
  L0 and the crux as hypotheses from day one, so the combinatorial theorem is
  provable now and the geometry can be discharged later.

---

## 6. Summary

### 6.1 The five things the write-up must say

1. **FASS's "self-avoiding" is about the approximants.** Netto's theorem makes an
   injective space-filling limit impossible. Our per-level self-avoidance results
   are the right target, not a weakened one.
2. **The Hilbert template transplants without geometric self-similarity.** What
   it needs is *containment* (children inside parents) + *vanishing relative
   diameter* + *exhaustion* + a *fixed combinatorial rule* — never similarity.
   Our open crux lemma **is** Hilbert's hypothesis H3.
3. **The repo's `hex` family is SMKGS's own marked-hexagon combinatorial
   inflation**, not an uncited invention: nine hexagons Γ Δ Θ Λ Ξ Π Σ Φ Ψ, eight
   edge classes, Γ the unique type expanding to two spectres, 54 translational
   prototiles. `docs/FASS_PROOF.md` §4.1 should be corrected.
4. **λ = 4 + √15 (a PV unit), linear factor √(4+√15), and a reflection at every
   inflation step** are all in the published literature and all match this repo
   exactly — including the mirror that produces our period-2 behaviour.
5. **Our negative result is the published state of affairs.** SMKGS's inflation
   is combinatorial; supertile shapes change at every deflation; the exactly
   self-similar representative (CASPr) is topologically conjugate but **not MLD**
   to the Spectre, so we cannot borrow its similarity.

### 6.2 The five fetches to redo when egress allows

Ranked by how much they would change the proof:

1. **[spectre] arXiv:2305.17743 §§4–5**, especially **Figures 4.1, 4.2, 5.3** —
   to (a) verify the level-independence wording verbatim, (b) match our
   `SUPER_RULES` / `T_RULES` slot-by-slot to the published substitution, (c)
   confirm the eight hexagon edge labels against `HEX_EDGE_LABELS`. This is what
   converts Route 1 from "probably legitimate" to "cited".
2. **Özkaraca, arXiv:2204.11111** — the exact statement of the "mild condition"
   on a planar substitution that yields a Lebesgue-type space-filling curve. If
   we satisfy it, obligation (6) of §1.4 is a citation, not a proof.
3. **Chéritat, arXiv:2407.05359** — the precise statement of his
   non-computer-assisted proof that Spectre tilings are uniquely hierarchical,
   and how his hex clusters relate to ours.
4. **BGMS, arXiv:2411.15503** — verbatim confirmation of λ, the reflection step,
   the 54 prototiles, and CASPr's non-MLD status.
5. **ABOP / the 1991 FASS chapter** — the literal definition sentence, for a
   clean quotation in §1.

### 6.3 Things I could not verify at all

* Whether SMKGS state level-independence as a **numbered theorem** (and which
  number), or only as construction-plus-figures. Everything I have is
  paraphrase.
* Whether the marked-hexagon edge labels in [spectre] Fig. 4.1 correspond to our
  major classes under a *fixed* relabelling. The counts (8 and 9) match; the
  bijection is unverified.
* The exact ABOP section and page for the FASS definition (I have §1.4.1 "Edge
  rewriting" from a server-side read only).
* Frank–Sadun's fusion-tiling definitions verbatim (`pages.vassar.edu` blocked).
  I quote only the FLC definition, at **[EXTRACT]** level. The *fusion* framework
  is, on its face, the right abstract home for a hierarchical tiling whose
  supertiles are not geometrically self-similar — "general fusion rules … allow
  for defects, changes in geometry, and even constrained randomness"
  **[EXTRACT]** — and is worth a proper look.
* Whether any unindexed preprint/blog/thesis already draws a space-filling curve
  on a hat or spectre tiling. §4.2's absence is search-based only.

---

## 7. Bibliography

**FASS curves and space-filling curves**

* P. Prusinkiewicz, A. Lindenmayer, F. D. Fracchia, *Synthesis of space-filling
  curves on the square grid*, in Peitgen–Henriques–Penedo (eds.), **Fractals in
  the Fundamental and Applied Sciences**, North-Holland, 1991, 341–366.
* P. Prusinkiewicz, A. Lindenmayer, **The Algorithmic Beauty of Plants**,
  Springer, 1990 — Ch. 1, §1.4.1 "Edge rewriting".
  <https://algorithmicbotany.org/papers/abop/abop.pdf> (blocked this session)
* D. Hilbert, *Über die stetige Abbildung einer Linie auf ein Flächenstück*,
  Math. Ann. **38** (1891), 459–460.
* H. Sagan, **Space-Filling Curves**, Springer Universitext, 1994 (Ch. 2:
  Hilbert's curve).
* E. Netto (1878/79) — no continuous bijection $[0,1]\to[0,1]^2$.
* H. Haverkort, *Plane-filling trails*, SoCG 2020 Media Exposition,
  LIPIcs 164, art. 81; arXiv:2003.12745.
* M. İ. Özkaraca, *Planar substitutions to Lebesgue type space-filling curves…*,
  J. Math. Anal. Appl. **530** (2024) 2; arXiv:2204.11111.
* X.-R. Dai, H. Rao, S.-Q. Zhang, *Space-filling curves of self-similar sets*
  (I) arXiv:1509.06276, (II) Nonlinearity **32** (2019) 1772–…, arXiv:1511.05411,
  (III) arXiv:1804.10480.

**The hat and spectre**

* D. Smith, J. S. Myers, C. S. Kaplan, C. Goodman-Strauss, *An aperiodic
  monotile*, Combinatorial Theory **4**(1) (2024) #6; arXiv:2303.10798.
* — , *A chiral aperiodic monotile*, Combinatorial Theory **4**(2) (2024) #13;
  doi:10.5070/C64264241; arXiv:2305.17743.
* M. Baake, F. Gähler, L. Sadun, *Dynamics and topology of the Hat family of
  tilings*, Israel J. Math. (2025); arXiv:2305.05639.
* M. Baake, F. Gähler, J. Mazáč, L. Sadun, *On the long-range order of the
  Spectre tilings*, Discrete Comput. Geom. (2025);
  doi:10.1007/s00454-025-00756-z; arXiv:2411.15503.
* M. Baake, F. Gähler, J. Mazáč, A. Mitchell, *Diffraction of the Hat and
  Spectre tilings and some of their relatives*, J. Math. Phys. **66** (2025)
  092707; arXiv:2502.03268.
* A. Chéritat, *Observations on the hex clusters of the Spectre tilings*,
  arXiv:2407.05359.
* S. Labbé, P. Selinger, *A construction of the hat tilings by a Markov
  partition*, arXiv:2604.20964.
* *Homochiral inflation for the aperiodic monotile Tile(1,1)*, arXiv:2502.15608.
* S. Tatham, *Finite-state transducers for substitution tilings*,
  arXiv:2512.16595.

**Hierarchical-tiling frameworks**

* N. P. Frank, L. Sadun, *Fusion: a general framework for hierarchical tilings of
  $\mathbb R^d$*, Geom. Dedicata (2014); arXiv:1101.4930.

**Curves on aperiodic tilings (prior art)**

* R. Hassell, *A Plane-Filling Curve Using Ammann A5 Tiles*, Bridges 2014,
  389–392.
* F. Henle, *Space-Filling Curves on Non-Periodic Tilings*, G4G12 gift exchange.
* S. Singh, J. Lloyd, F. Flicker, *Hamiltonian Cycles on Ammann–Beenker
  Tilings*, Phys. Rev. X **14** (2024) 031005; arXiv:2302.01940.
* S. Singh, F. Flicker, *Exact solution to the quantum and classical dimer models
  on the spectre aperiodic monotiling*, Phys. Rev. B **109** (2024) L220303.
* S. Le, *The Art of Space Filling in Penrose Tilings and Fractals*,
  arXiv:1106.2750 — **decorative art, not mathematical prior art**.

**Formalisation**

* J. S. Myers, **AperiodicMonotilesLean**,
  <https://github.com/jsm28/AperiodicMonotilesLean> (Apache-2.0).
* mathlib4, `Mathlib/Combinatorics/Tiling/Tile.lean`;
  `Mathlib/MeasureTheory/Measure/Hausdorff.lean`.
* Jordan Curve Theorem: Mizar (Korniłowicz et al., 2005), HOL Light (Hales,
  2007); **not** in mathlib4. Lean 4 WIP: <https://github.com/alok/JordanCurveTheorem>.
* Coq Library of Undecidability Proofs — mechanised undecidability of the tiling
  problem.
