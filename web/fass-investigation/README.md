# FASS investigation — selection 1278, combo `0100100000`

Scripts backing `docs/FASS_1278.md`. Everything builds only on the verified
pure-TS core (`web/src/core`) and writes nothing outside this directory.

## Setup

```bash
cd web
npm install          # once; node_modules only
```

## Scripts (run from `web/`)

| # | Command | What it establishes |
|---|---|---|
| 01 | `npx --yes tsx fass-investigation/01-tile-options.ts` | Combo digit semantics under 1278: which tiles have choices; **Psi digit is forced** (1 matching). |
| 02 | `npx --yes tsx fass-investigation/02-combo-census.ts` | All 32 combos at Delta root, levels 2–4; 32/32 exact match vs `graph_analysis/lvl4.csv`; circuit-free ⇔ `Theta≠Lambda ∧ Xi≠Pi ∧ Gamma1=0`. |
| 03 | `npx --yes tsx fass-investigation/03-arc-structure.ts 5` | 4 circuit-free combos, levels 1–5: 4 arcs, 0 circuits/junctions, all 8 endpoints ON the patch boundary; boundary-dot pairing alternates with period 2. |
| 04 | `npx --yes tsx fass-investigation/04-substitution.ts 0100100000 5` | Routing of all 9 supertile types, levels 1–5; **Psi supertile = single arc at every level**; signature(T,3)=signature(T,5) for all T; gluing/outer level-independent (k=2–5); child-in-parent ≡ standalone; explicit composition rule; nested-Delta merge analysis. Also run with the other three circuit-free combos. |
| 05 | `npx --yes tsx fass-investigation/05-self-avoiding.ts 0100100000 Delta 4` | Geometric self-avoidance: zero proper crossings / T-touches / collinear overlaps, max weld degree 2, min clearance 0.607 (tile edge = 1). Also run `Delta 3`, `Delta 5`, `Psi 4`. |
| 06 | `NODE_OPTIONS=--max-old-space-size=12288 npx --yes tsx fass-investigation/06-coverage.ts 0100100000 6` | Space-filling: Psi root = ONE arc carrying 100% of segments and visiting **every** tile, levels 1–6; scaling table; Delta@6 reproduces the CSV lvl6 record row exactly. |
| 07 | `npx --yes tsx fass-investigation/07-render-svg.ts 0100100000 Psi 4` | SVG snapshot (hue gradient along the single line). Pre-rendered: `fass_1278_0100100000_Psi_lvl3.svg`, `..._Psi_lvl4.svg`, `..._Delta_lvl4.svg`. |
| 08 | `npx --yes tsx fass-investigation/08-explorer-link.ts` | Explorer deep links via `encodeExplorerState`, with decode round-trip check. |
| 09 | `npx --yes tsx fass-investigation/09-psi-digit-noop.ts` | Psi digit is a decode no-op; flipping any active digit of the winner creates 62–495 circuits at lvl4. |
| 10 | `npx --yes tsx fass-investigation/10-psi-root-census.ts` | At the Psi root every combo has exactly 1 tail, but only the 4 circuit-free combos are ONE line and nothing else. |

`lib.ts` holds the shared machinery: tagged segment collection (reusing core
`localChords`/`weldSegments`), an index-tracking re-implementation of the core
tracer, patch-outline extraction by edge cancellation, and chirality-stable
canonical labelling of boundary connection points.
