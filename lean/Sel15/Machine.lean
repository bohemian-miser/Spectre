/-
  The state machine on the vertex graph.

  `docs/CIRCUITS_15.md` section 3. The base combination puts one chord across
  every tile corner whose two edges are active, and those chords always meet at a
  shared tiling vertex, so the base strand system is one 3-cycle per active
  vertex. Flipping a four-dot tile swaps its two corner chords for two chords
  running BETWEEN its two vertices, which is a single transposition.

  So the whole system is a machine on the VERTEX GRAPH: nodes are active
  vertices, and every four-dot tile is an edge joining its two vertices. A
  component with `n` nodes in a cycle and `f` of its edges flipped has a strand
  structure that depends on nothing else, and this file computes it.
-/
import Sel15.Basic

namespace Sel15

/-! ## The permutation of a component

A component with `n` nodes owns `3 * n` chord slots: node `v` owns `3v, 3v+1,
3v+2`, one per tile around that vertex. The base permutation is `n` disjoint
3-cycles — the triangles. Flipping edge `e`, which joins node `e` to node
`e+1 mod n`, transposes the two images that leave those nodes along it. -/

/-- `n` disjoint 3-cycles, as a table of images indexed by slot. -/
def baseTable : Nat → List Nat
  | 0 => []
  | n + 1 => baseTable n ++ [3 * n + 1, 3 * n + 2, 3 * n]

/-- Swap the values stored at two positions. Both reads happen before the writes. -/
def swapVals (t : List Nat) (a b : Nat) : List Nat :=
  (t.set a (t.getD b 0)).set b (t.getD a 0)

/-- The table after flipping edges `0, 1, …, f-1`, in that order. -/
def table (n : Nat) : Nat → List Nat
  | 0 => baseTable n
  | f + 1 => swapVals (table n f) (3 * f + 2) (3 * ((f + 1) % n))

/-- The orbit of `start`, walked with a fuel bound. -/
def orbit (t : List Nat) (start : Nat) : Nat → Nat → List Nat
  | 0, _ => []
  | fuel + 1, cur =>
      let nxt := t.getD cur 0
      cur :: (if nxt = start then [] else orbit t start fuel nxt)

/-- `start` is the least element of its own orbit, so it represents that orbit once. -/
def isRep (t : List Nat) (n start : Nat) : Bool :=
  (orbit t start n start).all (fun x => start ≤ x)

/--
The circuit lengths of a component with `n` nodes and `f` flipped edges.

A circuit's length is its number of chords, which is exactly its orbit size.
-/
def cycleLengths (n f : Nat) : List Nat :=
  let t := table n f
  let N := 3 * n
  isort (((List.range N).filter (isRep t N)).map (fun i => (orbit t i N i).length))

/-! ## What the machine does

Five closed computations. The kernel checks each one. -/

theorem machine_lone : cycleLengths 1 0 = [3] := by decide
theorem machine_cycle_0 : cycleLengths 3 0 = [3, 3, 3] := by decide
theorem machine_cycle_1 : cycleLengths 3 1 = [3, 6] := by decide
theorem machine_cycle_2 : cycleLengths 3 2 = [9] := by decide
theorem machine_cycle_3 : cycleLengths 3 3 = [3, 6] := by decide

/-! ## The vocabulary

Which components occur is the one fact the machine cannot supply: it is the
geometric input, verified exactly in `web/sel15-proof/03-vertex-machine.ts` over
all nine substitution roots. Every closed component of the vertex graph is a lone
node, or a 3-cycle whose three edges are decorated `Pi Pi Psi`, `Pi Psi Psi` or
`Psi Psi Psi`. Crucially `Pi Pi Pi` never occurs, which is why flipping Pi alone
still leaves 3-cycles untouched. -/

/-- The four-dot decorations a 3-cycle component is observed to carry. -/
def decorations : List (List Kind) :=
  [[.pi, .pi, .psi], [.pi, .psi, .psi], [.psi, .psi, .psi]]

/-- The same three decorations, each already in `kindRank` order. -/
def decorationsSorted : List (List Kind) := decorations.map isortKinds

def flipCount (d : List Kind) (c : Combo) : Nat :=
  (d.filter (fun k => flipped k c)).length

/-- Every circuit length reachable under one combination string. -/
def vocabulary (c : Combo) : List Nat :=
  dedup (isort (cycleLengths 1 0 ++
    concatAll (decorations.map (fun d => cycleLengths 3 (flipCount d c)))))

theorem vocabulary_base : vocabulary .base = [3] := by decide
theorem vocabulary_flipPsi : vocabulary .flipPsi = [3, 6, 9] := by decide
theorem vocabulary_flipPi : vocabulary .flipPi = [3, 6, 9] := by decide
theorem vocabulary_flipBoth : vocabulary .flipBoth = [3, 6] := by decide

/-- **The vocabulary is fixed and finite.** No combination string reaches a
circuit length outside `{3, 6, 9}`, and nothing here mentions a level. -/
theorem lengths_in_369 :
    allCombos.all (fun c => (vocabulary c).all (fun L => L == 3 || L == 6 || L == 9)) = true := by
  decide

/-- Every reachable length is a multiple of 3. -/
theorem lengths_div_three :
    allCombos.all (fun c => (vocabulary c).all (fun L => L % 3 == 0)) = true := by
  decide

/-- Nine is attained, so the bound is sharp. -/
theorem nine_is_attained : (vocabulary .flipPi).contains 9 = true := by decide

end Sel15
