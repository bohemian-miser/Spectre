# Spectre

## [Live site: bohemian-miser.github.io/Spectre](https://bohemian-miser.github.io/Spectre/)

<a href="https://bohemian-miser.github.io/Spectre/map.html"><img src="docs/screenshots/hero-fass.png" alt="A single strand traced through a hexagon tiling, coloured by distance along it" width="100%"></a>

<sub>A strand from the infinite line in <a href="docs/FASS_THEOREM.md">FASS_THEOREM.md</a> (hexagons, rule <code>128</code>), coloured by distance along it.</sub>

Playing with the spectre tiling. You mark some of the edges, a line goes through each marked edge, and each tile joins up the lines coming into it. Then you see what happens: closed circuits, lines that go on forever, or both.

Mostly vibe coded and plagiarised from https://cs.uwaterloo.ca/~csk/spectre/app.html. I've included the original version of this under `web_orig`.

## Screenshots

<table>
<tr>
<td width="50%"><a href="https://bohemian-miser.github.io/Spectre/#/explorer?v=1&f=spectre&lv=3&e=2578&c=0100101100"><img src="docs/screenshots/explorer.png" alt="Explorer showing a level-3 supertile with rule 2578"></a><br>Explorer, level 3 supertile, rule <code>2578</code></td>
<td width="50%"><a href="https://bohemian-miser.github.io/Spectre/#/explorer?v=1&md=infinite&e=2578&c=0100101100&lv=4"><img src="docs/screenshots/explorer-infinite.png" alt="Explorer in infinite mode"></a><br>Explorer in infinite mode</td>
</tr>
<tr>
<td><a href="https://bohemian-miser.github.io/Spectre/map.html#/map?seed=1&z=5&ln=1&e=2578&c=0100101100"><img src="docs/screenshots/hero-trace.png" alt="One strand traced on the infinite map"></a><br>One strand traced on the infinite map</td>
<td><a href="https://bohemian-miser.github.io/Spectre/map.html#/map?seed=1&z=36&ln=1&e=2578&c=0100101100"><img src="docs/screenshots/map-close.png" alt="Infinite map zoomed in"></a><br>Infinite map, zoomed in</td>
</tr>
<tr>
<td><a href="https://bohemian-miser.github.io/Spectre/supertiles.html#/supertiles?lv=3&gap=0.35&ln=1&e=2578&c=0100101100"><img src="docs/screenshots/supertiles.png" alt="A Delta supertile split into its eight children"></a><br>A Delta supertile split into its eight children</td>
<td><a href="https://bohemian-miser.github.io/Spectre/tails.html"><img src="docs/screenshots/tails.png" alt="The Tails Problem page"></a><br>The Tails Problem</td>
</tr>
<tr>
<td><a href="https://bohemian-miser.github.io/Spectre/stats.html"><img src="docs/screenshots/stats.png" alt="Circuits and stats page"></a><br>Circuits &amp; Stats</td>
<td><a href="https://bohemian-miser.github.io/Spectre/machine.html"><img src="docs/screenshots/machine.png" alt="Strand machine page"></a><br>Strand machine</td>
</tr>
</table>

Each screenshot links to the same view on the site.

## The rules

The Spectre proof sorts tiles into nine types: Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi and Psi. Gamma is a pair of Spectres (the "Mystic"), so it's split into Gamma1 and Gamma2, giving ten tile types.

Each tile's 14 edges are grouped into seams (about six per tile). A seam is where two tiles meet, and it has a class from 0 to 8. A `3` seam always meets a `-3` seam. Class 7 only shows up inside the Mystic, so the site labels it `7(M)`.

1. Pick a set of classes, e.g. `{2, 5, 7, 8}`.
2. Every seam of a picked class gets one crossing point, where a line passes from one tile to the next. Both tiles have to agree where on the seam it is.
3. Inside each tile, join the crossings up in pairs. Every crossing joins exactly one other one, so no junctions. A tile with 4 crossings has 3 ways to do this, and each tile type picks one. That choice is the combination string, e.g. `2578-0100101100`.
4. Follow the lines. Each one either closes into a circuit or keeps going.

If a tile type ends up with an odd number of crossings, one line has nothing to pair with and you get a tail. Only odd/even matters, so this is a mod 2 problem. Of the 512 possible sets, 8 work:

```
∅   {1,5}   {0,1,3,6}   {0,3,5,6}   {1,2,7,8}   {2,5,7,8}   {0,2,3,6,7,8}   {0,1,2,3,5,6,7,8}
```

