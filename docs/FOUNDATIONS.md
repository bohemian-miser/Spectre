# Foundational circuits

Every circuit a combination closes, at every level the renormalisation
reaches, is one of three things: a **foundational** circuit, a **harmonic**
of a circuit closing two levels lower, or a **reborn** copy of a circuit that
closed lower down. The foundational circuits of a combination are finitely
many as far as it has been built, and nearly every harmonic is predicted
from the levels below it before its own level is built. An account of every
chord of every supertile says how much room is left for anything else.

Module: [`foundations.ts`](../web/src/pages/foundations/foundations.ts).
Scripts: [`foundations-sweep.ts`](../web/circuit-classes/foundations-sweep.ts)
(every combination of a rule),
[`foundations-predict.ts`](../web/circuit-classes/foundations-predict.ts)
(predict, then build, level by level),
[`foundations-index.ts`](../web/circuit-classes/foundations-index.ts)
(the summary),
[`foundations-recurrence.ts`](../web/circuit-classes/foundations-recurrence.ts)
(the lengths along a chain). Data: `web/circuit-classes/data/foundations/hex-023468/`. Tests:
[`foundations.test.ts`](../web/src/pages/foundations/__tests__/foundations.test.ts).

The Foundations page (`foundations.html`) shows every combination's
foundational circuits, chains and account of chords, from a cut of the
sweep's output in `web/public/data/foundations/hex-023468/`
([`foundations-page.ts`](../web/circuit-classes/foundations-page.ts),
[`pageData.ts`](../web/src/pages/foundations/pageData.ts)). It marks as
monsters the foundational circuits that start a chain at floor + 4 or later
(§6) and the 19 of at least 100,000 tiles.

## 1. Harmonics above a floor

A circuit closing at level n is read at every level below it as on the
Harmonics page ([`HARMONICS.md`](HARMONICS.md)): the level-k supertiles its
strand runs through, backtracks cancelled. Circuit B closing at level n + 2
is a harmonic of circuit A closing at level n **above level f** when they run
through the same children (the same family) and B read at level k + 2 is A
read at level k for every k from f up to A's top, at least two levels in
all.

In 023468 / 140000001 every such pair agrees from A's level 2 up and
differs at levels 0 and 1. A's levels, 0 up (`=` reads the same as B two
levels up, `x` does not):

| A | B | A's levels 0 up |
|---|---|---|
| 303 at 4 | 14,679 at 6 | `x x = =` |
| 2,079 at 5 | 103,851 at 7 | `x x = = =` |
| 57 at 5 | 3,090 at 7 | `x x = = =` |
| 447 at 6 | 21,705 at 8 | `x x = = = =` |
| 3,090 at 7 | 153,327 at 9 | `x x = = = = =` |
| 60 at 3 | 2,079 at 5 | `x x =` |

The disagreement stays at the bottom two levels as the circuits grow: B is
A with every tile grown into a level-2 supertile, except in how it runs
through those level-2 supertiles. The last row agrees at one level only,
which says no more than that both run through children 1, 4 and 7, so 2,079
is not counted as a harmonic of 60.

The floor is a property of the combination: the lowest after which the
top two levels built close nothing foundational. It is 1 for 000100000 and
000000000 (the exact lineages of [`HARMONICS.md`](HARMONICS.md)), 2 for
140000001, 3 or 4 for others (§6).

## 2. Foundational, harmonic, reborn

Copies of a circuit with the same length, family and cyclic sequence of
child slots are one closing. A closing is **reborn** when its tile word is
one that closed lower down: the 57-tile circuit of 140000001 first closes
across a seam between two level-4 supertiles, and closes again across seams
of every bigger supertile, in more places each time. A closing is
**harmonic** when it is a harmonic of a closing two levels down, and
**foundational** otherwise.

140000001 to level 11 (the level-12 lengths from the tables up to level 11,
§3):

