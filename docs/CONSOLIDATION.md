# Consolidation plan

The site has 27 HTML entries and 26 nav items. Each page grew its own way of
choosing a rule and combination, its own URL codec and, often, its own copy
of a core routine. This plan sets one model for a rule and combination, one
control for it, one address format, and a library both this site and
[aperiodic-circuits](https://github.com/bohemian-miser/aperiodic-circuits)
can build on. It then folds the pages into about ten.

Work is listed in order at the end, as a checklist. Issue
[#149](https://github.com/bohemian-miser/Spectre/issues/149) (one picker for
every page) is step 2 of it.

## Where it stands

| Measure | Value |
|---|---|
| TypeScript in `web/src`, tests included | 117,000 lines |
| Unit tests | 177 files, 1,518 tests, all passing (3 min 16 s) |
| `npm run typecheck:site` | clean |
| `npm run typecheck` (whole repo) | 32 errors, all in the p5 legacy files |
| Address forms for a rule and combination | 7, and 9 pages that keep none (table below) |
| Controls that choose a combination | 9 (table below) |
| Independent strand tracers | 16 |
| Hand-written worker clients | 22 |
| Files outside `pages/shapes/` that import `shapes/circuitShapes.ts` | 39 |
| Committed folders nothing references (`exported_charts/`, `example_ref/`) | 565 MB |

What is already sound: `core/` imports nothing from the React side, and
`core/__tests__/layering.test.ts` enforces that. Every core module has tests.
Exact arithmetic (`core/exact.ts`) already backs the automaton, limit shape,
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
  type, the same number the string shows. The full-enumeration matching
  index (`m=` today) is derived where a tracer needs it, and stored only for
  the multi-strand view below, where pairings may cross.
- **One module owns it**, `core/combination.ts`: option counts per tile type,
  digits to string and back, odometer position, step, random, and iteration
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

  `f` is the family, `c` the share string, `lv` the level. Page-specific
  parameters follow. The reader also accepts every form in the table above,
  so existing links keep working, and the writer only produces the new one.
- **One paste parser**, shared by the address reader and the picker's paste
  box: a bare string, or any link from any page. Nine digits mean hexagons and
  ten mean Tile(1,1), unless `f=` says otherwise.
- **Golden tests** pin the share string before anything moves: a list of
  `(family, string) → matching vector` pairs taken from the current codec, run
  against the new module and, later, against aperiodic-circuits.

## The combination bar

A prototype, built from the core's own tile outlines, crossings and pairings,
is at <https://claude.ai/artifact/5nrRiqnNiDdh9FPXr1U8gr>.

The string is the control. `2578-0100101100` is drawn with each rule digit
underlined in its class colour and each combination digit in a cell topped
with its tile's colour, named underneath (Delta … Gamma1).

| Action | Effect |
|---|---|
| Tap a digit | Steps that tile to its next pairing and makes it the focus |
| Focus panel | The focused tile drawn with its pairing, and every pairing it has drawn small; tap one to choose it |
| Arrow keys | ← → move the focus over tiles that have a choice; ↑ ↓ step it; typing a digit sets it |
| ‹ › and Random | Step the whole combination as an odometer (first tile fastest), as now |
| Rule row | The tail-free rules as strings; Advanced opens the class chips for rules with tails |
| Copy | Copies the string; a second button copies the link |
| Paste | Any string or link from any page |
| Open in | The same combination on another page that takes this family |

Tiles with one pairing show a grey `0` and cannot be tapped. Tiles with more
than four pairings show `2/5` instead of dots.

It comes in two sizes from one component:

- **Full**, for the Explorer and Map: the string, the focus panel, the rule
  row and the stepper. It replaces `StrandRuleControls`, `QuickBar`,
  `TilePalette`'s matching role and the sidebar's `MatchingSlider` grid.
- **Compact**, for analysis pages: the string, ‹ ›, Copy and Open in on one
  line, with the focused tile named below. It replaces `ComboPicker` and the
  per-page `<select>`s and text fields.

### The multi-strand view

Strands per class (`×n`), seam contracts and pairings that cross cannot be
written as one digit per tile. They move behind an **Advanced** toggle that
switches the bar to a second view: per-class strand counts, the contracts
editor, and the per-tile chord editor (`TileEditor`). While that view holds a
state no string can name, the string is greyed and the link carries `m=`.
Lattice and Multi-edge become this view's analysis pages.

## Pages

Each fold keeps the old HTML entry as a redirect that carries its query, so
links in the docs and README keep working.

| Page | Plan | Into |
|---|---|---|
| Explorer | keep | the front page; gains Map's seed, recording and follow controls in infinite mode |
| Map | fold | Explorer's infinite mode, which already renders through `map/InfiniteCanvas` |
| Supertiles, Top-down | merge | one Supertiles page with two modes, pulled apart and substituted in place |
| Walker | keep | |
| Machine | fold | Walker, as a permitted-versus-taken view of the same walk |
| Transducer | trim | the neighbour-machine explainer; its strand walk links to Walker |
| Lattice, Multi-edge | merge | one page behind the multi-strand view |
| Classifications | keep | gains Dimension, Centre map and Rules as panels |
| Dimension, Centre map, Rules | fold | Classifications |
| Shapes | keep | gains Corners as a detail panel and Circuits as its atlas |
| Corners, Circuits | fold | Shapes |
| Compare | keep | reachable from Shapes and Harmonics |
| Harmonics | keep | gains Identify as a mode |
| Identify | fold | Harmonics |
| Foundations, Build-up | keep | |
| Period | keep | gains Line as a preset |
| Line | fold | Period, `128-010100000` |
| Tails, Limit | keep | |
| Widgets | keep | dev page, out of the nav |
| Legacy | open question | |

That leaves eleven pages in the nav: Explorer, Tails, Classifications,
Supertiles, Walker, Shapes, Harmonics, Foundations, Build-up, Period, Limit.
Transducer, Compare and the multi-strand page stay reachable from the pages
that link to them.

Harmonics, Build-up, Foundations and Shapes are the pages changing most
(16 to 33 commits each since 28 October). Fold into them last, one at a time.

## Library

### Page folders that are libraries

Four page folders hold code other pages depend on. They move out before any
page is folded, so that removing a page never breaks another.

| Folder | Imported from | Moves to |
|---|---|---|
| `pages/shapes/circuitShapes.ts` (`Level`, `Table`, `CircuitShapes`) | 39 files: Build-up, Compare, Corners, Explorer, Foundations, Harmonics, Identify, Line, Period, Walker, workers | `core/renorm/` |
| `pages/harmonics/` (readings, chains, `sparseRoutes`, `levelWalk`) | Build-up, Compare, Explorer, Foundations, Identify, Top-down | `core/harmonics/` |
| `pages/buildup/` (route tables) | Harmonics, Identify, Walker, workers | `core/routes/` |
| `pages/map/` (`strandWalk`, `findPass`, `camera`, `followCamera`) | Explorer, Supertiles, workers | `core/walk/`, `lib/viewport.ts` |

The layering test then gains a rule: a file under `pages/<name>/` imports
nothing from another `pages/<other>/`.

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

The share strings do not carry over for the Spectre: here Tile(1,1) has ten
digits (Gamma2, then Gamma1, last), there the Mystic is one tile and the
string has nine. Hexagon strings agree. Uppercase digits also differ: here
they are read as lowercase, there as 36 to 61.

The shared package is a workspace in this repository, `packages/tiling`, with
no React. aperiodic-circuits takes it as a git dependency.

```
packages/tiling/
  geom/        Pt, Affine, polygons; exact/ for Z[ζ12]
  tiling/      Prototile, TileInstance, Hierarchy, Tiling; ChainSpec; the Spectre family as data
  rules/       Seam, labels, crossings and contracts, GF(2) parity
  combination/ matchings, Combination, the share string
  strands/     Chord, Path, weld and trace, the local walk, the dual graph
  view/        viewport, follow camera, colour ramps
```

Spectre-only engines stay in `web/src/core`: `unrooted`, `topDown`,
`transducer`, `automaton`, `hexRule`, `isomorphism`, `limitShape`,
`straighten`, and the renormalisation once it moves there.

## Repository

| Item | Size | Plan |
|---|---|---|
| `exported_charts/` | 466 MB | delete; nothing references it |
| `example_ref/` | 99 MB | delete or move to a release asset |
| `web/spike/`, `web/algo-investigation/` | 3.1 MB | delete; their results live in `core/unrooted.ts`, `map/webglRenderer.ts` and `core/exact.ts` |
| `web/src/ui.ts` | 252 lines, all comments | delete |
| Legacy app: `legacy.html`, `sketch.ts`, `tiles.ts`, `analysis.ts`, `state.ts`, `utils.ts`, `config.ts`, `tests/e2e.spec.ts`, `tests/line_count_repro.spec.ts` | 2,700 lines | open question |
| `web/tsconfig.tsbuildinfo` | | untrack and ignore |
| `tsconfig.site.json` | | drop the missing `src/stats-main.tsx`; include every `*-main.tsx` |
| `docs/DESIGN.md` | | says an ESLint rule enforces layering; the layering test does |
| README page list | | lists 12 of 26 pages; rewrite once the nav settles |

`pages/map/trail/` and `web/trail-scale/` are not imported by any page yet
and are in progress; leave them.

## Work list

1. **Pin the codec.**
   - [ ] Golden tests: `(family, string) → matching vector` for every rule of
     both families, from today's `comboToMatchingIndices`.
   - [ ] Same strings as a fixture in aperiodic-circuits for the hexagons.
   - [ ] `tsconfig.site.json` covers every entry; untrack `tsconfig.tsbuildinfo`.
2. **One model and one address** (#149).
   - [ ] `core/combination.ts` with the operations above; tests against
     `enumerateMatchings` and the golden list.
   - [ ] `lib/ruleParams.ts`: read every legacy form, write `#f=…&c=…`.
   - [ ] The paste parser, with a test per legacy form.
   - [ ] Replace the eight option-count and odometer copies with the module.
3. **The combination bar.**
   - [ ] `components/controls/ComboBar.tsx`, full and compact, from the
     prototype; tests for tap, keys, odometer and paste.
   - [ ] Explorer: the bar replaces the sidebar matching section and
     `QuickBar`; one class picker remains, under Advanced.
   - [ ] Open in, with the families each page takes.
   - [ ] Multi-strand view behind Advanced: strand counts, contracts,
     `TileEditor`; `m=` while no string can name the state.
4. **Every page on the bar and the address**, one page per change: Map,
   Supertiles, Top-down, Walker, Machine, Transducer, Period, then Shapes,
   Harmonics, Build-up, Foundations, Identify, Compare, Corners. Hexagon-only
   pages show the family as fixed rather than rejecting ten-digit strings.
5. **Move the page-folder libraries** (`circuitShapes`, `harmonics`,
   `buildup`, `map` engines) into `core/`, and add the cross-page import
   rule to the layering test.
6. **Fold pages** per the table, leaving redirects. Nav down to eleven.
7. **Merge the duplicates** in the table above: tracer types and weld
   constant, parity, viewport, `workerClient`, colours, hash splitting.
8. **Repository**: delete the unreferenced folders, `ui.ts`, `spike/`,
   `algo-investigation/`; settle the legacy app; fix `DESIGN.md` and the
   README page list.
9. **`packages/tiling`** with aperiodic-circuits: Spectre construction as a
   `ChainSpec`, shared matchings, parity, follow camera and colours; then
   aperiodic-circuits switches to it and gains the combination bar.

## Open questions

- Keep the legacy p5 app? It is the only page with per-tile drawing and
  editable colours.
- Should the Spectre family in aperiodic-circuits take ten digits (Gamma1
  and Gamma2 apart) so strings carry over, or should this site accept a
  nine-digit Spectre form with the Mystic as one tile?
- Should Map stay a separate entry for its recording and seed controls, or
  is Explorer's infinite mode enough?
