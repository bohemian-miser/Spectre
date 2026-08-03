# The Tile With the Tail

*A parity puzzle hiding in the world's newest bathroom floor.*

---

Suppose we've just tiled an infinite bathroom floor with Spectres — the wiggly 14-sided shape that made headlines in 2023 for tiling the plane without ever repeating itself. And suppose, because we cannot leave nice things alone, we now want to *draw* on it. Not freehand: we want a rule. Mark certain edges, and wherever an edge is marked, a line punches through it — out of one tile, into its neighbour. Inside each tile, loose line-ends find each other and join up. Do this everywhere at once and the whole floor fills with curves: loops, meanders, who knows.

Mostly this works. But for some choices of rule, somewhere out there sits a tile with an *odd* number of line-ends poking through its boundary. Its lines pair up as best they can, and one end is left over — dangling, unfinished, going nowhere. A tile with a tail. It is a genuinely sad sight, and this whole page is about never having to see it again.

## Meet the Spectre (briefly)

The Spectre is the "chiral aperiodic monotile" discovered by David Smith, Joseph Samuel Myers, Craig Kaplan, and Chaim Goodman-Strauss ([arXiv:2305.17743](https://arxiv.org/abs/2305.17743)), the follow-up to their famous [hat](https://arxiv.org/abs/2303.10798). One shape, no reflections needed, and it tiles the plane — but only aperiodically. We won't retell that story here (Kaplan's [Spectre page](https://cs.uwaterloo.ca/~csk/spectre/) does it beautifully). We only need one piece of machinery from the proof.

To prove aperiodicity, the authors sort Spectres into nine types — Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi — according to the role each plays in the hierarchy. The Gamma role is played by a snuggled-up *pair* of Spectres (the "Mystic"), so in our tables Gamma splits into Gamma1 and Gamma2, giving ten characters in the cast. There's also a stunt-double version of the whole system made of marked hexagons, and the hat/turtle families; same combinatorics, comfier geometry.

## Numbers on the edges

Here's the machinery we're stealing. In the proof, every edge of every tile type carries a label. Our labels look like `3.0A` or `-5.1A`: a **class** number from 0 to 8 (the part we care about), a minus sign saying which side of a junction you're on (a `3` edge always glues to a `-3` edge next door), a minor index, and a letter for the rare tile that owns two junctions of the same class.

That minor index matters, and here's why: the natural "edges" of the system — call them **seams** — are often longer than one physical edge of the 14-gon. A class-2 seam is three little edges walking in single file (`2.0A`, `2.1A`, `2.2A`); the class-7 seam is four; class 8 is a loner with just one. Each tile has about six seams wrapping around its 14 physical edges. A seam is one handshake between two tiles, however many knuckles it involves.

> [WIDGET: single-tile edge hover — a lone Delta Spectre; mousing over any of its 14 physical edges lights up that edge's full label (`3.0A`, `-5.1A`, ...) and softly highlights the rest of its seam; a sidebar tallies Delta's six seams by class: 3, 2, −5, 1, −3, −6]

> [WIDGET: seam handshake — a Theta glued to a neighbour along a class-2 seam; hovering shows the same three physical edges labelled `2.0A/2.1A/2.2A` from Theta's side and `-2.2A/-2.1A/-2.0A` from the neighbour's, with a single shared crossing-dot appearing on the `.0` edge that both tiles agree on]

## The game

Now, the rule. Pick a set of classes — any subset of {0, 1, ..., 8}. Every seam whose class you picked gets a crossing point: one dot per seam, sitting on its `.0` edge, shared by the tiles on both sides. Then, inside each tile, we play matchmaker: pair up the dots on its boundary and connect each pair with a stroke. Every tile does this, the strokes meet at the shared dots, and suddenly your floor is covered in curves that wander from tile to tile with no regard for where one Spectre ends and the next begins.

> [WIDGET: first lines — a patch of ~30 Spectres with class 1 selected; dots bloom on every 1-seam, then strokes draw themselves inside each tile; camera lingers on a Pi tile happily joining its two 1-dots with a single chord]

## The tail

Try it with just class 1 selected and watch closely. Pi is fine: it owns two 1-seams, two dots, one chord, bliss. But pan over to a Delta. Delta owns exactly *one* 1-seam. One dot. A line charges in from the neighbouring tile... and stops. Nothing to pair with. That's the tail: a loose end that no amount of clever matchmaking inside Delta can fix, because matchmaking needs an even number of guests.

> [WIDGET: the sad tile — same patch, camera pans to a Delta; its single class-1 dot pulses red, the incoming line terminates in a fraying end; caption: "Delta has one 1-seam. One is odd. Delta is sad." Lambda, Xi, Sigma and Psi glow faintly red too — same affliction]

So class 1 alone is a bad rule. Are there good ones? Obviously the empty set works (draw nothing, offend no one), but that's the coward's answer.

## Your turn

Before we spoil it: which subsets of {0, ..., 8} leave *every* tile type with an even number of dots? There are 512 candidates. Genuinely — go push buttons. We'll wait.

> [WIDGET: puzzle console — nine toggle chips (0–8) over a live Spectre patch; every toggle redraws dots and strokes instantly; a counter shows how many tile types currently have tails, a tracker shows how many of the 512 subsets you've explored, and finding a tail-free nonempty subset earns a small confetti burst; no answers are revealed]

Found one? Found *two*? Notice anything about combining them?

## Only oddness matters

Here's the insight that cracks it. Inside a tile, two dots joined by a stroke cancel each other out — matchmaking eats dots two at a time. So the *only* thing that decides sad-or-happy is whether the dot count is even or odd. Not the geometry, not which seams, not where the dots sit. Parity.

And parity is arithmetic in the tiny world of GF(2), where 1 + 1 = 0 and every question is a light switch. Turning on class 5 flips the parity of every tile that owns an odd number of 5-seams. Turning on class 1 as well flips *its* victims. Two wrongs, flipped twice, make a right.

## The matrix

So let's build the bookkeeping device this problem is begging for: one row per tile type, one column per class, and in each cell, the number of seams of that class on that tile — reduced mod 2, because that's all that matters. We counted these straight off the tile definitions (raw counts in the appendix). Here is the mod-2 matrix, with `·` for even:

| tile ↓ class → | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| Gamma1 | · | · | 1 | · | · | · | · | 1 | · |
| Gamma2 | · | · | 1 | 1 | 1 | · | 1 | 1 | · |
| Delta  | · | 1 | 1 | · | · | 1 | 1 | · | · |
| Theta  | 1 | · | 1 | 1 | · | · | · | · | 1 |
| Lambda | · | 1 | · | 1 | · | 1 | · | · | 1 |
| Xi     | 1 | 1 | · | · | · | 1 | · | · | 1 |
| Pi     | · | · | 1 | · | · | · | · | · | 1 |
| Sigma  | · | 1 | 1 | 1 | 1 | 1 | · | · | · |
| Phi    | 1 | · | · | 1 | · | · | · | · | · |
| Psi    | 1 | 1 | 1 | · | · | 1 | · | · | · |

A subset of classes is a 0/1 vector **x**. A tile is happy when the selected entries of its row sum to zero mod 2. Every tile happy at once means M**x** = **0**: the good subsets are exactly the **kernel of M over GF(2)**. Our floor-doodling problem has quietly become linear algebra.

Watch it work. Take {1, 5}: Delta's row has 1s in both columns — sum 0, happy. Lambda: 1 and 1 — happy. Xi, Sigma, Psi: same double-flip. Pi, Theta, Phi, both Gammas: 0 + 0. Ten happy rows; {1, 5} is in the kernel. Now take {5} alone: Delta, Lambda, Xi, Sigma and Psi each show a single 1 in column 5 — five sad rows, five tails. Class 5 flips exactly the tiles that class 1 flips, which is why each is poison alone and the pair is an antidote.

> [WIDGET: matrix explorer — the table above, live; hovering a column highlights those seams on a filmstrip of all ten tile types; clicking column headers builds a subset, and each row XORs the chosen entries in view, flashing red rows for odd sums; preset buttons for {5} (five red rows) and {1,5} (all green)]

## The eight answers

Run the elimination (or brute-force the 512 — the site does, in `getValidEdgeCombinations`) and the kernel turns out to have dimension 3: exactly **8** valid subsets.

∅ · {1,5} · {0,1,3,6} · {0,3,5,6} · {1,2,7,8} · {2,5,7,8} · {0,2,3,6,7,8} · {0,1,2,3,5,6,7,8}

Being a subspace, it's closed under XOR: {1,5} ⊕ {0,1,3,6} = {0,3,5,6}, and every pair combines into another member. Three of them — say {1,5}, {0,1,3,6}, {1,2,7,8} — generate the rest.

Two easter eggs in that list. First: class 4 appears in *no* valid subset, ever. Sigma and Gamma2 each carry a lone 4-seam, and the algebra offers no way to bail them out — class 4 sits out every dance. That's why the grandest member is "everything except 4": switch on all nine classes and precisely two characters sulk, Sigma and Gamma2, the two tiles holding a 4. Second: class 7 is the Mystic's private seam — it exists only where Gamma1 glues to Gamma2, hidden inside the pair (the Explorer labels it `7(M)`) — and it never goes out without chaperones 2 and 8.

> [WIDGET: kernel gallery — eight cards, one per valid subset, each rendering the same Spectre patch under that rule; the ∅ card is cheekily blank; the {0,1,2,3,5,6,7,8} card seethes with lines; badges call out "4 never invited" and "7 = Mystic seam"]

## The payoff: one kernel, endless drawings

Here's where it gets properly fun. A valid subset guarantees every tile an *even* number of dots — but says nothing about *which* dots pair with which. A tile with 4 dots has 3 perfect matchings. Under {1,5}, a Psi tile has four dots and three moods; under richer subsets, tiles have handfuls of options each, and every tile in the patch chooses independently. The number of distinct global drawings from a single kernel element explodes combinatorially.

And the choices *matter*. The same subset, re-matched, flips between a lace of tiny closed circuits and a single line that refuses to die. In our exhaustive runs on a level-6 supertile ([`graph_analysis/`](../graph_analysis/)), one configuration's longest circuit closes after 27,621 segments; another sends an open path wriggling for 248,348 segments; four configurations produce *no circuits at all* — candidate space-filling curves, lines that may simply never come home.

> [WIDGET: the matchmaker slider — a single Psi tile under {1,5} with its four dots; a slider cycles through the three perfect matchings, strokes reconnecting live; a second slider does the same for a Theta under {2,5,7,8}]

> [WIDGET: circuits vs. wanderers — a large patch under {2,5,7,8} with two preset matching profiles, e.g. the Explorer's `2578-0100101100`; profile A dissolves into small circuits coloured by length, profile B into a few enormous rainbow paths; a toggle crossfades between them with live counts of circuits and open paths]

## Go make some tails (or don't)

Everything above is sitting in the [Explorer](../web/): toggle classes, drag the per-tile matching sliders, watch circuits light up by length — and if you *want* to see a sad tile, nobody will stop you. The stats page has the full census: every kernel element, every matching profile, tail counts, circuit-length spectra, and the four configurations that might wander forever. Go find a longer wriggle than ours. First one to a space-filling proof wins.

---

## Appendix: reconciling the counts

**What we counted.** The matrix above counts *seams* (meta-edges), not physical 14-gon edges, because that's what the game logic does: in `web/src/analysis.ts`, `getEdgeDotCount` counts only labels with minor index `.0` — one crossing per seam — and `getEdgeDotMidpoints` places the dot on that `.0` edge. The two sides of a glued seam list their minors in opposite directions in `web/src/tiles.ts`, which lands both tiles' `.0` on the *same* physical edge: the shared dot is well defined. Brute-forcing all 512 subsets against this counting yields exactly the 8 kernel elements above, matching the notebook's computation in `Spectre_Patterns.ipynb` (basis {`0356`, `1278`, `15`} there — the same subspace).

**Raw seam counts** (from `unique_edge_labels` in `web/src/tiles.ts`; bold = odd):

| tile | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | seams |
|---|---|---|---|---|---|---|---|---|---|---|
| Gamma1 | 0 | 2 | **1** | 0 | 0 | 0 | 0 | **1** | 0 | 4 |
| Gamma2 | 0 | 0 | **1** | **1** | **1** | 0 | **1** | **1** | 0 | 5 |
| Delta  | 0 | **1** | **1** | 2 | 0 | **1** | **1** | 0 | 0 | 6 |
| Theta  | **1** | 0 | **3** | **1** | 0 | 0 | 0 | 0 | **1** | 6 |
| Lambda | 0 | **1** | 2 | **1** | 0 | **1** | 0 | 0 | **1** | 6 |
| Xi     | **1** | **1** | 2 | 0 | 0 | **1** | 0 | 0 | **1** | 6 |
| Pi     | 0 | 2 | **1** | 0 | 0 | 2 | 0 | 0 | **1** | 6 |
| Sigma  | 0 | **1** | **1** | **1** | **1** | **1** | 0 | 0 | 0 | 5 |
| Phi    | **1** | 0 | 2 | **1** | 0 | 2 | 0 | 0 | 0 | 6 |
| Psi    | **1** | **1** | **1** | 0 | 0 | **3** | 0 | 0 | 0 | 6 |

**A discrepancy worth flagging: class 5 alone.** The draft brief for this page suggested "select 5 and it works out." That's true if you count *physical* edges — every tile type owns an even number of physical class-5 edges (Delta 2, Pi 4, Phi 4, Psi 6, ...). But the game places one crossing per *seam*, and Delta, Lambda, Xi, Sigma and Psi each own an odd number of 5-seams, so {5} alone gives five tail-prone tile types. The honest minimal hero is {1,5}. (Physical-edge counting also can't be the right model globally: its kernel has 128 elements — its only constraint is "classes 1, 2, 8 travel together" — and it disagrees with the site, the notebook, and the drawings.)

**Mystic subtleties.** Class 7 occurs only as Gamma1's `7.0A–7.3A` glued to Gamma2's `-7` run: the internal seam of the Mystic pair, four physical edges long, labelled `7(M)` in the UI. Also, one class-2 seam *straddles* the pair: Gamma1 carries only the tail-end edge `2.2A` (never dotted — no `.0`), while the dot-bearing `2.0A` lives on Gamma2. So Gamma1's column-2 entry comes from its ordinary `-2` seam alone, and splitting Gamma into Gamma1/Gamma2 genuinely changes the matrix — you can't treat the pair as one row and get the same kernel.

**Sigma's wraparound.** Sigma has only 5 seams: its class-4 seam is four physical edges (`4.0A–4.3A`) wrapping cyclically around the start/end of its edge list. With five seams (an odd number), Sigma is doomed under "select everything" — one reason the full set {0,...,8} fails.

**Hexagons differ.** The marked-hexagon system (`hex_edge_labels`) is the proof's combinatorial skeleton, but its parity game is *not* identical: hexagon-Gamma is one fused tile with no class-7 edges at all, and hexagon-Sigma carries a class-6 edge the Spectre Sigma lacks. Its kernel is a 16-element space (including {7} alone, vacuously). The eight answers above are specifically the Spectre's.
