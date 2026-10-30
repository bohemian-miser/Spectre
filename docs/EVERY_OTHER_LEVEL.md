# The line of rule 128 from its borders

**Subject.** The hexagon tiles, rule `128`, combination `010100000`:
configuration (A) of [`FASS_THEOREM.md`](FASS_THEOREM.md). The argument here
reaches its strand statements (no circuit, one route through every tile of a
Psi, one line through the whole tiling) from a finite computation on the
supertiles' borders, read every other level. The [Every other level page](https://bohemian-miser.github.io/Spectre/period.html)
computes everything below for any combination and animates the step two
levels up; `web/src/pages/period/period.ts` is the computation and
`period/__tests__/period.test.ts` checks it against the leaf tiles' strands.

## The border of a supertile

The border of a level-`n` supertile of type `T` is

* its crossings, numbered `0, 1, 2, …` in order round its edges `0` to `5`,
  with how many sit on each edge, and
* for each crossing, the crossing a strand entering there leaves by.

A strand entering a supertile always leaves it again: every tile pairs all of
its crossings, and every crossing inside the supertile is welded to one in a
neighbouring tile. So the second item is a perfect matching of the crossings.

## One step

The borders at level `n + 1` are a function of the borders at level `n`. A
level-`(n + 1)` supertile of type `P` is made of the children its substitution
rule puts in slots `0` to `7`. Each pair of child edges glued inside it (the
table `G`) welds the crossings of the two edges in reverse order, and each of
its six edges is a run of child edges, each taken backwards (the table `B`).
Walking from each of its border crossings through child routes and welds
until the walk comes out on its border gives its matching; walks that never
reach the border are the circuits closing at level `n + 1`.

`rules`, `G` and `B` are the same at every level: they are the combinatorial
substitution of the hexagon tiles (Tatham's coordinates; read off the
geometry and proved level-independent in [`FASS_THEOREM.md`](FASS_THEOREM.md)
§2–3). So one function `F` takes level `n`'s borders to level `n + 1`'s, for
every `n`, and

> if the borders at level `m + p` equal those at level `m`, then the borders
> at level `n + p` equal those at level `n` for every `n ≥ m`,

by induction: `F` applied to equal borders gives equal borders. Which circuits
close at level `n + 1` is decided by level `n`'s borders as well, so it
repeats with the same period.

## The borders of rule 128

Level 0 is the tiles. From level 1 on every type has the same number of
crossings on each edge at every level, and the matchings alternate:

| type | crossings per edge | odd levels | even levels |
|---|---|---|---|
| Gamma | 1 1 2 4 1 1 | 0–5 1–2 3–4 6–7 8–9 | 0–1 2–3 4–5 6–9 7–8 |
| Delta | 2 1 0 1 2 2 | 0–1 2–7 3–4 5–6 | 0–3 1–2 4–5 6–7 |
| Theta | 2 1 1 1 0 1 | 0–1 2–3 4–5 | 0–5 1–2 3–4 |
| Lambda | 2 1 0 1 1 1 | 0–1 2–5 3–4 | 0–3 1–2 4–5 |
| Xi | 1 0 1 1 0 1 | 0–1 2–3 | 0–3 1–2 |
| Pi | 1 0 0 1 1 1 | 0–3 1–2 | 0–1 2–3 |
| Sigma | 2 1 0 1 2 4 | 0–1 2–7 3–4 5–6 8–9 | 0–9 1–2 3–8 4–5 6–7 |
| Phi | 2 1 0 0 0 1 | 0–1 2–3 | 0–3 1–2 |
| Psi | 1 0 0 0 0 1 | 0–1 | 0–1 |

The step was computed from the tiles to level 3, and level 3's borders are
level 1's. So **the borders at level `n + 2` are those at level `n` for every
`n ≥ 1`**, and the table holds at every level.

## No circuit

No walk closes inside any supertile at levels 1, 2 or 3. Those circuits are
decided by the borders of the tiles and of levels 1 and 2, which are all the
borders there are; so **no circuit closes at any level**.

## One route through every tile of a Psi

A Psi supertile has two crossings at every level, joined by one route. With
no circuit, every chord of every tile of a Psi lies on a strand that reaches
the Psi's border, and the only one is that route: it passes every tile.

| level | tiles | chords of the tiles | chords on the route |
|---|---|---|---|
| 1 | 8 | 9 | 9 |
| 2 | 63 | 83 | 83 |
| 3 | 496 | 667 | 667 |
| 4 | 3,905 | 5,265 | 5,265 |

## The line

A Psi has Psi children in slots 0, 2 and 5. Both crossings of each are on
child edges that `G` glues to siblings, at odd and even levels alike. A
strand entering such a child runs its whole route and leaves by the other
crossing into a sibling, so the child's route is the middle of its parent's,
with more of the parent's route on each side.

Put each Psi in the next at slots `0, 5, 0, 5, …`. An edge of a child stays on
its parent's border only through the parent edges `B` makes of it; following
those edges, each Psi of the chain is clear of the border of the Psi five
levels up, whichever of the two slots it starts at. The chain's supertiles
therefore cover a tiling in which every tile edge is glued, and their routes,
each the middle of the next and longer at both ends, join into **one line,
unending both ways, through every tile** of it. That tiling is the plane:
[`FASS_THEOREM.md`](FASS_THEOREM.md) §4.

Self-avoidance is separate and short for the hexagons: each chord stays
inside its convex tile and tiles do not overlap ([`FASS_THEOREM.md`](FASS_THEOREM.md) §6).

## What rests on what

| statement | from |
|---|---|
| `rules`, `G`, `B` are the same at every level | `FASS_THEOREM.md` §2–3 |
| borders repeat every two levels from level 1 | levels 0–3 computed, then the induction above |
| no circuit at any level | levels 1–3 computed |
| the Psi's route passes every tile | the two above |
| the Psi chain `0, 5` buries each Psi in five levels | `B`, computed |
| the chain covers the plane | `FASS_THEOREM.md` §4 |
