# The limit shape of the supertiles

Build supertiles level after level and scale each one down by
λ = √(4+√15) ≈ 2.806, the growth of one level. The outlines settle on one
shape, the same whether the levels start from hexagons or from Spectres. The
[Limit shape](https://bohemian-miser.github.io/Spectre/limit.html) page
computes everything below and animates one start's outline turning into the
other's at any level. Code: [`core/limitShape.ts`](../web/src/core/limitShape.ts),
tests in [`limitShape.test.ts`](../web/src/core/__tests__/limitShape.test.ts).

## Two outlines per level

A level-n outline is built from the level-(n − 1) outlines of its children:
place each by its slot transform, drop every edge that meets its exact
reverse (in Z[ζ12]), and walk what is left. Every level up to 7, from either
start, is one simple closed loop (the walk throws otherwise).

The outline only depends on which slots hold a Gamma. Slot 7 always does, and
a Gamma has no slot 2, so Delta, Theta, Lambda, Xi, Pi, Sigma, Phi and Psi
share one outline at every level, and Gamma's is that outline less its
slot-2 child.

| Level | Edges | Edges, Gamma | Growth |
|---|---:|---:|---:|
| 0 | 14 | 20 | |
| 1 | 46 | 44 | 3.286 |
| 2 | 182 | 160 | 3.957 |
| 3 | 758 | 652 | 4.165 |
| 4 | 3,198 | 2,736 | 4.219 |
| 5 | 13,534 | 11,564 | 4.232 |
| 6 | 57,318 | 48,960 | 4.235 |
| 7 | 242,790 | 207,372 | 4.236 |

At a growth of 4.236 edges a level, against λ in size, the limit's outline is
a fractal curve of dimension about log 4.236 / log λ ≈ 1.40.

## Key points

A supertile's children are placed from its four key points alone (vertices
3, 5, 7, 11 of the Spectre; 1, 2, 3, 5 of the hexagon), and one level maps
the key points of level n to those of level n + 1 by a fixed real-linear map.
Up to translation its eigenvalues are ±λ, ±1 and ±1/λ. The ±λ pair is the
four points growing as one similar shape; no tile here has any of the ±1
pair; so every start's key points close in on the same four points by
1/λ² = 4 − √15 ≈ 0.127 a level. With the first at 0 and the last at 1 they
are 0, −0.072749 − 0.703355i, 0.5 − 1.118034i, 1.

## The outlines

The key points are settled by level 3. What is left is the outline's own
detail, the size of one tile, which is λ⁻ⁿ of a level-n supertile, so the
outlines close in by about 1/λ ≈ 0.356 a level. Hausdorff distance between
the hexagon and Spectre starts, in the frame where the key points run from 0
to 1:

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Hexagon to Spectre | 0.4021 | 0.1650 | 0.0698 | 0.0257 | 0.0094 | 0.0033 | 0.0012 |

## Is there a better tile

The Spectre is Tile(1,1) of the family Tile(a,b): edges at multiples of 60°
have length a, the rest length b. Let a and b be complex, so each kind of
edge also turns by a fixed angle; the substitution only turns, shifts and
mirrors tiles, so the tiles still meet edge to edge, with Gamma2 the
Tile(b,a) turned 30° (for real a and b, the hat family's Turtle in a Hat). The key points of Tile(1,b) are
linear in b, and one b puts them exactly at the limit:
b ≈ −0.4589 − 0.6156i (length 0.768, turned −126.7°). Every level of that
tile is a similar copy of the last. But its outline crosses itself (edge 1
over edge 12), and so does its outline at every level checked, so it is not a
tile.

Fixing the key points does not bring the outline in anyway. Distance of each
start's outline from the level-6 outline of Tile(1,b):

| Start | Level 0 | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|---:|
| Hexagon | 0.4994 | 0.1906 | 0.0697 | 0.0248 | 0.0085 | 0.0027 |
| Spectre, Tile(1,1) | 0.7671 | 0.3062 | 0.1152 | 0.0416 | 0.0145 | 0.0048 |
| Hat, Tile(1,√3) | 0.7730 | 0.2970 | 0.1108 | 0.0401 | 0.0140 | 0.0051 |
| Turtle, Tile(√3,1) | 0.6744 | 0.2695 | 0.1015 | 0.0366 | 0.0128 | 0.0042 |
| Tile(1,b) | 0.6493 | 0.1997 | 0.0714 | 0.0255 | 0.0094 | 0.0032 |

The hexagon is nearest at every level. The Spectre is about 1.7 times as far,
which is half a level behind. A grid of complex b (step 0.1, simple polygons
only), measured at level 4 against level 7, found no Tile(1,b) nearer than
the hexagon: the best, near b = −0.1i, are thin and nearly degenerate and
come out level with Tile(1,b) above.

The only tile at the limit is the limit itself. Its level-6 outline with its
eight children drawn in is the same outline eight times, each turned over and
shrunk by λ, with the slot-7 child a Gamma: a tile with that outline would be
its own supertile. It has a fractal outline, not a polygon.

## Open questions

- An exact value of the outline's growth: the measured ratios approach
  2 + √5 ≈ 4.2361 to four places, which would make the dimension
  2 log(2 + √5) / log(4 + √15).
- Whether a tile with curved edges (each kind of edge a fixed curve, as the
  Spectre's curved edges are) can have the limit's key points without
  crossing itself.
