# Spectre circuits/stats page — verified dataset notes

Dataset: `web/public/data/circuit_stats.json` (283 KB, single file, browser-loadable).
Built 2026-08-03 from `graph_analysis/lvl4.csv` + `graph_analysis/lvl6.csv` (byte-identical
copies live at `web/src/data/`). Every number was independently recomputed from the raw
CSVs and passed two independent verification passes; the build script re-asserts 19
verifier-confirmed facts before writing the file.

## Data dictionary

| Field | Meaning |
|---|---|
| `edge_selection` | Which major edge types are active, e.g. `0136`. Only **6 of the 8 app-valid selections have data** — `''` and `'01235678'` are absent. The JSON separates `meta.edge_selections.app_valid_selections` (from `web/src/core/subsets.ts`, app-level validity) from `selections_in_data` (CSV coverage). Join against the latter. |
| `combo` | 10-character **option-index** string aligned with `ALL_TILE_NAMES = [Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi, Gamma2, Gamma1]` (leftmost digit = Delta). Digit *i* indexes tile *i*'s non-crossing edge-pairing option. **Not binary** (README erratum): 96/270 combos per level contain digits 2–4; the Theta digit in the `023678` family ranges 0–4. Combos per selection enumerate the full cartesian product of per-tile options (64+8+2+32+4+160 = 270 rows per level). |
| `lvl4` / `lvl6` | Supertile expansion depth: N iterations of `buildSupertiles` from `buildSpectreBase()`'s Delta metatile. Both levels contain the identical 270 `(edge_selection, combo)` keys, so depth-4 vs depth-6 pairs are exact. |
| `circuits` / `tails` | Total closed loops / open paths in the configuration's strand graph. |
| `circuit_lengths` | Sorted list of **unique** circuit lengths. Per-length circuit counts are *not* recorded — circuit-length distributions cannot be reconstructed, only the set of lengths plus the total. |
| `tail_lengths` | Full histogram: tail length → count (values sum to `tails`). |
| `max_circuit` / `max_tail` | Longest circuit / tail. `max_circuit == 0` means no circuits at all — a **space-filling-curve candidate** (finite-depth evidence only; keep the "candidate" hedge). |
| **Length unit** | All lengths count **strand segments (graph edges)**: one segment = one strand crossing one tile between two tile-boundary edge midpoints. Not tiles, not vertices (tails of length 1 exist, which rules out vertex counting; for circuits edge-count = vertex-count so circuits are convention-independent). |
| `*_stats.sum_across_combos`, `tail_length_distribution_aggregate` | Pooled across a selection's combos. Combos are **mutually exclusive** alternative configurations of the same region — these are dataset summaries, never properties of a single tiling (no tiling has 4085 circuits under selection `15`). |
| `exemplars` / `records` | Exemplar = first among ties in CSV row order; the `ties` / `holders` arrays enumerate **all** tied configs. |

Provenance: the CSVs + `graph_analysis/README.md` are the source of truth. The generating
code is not in the repo (the notebook never writes these CSVs and its in-repo classifier
could not have produced the length-2 circuits present in the data); semantics were
cross-checked against `Spectre_Patterns.ipynb` cells 6, 8, 29, 39/40, 44.

## Verified headline findings (all CONFIRMED by independent recomputation)

1. **Exactly 4 circuit-free combos — the space-filling-curve candidates — all in selection `1278`**:
   `0010100000`, `0011000000`, `0100100000`, `0101000000`; the set is identical at lvl4 and lvl6.
   At lvl6, `0100100000` is just **4 tails** of lengths {248348, 108864, 1, 1}; its longest tail grew
   4053 → 248348 (×61.3) from lvl4. Rigor note: `1278` activates no edge 0, so every vertex has
   degree ≤ 2 and components are *exactly* paths or cycles — "no circuits" is precise here.
2. **Tail counts depend only on edge selection, never on combo**: constant within every
   (level, selection) group. `2578` is exactly Fibonacci: 610 = F(15) tails at lvl4 →
   10946 = F(21) at lvl6. lvl6/lvl4 tail ratios cluster at φ⁶ ≈ 17.944 (range 17.81–18.02) —
   except `1278`, frozen at **4 tails at both depths** (ratio 1.0).
3. **Finite vs growing circuit vocabularies**: 88/270 configs (32.6%) keep an identical
   circuit-length set from lvl4 to lvl6; 182/270 (67.4%) gain new longer lengths (none *lose* any).
   Selection `15` is the only 100%-frozen selection (4/4 combos; `1278` 27/32, `2578` 57/64,
   others 0/…): per-combo length sets are [3], [3,6], [3,6,9], [3,6,9] — all subsets of {3,6,9},
   identical at both depths, selection max_circuit frozen at 9 while circuit *count* grows ~74×.
   (Nuance: only 2 of the 4 combos individually reach 9.)