| foundational | level | family | child crossings | chain, two levels at a time |
|---|---|---|---|---|
| 60 | 3 | 147 | 6 | none |
| 303 | 4 | 147 | 21 | 14,679; 734,256; 36,701,253; 1,834,460,910 |
| 2,079 | 5 | 147 | 74 | 103,851; 5,191,191; 259,474,518 |
| 57 | 5 | 07 12 13 14 17 45 46 47 | 2 | 3,090; 153,327; 7,662,954 |
| 447 | 6 | 07 12 13 14 17 45 46 47 | 10 | 21,705; 1,083,894; 54,176,298 |

Nineteen foundational closings by level 6 (the 57 and the 447 once for each
of eight families), and nothing foundational closes at levels 7 to 11. Each
family of the 57 and of the 447 has its own chain; their lengths are equal
level by level.

## 3. Predicting a harmonic

A read at level f runs first through the level-f supertile at some slot
path P from its supertile. Its harmonic, if it exists, runs through the
level-(f + 2) supertile at the same path P in a supertile of A's type two
levels up. `predictHarmonic` takes every arc of the child at P's first slot
that passes through that supertile (15 to 20 arcs at every level), follows
each through the children with the tables of the level below
(`walkAbove`), and keeps the closed walks through A's children that read as
A from f up. Nothing of the level B closes at is used.

For 140000001, with the build stopped one level above A each time, then
extended to B's level and searched for the predicted walk (same length,
family and cyclic sequence of child slots):

| level | predicted from | family | predicted tiles | child crossings | closes there as |
|---|---|---|---|---|---|
| 5 | 60 at 3 | 147 | none | | nothing |
| 6 | 303 at 4 | 147 | 14,679 | 283 | harmonic |
| 7 | 57 at 5 | 07 12 13 14 17 45 46 47 | 3,090 | 42 | harmonic |
| 7 | 2,079 at 5 | 147 | 103,851 | 1,074 | harmonic |
| 8 | 447 at 6 | 07 12 13 14 17 45 46 47 | 21,705 | 170 | harmonic |
| 8 | 14,679 at 6 | 147 | 734,256 | 4,085 | harmonic |
| 9 | 3,090 at 7 | 07 12 13 14 17 45 46 47 | 153,327 | 666 | harmonic |
| 9 | 103,851 at 7 | 147 | 5,191,191 | 15,502 | harmonic |
| 10 | 21,705 at 8 | 07 12 13 14 17 45 46 47 | 1,083,894 | 2,570 | harmonic |
| 10 | 734,256 at 8 | 147 | 36,701,253 | 58,771 | harmonic |
| 11 | 153,327 at 9 | 07 12 13 14 17 45 46 47 | 7,662,954 | 9,834 | harmonic |
| 11 | 5,191,191 at 9 | 147 | 259,474,518 | 222,638 | harmonic |

Every prediction from level 4 up closes where it was predicted and is the
harmonic the build finds; the 60 has none, as in §1. The 259,474,518-tile
circuit at level 11 was predicted from the level-9 circuit and the level-10
tables before level 11 was built.

The harmonic crosses the same seams as A, many times more often: the
57-tile circuit in family 07 crosses the seam between children 0 and 7
twice, its harmonics 42, 666 and 9,834 times; the 447 crosses it 10 times,
its harmonics 170 and 2,570. A strand that runs along a seam crosses it
back and forth; the readings cancel those crossings, which is why the
readings agree and the walks do not.

### The lengths along a chain

The lengths of the family-147 chain, one closing a level, and of the 57 of
family 07 and its successors, satisfy (147 from level 4, 07 from level 5)

```
s(n + 3) - 8 s(n + 2) + 7 s(n + 1) - 3 s(n) = c(n mod 2)
```

| chain | levels | lengths | left-hand side, s(n + 3) at the fourth level on |
|---|---|---|---|
| family 147 | 3 to 11 | 60, 303, 2,079, 14,679, 103,851, 734,256, 5,191,191, 36,701,253, 259,474,518 | -12, 63, -36, 63, -36, 63 |
| 57 of family 07 | 5 to 11 | 57, 447, 3,090, 21,705, 153,327, 1,083,894, 7,662,954 | -57, -24, -57, -24 |

