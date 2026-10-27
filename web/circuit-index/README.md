# Circuit index

Every circuit of every combination of a rule, measured for how close it is
to three copies of one arm, and indexed by its corners.

## Finding the circuits

A circuit that needs at most L ancestors lies inside a level-L supertile of
some type. `board.ts` writes each level-L supertile as a table: for each tile
and edge, the tile and edge across it (from `neighbour()`, once per type and
level, whatever the rule). Tracing a combination's strands is then table
lookups. `circuits.ts` traces the boards of all nine types, level by level,
and keeps each distinct circuit once, with the lowest level at which it
appears (its level) and the types that hold it there.

`every-tiling.ts` finds the circuits another way: the Circuit walker's walk
on every tiling at once (`src/pages/walker/possible.ts`), branching at every
choice of ancestor, from every tile type and entry edge. The two agree on
the circuits and their levels (tested to level 3). The walk carries every
ancestor stack it has read, which is tens of thousands after one step at
level 6, so the boards do the sweeping.

## Keys

| key | what it identifies |
|---|---|
| circuit | the word (type, entry edge, exit edge per tile) read from its least rotation, in its least direction |
| tiles | the tiles alone, without edges: types, turns and centres relative to the centroid, least over the 24 rotations and reflections |
| corner triple | the three corner tiles, keyed the same way |

All positions are exact (`core/exact.ts`). The `circuit`, `corner_id` and
`tiles_id` columns are the first 12 hex digits of a SHA-1 of the key;
`words.*.tsv` maps each circuit id to its word.

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
