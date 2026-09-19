/-
  Selection `15` on the Spectre tilings produces a FIXED, FINITE set of circuits.

  Prose: `docs/CIRCUITS_15.md`.  Exact-arithmetic scripts: `web/sel15-proof/`.

  What this development checks, with the Lean kernel re-running every
  computation:

  * `Sel15.Machine`  — the state machine on the vertex graph, and the four
    vocabularies `[3]`, `[3,6,9]`, `[3,6,9]`, `[3,6]` it forces;
  * `Sel15.Atlas`    — the same answer recomputed from the ten cluster graphs of
    the exact-arithmetic certificate, with no machine input.

  What it does NOT check, because it is geometry rather than combinatorics:

  * **V0b** — that a shared class-1 or class-5 physical edge always carries
    `+k.m` against `-k.m`. The length-3 bound consumes this. It is checked over
    947,142 interior dots and NOT derived.
  * **V6** — that the ten clusters here are the only ones, i.e. that every closed
    component of the vertex graph is a lone node or a 3-cycle decorated
    `Pi Pi Psi`, `Pi Psi Psi` or `Psi Psi Psi`. Checked over all nine
    substitution roots and again on 320 windows of 80 other tilings, and NOT
    derived.

  Both are hypotheses here. So this development removes arithmetic and
  bookkeeping error from the combinatorial step, twice, by two different
  traversals — and nothing more. Anyone who doubts the result should doubt it at
  V0b and V6, which are prose-document obligations, not at anything below.

  A note on independence: `Machine` and `Atlas` agree, but the machine's slot
  incidence was written by hand and validated against the atlas, so the machine
  is a reformulation of the atlas rather than a second derivation of it. The two
  TRAVERSALS are genuinely independent; the two MODELS are not.
-/
import Sel15.Basic
import Sel15.Machine
import Sel15.Certificate
import Sel15.Atlas
