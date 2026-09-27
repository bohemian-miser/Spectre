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