Class 4 is never in any of them. The full explanation is on [the Tails Problem page](https://bohemian-miser.github.io/Spectre/tails.html) and in [`docs/EXPLAINER_COPY.md`](docs/EXPLAINER_COPY.md).

The open question: you can have [a fixed number | an infinite number] of infinite lines and [a fixed number | an infinite number] of circuits of unique lengths. Work out which combinations of lines between edges give each of these and which aren't possible.

## Pages

* **Explorer** (`/`) - the main thing. Build supertiles, pick which edges join up, and watch the circuits light up. Switch it to infinite mode and tap a strand to follow it. It colours the line in a rainbow as far as the tiles on screen go, and keeps going as you pan.
* **Infinite Map** (`/map.html`) - one endless tiling per seed, expanded around the camera. Same tap-to-colour trick, plus seed and instance-budget controls. Works for all four tile families (Tile(1,1), Hexagons, Turtles in Hats, Hats in Turtles) via the family selector or `f=` in the URL. Auto-follow rides the traced strand with a smoothed camera, the Damping slider sets how floaty it is, and Record video saves the canvas to a WebM/MP4 file.
* **The Tails Problem** (`/tails.html`) - an explainer for the edge-matching stuff and why some tiles end up with tails.
* **Circuits & Stats** (`/stats.html`) - the census of every edge combination, with the numbers behind it.
* **Supertiles** (`/supertiles.html`) - pull a supertile apart into the pieces it's made of.
* **Strand machine** (`/machine.html`) - walk a strand one tile at a time and see which joins the labels allow vs which the tiling actually uses.
* **Legacy app** (`/legacy.html`) - the original p5 version. It lets you draw on each of the 10 flavours of tile, has better navigation, and you can change the colours.

## Results so far

Edge selection `15` has a **fixed, finite** set of circuits and no infinite line at all. Every circuit is a loop of 3, 6 or 9 segments, and up to congruence there are only five distinct circuits across all four of its combinations. Two steps are finite checks rather than theorems and are flagged as such, so read it as a strong conditional result rather than a closed one. Write-up in [`docs/CIRCUITS_15.md`](docs/CIRCUITS_15.md), exact-arithmetic scripts in [`web/sel15-proof/`](web/sel15-proof/), and a Lean 4 check of the combinatorial core in [`lean/`](lean/).

The infinite line is now proved. Selection `128` on hexagons with combination `010100000`, and selection `1278` on Tile(1,1) with `0101000000`, make the Psi supertile's strands a single self-avoiding arc through every tile at every level, and along a chain of nested Psi supertiles that exhausts the plane those arcs grow at both ends into one bi-infinite curve. Every supertile is a combinatorial hexagon whose six edges compose from its children's edges by a fixed table, so the strand routing is a fixed operator; non-overlap of the pieces at every level comes from a covering-space argument rather than a per-level check. Write-up in [`docs/FASS_THEOREM.md`](docs/FASS_THEOREM.md), scripts in [`web/fass-theorem/`](web/fass-theorem/), and the combinatorial core machine-checked in Lean 4 in [`lean/FASS/`](lean/FASS/). The earlier proof plan and evidence are in [`docs/FASS_PROOF.md`](docs/FASS_PROOF.md) and [`docs/FASS_1278.md`](docs/FASS_1278.md).

The original intuition, kept for the record: I'm pretty sure I can make either an infinite line but haven't got a solid proof yet. I think I'd need to rework the generator to do a kind of substitution thing instead of the standard spectre algorithm and then I could show that you make a long line/circuit, and when you substitue all the tiles for the next superset you maintain all the paths (like a standard infinite line proof, like the hilbert curve).

I plan on integrating some cool edge stuff from my [blog](https://substack.com/@theharderthanobsidiantower/p-156511066).

## Running it

```bash
cd web
npm install
npm run dev     # http://localhost:8081/Spectre/
npm test
```

`npm run build && npm run preview` serves the built version. It needs the `/Spectre/` base path, so a plain static server at the root won't find the assets.

## Lingo

* 'Thumbs' - the editable tiles at the top of the page. Short for 'Thumbnails'.

## TODO list

* Do everything in shaders so it's nippy af.
* Click on a tile to bring up a large drawable window instead of having all of them at the top all the time.
* Put labels on the thumbnail boxes.
* Remove the duplicate Gamma colour boxes.
* Clean up the ui .. a lot.
* make quads, ids, and edge dots off by default.
* Make 'Show all edge numbers' only turn on/off the edge labels, not the joiner edges
* Add another checkbox for all joiner edges and put it with the joiner edges text
* Fix hexagons and 0-edges they don't need the same treatment as the other shapes.
* Colour choice for lines.
* Download a template, edit as svg and re-upload.
* analysis time in bottom
* graph showing the lines between thumbs
