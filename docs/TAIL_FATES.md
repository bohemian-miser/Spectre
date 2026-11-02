# Tail fates

A tail is an arc of a type's table at level n: a strand entering the
supertile at one border place and leaving by another. What it closes into
depends on where its supertile sits, and a supertile sits in many places.
Every tail is followed through every placement to the top level built, the
strands that never close are certified as infinite lines, and what the
Foundations account leaves over in the limit is sorted by why.

Modules: [`src/pages/fates/`](../web/src/pages/fates/). Script:
[`tail-fates.ts`](../web/circuit-classes/tail-fates.ts), which writes every
number below. Tests:
[`fates.test.ts`](../web/src/pages/fates/__tests__/fates.test.ts) and the
Explorer's
[`tailClasses.test.ts`](../web/src/pages/explorer/__tests__/tailClasses.test.ts).

## Method

**Lifts** ([`lifts.ts`](../web/src/pages/fates/lifts.ts)). For a level-(m + 1)
supertile of type P, every child crossing is on one route of P's table or on
one closing walk. One array per level and parent type sends each arc of each
child to the route or closing it lies on.

**Every placement** ([`placements.ts`](../web/src/pages/fates/placements.ts),
[`fateSets.ts`](../web/src/pages/fates/fateSets.ts)). A type sits in each
parent type and slot whose substitution rule has it. The fates of an arc of
type X at level m are the union, over its placements (P, s), of the closing
it lands in or the fates of the arc of P it lands on. The fates form a graph
over (level, type, arc), worked out from the top down. At the top level built
an arc is still open, on a certified infinite line or not. A fate is the
closing's bucket in the shares (chain, class and harmonic order); its
**class** is the chain whatever the member, the nugget, or unseen.

**Weighting** ([`fateMass.ts`](../web/src/pages/fates/fateMass.ts)). A
placement's share of a type's copies is its parent type's frequency over
the sum across the type's placements. The tiles on every tail at level L,
each type weighted by its frequency, are pushed up through every placement by
those shares to the top.

**Infinite lines** ([`lines.ts`](../web/src/pages/fates/lines.ts)). A border
place's **border path** is the slot of each child it sits on, from the
supertile down, then the tile's edge. Follow an arc of type X up a repeating
ancestry of period q (one or two levels a turn, or twice round) to the arc of
X it lies on. The arc is fixed when each end's border path one turn up is its
border path with one block of q slots repeated in place. An arc of level n is
certified when its arcs from two turns below n to one turn above it are each
fixed, the last turn followed through the routes, and neither end lies on an
edge the ancestry keeps on the outline for ever. Two turns are not enough: in
110000001 arcs fixed from level 3 to 5 and from 5 to 7 move off their pattern
at level 9. In 140000001 a Delta as slot 1 of a Delta has a certified line:
its ends at levels 6, 8, 10 and 12 run

```
1 4 4 4 5 5 | edge 4
1 4 4 4 4 4 5 5 | edge 4
1 4 4 4 4 4 4 4 5 5 | edge 4
1 4 4 4 4 4 4 4 4 4 5 5 | edge 4
```

one more turn of a Sigma's Sigma child at slot 4 each time (the first end;
`fates.test.ts` checks both). Every tail of a level-4 Delta that this
ancestry does not close joins it (`tailClasses.test.ts`). The
share of chords on certified lines at level n counts the chords on the
certificate's first arc times the share of copies whose next three turns of
ancestry are the cycle: those are on a tail at n, on a certified arc. It is
a part of its own in the account and a colour of its own in the Explorer's
Tails toggle, computed at the top and never forecast.

**The remainder** ([`remainder.ts`](../web/src/pages/fates/remainder.ts),
[`above.ts`](../web/src/pages/fates/above.ts)). The tails at the top level
built less every closing the forecast puts above it: in the limit column, the
account's not accounted for and its infinite lines. Tiles on tails at the top
are sampled (a type by frequency, an arc by its tiles) with an ancestry drawn
placement by placement, and followed through the routes to level 14 as the
Explorer's tail classes follow them, at most 300,000 routes each, each
closing named from the combination's circuits. Against the forecast chain by
chain and level by level, the remainder splits exactly into:

