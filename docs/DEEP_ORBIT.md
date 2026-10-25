# Deep orbit: what a pattern does past level 7

Some combinations have not shown their hand by the deepest rooted patch the
site can draw. Hexagon `023468-111000100` is one: at level 7 (1.9 million
tiles) it is a sea of open strands with one generation of mid-sized circuits
in it, and the classifier, which looks at levels 4 to 6, has nothing to go on.
This note is about a way of looking deeper that never builds the patch, and
what it says about that combination and its relatives.

Script: [`web/circuit-classes/deep-orbit.ts`](../web/circuit-classes/deep-orbit.ts).
Tests: [`web/src/core/__tests__/deepOrbit.test.ts`](../web/src/core/__tests__/deepOrbit.test.ts).

## The method

A level-k supertile is summarised by its **boundary state**: the crossings on
its outline, which pairs of them its strands join (the arcs), and how many
segments each arc has. Nothing inside matters to anything outside. The state
of a level-(k+1) supertile follows from its children's states alone:

1. place each child's outline crossings with the child's transform;
2. weld the crossings of neighbouring children that land on the same point;
3. walk arc, weld, arc, ... from every crossing that is left on the outside.
   That gives the parent's arcs and their lengths;
4. whatever is left over has closed into a circuit **born** at level k+1.
   Record its length and the child slots it runs through.

This is the routing operator of [`FASS_THEOREM.md`](FASS_THEOREM.md) §3, which
`routing-orbit.ts` already ran for the hexagons from the edge-word tables.
Here it is computed geometrically, in exact `Z[ζ12]` arithmetic, so it works
for every family (Tile(1,1), hexagons, hats, turtles, the iso labels) and
every rule, class 0 included (its crossing sits on a vertex, which the
edge-word model could not place). The cost is the size of the supertile's
boundary, which grows ×(2+√5) ≈ 4.24 a level, not its area, which grows
×(4+√15) ≈ 7.87. Level 9 of a hexagon rule takes about a minute; level 11
(7 billion tiles) about eight minutes and 10 GB.

What it reports, per level, for the Delta supertile (the others are
computed too): tiles, boundary dots, segments, circuits born (count, longest,
distinct lengths), the number of arcs through it, the longest arc and the
share of the supertile's segments it carries, the share carried by the five
longest arcs, how many arcs carry at least 1% of the segments, and the share
of segments on circuits closed so far. From those: the growth of the longest
born circuit and of the longest arc over two levels, and the dimension each
implies (2 ln growth / ln area growth).

**Checks.** At levels 3 and 4 the circuits a Delta supertile holds, their
lengths, the arcs leaving it and their lengths all equal the strand graph's
trace of the rooted patch, on eight combinations across all five families
(the tests). The births agree with `routing-orbit.ts` on the hexagons to
level 7, and the known records come out: `023678-0311000000` closes its
27,621-segment circuit at level 6, `2578-0100101100` has F(21) = 10,946 arcs
through the level-6 Delta, `128-010100000` has no circuit at any level to 8
and one arc through every Psi supertile.

## Telling combinations apart at the large scale

Two combinations with the same boundary state for every type at level n
route every strand that leaves a level-n supertile the same way. Everything
larger than a level-n supertile is identical in the two; they differ only
inside level-n supertiles. So the states sort a rule's pairings into
**boundary classes** that can only merge as n grows. `--compare` prints the
classes per level, and for the pairings named it prints two distances at the
last level: the share of boundary dots joined differently, and the share of
the strands' *length* that lies on arcs joined differently. The first says
how much of the routing differs; the second says how much of the picture.

## The six hexagon pairings

Asked about these six pairings of hexagon rule `023468`, five of which look
like slight variations of one pattern:

```
111000100  111000101  111001100  111001101  011000101  011001100
```

The odd one out is **`011000101`**. The other five are one boundary class from
level 1 on: at every level from 1 to 9 their routing distance is exactly 0,
so they are the *same* pattern above level 1 and differ only by small loops
inside level-1 supertiles. `011000101` never joins them. It differs from them
on 8% of the boundary dots but on **97% of the strands' length** at level 9,
and it is an ordinary triangle fractal: circuits born at every level,
alternating big and small (630, 57, 11790, 1761, 234108, 33927), growing
×19.3 per two levels, dimension 1.43, the same numbers as every other
triangle pairing in [`PLACEMENTS.md`](PLACEMENTS.md).

The full boundary class the five belong to has six members. The sixth is
`110000101`:

```
011001100  110000101  111000100  111000101  111001100  111001101
```

(The rule's 320 pairings fall into 26 classes from level 4 on; this is one of
two classes of six. The other, `001001100 100000101 101000100 101000101
101001100 101001101`, is a triangle fractal with dimension 1.45 and is not
related.)

## What the five are

Here is `111000100` to level 11, 7.3 billion tiles:

