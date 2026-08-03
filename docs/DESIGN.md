# Spectre Tiles Website — Design Document

Status: approved for implementation
Scope: complete replacement of the p5.js canvas app in `web/` with a multi-page
React + SVG educational site. The tiling mathematics in `web/src/tiles.ts`,
`web/src/analysis.ts` and `web/src/utils.ts` is ported faithfully into a pure
TypeScript core library; everything else is rebuilt.

---

## 1. Architecture overview

### 1.1 Stack

| Concern | Decision | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript 5 + Vite 7 | Mandated. Vite already in place (`web/vite.config.ts`, base `/Spectre/`). |
| Rendering | SVG for all tile/widget rendering; Canvas2D fallback **only** for supertile levels ≥ 5 | SVG gives native per-edge DOM events (hover/drag hit areas), crisp zoom, trivial export. Level 5–6 renders ~35k–273k tiles (see §5.3) which exceeds practical SVG node budgets; a plain Canvas2D path renderer (no p5) covers that read-only case. |
| p5.js | **Removed entirely.** | p5 is only used for `p5.Vector` (a `{x,y}` pair), `p.createVector`, `p.cos/sin/radians`, and immediate-mode drawing. All replaceable with plain objects, `Math.*`, and SVG. Nothing in the math depends on p5. |
| Routing | `react-router-dom` v6 with **`createHashRouter`** | See §8.1. |
| State | Local React state + a single explorer reducer, mirrored to the URL hash query (§9). No Redux/Zustand — the state tree is small and one page owns it. |
| Heavy compute | Web Worker for circuit analysis at level ≥ 3 | Core library is pure/DOM-free, so it runs in a worker unmodified. |
| Unit tests | Vitest for `core/` (new dev-dependency); keep Playwright for e2e (`web/tests/`, `web/playwright.config.ts`). |
| Charts (stats page) | Hand-rolled SVG bars/tables. No chart library — the visuals are simple histograms and sortable tables. |

### 1.2 Layering rule

```
web/src/core/**        pure TS. May import nothing outside core/.
                       No React, no DOM, no p5, no window/document.
web/src/components/**  React + SVG. May import core/ only.
web/src/pages/**       May import components/, hooks/, core/.
web/src/hooks/**       React hooks bridging core <-> pages (URL state, worker).
```

Enforced by an ESLint `no-restricted-imports` rule on `core/**` (fails CI if
`core` imports `react`, `p5`, or anything from `components|pages|hooks`), plus
the fact that `core` is exercised inside a Web Worker where DOM access throws.

### 1.3 Directory layout

```
web/
  index.html                     (rewritten: #root mount, meta tags)
  vite.config.ts                 (add @vitejs/plugin-react; drop p5 manualChunks; keep base '/Spectre/')
  package.json                   (deps: react, react-dom, react-router-dom; dev: vitest, @vitejs/plugin-react, eslint)
  playwright.config.ts           (kept)
  tests/                         (Playwright e2e — rewritten in stage 6)
  src/
    main.tsx                     app bootstrap
    App.tsx                      router shell, nav bar, theme
    routes.tsx                   route table
    core/
      index.ts                   public barrel export
      geom.ts                    Pt, Affine, mul/inv/trot/ttrans/transPt   [from utils.ts]
      families.ts                vertex tables, edge-label tables, families [from tiles.ts, config.ts]
      edges.ts                   EdgeLabel parsing, meta-edge grouping, edge contracts,
                                 connection points [from tiles.ts getEdgeDotMidpoints + label parsing]
      tiles.ts                   TileNode/TileSystem, buildBase*, buildSupertiles, flatten
                                 [from sketch.ts:73–233, tiles.ts Shape/Meta]
      outline.ts                 straight + curvy outline path generation   [from tiles.ts CurvyShape ctor]
      matchings.ts               enumerateMatchings, nonCrossingMatchingIndices,
                                 combo-string codec (§3.6)                  [from analysis.ts findPerfectMatchings]
      circuits.ts                segment collection, welding, trace, colors [from analysis.ts]
      subsets.ts                 GF(2) count matrix, kernel basis, valid-subset group (§3.8)
                                 [oracle port of analysis.ts getValidEdgeCombinations]
      colors.ts                  palettes, edge-class colors, rainbow        [from config.ts, utils.ts, tiles.ts leadColors]
      serialize.ts               ExplorerState <-> URL query codec (§9)
      stats.ts                   CSV parsing + row types for graph_analysis data (§10)
      analysis.worker.ts         worker entry: runs circuits.analyze off-thread
    components/
      TileView.tsx               single-tile interactive widget (§6.1)
      TilePalette.tsx            grid of TileViews with synced highlighting (§6.2)
      SeamView.tsx               two adjacent tiles sharing one seam (§6.3)
      TilingView.tsx             SVG renderer for expanded tilings (§5.1)
      TilingCanvas.tsx           Canvas2D renderer for level ≥ 5 (§5.2)
      PanZoom.tsx                shared wheel/drag/pinch camera controller (§5.4)
      CircuitLayer.tsx           SVG overlay of traced circuit/tail polylines
      controls/
        EdgeSubsetPicker.tsx     dropdown of the valid subsets (§6.4)
        MatchingSlider.tsx       per-tile matching cycler with mini TileView
        DisplayToggles.tsx       backgrounds/outlines/lines/dots/labels/rainbow
        ColorSchemePicker.tsx    palette dropdown + custom color wells
        SharePanel.tsx           copy-URL, save SVG/PNG
        StatsSummary.tsx         circuit/tail counts with clickable length chips
    pages/
      HomePage.tsx
      ExplorerPage.tsx           (§7.1)
      ExplainerPage.tsx          (§7.2; prose from docs/EXPLAINER_COPY.md)
      explainer/
        PuzzleConsole.tsx        512-subset console (beat 5)
        MatrixExplorer.tsx       live GF(2) matrix widget (beat 6)
        KernelGallery.tsx        8 valid-subset cards (beat 7)
        ProfileCrossfade.tsx     circuits-vs-wanderers toggle (beat 9)
      StatsPage.tsx              (§7.3)
      DevGalleryPage.tsx         unlisted widget gallery at #/dev (manual QA)
    hooks/
      useExplorerState.ts        reducer + URL sync
      useCircuitAnalysis.ts      worker orchestration, memoization
      usePointerDrag.ts          shared pointer-event drag helper
    data/
      lvl4.csv                   copied from /graph_analysis (imported ?raw, §10)
      lvl6.csv                   copied from /graph_analysis
    styles/
      global.css, tokens.css
docs/
  DESIGN.md                      this file
```

Deleted in stage 6 (git history preserves them): `web/src/sketch.ts`,
`web/src/ui.ts`, `web/src/state.ts`, old `web/src/tiles.ts`,
`web/src/analysis.ts`, `web/src/utils.ts`, `web/src/config.ts`, p5 deps.
`web_orig/` is untouched (already dead).

---

## 2. Domain model recap (normative for the core API)

- **Tile types** (`TileTypeId`): `Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma,
  Phi, Psi` (from `config.ts tile_names`), plus leaf types `Gamma1`/`Gamma2`.
  In the spectre/hat/turtle families, `Gamma` is a composite of `Gamma1` +
  `Gamma2` ("the Mystic", see `sketch.ts buildSpectreBase`); in the hexagon
  family `Gamma` is a single hexagon.
- **Families** (`TileFamilyId`): `spectre` ("Tile(1,1)"), `hex` ("Hexagons"),
  `hat` ("Turtles in Hats", hat-dominant: Gamma1=hat, Gamma2=turtle),
  `turtle` ("Hats in Turtles", turtle-dominant). Geometry per family comes
  from `spectre_pts` / `hex_pts` / `hat_pts` / `turtle_pts` (tiles.ts:16–60).
- **Edge labels**: strings like `'-5.1A'` = optional sign, **major** edge
  class 0–8, `.`, **minor** index within the meta-edge, **variant** letter
  (`A`, or `B` when a tile has two distinct meta-edges of the same class —
  Theta has `2.*B`, Psi has `5.*B`). Spectres/hats/turtles have 14 physical
  edges (`unique_edge_labels`), hexagons 6 (`hex_edge_labels`). A meta-edge
  is the maximal run of consecutive labels sharing (sign, major, variant).
  Class 0 is the straight "η" edge with no negative version; class 7 is the
  Mystic-internal edge (only on Gamma1/Gamma2).
- **Edge contracts & connection points**: each edge class carries a
  *contract* — an agreed crossing point on the meta-edge where drawn lines
  punch through the seam. A contract is arbitrary (midpoint of the `.0` minor
  edge, 3/5ths up the `.2` edge, …) but must be **identical on the `+` and
  `−` versions** of the class so abutting tiles' points coincide; class 0
  glues to itself, so its contract must additionally be **symmetric** about
  the meta-edge center. The core models contracts explicitly (§3.3) with
  defaults that reproduce today's `getEdgeDotMidpoints` (tiles.ts:112–165)
  behavior exactly: midpoint of the `minor == 0` physical edge, except major
  0 in non-hex families where the point is the vertex `basePts[(i+1) % n]`
  after edge `0.0A` — the symmetric center of the two-edge η seam (that
  vertex is shared by up to three tiles — the source of degree-3 junctions,
  §3.6).