So (x³ - 8x² + 7x - 3)(x² - 1) annihilates both sequences. The cubic has no
rational root, so it is the minimal polynomial of the growth rate
λ = 7.06990776…, the ratio the lengths approach; its other two roots are
complex with modulus √(3/λ) = 0.651. The recurrence was read off the ratio,
then tested: with the build at level 11, its next terms are 1,834,460,910
(family 147) and 54,176,298 (family 07), and the closed walks the window
search finds at level 12, from the level-11 tables alone, have exactly
those lengths ([`foundations-recurrence.ts`](../web/circuit-classes/foundations-recurrence.ts)).

A recurrence like this is what a finite substitution on kinds of route
would give, with λ an eigenvalue of its matrix. The kinds cannot be the
routes of single arcs through one supertile: on the 5,191,191-tile circuit
the longest route of an arc one level below its supertile has 2,979 child
crossings, and the longest at each level grows by about 3.8 a level (15,
56, 207, 786, 2,979 for the members at levels 5 to 9), because strands run
along seams crossing them back and forth. The kinds have to hold such a run
along a seam as one piece; that substitution is not built here.

## 4. The account of chords

A level-n supertile of type t holds M^(n-m)[t][u] level-m supertiles of type
u (M the substitution matrix). Each chord of it (a tile with two chords
counts twice) is either on a circuit closed inside it, closing at some level
m ≤ n inside one of those, or on an open arc of its table (a tail). The
closings at level n are made of the children's tails (the room), and what
does not close stays a tail:

```
chords(t, n) = closed(t, n) + tails(t, n)
room(t, n)   = Σ_u M[t][u] tails(u, n-1)
tails(t, n)  = room(t, n) - closing at n (foundational + harmonic + reborn)
```

The counts are integers and both identities hold exactly at every level and
type (tested). A Delta of 140000001, level by level (the 60 closing at
level 3 is the only closing below level 4):

| level | chords | room | harmonic, predicted | harmonic, built | reborn | foundational | tails | tails' share |
|---|---|---|---|---|---|---|---|---|
| 4 | 6,818 | 6,338 | 0 | 0 | 0 | 303 | 6,035 | 0.885 |
| 5 | 53,679 | 47,475 | 0 | 0 | 0 | 3,105 | 44,370 | 0.827 |
| 6 | 422,606 | 349,031 | 14,679 | 14,679 | 5,358 | 8,046 | 320,948 | 0.759 |
| 7 | 3,327,171 | 2,524,680 | 159,471 | 159,471 | 65,730 | 0 | 2,299,479 | 0.691 |
| 8 | 26,194,754 | 18,088,034 | 1,124,946 | 1,124,946 | 577,872 | 0 | 16,385,216 | 0.626 |
| 9 | 206,230,863 | 128,886,945 | 7,951,077 | 7,951,077 | 4,552,176 | 0 | 116,383,692 | 0.564 |
| 10 | 1,623,652,142 | 915,473,498 | 56,211,345 | 56,211,345 | 34,146,582 | 0 | 825,115,571 | 0.508 |
| 11 | 12,782,986,275 | 6,490,327,356 | 397,407,690 | 397,407,690 | 249,714,198 | 0 | 5,843,205,468 | 0.457 |

From level 7 the harmonics predicted from two levels down take exactly the
chords the build closes as harmonics, the rest of what closes is reborn
copies of known circuits, and nothing foundational closes: the residual is
0 at every level from 7 to 11.

Any circuit not yet seen closes above level 11, so it is made of chords
that are on tails at level 11: at most 45.7% of a Delta's chords there, and
the tails' share falls by a factor of about 0.90 a level. That is a bound,
not an estimate.

## 5. Shares in the limit

For 140000001 the lengths along a chain obey an exact recurrence (§3), so
the members can be carried on past the build and their share of a Delta's
chords summed level by level in integers. The chain of family 147 (the 60,
303 and 2,079 and their harmonics, one copy in every supertile of every
type) and the harmonics of the 57 in family 07 (two copies in every type,
reborn copies left out):

