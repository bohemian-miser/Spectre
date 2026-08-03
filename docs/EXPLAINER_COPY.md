# The Tile With the Tail

*A parity puzzle hiding in the world's newest bathroom floor.*

---

I want to draw all over my bathroom floor. Not freehand — with a rule. The floor is tiled with Spectres, the wiggly 14-sided shape that made headlines in 2023 for tiling the plane without ever repeating itself, and the rule goes like this: mark certain edges, and wherever an edge is marked, a line punches through it — out of one tile, into the next. Inside each tile, loose line-ends find each other and join up. Do this everywhere at once and the floor fills with curves that wander from tile to tile and, if we're lucky, close up into cute lil circuits.

*If* we're lucky. Because for some choices of rule, somewhere out there sits a tile whose lines can't all pair up. One end is left dangling, unfinished, going nowhere. A tile with a tail. It is a genuinely sad sight, and this page is about never seeing it again.

## Meet the Spectre (briefly)

The Spectre is the "chiral aperiodic monotile" discovered by David Smith, Joseph Samuel Myers, Craig Kaplan, and Chaim Goodman-Strauss ([arXiv:2305.17743](https://arxiv.org/abs/2305.17743)), the follow-up to their famous [hat](https://arxiv.org/abs/2303.10798). One shape, no reflections needed, and it tiles the plane — but only aperiodically. I won't retell that story here (Kaplan's [Spectre page](https://cs.uwaterloo.ca/~csk/spectre/) does it beautifully). We only need one piece of machinery from the proof.

To prove aperiodicity, the authors sort Spectres into nine types — Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi — by the role each plays in the hierarchy. The Gamma role is played by a snuggled-up *pair* of Spectres (the "Mystic"), so in our tables Gamma splits into Gamma1 and Gamma2: ten characters in the cast. There's also a stunt-double version of the whole system made of marked hexagons (the combinatorial skeleton of the proof), plus the hat/turtle families; same bookkeeping, comfier geometry.

## Numbers on the edges

Here's the machinery we're stealing. In the proof, every edge of every tile type carries a label. Mine look like `3.0A` or `-5.1A`: a **class** number from 0 to 8 (the part we care about), a minus sign saying which side of a junction you're on (a `3` edge always glues to a `-3` edge next door), a **minor** index, and an A/B letter for the rare tile owning two junctions of the same class. Full disclosure: these aren't verbatim from the paper — I tidied them into this major.minor + A/B scheme, and I changed some −4's into 6's (the weird Sigma edge thing). Now everything is happy.

The minor index matters because the natural "edges" of the system — call them **seams** — are often longer than one physical edge of the 14-gon. A class-2 seam is three little edges walking in single file (`2.0`, `2.1`, `2.2`); the class-7 seam is four; class 8 is a loner with just one. Each tile has about six seams wrapping around its 14 physical edges. A seam is one handshake between two tiles, however many knuckles it involves.

> [WIDGET: single-tile edge hover — a lone Delta Spectre; mousing over any of its 14 physical edges lights up that edge's full label (`3.0A`, `-5.1A`, ...) and softly highlights the rest of its seam; a sidebar tallies Delta's six seams by class: 3, 2, −5, 1, −3, −6]

> [WIDGET: seam handshake — a Theta glued to a neighbour along a class-2 seam; hovering shows the same three physical edges labelled `2.0A/2.1A/2.2A` from Theta's side and `-2.2A/-2.1A/-2.0A` from the neighbour's, so the reader sees one seam = one handshake]

## The game, and the fine print

Now, the rule. Pick a set of classes — any subset of {0, 1, ..., 8}. Every seam whose class you picked gets exactly one crossing point, where the line punches through. Then, inside each tile, we play matchmaker: pair up the crossing points on the boundary and connect each pair with a stroke. Strokes meet at the shared crossings, and the curves snake across the floor with no regard for where one Spectre ends and the next begins.

Where on the seam does the line cross? Anywhere you like! Each class gets its own **edge contract**: class 2 might cross at the pointy-er spot between the `2.1` and `2.2` edges, class 5 three-fifths of the way up its `.1` edge — whatever, as long as the `+` and `−` versions agree, so both sides of the handshake meet at the same spot. One exception: class 0 only ever glues to another class 0, so its contract must be symmetric — cross at the seam's own centre of symmetry, or the two copies miss each other. (The Explorer honours this: its class-0 crossing sits on the seam's middle corner.)

> [WIDGET: edge-contract slider — two tiles glued along a class-2 seam; the reader drags the crossing point anywhere along the seam and both tiles' strokes re-route to keep meeting there; switching to a class-0 seam locks the handle to the centre with a tooltip: "0 meets itself — symmetric contracts only"]

## Three lines walk into a Theta

Let's play. Select class 2, put the crossing at that pointy-er spot between `2.1` and `2.2`, and draw.

> [WIDGET: first lines — a patch of ~30 Spectres with class 2 selected; crossings bloom on every 2-seam and strokes draw themselves; camera lingers on a Lambda happily joining its two 2-crossings with a single chord]

Lots of tiles are fine. But look at Theta. Theta owns *three* class-2 seams (a `2A`, a `2B`, and a `−2`), so three lines come charging in. Now — we *could* just join all 3 lines in one spot, and technically nothing would dangle. But... I don't want to. I want each edge to join exactly one other edge, so the drawing stays a clean weave and we make nice circuits, not train stations. That's the aesthetic, and I'm holding the crayon.

Under that rule, Theta is doomed: three ends, one happy pair, one leftover. A tail. It gets worse — try class 1 alone and poor Delta doesn't even get a junction to refuse: it owns exactly *one* 1-seam, so a line barges in and simply stops.

> [WIDGET: the sad tile — camera on a Theta with class 2 selected; its three crossings pulse, a ghost preview shows the rejected three-way join, then the chosen pairing leaves one end fraying red; caption: "Three is odd. Theta is sad." A side panel shows Delta under class 1: one lonely crossing, maximum sadness]

So class 2 alone is a bad rule, and class 1 alone is a bad rule. Are there good ones? The empty set works (draw nothing, offend no one), but that's the coward's answer.

## Your turn

Before I spoil it: which subsets of {0, ..., 8} leave *every* tile type with an even number of crossings? There are 512 candidates. Genuinely — go push buttons. I'll wait.

> [WIDGET: puzzle console — nine toggle chips (0–8) over a live Spectre patch; every toggle redraws crossings and strokes instantly; a counter shows how many tile types currently have tails, a tracker shows how many of the 512 subsets you've explored, and finding a tail-free nonempty subset earns a small confetti burst; no answers are revealed]

Found one? Found *two*? Notice anything about combining them?

## Fingerprints

Here's how I actually found them, before any fancy words. Try each class alone and write down *which* tile types come out odd — call that the class's fingerprint. Class 7's fingerprint is just the Mystic twins, Gamma1 and Gamma2. Class 8 upsets Theta, Lambda, Xi and Pi. And then the jackpot: class 1 and class 5 have the *exact same* fingerprint — Delta, Lambda, Xi, Sigma, Psi. Same five sad tiles. So switch both on: every tile that was going to be odd gets odded twice, which is to say, not at all. {1, 5} draws clean.

Then keep going. Combine sets, note each new odd/even pattern, remember the smallest set producing it, and combine until nothing new shows up. Two different sets with matching fingerprints are a winner in disguise: {1, 7} and {2, 8} upset the same seven tiles, so {1, 2, 7, 8} upsets nobody. Eventually you've seen every fingerprint the system can make — and can list everything that lands on all-zeros.

Math nerds will have recognised the game several paragraphs ago: only oddness matters (matchmaking eats crossings two at a time), oddness is arithmetic mod 2, and "which subsets hit all-even" is asking for the **kernel of a matrix over GF(2)**.

## The matrix

So here's the bookkeeping device, counted straight off the tile definitions: one row per tile type, one column per edge class, entries = how many seams of that class the tile owns (ignoring minor edges — one count per handshake):

| tile ↓ class → | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| Gamma1 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| Gamma2 | 0 | 0 | 1 | 1 | 1 | 0 | 1 | 1 | 0 |
| Delta  | 0 | 1 | 1 | 2 | 0 | 1 | 1 | 0 | 0 |
| Theta  | 1 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 1 |
| Lambda | 0 | 1 | 2 | 1 | 0 | 1 | 0 | 0 | 1 |
| Xi     | 1 | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 1 |
| Pi     | 0 | 2 | 1 | 0 | 0 | 2 | 0 | 0 | 1 |
| Sigma  | 0 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| Phi    | 1 | 0 | 2 | 1 | 0 | 2 | 0 | 0 | 0 |
| Psi    | 1 | 1 | 1 | 0 | 0 | 3 | 0 | 0 | 0 |

Read it mod 2 — evens are zeros, odds are ones. A subset of classes is a 0/1 vector **x**, a tile is happy when its selected entries sum to 0 mod 2, and everyone happy at once means M**x** = **0**. The good subsets are exactly the kernel.

Watch it work. Take {5} alone: column 5 has odd entries at Delta, Lambda, Xi, Sigma and Psi — five sad rows, five kinds of tail. Now take {1, 5}: those same five rows each pick up a second odd entry from column 1 (1 + 1 = 0), and every other row only adds evens (Pi gets 2 + 2). Ten happy rows; {1, 5} is in the kernel.

> [WIDGET: matrix explorer — the table above, live; hovering a column highlights those seams on a filmstrip of all ten tile types and shows that class's fingerprint; clicking column headers builds a subset, each row sums mod 2 in view, red for odd; preset buttons for {5} (five red rows) and {1,5} (all green)]

## The eight answers

Run the elimination — or brute-force all 512, like the site does in `getValidEdgeCombinations` — and the kernel turns out to have exactly **8** members:

∅ · {1,5} · {0,1,3,6} · {0,3,5,6} · {1,2,7,8} · {2,5,7,8} · {0,2,3,6,7,8} · {0,1,2,3,5,6,7,8}

And here's a treat for the math nerds: these 8 form a *group* under symmetric difference. Combine any two solutions — keep everything that's in exactly one of them — and you get another solution. Watch: {0,1,3,6} + {1,5} → the two 1s cancel → {0,3,5,6}. Right there on the list. Try any pair; it always works, because XOR-ing two all-even patterns can only make another all-even pattern. (It's (ℤ/2)³: eight elements, three generators, every element its own inverse.)

Two easter eggs in the list. First: class 4 appears in *no* solution, ever. Sigma and Gamma2 each carry a lone 4-seam, and the algebra offers no way to bail them out — class 4 sits out every dance. That's why the grandest member is "everything except 4": switch on all nine classes and precisely the two tiles holding a 4 will sulk. Second: class 7 is the Mystic's private seam — it exists only where Gamma1 glues to Gamma2, hidden inside the pair (the Explorer labels it `7(M)`) — and it never goes out without chaperones 2 and 8.

> [WIDGET: kernel gallery — eight cards, one per valid subset, each rendering the same Spectre patch under that rule; the ∅ card is cheekily blank; the {0,1,2,3,5,6,7,8} card seethes with lines; badges call out "4 never invited" and "7 = Mystic seam"; clicking two cards animates their symmetric difference morphing into a third]

## One kernel, endless drawings

A valid subset guarantees every tile an *even* number of crossings — but says nothing about *which* pairs up with which. A tile with 4 crossings has 3 perfect matchings. Under {1,5}, a Psi has four crossings and three moods; under richer subsets, tiles have handfuls of options each, every tile chooses independently, and the number of distinct global drawings from one kernel element explodes combinatorially.

And the choices *matter*. The same subset, re-matched, flips between a lace of tiny closed circuits and a single line that refuses to die. In exhaustive runs on a level-6 supertile ([`graph_analysis/`](../graph_analysis/)), one configuration's longest circuit closes after 27,621 segments; another sends an open path wriggling for 248,348 segments before it runs out of floor.

> [WIDGET: the matchmaker slider — a single Psi tile under {1,5} with its four crossings; a slider cycles through the three perfect matchings, strokes reconnecting live; a second slider does the same for a Theta under {2,5,7,8}]

> [WIDGET: circuits vs. wanderers — a large patch under {2,5,7,8} with two preset matching profiles, e.g. the Explorer's `2578-0100101100`; profile A dissolves into small circuits coloured by length, profile B into a few enormous rainbow paths; a toggle crossfades between them with live counts of circuits and open paths]

## Mirrors all the way up

One last wrinkle before the questions that keep me up at night. Spectre floors are grown by a supertile algorithm, and each level of that algorithm *mirrors* the previous one — the pattern flips between iterations. Whatever your lines do at one scale, they do it backwards at the next, for ever.

Which is exactly why I can't stop staring at these drawings. As the floor grows without bound:

- Do these combos make a **finite or an infinite set of circuits**? Do new circuit shapes keep appearing as we expand, or does the menagerie eventually close?
- Are there **infinite lines** — paths that never close and never end? I think I've found one: edges {2,5,7,8} with matching combination `0100101100` just keeps *going*. (Four configurations in our census have produced no circuits at all, which smells a lot like lines that never come home.)
- If infinite lines exist, are there **finitely or infinitely many** of them?
- And the big one: could a single path **join everything** — one line threading the entire aperiodic floor?

I don't know yet. But the [Explorer](../web/) will let you toggle classes, drag every tile's matchmaker, and watch circuits light up by length — and the stats page has the full census: every kernel element, every matching profile, tail counts, circuit-length spectra, and those four suspicious wanderers. Go find a longer wriggle than mine.

---

## Appendix: reconciling the counts

**What the matrix counts.** "Ignoring minor edges" means one count per seam, and that's exactly what the site's game logic does: in `web/src/analysis.ts`, `getEdgeDotCount` counts only labels with minor index `.0` — one crossing per handshake. Recounting all ten rows straight from `unique_edge_labels` in `web/src/tiles.ts` reproduces the published matrix above entry for entry, and brute-forcing all 512 subsets against it yields exactly the 8 kernel elements, matching the computation in `Spectre_Patterns.ipynb` (which builds the same set by the fingerprint-combining method; basis {`0356`, `1278`, `15`}). Counting *physical* 14-gon edges instead would mislead: Delta owns two physical class-5 edges but only one 5-seam, and one crossing per handshake is what actually gets drawn.

**Edge contracts in the code.** The Explorer's default contract puts each crossing at the midpoint of the seam's `.0` edge — well defined because the two sides of a seam list their minors in opposite directions, landing both tiles' `.0` on the same physical edge. Class 0 (which glues to itself) gets the symmetric treatment the main text demands: its crossing sits on the seam's middle vertex (`getEdgeDotMidpoints` special-cases major 0).

**Label cleanup.** The labels are the author's tidied version of the proof's markings — major.minor plus A/B variants (Theta has `2A` and `2B` seams; Psi has `5A` and `5B`), with some −4's renamed to 6's around the weird Sigma edge so every `+` junction has a matching `−`. Relatedly, Sigma has only 5 seams: its class-4 seam is four physical edges (`4.0A`–`4.3A`) wrapping cyclically around the start/end of its edge list. Five is odd, which is one reason "select everything" fails — and Sigma's partner in failure, Gamma2, is the other tile holding a 4.

**Mystic subtleties.** Class 7 occurs only as Gamma1's `7.0A`–`7.3A` glued to Gamma2's `−7` run: the internal seam of the Mystic pair, four physical edges long, labelled `7(M)` in the UI. One class-2 seam *straddles* the pair: Gamma1 carries only the tail-end edge `2.2A` (which never bears a crossing — no `.0`), while the crossing-bearing `2.0A` lives on Gamma2. So splitting Gamma into Gamma1/Gamma2 genuinely changes the matrix — you can't fuse the pair into one row and get the same kernel.

**Hexagons differ.** The marked-hexagon skeleton (`hex_edge_labels`) plays a slightly different parity game: hexagon-Gamma is one fused tile with no class-7 edges at all, and hexagon-Sigma carries a class-6 edge the Spectre Sigma lacks. Its kernel is a 16-element space (including {7} alone, vacuously). The eight answers above are specifically the Spectre's.