- **Valid subsets**: the kernel of the tiles×class count matrix over GF(2) —
  a *group* under symmetric difference. Spectre family: dimension 3, so 8
  subsets: `'', '15', '0136', '0356', '1278', '2578', '023678', '01235678'`.
  The hexagon family has a **different, larger kernel** (16 elements per the
  owner's analysis), so the core computes kernels per family (§3.8) instead
  of hardcoding; the 8 spectre subsets are a test fixture.
- **Matchings & combination strings**: pairings of a tile's connection
  points. The old UI cycles `findPerfectMatchings` output with a slider; the
  blog/notebook/CSVs use canonical **combination strings** —
  `edge_selection` plus a 10-digit combo, one digit per leaf type in
  `ALL_TILE_NAMES` order (e.g. `2578-0100101100`), each digit indexing that
  tile's **non-crossing** matching options (§3.6, §10.2). The URL scheme is a
  superset of this encoding (§9.2).
- **Terminology**: prose/UI copy says *seam* for meta-edge and *wanderer*
  for open path (matching `docs/EXPLAINER_COPY.md`); code identifiers stay
  `MetaEdge` / `tails`.

---

## 3. Core library API (`web/src/core/`)

Type sketches below are normative signatures; bodies port the named sources.

### 3.1 `geom.ts` — ports `utils.ts`

```ts
export interface Pt { readonly x: number; readonly y: number; }
/** Row-major 2x3 affine [a b c / d e f] — same layout as the old number[] */
export type Affine = readonly [number, number, number, number, number, number];

export const IDENT: Affine;                                  // utils.ident
export function mul(A: Affine, B: Affine): Affine;           // utils.mul (verbatim)
export function inv(T: Affine): Affine;                      // utils.inv (verbatim)
export function trot(rad: number): Affine;                   // utils.trot (Math.cos/sin, not p.cos)
export function ttrans(tx: number, ty: number): Affine;      // utils.ttrans
export function transPt(M: Affine, p: Pt): Pt;               // utils.transPt (plain object out)
export function centroid(pts: readonly Pt[]): Pt;            // helper used by label placement
```

Port fidelity: trivial. Only change is `p.cos/p.sin` → `Math.cos/Math.sin`
(identical for radians) and returning `{x,y}` instead of `p5.Vector`.

### 3.2 `families.ts` — ports data from `tiles.ts` + `config.ts`

```ts
export type TileFamilyId = 'spectre' | 'hex' | 'hat' | 'turtle';
export type TileTypeId =
  | 'Gamma' | 'Delta' | 'Theta' | 'Lambda' | 'Xi'
  | 'Pi' | 'Sigma' | 'Phi' | 'Psi' | 'Gamma1' | 'Gamma2';

export const TILE_NAMES: readonly TileTypeId[];   // config.tile_names (9, incl. composite Gamma)
/** Canonical leaf order used for matching-index vectors and the CSV combo strings.
 *  MUST stay exactly this order (matches notebook ALL_TILE_NAMES): */
export const LEAF_ORDER: readonly TileTypeId[] =
  ['Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi','Gamma2','Gamma1'];
/** hex family has no Gamma1/Gamma2 — its leaf order is
 *  ['Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi','Gamma'] */
export function leafOrder(family: TileFamilyId): readonly TileTypeId[];

export const SPECTRE_PTS: readonly Pt[];   // tiles.spectre_pts (14)
export const HEX_PTS: readonly Pt[];       // tiles.hex_pts (6)
export const HAT_PTS: readonly Pt[];       // tiles.hat_pts (14)
export const TURTLE_PTS: readonly Pt[];    // tiles.turtle_pts (14)

export const SPECTRE_EDGE_LABELS: Readonly<Record<string, readonly string[]>>; // tiles.unique_edge_labels
export const HEX_EDGE_LABELS: Readonly<Record<string, readonly string[]>>;     // tiles.hex_edge_labels

/** Vertex array for a leaf tile in a family. Encapsulates the dominance logic in
 *  getEdgeDotMidpoints (tiles.ts:119–131): hat family → Gamma2 uses TURTLE_PTS,
 *  everything else HAT_PTS; turtle family mirrored; spectre/hex uniform. */
export function leafPts(family: TileFamilyId, type: TileTypeId): readonly Pt[];
export function edgeLabels(family: TileFamilyId, type: TileTypeId): readonly string[];
```

Note: the old code keys label lookups off global `state.shape === 'Hexagons'`;
the port makes `family` an explicit argument everywhere. That removes the
`state.ts` global entirely.

### 3.3 `edges.ts` — new structured layer over the label strings

```ts
export interface EdgeLabel {
  readonly raw: string;        // '-5.1A'
  readonly sign: 1 | -1;       // '-' prefix
  readonly major: number;      // 0..8 (edge class)
  readonly minor: number;      // index within the meta-edge
  readonly variant: 'A' | 'B';
}
export function parseEdgeLabel(raw: string): EdgeLabel;
// replaces the ad-hoc parseInt(lab.replace('-','')...) scattered through
// tiles.ts (lines 102, 139–141, 194–195, 418–420) and analysis.ts (18–19).
// NOTE the old minor parse `substring(2,3)` breaks for two-digit minors
// ('-4.3A' is fine, but a hypothetical '10.0A' is not); parseEdgeLabel uses a
// regex /^(-?)(\d+)\.(\d+)([A-Z])$/ and is unit-tested against every label
// in both tables.

/** A meta-edge: maximal run of physical edges with equal (sign, major, variant). */
export interface MetaEdge {
  readonly id: string;               // e.g. 'Delta/-5A' — stable key for hit areas
  readonly major: number; readonly sign: 1 | -1; readonly variant: 'A' | 'B';
  readonly edgeIndices: readonly number[];   // indices into the tile's label/vertex arrays
}
export function metaEdges(family: TileFamilyId, type: TileTypeId): readonly MetaEdge[];

/** EDGE CONTRACT: where the drawn line crosses a meta-edge of a given class.
 *  Defined on the POSITIVE label orientation as (minor edge index, fraction t
 *  along that physical edge in label direction). The core derives the
 *  negative-side placement automatically as (same minor, 1 - t) measured
 *  along the negative tile's own edge direction — because a `k.mA` edge glues
 *  to the neighbour's `-k.mA` edge traversed in reverse, this mirror rule is
 *  exactly the condition that makes the two tiles' points coincide. Users
 *  configure ONE value per class; alignment is guaranteed by construction. */
export interface EdgeContract { readonly minor: number; readonly t: number; } // t in [0,1]
export type EdgeContracts = Readonly<Partial<Record<number, EdgeContract>>>;  // by major class

/** Defaults reproduce getEdgeDotMidpoints exactly:
 *  - every signed class: { minor: 0, t: 0.5 }  (midpoint of the .0 edge —
 *    t=0.5 is self-mirror, which is why the old code could ignore signs);
 *  - class 0 (self-gluing, no negative version): the meta-edge's arc-length
 *    center, canonically { minor: 0, t: 1 } — the shared vertex of the
 *    two-edge spectre η seam; plain edge midpoint in the hex family. */
export const DEFAULT_CONTRACTS: EdgeContracts;

/** Class 0 constraint: its seam matches ITSELF under the involution
 *  (minor m, t) -> (M-1-m, 1-t)  [M = minors in the meta-edge], so a class-0
 *  contract must be a fixed point of that map (the meta-edge center).
 *  Throws (dev) / clamps to center (prod) on violation. */
export function validateContracts(family: TileFamilyId, c: EdgeContracts): EdgeContracts;

/** Connection point for one meta-edge at its class's contract position —
 *  generalizes the placement rules of getEdgeDotMidpoints (tiles.ts:137–163),
 *  which are the DEFAULT_CONTRACTS special case. Returns tile-local coords. */
export function connectionPoint(
  family: TileFamilyId, type: TileTypeId, edge: MetaEdge,
  contracts?: EdgeContracts,                       // default DEFAULT_CONTRACTS
): Pt;

/** All connection points for the selected majors, in label-array order.
 *  ORDER IS LOAD-BEARING: matching indices (sliders, URLs) are defined
 *  against this order, which equals the old getEdgeDotMidpoints order.
 *  (Contracts move the points geometrically but never reorder them.) */
export function connectionPoints(
  family: TileFamilyId, type: TileTypeId, selected: ReadonlySet<number>,
  contracts?: EdgeContracts,
): readonly { edge: MetaEdge; pt: Pt }[];

export function connectionCount(                       // ports analysis.getEdgeDotCount
  family: TileFamilyId, type: TileTypeId, selected: ReadonlySet<number>): number;
```

Contracts flow through the stack: `CircuitInput.contracts` (§3.7),
`TileView.contracts` / `TilingView.contracts` (§6), and the `ct` URL param
(§9.2). Changing a contract slides every dot/line-endpoint along its seam —
topology (matchings, circuits, tails) is unchanged; only geometry moves.
Unit test: for each family and each signed class, build the two abutting
edge parameterizations and assert `+`/`−` contract points coincide for
t ∈ {0, 0.25, 0.5, 1} and each minor; assert class-0 symmetry validation.

### 3.4 `tiles.ts` — ports `sketch.ts:73–233` and `tiles.ts Shape/Meta` as data

The old `Shape`/`CurvyShape`/`Meta` classes mix geometry with p5 drawing. The
port keeps only structure; rendering moves to components.

```ts
export type TileNode = LeafNode | MetaNode;
export interface LeafNode {
  readonly kind: 'leaf';
  readonly type: TileTypeId;             // geometry looked up via leafPts(family, type)
  readonly quad: readonly Pt[];          // 4 key points (Shape.quad)
}
export interface MetaNode {
  readonly kind: 'meta';
  readonly type: TileTypeId;             // Meta.label
  readonly quad: readonly Pt[];
  readonly children: readonly { node: TileNode; xform: Affine; pos: number }[];
}

/** label -> geometry, mirroring the old `sys` maps. Children are SHARED
 *  references (the old buildSupertiles reuses sys[...] objects — keep that;
 *  it is what makes level-6 structures representable in memory). */
export type TileSystem = Readonly<Record<string, TileNode>>;

export function buildBase(family: TileFamilyId): TileSystem;
// dispatches to ports of buildSpectreBase (sketch.ts:73), buildHexBase (:154),
// buildHatTurtleBase(hat_dominant) (:110). The `curved` flag of
// buildSpectreBase is NOT part of the node data — curviness is a render
// option (see outline.ts). Gamma composite: Gamma1 at IDENT, Gamma2 at
// mul(ttrans(pts[8]), trot(PI/6)) (spectre), ttrans(hat[8]) (hat family),
// mul(ttrans(turtle[9]), trot(PI/3)) (turtle family) — copied verbatim.

export function buildSupertiles(sys: TileSystem): TileSystem;
// verbatim port of sketch.ts:168–233 including t_rules, the reflection
// R = [-1,0,0,0,1,0], super_rules table, and super_quad. 'null' child slots
// skipped exactly as before (Gamma supertile has 7 children).
//
// MIRRORING: because every child transform is pre-multiplied by R, EACH
// SUBSTITUTION LEVEL IS A MIRROR IMAGE OF THE PREVIOUS ONE. Consequences the
// rest of the system must honor:
//  - leaf world transforms have det < 0 at odd depths — renderers, normal
//    computations and hit-testing must not assume a winding order (the
//    centroid-based inward-normal trick from the old code is kept because it
//    is orientation-agnostic);
//  - any "compare iterations" UI (the explorer level stepper) must
//    counter-mirror so the patch doesn't visually flip between levels.
export function levelMirror(level: number): Affine;
// R^level (IDENT for even, R for odd) — the compensating view transform;
// TilingView/TilingCanvas apply it when `stabilizeChirality` is on (§5.1).

export function buildSystem(family: TileFamilyId, level: number): TileSystem;
// buildBase + level x buildSupertiles. Memoized per (family, level).

/** Flattened leaf instance for rendering & analysis. */
export interface TileInstance {
  readonly type: TileTypeId;             // leaf type (Gamma1/Gamma2, never 'Gamma')
  readonly xform: Affine;                // world transform (composed down the tree)
  readonly id: string;                   // path of child `pos` values, e.g. '3.7.0'
}
export function flatten(root: TileNode): readonly TileInstance[];
export function countTiles(root: TileNode): number;      // ports Shape/Meta.count()
export function bounds(root: TileNode, family: TileFamilyId): { min: Pt; max: Pt };
```

### 3.5 `outline.ts` — ports `CurvyShape` constructor (tiles.ts:480–505)

```ts
export function straightOutline(pts: readonly Pt[]): string;    // SVG 'M...Z' polygon path
export function curvyOutline(pts: readonly Pt[]): string;       // SVG cubic-bezier path
// curvyOutline ports the CurvyShape constructor exactly: starting from the
// LAST vertex, each edge gets two control points at 0.33/0.67 along the edge,
// offset ±0.6 along the left normal, with the sign ALTERNATING per edge (the
// `blah` flag). Port-fidelity risk: the alternation starts with +0.6 and the
// loop starts at pts[len-1]; a golden-file unit test compares emitted path
// numbers against a fixture captured from the old streamSVG output.
```

### 3.6 `matchings.ts` — ports `analysis.ts findPerfectMatchings`

```ts
export type Matching = readonly (readonly [number, number])[];  // pairs of indices
                                                                // into connectionPoints() order

/** All perfect matchings of n points, in the EXACT enumeration order of
 *  findPerfectMatchings (analysis.ts:27–49): first point pairs with each
 *  remaining point in order, recursing. Count = (n-1)!! (1,3,15,105,945...).
 *  Indices, not coordinates: pure combinatorics, geometry-free. */
export function enumerateMatchings(n: number): readonly Matching[];
export function matchingCount(n: number): number;               // (n-1)!! closed form

/** Matchings whose chords (drawn between the actual connection points) do not
 *  intersect. New code (geometry: segment-intersection test with endpoints
 *  excluded), needed for combo-string mapping and as a UI filter.
 *  Returns indices into enumerateMatchings order. */
export function nonCrossingMatchingIndices(points: readonly Pt[]): readonly number[];

// ---- Combination strings (the blog/notebook/CSV canonical encoding) ----
// A combo is one digit per leaf type in leafOrder(family) — for spectre the
// ALL_TILE_NAMES order Delta,Theta,Lambda,Xi,Pi,Sigma,Phi,Psi,Gamma2,Gamma1 —
// where digit d selects that tile's d-th NON-CROSSING matching option
// ("the string 1000000000 means the second option for Delta"). The CSVs
// happen to be binary, but tiles can have >2 non-crossing options (the
// notebook uses '0401001000'); digits are base-36 chars (0-9a-z) so up to 36
// options per tile are representable — beyond that only the `m` URL encoding
// (§9.2) applies.
export function comboToMatchingIndices(          // combo digit -> full-matching index
  family: TileFamilyId, subset: readonly number[], combo: string,
  contracts?: EdgeContracts,
): readonly number[];
export function matchingIndicesToCombo(          // inverse; null if some selected
  family: TileFamilyId, subset: readonly number[],   // matching is crossing or its
  indices: readonly number[], contracts?: EdgeContracts, // non-crossing index >= 36
): string | null;
export function parseComboShareString(s: string):     // '2578-0100101100'
  { subset: readonly number[]; combo: string } | null;
export function formatComboShareString(subset: readonly number[], combo: string): string;
```

Slider semantics: the explorer slider for tile T ranges over
`0 .. matchingCount(connectionCount(...)) - 1` (full matching space), same as
the old `slider-${label}` DOM inputs, with an optional "non-crossing only"
toggle that restricts the cycle to `nonCrossingMatchingIndices`. The combo
codec bridges the two index spaces; `matchingIndicesToCombo` is what lets the
share panel emit blog-canonical strings whenever the current state is
expressible in them.

### 3.7 `circuits.ts` — ports `analysis.ts` minus DOM coupling

```ts
export type Segment = readonly [Pt, Pt];

export interface CircuitInput {
  family: TileFamilyId;
  instances: readonly TileInstance[];             // from flatten()
  selected: ReadonlySet<number>;                  // major classes
  matchingIndexByType: Readonly<Record<string, number>>;  // keyed by leaf TileTypeId
  contracts?: EdgeContracts;                      // §3.3; default DEFAULT_CONTRACTS
}

/** Ports collectEdges (analysis.ts:70–100) with the DOM slider lookup replaced
 *  by matchingIndexByType, and Meta recursion replaced by pre-flattened
 *  instances. Tiles whose connection count is odd contribute nothing (same
 *  early-return as the old code — this is what makes invalid subsets show
 *  tails at tile granularity... see note below). */
export function collectSegments(input: CircuitInput): readonly Segment[];

/** Verbatim port of weldEdges (analysis.ts:201–251), epsilon 0.05 world units
 *  (safe: all transforms are rigid, tiles stay unit-scale at every level). */
export function weldSegments(segs: readonly Segment[], epsilon?: number): readonly Segment[];

export interface Path { readonly points: readonly Pt[]; readonly closed: boolean; }
export interface CircuitAnalysis {
  readonly circuits: readonly Path[];             // closed
  readonly tails: readonly Path[];                // open
  readonly junctionCount: number;                 // degree>2 weld-points encountered
  readonly circuitsByLength: ReadonlyMap<number, readonly Path[]>;
  readonly tailsByLength: ReadonlyMap<number, readonly Path[]>;
  readonly segmentColor: ReadonlyMap<string, string>;   // canonical segment key -> css color
  readonly circuitColorByLength: ReadonlyMap<number, string>;
}
export function analyze(input: CircuitInput, opts?: { rainbowTails?: boolean }): CircuitAnalysis;
export function segmentKey(s: Segment): string;   // ports edgeToKey (3-decimal canonical form)
```

**Deliberate rewrite (flagged):** `processCircuits` (analysis.ts:103–197) is a
DFS with ad-hoc path reconstruction that mishandles branch points. After
welding, node degree is ≤ 2 *except* at class-0 vertex connection points
where three tiles can meet — the notebook explicitly observes "3 lines meet at
a single point" in complex setups. The new tracer:

1. builds the same adjacency map keyed by 3-decimal point keys;
2. classifies nodes: degree 1 (endpoints), degree 2, degree ≥ 3 (junctions);
3. walks maximal chains starting from every degree-1 and degree-≥3 node
   (never through a junction), then remaining untouched degree-2 components
   are pure cycles;
4. reports closed cycles as circuits, everything else as tails, and counts
   junctions.

This matches the notebook's `find_components`/`comps_and_analysis` semantics
better than the current web code. **Acceptance oracle:** results at level 4
must reproduce `graph_analysis/lvl4.csv` rows (§10.2); a secondary test
compares against the old `processCircuits` output for junction-free cases.

Color assignment ports `generateColorMap` (analysis.ts:254–295): one hue per
distinct circuit length stepping 40° from 0 (`hsl(h,100%,50%)`); tails grey
`#808080` or rainbow via `getRainbowColor` (utils.ts:56–66, ported to
`colors.ts`) parameterized along the path.

### 3.8 `subsets.ts` — linear algebra over GF(2) (supersedes `getValidEdgeCombinations`)

The valid subsets are exactly the kernel of the tiles×edge-class count matrix
mod 2, and they form a group under symmetric difference. The core computes
this **per family from the matrix** — no hardcoded answer — because families
differ: the spectre kernel has dimension 3 (8 subsets) while the hexagon
family's kernel is larger (16 elements = dimension 4, per the owner's
analysis; the stage-1 test pins the exact value).

