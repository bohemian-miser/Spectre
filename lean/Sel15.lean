/-
  Selection `15` on the Spectre tilings produces a FIXED, FINITE set of circuits.

  Prose: `docs/CIRCUITS_15.md`.  Exact-arithmetic scripts: `web/sel15-proof/`.

  What this development checks, with the Lean kernel re-running every
  computation:

  * `Sel15.Machine`  — the state machine on the vertex graph, and the four
    vocabularies `[3]`, `[3,6,9]`, `[3,6,9]`, `[3,6]` it forces;
  * `Sel15.Atlas`    — the same answer recomputed from the ten cluster graphs of
    the exact-arithmetic certificate, with no machine input.

  What it does NOT check, because it is geometry rather than combinatorics: that
  the ten clusters are the only ones, i.e. that every closed component of the
  vertex graph is a lone node or a 3-cycle decorated `Pi Pi Psi`, `Pi Psi Psi` or
  `Psi Psi Psi`. That is obligation V6 of the prose document, verified exactly
  over all nine substitution roots but not proved.
-/
import Sel15.Basic
import Sel15.Machine
import Sel15.Certificate
import Sel15.Atlas
