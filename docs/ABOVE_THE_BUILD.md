# Above the build: 110000001, and a level step for a GPU

What is known of 023468 · 110000001 above the levels the renormalisation
builds, the tools that found it, and a plan for building further on a GPU.

## The circuits of 110000001

Built to level 12 (`HarmonicsEngine`, 293 s with a 12 GB heap). Levels 10
and 12 add no circuit.

| circuit | born at | children | in the Harmonics table |
|---|---|---|---|
| 87 | 4 | 4, 7 (family 47) | alone |
| 126 | 4 | 1, 4 (family 14) | alone |
| 180 | 4 | 1, 4, 7 (family 147) | alone |
| 57, 60 | 5 | 0, 7 (family 07) | chains |
| 219 | 5 | 0, 1 | alone |
| 1,662, 2,244 | 7 | 0, 7 | chains |
| 101,271, 130,434 | 9 | 0, 7 | chains |
| 5,592,396, 7,261,917 | 11 | 0, 7 | chains |

Every circuit from level 7 up is in family 07, a three-lobed Y or its
inside-out partner, the 57 and the 60 grown (`FOUNDATIONS.md` §5 on the
60's chain).

Above the build, 300 tails followed from level 9 to 14 (`tails-above.ts`,
seed 1, 300,000 routes a tail) close as follows.

| fate | tails |
|---|---|
| out of routes before level 14 | 125 |
| still open at 14 | 106 |
| a circuit of the build | 55 |
| 402,626,814 tiles, at level 13 or 14 | 8 |
| 310,031,859 tiles, at level 13 or 14 | 6 |

The two are new, and both are family 07 by their readings. The 402,626,814
reads, in its level-13 placement, exactly as the 7,261,917 two levels down
and the 130,434 four levels down at every level from 3 up: the 60's chain
at level 13, its floor at 3. The 310,031,859, read in its level-14
placement, has at each level the 5,592,396's token count two levels lower;
its agreement in its level-13 placement is not yet checked.

**Open question.** A circuit that looks like the 87, the 126 or the 180
grown has been seen in this combination. It is neither of the two above.

## The searches from the 87, the 126 and the 180

`gap-search.ts` with the build to level 9 known by its words:

| member | level 6 | level 8 | level 10 |
|---|---|---|---|
| 126 (family 14) | none | none | none |
| 87 (family 47) | none | none | none |
| 180 (family 147) | none | none | none |

Every closed walk through their windows is a copy of a circuit of the
build closing again in a bigger supertile. Through the 87's and the 180's,
no walk of their own family closes at all; through the 126's, only the 126
itself, again. The level-12 search from the 126 had not finished after 110
minutes and 11 million routes.

The walks leaving the level-10 supertile, climbed a level at a time
(`climb`): 44 from the 180, 28 from the 87. The first of each climbed past
level 15 without closing; the 30 million routes allowed ran out before the
rest were climbed.

## What the searches cannot see

- **Circuits between the build and the level searched.** A closing with
  the word of a circuit born lower is that circuit again, not a find; the
  search knows only the build's words and the members found. With the
  build at 7, the search from the 87 at level 10 returns the 130,434, born
  at 9. Build at least to two below the level searched.
- **Odd gaps.** The harmonic relation is two levels (each level of the
  substitution is mirrored); comparisons at an odd gap compare a circuit
  with a mirror image and read as unrelated.
- **Shape.** The readings say whether a circuit is another grown, from a
  floor up. A circuit that only looks like another at the top levels scores
  low below them; a likeness by eye needs a test on the coarse shape.

## Memory

A level's state is every type's border: its crossings in order round the
six edges, and for each the crossing a strand entering there leaves by
(`period/period.ts`). The crossings grow by 4.24 a level.

| level | border crossings, all types | crossings welded inside | mate and chords (12 bytes) | mate only (4 bytes) |
|---|---|---|---|---|
| 11 | 81,700,942 | 151,799,844 | 1.0 GB | 0.3 GB |
| 12 | 346,090,662 | 643,033,800 | 4.2 GB | 1.4 GB |
| 13 | 1,466,063,478 | 2,723,934,220 | 17.6 GB | 5.9 GB |
| 14 | 6,210,344,470 | 11,538,769,864 | 74.5 GB | 24.8 GB |
| 15 | 26,307,441,246 | 48,879,012,852 | 316 GB | 105 GB |

`CircuitShapes` keeps every route's steps as well, for reading and drawing:
its level 13 runs a 16 GB machine out of memory. The border alone takes
level 13 on a 24 GB card, with level 12's beside it. Level 14 with its
chords, beside level 13's border, needs 92 GB: on an 80 GB card the step
runs one parent type at a time with the finished types moved to the host,
or keeps chords only for the arcs of the walks kept.

## A level step for a GPU

`period.ts`'s `step` makes every type's border at level n + 1 from the
borders at level n with the substitution alone (`childType`, `gluedPairs`,
`edgeParts`), and lists the circuits closing at n + 1. Its `compose` builds
objects and string-keyed maps and stops at `maxCrossings`; the same step in
flat arrays is one independent walk per crossing.

- **Positions by arithmetic.** A parent border position is an edge j and an
  index along it; `edgeParts(T, j)` and prefix sums of the children's
  per-edge counts give the child crossing (slot, child position), reversed
  as the child meets the parent. A welded child edge meets its partner
  crossing for crossing in reverse order. No map is needed.
- **Border routes.** One thread per parent border position: enter the
  child, take the child's mate, cross the weld or leave by the parent's
  border. The mate and the sum of the child chords are the new border.
- **Births.** One thread per welded child crossing: walk until back at the
  start, or at the border. A walk that closes is reported once, by the
  thread whose start is its least crossing, with its parent type, tiles
  (chords summed), the slots it enters (its family, an 8-bit mask) and its
  length in child crossings. Keep the walks only for the families wanted
  (here 14, 47 and 147).
- **Reading a birth.** A kept walk, as child crossings at its birth level,
  is a `Walked` for `SparseRoutes` once each child position is turned into
  the child's address (`SparseRoutes.rowAt` from edge and index); from
  there `readWalked`, `harmonicAbove` and the Harmonics page's drawing take
  it as they take a member found. Which way `rowAt` counts along an edge
  against `period.ts`'s positions is the first thing to check, on levels
  the tables hold.

Checks for the port: its borders equal `period.ts`'s at every level both
reach, and the circuits closing per type agree; its births up to level 11
include every circuit of the build above, and its births at 13 the
402,626,814 and the 310,031,859.

## Tools

```bash
cd web
# gap searches from the last member of each row of the families named
node --max-old-space-size=8000 node_modules/.bin/tsx circuit-classes/gap-search.ts 110000001 9 12 14,47,147
# tails followed above the build; writes circuit-classes/data/tails-above/023468-110000001.json and .svg
node --max-old-space-size=8000 node_modules/.bin/tsx circuit-classes/tails-above.ts 110000001 11 9 14 300 300000 1
```

The build to 11 takes under a minute; to 12, five minutes, and more than
Node's default heap (it ran with 12 GB). The tail follower spends under a
second a tail at 300,000 routes; raising the cap or the routes reaches
more of the tails left open.