```ts
export type Subset = number;   // bitmask over majors 0..8 (bit k = class k); doubles as
                               // the group element representation — XOR is the group op.

/** Rows = leaf tile types (leafOrder(family)), cols = majors present in the
 *  family; entry = connectionCount parity. Built from connectionCount only. */
export function edgeCountMatrix(family: TileFamilyId): {
  rows: readonly TileTypeId[]; cols: readonly number[];
  bits: readonly (readonly (0 | 1)[])[];
};

/** GF(2) Gaussian elimination; returns a basis of the kernel as Subsets. */
export function kernelBasis(m: ReturnType<typeof edgeCountMatrix>): readonly Subset[];

/** The full group: span of the kernel basis (2^dim elements), sorted
 *  canonically (by popcount, then numerically) for stable dropdown order. */
export function validEdgeSubsets(family: TileFamilyId): readonly {
  mask: Subset; edges: readonly number[]; label: string;   // '2, 5, 7(M), 8'
}[];

export const xorSubsets: (a: Subset, b: Subset) => Subset;  // symmetric difference
export function subsetToString(s: Subset): string;          // 0b… -> '2578'
export function subsetFromString(s: string): Subset;        // '2578' -> mask

/** Brute-force port of getValidEdgeCombinations (analysis.ts:326–372),
 *  family-parameterized. KEPT AS A TEST-ONLY ORACLE asserting it agrees with
 *  the kernel-span computation for every family. */
export function bruteForceValidSubsets(family: TileFamilyId): readonly Subset[];

/** Known-good spectre answer — TEST FIXTURE, not a source of truth: */
export const SPECTRE_VALID_SUBSETS: readonly string[] =
  ['', '15', '0136', '0356', '1278', '2578', '023678', '01235678'];
```

