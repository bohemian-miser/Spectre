# Circuit classes

Sorts every combination (family × valid edge rule × non-crossing pairing) by
what its strands do as the patch grows:

| class | what you see | signature (level 4 → 6) |
|---|---|---|
| `triangle` | triangles nested in triangles (Sierpinski-like) | biggest circuit grows ∝ N^0.7 (dimension ≈ 1.4), fits an equilateral triangle (tri ≥ 0.8), encloses ≈ 60% of its hull |
| `thin` | circuits that wander like a line but close up | grows ∝ N^0.85 (dimension ≈ 1.7), encloses < 30% of its hull |
| `line` | an infinite line, possibly with small loops beside it | no circuit grows; one open strand grows ∝ N^≥0.9, fills its hull (≥ 0.35) and carries ≥ half the segments |
| `mixed` | space-filling and triangular at once | growing triangular circuit that covers ≥ 45% of its hull, or a space-filling line next to growing circuits |
| `blob` | space-filling circuits that are not triangular | growing circuit covering ≥ 45% of its hull, tri < 0.8 |
| `bounded` | only small loops | nothing grows |
| `unclear` | falls between thresholds | look at it |

The thresholds are all at the top of `classify.py`, in `THRESHOLDS`.
`export-site.py` copies them into `meta.json`, and the page's "How a class is
decided" section reads them from there, so it cannot drift from the classifier.

The "dimension" numbers are estimates. A patch of N tiles is about √N wide, so
a curve of dimension d that spans it has length about N^(d/2), and d ≈ 2 × gC.
The page also shows a mass-radius estimate, `log(Lc₆/Lc₄) / log(Rg₆/Rg₄)`,
which compares the biggest circuit's length with its own radius of gyration.
Both come from one two-level window (level 4 to 6, about 62 times the tiles),
the biggest circuit at each level is a different circuit, and the patch edge
can cut the level-4 one short, so treat them as rough.

## Files

- `../src/core/strandGraph.ts` (shared with the site) welds the connection
  points of one (family, rule, level) once into integer nodes. A combination
  is then just a pairing of occurrences inside each tile, evaluated with a
  flood fill over typed arrays. `engine.ts` re-exports it under the sweep's
  names.
- `features.ts` computes, per combination and level, the components, open vs
  closed, and for the largest ones the fill, fat, tri and elongation.
- `sweep.ts` enumerates every combination of a rule (sharded, resumable) and
  writes one JSON line each to `data/` (gitignored; about 4 KB a line).
- `classify.py` turns the lines into classes (CSV on stdout).
- `export-site.py` packs every class and measurement into
  `web/public/data/classifications/` for the Classifications page
  (`classifications.html`): one byte for the class and one per field (38
  bytes a combination), stored column by column so it gzips to about 10 MB.
  Each field's label, group, level, formula, description and quantisation
  bounds are in `meta.json`, along with the thresholds. It also derives the
  stats `classify.py` does not need: dimension estimates, one-level growth,
  per-level lengths, counts, the biggest circuit's radius of gyration, and
  nesting at levels 4 and 6 from `data/nest/`.
- `render.ts` / `render-cli.ts` render PNGs coloured by circuit length.
- `small-rules.sh` runs every rule except the full one, for all five
  families, at levels 3 to 6.
- `smoke.ts` cross-checks the engine against `analyze()`.

```bash
cd web/circuit-classes
./small-rules.sh
for k in 0 1 2 3; do npx --yes tsx sweep.ts spectre 01235678 4,5,6 data/spectre-01235678.s$k.jsonl $k 4 & done; wait
python3 classify.py 'data/*.jsonl' > data/classes.csv
python3 export-site.py
npx --yes tsx render-cli.ts spectre 2578 6 900 out 0100101100
```

## Placements

Which combinations put their circuits in the same places, and why. Write-up in
[`docs/PLACEMENTS.md`](../../docs/PLACEMENTS.md).

- `placement-maps.ts` draws every combination of a family on one level-L
  patch and writes, per tile, the longest circuit through it, so combinations
  can be compared tile by tile.
- `circuit-sites.ts` tallies each big circuit by the smallest supertile that
  contains it and the children it passes through.
- `routing-orbit.ts` runs the FASS routing operator
  (`../fass-theorem/03-strands.ts`) for any combination, carrying arc lengths,
  and lists every circuit born at each level (exact; hexagons only for now).
- `placements.py` makes the tables and figures from the outputs of the three.

