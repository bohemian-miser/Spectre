/-
  The atlas half of the proof: recompute each cluster's strand structure inside
  Lean, straight from the exact-arithmetic certificate, and check it against the
  state machine.

  This is the independent leg. `Sel15.Machine` derives the vocabulary from the
  component shape and the flip count alone; here the circuits are recomputed from
  the raw cluster graphs, with no machine input, and the two agree.

  Everything is written with Bool-valued tests and plain structural recursion so
  that the Lean kernel can reduce it; `decide` closes every theorem.
-/
import Sel15.Certificate
import Sel15.Machine

namespace Sel15

/-! ## The strand graph of a cluster

Strand-graph vertices are the cluster's shared dots — one per entry of `links`.
Strand-graph edges are the tiles' chords. Every dot is shared by exactly two
tiles and every tile pairs up all of its own dots, so the strand graph is
2-regular and its components are circuits. -/

/-- Index of the link holding `(v, s)`; the list length when it is absent. -/
def dotIdxGo (v s : Nat) : Nat → List (Nat × Nat × Nat × Nat) → Nat
  | i, [] => i
  | i, (a, sa, b, sb) :: rest =>
      if (a == v && sa == s) || (b == v && sb == s) then i else dotIdxGo v s (i + 1) rest

def dotIndex (links : List (Nat × Nat × Nat × Nat)) (v s : Nat) : Nat :=
  dotIdxGo v s 0 links

/-- Every chord of the cluster, as a pair of dot indices. -/
def clusterChords (cl : Cluster) (c : Combo) : List (Nat × Nat) :=
  concatAll ((enum 0 cl.kinds).map (fun p =>
    (chordsOf p.2 c).map (fun pq =>
      (dotIndex cl.links p.1 pq.1, dotIndex cl.links p.1 pq.2))))

/-- The other chord incident to `dot`, given that chord `i` is one of them. -/
def otherAtGo (i dot : Nat) : Nat → List (Nat × Nat) → Nat
  | _, [] => i
  | j, (a, b) :: rest =>
      if !(j == i) && (a == dot || b == dot) then j else otherAtGo i dot (j + 1) rest

def otherChordAt (ch : List (Nat × Nat)) (i dot : Nat) : Nat :=
  otherAtGo i dot 0 ch

/--
Follow the strand. Chord `i` has two half-edges: `2 * i` leaves its second dot
and `2 * i + 1` leaves its first. From a half-edge, arrive on the other chord at
that dot, oriented so the next step leaves that chord's far end.
-/
def nextHalf (ch : List (Nat × Nat)) (h : Nat) : Nat :=
  let i := h / 2
  let e := ch.getD i (0, 0)
  let dot := if h % 2 == 0 then e.2 else e.1
  let j := otherChordAt ch i dot
  let f := ch.getD j (0, 0)
  if f.1 == dot then 2 * j else 2 * j + 1

def halfOrbit (ch : List (Nat × Nat)) (start : Nat) : Nat → Nat → List Nat
  | 0, _ => []
  | fuel + 1, cur =>
      cur :: (if nextHalf ch cur == start then [] else halfOrbit ch start fuel (nextHalf ch cur))

/--
The circuit lengths of a cluster under one combination string.

Each circuit yields two half-edge orbits, one per direction, of equal size, so the
sorted orbit lengths are the circuit lengths doubled and `everyOther` halves them.
-/
def clusterCycleLengths (cl : Cluster) (c : Combo) : List Nat :=
  let ch := clusterChords cl c
  let N := 2 * ch.length
  everyOther (isort
    (((List.range N).filter (fun i => (halfOrbit ch i N i).all (fun x => i ≤ x))).map
      (fun i => (halfOrbit ch i N i).length)))

/-! ## What the machine predicts for the same cluster

A cluster with no four-dot tile is a lone vertex of the vertex graph; one with
three of them is a 3-cycle component, and its flip count is how many of those
three the combination string flips. -/

/-- The cluster's four-dot tiles, sorted, so this is its DECORATION as a multiset. -/
def fourDotKinds (cl : Cluster) : List Kind :=
  isortKinds (cl.kinds.filter (fun k => dotsOf k == 4))

def prediction (cl : Cluster) (c : Combo) : List Nat :=
  let f := fourDotKinds cl
  if f.length == 0 then cycleLengths 1 0 else cycleLengths f.length (flipCount f c)

/-! ## The two legs agree -/

/-- Every cluster is a lone vertex or a 3-cycle component. -/
theorem atlas_shapes :
    atlas.all (fun cl =>
      (fourDotKinds cl).length == 0 || (fourDotKinds cl).length == 3) = true := by
  decide

/-- Each cluster's four-dot decoration is one of the three the machine assumes;
in particular `Pi Pi Pi` never occurs, which is why flipping Pi alone still
leaves 3-cycles untouched. -/
theorem atlas_decorations :
    atlas.all (fun cl =>
      (fourDotKinds cl).length == 0 || decorationsSorted.any (fun d => d == fourDotKinds cl)) = true := by
  decide

theorem no_three_pi :
    atlas.all (fun cl => !(fourDotKinds cl == [Kind.pi, Kind.pi, Kind.pi])) = true := by
  decide

/-- **The state machine is right.** Recomputing each cluster's circuits from the
raw certificate gives exactly what the machine predicts, for all ten clusters and
all four combination strings. -/
theorem atlas_matches_machine :
    atlas.all (fun cl => allCombos.all (fun c =>
      clusterCycleLengths cl c == prediction cl c)) = true := by
  decide

/-- **Every circuit of every cluster has length 3, 6 or 9.** -/
theorem atlas_lengths_in_369 :
    atlas.all (fun cl => allCombos.all (fun c =>
      (clusterCycleLengths cl c).all (fun L => L == 3 || L == 6 || L == 9))) = true := by
  decide

/-- A cluster never carries more than 9 chords, which is the length ceiling. -/
theorem atlas_chords_le_nine :
    atlas.all (fun cl => allCombos.all (fun c => (clusterChords cl c).length ≤ 9)) = true := by
  decide

/-- The chord count is combination-independent: the combo repairs the pairing
inside a tile, never the number of chords. -/
theorem chord_count_combo_free :
    atlas.all (fun cl => allCombos.all (fun c =>
      (clusterChords cl c).length == (clusterChords cl Combo.base).length)) = true := by
  decide

end Sel15