Class 7 keeps its "(M)" Mystic marker in display labels (analysis.ts:367).
The group structure is surfaced in the explainer (matrix explorer + kernel
gallery beats, §7.2) and lets the UI offer "combine two rules" (XOR of two
valid subsets is valid) as a discovery affordance.

### 3.9 `colors.ts`

```ts
export type ColorSchemeId = 'bright' | 'fig53' | 'mystics' | 'pride' | 'custom';
export const TILE_PALETTES: Record<Exclude<ColorSchemeId,'custom'>, Record<string, [number,number,number]>>;
// bright=colmap_orig, fig53=colmap53, mystics=colmap_mystics, pride=colmap_pride (config.ts)
export const EDGE_CLASS_COLORS: Record<number, string>;
// the leadColors table (tiles.ts:202–214) keyed by major class; used for dots,
// edge labels, and subset-picker chips so edge classes have one identity site-wide.
export function rainbow(t: number): string;   // utils.getRainbowColor
```

### 3.10 `serialize.ts` — see §9 for the wire format

```ts
export interface ExplorerState { /* §9.1 */ }
export function encodeExplorerState(s: ExplorerState): URLSearchParams;
export function decodeExplorerState(q: URLSearchParams): ExplorerState;  // lenient: bad/missing -> defaults
export const DEFAULT_EXPLORER_STATE: ExplorerState;
```

### 3.11 `stats.ts` — see §10

---

## 4. Port map summary (old → new)

| Old code | New home | Notes |
|---|---|---|
| `utils.ts` mul/inv/trot/ttrans/transPt/ident | `core/geom.ts` | verbatim; drop p5 |
| `utils.ts` getRainbowColor | `core/colors.ts` | verbatim |
| `tiles.ts` spectre/hex/hat/turtle_pts, both label tables | `core/families.ts` | verbatim data |
| `tiles.ts` getEdgeDotMidpoints (112–165) | `core/edges.ts connectionPoints` | family becomes a parameter; placement rules identical |
| `tiles.ts` Shape/Meta structure | `core/tiles.ts TileNode` | classes → data; draw/streamSVG dropped |
| `tiles.ts` CurvyShape ctor (480–505) | `core/outline.ts curvyOutline` | golden-file tested |
| `tiles.ts` leadColors (202–214) | `core/colors.ts EDGE_CLASS_COLORS` | verbatim |
| `sketch.ts` buildSpectreBase/buildHexBase/buildHatTurtleBase (73–166) | `core/tiles.ts buildBase` | verbatim transforms |
| `sketch.ts` buildSupertiles (168–233) | `core/tiles.ts buildSupertiles` | verbatim incl. t_rules/R/super_rules |
| `analysis.ts` findPerfectMatchings | `core/matchings.ts enumerateMatchings` | index-based, order preserved |
| `analysis.ts` getEdgeDotCount | `core/edges.ts connectionCount` | verbatim |
| `analysis.ts` collectEdges | `core/circuits.ts collectSegments` | DOM slider → explicit param |
| `analysis.ts` weldEdges | `core/circuits.ts weldSegments` | verbatim |
| `analysis.ts` processCircuits | `core/circuits.ts` tracer | **rewritten** (§3.7, junction-safe) |
| `analysis.ts` generateColorMap, analyzeAndColor | `core/circuits.ts analyze` | p5 param removed |
| `analysis.ts` getValidEdgeCombinations | `core/subsets.ts bruteForceValidSubsets` | test-only oracle; production path is kernel-span (§3.8) |
| `config.ts` tile_names, colmaps | `core/families.ts`, `core/colors.ts` | verbatim |
| `state.ts`, `sketch.ts` UI/pan/zoom/thumbnails, `ui.ts` | deleted | replaced by React |

Nothing keeps p5. Justification for full removal: audit shows every p5 use is
vector construction, trig, or immediate-mode drawing (§1.1).

---

## 5. Rendering strategy

### 5.1 `TilingView` (SVG, levels 0–4)

- Emits one `<defs>` entry per **leaf tile type present** containing the
  outline path (`straightOutline`/`curvyOutline` of `leafPts`), then one
  `<use href="#tile-Delta" transform="matrix(a,d,b,e,c,f)">` per
  `TileInstance`. `Affine [a,b,c,d,e,f]` (row-major 2×3) maps to SVG
  `matrix(a, d, b, e, c, f)` — note the column-major reorder; this gets a
  dedicated unit test because it is the classic silent-breakage spot.
- Fill = palette color by type (or `none` when backgrounds off); stroke =
  black 0.1 world units when outlines on. Toggling backgrounds/outlines is a
  CSS-class flip on the container, not a re-render.
- `CircuitLayer` renders `analyze()` output as `<polyline>`s (one per path,
  colored per §3.7) above the tiles, plus connection dots at **contract
  positions** (§3.3) in `EDGE_CLASS_COLORS`, r=0.15 (as in streamSVG
  tiles.ts:442) when dots on. Tail endpoints get a `.tail-end` marker class
  (used by the explainer's sad-tile beat and a `markOddTiles` option that
  pulses tiles with odd connection counts).
- `stabilizeChirality?: boolean` (default true): applies
  `levelMirror(level)` (§3.4) as the outer view transform so stepping the
  supertile level does not visually mirror the scene — required because each
  substitution level is a reflection of the previous. `TilingCanvas` honors
  the same prop.
- `contracts?: EdgeContracts` forwarded to dot/segment geometry.
- Level 4 ≈ 4.4k tiles ⇒ ≈ 4.4k `<use>` + ≤ ~15k circuit polyline points:
  fine for static DOM; pan/zoom is a single transform update on two `<g>`
  roots (§5.4), so no per-frame re-render.

### 5.2 `TilingCanvas` (levels 5–6, read-only)

Same props as `TilingView` minus interactivity. Plain Canvas2D: iterate
instances, `setTransform`, trace the cached `Path2D` per tile type, fill +
stroke; then draw circuit paths. Runs inside `requestAnimationFrame` with the
camera transform; redraws only on camera/state change. Level 6 ≈ 273k tiles ⇒
one full redraw is O(273k) path fills ≈ 100–300 ms; acceptable for a
deliberately-entered "huge render" mode with a progress veil, and circuit
analysis at this size runs in the worker (§5.5).

### 5.3 Tile-count budget (Delta root; from super_rules recurrence, verify with `countTiles`)

| level | tiles (approx) | renderer |
|---|---|---|
| 0 | 1 | SVG |
| 1 | 9 | SVG |
| 2 | 71 | SVG |
| 3 | 559 | SVG |
| 4 | 4 401 | SVG |
| 5 | ~34 649 | Canvas |
| 6 | ~272 791 | Canvas |

### 5.4 `PanZoom`

One controller for both renderers. Owns `camera = {x, y, scale}` and converts
to a group transform (SVG) or context transform (canvas). Pointer events:
drag-to-pan (primary button / single touch), wheel zoom about cursor
(replicates `sketch.ts p.mouseWheel`), two-pointer pinch zoom about the
midpoint (replicates `touchStarted/touchMoved`, sketch.ts:1270–1333).
`touch-action: none` on the surface. Exposes `zoomToFit(bbox)` used by
"show me an example circuit" (§7.1) and initial framing via `bounds()`.

