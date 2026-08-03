# Big-Map Investigation: level-9 Spectre tilings in the browser

Status: feasibility investigation with working, verified spikes.
Scope: can the site generate, render, pan and zoom a level-9 spectre patch
(~133 million tiles) **including the circuit/tail strand overlays**, and in
what form? All numbers below were measured on this machine (4-core Intel Xeon
@ 2.80 GHz, 15 GB RAM, node v22.22.2, headless Chromium 1194 via Playwright —
**no GPU: WebGL runs on SwiftShader software rasterization**, so every GPU
number here is a hard lower bound for real hardware).

Spike code lives in `web/spike/` (self-contained, imports only `web/src/core`).
Nothing under `web/src/` was modified.

| Spike | File | Command (from `web/`) |
|---|---|---|
| Scale math | `spike/scale-math.ts` | `node --expose-gc --import tsx spike/scale-math.ts` |
| Lazy expansion | `spike/lazy-gen.ts` | `npx tsx spike/lazy-gen.ts [--emit]` |
| Parallel expansion | `spike/lazy-gen-parallel.ts` (+ `lazy-gen-worker.ts`) | `npx tsx spike/lazy-gen-parallel.ts` |
| WebGL2 instancing | `spike/webgl-instanced.html` + `spike/run-webgl-bench.ts` | `npx tsx spike/run-webgl-bench.ts` |
| WebGL zoom proof | `spike/screenshot-zoom.ts` (writes `spike/webgl-zoom.png`) | `npx tsx spike/screenshot-zoom.ts` |
| Canvas2D fallback | `spike/canvas2d.html` + `spike/run-canvas-bench.ts` | `npx tsx spike/run-canvas-bench.ts` |
| Hierarchical strand router | `spike/router.ts` | (library) |
| Router oracle verification | `spike/verify-router.ts` | `npx tsx spike/verify-router.ts` |
| Router class-0 lvl5 checks | `spike/verify-lvl5-class0.ts` | `npx tsx spike/verify-lvl5-class0.ts` |
| Junction semantics tests | `spike/junction-unit.ts` | `npx tsx spike/junction-unit.ts` |
| Junction search | `spike/find-junctions.ts` | `npx tsx spike/find-junctions.ts` |
| Router at lvl7–9 | `spike/router-bench.ts` | `node --expose-gc --import tsx spike/router-bench.ts` |

---

## 1. Scale math: what level 9 actually is