| level | tiles | born | longest born | arcs | longest arc / segs | top 5 arcs / segs | closed / segs |
|---|---|---|---|---|---|---|---|
| 3 | 496 | 89 | 6 | 47 | 0.143 | 0.541 | 0.069 |
| 4 | 3,905 | 507 | 6 | 190 | 0.093 | 0.362 | 0.120 |
| 5 | 30,744 | 2,277 | 6 | 801 | 0.068 | 0.314 | 0.148 |
| 6 | 242,047 | 10,095 | **402** | 3,384 | 0.076 | 0.268 | 0.197 |
| 7 | 1,905,632 | 43,209 | 402 | 14,331 | 0.033 | 0.147 | 0.227 |
| 8 | 15,003,009 | 183,803 | **25,692** | 60,698 | 0.059 | 0.184 | 0.276 |
| 9 | 118,118,440 | 779,365 | 25,692 | 257,117 | 0.027 | 0.127 | 0.306 |
| 10 | 929,944,511 | 3,302,527 | **1,426,650** | 1,089,156 | 0.053 | 0.164 | 0.350 |
| 11 | 7,321,437,648 | 13,990,809 | 1,426,650 | 4,613,735 | 0.024 | 0.114 | 0.378 |

* Up to level 5 only 6-segment loops close. The first real circuit, 402
  segments, is born at level 6, and the next generation, 25,692, at level 8.
  A rooted patch at level 7 holds one generation and no way to tell what it
  is. That is why no rooted patch shows a type.
* From level 6 the generations come every two levels, ×64 then ×55.5 in
  length, against ×62 in area: **dimension 1.95 to 2.0**. These are
  space-filling circuits, not triangle outlines (1.43) and not thin threads
  (1.68 to 1.7). Each generation is born in every one of the nine types, so
  it is a feature of the substitution, like the triangles, but two levels
  deeper and two levels apart.
* The circuits take the plane slowly. At level 11, 62% of the segments are
  still on arcs that have not closed; the longest arc grows ×55 per two
  levels too (dimension 1.95), and the five longest carry 11 to 18% of the
  supertile at every level. The closed share rises about 0.075 per two
  levels, slowing a little (0.079, 0.072). Whether it reaches 1, i.e. whether
  every strand eventually closes, is not settled by level 11. Either way the
  picture at any finite scale is a few space-filling strands with
  space-filling circuits of the last two or three generations cut into them.

So the type is "space-filling circuits born every other level from level 6,
inside space-filling open strands", a cousin of the `blob` class with a very
late start. The classifier's thresholds cannot see it because its first
generation appears at the last level the classifier looks at.

**Where it sits in the rule.** Running all 320 pairings of `023468` to level
7, by the level at which the first circuit longer than 12 segments is born:
36 start at level 2, 168 at level 3, 106 at level 4, 4 at level 5 and 6 at
level 6. The six at level 6 are this class, with first generations of 294 to
402 segments (the members differ inside level-1 supertiles, so the first
circuit's exact length differs while everything above is the same). The four
at level 5 are two pairs, `100000001 101000001` (60, then 4,002 at level 7)
and `120000001 121000001` (3,282, then 166,035), space-filling too. Every
other pairing of the rule has shown its first real circuit by level 4, which
is why the classifier's level 4 to 6 window serves the rest and misses these
ten.

## Running it

```bash
cd web
npx tsx circuit-classes/deep-orbit.ts hex 9 023468-111000100          # one combination, a table and a verdict
npx tsx circuit-classes/deep-orbit.ts --compare hex 9 023468-111000100 023468-011000101 ...
npx tsx circuit-classes/deep-orbit.ts --compare hex 5 023468-all       # every pairing of a rule, by boundary class
npx tsx circuit-classes/deep-orbit.ts --compare hex 7 '023468-?1?00?10?'   # '?' = any digit
npx tsx circuit-classes/deep-orbit.ts --json spectre 8 2578-0100101100 # one JSON line per combination
NODE_OPTIONS=--max-old-space-size=12000 npx tsx circuit-classes/deep-orbit.ts hex 11 023468-111000100
```

The verdict line is a heuristic over the table (bounded, fractal, blob,
line, mixed, open), meant as a first read; the table is the result.

## Open ends

* **The limit of the closed share.** Carrying the generations' lengths as
  exact functions of the level (they are born in every type with the same
  length, so a linear recurrence on the boundary states should exist, as for
  the FASS rules) would say whether the open strands are infinite lines or
  circuits of the next generations.
* **Why level 6.** The five differ from the class of 44 triangle pairings in
  the Delta, Theta and Lambda digits only. Something in those three tiles'
  pairings delays the first closure by two levels and changes the dimension
  of what closes.
* **Spectre `2578`.** The same tool shows the 64 pairings in 21 boundary
  classes from level 3. The `2578-0????01100` sixteen split into thin
  fractals (dimension 1.68, e.g. `0000001100`), bounded loops, and six whose
  strands have not closed by level 9 with 91% of the segments on arcs of
  dimension 2.00 (e.g. `0100101100`, the README's flagship). Those six are
  within 0.5% of the thin fractals in boundary routing: closing the giant
  arcs is a handful of local joins.