### 5.5 Analysis worker

`useCircuitAnalysis(input)` posts `CircuitInput` (structured-clone friendly:
plain arrays/objects) to `analysis.worker.ts` via Vite's
`new Worker(new URL('../core/analysis.worker.ts', import.meta.url), {type:'module'})`.
Level ≤ 2 runs synchronously (latency < 10 ms beats worker round-trip);
level ≥ 3 goes to the worker with a cancellation token (newest request wins).
Results are memoized on `(family, level, subset, matching vector)`.

---

## 6. Widget framework

### 6.1 `TileView` — the generic interactive tile widget

Used by: explorer matching sliders, palette, every explainer beat, stats
examples. Renders ONE tile (leaf or the Gamma composite) as SVG in its own
viewBox, auto-fitted.

```tsx
export type EdgeRef = { tileType: TileTypeId; metaEdgeId: string; label: EdgeLabel };

export interface TileViewProps {
  family: TileFamilyId;
  tileType: TileTypeId;                  // 'Gamma' renders Gamma1+Gamma2 composite
  curvy?: boolean;                       // spectre family only
  size?: number | string;                // css size; svg viewBox handles scale
  colorScheme?: ColorSchemeId;
  customColors?: Record<string, string>;
  contracts?: EdgeContracts;             // §3.3; dots/chord endpoints/landing spots all
                                         // render at contract positions (default = old behavior)

  // display layers
  selectedEdges?: ReadonlySet<number>;   // majors: draws connection dots (EDGE_CLASS_COLORS)
  showEdgeLabels?: boolean;              // '3.0A' style labels at physical-edge midpoints
  matchingIndex?: number;                // draws that matching's chords, bold
  ghostMatchings?: boolean;              // all other matchings at 10% alpha (old thumbnail behavior,
                                         // sketch.ts drawGeomToContext:375–398)
  nonCrossingOnly?: boolean;             // restrict matchingIndex domain
  overlays?: readonly Chord[];           // straight-line drawings (§9.1)
  highlightMajors?: ReadonlySet<number>; // externally-driven glow (palette sync)
  dimmed?: boolean;

  // interactivity
  interaction?: 'none' | 'hover' | 'edge-select' | 'chord-draw';
  onEdgeHover?(edge: EdgeRef | null): void;
  onEdgeClick?(edge: EdgeRef): void;             // edge-select mode: toggle a major
  onChordDrawn?(from: EdgeRef, to: EdgeRef): void; // chord-draw mode (§6.5)
  onMatchingCycle?(delta: 1 | -1): void;         // click chord area / arrow keys
}
```

DOM structure (contract for tests):

```html
<svg role="img" aria-label="Delta tile">
  <g class="tile-fill">…</g>
  <g class="meta-edges">            <!-- one group per MetaEdge -->
    <g data-edge-id="Delta/-5A" data-major="5" tabindex="0" role="button">
      <path class="edge-hit" …/>    <!-- invisible, wide stroke: hit area -->
      <path class="edge-visual" …/> <!-- highlight stroke, hidden until hover/highlight -->
      <circle class="edge-dot" …/>  <!-- connection point -->
    </g>
  </g>
  <g class="matching-chords">…</g>
  <g class="overlays">…</g>
  <g class="edge-labels">…</g>
</svg>
```

### 6.2 `TilePalette`

```tsx
export interface TilePaletteProps {
  family: TileFamilyId;
  tileTypes?: readonly TileTypeId[];        // default: leafOrder(family) + spectre shows
                                            // Gamma1/Gamma2 separately (old miniNames logic,
                                            // sketch.ts:317–321)
  columns?: number;                         // responsive grid otherwise
  // shared/synced state — palette is fully controlled:
  selectedEdges: ReadonlySet<number>;
  highlightMajors?: ReadonlySet<number>;
  matchingIndexByType?: Readonly<Record<string, number>>;
  interaction?: TileViewProps['interaction'];
  onEdgeHover?(edge: EdgeRef | null): void; // parent echoes back highlightMajors={major} to
                                            // light up matching edge locations on ALL tiles
  onEdgeToggle?(major: number): void;
  onChordDrawn?(tileType: TileTypeId, from: EdgeRef, to: EdgeRef): void;
  perTileFooter?(type: TileTypeId): ReactNode;  // explorer injects MatchingSlider here
}
```

The "dots appear on every tile" behavior is deliberately *not* internal magic:
`TilePalette` raises `onEdgeHover`/`onEdgeToggle`, the parent updates
`highlightMajors`/`selectedEdges`, and every `TileView` re-renders its dots.
Selecting an edge class anywhere means selecting it everywhere — the state
model enforces the domain rule.

### 6.3 `SeamView` — two tiles shaking hands across one seam

Purpose-built for the explainer's "seam handshake" beat and reusable anywhere
the `+`/`−` pairing needs demonstrating (e.g. contract documentation).

```tsx
export interface SeamViewProps {
  family: TileFamilyId;
  tileA: TileTypeId;                   // e.g. 'Theta'
  seamMajor: number;                   // e.g. 2 — SeamView computes a valid neighbour
  tileB?: TileTypeId;                  //   type/pose, or the caller pins one
  contracts?: EdgeContracts;
  showLabels?: boolean;                // '2.0A/2.1A/2.2A' on A's side,
                                       // '-2.2A/-2.1A/-2.0A' on B's side
  showSharedDot?: boolean;             // single crossing-dot both tiles agree on,
                                       // at the contract position
  interaction?: 'none' | 'hover';      // hover lights the seam on BOTH tiles
  onSeamHover?(hovering: boolean): void;
}
```

