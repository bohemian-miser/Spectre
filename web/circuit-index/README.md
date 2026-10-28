# Circuit index

Every circuit of every combination of a rule, measured for how close it is
to three copies of one arm, and indexed by its corners.

## Finding the circuits

The walk on every tiling at once (`src/pages/walker/possible.ts`) carries a
set of ancestor stacks. A stack of depth L is the start tile's ancestors up
to level L: a top type and a slot path down from it. That is a tile of the
level-L supertile of the top type, and the strand's current position is
another tile of the same supertile. So every stack the walk can hold is a
tile of one of nine boards, one per top type: `board.ts` writes each level-L
supertile as a table giving, for each tile and edge, the tile and edge
across it inside the supertile (from the same `neighbour()` call the walk
makes), or nothing when the edge is on the outline. A step of the walk that
stays inside the stack is a lookup in that stack's board; a step that needs
a parent the walk does not have yet is, on the board, an outline edge, and
the walk's new stacks (one per possible parent) are tiles of the level-(L+1)
boards.

The first step from a bare Psi entered by edge 0, rule `15`, at most 3
levels:

| bundle (what the stacks land on) | stacks |
|---|---|
| Psi, edge 2 | 142 |
| Pi, edge 2 | 44 |
| still on the outline at level 3 | 283 |

| stack (bottom up) | tile, board | across its edge 1 |
|---|---|---|
| Xi:5 < Gamma:5 < Gamma:7 | `7.5.5`, level-3 Gamma | `1.5.0`, Psi edge 2 |
| Xi:5 < Gamma:5 < Delta:7 | `7.5.5`, level-3 Delta | `1.5.0`, Psi edge 2 |
| Xi:5 < Gamma:5 < Theta:7 | `7.5.5`, level-3 Theta | `1.5.0`, Psi edge 2 |

All 186 stacks that land are tiles of a board and land where that tile's
edge does. A board holds every stack of its depth and top type, not only
the ones a walk from one start reaches, so tracing every strand of every
board at level L finds every circuit the walk finds with at most L levels,
from every start tile at once, and each strand is traced once.
`circuits.ts` traces the boards of all nine types, level by level, and keeps
each distinct circuit once, with the lowest level at which it appears (its
level) and the types that hold it there.

The tests check both directions: every stack the walk carries, for twelve
steps from two starts, is a board tile that steps where the walk does; and
`every-tiling.ts`, the walk run from every tile type and entry edge with a
branch at every choice, finds the same circuits at the same levels as the
boards (rule `15` to level 4, `023468` to level 3). The walk keeps each
stack in a list, so its sweeps stop at level 3 or 4; the boards run to
level 6 here.

### Bundles as merged graphs

`stack-graph.ts` runs the same walk with each bundle stored as a merged
graph. A world is read bottom up as one pair of links per level, the start
tile's ancestor and the current tile's; worlds whose upper levels are the
same share those nodes. A step runs `neighbour()` through the graph: the climb
reads one level at a time, and where it settles the current tile's links
below are rebuilt and the subgraph above is kept as it is. Closing is the
paths whose every pair agrees, landing on the start tile by the start edge.

The walk from a bare Phi entered by edge 1, rule `023468`, combination
`111000100`, at most 6 levels:

| step | lands on | worlds | graph nodes |
|---|---|---|---|
| 1 | Psi, edge 4 | 25,368 | 151 |
| 3 | Psi, edge 4 | 18,146 | 195 |
| 5 | Xi, edge 4 | 9,527 | 48 |

The tests compare it with the list walk world by world for eight steps from
every start, and its circuits with the boards'.

## Keys

| key | what it identifies |
|---|---|
| circuit | the word read from its least rotation, in its least direction; one letter per tile: the type's shortest unique prefix (G, D, T, L, X, Pi, S, Ph, Ps), then the entry and exit edge indices, so `D23G01X01` is Delta in by edge 2 and out by 3, then Gamma, then Xi |
| tiles | the tiles alone, without edges: types, turns and centres relative to the centroid, least over the 24 rotations and reflections |
| corner triple | the three corner tiles, keyed the same way |

All positions are exact (`core/exact.ts`). The `circuit` column is the word
itself. `corner_id` and `tiles_id` are the first 12 hex digits of a SHA-1 of
their key, which lists each tile as type, turn (30-degree steps), mirror flag
and centre (four integers in `Z[ζ12]`, scaled by the tile count) relative to
the centroid: `Xi/0/0/108,0,36,0;Xi/4/0/-144,0,108,0;Xi/8/0/36,0,-144,0` is
three Xi turned 0, 120 and 240 degrees about their centroid.

## Measures

- **Corners** (`sides.ts`): the three tiles that leave the rest of the
  circuit closest to the sides they span (least sum of squared distances of
  tile centres from the line between consecutive corners). They are fitted
  on the circuit read in canonical order, so every copy gets the same
  corners. Positions are in the canonical word.
- **Arms**: the word cut at the corners. `arm_distances` is the edit
  distance (Levenshtein, over letters) from each arm to the next, and
  `arm_score` is the largest of them over the mean arm length.
- **order**: how many times the word repeats round the circuit. A multiple
  of 3 means exactly three equal arms.
- **seg2 … seg12**: the word cut into k equal parts (k up to √length), at 16
  offsets within one part; the largest edit distance between consecutive
  parts over the part length, at the best offset.

## Running

```bash
cd web
npx tsx circuit-index/sweep.ts 023468 6                 # all combinations to level 6
npx tsx circuit-index/sweep.ts 023468 6 circuit-index/data 0 4   # shard 0 of 4
npx tsx circuit-index/sweep.ts 023468 7 circuit-index/data 0 1 111000100,000100000
npx tsx circuit-index/points.ts 023468 6 20             # corner triples on one patch
npx tsx circuit-index/report.ts circuit-index/data/023468
npx vitest run circuit-index
```

A sweep appends to `data/<rule>/` and skips combinations already in
`combos.*.csv`, so it resumes. It stops collecting after the level at which
a combination passes 1,000 circuits (`capped`), and treats a strand longer
than 10,000 tiles as open.

`points.ts` traces every combination on one level-L Delta supertile, takes
the corner triple of each circuit of at least `minLength` tiles as three
tiles of that patch, and lists every combination's strands through all three
(`points.L.csv`).

## Cost

Level 6 builds the nine boards in about 20 s; level 7 is about eight times
that, and about 500 MB of tables. The Levenshtein profile is quadratic in
circuit length and dominates per-combination time when circuits run to
thousands of tiles.
