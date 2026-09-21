/-
  The combinatorial core of docs/FASS_THEOREM.md, machine-checked in Lean 4.

  * `FASS.Core`        — tables, direction maps, word claims and their closure theorem, the
                          executable checks C1, C3–C7, the routing operator, and the periodicity
                          lemmas that carry a check over one period to every level.
  * `FASS.DataHex`,
    `FASS.DataSpectre` — generated from the verified pipeline (web/fass-theorem/06-isabelle-data.ts).
  * `FASS.Hex`,
    `FASS.Spectre`     — the closed computations, and the all-levels theorems for the two configurations.

  See lean/README.md for what is and is not covered.
-/
import FASS.Core
import FASS.DataHex
import FASS.DataSpectre
import FASS.Hex
import FASS.Spectre