Internally: two `TileView`s in one SVG, tile B posed by solving the seam
gluing transform (reflection-free rigid motion mapping B's `-k` meta-edge
polyline onto A's `+k` polyline reversed). The shared dot is *rendered once* —
computed independently from each tile's contract and asserted coincident in
dev builds; this doubles as a living test of the §3.3 mirror rule.

### 6.4 Controls

- `EdgeSubsetPicker`: dropdown listing `validEdgeSubsets(family)` with each
  option showing colored chips per major (EDGE_CLASS_COLORS) + the label
  (`'2, 5, 7(M), 8'`). Also an "advanced" free-toggle row of majors 0–8 that
  warns (yellow badge + tail count) when the manual selection is not in the
  valid list — this is how the explainer's "tails problem" is demonstrated.
- `MatchingSlider`: mini `TileView` (ghostMatchings on) + `<input type=range>`
  `0..matchingCount-1` + numeric badge `i+1/N` + non-crossing filter checkbox.
  One per leaf type with ≥ 2 connection points; others hidden.
- `DisplayToggles`: backgrounds, outlines, circuit lines, dots, edge labels,
  rainbow tails, curvy tiles — maps 1:1 to `flags` bits (§9.1).
- `ColorSchemePicker`: 4 palettes + Custom with per-tile color wells
  (replaces the p5 color pickers; custom values go to the `cc` param).
- `SharePanel`: "Copy link" (current URL), "Copy combination string" (the
  canonical `2578-0100101100` form when representable, §3.6), "Download SVG"
  (serializes the live `TilingView` DOM — replaces `streamSVG`), "Download
  PNG" (draw same scene to an offscreen canvas via `TilingCanvas`'s renderer).
- `StatsSummary`: circuit lengths with count chips in circuit colors, tail
  lengths, analysis time; chip click → highlight + `zoomToFit` first instance.

### 6.5 Edge-drag interaction spec (chord-draw mode)

Pointer-events based (mouse/touch/pen unified). All coordinates in tile-local
space via `getScreenCTM().inverse()`.

1. **Hit areas.** Every meta-edge gets an `.edge-hit` path stroking its full
   physical polyline, `stroke-width = max(0.5 world units, 44 css px / scale)`,
   `pointer-events: stroke`, invisible. Class-0 edges additionally get a
   circular hit region (r same rule) around the vertex connection point.
   44 px satisfies WCAG touch-target guidance at default widget sizes.
2. **Hover.** `pointerenter` → `.edge-visual` glows in
   `EDGE_CLASS_COLORS[major]`, connection dot scales 1.4×, tooltip shows
   `major (labels first–last)` e.g. `5 (-5.1A – -5.0A)`; `onEdgeHover(edge)`.
   In palette context the parent lights every same-major edge on all tiles.
3. **Drag start.** `pointerdown` on a hit area → `setPointerCapture`; anchor =
   that edge's connection point; a ghost chord (dashed, class color) follows
   the pointer. `touch-action: none` prevents scroll hijack.
4. **Landing spots.** All *other* meta-edges of the tile display their
   connection points as pulsing rings ("valid landing spots"). If props
   restrict targets (explainer puzzles pass `validTargets?: metaEdgeId[]`),
   only those pulse; others render greyed.
5. **Snap & drop.** While dragging, the nearest landing spot within
   `max(0.9 world units, 32 px/scale)` snaps the ghost chord and enlarges the
   ring. `pointerup` while snapped → `onChordDrawn(from, to)`. `pointerup`
   elsewhere or `Escape` → cancel animation (chord retracts, 120 ms).
6. **Keyboard.** Meta-edge groups are focusable (`tabindex=0`); Enter starts
   "chord mode", arrows cycle landing spots, Enter commits, Esc cancels.
7. **Semantics are the caller's.** The widget only reports the gesture:
   - Explorer overlay tool: chord appended to `overlays[tileType]` (§9.1) —
     this IS the "straight-line drawing mode": chords drawn on one tile type
     repeat on every instance in the tiling, and because endpoints are
     connection points they join into long paths/circuits across tiles.
   - Explainer puzzles: chord = "pair these two edges", driving parity demos.
   - Edge-select pages: a chord's two majors get added to the selection.

---

## 7. Page specs

### 7.0 Shell & navigation

Top nav: Home · Explorer · The Tails Problem · Circuits & Stats. Footer links
to the repo and the Smith–Myers–Kaplan–Goodman-Strauss paper. Content column
max-width ~720 px for prose; explorer is full-bleed.

### 7.1 Explorer (`#/explorer`)

Layout: left sidebar (collapsible on mobile, bottom sheet), main viewport.

Sidebar, top to bottom:
1. Family select (`spectre | hex | hat | turtle`, labeled with the old display
   names "Tile(1,1)", "Hexagons", "Turtles in Hats", "Hats in Turtles").
2. Root tile select (TILE_NAMES; default Delta) + level stepper `0–6` with
   tile-count preview (replaces the "Build Supertiles" button — level is now
   declarative state, so URLs can encode it; `buildSystem` is memoized).
   Stepping levels keeps the view chirality-stable via `levelMirror` (§3.4) —
   without it every step would mirror the scene.
3. `EdgeSubsetPicker`.
4. Matching sliders: one `MatchingSlider` per leaf type with dots, laid out as
   the palette (this replaces the old thumbnail strip). A read-only combo
   readout (e.g. `2578-0100101100`) tracks the sliders whenever the state is
   combo-representable (§3.6) and is itself paste-able into the share panel.
5. Overlay tools: cursor / straight-line (chord-draw on the mini tiles) /
   eraser; "clear overlays".
6. `DisplayToggles`, `ColorSchemePicker`, `SharePanel` (copy link + copy
   canonical combination string + SVG/PNG). An "Advanced" accordion exposes
   per-class contract editors (minor stepper + t slider, §3.3) — moving a
   contract slides every dot and line crossing on that seam class live.
7. `StatsSummary` for the current render, including "unique circuit lengths"
   chips — clicking a chip zooms to an example (`zoomToFit` on the first
   circuit of that length) and pulses it; a "next example" button cycles
   instances. Tail-length histogram (mini SVG bars) below.

Viewport: `TilingView` (level ≤ 4) or `TilingCanvas` (level ≥ 5, with an
"interactivity limited at this zoom level" note), wrapped in `PanZoom`.
Analysis veil + spinner while the worker runs.

All state lives in `useExplorerState` (reducer) and round-trips through the
URL (§9). Every control is driven from decoded state — deep links reproduce
the exact scene.

### 7.2 Tails-problem explainer (`#/tails`)

Long-form article; the prose lives in **`docs/EXPLAINER_COPY.md`** ("The Tile
With the Tail") and is transcribed into plain TSX sections (no MDX — keeps
tooling simple). The copy defines **9 widget slots**; each becomes a numbered
`<section id>` for anchor links, implemented with §6 components plus the four
explainer-local components listed in §1.3:

| # | Copy slot | Implementation |
|---|---|---|
| 1 | Single-tile edge hover — lone Delta; hovering any of the 14 physical edges lights its full label and softly highlights the rest of the seam; sidebar tallies Delta's six seams (3, 2, −5, 1, −3, −6) | `TileView` interaction='hover', showEdgeLabels; `onEdgeHover` drives the seam-tally sidebar (majors from `metaEdges`) |
| 2 | Seam handshake — Theta glued to a neighbour along a class-2 seam; labels shown from both sides (`2.0A/2.1A/2.2A` vs `-2.2A/-2.1A/-2.0A`); one shared crossing-dot on the `.0` edge both tiles agree on | `SeamView` (§6.3) tileA='Theta', seamMajor=2, showLabels, showSharedDot — the dot sits at the class-2 contract position |
| 3 | First lines — patch of ~30 Spectres with class 1 selected; dots bloom, strokes draw themselves; camera lingers on a Pi joining its two 1-dots | `TilingView` level 2, subset `{1}`, `CircuitLayer` stroke-dash draw-in animation, `PanZoom.zoomToFit` on a Pi instance (`highlightInstance` prop) |
| 4 | The sad tile — same patch, camera pans to a Delta; its single class-1 dot pulses red, line ends fray; Lambda, Xi, Sigma, Psi glow red too | same `TilingView` with `markOddTiles` (§5.1) + `.tail-end` markers; scripted `zoomToFit` on a Delta instance |
| 5 | Puzzle console — nine toggle chips (0–8) over a live patch; instant redraw; tail-affected tile-type counter; explored-subset tracker (of all 512); confetti on a tail-free nonempty subset; no answers revealed | `PuzzleConsole` (explainer-local): chips + `TilingView` level 1–2 + `connectionCount` parity per type; explored-set persisted in `localStorage`; validity check via `subsets.ts` without displaying the kernel |
| 6 | Matrix explorer — the mod-2 table live; hovering a column highlights those seams on a filmstrip of all ten tile types; clicking headers builds a subset, rows XOR live and flash red on odd sums; presets {5} and {1,5} | `MatrixExplorer` (explainer-local): `edgeCountMatrix('spectre')` + filmstrip of `TileView`s with synced `highlightMajors`; row parity via XOR of selected columns |
| 7 | Kernel gallery — eight cards, one per valid subset, same patch under each rule; ∅ card blank; `{0,1,2,3,5,6,7,8}` card seethes; badges "4 never invited", "7 = Mystic seam" | `KernelGallery`: cards from `validEdgeSubsets('spectre')`, each a level-2 `TilingView` (worker-analyzed lazily on scroll-in); card click → explorer deep link `#/explorer?e=…` |
| 8 | Matchmaker slider — a Psi under {1,5} with four dots, slider cycles its three perfect matchings; second slider for Theta under {2,5,7,8} | two `MatchingSlider`s (§6.4) with fixed presets, ghostMatchings on |
| 9 | Circuits vs. wanderers — large patch under {2,5,7,8}, two preset matching profiles (e.g. the canonical `2578-0100101100`); profile A = small circuits colored by length, B = enormous rainbow paths; crossfade toggle with live circuit/wanderer counts | `ProfileCrossfade`: two precomputed `analyze()` results (worker), crossfading `CircuitLayer`s; profiles defined as combo share strings via `parseComboShareString` (§3.6) |

A closing epilogue section (family switcher: the same palette machinery on
hex/hat/turtle) links to the explorer and stats pages, per the copy's ending.
Widgets are lazy-mounted (IntersectionObserver) so the page stays light.
Note for beat 3: the copy's "~30 spectres with class 1 selected" intentionally
previews the failure beat 4 reveals — 1 alone is *not* a valid subset; the
implementation renders it with tails initially off-camera. Beat copy and
implementation must be reconciled during stage 4 review (owner sign-off).

### 7.3 Circuits & stats (`#/stats`)

Data: `graph_analysis/lvl4.csv` + `lvl6.csv` (§10). Layout:

1. **Controls:** dataset toggle (level 4 / level 6), subset filter chips (the
   6 subsets present in the data: 023678 ×160, 2578 ×64, 1278 ×32, 0356 ×8,
   15 ×4, 0136 ×2), search box for combo strings.
2. **Overview panel:** per-subset summary — how many combos, min/max circuit
   count, share of combos with `max_circuit = 0` (candidate space-filling /
   infinite-line configurations, per graph_analysis/README.md), scatter of
   circuits vs tails (SVG, point per combo, colored by subset).
3. **Combo table:** sortable columns combo · circuits · tails · max_circuit ·
   max_tail · distinct circuit lengths. Row click opens a detail drawer:
   `circuit_lengths` chips, tail-length histogram (from the `tail_lengths`
   dict), and **"Open in Explorer"** — builds an explorer URL with the row's
   `edge_selection` and the matching vector mapped from `combo` via
   `comboToMatchingIndices` (§3.6). Until that mapping is verified, the
   button ships behind a "matchings approximate" tooltip (risk §12.1).
4. **Finite vs infinite narrative strip:** short prose + two embedded level-2
   `TilingView` examples contrasting a few-circuit-types combo with a
   many-lengths combo.

### 7.4 Home (`#/`)

Hero render (static SVG generated from a nice preset), three cards linking to
the pages, one-paragraph "what is an aperiodic monotile".

---

## 8. Routing & deployment

### 8.1 Hash routing — decision

`createHashRouter`. URLs look like `https://<user>.github.io/Spectre/#/explorer?e=2578&…`.

Why hash over the 404.html trick:
- GitHub Pages project sites can't rewrite; the 404 trick works but (a) serves
  real 404 status codes to crawlers, (b) requires a redirect script that
  mangles the query string exactly where we store shareable state, and
  (c) flashes on load. Hash URLs survive copy/paste, hard refresh, and Pages'
  static hosting with zero infrastructure.
- SEO cost is acceptable: the only content worth indexing (home + explainer
  prose) is served on the root document; everything else is a tool.
- State encoding composes cleanly: react-router's `useSearchParams` operates
  on the query-within-hash.

### 8.2 CI/deploy (`.github/workflows/static.yml`)

Confirmed current pipeline: on push to `main` → `npm install` +
`npm run build` in `./web` → upload `./web/dist` → deploy Pages. **No workflow
changes are required**: app root, build command, and output dir are unchanged.
Two small recommended edits (stage 6):
- add `npm run test:unit -- --run` (vitest) before build so a broken core
  fails deploys;
- `npm ci` instead of `npm install` (lockfile exists).

`vite.config.ts` keeps `base: '/Spectre/'`, drops the `p5` manualChunks block,
adds `@vitejs/plugin-react`. Route-level `React.lazy` gives per-page chunks;
the stats CSVs land in the stats chunk only (§10.1).

---

## 9. State & URL-sharing scheme

### 9.1 Explorer state

```ts
export interface ExplorerState {
  family: TileFamilyId;               // 'spectre'
  rootTile: TileTypeId;               // 'Delta'
  level: number;                      // 0..6, default 2
  subset: readonly number[];          // selected majors, sorted, e.g. [2,5,7,8]
  matching: readonly number[];        // per-leaf matching index, leafOrder(family) order
  flags: number;                      // display bitmask, see below
  colorScheme: ColorSchemeId;
  customColors?: Record<string, string>;   // only when colorScheme === 'custom'
  contracts?: EdgeContracts;          // §3.3; absent = DEFAULT_CONTRACTS
  overlays: Readonly<Record<string, readonly Chord[]>>; // tileType -> chords
  camera?: { x: number; y: number; scale: number };
}
export type Chord = readonly [metaEdgeIdxA: number, metaEdgeIdxB: number];
// indices into metaEdges(family, type) order — compact and resolution-independent.
```

### 9.2 Wire format (query string inside the hash)

`#/explorer?v=1&f=spectre&t=Delta&lv=2&e=2578&c=0100101100&fl=23&cs=bright&ov=Delta:0-4,2-7;Xi:1-3&cam=12.50,-3.20,1.80`

| param | meaning | encoding | default (omitted when default) |
|---|---|---|---|
| `v` | codec version | int, always emitted | `1` |
| `f` | family | `spectre\|hex\|hat\|turtle` | `spectre` |
| `t` | root tile | TileTypeId | `Delta` |
| `lv` | supertile level | int 0–6 | `2` |
| `e` | edge subset | concatenated sorted majors, e.g. `2578`; empty = none | none |
| `c` | **combination string** (preferred) | one base-36 digit per leaf in `leafOrder(family)` order (10 chars spectre/hat/turtle, 9 hex), digit = index into that tile's *non-crossing* matchings — byte-compatible with the blog/notebook/CSV combo format (`e=2578&c=0100101100` ≡ canonical `2578-0100101100`) | all `0` |
| `m` | matching indices (fallback) | dot-separated non-negative ints in `leafOrder(family)` order, indexing the *full* matching enumeration; trailing zeros trimmed. Emitted only when the state is not `c`-representable (a selected matching is crossing, or its non-crossing index ≥ 36) | all `0` |
| `fl` | display flags | decimal bitmask: 1 backgrounds, 2 outlines, 4 circuit lines, 8 dots, 16 rainbow tails, 32 edge labels, 64 curvy, 128 non-crossing-only | `23` (bg+outline+lines+rainbow) |
| `cs` | color scheme | `bright\|fig53\|mystics\|pride\|custom` | `bright` |
| `cc` | custom colors | only with `cs=custom`: `Tile:rrggbb` comma list, e.g. `cc=Delta:dcdcdc,Xi:fff200` | — |
| `ct` | edge contracts | `;`-separated `major:minor@t` overrides of DEFAULT_CONTRACTS, t 2-decimal, e.g. `ct=2:2@0.60;5:1@0.40`; class 0 entries must be symmetric (§3.3) else dropped | none |
| `ov` | overlays | `;`-separated `TileType:a-b[,a-b]*` with a,b = meta-edge indices | none |
| `cam` | camera | `x,y,scale`, 2-decimal fixed | auto-fit |

Rules:
- Decoder is lenient: unknown params ignored; out-of-range `m`/`c` values
  clamped to the relevant matching count − 1; malformed anything → that
  field's default (a shared link never hard-crashes).
- `c` and `m` are alternates for the same state slice; if both appear, `c`
  wins. The encoder prefers `c` (via `matchingIndicesToCombo`, §3.6) so that
  shared URLs match the blog's canonical combination strings whenever
  possible; `m` is the lossless superset for exotic states. The explorer's
  share panel also shows the bare `2578-0100101100` string with a copy
  button, and the URL decoder accepts it pasted into a `combo=` param on the
  stats page (§9.3).
- Encoder writes params in the table's order and omits defaults, keeping
  typical links < 120 chars.
- URL updates are debounced 300 ms via `history.replaceState` (no history
  spam while sliding); explicit share always reads fresh state.
- `cam` is included only by SharePanel's "copy exact view"; casual navigation
  keeps URLs camera-free so links stay canonical.
- The old dual `selectedMajorEdges`/`selectedJoinerEdges` sets collapse into
  one `subset` + the labels display flag — the split was a UI artifact.

### 9.3 Explainer / stats URLs

Explainer: section anchors only (`#/tails` + scroll restoration by section id
query `?s=5`). Stats: `#/stats?ds=lvl4&sel=2578&combo=0000000100` so specific
rows are linkable.

---

## 10. Stats data pipeline

### 10.1 Loading

`graph_analysis/lvl4.csv` (34 KB) and `lvl6.csv` (55 KB) are **copied into
`web/src/data/`** and imported with Vite `?raw` (`import lvl4 from
'../data/lvl4.csv?raw'`) from `core/stats.ts`, parsed at first use on the
stats route (which is lazy-loaded, so the ~90 KB rides only in the stats
chunk). Rationale vs `web/public/`: no runtime fetch/base-path handling, no
404 mode, data versioned with the code that parses it. The originals in
`graph_analysis/` remain the source of truth; a `predev`-documented note in
stats.ts says "regenerate by copying from /graph_analysis". (`mega_df.csv` is
referenced by graph_analysis/README.md but absent from the repo — see §12.4.)

### 10.2 Parsing & types

```ts
export interface ComboRow {
  combo: string;                 // 10 digits, LEAF_ORDER positions (README order
                                 // Delta,Theta,Lambda,Xi,Pi,Sigma,Phi,Psi,Gamma2,Gamma1)
  tails: number; circuits: number;
  maxTail: number; maxCircuit: number;
  circuitLengths: number[];      // parsed from "[3, 4, 5]"
  tailLengths: Map<number, number>; // parsed from "{2: 491, 1: 118}"
  edgeSelection: string;         // e.g. '2578'
}
export function parseStatsCsv(raw: string): ComboRow[];
// RFC4180-lite parser (fields with quoted commas) ~40 lines, unit-tested on
// both files (270 rows each). circuit_lengths/tail_lengths are Python literals,
// not JSON: convert with targeted regex (quote dict keys) then JSON.parse.
```

Combo semantics (digit i = index into leaf i's NON-CROSSING matchings, per
the notebook's `filter_non_crossing_combinations` and "the string 1000000000
means the second option for Delta") are implemented once in
`matchings.ts` — `comboToMatchingIndices` / `matchingIndicesToCombo` /
`parseComboShareString` (§3.6); `stats.ts` and `serialize.ts` both consume
that codec, so the stats page, the URL `c=` param, and the CSVs share one
definition.

**Verification task (stage 1 acceptance):** running `analyze` at level 4,
subset `2578`, combo `0000000000` must reproduce lvl4.csv row 1:
`tails=610, circuits=1472, circuit_lengths=[3,4,5], max_tail=3`. If it does
not, the discrepancy is investigated against the notebook before widgets
build on the tracer (see risk §12.1).

---

## 11. Implementation plan

Six stages, each sized for a single agent, each ending with green
`npm run build`, `npm run test:unit`, and lint. Interfaces between stages are
the frozen signatures in §3, §6, §9, §10.

### Stage 1 — Core library + test harness

**Creates:** `web/src/core/*` (all of §3 incl. `serialize.ts`, `stats.ts`,
`analysis.worker.ts`), `web/src/data/lvl4.csv`, `web/src/data/lvl6.csv`,
vitest config + `web/src/core/__tests__/*`, updated `package.json`
(add react deps *later*; this stage adds only vitest + typescript config
changes), ESLint layering rule.
**Acceptance:**
- `enumerateMatchings(n).length === (n-1)!!` for n = 2,4,6,8; order matches a
  fixture captured from old `findPerfectMatchings`.
- Kernel machinery: `validEdgeSubsets('spectre')` == `SPECTRE_VALID_SUBSETS`
  fixture (8 subsets, kernel dim 3); `validEdgeSubsets('hex')` has 16
  elements (dim 4 — pin the exact subsets as a new fixture once computed);
  `bruteForceValidSubsets` agrees with kernel-span for all four families;
  XOR of any two valid subsets is valid (group closure property test).
- Contracts: `DEFAULT_CONTRACTS` reproduces a fixture of old
  `getEdgeDotMidpoints` output for every (family, type, subset) sampled;
  +/− contract points coincide under the mirror rule for arbitrary t;
  class-0 symmetry validation rejects/clamps asymmetric contracts.
- Combo codec: `comboToMatchingIndices` / `matchingIndicesToCombo` round-trip
  for every CSV combo in lvl4.csv; `parseComboShareString('2578-0100101100')`
  round-trips.
- `countTiles(buildSystem('spectre', L).Delta)` == 1, 9, 71, 559, 4401 for
  L = 0..4 (and record L=5,6 values as fixtures).
- Mirroring: leaf transforms at level L have `det < 0` iff L is odd
  (spot-check), and `levelMirror(L)` composed on top restores `det > 0`.
- `parseEdgeLabel` round-trips every label in both tables.
- `curvyOutline`/affine-to-SVG fixtures match old `streamSVG` output numbers.
- **Oracle test:** `analyze` at level 4 / subset 2578 / all-zero non-crossing
  combo reproduces the lvl4.csv row (§10.2); a second row with a `1` digit is
  also checked. If red, file findings in docs/DESIGN.md §12.1 and mark test
  `todo` — widgets may proceed, stats "Open in Explorer" may not.
- `parseStatsCsv` parses 270 rows per file with correct types.
**Must NOT touch:** existing `web/src/*.ts` p5 app (it keeps building),
`web/index.html`, vite config, workflows, `graph_analysis/` originals.

### Stage 2 — Widget layer

**Creates:** `web/src/components/*` (TileView, TilePalette, SeamView,
TilingView, TilingCanvas, PanZoom, CircuitLayer, controls/*),
`hooks/usePointerDrag.ts`, `pages/DevGalleryPage.tsx`, React/Vite wiring
(`main.tsx`, `App.tsx`, `routes.tsx` with only `#/dev`, add react deps +
plugin-react; old p5 entry kept building via its own entry until stage 6).
**Acceptance:** dev gallery demonstrates: hover glow + tooltip on all 4
families; chord-draw gesture incl. touch (Playwright `hasTouch` project),
snap/cancel/keyboard flows per §6.5; palette synced dots; SeamView handshake
with coincident shared dot (incl. a non-default contract, e.g. class 2 at
`2:2@0.60`); dots rendered at contract positions everywhere; TilingView
level 3 with circuits colored per length and chirality-stable level stepping;
TilingCanvas renders level 5; pan/zoom/pinch parity on both renderers; DOM
contract of §6.1 asserted in component tests.
**Must NOT touch:** `core/**` signatures (additive bugfix PRs allowed with
tests), old p5 files, workflows.

### Stage 3 — Explorer

**Creates:** `pages/ExplorerPage.tsx`, `hooks/useExplorerState.ts`,
`hooks/useCircuitAnalysis.ts`, `controls/SharePanel` wiring, route `#/explorer`.
**Acceptance:** every §7.1 control functional; URL round-trip property test
(`decode(encode(s)) deepEquals s` for randomized states, asserting
combo-representable states emit `c=` and exotic ones fall back to `m=`;
contract overrides round-trip via `ct=`); paste of a full URL
reproduces the scene; share panel emits the canonical combination string for
CSV-representable states; worker analysis with cancellation (slider scrubbing at
level 4 stays responsive, verified by Playwright trace); circuit-length chips
zoom to examples; SVG + PNG download produce files matching the on-screen
scene; straight-line overlay chords replicate across all instances.
**Must NOT touch:** core signatures, widget props (additive optional props
only), explainer/stats routes.

### Stage 4 — Tails-problem explainer

**Creates:** `pages/ExplainerPage.tsx` + `pages/explainer/*`
(PuzzleConsole, MatrixExplorer, KernelGallery, ProfileCrossfade), route
`#/tails`, prose transcribed from `docs/EXPLAINER_COPY.md`.
**Acceptance:** all 9 widget slots of §7.2 present and matching the copy's
described behavior; widgets lazy-mount; beat-5 console confettis exactly on
the 7 nonempty valid subsets and tracks explored subsets across reloads;
beat-6 matrix rows XOR correctly against `edgeCountMatrix`; beat-9 crossfade
uses the canonical `2578-0100101100` profile; beat 7 cards deep-link into the
explorer with correct `e=` params; page scores ≥ 90 Lighthouse accessibility;
total route JS < 300 KB gz.
**Must NOT touch:** core, widget internals (may add optional props),
explorer page.

### Stage 5 — Stats page

**Creates:** `pages/StatsPage.tsx` + subcomponents, route `#/stats`,
`comboToMatchingIndices` integration.
**Acceptance:** dataset/subset filtering and sorting over all 270×2 rows with
no jank; detail drawer renders lengths + histogram for every row; deep links
(`?ds&sel&combo`) restore view; "Open in Explorer" produces URLs whose
explorer render matches row stats for at least the oracle rows (else ships
flagged per §7.3); charts readable in light/dark.
**Must NOT touch:** core except `stats.ts`/`matchings.ts` bugfixes with tests;
explorer/explainer.

### Stage 6 — Rebuild cleanup, polish, deploy

**Creates/changes:** delete `sketch.ts`, `ui.ts`, `state.ts`, old `tiles.ts`,
`analysis.ts`, `utils.ts`, `config.ts`; remove p5 + @types/p5; rewrite
`web/index.html` (title, meta/OG tags, favicon); HomePage; rewrite Playwright
e2e (`explorer share-link journey`, `explainer widgets`, `stats filter`);
workflow tweaks (§8.2); 404.html containing a redirect to `/#/` for stray
paths (cosmetic only); responsive/mobile pass; dark mode via
`prefers-color-scheme` tokens.
**Acceptance:** `npm run build` green with zero p5 references
(`grep -r "p5" web/src` empty); bundle report: initial route < 150 KB gz;
all Playwright suites green; deploy from `main` serves the new site at
`/Spectre/` with deep links working.
**Must NOT touch:** core/component/page APIs (bugfixes with tests only),
`graph_analysis/`, `web_orig/`, notebook.

---

## 12. Risks & open questions

1. **CSV combo → matching-index mapping (medium risk, isolated).** The
   notebook indexes combos into *non-crossing* matchings after
   `filter_non_crossing_combinations`; our `nonCrossingMatchingIndices` must
   enumerate options in the same order the notebook did (its
   `generate_valid_combinations` pairs the first available edge with others
   in counts order — plausibly, but not provably, the same order as our
   geometric enumeration). Mitigated by the stage-1 oracle test against
   lvl4.csv; failure mode degrades only the stats page's "Open in Explorer"
   fidelity, which ships flagged until verified.
2. **Circuit tracer rewrite (flagged deliberate divergence).** The old
   `processCircuits` DFS is kept as a test-only reference; the new tracer must
   match it on junction-free inputs and match the CSVs on junction-bearing
   ones. Degree-3 junctions (class-0 vertex points shared by 3 tiles) are the
   known hard case — the notebook's "others" category confirms they exist.
3. **Welding epsilon.** `weldEdges` uses 0.05 world units and `toFixed(3)`
   keys. Transforms are rigid so scale never drifts, but level-6 coordinates
   reach ~10³, where `toFixed(3)` is still safe (millimeter precision on
   kilometer coordinates within float64). Keep both constants; property-test
   welding idempotence at level 6.
4. **`mega_df.csv` absent.** README describes it but only lvl4/lvl6 exist;
   also subset `01235678` (and `''`) have no CSV rows. Stats page copy must
   say "6 of the 8 valid subsets analyzed so far". Question for owner: can
   lvl-N analysis be re-run to add the missing subsets / mega_df?
5. **Combo digit base.** lvl4/lvl6 combos are binary today, but the notebook
   uses digits up to 4 (`'0401001000'`). Parser treats each char as a decimal
   digit, not a bit.
6. **Level-6 UX.** ~273k tiles + worker analysis may take multiple seconds on
   low-end devices. Mitigation: progress reporting from the worker, "level 6
   is heavy" confirm, and analysis caching. If worker transfer of ~1M segment
   floats is slow, move `flatten` into the worker and send only
   `(family, level, subset, matching)` — the core is pure either way.
7. **Old-URL compatibility.** None promised: the p5 site had no URL state, so
   there is nothing to migrate. `v=1` future-proofs the new codec.
8. **Curvy tiles + circuits.** Old app draws circuit chords as straight lines
   even on curvy tiles (chords connect midpoints of the *original* polygon
   edges via `origPts`). Keep identical behavior; connection points always
   derive from straight-edge geometry (contracts included).
9. **Hex family Gamma.** Hex has a single `Gamma` leaf (9 leaf types, one
   6-edge hexagon each) while other families have Gamma1/Gamma2 — `m`/`c`
   param length and slider sets differ by family. Handled by
   `leafOrder(family)`; tests cover both shapes of the vector.
10. **Contract mirror-rule fidelity (new machinery, low blast radius).** The
    `+`/`−` alignment rule (same minor, t → 1−t) and the class-0 symmetry
    constraint are derived from the label semantics, not ported code — if the
    label pairing convention differs for some class (e.g. minors pair
    reversed rather than index-matched on some seam), abutting dots won't
    coincide. SeamView's dev-mode coincidence assertion (§6.3) and the §3.3
    unit test catch this per class; defaults (t = 0.5, class-0 center) are
    immune, so only *custom* contracts are at risk.
11. **Hexagon kernel = 16 (owner-supplied, unverified here).** The kernel-
    span code computes it either way; the stage-1 test initially asserts
    size 16 per the owner's analysis. If `bruteForceValidSubsets('hex')`
    disagrees, trust the brute force (it is the ported legacy behavior),
    update the fixture, and flag the discrepancy to the owner. Same
    procedure for hat/turtle families, whose kernels nobody has stated.
12. **Combo digit order vs slider mapping.** The combo string's per-tile
    digits assume the notebook's non-crossing option ordering; risk 1's
    oracle test covers the stats path, and `matchingIndicesToCombo` (used by
    the share panel/`c=` param) reuses the same codec, so a verified oracle
    validates URL sharing too — they cannot silently diverge.
13. **Question for owner:** should the explorer's "advanced" free edge
    selection (invalid subsets allowed, tails shown) be visible by default,
    or gated behind the explainer's "try to break it" links? Default: visible
    with warning badge.
