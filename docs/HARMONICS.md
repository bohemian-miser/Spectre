# Harmonics: the same circuit two levels up

The triangles of a triangle fractal come in lineages. In hexagon rule
`023468`, combination `000100000` (the Circuit walker's default), a
441-tile triangle sits inside every level-4 supertile and an 8784-tile one
inside every level-6 supertile; the corners of the small one lie on the big
one, and that is how one is found from the other on the walker page. This
note says exactly what the two have in common, in the walker's own terms
(addresses, stacks, levels), and what that gives the walker's search.

Script: [`web/circuit-classes/harmonics.ts`](../web/circuit-classes/harmonics.ts)
lists every circuit of a combination with its readings and lineages;
[`web/circuit-classes/chase-harmonic.ts`](../web/circuit-classes/chase-harmonic.ts)
runs the walker's search for a harmonic with and without the rule of §4.
Tests: [`web/circuit-classes/__tests__/harmonics.test.ts`](../web/circuit-classes/__tests__/harmonics.test.ts).

![Nested triangles of 023468-000100000 in a level-6 Delta](harmonics/nested-triangles.png)

*Every circuit of 9, 18, 162, 441, 3258 and 8784 tiles in a level-6 Delta.
Each 441 holds a 162; the 441s sit along the sides of the 8784, with their
corners on it; the 3258 sits inside the 8784 the way a 162 sits inside a 441.*

## 1. Reading a circuit at a level

A circuit is a cyclic word of tiles. Read at level k, it is the sequence of
level-k supertiles its strand runs through, one visit per maximal run of
tiles with the same level-k ancestor, each visit written as the supertile's
type, its slot in its parent and the parent's type: `Ph<6D` is a Phi in slot
6 of a Delta. Read at level 0 it is the tile word with each tile's slot and
parent. The level at which a crossing settles (`neighbour()` in
`core/transducer.ts`) says whether it stays inside the level-k supertile.

Where the strand runs along a seam between two supertiles it crosses the
seam back and forth, so the raw reading repeats A B A B A. A visit followed
straight away by a return to the supertile just left is cancelled, so the
reading records the supertiles the strand runs through and not how often it
crosses the seams between them.

A circuit's height is the level of the smallest supertile holding it. That
supertile can be of any of the nine types, and so can its children, so types
are compared only from two levels below the height; slots always.

## 2. Lineages

Circuit B is a harmonic of circuit A when B's height is A's plus two and B
read at level k + 2 is A read at level k for every k: B is A with every tile
grown into a level-2 supertile. Every circuit of two combinations in a
level-6 Delta:

**`023468-000000000`**

| tiles | height | copies | visits per level, 0 up |
|---|---|---|---|
| 9 | 2 | 7810 | 9 2 |
| 15 | 4 | 2656 | 15 3 3 2 |
| 27 | 2 | 7810 | 27 3 |
| 75 | 4 | 2426 | 75 12 3 2 |
| 189 | 4 | 126 | 189 18 9 2 |
| 321 | 6 | 20 | 321 33 15 3 3 2 |
| 513 | 4 | 126 | 513 57 27 3 |
| 1479 | 6 | 10 | 1479 162 75 12 3 2 |
| 3789 | 6 | 2 | 3789 408 189 18 9 2 |
| 10215 | 6 | 2 | 10215 1107 513 57 27 3 |

| lineage | growth | readings |
|---|---|---|
| 27 → 513 → 10215 | ×19.0, ×19.9 | the same at every level |
| 9 → 189 → 3789 | ×21.0, ×20.1 | the same at every level |
| 75 → 1479 | ×19.7 | the same at every level |
| 15 → 321 | ×21.4 | the same at every level |

The table of visits shows it directly: 513 reads `513 57 27 3` and 27 reads
`27 3`; 10215 reads `10215 1107 513 57 27 3`. Each harmonic's row ends with
its fundamental's row.

**`023468-000100000`** (the walker's default)

| tiles | height | copies | visits per level, 0 up |
|---|---|---|---|
| 3 | 2 | 45866 | 3 2 |
| 9 | 2 | 7810 | 9 2 |
| 15 | 4 | 2656 | 15 3 3 2 |
| 18 | 2 | 7810 | 18 3 |
| 66 | 4 | 2426 | 66 12 3 2 |
| 162 | 4 | 126 | 162 18 9 2 |
| 276 | 6 | 20 | 276 33 15 3 3 2 |
| 441 | 4 | 126 | 441 57 27 3 |
| 1272 | 6 | 10 | 1272 162 75 12 3 2 |
| 3258 | 6 | 2 | 3258 408 189 18 9 2 |
| 8784 | 6 | 2 | 8784 1107 513 57 27 3 |

| lineage | growth | readings |
|---|---|---|
| 18 → 441 → 8784 | ×24.5, ×19.9 | the same above level 2; at level 2, loops round junctions |
| 9 → 162 → 3258 | ×18.0, ×20.1 | the same above level 2; at level 2, loops round junctions |
| 66 → 1272 | ×19.3 | the same above level 2; at level 2, loops round junctions |
| 15 → 276 | ×18.4 | the same at every level |

The 3-tile loop round a vertex has no harmonic. The two combinations differ
in one tile's pairing (Xi), and their lineages line up: 27/513/10215 against
18/441/8784, 9/189/3789 against 9/162/3258, 75/1479 against 66/1272,
15/321 against 15/276.

### Loops round junctions

Where a lineage of `000100000` reads the same only above level 2, the
difference at level 2 is always the same thing. Lining the harmonic's
level-2 reading up with the fundamental's tile word (longest common
subsequence, over every rotation and both directions), none of the
fundamental's tiles is missing, and every extra run of the harmonic is a
loop: the strand leaves a level-2 Xi for a Phi and a Gamma in slots 6 and 7
of the neighbouring level-3 supertile and comes back into the same Xi.

| lineage | extra runs at level 2 | shape of each |
|---|---|---|
| 18 → 441 | 3 | `X<5` or `X<0`, `G<7` (16 tiles), `Ph<6` (6 tiles) |
| 9 → 162 | 9 | `X<2`, `Ph<6` (6), `G<7` (16) |
| 441 → 8784 | 24 | `X<2`, `Ph<6` (6), `G<7` (16) |
| 66 → 1272 | 3 | `X<2`, `G<7` (16), `Ph<6` (6) |

A loop is where the fractal strand passes a point where three level-2
supertiles meet and clips the corners of the two it does not belong in. In
`000000000` the Xi pairing routes the strand past those corners, and the
readings agree down to the tiles.

### The corners

For the 441-tile triangles in a level-6 Delta: of 126 copies, 48 share tiles
with one of the two 8784-tile triangles, and 18 of those lie with all three
corner tiles on it. Of 126 copies of the 162-tile circuit, every one has
each corner tile on two 441-tile triangles. So clicking a corner of a
triangle on the walker page starts a walk on the harmonic, when the triangle
is one of the ones along the harmonic's sides.

## 3. In the walker's stacks

A stack is the start tile's ancestors; the walk extends it only when a
crossing needs the next level. Reading at level 2 says: B's stacks with the
bottom two levels cut off are A's stacks. The walker's forks along the two
circuits, each followed from its first tile on every stack at once:

| circuit | forks | decided at level |
|---|---|---|
| 18 | 2 | parent, parent |
| 441 | 13 | 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3 |

The 441's forks decided at level 3 and above are the forks A's walk makes
two levels down, with the same cells; the forks decided at levels 1 and 2
have no counterpart in A. They are the strand choosing its way along the
seams inside level-2 supertiles, and there are more of them than the
fundamental has forks in all.

## 4. Finding a harmonic ahead of the search

Once the walker has closed on a circuit A of height h, this is known about
its harmonic before any search:

- it exists in every level-(h + 2) supertile of every type (so from any
  start tile whose level-2 supertile is one of A's tiles), and closes at
  height h + 2 with about 19.9 times A's tiles, the triangle growth of
  [`PLACEMENTS.md`](PLACEMENTS.md);
- its readings from level 3 up are A's from level 1 up, so every fork
  decided at level 3 or above is decided by a cell A uses two levels down.

`chase-harmonic.ts` applies the second as a rule in the walker's own search
(every landing at every fork, shortest branch first): A is followed on every
stack at once, its closing stacks are replayed to list the cells its tiles
have at each level, and in B's search a fork decided at level 3 or above
keeps only the landings whose cells two levels down are in that list. The
rule cannot drop a landing on B's own branch. From the 441's first tile,
searching every landing until every branch ends:

| | forks | decided at level 1, 2, 3, 4, 5 | branches | landings dropped | closes on 441 |
|---|---|---|---|---|---|
| plain search | 422 | 47, 62, 242, 57, 9 | 848 | 0 | 45 branches |
| with the rule | 236 | 38, 52, 111, 30, 2 | 377 | 99 | 36 branches |

The rule halves the level-3 forks; the forks at levels 1 and 2 are left to
the search, and they are most of the rest. One harmonic up, from the 8784's
first tile with the 441 as fundamental and the search capped at 3,000
forks, the rule drops 549 landings and both searches close on the 8784
within the cap (1,275 and 1,282 branches); the forks there are decided at
levels 3, 4 and 5 in about equal numbers, and the rule reaches only the
ones whose deciding cells the 441 never uses. From every start tile and entry
edge of the rule (34 starts), the search with the rule closes on the 441
from each of the 22 starts that lie on one, in 113 to 406 forks; the other
12 starts close on the 3-, 9- or 18-tile circuits within two forks.

### Open ends

- A rule that follows A's tile word as B's level-2 reading grows would cut
  the search to about one branch, but the strand's wiggles along seams and
  its loops round junctions interleave in ways a short automaton (cancel a
  backtrack, allow an excursion of two supertiles) does not capture: along
  the 441, 186 stacks are alive at step 18 and all are rejected by step 19.
  The reading is a property of a closed circuit; matched as a prefix it needs
  the reduction of §1 to be done on the fly, which is not confluent.
- The harmonic can be constructed instead of searched. The renormalisation
  (`circuit-classes/circuit-shapes.ts`) keeps every arc's route through its
  children, so the circuit born in a level-(h + 2) supertile through the
  same child slots as A can be expanded on its own; the walker could offer
  it as a walk to follow (`followWord`) rather than a branch to find.
- Why the loops round junctions are always Xi, Phi in slot 6, Gamma in slot
  7, and only in combinations whose Xi pairing is the second option.

## Reproducing

```bash
cd web
npx tsx circuit-classes/harmonics.ts 023468-000000000 6
npx tsx circuit-classes/harmonics.ts 023468-000100000 6
npx tsx circuit-classes/chase-harmonic.ts 023468-000100000 5 6 18 441
npx vitest run circuit-classes/__tests__/harmonics.test.ts
```

Level 6 traces 242,047 tiles in about 35 s; the chase from one start takes
about 30 s.
