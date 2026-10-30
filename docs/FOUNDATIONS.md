# Foundational circuits

A circuit is its tile word: every closing with that word, in any place of a
supertile and at any level, is the same circuit. Where it first closes, a
circuit is a **harmonic** of a circuit closing two levels lower, or
**foundational**. A foundational circuit with harmonics starts a **chain**;
one without is a **nugget**, which only closes again, in more places. The
foundational circuits of a combination are few and close early as far as it
has been built, and nearly every harmonic is predicted from the levels below
it before its own level is built. An account of every chord of every
supertile says how much room is left for anything else.

Module: [`foundations.ts`](../web/src/pages/foundations/foundations.ts).
Scripts: [`foundations-sweep.ts`](../web/circuit-classes/foundations-sweep.ts)
(every combination of a rule),
[`foundations-predict.ts`](../web/circuit-classes/foundations-predict.ts)
(predict, then build, level by level),
[`foundations-index.ts`](../web/circuit-classes/foundations-index.ts)
(the summary), all running
[`comboAnalysis.ts`](../web/src/pages/foundations/comboAnalysis.ts) per
combination,
[`foundations-recurrence.ts`](../web/circuit-classes/foundations-recurrence.ts)
(the lengths along a chain). Data: `web/circuit-classes/data/foundations/hex-023468/`. Tests:
[`foundations.test.ts`](../web/src/pages/foundations/__tests__/foundations.test.ts).

The Foundations page (`foundations.html`) shows every combination's
foundational circuits, chains and account of chords, from a cut of the
sweep's output in `web/public/data/foundations/hex-023468/`
([`foundations-page.ts`](../web/circuit-classes/foundations-page.ts),
[`pageData.ts`](../web/src/pages/foundations/pageData.ts)). It marks as
monsters the foundational circuits that start a chain at floor + 4 or later
or are nuggets there (§6), and the 19 of at least 100,000 tiles.

The page reads the precomputed data of 023468 and analyses any other rule,
or any other level, live: the rule and combination chosen with the shared
picker (and kept in the address, `?rule=…&combo=…&level=…`), the same
`analyseCombo` run in a worker with its progress shown, to level 8 by
default and one level further on request. Sweeping a rule runs every
combination in the worker and fills the combination list and the Monsters
tab as results arrive, keeping them in the browser (IndexedDB) for the next
visit; the number of combinations is shown first, since some rules have far
more than 320. The CLI sweep takes the rule as its first argument, so any
rule can be precomputed and committed the same way. A test runs the live
analysis of two combinations of 023468 afresh and finds the precomputed
files.

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

## 2. Chains and nuggets

A place is a closing with its own child slots: the same circuit closes
across different pairs of children, in different places of a supertile, and
again across the seams of every bigger supertile. The places with one word
are one circuit (`wordKey`, the word read where it reads least, hashed, as
`circuitKey` does with letters; tested against `circuitKey` on four
combinations). A circuit is sorted where it first closes. It is a harmonic
of the circuit two levels down that the most of its places there read as,
each against a place with the same family. In 2,142 of the 2,246 harmonics
of 023468 every place does; in the other 104 some places read as no place of
the parent (the 66-tile harmonic of the 15 in 000000001 closes in 10 places
at level 5, the 15 in 7 at level 3).

140000001, classified to level 9 (the level-10 to 12 lengths from the tables
up to one level below, §3):

| foundational | level | places at its level, in all to 9 | chain, two levels at a time |
|---|---|---|---|
| 60 | 3 | 1, 1 | nugget |
| 303 | 4 | 1, 1 | 14,679; 734,256; 36,701,253; 1,834,460,910 |
| 2,079 | 5 | 1, 1 | 103,851; 5,191,191; 259,474,518 |
| 57 | 5 | 8, 60 | 3,090; 153,327; 7,662,954 |
| 447 | 6 | 8, 47 | 21,705; 1,083,894; 54,176,298 |

