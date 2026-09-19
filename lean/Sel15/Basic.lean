/-
  Selection `15` on the Spectre tilings: the combinatorial core.

  This file is deliberately Mathlib-free. Everything is a closed computation on
  `Nat` and `List Nat`, so every theorem downstream is closed by `decide` and the
  Lean kernel re-runs the arithmetic itself.

  Companion prose: `docs/CIRCUITS_15.md`.
-/

namespace Sel15

/-! ## Small list helpers, defined here so nothing is imported -/

def concatAll {α : Type} : List (List α) → List α
  | [] => []
  | l :: ls => l ++ concatAll ls

def ins (x : Nat) : List Nat → List Nat
  | [] => [x]
  | y :: ys => if x ≤ y then x :: y :: ys else y :: ins x ys

/-- Insertion sort; the proofs only ever compare sorted lists. -/
def isort : List Nat → List Nat
  | [] => []
  | x :: xs => ins x (isort xs)

/-- Duplicate removal on a SORTED list. -/
def dedup : List Nat → List Nat
  | [] => []
  | [x] => [x]
  | x :: y :: r => if x = y then dedup (y :: r) else x :: dedup (y :: r)

/-- Keep the 1st, 3rd, 5th, … element. Used to halve a doubled multiset. -/
def everyOther : List Nat → List Nat
  | [] => []
  | [x] => [x]
  | x :: _ :: r => x :: everyOther r

def enum (i : Nat) : List α → List (Nat × α)
  | [] => []
  | a :: as => (i, a) :: enum (i + 1) as

/-! ## Tile kinds, combination strings, and the chord rule

Under selection `15` a Spectre leaf tile carries 0, 2 or 4 active dots. The
zero-dot types (Theta, Gamma2) never carry a chord and are dropped. The six
two-dot types behave identically, so they are collapsed into one kind. Pi and
Psi are the two four-dot types, and each has exactly two non-crossing options,
which is why there are exactly four combination strings. -/

inductive Kind
  | two
  | pi
  | psi
  deriving DecidableEq, Repr

inductive Combo
  | base      -- 0000000000
  | flipPsi   -- 0000000100
  | flipPi    -- 0000100000
  | flipBoth  -- 0000100100
  deriving DecidableEq, Repr

def allCombos : List Combo := [.base, .flipPsi, .flipPi, .flipBoth]

/-- Does this combination string take the four-dot tile's SECOND option? -/
def flipped : Kind → Combo → Bool
  | .pi, .flipPi => true
  | .pi, .flipBoth => true
  | .psi, .flipPsi => true
  | .psi, .flipBoth => true
  | _, _ => false

/--
Chords of a tile, as pairs of indices into its active dots in cyclic order.

A two-dot tile has one chord joining its two dots. A four-dot tile's dots are
listed `(-1, +5, -5, +1)` for Pi and `(-1, +5, -5, +5B)` for Psi; option 0 pairs
them `(0,1)(2,3)`, which are its two CORNER CUTS, and option 1 pairs them
`(0,3)(1,2)`, the two long chords. This matches
`web/sel15-proof/atlas.json` exactly.
-/
def chordsOf : Kind → Combo → List (Nat × Nat)
  | .two, _ => [(0, 1)]
  | k, c => if flipped k c then [(0, 3), (1, 2)] else [(0, 1), (2, 3)]

def dotsOf : Kind → Nat
  | .two => 2
  | _ => 4

/-- A total order on kinds, so a decoration can be compared as a multiset. -/
def kindRank : Kind → Nat
  | .two => 0
  | .pi => 1
  | .psi => 2

def insKind (x : Kind) : List Kind → List Kind
  | [] => [x]
  | y :: ys => if kindRank x ≤ kindRank y then x :: y :: ys else y :: insKind x ys

def isortKinds : List Kind → List Kind
  | [] => []
  | x :: xs => insKind x (isortKinds xs)

end Sel15