| part | what it is |
|---|---|
| not forecast | tails closing by level 14 into a chain the forecast does not carry on, less its forecast closings again |
| several fates | tails the account does not split by placement |
| infinite lines | the account's certified lines |
| unknown | tails closing by level 14 into a circuit the combination's circuits do not name |
| forecast error | tails closing by level 14 into every other chain and nugget, less what the forecast puts there |
| open past 14 | tails open at level 14, less the forecast's closings above it and the lines |

A tail whose routes run out before level 14 is compared with the forecast to
the level it reached.

## Findings

**Issue #206: yes.** A tail's class depends on its placement. Below the
classifiable level some tails of every combination run close into two
classes or more, in 140000001 from level 1 to level 7; one level-5 Delta tail
closes into three chains by the placements in the table below. The
classifiable level is the lowest at which no tail does so before the top
built, so it is bounded by the build: a tail one or two levels below the top
has few placements left to tell apart.

**Weighting.** The account counts every copy of every supertile, so
`tailFates` and `account` already split a tail with several fates by how often
each placement occurs: the push through every placement gives the same
shares to their rounding (table). Nothing is counted twice or dropped, and
they are unchanged.

**Infinite lines.** Certified at levels 8 to 10 in the combinations run, on
a share of the chords below 0.0001% in every one: the ancestry that keeps a
line open is one among many.

**The remainder.** In 110000001 and 111000001 the chain of 60 at level 5,
whose shares grow, takes part of the remainder by level 14, and most of the
rest is still open there, half of it where the routes ran out before 14. In
101000001 and 140000001 the remainder is below what 300 tails resolve: the
unknown closings and the forecast error offset each other, which fits
harmonics of forecast chains that the reading does not name above the build.
No part is several fates or infinite lines.

The numbers below are from 17 combinations: the four short ones (300 tails
followed each) and 13 more (40 each). `tail-fates.ts` runs any set of them.

<!-- tables -->
Combinations of 023468 run: 17.

### Classifiable level

| classifiable from level | combinations | of them |
|---|---|---|
| 5 | 3 | 101000001, 110000001, 111000001 |
| 8 | 4 | 120001001, 130001000, 140000001, 141000001 |
| 9 | 10 | 000100000, 001001100, 001100101, 011000100, 020100000, 031101001, … |

| combinations with a level-5 tail closing into two classes or more | 14 of 17 |
|---|---|

Tails closing into two classes or more, all types, per level (short combinations first):

| combination | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 110000001 | 35 of 35 | 74 of 107 | 180 of 407 | 324 of 1683 | 0 | 0 | 0 | 0 | 0 |
| 111000001 | 35 of 35 | 74 of 107 | 180 of 407 | 324 of 1683 | 0 | 0 | 0 | 0 | 0 |
| 101000001 | 35 of 35 | 99 of 107 | 331 of 407 | 698 of 1683 | 0 | 0 | 0 | 0 | 0 |
| 140000001 | 31 of 35 | 85 of 107 | 312 of 407 | 1191 of 1683 | 4562 of 7083 | 15955 of 29963 | 14204 of 126879 | 0 | 0 |

A level-5 Delta tail of 140000001, from place 0 to 2 (4 tiles), by the shortest placements to each class:

| placements up | closes at | into |
|---|---|---|
| slot 1 of a Sigma, slot 4 of a Pi, slot 5 of a Delta, slot 1 of a Delta, slot 1 of a Delta | 10 | chain of 447 at level 6, harmonic 2 |
| slot 1 of a Delta, slot 1 of a Gamma, slot 7 of a Delta | 8 | chain of 303 at level 4, harmonic 2 |
| slot 1 of a Gamma, slot 7 of a Delta | 7 | chain of 2,079 at level 5, harmonic 1 |

### Weighting

| largest difference, any combination, level and class | 1.6e-6 |
|---|---|

### Infinite lines

| combination | arcs certified at the top | share at the top | share one level down |
|---|---|---|---|
| 140000001 | 22 | 5.50e-7 | 4.10e-7 |
| 141000001 | 22 | 5.34e-7 | 3.99e-7 |
| 031101001 | 8 | 6.68e-8 | 9.41e-8 |
| 120001001 | 14 | 5.05e-8 | 6.27e-8 |
| 011000100 | 7 | 4.04e-8 | 6.40e-8 |
| 130001000 | 14 | 3.81e-8 | 4.71e-8 |
| 141101101 | 8 | 2.49e-8 | 3.46e-8 |
| 000100000 | 8 | 2.13e-8 | 2.96e-8 |
| all 17, mean | | 8.01e-8 | |

