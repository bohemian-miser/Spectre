/-
  Configuration (B): spectre / 1278 / 0101000000.

  Every `decide`/`native_decide` line is a closed computation the kernel (or the compiled code
  it trusts, for `native_decide`) re-runs on the data of FASS.DataSpectre; every `theorem` after
  it is the corresponding all-levels statement, obtained from the general lemmas of FASS.Core
  by induction on the level.
-/
import FASS.Core
import FASS.DataSpectre

namespace FASS.Spectre
open FASS FASS.DataSpectre

abbrev T : Tables := tables
abbrev closure : List Claim := closureIter T 5 (seeds T)
abbrev W1 : Words := wordsOf dir1
abbrev L1 : LabWords := labwordsOf lab1

/-! ## C1: structure -/

theorem c1 : c1_ok T = true := by native_decide
theorem ct : ctChains T = true := by native_decide

/-! ## C2: word claims — closed under substitution, true at level 1, hence at every level -/

theorem validL_T : validLB T = true := by native_decide
/-- Sanity check on the data: every level-1 direction word is a list of residues mod 12. -/
theorem validData : validDataB dir1 = true := by native_decide
theorem closed : closedSetB T closure = true := by native_decide
theorem base_dir : closure.all (holdsB W1) = true := by native_decide
theorem base_lab : closure.all (holdsLB 2 L1) = true := by native_decide
theorem seeds_in : (seeds T).all (closure.contains ·) = true := by native_decide

theorem words_all_levels : ∀ k, ∀ c ∈ closure, holds (iterW T W1 k) c :=
  claims_all_levels T W1 closure ((validLB_iff T).mp validL_T) closed
    (fun c hc => (holdsB_iff W1 c).mp (List.all_eq_true.mp base_dir c hc))

theorem labels_all_levels : ∀ k, ∀ c ∈ closure, holdsL 2 (iterL T L1 k) c :=
  labclaims_all_levels T 2 L1 closure closed
    (fun c hc => (holdsLB_iff 2 L1 c).mp (List.all_eq_true.mp base_lab c hc))

/-- Every glued pair of every parent, at every level: same shape, and +c.m against -c.m. -/
theorem glued_pairs_all_levels :
    ∀ k, ∀ c ∈ seeds T, holds (iterW T W1 k) c ∧ holdsL 2 (iterL T L1 k) c := by
  intro k c hc
  have hin : c ∈ closure := List.contains_iff_mem.mp (List.all_eq_true.mp seeds_in c hc)
  exact ⟨words_all_levels k c hin, labels_all_levels k c hin⟩

/-! ## C3: corner coincidences from the quad chainings -/

theorem sameCorner_closed : sameCornerClosed T = true := by native_decide
theorem sameCorner_base : sameCornerBase T corners1 = true := by native_decide
theorem c3 : c3_ok T Q = true := by native_decide
theorem c3_level1 : c3_ok T Q1 = true := by native_decide

/-! ## C4: the glued children form a disk -/

theorem c4 : c4_ok T = true := by native_decide

/-! ## C5: corner angles at every level -/

theorem fl_period : flIter T (flOf dir1) 2 = flOf dir1 := by native_decide
theorem angles_0 : anglesOk T (flIter T (flOf dir1) 0) = true := by native_decide
theorem angles_1 : anglesOk T (flIter T (flOf dir1) 1) = true := by native_decide

theorem angles_all_levels : ∀ k, anglesOk T (flIter T (flOf dir1) k) = true :=
  FASS.angles_all_levels T (flOf dir1) 2 (by decide) fl_period
    (fun i hi => match i, hi with
      | 0, _ => angles_0
      | 1, _ => angles_1)

/-! ## C6: quad points -/

theorem c6 : c6_ok T Q = true := by native_decide

/-! ## C7: burial -/

theorem buried_0050 : buried T 8 [0, 0, 5, 0] = true := by native_decide
theorem not_buried_005 : buried T 8 [0, 0, 5] = false := by native_decide

/-! ## The strands: the routing operator from the level-1 states -/

abbrev X1 : Dots × RState := FASS.state1 dots1 FASS.DataSpectre.state1

theorem degrees_0 : degreesAllOk T X1.1 X1.2 = true := by native_decide
theorem degrees_1 : degreesAllOk T (orbit T X1 1).1 (orbit T X1 1).2 = true := by native_decide
theorem orbit_period : orbit T X1 2 = X1 := by native_decide
theorem orbit_0 : zeroCircuits X1 = true ∧ psiOneArc X1 = true := by native_decide
theorem orbit_1 : zeroCircuits (orbit T X1 1) = true ∧ psiOneArc (orbit T X1 1) = true := by native_decide

/-- Zero circuits in every type and a single Psi arc, at every level. -/
theorem routing_all_levels : ∀ k, zeroCircuits (orbit T X1 k) = true ∧ psiOneArc (orbit T X1 k) = true :=
  FASS.routing_all_levels T X1 orbit_period orbit_0 orbit_1

theorem dot_counts_0 : dotCounts X1.1 = [10, 8, 6, 6, 4, 4, 10, 4, 2] := by native_decide
theorem dot_counts_1 : dotCounts (orbit T X1 1).1 = [10, 8, 6, 6, 4, 4, 10, 4, 2] := by native_decide

/-- The boundary dot counts of every type are the same at every level. -/
theorem dot_counts_all_levels : ∀ k, dotCounts (orbit T X1 k).1 = [10, 8, 6, 6, 4, 4, 10, 4, 2] :=
  dotCounts_all_levels T X1 _ orbit_period dot_counts_0 dot_counts_1

end FASS.Spectre