| chain | share at level 10 | at level 40 | at level 100 | at level 200 |
|---|---|---|---|---|
| family 147 | 0.298657 | 0.493260 | 0.501282 | 0.501294 |
| 57 in family 07, harmonics only | 0.010727 | 0.022221 | 0.022695 | 0.022696 |

The circuits of family 147 take half of all chords in the limit. They grow
like λ^n with λ = 7.0699… against the supertile's (4 + √15)^n = 7.8730^n,
so each level adds a share smaller by about 0.898, and the sum converges.
The tails' share is 0.508 at level 10 and shrinks by about 0.90 a level; if
that ratio holds, every chord but a share 0 lies on a closed circuit in the
limit, and the other half belongs to the seam chains (the 57 and 447 in their eight
families) and their reborn copies, whose counts are accounted for level by
level but not yet carried on by a formula.

## 6. Every combination of 023468

The sweep builds each of the 320 combinations to level 9, sorts every
closing at floors 1 to 4, takes the combination's floor, predicts every
harmonic from level f + 2 up and checks it against the build.

Combinations built to level 9, and to level 10 where level 9 still
showed a foundational closing at level 6 or 7: 205 to level 9, 115 to
level 10. 9,740 foundational closings in all, 13 to 64 per combination.

| floor | last level with a foundational closing | combinations |
|---|---|---|
| 1 | 4 | 110 |
| 1 | 5 | 22 |
| 2 | 5 | 71 |
| 2 | 6 | 15 |
| 3 | 5 | 2 |
| 3 | 6 | 81 |
| 3 | 7 | 2 |
| 4 | 7 | 17 |

With a floor f, a circuit can be a harmonic only from level f + 4 up: its
circuit two levels down must agree at two levels from f up. So a
foundational circuit at level f + 3 or below is one the definition cannot
place in a chain yet, and the question is what closes from f + 4 up:

| highest foundational level, less the floor | combinations |
|---|---|
| 2 | 2 |
| 3 | 279 |
| 4 | 39 |
| 5 or more | 0 |

In 39 combinations a new chain starts at level f + 4, after harmonics have
begun: the 447 seam circuits of 140000001 at level 6, a single circuit of
family 147 at level 5 in 22 combinations of floor 1 (321 tiles in
000000001), sixteen seam circuits at level 6 in 111000100 and its
neighbours, 24 circuits at level 7 in 120000001 and 121000001 (floor 3).
These are the latest starts found; no combination has a foundational
closing at f + 5 or above, to level 9 or 10. The largest foundational
circuits are the 100,000 to 171,000-tile ones of family 013467 at level 7
in the floor-4 combinations (031001001: 170,976 tiles), each followed only
by its harmonics and reborn copies at levels 8 to 10.

Every closing from level f + 2 up that repeats nothing has its harmonic
predicted, from the tables up to one level above it:

| prediction | count |
|---|---|
| closes two levels up and is the harmonic found there | 10,827 |
| closes there as a reborn copy of an earlier circuit | 1,694 |
| none predicted, and the build has none | 522 |
| none predicted, but the build has a harmonic | 38 |
| closes there as the harmonic of another circuit | 24 |
| forecast for the level above the build | 2,211 |

The 38 misses are in four combinations (120000001, 121000001, 011001001,
031001001) and the 24 others in four (111000001, 110000001, 120000001,
121000001): the window at the first visit holds no walk, or holds the
harmonic of a sibling of the same family.

## 7. Open strands

A tail is an open arc of a supertile's table: part of a strand that has not
closed by that level. A strand that never closes is an infinite strand of
the tiling. Its tiles are on tails at every level, so the tails' share at
level n bounds the share of chords on infinite strands, and of chords on
circuits closing above n.

| tails' share at the top level over the level below | combinations |
|---|---|
| under 0.7 | 307 |
| 0.90 to 0.94 | 13 |

