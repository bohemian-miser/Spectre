# fass-theorem

The scripts behind [`docs/FASS_THEOREM.md`](../../docs/FASS_THEOREM.md): the
proof that configurations `hex/128/010100000` and `spectre/1278/0101000000`
generate a FASS curve at every substitution level, with one bi-infinite curve
through a tiling of the plane in the limit.

Run from `web/` with `npx --yes tsx fass-theorem/<script>.ts`; every script
prints pass/fail lines and exits non-zero if any check fails.

| script | argument | establishes |
|---|---|---|
| `01-tables.ts` | `hex` \| `spectre` | the combinatorial substitution: six corners per supertile, meta-edge classes, tables `B` (edge composition), `G` (gluing), `CT` (corners), `Q` (quad points); identical at levels 2–4; writes `tables-<family>.json` |
| `02-closure.ts` | `hex` \| `spectre` | the level-free closure checks C1–C7 that make the induction a theorem |
| `03-strands.ts` | `hex128` \| `spectre1278` \| `flagship` | the boundary-dot datum from the tables, the fixed routing operator, its 2-cycle, zero circuits, Psi one arc |
| `04-stars.ts` | config `[level]` | all vertex stars of all levels (45 hex, 125 spectre), validated against geometry; no chord crossings; separation constants |
| `05-chain.ts` | config `[levels]` | the ancestor chain `0,5,0,0`: contiguous nesting, two-sided growth, burial |
| `06-isabelle-data.ts` | config `[lean]` | emits `lean/FASS/Data*.lean` (with `lean`) for the machine-checked Lean library, or `isabelle/FASS_Data_*.thy` for the Isabelle session |
| `geom.ts` | — | shared exact geometry |

`tables-hex.json` and `tables-spectre.json` are the outputs of `01`, committed
so the later scripts run in seconds.
