/-
  Configuration (A): hex / 128 / 010100000.

  Every `decide +kernel` line is a closed computation that the Lean kernel re-runs on the data
  of FASS.DataHex; every `theorem` after it is the corresponding all-levels statement, obtained
  from the general lemmas of FASS.Core by induction on the level. No `native_decide`: the
  configuration theorems depend on no axiom beyond propext, Classical.choice and Quot.sound.
-/
import FASS.Core
import FASS.DataHex

namespace FASS.Hex
open FASS FASS.DataHex

abbrev T : Tables := tables
abbrev closure : List Claim := closureIter T 5 (seeds T)
abbrev W1 : Words := wordsOf dir1
abbrev L1 : LabWords := labwordsOf lab1

/-! ## C1: structure -/

theorem c1 : c1_ok T = true := by decide +kernel
theorem ct : ctChains T = true := by decide +kernel

/-! ## C2: word claims — closed under substitution, true at level 1, hence at every level -/

theorem validL_T : validLB T = true := by decide +kernel
/-- Sanity check on the data: every level-1 direction word is a list of residues mod 12. -/
theorem validData : validDataB dir1 = true := by decide +kernel
theorem closed : closedSetB T closure = true := by decide +kernel
theorem base_dir : closure.all (holdsB W1) = true := by decide +kernel
theorem base_lab : closure.all (holdsLB 1 L1) = true := by decide +kernel
theorem seeds_in : (seeds T).all (closure.contains ·) = true := by decide +kernel

theorem words_all_levels : ∀ k, ∀ c ∈ closure, holds (iterW T W1 k) c :=
  claims_all_levels T W1 closure ((validLB_iff T).mp validL_T) closed
    (fun c hc => (holdsB_iff W1 c).mp (List.all_eq_true.mp base_dir c hc))

theorem labels_all_levels : ∀ k, ∀ c ∈ closure, holdsL 1 (iterL T L1 k) c :=
  labclaims_all_levels T 1 L1 closure closed
    (fun c hc => (holdsLB_iff 1 L1 c).mp (List.all_eq_true.mp base_lab c hc))

/-- Every glued pair of every parent, at every level: same shape, and +c.m against -c.m. -/
theorem glued_pairs_all_levels :
    ∀ k, ∀ c ∈ seeds T, holds (iterW T W1 k) c ∧ holdsL 1 (iterL T L1 k) c := by
  intro k c hc
  have hin : c ∈ closure := List.contains_iff_mem.mp (List.all_eq_true.mp seeds_in c hc)
  exact ⟨words_all_levels k c hin, labels_all_levels k c hin⟩

/-! ## C3: corner coincidences from the quad chainings -/

/-- The SameCorner relation, computed once; everything else in C3 runs on the literal. -/
theorem sc_eq : sameCorner T = scLit := by decide +kernel
theorem sameCorner_closed : sameCornerClosed T = true := sameCornerClosed_of sc_eq (by decide +kernel)
theorem sameCorner_base : sameCornerBase T corners1 = true := sameCornerBase_of sc_eq (by decide +kernel)

/-- The seeds transferred into Gamma from each of the eight other types, one kernel computation
  each, and their concatenation. -/
theorem tf_1 : transferFrom T scLit 0 1 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_2 : transferFrom T scLit 0 2 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_3 : transferFrom T scLit 0 3 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_4 : transferFrom T scLit 0 4 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_5 : transferFrom T scLit 0 5 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_6 : transferFrom T scLit 0 6 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_7 : transferFrom T scLit 0 7 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem tf_8 : transferFrom T scLit 0 8 = [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)] := by decide +kernel
theorem nonGamma : nonGammaTypes T = [1, 2, 3, 4, 5, 6, 7, 8] := by decide +kernel
theorem gammaOpen : allSlots.all (hasChild T 0) = false := by decide +kernel
theorem ts_eq : transferSeedsWith T scLit 0 = tsLit := by
  unfold transferSeedsWith
  simp only [gammaOpen, nonGamma, Bool.false_eq_true, ite_false, List.map_cons, List.map_nil,
    List.flatten_cons, List.flatten_nil, tf_1, tf_2, tf_3, tf_4, tf_5, tf_6, tf_7, tf_8]
  rfl

theorem c3_0 : c3_okTWith T Q tsLit 0 = true := by decide +kernel
theorem c3_1 : c3_okT T Q scLit 1 = true := by decide +kernel
theorem c3_2 : c3_okT T Q scLit 2 = true := by decide +kernel
theorem c3_3 : c3_okT T Q scLit 3 = true := by decide +kernel
theorem c3_4 : c3_okT T Q scLit 4 = true := by decide +kernel
theorem c3_5 : c3_okT T Q scLit 5 = true := by decide +kernel
theorem c3_6 : c3_okT T Q scLit 6 = true := by decide +kernel
theorem c3_7 : c3_okT T Q scLit 7 = true := by decide +kernel
theorem c3_8 : c3_okT T Q scLit 8 = true := by decide +kernel