### The remainder

Shares of all chords, ± one standard error of the sample:

| combination | limit | remainder | not forecast | several fates | infinite lines | unknown | forecast error | open past 14 | tails followed |
|---|---|---|---|---|---|---|---|---|---|
| 110000001 | 63.32% | 36.68% | 4.98% ± 0.89% | 0.00% | 0.00% | 1.52% ± 0.47% | -0.65% ± 0.62% | 30.82% ± 1.09% | 300 |
| 111000001 | 64.89% | 35.11% | 3.88% ± 0.80% | 0.00% | 0.00% | 1.60% ± 0.47% | 0.37% ± 0.69% | 29.26% ± 1.05% | 300 |
| 101000001 | 99.42% | 0.58% | 0.00% | 0.00% | 0.00% | 2.71% ± 0.80% | -1.79% ± 1.38% | -0.33% ± 1.52% | 300 |
| 140000001 | 99.45% | 0.55% | 0.00% | 0.00% | 0.000055% | 2.71% ± 0.66% | -4.54% ± 0.94% | 2.38% ± 1.04% | 300 |
| 141000001 | 99.54% | 0.46% | 0.00% | 0.00% | 0.000053% | 1.23% ± 1.23% | -0.06% ± 2.86% | -0.72% ± 2.94% | 40 |
| 001001100 | 99.98% | 0.02% | 0.00% | 0.00% | 0.00% | 0.75% ± 0.29% | -0.95% ± 0.38% | 0.21% ± 0.30% | 40 |
| 100000101 | 99.99% | 0.01% | 0.00% | 0.00% | 0.00% | 0.58% ± 0.22% | -0.83% ± 0.30% | 0.26% ± 0.25% | 40 |
| 101000100 | 100.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.38% ± 0.22% | -0.59% ± 0.35% | 0.21% ± 0.31% | 40 |
| 101001101 | 100.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.38% ± 0.22% | -0.59% ± 0.35% | 0.21% ± 0.31% | 40 |
| 001100101 | 100.00% | -0.00% | 0.00% | 0.00% | 0.00% | 0.24% ± 0.11% | -0.39% ± 0.17% | 0.15% ± 0.15% | 40 |

| combination | chains not forecast |
|---|---|
| 110000001 | chain of 60 at level 5 |
| 111000001 | chain of 60 at level 5 |
| 101000001 | none |
| 140000001 | none |

Where the followed tails of the short combinations went, as shares of the tails at the top (± one standard error):

| combination | fates by level 14 |
|---|---|
| 110000001 | routes ran out, open 47.3% ± 2.9%; open at 14 30.0% ± 2.6%; chain of 60 at level 5 13.3% ± 2.0%; chain of 57 at level 5 5.7% ± 1.3%; a circuit not known 3.3% ± 1.0%; nugget of 219 at level 5 0.3% ± 0.3% |
| 111000001 | routes ran out, open 46.0% ± 2.9%; open at 14 30.7% ± 2.7%; chain of 60 at level 5 11.3% ± 1.8%; chain of 57 at level 5 7.0% ± 1.5%; a circuit not known 3.7% ± 1.1%; nugget of 216 at level 5 1.3% ± 0.7% |
| 101000001 | routes ran out, open 58.0% ± 2.8%; open at 14 25.3% ± 2.5%; chain of 57 at level 5 6.7% ± 1.4%; chain of 60 at level 5 6.3% ± 1.4%; a circuit not known 3.7% ± 1.1% |
| 140000001 | routes ran out, open 65.0% ± 2.8%; open at 14 15.0% ± 2.1%; chain of 57 at level 5 6.7% ± 1.4%; chain of 447 at level 6 5.7% ± 1.3%; a circuit not known 5.3% ± 1.3%; chain of 2,079 at level 5 2.3% ± 0.9% |

| run time per combination | mean | longest |
|---|---|---|
| seconds | 242 | 546 |
<!-- /tables -->