## Deep orbit

Past the deepest rooted patch. `deep-orbit.ts` renormalises the strands
supertile by supertile: a level-k supertile is only its outline crossings,
which pairs of them its arcs join and how long each arc is, and the
level-(k+1) state follows from the children's states by welding their outline
crossings and walking the arcs. What is left over closed into a circuit born
at that level. Exact `Z[ζ12]` geometry, so it runs on every family and every
rule, class 0 included; cost is the boundary (×4.24 a level), not the area
(×7.87). Level 9 in about a minute, level 11 in minutes with a 10 GB heap.

- one combination: a table per level (tiles, dots, births, arcs, the share of
  segments on circuits closed so far) and the growth and dimension of the
  longest born circuit and the longest arc;
- `--compare`: groups pairings by their boundary state (equal states at level
  n means the same pattern above level n), and prints two distances between
  the pairings named, by boundary dots and by the strands' length;
- `--like`: every pairing of a rule ranked by how closely its level profile
  (longest circuit born, share of segments closed, share on the five longest
  arcs) matches the one named: the look-alikes, whether or not they route
  the strands the same way. `--near` ranks by routing distance instead.
- `--families`: a first cut at a catalogue of circuit types. Every circuit
  born gets a word, the cyclic order of the child slots it runs through with
  two-child wiggles collapsed, and words are matched across levels and
  pairings into families with a start level, a period and a growth. The word
  is not yet scale-normalised (see the open ends in the doc), so read it as
  a draft.
- `rule-all` and `rule-0?1??` patterns expand to many pairings.

Write-up and a worked example (hexagon `023468-111000100`, whose first real
circuit is born at level 6 and whose generations grow with dimension 2) in
[`docs/DEEP_ORBIT.md`](../../docs/DEEP_ORBIT.md).

```bash
npx tsx circuit-classes/deep-orbit.ts hex 9 023468-111000100
npx tsx circuit-classes/deep-orbit.ts --compare hex 5 023468-all
```

## Decomposition

A crossing's position depends only on its seam, not on the rule. So when a
rule splits into two disjoint valid rules and every tile's pairing keeps the
two sides apart, the pattern is just the two smaller patterns overlaid
(`src/core/decompose.ts`, counted by `decompose-count.ts`). This saves much
less than you might hope:

| full rule | splits | decomposable |
|---|---|---|
| Tile(1,1) `01235678` | `15 + 023678` only | 640 of 625,000 |
| hexagons `01234568` | `15 + 023468` only | 1,280 of 1,953,125 |
| Tile(1,1) iso `012345678` | `15 + 0234678` only | 3,200 of 3,906,250 |

The other splits (`0136 + 2578`, `0356 + 1278`) never happen: in tiles such
as Theta and Xi the two sides' crossings alternate around the edge, so keeping
them apart forces chords to cross, and combination strings only use
non-crossing pairings. Overlaying two patterns usually needs crossing chords
somewhere, so almost every full-rule combination is a new pattern. Of the 640,
612 are a triangle fractal plus `15`'s bounded loops and measure as a
triangle fractal; for the other 28 the loops dilute the fill score and the
whole measures differently from its `023678` part, whose class is the better
answer. The page shows the parts of any decomposable combination.

## Checks

- Circuit and tail counts, and the longest circuit, match
  `graph_analysis/lvl6.csv` for all 270 small-rule combinations.
- Hats and turtles give the same class as Tile(1,1) for every combination of
  every small rule. They share the edge labels, so the strand graphs are the
  same, and the full rule needs running only once for the three of them.
- Level 3 → 5 and level 4 → 6 windows agree on 259 of 270 small-rule
  combinations. The 11 disagreements are all borderline cases, so the full
  rules use level 4 → 6.

## Cost

About 0.15 s per combination at level 6 on one Raspberry Pi 5 core, or
0.25 s with four shards sharing memory bandwidth:

| space | combinations | time on 4 cores |
|---|---|---|
| all small rules, 5 families | 3,622 | minutes |
| Tile(1,1) `01235678` (also hats and turtles) | 625,000 | ~14 h |

The hexagon full rule `01234568` (1,953,125) and the Tile(1,1) iso full rule
`012345678` (3,906,250) are not swept. The hexagons are near-isomorphic to
Tile(1,1), and the iso labelling is the hexagon rule drawn on Spectres strand
for strand, so both would mostly repeat the Tile(1,1) result. Their small
rules are included.

## Centre map sweep