| combination | levels | floor | tails' share at the top | over the level below |
|---|---|---|---|---|
| 000100000 | 9 | 1 | 0.058 | 0.649 |
| 001001000 | 10 | 3 | 0.090 | 0.615 |
| 140000001 | 10 | 2 | 0.508 | 0.900 |
| 111000100 | 10 | 2 | 0.650 | 0.936 |
| 100000001 | 9 | 1 | 0.795 | 0.937 |

In every combination of 023468 the tails' share falls at every level built,
by a ratio that has settled; if it holds, open strands take a share 0 in
the limit. The 13 slow ones include 111000100, the space-filling pattern of
[`DEEP_ORBIT.md`](DEEP_ORBIT.md), and 140000001; their circuits grow nearly
as fast as the supertiles, so the tails go slowly. An infinite strand
of the tiling is a nested chain of tails, one per level; the longest tail of
a level-10 Delta of 140000001 runs through a longest tail of one of its
children at every level built, so such chains exist at least as far as
level 10, but they take a share 0 of the chords. That longest tail has
845, 5,786, 40,808, 288,203, 2,037,386, 14,403,770 and 101,833,100 tiles
at levels 4 to 10: it grows by 7.07 a level, as the circuits do, and does
not satisfy the circuits' recurrence of §3.

## 8. What is proved and what is observed

Proved (exact, for every level built):

- The account of §4: every chord of every supertile is on a circuit closed
  inside it or on a tail, with integer counts, checked at every level and
  type, and against the leaf counts of the substitution to level 3.
- Every circuit closing above level L is made of chords on tails at level
  L, so their total share is at most the tails' share at L.
- Each prediction of §3 and §6 is checked against the build, and the two
  level-12 lengths of §3 against the walks of the level-11 tables.

Observed, not proved:

- That the floor stays where it is: a harmonic pair's readings disagree at
  the same bottom levels at every level built.
- That nothing foundational closes from level f + 5 up: none does in any
  combination of 023468 to level 9 or 10.
- The recurrence of §3, past level 12, and so the limiting shares of §5.

What a proof needs: a finite substitution on kinds of route, fixed from
some level up, that the renormalisation's tables obey from the floor up.
Its matrix would give the recurrence of §3 (λ, the root of
x³ - 8x² + 7x - 3, would be one of its eigenvalues), and its closure, a
finite check, would bound the foundational circuits and their last level.
The kinds cannot be routes through single supertiles (§3): a run along a
seam has to be one kind, whose expansion holds runs along the seams of the
children. The window search of §3 is a finite piece of such a map (15 to
20 arcs per prediction, at every level). The edge machine
(`circuit-classes/edge-machine.ts`) asks the same question of the tables as
a finite automaton on crossing addresses.

## Open problems

- Why the floor is 1, 2, 3 or 4, and what in the combination sets it.
- The substitution on seam runs of §8, and with it a proof of the
  recurrence and of the last new level.
- The recurrence for other combinations and chains: whether every chain's
  lengths satisfy one, and which polynomials occur.
- The reborn closings: their copies grow each level (the 57 of family 07
  in 140000001: 18, 54, 252, 1,044 copies at levels 5 to 8, all types
  together) and the count is not yet predicted, only accounted for.
- The 38 predictions of §6 that find no walk where the build has a
  harmonic: a window at another visit than the first would be tried next.

## Reproducing

```bash
cd web
node --max-old-space-size=3500 node_modules/.bin/vite-node circuit-classes/foundations-sweep.ts -- 023468 9 0 1   # shard 0 of 1
node node_modules/.bin/vite-node circuit-classes/foundations-index.ts -- 023468
node node_modules/.bin/vite-node circuit-classes/foundations-page.ts -- 023468
node --max-old-space-size=9000 node_modules/.bin/vite-node circuit-classes/foundations-predict.ts -- 023468 140000001 11
node --max-old-space-size=12000 node_modules/.bin/vite-node circuit-classes/foundations-recurrence.ts -- 023468 140000001 11 147,07
npx vitest run src/pages/foundations
```

The sweep takes about 10 s a combination at level 9 and 25 s at level 10
(the late ones were rerun with level 10 as the second argument and their
names as the fifth); the prediction run to level 11 about 20 minutes.