Five foundational circuits, four of them chains, and nothing foundational
closes at levels 7 to 9; at level 10 every closing is a known circuit (65
places) or a predicted harmonic (9 places). The 57 first closes in eight
places at level 5, one per pair of children of families 07, 12, 13, 14, 17,
45, 46 and 47, then in 13 more places at each level above; its harmonics
close in the same eight places where they first close.

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
tails(t, n)  = room(t, n) - closing at n (nuggets + chains' foundational + harmonics)
```

The counts are integers and both identities hold exactly at every level and
type (tested). A closing counts towards its circuit's class at whatever
level it closes. A Delta of 140000001, level by level:

| level | chords | room | nuggets | chains: foundational | chains: harmonics | tails | tails' share |
|---|---|---|---|---|---|---|---|
| 3 | 867 | 867 | 60 | 0 | 0 | 807 | 0.931 |
| 4 | 6,818 | 6,338 | 0 | 303 | 0 | 6,035 | 0.885 |
| 5 | 53,679 | 47,475 | 0 | 3,105 | 0 | 44,370 | 0.827 |
| 6 | 422,606 | 349,031 | 0 | 13,404 | 14,679 | 320,948 | 0.759 |
| 7 | 3,327,171 | 2,524,680 | 0 | 65,730 | 159,471 | 2,299,479 | 0.691 |
| 8 | 26,194,754 | 18,088,034 | 0 | 287,412 | 1,415,406 | 16,385,216 | 0.626 |
| 9 | 206,230,863 | 128,886,945 | 0 | 1,226,466 | 11,276,787 | 116,383,692 | 0.564 |

From level 7 everything that closes is a chain's circuit closing again or a
harmonic; nothing foundational first closes. The page stacks these per
level, each type weighted by how often a supertile of that type occurs, with
the harmonics split by order or the chains shown one by one on request.

Any circuit not yet seen closes above level 11, so it is made of chords
that are on tails at level 11: at most 45.7% of a Delta's chords there
(the prediction run of §3), and the tails' share falls by a factor of about
0.90 a level. That is a bound, not an estimate.

### What the tails become

Every chord on a tail at level L is on a circuit closing above L or on an
infinite strand. A circuit closing at level m is made of chords on tails at
every level below m, so the tails at L of a level-N supertile, less its tails
at N, are exactly the chords of the circuits closing at levels L + 1 to N
inside it (tested in integers, per type, on three combinations, against the
tables' arc lengths). Weighted by type frequency, the share of the tails at
L that close by L + k into each chain, into nuggets, into circuits at level
10 that are no known word and no predicted harmonic (unseen), or are still
open, for 140000001 and L = 5:

| by level | chain of 303 | chain of 2,079 | chain of 57 | chain of 447 | nuggets | unseen | still open |
|---|---|---|---|---|---|---|---|
| 6 | 4.3% | 0.0% | 1.5% | 2.3% | 0.0% | 0.0% | 91.9% |
| 7 | 4.3% | 3.8% | 4.4% | 3.8% | 0.0% | 0.0% | 83.6% |
| 8 | 7.7% | 3.8% | 6.2% | 6.5% | 0.0% | 0.0% | 75.7% |
| 9 | 7.7% | 6.9% | 8.9% | 8.2% | 0.0% | 0.0% | 68.3% |
| 10 | 10.5% | 6.9% | 10.5% | 10.6% | 0.0% | 0.0% | 61.5% |

No combination of 023468 has anything unseen at level 10.

### Back-test

At each level L, the circuits known by L (with their chains' later members)
against what the tails at L close into, to level 10. The share left to
circuits found later drops, at each level, by exactly what the foundational
circuits found at the next level close, and is 0 from the last of them on.

| L | 140000001: known by L | found later | still open at 10 | found at L + 1 |
|---|---|---|---|---|
| 2 | 0.0% | 49.2% | 50.8% | 60 (7.0%) |
| 3 | 0.0% | 45.4% | 54.6% | 303 (14.2%) |
| 4 | 9.8% | 32.8% | 57.4% | 57 (12.0%), 2,079 (10.9%) |
| 5 | 28.0% | 10.6% | 61.5% | 447 (10.6%) |
| 6 | 33.1% | 0.0% | 66.9% | |
| 7 | 26.5% | 0.0% | 73.5% | |
| 8 | 18.8% | 0.0% | 81.2% | |
| 9 | 10.0% | 0.0% | 90.0% | |

| L | 000001100 (floor 4): known by L | found later | still open at 10 | found at L + 1 |
|---|---|---|---|---|
| 2 | 0.0% | 89.3% | 10.7% | 6, 6 |
| 3 | 12.0% | 76.6% | 11.5% | 69, 81 |
| 4 | 17.7% | 69.1% | 13.2% | 93, 1,707, 7,899 |
| 5 | 26.8% | 54.1% | 19.1% | |
| 6 | 16.6% | 61.6% | 21.8% | 4,143, 22,389, 54,759, 150,153 |
| 7 | 68.7% | 0.0% | 31.3% | |
| 8 | 57.1% | 0.0% | 42.9% | |
| 9 | 32.8% | 0.0% | 67.2% | |

### Forecast

From a level L, with what is known by L only: each chain with two members
first closed by L goes on two levels at a time, each member taking q times
its predecessor's share where it first closes, q the ratio of the last two.
That is the place counts per supertile of each type (a harmonic closing in
as many places as its parent two levels down) times the tiles (growing as
over the last two members) over a supertile's chords (growing by
(4 + √15)² every two levels). A chain stops when a member due by L is
missing, or when its last member's harmonic, predicted from the tables up
to L, is a circuit seen lower down: the chain closes into itself. The
forecast of the next members, against the build:

| forecast from | 140000001: forecast | in the build |
|---|---|---|
| 6 | 4.92% | 5.15% |
| 7 | 8.94% | 9.05% |
| 8 | 7.49% | 7.40% |
| 9 | 3.47% | 3.50% |

From level 10 the known chains of 140000001 are expected to take 30.6% of
all chords, 60% of the 50.8% still on tails there; the rest is room for its
known circuits closing again in more places (the 57 and the 447 close in 13
more places every level), for new circuits and for open strands.

The forecast's one assumption fails in places: a harmonic closes in a
different number of places per supertile of some type than its parent two
levels down in 891 of 20,214 checks, in 71 combinations. In 82
combinations a chain closes into itself one level after its last member,
so the forecast made at that level takes more than the build shows. The
page flags both, per combination.

## 5. Shares in the limit

For 140000001 the lengths along a chain obey an exact recurrence (§3), so
the members can be carried on past the build and their share of a Delta's
chords summed level by level in integers. The chain of family 147 (the 60,
303 and 2,079 and their harmonics, one copy in every supertile of every
type) and the harmonics of the 57 in family 07 (two copies in every type,
its other closings left out):

| chain | share at level 10 | at level 40 | at level 100 | at level 200 |
|---|---|---|---|---|
| family 147 | 0.298657 | 0.493260 | 0.501282 | 0.501294 |
| 57 in family 07, harmonics only | 0.010727 | 0.022221 | 0.022695 | 0.022696 |

The circuits of family 147 take half of all chords in the limit. They grow
like λ^n with λ = 7.0699… against the supertile's (4 + √15)^n = 7.8730^n,
so each level adds a share smaller by about 0.898, and the sum converges.
The tails' share is 0.508 at level 10 and shrinks by about 0.90 a level; if
that ratio holds, every chord but a share 0 lies on a closed circuit in the
limit, and the other half belongs to the seam chains (the 57 and 447 and
their harmonics), closing again in more places every level, counts the
account has level by level but no formula carries on yet.

## 6. Every combination of 023468

The sweep classifies each of the 320 combinations to level 9 at floors 1 to
4, takes the combination's floor, predicts every harmonic from level f + 2
up, checks it against the build, and builds level 10 to see what the tails
close into. 4,714 circuits in all; 2,468 foundational, 1,309 of them chains
and 1,159 nuggets, 2 to 12 per combination.

| floor | last level a foundational circuit first closes at | combinations |
|---|---|---|
| 1 | 3 | 20 |
| 1 | 4 | 110 |
| 1 | 5 | 2 |
| 2 | 4 | 7 |
| 2 | 5 | 71 |
| 2 | 6 | 8 |
| 3 | 5 | 2 |
| 3 | 6 | 81 |
| 3 | 7 | 2 |
| 4 | 7 | 17 |

With a floor f, a circuit can be a harmonic only from level f + 4 up: its
circuit two levels down must agree at two levels from f up. So a
foundational circuit at level f + 3 or below is one the definition cannot
place in a chain yet, and the question is what first closes from f + 4 up:

| highest foundational level, less the floor | combinations |
|---|---|
| 2 | 29 |
| 3 | 279 |
| 4 | 12 |
| 5 or more | 0 |

The 24 foundational circuits at f + 4, in 12 combinations: the 447 of
140000001 and the 438 of 141000001 (one circuit each, in 8 places at level
6 and 47 to level 9); two seam circuits at level 6 in 111000100 and five
neighbours; the 57 and 60 at level 5 in 100000001 and 101000001; and three
at level 7 in each of 120000001 and 121000001: the 8,454 (8,274) nugget,
closing in 98 places through 13 families, and two chains of family 147.
Every closing at level 10, in every combination, is a known circuit or a
predicted harmonic: none is unseen. The largest foundational circuits are
the 100,000 to 171,000-tile ones of family 013467 at level 7 in the floor-4
combinations (031001001: 170,976 tiles), each followed only by its
harmonics and its own closings again at levels 8 and 9.

Every circuit from level f + 2 up has its harmonic predicted, from the
tables up to one level above it:

| prediction | count |
|---|---|
| closes two levels up and is the harmonic found there | 2,179 |
| closes there, as a circuit that first closed lower down | 215 |
| none predicted, and the build has none | 68 |
| none predicted, but the build has a harmonic | 4 |
| closes there as the harmonic of another circuit | 2 |
| forecast for the level above the build | 806 |

The 4 misses are in 011001001, 031001001, 120000001 and 121000001, the 2
others in 110000001 and 111000001.

## 7. Open strands

A tail is an open arc of a supertile's table: part of a strand that has not
closed by that level. A strand that never closes is an infinite strand of
the tiling. Its tiles are on tails at every level, so the tails' share at
level n bounds the share of chords on infinite strands, and of chords on
circuits closing above n.

| tails' share at level 10 over level 9 | combinations |
|---|---|
| under 0.7 | 307 |
| 0.90 to 0.96 | 13 |

| combination | floor | tails' share at level 9 | at level 10 | ratio |
|---|---|---|---|---|
| 000100000 | 1 | 0.058 | 0.035 | 0.602 |
| 001001000 | 3 | 0.147 | 0.090 | 0.615 |
| 140000001 | 2 | 0.564 | 0.508 | 0.900 |
| 111000100 | 2 | 0.694 | 0.650 | 0.936 |
| 100000001 | 1 | 0.795 | 0.762 | 0.959 |

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
- That nothing foundational first closes from level f + 5 up: none does in
  any combination of 023468 to level 9, and nothing unseen closes at
  level 10.
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
- The closings of a circuit above where it first closes: their places grow
  each level (the 57 of 140000001: 8, then 13 more at each of levels 6 to
  9) and the count is not yet predicted, only accounted for.
- The 4 predictions of §6 that find no walk where the build has a
  harmonic: a window at another visit than the first would be tried next.

## Reproducing

```bash
cd web
node --max-old-space-size=3500 node_modules/.bin/vite-node circuit-classes/foundations-sweep.ts -- 023468 9 0 1   # rule, level, shard 0 of 1
node node_modules/.bin/vite-node circuit-classes/foundations-index.ts -- 023468
node node_modules/.bin/vite-node circuit-classes/foundations-page.ts -- 023468
node node_modules/.bin/vite-node circuit-classes/foundations-page.ts -- 023468
node --max-old-space-size=9000 node_modules/.bin/vite-node circuit-classes/foundations-predict.ts -- 023468 140000001 11
node --max-old-space-size=12000 node_modules/.bin/vite-node circuit-classes/foundations-recurrence.ts -- 023468 140000001 11 147,07
npx vitest run src/pages/foundations
```

The sweep takes 15 to 40 s a combination at level 9 (building level 10
too); the prediction run to level 11 about 20 minutes.