The Centre map page compares pairings by where their circuits' centres fall
(directed chamfer distance, `src/core/centreMap.ts`). In the browser it does
the full matrix for a few hundred pairings. For every pairing of a family at
one level there is a one-off GitHub Actions run instead:
`.github/workflows/centremap-sweep.yml`, started by hand (Actions → Centre map
sweep → Run workflow; family `hex`, level `5`).

- `centremap-landmarks.ts`: the global numbering of the pairings and the
  landmarks every pairing is measured against (all pairings of the smaller
  rules plus 128 seeded ones from the all-edges rule; 572 for hexagons).
- `centremap-sweep.ts`: one shard of the pairings, each a row of
  log-quantised distances (one byte each) to the landmarks. 64 shards over
  16 jobs; hexagons at level 5 (1,953,569 pairings) take about 12 minutes.
- `centremap-embed.py`: drops duplicate rows, PCA to 50 dimensions, UMAP to
  2-D, and writes `web/public/data/centremap/<family>-<level>/` (`meta.json`,
  `xy.i16`, `longest.u16`).

The workflow commits that folder to the branch `centremap-data/<family>-<level>`
for a pull request. A quick local run of the whole pipeline:

    CENTREMAP_LIMIT=6000 npx tsx circuit-classes/centremap-sweep.ts hex 3 0 1 /tmp/cm
    python3 circuit-classes/centremap-embed.py /tmp/cm /tmp/cm-out

## Large-scale classes

`boundary-classes.ts` groups a rule's pairings by what they do at large
scales. Inside a level-n supertile, a pairing's strands join the crossings
on its outline in pairs; two pairings with the same joins on every supertile
type are identical above level n and differ only inside level-n supertiles
(small closed loops). Classes only merge as n grows.

    npx tsx circuit-classes/boundary-classes.ts hex 023468 6 111000100

prints, per level, how many classes the rule falls into and the named
pairing's class (here six pairings from level 1 on).

## Renormalisation: where the big circuits are born

`renormalize.ts` runs a pairing up the substitution without building a
patch. Each supertile type at level n is kept as its outline crossings and
its boundary map (with the length of every arc). A level-(n + 1) supertile
glues its children's maps through their shared seams; a walk that closes
before reaching the outline is a circuit *born* there, in that supertile type
and through those child slots, and every circuit in the tiling is born in
exactly one place.

    npx tsx circuit-classes/renormalize.ts hex 023468 111000100 9

The largest circuit born per level is a fingerprint. How fast it grows over
two levels (the substitution carries a reflection, so two levels is its
period) gives a dimension D = ln(growth) / ln(4 + sqrt 15): for hexagon rule
023468 most classes give D = 1.45 (fractal curves), and 111000100's family
and 020001001 give D = 2.0 (space-filling circuits, born at even levels from
level 6, straddling child slots 0 and 7).

## Circuit shapes

`circuit-shapes.ts` is the renormalisation with every arc's route through
its children kept, so a single born circuit can be expanded on its own, to
any level of detail, without building the patch around it:

    npx tsx circuit-classes/circuit-shapes.ts hex 023468 111000100 10 Delta out.json 3

writes the largest circuits born in a level-10 Delta (1.4 million tiles for
this pairing) as closed polylines in the supertile's frame, each level-3 arc
drawn as a chord. Drawn to level 0 a circuit has exactly one point per tile.

## Corners

`chord-fit.ts` cuts a circuit into k runs of equal tile count from every
start tile and sums each tile's distance to its run's chord.
`corner-paths.ts` writes the Corners and Shapes pages' data: for every class
of a rule, every distinct circuit born up to the level given (one per length
and radius of gyration, at its lowest level, with the other families it is
born in as aliases), as up to 4320 tile positions evenly spaced by tile
count, with the tile it enters first
(the slots down from its supertile and its chord there, which the Explorer
link uses):

    npx tsx circuit-classes/corner-paths.ts hex 023468 9 public/data/corners/hex-023468
    npx tsx circuit-classes/corner-paths.ts index hex 023468 public/data/corners/hex-023468

The page (`corners.html`) computes everything else from those positions.

## Deep levels and giants

`renormalize-lean.ts` is the renormalisation in typed arrays, keeping only
the previous level and summary statistics: level 10 of the hexagon all-edges
rule (930 million tiles per supertile) in under two minutes. `draw-giants.ts`
draws a combination's largest born circuits and its longest open strand from
the hierarchy:

    npx tsx circuit-classes/renormalize-lean.ts hex 01234568 241400332 10
    MAXPTS=900000 npx tsx circuit-classes/draw-giants.ts 01234568 241400332 9 1000 out.json