Exact counts from the substitution DAG (memoized `countTiles`, cross-checked
against core's naive `countTiles` for lvl 0–6):

| level | tiles (Delta root) | growth |
|---|---|---|
| 4 | 4 401 | ×7.8730 |
| 5 | 34 649 | ×7.8730 |
| 6 | 272 791 | ×7.8730 |
| 7 | **2 147 679** | ×7.8730 |
| 8 | **16 908 641** | ×7.8730 |
| 9 | **133 121 449** | ×7.8730 |

The growth ratio converges to 7.87302 (dominant eigenvalue of the
substitution matrix). The lvl9 patch spans ~49 000 × 61 500 world units
(tile edge = 1).

Memory per tile, **measured**:

- Full `TileInstance[]` from `flatten()` (object + 6-tuple + id string):
  **171–190 B/tile** (46.6 MB heap for lvl6's 272 791 tiles).
  At lvl9 that is **~23 GB — full materialization is out by ~2 orders of
  magnitude** vs a realistic 1–2 GB browser heap budget.
- Compact typed arrays. Every transform in the system was verified to be
  `mirror^m · rot(k·30°) + (tx,ty)` (checked for all 272 791 lvl6 instances),
  so a tile is exactly `x:f32, y:f32, code:u8 (rot 0..11 | mirror<<4),
  type:u8` = **10 B/tile**:
  - lvl7: 21 MB (fits easily)
  - lvl8: 169 MB (fits, uncomfortably)
  - lvl9: **1.33 GB — does not usefully fit**, and `flatten()` at the
    measured 1.9 M tiles/s would take ~70 s to produce it.

Conclusion: lvl9 must never be materialized. The substitution DAG itself is
tiny (`buildSystem('spectre', 9)` = **8 ms**, a few hundred shared nodes), so
everything must be derived lazily from it. lvl7 *could* be fully materialized
in compact form, but the same lazy machinery covers it for free.

## 2. Lazy viewport expansion — the hierarchy IS the LOD tree

`spike/lazy-gen.ts` walks the shared DAG with per-node cached local bounding
boxes (a `WeakMap`; cache warm-up for the *entire* lvl9 DAG is **6 ms**
because there are only ~9 nodes per level). Given a camera and a tile budget
it picks a **cut level** `c` — instances emitted at level `c` are supertile
aggregates; each level up divides instance count by 7.873 — then DFS-culls by
bbox and emits 10 B/instance typed arrays.

Measured on the lvl9 root (budget 1.2 M, best of 3, single thread):

| view | cut | instances emitted | time | throughput |
|---|---|---|---|---|
| deep zoom (~12k tiles visible) | 0 | 12 414 | 11.9 ms | 1.0 M/s |
| mid zoom (~120k) | 0 | 123 218 | 57.6 ms | 2.1 M/s |
| wide zoom (~1M) | 0 | 1 001 438 | 373 ms | 2.7 M/s |
| huge zoom (~8M estimated) | 1 | 905 579 | 338 ms | 2.7 M/s |
| whole patch (~469M estimated) | 3 | 242 047 | 84 ms | 2.9 M/s |

- Steady-state throughput is **~2–2.9 M instances/s single-threaded**; a
  full 1M-instance viewport rebuild costs ~300–370 ms, and small camera moves
  can expand only newly-exposed regions (the DFS is cheap to restrict).
- The emitted encoding is verified by a numeric round-trip check
  (reconstruct `R(θ)·S + t` from the 10 bytes, compare all 6 matrix entries
  against the true composed transform: max |err| 7.6e-6 over 12 414
  instances). This check caught two real bugs during the spike — the mirrored
  angle decomposition (θ = atan2(−T[3], −T[0]) when det < 0) and the Gamma
  composite needing recursion at cut level 0 — both are must-have tests for
  the production codec.
- Worker parallelism (`spike/lazy-gen-parallel.ts`, node `worker_threads`
  over depth-2 subtrees, budget-sized buffers allocated once): 4 workers
  reach **3.0 M inst/s** on the critical path (vs 2.6 M single-thread on this
  4-vcpu box). Scaling is weak because depth-2 task granularity is coarse —
  production should split at depth 3–4 (~500–4000 tasks) — but the expansion
  is embarrassingly parallel and workers are long-lived in the browser plan
  (spawn cost here, ~200 ms, is one-time).
- LOD policy works as designed: the cut level rises exactly when the
  estimated visible count exceeds budget, and emitted aggregate instances
  carry `type=255` + the supertile transform, ready to be drawn as canned
  supertile glyphs (see §3).

## 3. Rendering: WebGL2 instanced is the answer

`spike/webgl-instanced.html` is a standalone page (no React, no libraries):
ONE spectre outline (14 vertices, ear-clipped once into 12 triangles) drawn
with `drawElementsInstanced`, plus an optional second instanced `LINE_LOOP`
pass for outlines. Per-instance data is exactly the 10 B wire format from §2
(fetched as `tiles.bin`: ~1.1–1.25 M REAL lvl9 tiles emitted by
`spike/lazy-gen.ts --emit`). The vertex shader decodes rot/mirror and applies
the camera; pan/zoom is a uniform update — **zero per-frame CPU geometry
work**. Draw-call structure: **2 draw calls total** (fill + outline) for any
instance count; per-type coloring via a palette uniform indexed by the
per-instance type byte.

**Measured, headless Chromium 141, renderer string
`ANGLE (Vulkan 1.3.0, SwiftShader Device (Subzero))` — pure software
rasterization on 4 vcpus.** Camera animating (pan + zoom breathing),
1280×800, antialias off. This machine has NO GPU, so these are a
correctness/scaling measurement and an extreme lower bound, not a
representative FPS claim:

| instances | outline pass | avg ms/frame | fps (SwiftShader) |
|---|---|---|---|
| 50 000 | yes | 1 300 | 0.77 |
| 100 000 | yes | 2 567 | 0.39 |
| 250 000 | yes | 6 334 | 0.16 |
| 500 000 | yes | 12 279 | 0.08 |
| 1 112 286 (all) | yes | 24 622 | 0.04 |
| 250 000 | no | 3 386 (p50) | 0.30 |
| 1 112 286 (all) | no | 11 455 avg / 17 475 p50 | 0.06–0.09 |

Two readings matter more than the absolute numbers:

1. **Scaling is perfectly linear in instance count** (26 µs/instance with
   outlines, ~13.5 µs without, at every tier) — the CPU/JS side contributes
   nothing measurable. The renderer really is 2 draw calls with O(1)
   per-frame JS; all cost is rasterization, which is exactly the part a real
   GPU does 2–3 orders of magnitude faster.
2. The instanced `LINE_LOOP` outline pass **doubles** software cost.
   Production should fold outlines into the fill pass (edge-distance in the
   fragment shader) — one draw call, no line rasterization.

Zoom-in screenshot (`spike/webgl-zoom.png`) confirms tiles interlock
seamlessly — the 10-byte rot/mirror/type decode in the vertex shader is
geometrically correct; `spike/webgl-bench.png` shows the full ~1.1M-tile
patch. (The FPS tiers above were measured before the encode fix described in
§2 re-emitted `tiles.bin` with 1 253 246 instances — per-instance cost is
what was measured and is unaffected.)

Canvas2D fallback (`spike/canvas2d.html`, one shared `Path2D`,
`setTransform` + `fill` per tile — same data, same machine, Skia software):

| tiles | outline | avg ms/frame | fps |
|---|---|---|---|
| 25 000 | yes | 27.8 | 35.9 |
| 50 000 | yes | 61.3 | 16.3 |
| 100 000 | yes | 103.7 | 9.6 |
| 250 000 | yes | 258.3 | 3.9 |
| 25 000 | no | 25.9 | 38.6 |
| 250 000 | no | 274.1 | 3.6 |

Takeaways:

- On a machine with NO GPU, Skia's optimized Canvas2D software path
  (~1 µs/tile, ~1 M path-fills/s) beats full GL emulation by ~13–26× —
  so Canvas2D is the correct *no-WebGL fallback*, good for ~25–50k tiles at
  interactive rates (which is exactly today's lvl5 experience).
- On real GPUs the instanced pipeline is the winner by construction
  (per-instance decode on GPU, O(1) JS, 1–2 draw calls). Extrapolation —
  clearly labeled as such, to be validated on hardware in stage 1: 1M
  instances = 12M small triangles + 10 B/instance fetch, which mid-range
  integrated GPUs (Iris Xe / Apple M) rasterize at 30–60+ fps; SwiftShader's
  own linearity shows there is no CPU-side wall before that.
- Realistic production budget: **250k–1M on-screen instances** on
  GPU-backed clients (subject to stage-1 hardware validation), ~25–50k on
  the Canvas2D fallback. Crucially the §2 LOD cut makes the architecture
  insensitive to the exact number — a lower budget just raises the cut
  level; the map stays pannable either way.
- raw WebGL2 vs regl/twgl: the entire renderer is ~150 lines of raw WebGL2
  (this spike); a wrapper buys nothing here — there are 2 pipelines and 4
  buffers. Recommendation: **raw WebGL2**, wrapped in a small typed module.
- WebGPU: nice-to-have, not needed. Instanced triangles are the best-case
  workload for WebGL2; WebGPU adds compute (could move expansion on-GPU) but
  costs support breadth (Chrome/Edge stable, Safari only since 26, Firefox
  still rolling out on some platforms as of early 2026). Skip for now.
- Aggregate (far-LOD) drawing: emitted aggregates should be rendered as
  instanced *supertile glyphs*: per type, a triangulated, decimated
  level-J boundary outline (the true fractal outline converges per level, so
  a J=3..4 glyph scaled by 2.806^(c−J) with the parity mirror `R^(c−J)` is
  visually exact below ~1 px/tile). The boundary chains needed for these
  glyphs are already computed hierarchically by the router's `boundaryOf`
  (57 318 edges for a lvl6 supertile, φ³≈4.236 growth per level — decimate
  to a few hundred points at far zoom).

## 4. Circuits at scale — the hierarchical strand router (validated)

**Hypothesis** (from the task): because every instance of a level-k supertile
is a rigid transform of ONE shared `TileNode` and the matching rule is
uniform per leaf type, strand topology through a level-k supertile is a pure
function of `(type, k)` — a boundary-to-boundary routing map computable once
per `(type, k)` by recursion, without materializing interior tiles.

**Status: CONFIRMED, exactly, against the site's own `analyze()`.**

### 4.1 How the prototype works (`spike/router.ts`, ~450 lines)

Per shared node (cached in a `Map<TileNode, Summary>`), the router keeps:

- **ports**: strand endpoints on the supertile's outer boundary (seam
  midpoints waiting for their glued partner, class-0 vertex points that may
  still gain a 3rd end, and boundary junction shells);
- **live chains**: port-to-port strand runs with exact segment lengths;
- **finalized tallies**: circuits-by-length, tails-by-length, junction count.

The recursion lifts the (shared) child summaries through the child
transforms, welds coincident ports with the same ε=0.05 sweep as
`weldSegments`, and resolves every welded group with `tracePaths` semantics:
interior degree-2 points merge chains (same chain on both ends ⇒ a circuit
closes), interior degree-1 points end tails, degree-≥3 points are junctions
that break chains — with the one subtle rule copied from `tracePaths` that a
chain leaving and returning to the *same* junction is a closed circuit.
Junction identities are re-keyed per child instance (a shared summary's
junction ids would otherwise collide across sibling instances).

The one non-local question — "can this point still receive another strand
end later?" — is exactly "is it on the supertile union's outer boundary?",
and the boundary is itself computed hierarchically by edge cancellation
(an edge appearing in two children is interior; `boundaryOf`, also cached
per node). Quantized numeric keys are injective for patch spans < 67 108
units; lvl9 spans ~61 500 (safe), lvl10 would need rebasing.

### 4.2 Verification (the actual evidence)

`spike/verify-router.ts` — **49/49 configurations match `analyze()`
exactly**: total circuit count, full circuits-by-length histogram, total
tail count, full tails-by-length histogram, and junction count, across:

- levels 2, 3, 4 × all 6 subsets with CSV data (`15, 0136, 0356, 1278,
  2578, 023678`) × 2–3 combos each (including the CSV-verified
  `2578/0100101100`, `2578/0111001100`, `023678/0001000010`,
  `023678/1410001000`);
- other roots: `Gamma` (the Mystic pair) and `Xi` at lvl3;
- an INVALID subset (`{2}`) at lvl2/3 — tile-granularity tails reproduce;
- lvl5 spot checks (34 649 tiles): `2578/0100101100` and
  `023678/0001000010`.

Plus `spike/verify-lvl5-class0.ts` (3/3 PASS): class-0 subsets — whose
vertex connection points exercise the boundary-liveness logic hardest — at
lvl5 (`0356`, `0136`) and a lvl4 `Gamma`-rooted `0356` run. **Total: 54/54
oracle comparisons pass with exact histogram equality.**

`spike/router-bench.ts` extends the oracle cross-check to **lvl6 (272 791
tiles): PASS for both tested configs** — and the router is 10–25× faster
than `analyze()` there (852 ms vs 8 115 ms; 253 ms vs 6 101 ms). The lvl6
`2578/0100101100` numbers additionally match the notebook-generated
`graph_analysis/lvl6.csv` row exactly (tails 10 946 — including its lone
31 019-segment monster tail — circuits 11 560, all of length 3): three
independent implementations agree.

Junction rules: no spectre configuration produces welded junctions at all —
`spike/find-junctions.ts` scanned 235 random configurations (including
crossing matchings and the full `01235678` subset) and found **zero**
degree-≥3 weld points; the η (class-0) vertex always ends up degree 2
because η-seams glue pairwise. The junction machinery is therefore verified
synthetically (`spike/junction-unit.ts`): 6/6 hand-built junction topologies
(Y, loop+stem, theta, figure-eight, cycles, chains) match `tracePaths`.
This also *simplifies* production: for the spectre family the router can
assume junction-free graphs (keep the junction path for safety).

Where it could have broken, and didn't:

- **the mirror flip on odd levels**: child transforms embed the reflection
  R; summaries live in node-local frames and welding is isometry-invariant,
  so parity needs no special handling (verified by lvl2 vs lvl3 vs lvl4 all
  passing);
- **Gamma pair**: the base-level `Gamma` meta (Gamma1+Gamma2, class-7
  Mystic seams welded inside it) is handled by the same generic recursion
  (verified with `Gamma` as root);
- **boundary tails**: root finalization resolves all remaining ports with
  an empty boundary set — reproduces `analyze()`'s boundary tails exactly.

### 4.3 Level 7–9 results (router only — nothing else can go there)

Exact global circuit censuses of patches that can never be materialized,
single-threaded, fresh caches (`spike/router-bench.ts`):

| config | level | time | RSS | ports | circuits (total) | tails |
|---|---|---|---|---|---|---|
| 2578 / 0100101100 | 7 | 5.6 s | +0.31 GB | 92 736 | 95 706 (all length 3) | 46 368 |
| 2578 / 0100101100 | 8 | 33 s | +1.5 GB | 392 836 | 773 392 | 196 418 |
| 2578 / 0100101100 | 9 | 173 s | +5.2 GB | 1 664 080 | **6 173 216** | 832 040 |
| 023678 / 0001000010 | 7 | 1.1 s | +7 MB | 28 662 | 210 760 (12 lengths) | 14 331 |
| 023678 / 0001000010 | 8 | 4.3 s | +66 MB | 121 396 | 1 669 665 | 60 698 |
| 023678 / 0001000010 | 9 | **20.6 s** | **+0.39 GB** | 514 234 | **13 189 247** (16 lengths, up to 8 000+ segments) | 257 117 |

(Delightful aside: the lvl9 `2578` tallies are full of Fibonacci numbers —
832 040 = F₃₀ total tails, 46 368 = F₂₄ of them of length 6, 28 657 = F₂₃ of
length 15, ports = 2·F₃₀ — the φ³ boundary growth leaking through.)

Scaling behaviour: ports/chains grow with the *boundary*, ×φ³ ≈ 4.236 per
level (boundary edges: 57 318 at lvl6 → 4 356 622 at lvl9), while tiles grow
×7.873 — that is the exponential collapse that makes lvl9 circuits
computable at all. The dense config (2578) is heavier purely because of
per-port JS object overhead in the prototype; a typed-array port/chain
representation (structure-of-arrays, like the oracle's weld) is a
straightforward 5–10× memory/time win and would put even the dense lvl9
census near ~30 s / <1 GB — browser-worker viable (and it is a build-once,
cache-forever artifact per configuration).

### 4.4 What the router gives the UI

- **Global, exact circuit-length statistics at lvl9 per configuration** —
  the stats page story ("which configs are all-circuits, what lengths
  exist") extends from lvl6 CSVs to lvl9 without approximation.
- **Length-stable coloring**: color-by-circuit-length (the current site's
  scheme) needs only the local trace of the visible region *plus* the global
  length of chains that exit the viewport. The router's cached per-(type,k)
  chains are exactly the lookup table for that: resolving one on-screen
  strand's global circuit walks up the enclosing supertiles (≤ 9 hops),
  following port welds — O(boundary crossings) per query, no interior
  expansion. This query path is designed but NOT prototyped; counts/lengths
  (the hard part — global identity resolution) are what was verified.
- **Stable global circuit ids** are derivable as (node path of the level
  where the circuit closed, index within that node's finalized tally) —
  cheap and canonical, since every circuit closes at exactly one DAG node.

## 5. Recommended architecture

```
main thread    UI/React shell, WebGL2 canvas, camera controller
               (2 draw calls/frame; camera = uniform update)
   ▲   10 B/instance typed arrays (transferables)
   │
worker pool    "expander" workers: shared substitution DAG (8 ms to build),
(2–4 workers)  bbox-culled DFS from lvl9 root, cut-level LOD policy,
               ~2–3 M inst/s aggregate; incremental per camera delta
   │
   │           "router" worker: hierarchical strand summaries per
   │           configuration (Map<TileNode,Summary>), lvl9 census 20 s–3 min
   │           today (typed-array port graphs → target <30 s), cached per
   │           (subset, matching vector); serves (a) global stats,
   │           (b) strand-length lookups for viewport chains
   ▼
strand layer   per-viewport: collectSegments+weld+trace on visible tiles only
               (measured: 34 649 tiles ≈ 0.55 s, 272 791 ≈ 6–8 s in core's
               object code; typed-array port of the same ≈ 5–10× faster),
               drawn as a second instanced pass (segments = instanced quads)
```

- **Data flow**: expansion workers own the DAG and post compact typed arrays
  (transferables, zero-copy). SharedArrayBuffer is optional (needs COOP/COEP
  headers on GitHub Pages — a `<meta>` cannot set them, so plain
  transferables are the default plan; 11 MB/1.1M instances is a few ms).
- **LOD policy**: budget-driven cut level (§2), hysteresis between levels,
  aggregates drawn as decimated supertile-outline glyphs (§3); tiles get
  outlines+dots only below a few thousand on screen (as today).
- **Circuits UX at lvl9, honestly achievable**: full-plane pan/zoom with
  per-viewport strand detail at cut 0 (≤ ~150k visible tiles ⇒ strand trace
  ~1–3 s in a worker, veiled+cached per region), aggregate strand *density*
  or nothing at far LOD, exact global stats and length-colored strands
  everywhere. NOT honestly achievable: per-strand hover on 6M+ circuits at
  far zoom (nothing to hover — circuits are subpixel), or instant (<100 ms)
  first-time strand overlays for a brand-new configuration at lvl9 (the
  census is a ~30 s background build; cache it).

### Staged plan (each stage lands green and useful on its own)

1. **BigMap page skeleton** — WebGL2 instanced renderer + camera + one
   expansion worker, tiles only, lvl ≤ 7. Reuses spike code nearly verbatim.
   *~1 week.*
2. **LOD aggregates** — cut-level policy + supertile glyph meshes (boundary
   chaining + decimation + ear-clip already half-done in spikes), full lvl9
   pan/zoom. *~1 week.*
3. **Strand overlay, viewport-local** — typed-array collect/weld/trace in a
   worker for the visible region; instanced segment rendering; length colors
   from the router census when available, local lengths otherwise. *~1–1.5
   weeks.*
4. **Router productionization** — typed-array port graphs, census cache
   (IndexedDB), stats-page integration (lvl9 stats per configuration),
   global length lookup for viewport-exiting chains. *~1.5–2 weeks.*
5. **Polish** — hover/deep-links at near zoom, progressive refinement,
   Safari/mobile passes, perf hysteresis. *~1 week.*

Total: roughly 5–6.5 agent-weeks, with stages 1–2 alone already delivering a
pannable lvl9 map.

## 6. Verdict

**Yes — a pannable, zoomable level-9 map with circuit overlays is feasible**,
in the form: instanced WebGL2 tiles under a budgeted LOD cut (the
substitution hierarchy is the LOD tree), viewport-local strand geometry, and
globally exact circuit statistics/lengths from the hierarchical router. The
two load-bearing claims were both verified by working code on this machine:
lazy expansion sustains millions of instances/s against the lvl9 DAG, and
the transfer-matrix routing hypothesis holds **exactly** (54/54 oracle
configs at lvl2–5, 2/2 at lvl6 — one of them also matching the notebook CSV
— junction semantics 6/6 synthetically) — collapsing lvl9 circuit analysis
from an impossible 133M-tile weld to a 20-second boundary recursion.