4. **Circuit counts scale ×62.0–×139.7 (mean ×74.8, median ×71.3)** across the 266 circuit-bearing
   configs; all the lowest ratios are `1278` combos (~×62); the ×139.7 outlier is
   `023678`/`0401000000`.
5. **Records** (corrected — see below): longest circuit **27621 segments**
   (`023678`/`0311000000`, lvl6; 332 at lvl4, ×83.2; unique holder); longest tail **248348 segments**
   (`1278`/`0100100000`, lvl6; unique holder); most distinct circuit lengths **15, held by SEVEN
   lvl6 configs**: `1278`/{`0010000000`,`0100000000`,`0110000000`} and
   `2578`/{`0000001100`,`0010001100`,`0100001100`,`0110001100`}.
6. **Totals**: 8,315,567 circuits at lvl6 (3,834,233 in the `023678` family) vs 118,244 at lvl4.
7. **Coverage & integrity**: 270 rows per level, identical key sets, zero consistency violations
   across all 540 rows; `023678`:160, `2578`:64, `1278`:32, `0356`:8, `15`:4, `0136`:2.

## Refuted / corrected in review

- **"Most distinct circuit lengths = 15 (`1278`/`0010000000` and `2578`/`0000001100`)" — REFUTED
  as stated.** The value 15 and both named configs are correct, but the draft enumerated only
  2 of **7** tied holders. Fixed: `records.most_distinct_circuit_lengths.holders` now lists all
  seven, and every exemplar/record in the JSON carries a full `ties`/`holders` array.
- README erratum (not a draft error): `combo` is called "a binary string" in
  `graph_analysis/README.md`; digits 0–4 occur. The dataset and this doc say "option-index string".

## Unresolved / caveats (kept as caveats, not findings)

- Per-length circuit multiplicities are unrecoverable (`circuit_lengths` is a unique-length set).
- The schema has no column for branching ("other") components. Harmless for `1278` (degree ≤ 2,
  see above); for selections containing edge 0 it is unverifiable from the repo whether the
  generator counted branched components under tails or dropped them.
- Identical length sets at two depths are evidence, not proof, of a finite vocabulary in the
  infinite tiling; "space-filling-curve candidate" is likewise a finite-depth observation.
- `mega_df.csv` described by the README is absent; lvl4/lvl6.csv share its schema.

## Exemplars worth featuring on the page

| Feature | Config | Hook |
|---|---|---|
| Longest circuit | lvl6 `023678`/`0311000000` | One closed loop of 27,621 segments (×83.2 vs lvl4). |
| Longest tail | lvl6 `1278`/`0100100000` | Circuit-free; a single open strand of 248,348 segments + one of 108,864 + two stubs — the flagship space-filling-curve candidate. |
| Circuit-free quartet | `1278`/{`0010100000`,`0011000000`,`0100100000`,`0101000000`} | Same 4 combos at both depths; strand count frozen at 4 while length explodes ×61. |
| Maximal rigidity | selection `15` (any combo, e.g. `0000000100`) | Only circuits of lengths 3/6/9 at every depth; count grows ~74×, sizes never do. |
| Richest vocabulary | the 7-way tie at 15 distinct lengths | e.g. `2578`/`0000001100` — show all 7 holders. |
| Golden ratio | selection `2578` tails | 610 → 10946 = F(15) → F(21); ratio ≈ φ⁶. |

## Visualization suggestions

1. **Growth scatter (log–log)**: circuits_lvl4 vs circuits_lvl6 per config, colored by
   edge_selection; reference lines at ×62 / ×74.8 / ×139.7. The `1278` band and the `023678`
   outlier pop out immediately.
2. **Frozen-vs-growing split**: stacked bar per selection of combos with stable vs grown
   circuit-length sets (15: 4/4, 1278: 27/32, 2578: 57/64, rest 0) — the 32.6% "finite
   vocabulary" story.
3. **Tail-length histograms** (`tail_lengths` is a complete census): log-x histogram per config;
   for the circuit-free quartet a dramatic two-spike plot (1-segment stubs vs the 10⁵-scale curve).
4. **Records panel**: stat tiles for longest circuit / longest tail / 15-length tie, each opening
   the actual rendered configuration; show all tie holders.
5. **φ⁶ chart**: tail count per selection at lvl4 vs lvl6 with a φ⁶ guide line and the flat
   `1278` exception.
6. **Circuit-length spectrum strips**: for each combo of a selection, a tick per unique length
   on a log axis, lvl4 above lvl6 — new-at-lvl6 ticks highlighted (do **not** draw per-length
   counts; they don't exist in the data).
7. Everywhere: label lengths as "segments", present selection totals as "summed across combos",
   and keep the "candidate" wording for space-filling curves.