## Strands as Turing machines

`strand-machine.ts` writes a strand as a Turing machine whose tape is the
tile's address (cell 0 the tile's type, cell k + 1 the link `Parent/slot` to
the level-(k + 1) ancestor). One strand step is one sweep: pair the entry
crossing in the tile, climb while the exit edge lies on the outside of each
ancestor, rewrite the slot where it is glued inside, and climb back down. Of
the 1142 rows for a hexagon rule, only the 34 to 54 at cell 0 come from the
pairing; the rest are the substitution. A circuit is a run that comes back to
its start configuration, and the highest cell it reads is the level where it
closes.

    npx tsx circuit-classes/strand-machine.ts 023468-000100000 6

checks the machine against `walkStrand` and tabulates the circuits of a
level-6 Delta by the highest cell read:

| combination | height | circuits | longest (tiles) | machine steps |
| --- | --- | --- | --- | --- |
| 023468-000100000 | 2 | 15620 | 27 | 99 |
| | 4 | 2126 | 513 | 2073 |
| | 5 | 2006 | 75 | 309 |
| | 6 | 1236 | 10215 | 42243 |
| 01234568-241400332 | 4 | 5858 | 128 | 584 |
| | 5 | 3002 | 12330 | 55800 |
| | 6 | 1606 | 1158 | 5510 |

The longest circuit per height is the busy-beaver function of the
combination. Merging states that behave alike (Moore's partition refinement)
leaves all 66 states of the full machine, so a shorter description of a
family has to act on whole sweeps (the edge machine of `edge-machine.ts`),
not on single rows.

## The three sides of a triangle

`triangle-sides.ts` writes a circuit as one letter per tile (type, entry
edge, exit edge: `Phi45`), which does not change when the tile turns, cuts
the word of the longest circuit at each height into thirds (`sideRuns` in
`src/core/circuitSides.ts`, cutting where all three agree for longest), and
compares them: where the thirds disagree, the tiles round each corner, and
the 120-degree turn that carries one third onto the next. The Circuit walker
page does the same for any circuit it closes and marks the result on the
board.

    npx tsx circuit-classes/triangle-sides.ts 023468-000100000 6

| height | tiles | side | positions that differ | runs | corner joins | tiles carried by the turn |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 27 | 9 | 4 | 2 | differ | 16 of 18 |
| 4 | 513 | 171 | 10 | 1 | agree | 326 of 342 |
| 5 | 75 | 25 | 0 | 0 | agree | 50 of 50 |
| 6 | 10215 | 3405 | 72 | 9 | agree | 6702 of 6810 |

From height 4 on, two thirds are identical and every run where the third
differs is the same block walked backwards. Two blocks occur: the
10 tiles `Psi54 Phi45 Sigma10 Delta54 Phi01 Xi53 Gamma54 Phi54 Xi42 Pi45`
and the 4 tiles `Delta10 Gamma23 Sigma54 Phi01`. The corners of the height-4
and height-6 circuits are the same nine tiles,
`Phi54 Xi42 Pi45 Phi10 Delta45 Sigma01 Phi54 Psi45 Delta10`.

The longest circuits of a level-4 and a level-6 Delta belong to a second
lineage (441 and 8784 tiles) with the same structure: two equal sides, and
on the third a 7-tile block `Psi54 Phi45 Sigma10 Delta54 Phi01 Xi52 Pi45`
walked backwards (once at 441 tiles, six times with three 4-tile blocks at
8784), and nine-tile corners that agree.

## Harmonics

`harmonics.ts` reads every circuit of a combination at every level (the
level-k supertiles its strand runs through, backtracks across a seam
cancelled) and lists the pairs where one circuit read two levels up is
another: the lineages of a triangle fractal, such as 27 → 513 → 10215 in
`023468-000000000`. `chase-harmonic.ts` runs the Circuit walker's search for
a harmonic with the rule that a fork decided at level 3 or above may only
take a landing whose cells, two levels down, the fundamental's own stacks
use. Write-up in [`docs/HARMONICS.md`](../../docs/HARMONICS.md).

    npx tsx circuit-classes/harmonics.ts 023468-000100000 6
    npx tsx circuit-classes/chase-harmonic.ts 023468-000100000 5 6 18 441 all
