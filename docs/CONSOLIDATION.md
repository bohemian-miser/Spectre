# Consolidation plan

Each page grew its own way of choosing a rule and combination, its own URL
codec and, often, its own copy of a core routine. This plan sets one model
for a rule and combination, one control for it, one address format, and a
library that this site and
[aperiodic-circuits](https://github.com/bohemian-miser/aperiodic-circuits)
can both build on, so that a new page takes the solved problems from the
library instead of solving them again.

Work is listed in order at the end. Issue
[#149](https://github.com/bohemian-miser/Spectre/issues/149) (one picker for
every page) is step 2. Prototypes:

- [Combination bar](https://claude.ai/artifact/5nrRiqnNiDdh9FPXr1U8gr), built
  from the core's tile outlines, seams and pairings.
- [Site map](https://claude.ai/artifact/3cdNwLQG6qNgzHJqkiU3WN), where each
  page goes, marked agreed or proposed.

## How changes are made

- **The answers are pinned first.** Before any core code moves, the outputs
  of today's code are recorded as test fixtures: code to matching vector for
  every rule of both families, circuit lengths per level, borders, lineages.
  Every later change reproduces them exactly, and CI checks it.
- **Moves and merges are separate changes.** A folder moving into `core/` is
  file moves and import paths only. A duplicate is merged by having the old
  function call the new one, checked against the fixtures over every
  combination, and deleted once nothing calls it.
- **One small PR per step.** A change a reader sees on screen gets a
  prototype artifact before any page changes.
- **Pages are archived, not deleted.** Only Map and Circuits are removed, each
  after what it has that nothing else does has moved.

## Where it stands

| Measure | Value |
|---|---|
| TypeScript in `web/src`, tests included | 119,600 lines |
| Unit test files | 184 |
| `npm run typecheck:site` | clean |
| `npm run typecheck` (whole repo) | 32 errors, all in the p5 legacy files |
| HTML entries, nav items | 27, 26 |
| Address forms for a rule and combination | 7, and 9 pages that keep none (table below) |
| Controls that choose a combination | 9 (table below) |
| Independent strand tracers | 16 |
| Hand-written worker clients | 22 |
| Files outside `pages/shapes/` that import `shapes/circuitShapes.ts` | 44 |
| Committed folders nothing references (`exported_charts/`, `example_ref/`) | 565 MB |

`core/` imports nothing from the React side, and
`core/__tests__/layering.test.ts` enforces it. Every core module has tests.
Exact arithmetic (`core/exact.ts`) backs the automaton, limit shape,
top-down and unrooted engines.

### Rule and combination in the address

| Form | Pages |
|---|---|
| `e=2578&c=0100101100` | Explorer (`core/serialize.ts`), Map (`pages/map/mapUrl.ts`) |
| `c=2578-0100101100` | Supertiles (`supertiles/supertilesUrl.ts`), Top-down (`topdown/board.ts`) |
| `rule=023468&combo=140000001` | Harmonics, Build-up, Foundations, Identify |
| `r=…&m=a.b.c` | Walker (`walker/share.ts`) |
| `#a=023468-140000001:4:303` | Compare (`compare/refs.ts`) |
| `#c=combo-length`, `#t=level.combo.n` | Corners, Shapes (`shapes/explorerLink.ts`) |
| `r=fam-rule&p=fam-rule-combo` | Classifications |
| none | Machine, Transducer, Lattice, Multi-edge, Dimension, Centre map, Circuits, Period, Limit |

Harmonics, Build-up and Foundations check the combination against
`/^[0-9a-z]{9}$/`, so they take hexagon combinations only. Map stores digits
without checking them against the rule.

### Controls that choose a combination

| Control | Used by |
|---|---|
| `StrandRuleControls` (string field, stepper, a `MatchingSlider` per tile) | Explorer sidebar, Supertiles, Top-down |
| `QuickBar` (stepper, class chips, tile pictures) | Explorer bottom bar, Walker |
| `TileEditor` | Explorer |
| `shapes/ComboPicker.tsx` (a `<select>` per type) | Shapes, Harmonics, Build-up, Foundations, Identify, Period |
| `EdgeSubsetPicker` and a text field | Map |
| `EdgeSubsetPicker` and a `<select>` per type | Machine |
| rule `<select>` and a text field | Transducer |
| `JoinPicker` | Centre map |
| rule `<select>` over shipped data | Classifications, Circuits, Corners |

The Explorer shows three of these at once: the sidebar's string and sliders,
the sidebar's class chips, and the bottom bar's stepper, class chips and
tile pictures.

## One rule-and-combination model

```ts
interface Combination {
  readonly family: TileFamilyId;
  readonly subset: readonly number[]; // the rule, sorted classes
  readonly digits: readonly number[]; // per tile type, position among its non-crossing pairings
}
```

- **Digits are the state.** Pages hold the non-crossing position per tile
  type, the same number the code shows. The full-enumeration matching index
  (`m=` today) is derived where a tracer needs it, and stored only while a
  tile's lines cross, which no digit can name.
- **One module owns it**, `core/combination.ts`: option counts per tile type,
  digits to code and back, odometer position, step, random, and iteration
  over all combinations of a rule. This replaces `comboOptionCounts`
  (`core/strandGraph.ts`), `comboSizes` and `rulePairings` (`core/scaling.ts`),
  `lib/comboOdometer.ts`, `ruleOptions` (`shapes/circuitShapes.ts`),
  `combosOf` (`foundations/liveAnalysis.ts`), `comboDigits`
  (`core/faultLines.ts`), and the private copies of `normalizeMatching` and
  `maxMatchingIndex` in `core/serialize.ts`.
- **One address form**, read and written by every page through
  `lib/ruleParams.ts`:

  ```
  <page>.html#f=hex&c=023468-140000001&lv=6
  ```

  `f` is the family, `c` the code, `lv` the level. Page-specific parameters
  follow. The reader also accepts every form in the table above, so existing
  links keep working; the writer only produces the new one.
- **One paste parser**, shared by the address reader and the bar's paste box:
  a bare code, or any link from any page. Nine digits mean hexagons and ten
  mean Tile(1,1), unless `f=` says otherwise.

## The combination bar

One line, the same on every page:

| Part | What it does |
|---|---|
| The code, `2578-0100101100` | Rule digits underlined in their class colours, combination digits in their tile colours. Tap a digit to step its tile. |
| The rule | Tap it for the tail-free edge sets, each with its number of combinations. |
| `58/64` | Where the combination sits among the rule's. |
| ‹ › and Random | Step the whole combination as an odometer (first tile fastest), or pick one at random. |
| Copy | An icon with a "Copy" tooltip. |
| Paste | A clipboard icon that opens a box; it shows what it read from the code or link before it is used. |
| Clear | Empties the rule and zeroes the combination. |

Below the line, every tile in its own colour with its current pairing:

- Each seam outlined along the tile in its class colour, thick when its class
  is on and thin when off, pulled back from its ends so neighbouring seams
  read apart (as `lib/tilingModel.ts`'s `seamPolyline`, trimmed as
  `TileView`'s `SEAM_TRIM`).
- Each crossing's class number just outside its dot.
- A pairing slider with ‹ › and `2/5` under each tile.

This replaces the bottom bar's off, small and large tile strip, whose
pictures are drawn without the tile colours.

**Tapping a tile opens it.** Press a point and drag to another to join them,
or tap one point and then another. A point whose class is off turns on as it
is pressed, so a line can start from any edge. Tapping a class number turns
that class on or off for every tile. While drawing:

- an edge set with tails is allowed: the odd tiles are marked and their spare
  end drawn as a tail;
- a pairing whose lines cross has no digit, so the code shows `?` and the
  link carries the pairing in full (`m=`) until the tile is stepped.

Today's `components/TileEditor.tsx` cannot start a line from an edge that is
off, for two reasons. Pressing such an edge only toggles its class, so the
press has no point to drag from. And a line cannot start on a tile with an odd
number of points (`!info.odd`), which is what switching on one edge usually
makes.

Several lines over one edge (`×n` per class) and seam contracts are not part
of the bar; they get a view of their own later.

## Pages

The [site map](https://claude.ai/artifact/3cdNwLQG6qNgzHJqkiU3WN) is the
source; this is its summary. A page that leaves the nav keeps working and is
listed on an Archive page.

| Page | Plan | Status |
|---|---|---|
| Explorer | Keeps everything that belongs with exploring; lands on a rooted patch. Gains an optional world seed and a control for a fixed stack of supertile types (the link already reads one, `wc=Xi-5-Gamma-7-Delta`). | agreed |
| Supertiles, Top-down | One page with both modes, pulled apart and substituted in place. | agreed |
| Foundations | The index over whole classes of circuits. | agreed |
| Classifications | Left as it is. | agreed |
| Harmonics | The per-combination analysis page. Gains Corners as a panel, and dimension per harmonic chain; Identify opens from a strand tap; Compare is its tool. | agreed |
| Build-up | Its own page. | agreed |
| Corners | Its own page until it becomes the Harmonics panel. | agreed |
| Walker | Kept, beside Harmonics. | proposed |
| Tails | Rewritten in the house style, with a Tile(1,1) / Hexagons toggle at the top. | agreed |
| Rules | Its correspondence becomes the Tails section that explains the toggle. | proposed |
| Every other level, The infinite line, Limit shape, Neighbour machine | Kept as they are, under one Results link. | proposed |
| Lattice, Multi-edge | Archive. | agreed |
| Dimension | Archive, until redone as dimension per harmonic chain. | agreed |
| Centre map | Archive. | proposed |
| Shapes | Parked; may fold into Foundations once it works. | agreed |
| Machine | Left as it is until reviewed. | agreed |
| Legacy app | Kept for per-tile drawing until a pattern page replaces it. | agreed |
| Widgets | A dev page, out of the nav. | proposed |
| Map | Removed once the Explorer has its seed control; `map.html` redirects to the Explorer's infinite mode with the same parameters. | agreed |
| Circuits | Removed; its per-family growth figures and silhouettes go to the per-chain view in Harmonics. | agreed |

Harmonics, Build-up, Foundations and Shapes are the pages changing most.
Changes that touch them come last, one at a time.

## Library

### Page folders that are libraries

These page folders hold code other pages depend on. They move into `core/`
before any page changes, so that changing a page never breaks another.

| Folder | Files outside it that import it | Moves to |
|---|---|---|
| `pages/shapes/` (`circuitShapes.ts`: `Level`, `Table`, `CircuitShapes`) | 44 | `core/renorm/` |
| `pages/harmonics/` (readings, chains, `sparseRoutes`, `levelWalk`) | 18 | `core/harmonics/` |
| `pages/foundations/` (`foundations.ts`, `pageData.ts`, `comboAnalysis.ts`) | 12 | `core/foundations/` |
| `pages/buildup/` (route tables) | 10 | `core/routes/` |
| `pages/map/` (`strandWalk`, `findPass`, `camera`, `followCamera`) | 10 | `core/walk/`, `lib/viewport.ts` |
| `pages/fates/` (no page of its own: lifts, placements, certified lines) | 2 | `core/fates/` |

The layering test then gains a rule: a file under `pages/<name>/` imports
nothing from another `pages/<other>/`. There are no import cycles among
these folders today; the two cycles in `web/src` are
`analysis.ts`/`tiles.ts` (legacy) and `harmonics/found.ts`/`levelWalk.ts`.

### Duplicates to merge

| Concern | Copies | Keep |
|---|---|---|
| Option counts and odometers | 8, listed under the model above | `core/combination.ts` |
| Strand tracers | `core/circuits.ts`, `core/strandGraph.ts`, `line/strand.ts`, `core/multiEdge.ts` and `map/loopTrace.ts` (both named `traceLoops`), `core/flowLattice.ts`, `map/strandWalk.ts`, and the address walkers in `core/transducer.ts`, `walker/`, `period/`, `harmonics/`, `circuitShapes` | one `Chord`/`Path` type for the geometric tracers and one for the address walkers; the weld tolerance `0.05`, written out three times, becomes one constant |
| Tile type name lists | `core/families.ts`, `core/transducer.ts`, `buildup/routes.ts`, `harmonics/sparseRoutes.ts` | `families.ts` |
| Tail-free rules (GF(2) kernel) | `core/subsets.ts`, `lib/parityBasis.ts` | one, over a type-by-class count matrix |
| Pan and zoom | `lib/viewport.ts` with `usePanZoom`, `map/camera.ts`, `classifications/zoom.ts`, `HexBoard`'s own wheel handler | `lib/viewport.ts` |
| Worker clients | 22, each with its own request queue and fallback | one `workerClient<Req, Res>` |
| Colours | `core/colors.ts`; `LEVEL_COLOURS` twice (`transducer/HierarchyBuilder.tsx`, `walker/MachineView.tsx`); HSL to RGB twice | `core/colors.ts` |
| Hash splitting | `lib/urlState.ts`, `ClassificationsPage.tsx`, `topdown/board.ts`, `compare/refs.ts` | `lib/ruleParams.ts` |
| Closing a line for a thumbnail | `harmonics/found.ts` `closedLine`, inline in `HarmonicsEngine.thumbs` | `closedLine` |

### Shared with aperiodic-circuits

aperiodic-circuits already has a tiling-generic core (`Tiling`, `RuleSet`,
`Seam`, chain substitutions as data). Several modules here are its
counterparts, and some are copies:

| Here | There | Relation |
|---|---|---|
| `pages/map/followCamera.ts` | `core/followCamera.ts` | identical but for an import |
| `core/matchings.ts` | `core/matchings.ts` | same enumeration and order; this side adds rank and unrank |
| `core/subsets.ts`, `lib/parityBasis.ts` | `core/parity.ts` | same kernel |
| `core/edges.ts` label parsing | `core/ruleset.ts` `seamsFromLabels` | same labels, same regex |
| `core/tiles.ts` `T_RULES`, `SUPER_RULES` | `core/chain.ts` `ChainSpec` | the same construction; there it is data |
| `map/strandWalk.ts` | `core/chase.ts` | port of the same walk |
| `core/colors.ts` | `colors.ts` | same length ramp; tails grey here, red there |

Codes do not carry over for the Spectre: here Tile(1,1) has ten digits
(Gamma2, then Gamma1, last), there the Mystic is one tile and the code has
nine. Hexagon codes agree. Uppercase digits also differ: here they are read
as lowercase, there as 36 to 61.

The shared package is a workspace in this repository, `packages/tiling`, with
no React. aperiodic-circuits takes it as a git dependency.

```
packages/tiling/
  geom/        Pt, Affine, polygons, line simplification; exact/ for Z[ζ12]
  tiling/      Prototile, TileInstance, Hierarchy, Tiling; ChainSpec; the Spectre family as data
  rules/       Seam, labels, crossings and contracts, GF(2) parity
  combination/ matchings, Combination, the code
  strands/     Chord, Path, weld and trace, the local walk, the dual graph
  view/        viewport, follow camera, colour ramps
```

Spectre-only engines stay in `web/src/core`: `unrooted`, `topDown`,
`transducer`, `automaton`, `hexRule`, `isomorphism`, `limitShape`,
`straighten`, and the renormalisation, harmonics and fates once they move
there.

## Repository

Proposed; nothing here is removed without a yes.

| Item | Size | Proposal |
|---|---|---|
| `exported_charts/` | 466 MB | delete; nothing references it |
| `example_ref/` | 99 MB | delete or move to a release asset |
| `web/spike/`, `web/algo-investigation/` | 3.1 MB | delete; their results live in `core/unrooted.ts`, `map/webglRenderer.ts` and `core/exact.ts` |
| `web/src/ui.ts` | 252 lines, all comments | delete |
| `web/tsconfig.tsbuildinfo` | | untrack and ignore |
| `tsconfig.site.json` | | drop the missing `src/stats-main.tsx`; include every `*-main.tsx` |
| `docs/DESIGN.md` | | says an ESLint rule enforces layering; the layering test does |
| README page list | | lists 12 of 26 pages; rewrite once the nav settles |

`pages/map/trail/` and `web/trail-scale/` are in progress; leave them.

## Work list

1. **Pin the answers.**
   - [x] Fixtures: code to matching vector for every tail-free rule of every
     family (`core/__tests__/fixtures/combo-codes.json`).
   - [ ] Fixtures: circuit lengths per level, borders and lineages for a fixed
     set of combinations, from today's tracers, `period/` and `harmonics/`.
   - [ ] The hexagon codes as a fixture in aperiodic-circuits.
   - [ ] `tsconfig.site.json` covers every entry; untrack
     `tsconfig.tsbuildinfo`.
2. **One model and one address** (#149).
   - [ ] `core/combination.ts` with the operations above; tests against
     `enumerateMatchings` and the fixtures.
   - [ ] `lib/ruleParams.ts`: read every legacy form, write `#f=…&c=…`.
   - [x] The paste parser, `lib/comboCode.ts`, with a test per legacy form.
   - [ ] Replace the eight option-count and odometer copies with the module.
3. **The combination bar**, from the prototype.
   - [x] `components/controls/ComboBar.tsx` with the tile row and the tile
     view; tests for tap, drag from an edge that is off, odometer, paste and
     clear.
   - [x] Explorer: the bar replaces the sidebar matching section and the
     bottom bar; the bottom bar's basis groups moved to the edge rule.
4. **Every page on the bar and the address.**
   - [x] On the bar: Explorer, Supertiles, Top-down, Walker, Transducer, and
     through `ComboPicker` Shapes, Harmonics, Build-up, Foundations, Identify
     and Period. Machine is left as it is; Map goes; Classifications,
     Circuits and Corners choose from shipped data.
   - [ ] On the address: every page reads and writes `#f=…&c=…`.
5. **Move the page-folder libraries** into `core/`, as moves only, and add
   the cross-page import rule to the layering test.
6. **The pages**, per the table, each from a prototype: the Explorer's seed
   and supertile-stack controls, then Map's redirect; Supertiles with
   Top-down; the Tails rewrite with its toggle; the Archive page and the
   Results link; Circuits' growth figures into Harmonics, then its removal.
7. **Merge the duplicates** in the table above, each checked against the
   fixtures.
8. **Repository**, the items agreed from the table above.
9. **`packages/tiling`** with aperiodic-circuits: the Spectre construction as
   a `ChainSpec`, shared matchings, parity, follow camera and colours; then
   aperiodic-circuits switches to it and gains the combination bar.

## Later

- Corners as a Harmonics panel: polygon edges read as runs of supertiles,
  compared with each other and followed up a chain.
- Dimension per harmonic chain, from each chain's own growth rate.
- A view for several lines over one edge and seam contracts.
- A pattern page: download a template of a tile, draw on it in any image
  editor, upload it, and explore the stitched result in the Explorer.

## Open question

- Should the Spectre family in aperiodic-circuits take ten digits (Gamma1
  and Gamma2 apart) so codes carry over, or should this site accept a
  nine-digit Spectre code with the Mystic as one tile?