theorem c3 : c3_ok T Q = true :=
  c3_ok_of sc_eq (fun T hT => match T, hT with
    | 0, _ => c3_okT_of ts_eq c3_0
    | 1, _ => c3_1
    | 2, _ => c3_2
    | 3, _ => c3_3
    | 4, _ => c3_4
    | 5, _ => c3_5
    | 6, _ => c3_6
    | 7, _ => c3_7
    | 8, _ => c3_8
    | _ + 9, h => absurd h (by omega))

theorem c3l1_0 : c3_okTWith T Q1 tsLit 0 = true := by decide +kernel
theorem c3l1_1 : c3_okT T Q1 scLit 1 = true := by decide +kernel
theorem c3l1_2 : c3_okT T Q1 scLit 2 = true := by decide +kernel
theorem c3l1_3 : c3_okT T Q1 scLit 3 = true := by decide +kernel
theorem c3l1_4 : c3_okT T Q1 scLit 4 = true := by decide +kernel
theorem c3l1_5 : c3_okT T Q1 scLit 5 = true := by decide +kernel
theorem c3l1_6 : c3_okT T Q1 scLit 6 = true := by decide +kernel
theorem c3l1_7 : c3_okT T Q1 scLit 7 = true := by decide +kernel
theorem c3l1_8 : c3_okT T Q1 scLit 8 = true := by decide +kernel

theorem c3_level1 : c3_ok T Q1 = true :=
  c3_ok_of sc_eq (fun T hT => match T, hT with
    | 0, _ => c3_okT_of ts_eq c3l1_0
    | 1, _ => c3l1_1
    | 2, _ => c3l1_2
    | 3, _ => c3l1_3
    | 4, _ => c3l1_4
    | 5, _ => c3l1_5
    | 6, _ => c3l1_6
    | 7, _ => c3l1_7
    | 8, _ => c3l1_8
    | _ + 9, h => absurd h (by omega))

/-! ## C4: the glued children form a disk -/

theorem c4 : c4_ok T = true := by decide +kernel

/-! ## C5: corner angles at every level -/

theorem fl_period : flIter T (flOf dir1) 2 = flOf dir1 := by decide +kernel
theorem angles_0 : anglesOk T (flIter T (flOf dir1) 0) = true := by decide +kernel
theorem angles_1 : anglesOk T (flIter T (flOf dir1) 1) = true := by decide +kernel

theorem angles_all_levels : ∀ k, anglesOk T (flIter T (flOf dir1) k) = true :=
  FASS.angles_all_levels T (flOf dir1) 2 (by decide) fl_period
    (fun i hi => match i, hi with
      | 0, _ => angles_0
      | 1, _ => angles_1)

/-! ## C6: quad points -/

theorem c6 : c6_ok T Q = true := by decide +kernel

/-! ## C7: burial -/

theorem buried_0050 : buried T 8 [0, 0, 5, 0] = true := by decide +kernel
theorem not_buried_005 : buried T 8 [0, 0, 5] = false := by decide +kernel

/-! ## The strands: the routing operator from the level-1 states -/

abbrev X1 : Dots × RState := FASS.state1 dots1 FASS.DataHex.state1

theorem degrees_0 : degreesAllOk T X1.1 X1.2 = true := by decide +kernel
theorem degrees_1 : degreesAllOk T (orbit T X1 1).1 (orbit T X1 1).2 = true := by decide +kernel
theorem orbit_period : orbit T X1 2 = X1 := by decide +kernel
theorem orbit_0 : zeroCircuits X1 = true ∧ psiOneArc X1 = true := by decide +kernel
theorem orbit_1 : zeroCircuits (orbit T X1 1) = true ∧ psiOneArc (orbit T X1 1) = true := by decide +kernel

/-- Zero circuits in every type and a single Psi arc, at every level. -/
theorem routing_all_levels : ∀ k, zeroCircuits (orbit T X1 k) = true ∧ psiOneArc (orbit T X1 k) = true :=
  FASS.routing_all_levels T X1 orbit_period orbit_0 orbit_1

theorem dot_counts_0 : dotCounts X1.1 = [10, 8, 6, 6, 4, 4, 10, 4, 2] := by decide +kernel
theorem dot_counts_1 : dotCounts (orbit T X1 1).1 = [10, 8, 6, 6, 4, 4, 10, 4, 2] := by decide +kernel

/-- The boundary dot counts of every type are the same at every level. -/
theorem dot_counts_all_levels : ∀ k, dotCounts (orbit T X1 k).1 = [10, 8, 6, 6, 4, 4, 10, 4, 2] :=
  dotCounts_all_levels T X1 _ orbit_period dot_counts_0 dot_counts_1

end FASS.Hex
