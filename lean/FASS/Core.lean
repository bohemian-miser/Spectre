/-
  The combinatorial core of docs/FASS_THEOREM.md, in Lean 4 (Mathlib-free).

  What this development checks, with the Lean kernel re-running every computation:

  * the substitution tables B, G, CT, Q are structurally sound (C1);
  * the word claims seeded by the glued pairs are closed under one substitution
    step and hold at level 1, and THEREFORE hold at every level — the induction
    is a theorem here, not a computation (C2, `claims_all_levels`);
  * the same for the leaf-label claims (`labclaims_all_levels`);
  * the corner coincidences follow from the seven quad chainings (C3), the glued
    children form a disk (C4), the needed quad points are corners and are
    inherited (C6), and the sub-supertile at address 0.0.5.0 is buried (C7);
  * the first/last directions of the meta-edges are periodic in the level, so the
    corner-angle conditions checked over one period hold at every level (C5);
  * the routing operator F is fixed; from the level-1 states its orbit is periodic,
    so zero circuits and "Psi is one arc" hold at every level (`routing_all_levels`).

  What it does NOT check, because it is geometry rather than combinatorics: that
  the tables describe the actual level-1 and level-2 patches (01-tables.ts, exact
  arithmetic) and that those patches are valid; the covering-space argument of §4;
  the vertex stars and chord crossings of §6. Those are the inputs.

  Conventions: types are 0..8 (Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi), slots
  0..7 (9 = empty), meta-edges 0..5, directions 0..11. A direction map x ↦ s*x + c
  is the pair (s, c). Words are functions Nat → Nat → List Int (type, edge).
-/

namespace FASS

/-! ## Tables -/

structure Tables where
  classes : List (List Int)
  rules : List (List Nat)
  B : List (List (List (Nat × Nat)))
  G : List (List ((Nat × Nat) × (Nat × Nat)))
  Q : List (List Int)
  Q1 : List (List Int)
  linear : List (Int × Int)

def allTypes : List Nat := List.range 9
def allSlots : List Nat := List.range 8
def allEdges : List Nat := List.range 6

/-- Lexicographic order on pairs. -/
def pairLess (x y : Nat × Nat) : Bool := x.1 < y.1 || (x.1 == y.1 && x.2 < y.2)

def child (t : Tables) (T s : Nat) : Nat := (t.rules.getD T []).getD s 9
def hasChild (t : Tables) (T s : Nat) : Bool := child t T s != 9
def slotsOf (t : Tables) (T : Nat) : List Nat := allSlots.filter (hasChild t T)
def Bof (t : Tables) (T j : Nat) : List (Nat × Nat) := (t.B.getD T []).getD j []
def Gof (t : Tables) (T : Nat) : List ((Nat × Nat) × (Nat × Nat)) := t.G.getD T []

/-- Parent corner j is child corner e+1 of the first child edge (s,e) of parent edge j:
  the parent traverses child edges backwards. -/
def CT (t : Tables) (T j : Nat) : Nat × Nat :=
  let p := (Bof t T j).headD (0, 0)
  (p.1, (p.2 + 1) % 6)

/-! ## Direction maps -/

abbrev DMap := Int × Int

def dapply (f : DMap) (x : Int) : Int := (f.1 * x + f.2) % 12
def dcomp (f g : DMap) : DMap := (f.1 * g.1, (f.1 * g.2 + f.2) % 12)
def dinv (f : DMap) : DMap := (f.1, (-(f.1 * f.2)) % 12)
def dneg : DMap := (1, 6)
def validm (f : DMap) : Prop := f.1 = 1 ∨ f.1 = -1
def validmB (f : DMap) : Bool := f.1 == 1 || f.1 == -1

theorem validmB_iff (f : DMap) : validmB f = true ↔ validm f := by
  simp [validmB, validm]

def Lmap (t : Tables) (s : Nat) : DMap := t.linear.getD s (1, 0)
/-- What a child's word undergoes when its parent traverses the child edge backwards:
  reverse it and apply phi_s = neg ∘ L_s. -/
def phi (t : Tables) (s : Nat) : DMap := dcomp dneg (Lmap t s)

def mapw (f : DMap) (w : List Int) : List Int := w.map (dapply f)
def negw (w : List Int) : List Int := w.map (fun x => (x + 6) % 12)
def revneg (w : List Int) : List Int := (negw w).reverse
def validw (w : List Int) : Prop := ∀ x ∈ w, 0 ≤ x ∧ x < 12

theorem validm_dcomp {f g : DMap} (hf : validm f) (hg : validm g) : validm (dcomp f g) := by
  unfold validm at *; unfold dcomp; simp only
  rcases hf with hf | hf <;> rcases hg with hg | hg <;> simp [hf, hg]

theorem validm_dinv {f : DMap} (hf : validm f) : validm (dinv f) := by
  unfold validm at *; unfold dinv; simpa using hf

theorem validm_dneg : validm dneg := by simp [validm, dneg]

theorem dapply_comp {f g : DMap} (hf : validm f) (hg : validm g) (x : Int) :
    dapply f (dapply g x) = dapply (dcomp f g) x := by
  obtain ⟨s1, c1⟩ := f
  obtain ⟨s2, c2⟩ := g
  simp only [validm] at hf hg
  simp only [dapply, dcomp]
  rcases hf with h1 | h1 <;> rcases hg with h2 | h2 <;> subst h1 h2 <;> omega

theorem mapw_comp {f g : DMap} (hf : validm f) (hg : validm g) (w : List Int) :
    mapw f (mapw g w) = mapw (dcomp f g) w := by
  unfold mapw; rw [List.map_map]; apply List.map_congr_left; intro x _
  exact dapply_comp hf hg x

theorem dapply_neg {f : DMap} (hf : validm f) (x : Int) :
    dapply f ((x + 6) % 12) = (dapply f x + 6) % 12 := by
  obtain ⟨s, c⟩ := f
  simp only [validm] at hf
  simp only [dapply]
  rcases hf with h | h <;> subst h <;> omega

theorem mapw_negw {f : DMap} (hf : validm f) (w : List Int) : mapw f (negw w) = negw (mapw f w) := by
  unfold mapw negw; rw [List.map_map, List.map_map]; apply List.map_congr_left; intro x _
  exact dapply_neg hf x

theorem mapw_reverse (f : DMap) (w : List Int) : mapw f w.reverse = (mapw f w).reverse := by
  unfold mapw; simp only [List.map_reverse]

theorem dcomp_dinv {f : DMap} (hf : validm f) : dcomp f (dinv f) = (1, 0) := by
  obtain ⟨s, c⟩ := f
  simp only [validm] at hf
  simp only [dcomp, dinv]
  rcases hf with h | h <;> subst h <;> simp only [Prod.mk.injEq] <;> constructor <;> omega

theorem mapw_id {w : List Int} (hw : validw w) : mapw (1, 0) w = w := by
  unfold mapw
  induction w with
  | nil => rfl
  | cons x xs ih =>
    have hx := hw x (List.mem_cons_self x xs)
    have hxs : validw xs := fun y hy => hw y (List.mem_cons_of_mem x hy)
    simp only [List.map_cons, dapply]
    rw [ih hxs]
    have : (1 * x + 0) % 12 = x := by omega
    rw [this]

theorem validw_mapw (f : DMap) (w : List Int) : validw (mapw f w) := by
  intro x hx
  unfold mapw at hx
  rw [List.mem_map] at hx
  obtain ⟨y, _, rfl⟩ := hx
  unfold dapply; omega

/-! ## Concatenation of mapped lists, with the lemmas the induction needs -/

def catMap {α β : Type} (F : α → List β) : List α → List β
  | [] => []
  | x :: xs => F x ++ catMap F xs

theorem catMap_append {α β : Type} (F : α → List β) (l1 l2 : List α) :
    catMap F (l1 ++ l2) = catMap F l1 ++ catMap F l2 := by
  induction l1 with
  | nil => rfl
  | cons x xs ih => simp [catMap, ih, List.append_assoc]

theorem map_catMap {α β γ : Type} (g : β → γ) (F : α → List β) (l : List α) :
    (catMap F l).map g = catMap (fun x => (F x).map g) l := by
  induction l with
  | nil => rfl
  | cons x xs ih => simp [catMap, ih, List.map_append]

theorem reverse_catMap {α β : Type} (F : α → List β) (l : List α) :
    (catMap F l).reverse = catMap (fun x => (F x).reverse) l.reverse := by
  induction l with
  | nil => rfl
  | cons x xs ih =>
    simp only [catMap, List.reverse_append, List.reverse_cons, ih, catMap_append]
    simp [catMap]

theorem catMap_congr_zip {α β γ : Type} (F : α → List γ) (F' : β → List γ) :
    ∀ (L : List α) (R : List β), L.length = R.length →
      (∀ p q, (p, q) ∈ L.zip R → F p = F' q) → catMap F L = catMap F' R := by
  intro L
  induction L with
  | nil => intro R hl _; cases R with
    | nil => rfl
    | cons _ _ => simp at hl
  | cons x xs ih =>
    intro R hl hz
    cases R with
    | nil => simp at hl
    | cons y ys =>
      simp only [catMap]
      have hxy : F x = F' y := hz x y (by simp [List.zip_cons_cons])
      have hrest : catMap F xs = catMap F' ys := by
        apply ih ys (by simpa using hl)
        intro p q hpq
        exact hz p q (by simp [List.zip_cons_cons, hpq])
      rw [hxy, hrest]

theorem validw_catMap {α : Type} (F : α → List Int) (l : List α) (h : ∀ x ∈ l, validw (F x)) :
    validw (catMap F l) := by
  induction l with
  | nil => intro x hx; simp [catMap] at hx
  | cons y ys ih =>
    intro x hx
    simp only [catMap, List.mem_append] at hx
    rcases hx with hx | hx
    · exact h y (List.mem_cons_self y ys) x hx
    · exact ih (fun z hz => h z (List.mem_cons_of_mem y hz)) x hx

theorem validw_reverse {w : List Int} (h : validw w) : validw w.reverse := by
  intro x hx; exact h x (List.mem_reverse.mp hx)

/-! ## Words and the substitution step -/

abbrev Words := Nat → Nat → List Int

/-- The parent's meta-edge: each child edge reversed and moved by phi, in the order of B. -/
def childPiece (t : Tables) (W : Words) (a : Nat) (p : Nat × Nat) : List Int :=
  (mapw (phi t p.1) (W (child t a p.1) p.2)).reverse

def stepW (t : Tables) (W : Words) : Words := fun a e => catMap (childPiece t W a) (Bof t a e)

def iterW (t : Tables) (W1 : Words) : Nat → Words
  | 0 => W1
  | k + 1 => stepW t (iterW t W1 k)

def validW (W : Words) : Prop := ∀ a e, validw (W a e)

theorem validW_step (t : Tables) (W : Words) : validW (stepW t W) := by
  intro a e
  unfold stepW
  apply validw_catMap
  intro p _
  unfold childPiece
  exact validw_reverse (validw_mapw _ _)

theorem validW_iter (t : Tables) {W1 : Words} (h : validW W1) (k : Nat) : validW (iterW t W1 k) := by
  cases k with
  | zero => exact h
  | succ k => exact validW_step t _

/-! ## Word claims -/

/-- A claim ((a,e),(b,f),g): the class-c(a,e) edge of type a, moved by g, is the reversed
  class-c(b,f) edge of type b. -/
abbrev Claim := (Nat × Nat) × (Nat × Nat) × DMap

def holds (W : Words) (c : Claim) : Prop := mapw c.2.2 (W c.1.1 c.1.2) = revneg (W c.2.1.1 c.2.1.2)
def holdsB (W : Words) (c : Claim) : Bool := mapw c.2.2 (W c.1.1 c.1.2) == revneg (W c.2.1.1 c.2.1.2)

theorem holdsB_iff (W : Words) (c : Claim) : holdsB W c = true ↔ holds W c := by
  simp [holdsB, holds]

def validL (t : Tables) : Prop := ∀ s ∈ allSlots, validm (Lmap t s)
def validLB (t : Tables) : Bool := allSlots.all (fun s => validmB (Lmap t s))

theorem validLB_iff (t : Tables) : validLB t = true ↔ validL t := by
  simp [validLB, validL, List.all_eq_true, validmB_iff]

theorem validm_phi {t : Tables} (h : validL t) {s : Nat} (hs : s < 8) : validm (phi t s) := by
  unfold phi
  apply validm_dcomp validm_dneg
  apply h
  simp [allSlots, List.mem_range, hs]

/-- The subclaim generated by pairing child edge (s,x) of the first side with child edge (u,y)
  of the second side. -/
def subclaimOf (t : Tables) (c : Claim) (q : (Nat × Nat) × (Nat × Nat)) : Claim :=
  ((child t c.1.1 q.1.1, q.1.2), (child t c.2.1.1 q.2.1, q.2.2),
   dcomp (dinv (phi t q.2.1)) (dcomp c.2.2 (phi t q.1.1)))

def subclaims (t : Tables) (c : Claim) : List Claim :=
  ((Bof t c.1.1 c.1.2).zip (Bof t c.2.1.1 c.2.1.2).reverse).map (subclaimOf t c)

def expandable (t : Tables) (c : Claim) : Bool :=
  (Bof t c.1.1 c.1.2).length == (Bof t c.2.1.1 c.2.1.2).length

def slotsOk (t : Tables) (c : Claim) : Bool :=
  (Bof t c.1.1 c.1.2).all (fun p => p.1 < 8) && (Bof t c.2.1.1 c.2.1.2).all (fun p => p.1 < 8)

/-- The heart of C2: if a claim's subclaims all hold at one level, the claim holds at the next. -/
theorem holds_step (t : Tables) (W : Words) (c : Claim)
    (hL : validL t) (hg : validm c.2.2)
    (hex : expandable t c = true) (hsl : slotsOk t c = true)
    (hsub : ∀ c' ∈ subclaims t c, holds W c') : holds (stepW t W) c := by
  obtain ⟨⟨a, e⟩, ⟨b, f⟩, g⟩ := c
  simp only at hg
  unfold holds stepW
  simp only
  -- left side: map g over the concatenation
  unfold mapw
  rw [map_catMap]
  -- right side: revneg of the concatenation, as a concatenation over the reversed list
  unfold revneg negw
  rw [map_catMap, reverse_catMap]
  have hlen : (Bof t a e).length = (Bof t b f).reverse.length := by
    simp only [List.length_reverse]
    simpa [expandable] using hex
  apply catMap_congr_zip _ _ _ _ hlen
  intro p q hpq
  -- the subclaim for this pair holds
  have hmem : subclaimOf t ((a, e), (b, f), g) (p, q) ∈ subclaims t ((a, e), (b, f), g) := by
    unfold subclaims
    exact List.mem_map.mpr ⟨(p, q), hpq, rfl⟩
  have hsc := hsub _ hmem
  simp only [holds, subclaimOf] at hsc
  -- validity of the maps involved
  have hsl' := hsl
  simp only [slotsOk, Bool.and_eq_true, List.all_eq_true] at hsl'
  obtain ⟨hsA, hsB⟩ := hsl'
  have hs8 : p.1 < 8 := by
    have := hsA p (List.of_mem_zip hpq).1
    simpa using this
  have hu8 : q.1 < 8 := by
    have := hsB q (List.mem_reverse.mp (List.of_mem_zip hpq).2)
    simpa using this
  have vs : validm (phi t p.1) := validm_phi hL hs8
  have vu : validm (phi t q.1) := validm_phi hL hu8
  have vh : validm (dcomp g (phi t p.1)) := validm_dcomp hg vs
  -- mapw h Wa equals phi_u applied to revneg Wb
  have key : mapw (dcomp g (phi t p.1)) (W (child t a p.1) p.2)
      = mapw (phi t q.1) (revneg (W (child t b q.1) q.2)) := by
    have e1 : mapw (dcomp (dinv (phi t q.1)) (dcomp g (phi t p.1))) (W (child t a p.1) p.2)
        = mapw (dinv (phi t q.1)) (mapw (dcomp g (phi t p.1)) (W (child t a p.1) p.2)) :=
      (mapw_comp (validm_dinv vu) vh _).symm
    rw [← hsc, e1, mapw_comp vu (validm_dinv vu), dcomp_dinv vu, mapw_id (validw_mapw _ _)]
  -- conclude termwise
  unfold childPiece
  calc List.map (dapply g) ((mapw (phi t p.1) (W (child t a p.1) p.2)).reverse)
      = (mapw g (mapw (phi t p.1) (W (child t a p.1) p.2))).reverse := by
        unfold mapw; simp only [List.map_reverse]
    _ = (mapw (dcomp g (phi t p.1)) (W (child t a p.1) p.2)).reverse := by rw [mapw_comp hg vs]
    _ = (mapw (phi t q.1) (revneg (W (child t b q.1) q.2))).reverse := by rw [key]
    _ = ((negw (mapw (phi t q.1) (W (child t b q.1) q.2))).reverse).reverse := by
        unfold revneg; rw [mapw_reverse, mapw_negw vu]
    _ = negw (mapw (phi t q.1) (W (child t b q.1) q.2)) := List.reverse_reverse _
    _ = (List.map (fun x => (x + 6) % 12) ((mapw (phi t q.1) (W (child t b q.1) q.2)).reverse)).reverse := by
        unfold negw; simp only [List.map_reverse, List.reverse_reverse]

def closedSetB (t : Tables) (S : List Claim) : Bool :=
  S.all (fun c => validmB c.2.2 && expandable t c && slotsOk t c &&
    (subclaims t c).all (fun c' => S.contains c'))

theorem closedSet_props {t : Tables} {S : List Claim} (h : closedSetB t S = true) :
    ∀ c ∈ S, validm c.2.2 ∧ expandable t c = true ∧ slotsOk t c = true ∧
      ∀ c' ∈ subclaims t c, c' ∈ S := by
  intro c hc
  have := List.all_eq_true.mp h c hc
  simp only [Bool.and_eq_true, List.all_eq_true, List.contains_iff_mem] at this
  obtain ⟨⟨⟨hv, hex⟩, hsl⟩, hsub⟩ := this
  exact ⟨(validmB_iff _).mp hv, hex, hsl, hsub⟩

/-- C2 as a theorem: closure under expansion and truth at level 1 give truth at every level. -/
theorem claims_all_levels (t : Tables) (W1 : Words) (S : List Claim)
    (hL : validL t) (hcl : closedSetB t S = true)
    (hbase : ∀ c ∈ S, holds W1 c) : ∀ k, ∀ c ∈ S, holds (iterW t W1 k) c := by
  intro k
  induction k with
  | zero => exact hbase
  | succ k ih =>
    intro c hc
    obtain ⟨hv, hex, hsl, hsub⟩ := closedSet_props hcl c hc
    exact holds_step t (iterW t W1 k) c hL hv hex hsl
      (fun c' hc' => ih c' (hsub c' hc'))

/-- Executable closure: add subclaims until nothing new appears, with a round bound. -/
def closureIter (t : Tables) : Nat → List Claim → List Claim
  | 0, S => S
  | n + 1, S => closureIter t n ((S ++ (S.map (subclaims t)).flatten).eraseDups)

def symc (c : Claim) : Claim := (c.2.1, c.1, dinv c.2.2)

def seedsOf (t : Tables) (T : Nat) : List Claim :=
  (Gof t T).map (fun gp =>
    ((child t T gp.1.1, gp.1.2), (child t T gp.2.1, gp.2.2), dcomp (dinv (Lmap t gp.2.1)) (Lmap t gp.1.1)))

def seeds (t : Tables) : List Claim :=
  (((allTypes.map (seedsOf t)).flatten).map (fun c => [c, symc c])).flatten.eraseDups

def wordsOf (L : List (List (List Int))) : Words := fun a e => (L.getD a []).getD e []

def validDataB (L : List (List (List Int))) : Bool :=
  L.all (fun ws => ws.all (fun w => w.all (fun x => decide (0 ≤ x ∧ x < 12))))

theorem getD_mem_or_default {α : Type} (l : List α) (i : Nat) (d : α) : l.getD i d ∈ l ∨ l.getD i d = d := by
  induction l generalizing i with
  | nil => right; simp [List.getD]
  | cons x xs ih =>
    cases i with
    | zero => left; simp [List.getD]
    | succ i =>
      rcases ih i with h | h
      · left; simp only [List.getD, List.get?] at h ⊢; exact List.mem_cons_of_mem x h
      · right; simp only [List.getD, List.get?] at h ⊢; exact h

theorem validW_of_data {L : List (List (List Int))} (h : validDataB L = true) : validW (wordsOf L) := by
  intro a e x hx
  unfold wordsOf at hx
  have h1 := List.all_eq_true.mp h
  rcases getD_mem_or_default L a [] with hrow | hrow
  · have h2 := List.all_eq_true.mp (h1 _ hrow)
    rcases getD_mem_or_default (L.getD a []) e [] with hw | hw
    · have h3 := List.all_eq_true.mp (h2 _ hw) x hx
      simpa using h3
    · rw [hw] at hx; simp at hx
  · rw [hrow] at hx; simp at hx

/-! ## Label claims -/

/-- Leaf labels are (sign, major, minor). Across a glued pair, label i of one edge meets label
  n-1-i of the other with the same major and opposite sign, except the self-glued class 0, whose
  minors are reversed within its seam (of length zl: 1 for hexagons, 2 for spectres). -/
abbrev Lab := Int × Nat × Nat
abbrev LabWords := Nat → Nat → List Lab

def flipLab (zl : Nat) (l : Lab) : Lab :=
  if l.2.1 = 0 then (l.1, 0, zl - 1 - l.2.2) else (-l.1, l.2.1, l.2.2)

def holdsL (zl : Nat) (Lw : LabWords) (c : Claim) : Prop :=
  Lw c.1.1 c.1.2 = ((Lw c.2.1.1 c.2.1.2).map (flipLab zl)).reverse
def holdsLB (zl : Nat) (Lw : LabWords) (c : Claim) : Bool :=
  Lw c.1.1 c.1.2 == ((Lw c.2.1.1 c.2.1.2).map (flipLab zl)).reverse

theorem holdsLB_iff (zl : Nat) (Lw : LabWords) (c : Claim) : holdsLB zl Lw c = true ↔ holdsL zl Lw c := by
  simp [holdsLB, holdsL]

def stepL (t : Tables) (Lw : LabWords) : LabWords :=
  fun a e => catMap (fun p => (Lw (child t a p.1) p.2).reverse) (Bof t a e)

def iterL (t : Tables) (L1 : LabWords) : Nat → LabWords
  | 0 => L1
  | k + 1 => stepL t (iterL t L1 k)

theorem holdsL_step (t : Tables) (zl : Nat) (Lw : LabWords) (c : Claim)
    (hex : expandable t c = true) (hsub : ∀ c' ∈ subclaims t c, holdsL zl Lw c') :
    holdsL zl (stepL t Lw) c := by
  obtain ⟨⟨a, e⟩, ⟨b, f⟩, g⟩ := c
  unfold holdsL stepL
  simp only
  rw [map_catMap, reverse_catMap]
  have hlen : (Bof t a e).length = (Bof t b f).reverse.length := by
    simp only [List.length_reverse]
    simpa [expandable] using hex
  apply catMap_congr_zip _ _ _ _ hlen
  intro p q hpq
  have hmem : subclaimOf t ((a, e), (b, f), g) (p, q) ∈ subclaims t ((a, e), (b, f), g) := by
    unfold subclaims
    exact List.mem_map.mpr ⟨(p, q), hpq, rfl⟩
  have hsc := hsub _ hmem
  simp only [holdsL, subclaimOf] at hsc
  rw [hsc, List.map_reverse, List.reverse_reverse]

theorem labclaims_all_levels (t : Tables) (zl : Nat) (L1 : LabWords) (S : List Claim)
    (hcl : closedSetB t S = true) (hbase : ∀ c ∈ S, holdsL zl L1 c) :
    ∀ k, ∀ c ∈ S, holdsL zl (iterL t L1 k) c := by
  intro k
  induction k with
  | zero => exact hbase
  | succ k ih =>
    intro c hc
    obtain ⟨_, hex, _, hsub⟩ := closedSet_props hcl c hc
    exact holdsL_step t zl (iterL t L1 k) c hex (fun c' hc' => ih c' (hsub c' hc'))

def labwordsOf (L : List (List (List Lab))) : LabWords := fun a e => (L.getD a []).getD e []

/-! ## C1: structure -/

def edgesInB (t : Tables) (T : Nat) : List (Nat × Nat) := (t.B.getD T []).flatten
def edgesInG (t : Tables) (T : Nat) : List (Nat × Nat) := ((Gof t T).map (fun gp => [gp.1, gp.2])).flatten
def allChildEdges (t : Tables) (T : Nat) : List (Nat × Nat) :=
  ((slotsOf t T).map (fun s => allEdges.map (fun e => (s, e)))).flatten

def sameSet (xs ys : List (Nat × Nat)) : Bool := xs.all (ys.contains ·) && ys.all (xs.contains ·)
def distinctB (xs : List (Nat × Nat)) : Bool := xs.eraseDups.length == xs.length

def c1_ok (t : Tables) : Bool :=
  allTypes.all (fun T =>
    let used := edgesInB t T ++ edgesInG t T
    distinctB used && sameSet used (allChildEdges t T) && allEdges.all (fun j => !(Bof t T j).isEmpty))

/-! ## Corner classes (union-find on lists of lists) -/

abbrev Corner := Nat × Nat
abbrev Partition := List (List Corner)

def findClass (P : Partition) (x : Corner) : List Corner :=
  match P.find? (fun c => c.contains x) with
  | some c => c
  | none => [x]

def sameClass (P : Partition) (x y : Corner) : Bool := (findClass P x).contains y

def mergeClass (P : Partition) (x y : Corner) : Partition :=
  if sameClass P x y then P
  else
    let cx := findClass P x
    let cy := findClass P y
    (cx ++ cy) :: P.filter (fun c => c != cx && c != cy)

def initialClasses (t : Tables) (T : Nat) : Partition :=
  (((slotsOf t T).map (fun s => allEdges.map (fun c => (s, c)))).flatten).map (fun x => [x])

/-- Glued (s,e)~(u,f): corner (s,e) = corner (u,f+1) and corner (s,e+1) = corner (u,f). Consecutive
  outer edges chain: the end of (s,e), child corner e, meets the start of the next, child corner e'+1. -/
def cornerIdents (t : Tables) (T : Nat) : List (Corner × Corner) :=
  ((Gof t T).map (fun gp =>
    [((gp.1.1, gp.1.2), (gp.2.1, (gp.2.2 + 1) % 6)), ((gp.1.1, (gp.1.2 + 1) % 6), (gp.2.1, gp.2.2))])).flatten
  ++ (let outer := edgesInB t T
      (List.range outer.length).map (fun i =>
        let x := outer.getD i (0, 0)
        let y := outer.getD ((i + 1) % outer.length) (0, 0)
        ((x.1, x.2), (y.1, (y.2 + 1) % 6))))

def cornerClasses (t : Tables) (T : Nat) : Partition :=
  (cornerIdents t T).foldl (fun P xy => mergeClass P xy.1 xy.2) (initialClasses t T)

def ctChains (t : Tables) : Bool :=
  allTypes.all (fun T =>
    let P := cornerClasses t T
    allEdges.all (fun j =>
      let lastPrev := (Bof t T ((j + 5) % 6)).getLastD (0, 0)
      sameClass P (CT t T j) (lastPrev.1, lastPrev.2)))

/-! ## C3: corner coincidences propagate from the quad chainings -/

def tRulesFrom : List Nat := [3, 2, 3, 3, 2, 3, 3]
def tRulesTo : List Nat := [1, 0, 1, 1, 0, 1, 3]
def superQuad : List (Nat × Nat) := [(6, 2), (5, 1), (3, 2), (0, 1)]

def qc (Qt : List (List Int)) (T i : Nat) : Int := (Qt.getD T []).getD i (-1)

/-- The chaining of slot s identifies quad[to] of the child at s with quad[from] of the child at
  s-1; both must be corners. -/
def chainSeeds (t : Tables) (Qt : List (List Int)) (T : Nat) : Option (List (Corner × Corner)) :=
  let ss := (List.range 7).map (· + 1) |>.filter (fun s => hasChild t T s && hasChild t T (s - 1))
  if ss.all (fun s => qc Qt (child t T s) (tRulesTo.getD (s - 1) 0) ≥ 0
                   && qc Qt (child t T (s - 1)) (tRulesFrom.getD (s - 1) 0) ≥ 0)
  then some (ss.map (fun s =>
    ((s, (qc Qt (child t T s) (tRulesTo.getD (s - 1) 0)).toNat),
     (s - 1, (qc Qt (child t T (s - 1)) (tRulesFrom.getD (s - 1) 0)).toNat))))
  else none

/-- One round: a glued pair whose starts coincide has its ends coincide, and conversely (the words
  agree by C2). -/
def propagate1 (t : Tables) (T : Nat) (P : Partition) : Partition :=
  (Gof t T).foldl (fun P gp =>
    let s := gp.1.1; let e := gp.1.2; let u := gp.2.1; let f := gp.2.2
    let s1 := (s, e); let e1 := (s, (e + 1) % 6); let s2 := (u, (f + 1) % 6); let e2 := (u, f)
    if sameClass P s1 s2 then mergeClass P e1 e2
    else if sameClass P e1 e2 then mergeClass P s1 s2 else P) P

def propagateN (t : Tables) (T : Nat) : Nat → Partition → Partition
  | 0, P => P
  | n + 1, P => propagateN t T n (propagate1 t T P)

def refines (K A : Partition) : Bool := A.all (fun c => c.all (fun x => c.all (fun y => sameClass K x y)))

def nonGammaTypes (t : Tables) : List Nat := allTypes.filter (fun T => allSlots.all (hasChild t T))

/-- SameCorner: corners of two outline-sharing types that are the same point; the greatest fixed
  point of "same CT entry and the children there are SameCorner". -/
def scStart (t : Tables) : List (Corner × Corner) :=
  ((nonGammaTypes t).map (fun a => ((nonGammaTypes t).map (fun b =>
    (allEdges.map (fun c => (allEdges.filter (fun d => CT t a c == CT t b d)).map (fun d => ((a, c), (b, d))))).flatten)).flatten)).flatten

def scRefine (t : Tables) (S : List (Corner × Corner)) : List (Corner × Corner) :=
  S.filter (fun p =>
    let s := (CT t p.1.1 p.1.2).1
    let e := (CT t p.1.1 p.1.2).2
    S.contains ((child t p.1.1 s, e), (child t p.2.1 s, e)))

def scIter (t : Tables) : Nat → List (Corner × Corner) → List (Corner × Corner)
  | 0, S => S
  | n + 1, S => scIter t n (scRefine t S)

def sameCorner (t : Tables) : List (Corner × Corner) := scIter t 20 (scStart t)

/-- The checks below take the relation as a parameter, so that a configuration file can compute
  `sameCorner t` once (`sameCorner t = scLit`, a single kernel computation) and run everything
  else on the literal. -/
def sameCornerClosedWith (t : Tables) (sc : List (Corner × Corner)) : Bool := scRefine t sc == sc
def sameCornerBaseWith (sc : List (Corner × Corner)) (corners1 : List (List Nat)) : Bool :=
  sc.all (fun p =>
    (corners1.getD p.1.1 []).getD p.1.2 0 == (corners1.getD p.2.1 []).getD p.2.2 0)
def sameCornerClosed (t : Tables) : Bool := sameCornerClosedWith t (sameCorner t)
def sameCornerBase (t : Tables) (corners1 : List (List Nat)) : Bool :=
  sameCornerBaseWith (sameCorner t) corners1

/-- The SameCorner relation of both families (they share the tables `rules` and `CT`, so the
  relation is the same); each configuration file proves `sameCorner T = scLit`. -/
def scLit : List (Corner × Corner) := [((1, 1), 1, 1),
 ((1, 2), 1, 2),
 ((1, 3), 1, 3),
 ((1, 4), 1, 4),
 ((1, 5), 1, 5),
 ((1, 1), 2, 1),
 ((1, 2), 2, 2),
 ((1, 1), 3, 1),
 ((1, 2), 3, 2),
 ((1, 3), 3, 3),
 ((1, 4), 3, 4),
 ((1, 2), 4, 2),
 ((1, 2), 5, 2),
 ((1, 3), 5, 3),
 ((1, 4), 5, 4),
 ((1, 1), 6, 1),
 ((1, 2), 6, 2),
 ((1, 3), 6, 3),
 ((1, 4), 6, 4),
 ((1, 5), 6, 5),
 ((1, 1), 7, 1),
 ((1, 2), 7, 2),
 ((1, 3), 7, 3),
 ((1, 2), 8, 2),
 ((1, 3), 8, 3),
 ((2, 1), 1, 1),
 ((2, 2), 1, 2),
 ((2, 1), 2, 1),
 ((2, 2), 2, 2),
 ((2, 3), 2, 3),
 ((2, 4), 2, 4),
 ((2, 5), 2, 5),
 ((2, 1), 3, 1),
 ((2, 2), 3, 2),
 ((2, 5), 3, 5),
 ((2, 2), 4, 2),
 ((2, 3), 4, 3),
 ((2, 4), 4, 4),
 ((2, 5), 4, 5),
 ((2, 2), 5, 2),
 ((2, 5), 5, 5),
 ((2, 1), 6, 1),
 ((2, 2), 6, 2),
 ((2, 1), 7, 1),
 ((2, 2), 7, 2),
 ((2, 4), 7, 4),
 ((2, 5), 7, 5),
 ((2, 2), 8, 2),
 ((2, 4), 8, 4),
 ((2, 5), 8, 5),
 ((3, 1), 1, 1),
 ((3, 2), 1, 2),
 ((3, 3), 1, 3),
 ((3, 4), 1, 4),
 ((3, 1), 2, 1),
 ((3, 2), 2, 2),
 ((3, 5), 2, 5),
 ((3, 1), 3, 1),
 ((3, 2), 3, 2),
 ((3, 3), 3, 3),
 ((3, 4), 3, 4),
 ((3, 5), 3, 5),
 ((3, 2), 4, 2),
 ((3, 5), 4, 5),
 ((3, 2), 5, 2),
 ((3, 3), 5, 3),
 ((3, 4), 5, 4),
 ((3, 5), 5, 5),
 ((3, 1), 6, 1),
 ((3, 2), 6, 2),
 ((3, 3), 6, 3),
 ((3, 4), 6, 4),
 ((3, 1), 7, 1),
 ((3, 2), 7, 2),
 ((3, 3), 7, 3),
 ((3, 5), 7, 5),
 ((3, 2), 8, 2),
 ((3, 3), 8, 3),
 ((3, 5), 8, 5),
 ((4, 2), 1, 2),
 ((4, 2), 2, 2),
 ((4, 3), 2, 3),
 ((4, 4), 2, 4),
 ((4, 5), 2, 5),
 ((4, 2), 3, 2),
 ((4, 5), 3, 5),
 ((4, 1), 4, 1),
 ((4, 2), 4, 2),
 ((4, 3), 4, 3),
 ((4, 4), 4, 4),
 ((4, 5), 4, 5),
 ((4, 1), 5, 1),
 ((4, 2), 5, 2),
 ((4, 5), 5, 5),
 ((4, 2), 6, 2),
 ((4, 2), 7, 2),
 ((4, 4), 7, 4),
 ((4, 5), 7, 5),
 ((4, 1), 8, 1),
 ((4, 2), 8, 2),
 ((4, 4), 8, 4),
 ((4, 5), 8, 5),
 ((5, 2), 1, 2),
 ((5, 3), 1, 3),
 ((5, 4), 1, 4),
 ((5, 2), 2, 2),
 ((5, 5), 2, 5),
 ((5, 2), 3, 2),
 ((5, 3), 3, 3),
 ((5, 4), 3, 4),
 ((5, 5), 3, 5),
 ((5, 1), 4, 1),
 ((5, 2), 4, 2),
 ((5, 5), 4, 5),
 ((5, 1), 5, 1),
 ((5, 2), 5, 2),
 ((5, 3), 5, 3),
 ((5, 4), 5, 4),
 ((5, 5), 5, 5),
 ((5, 2), 6, 2),
 ((5, 3), 6, 3),
 ((5, 4), 6, 4),
 ((5, 2), 7, 2),
 ((5, 3), 7, 3),
 ((5, 5), 7, 5),
 ((5, 1), 8, 1),
 ((5, 2), 8, 2),
 ((5, 3), 8, 3),
 ((5, 5), 8, 5),
 ((6, 1), 1, 1),
 ((6, 2), 1, 2),
 ((6, 3), 1, 3),
 ((6, 4), 1, 4),
 ((6, 5), 1, 5),
 ((6, 1), 2, 1),
 ((6, 2), 2, 2),
 ((6, 1), 3, 1),
 ((6, 2), 3, 2),
 ((6, 3), 3, 3),
 ((6, 4), 3, 4),
 ((6, 2), 4, 2),
 ((6, 2), 5, 2),
 ((6, 3), 5, 3),
 ((6, 4), 5, 4),
 ((6, 0), 6, 0),
 ((6, 1), 6, 1),
 ((6, 2), 6, 2),
 ((6, 3), 6, 3),
 ((6, 4), 6, 4),
 ((6, 5), 6, 5),
 ((6, 1), 7, 1),
 ((6, 2), 7, 2),
 ((6, 3), 7, 3),
 ((6, 2), 8, 2),
 ((6, 3), 8, 3),
 ((7, 1), 1, 1),
 ((7, 2), 1, 2),
 ((7, 3), 1, 3),
 ((7, 1), 2, 1),
 ((7, 2), 2, 2),
 ((7, 4), 2, 4),
 ((7, 5), 2, 5),
 ((7, 1), 3, 1),
 ((7, 2), 3, 2),
 ((7, 3), 3, 3),
 ((7, 5), 3, 5),
 ((7, 2), 4, 2),
 ((7, 4), 4, 4),
 ((7, 5), 4, 5),
 ((7, 2), 5, 2),
 ((7, 3), 5, 3),
 ((7, 5), 5, 5),
 ((7, 1), 6, 1),
 ((7, 2), 6, 2),
 ((7, 3), 6, 3),
 ((7, 1), 7, 1),
 ((7, 2), 7, 2),
 ((7, 3), 7, 3),
 ((7, 4), 7, 4),
 ((7, 5), 7, 5),
 ((7, 2), 8, 2),
 ((7, 3), 8, 3),
 ((7, 4), 8, 4),
 ((7, 5), 8, 5),
 ((8, 2), 1, 2),
 ((8, 3), 1, 3),
 ((8, 2), 2, 2),
 ((8, 4), 2, 4),
 ((8, 5), 2, 5),
 ((8, 2), 3, 2),
 ((8, 3), 3, 3),
 ((8, 5), 3, 5),
 ((8, 1), 4, 1),
 ((8, 2), 4, 2),
 ((8, 4), 4, 4),
 ((8, 5), 4, 5),
 ((8, 1), 5, 1),
 ((8, 2), 5, 2),
 ((8, 3), 5, 3),
 ((8, 5), 5, 5),
 ((8, 2), 6, 2),
 ((8, 3), 6, 3),
 ((8, 2), 7, 2),
 ((8, 3), 7, 3),
 ((8, 4), 7, 4),
 ((8, 5), 7, 5),
 ((8, 1), 8, 1),
 ((8, 2), 8, 2),
 ((8, 3), 8, 3),
 ((8, 4), 8, 4),
 ((8, 5), 8, 5)]

/-- For a parent with an empty slot (Gamma), transfer the coincidences of a parent `P` without
  one, through corners that the children in the same slot share as points. -/
def transferFrom (t : Tables) (sc : List (Corner × Corner)) (T P : Nat) : List (Corner × Corner) :=
  ((cornerClasses t P).map (fun cls =>
    let here := ((cls.map (·.1)).map (fun sp =>
      allEdges.filter (fun c => hasChild t T sp &&
        cls.any (fun q => q.1 == sp && sc.contains ((child t T sp, c), (child t P sp, q.2))))
      |>.map (fun c => (sp, c)))).flatten
    match here with
    | [] => []
    | h :: rest => rest.map (fun x => (h, x)))).flatten

def transferSeedsWith (t : Tables) (sc : List (Corner × Corner)) (T : Nat) : List (Corner × Corner) :=
  if allSlots.all (hasChild t T) then []
  else ((nonGammaTypes t).map (transferFrom t sc T)).flatten
def transferSeeds (t : Tables) (T : Nat) : List (Corner × Corner) := transferSeedsWith t (sameCorner t) T

/-- The seeds transferred into Gamma (type 0) from the eight other types, in both families; each
  configuration file proves `transferSeedsWith T scLit 0 = tsLit`. -/
def tsLit : List (Corner × Corner) :=
  [((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2), ((5, 5), 6, 2), ((4, 4), 6, 1), ((4, 3), 5, 1), ((3, 5), 4, 2), ((1, 5), 4, 1), ((1, 4), 3, 1), ((0, 5), 1, 2)]

/-- C3 for one parent type, with the transferred seeds given. -/
def c3_okTWith (t : Tables) (Qt : List (List Int)) (extra : List (Corner × Corner)) (T : Nat) : Bool :=
  match chainSeeds t Qt T with
  | none => false
  | some seedsT =>
    let A := cornerClasses t T
    seedsT.all (fun xy => sameClass A xy.1 xy.2) &&
    (let K0 := (seedsT ++ extra).foldl (fun P xy => mergeClass P xy.1 xy.2) (initialClasses t T)
     refines (propagateN t T 20 K0) A)

/-- C3 for one parent type: the chain seeds (and the transferred ones) propagate to every
  intrinsic corner class. -/
def c3_okT (t : Tables) (Qt : List (List Int)) (sc : List (Corner × Corner)) (T : Nat) : Bool :=
  c3_okTWith t Qt (transferSeedsWith t sc T) T

def c3_ok (t : Tables) (Qt : List (List Int)) : Bool := allTypes.all (c3_okT t Qt (sameCorner t))

theorem c3_ok_of {t : Tables} {Qt : List (List Int)} {sc : List (Corner × Corner)}
    (hsc : sameCorner t = sc) (h : ∀ T, T < 9 → c3_okT t Qt sc T = true) : c3_ok t Qt = true := by
  unfold c3_ok
  rw [hsc]
  exact List.all_eq_true.mpr (fun T hT => h T (List.mem_range.mp hT))

theorem c3_okT_of {t : Tables} {Qt : List (List Int)} {sc extra : List (Corner × Corner)} {T : Nat}
    (hts : transferSeedsWith t sc T = extra) (h : c3_okTWith t Qt extra T = true) : c3_okT t Qt sc T = true := by
  unfold c3_okT; rw [hts]; exact h

theorem sameCornerClosed_of {t : Tables} {sc : List (Corner × Corner)} (hsc : sameCorner t = sc)
    (h : sameCornerClosedWith t sc = true) : sameCornerClosed t = true := by
  unfold sameCornerClosed; rw [hsc]; exact h

theorem sameCornerBase_of {t : Tables} {sc : List (Corner × Corner)} {corners1 : List (List Nat)}
    (hsc : sameCorner t = sc) (h : sameCornerBaseWith sc corners1 = true) :
    sameCornerBase t corners1 = true := by
  unfold sameCornerBase; rw [hsc]; exact h

/-! ## C4: the glued children form a disk -/

def gluedTo (t : Tables) (T : Nat) (x : Corner) : Option Corner :=
  match (Gof t T).find? (fun gp => gp.1 == x || gp.2 == x) with
  | none => none
  | some gp => some (if gp.1 == x then gp.2 else gp.1)

def edgeNode (t : Tables) (T : Nat) (x : Corner) : Corner :=
  match gluedTo t T x with
  | none => x
  | some y => if pairLess y x then y else x

def cornerEdges (t : Tables) (T : Nat) (x : Corner) : List Corner :=
  [edgeNode t T (x.1, (x.2 + 5) % 6), edgeNode t T (x.1, x.2)]

def growN {α : Type} [BEq α] (adj : α → List α) : Nat → List α → List α
  | 0, R => R
  | n + 1, R => growN adj n ((R ++ (R.map adj).flatten).eraseDups)

/-- The link of a vertex class: nodes are its incident edges (glued ones identified), each corner
  joins its two edges. It must be one path (two degree-1 nodes, both outer) or one cycle. -/
def linkOk (t : Tables) (T : Nat) (cls : List Corner) : Bool :=
  let nodes := (cls.map (cornerEdges t T)).flatten.eraseDups
  let deg := fun n => (cls.filter (fun x => (cornerEdges t T x).contains n)).length
  let ends := nodes.filter (fun n => deg n == 1)
  let adj := fun n => ((cls.filter (fun x => (cornerEdges t T x).contains n)).map
                        (fun x => (cornerEdges t T x).filter (fun m => m != n))).flatten
  let reach := growN adj cls.length [nodes.headD (0, 0)]
  nodes.all (fun n => deg n ≤ 2) && (ends.length == 0 || ends.length == 2)
    && ends.all (fun n => (gluedTo t T n).isNone)
    && nodes.length == cls.length + (if ends.isEmpty then 0 else 1)
    && nodes.all (reach.contains ·)

def connectedChildren (t : Tables) (T : Nat) : Bool :=
  let ss := slotsOf t T
  let adj := fun s => ((Gof t T).map (fun gp =>
    if gp.1.1 == s then [gp.2.1] else if gp.2.1 == s then [gp.1.1] else [])).flatten.eraseDups
  let reach := growN adj 8 [ss.headD 0]
  ss.all (reach.contains ·)

def c4_ok (t : Tables) : Bool :=
  allTypes.all (fun T =>
    let nF := (slotsOf t T).length
    let nE := (Gof t T).length + (edgesInB t T).length
    let P := cornerClasses t T
    (P.length + nF == nE + 1) && connectedChildren t T && P.all (linkOk t T))

/-! ## C5: corner angles, over the period of the first/last directions -/

abbrev FLState := List (List (Int × Int))

def flOf (L : List (List (List Int))) : FLState := L.map (fun ws => ws.map (fun w => (w.headD 0, w.getLastD 0)))

def flStep (t : Tables) (st : FLState) : FLState :=
  allTypes.map (fun T => (t.B.getD T []).map (fun arc =>
    let f := arc.headD (0, 0)
    let l := arc.getLastD (0, 0)
    (dapply (phi t f.1) ((st.getD (child t T f.1) []).getD f.2 (0, 0)).2,
     dapply (phi t l.1) ((st.getD (child t T l.1) []).getD l.2 (0, 0)).1)))

def flIter (t : Tables) (st : FLState) : Nat → FLState
  | 0 => st
  | k + 1 => flStep t (flIter t st k)

def turnAt (st : FLState) (T c : Nat) : Int :=
  let d := (((st.getD T []).getD c (0, 0)).1 - ((st.getD T []).getD ((c + 5) % 6) (0, 0)).2) % 12
  if d > 6 then d - 12 else d

def isCycleClass (t : Tables) (T : Nat) (cls : List Corner) : Bool :=
  let nodes := (cls.map (cornerEdges t T)).flatten.eraseDups
  nodes.all (fun n => (cls.filter (fun x => (cornerEdges t T x).contains n)).length == 2)

def parentCornerOf (t : Tables) (T : Nat) (cls : List Corner) : Option Nat :=
  allEdges.find? (fun j => cls.contains (CT t T j))

def anglesOk (t : Tables) (st : FLState) : Bool :=
  let next := flStep t st
  allTypes.all (fun T => (cornerClasses t T).all (fun cls =>
    let n : Int := cls.length
    let turns := cls.map (fun x => turnAt st (child t T x.1) x.2)
    let tot := turns.foldl (· + ·) 0
    turns.all (fun tt => tt != 6) &&
    (if isCycleClass t T cls then tot == 6 * (n - 2)
     else tot > 6 * (n - 2) && tot < 6 * n &&
       (match parentCornerOf t T cls with
        | none => true
        | some j => turnAt next T j == tot - 6 * (n - 1)))))

/-! ## C6: quad points -/

def neededBase (t : Tables) : List (Nat × Nat) :=
  ((allTypes.map (fun P => (allSlots.map (fun s =>
    (if hasChild t P s && s ≥ 1 && hasChild t P (s - 1) then [(child t P s, tRulesTo.getD (s - 1) 0)] else [])
    ++ (if hasChild t P s && s ≤ 6 && hasChild t P (s + 1) then [(child t P s, tRulesFrom.getD s 0)] else []))).flatten)).flatten).eraseDups

def neededStep (t : Tables) (N : List (Nat × Nat)) : List (Nat × Nat) :=
  (N ++ ((allTypes.map (fun P => ((List.range 4).map (fun i =>
    if N.contains (P, i) then [(child t P (superQuad.getD i (0, 0)).1, (superQuad.getD i (0, 0)).2)] else [])).flatten)).flatten)).eraseDups

def neededN (t : Tables) : Nat → List (Nat × Nat) → List (Nat × Nat)
  | 0, N => N
  | n + 1, N => neededN t n (neededStep t N)

def needed (t : Tables) : List (Nat × Nat) := neededN t 10 (neededBase t)

def c6_ok (t : Tables) (Qt : List (List Int)) : Bool :=
  (needed t).all (fun p => qc Qt p.1 p.2 ≥ 0) &&
  (needed t).all (fun p =>
    let T := p.1; let i := p.2
    let s := (superQuad.getD i (0, 0)).1; let j := (superQuad.getD i (0, 0)).2
    let cj := qc Qt (child t T s) j
    cj ≥ 0 && sameClass (cornerClasses t T) (s, cj.toNat) (CT t T (qc Qt T i).toNat))

/-! ## C7: burial -/

def exposed (t : Tables) : Nat → List Nat → List Nat → List Nat
  | _, ex, [] => ex
  | T, ex, s :: addr =>
    exposed t (child t T s) ((ex.map (fun j => ((Bof t T j).filter (fun p => p.1 == s)).map (·.2))).flatten.eraseDups) addr

def buried (t : Tables) (T : Nat) (addr : List Nat) : Bool := (exposed t T allEdges addr).isEmpty

/-! ## The routing operator -/

/-- The operator reads only how many dots each meta-edge carries; the parent's count on edge j is
  the sum over the child edges composing it. -/
abbrev Dots := List (List Nat)
abbrev RState := List (List (Nat × Nat) × Nat)

def dotsStep (t : Tables) (D : Dots) : Dots :=
  allTypes.map (fun T => (t.B.getD T []).map (fun arc =>
    (arc.map (fun p => (D.getD (child t T p.1) []).getD p.2 0)).foldl (· + ·) 0))

def countsOf (P : List (List (List Bool))) : Dots := P.map (fun ws => ws.map (fun w => (w.filter id).length))
def ndots (D : Dots) (T e : Nat) : Nat := (D.getD T []).getD e 0
def dotIndex (D : Dots) (T e i : Nat) : Nat := ((List.range e).map (ndots D T)).foldl (· + ·) 0 + i

def outerNodes (t : Tables) (D : Dots) (T : Nat) : List Corner :=
  ((edgesInB t T).map (fun p =>
    let n := ndots D (child t T p.1) p.2
    (List.range n).map (fun i => (p.1, dotIndex D (child t T p.1) p.2 (n - 1 - i))))).flatten

abbrev Edge := Corner × Corner

def linkEdges (t : Tables) (D : Dots) (S : RState) (T : Nat) : List Edge :=
  ((slotsOf t T).map (fun s => (S.getD (child t T s) ([], 0)).1.map (fun ab => ((s, ab.1), (s, ab.2))))).flatten
  ++ ((Gof t T).map (fun gp =>
       let s := gp.1.1; let e := gp.1.2; let u := gp.2.1; let f := gp.2.2
       let n := ndots D (child t T s) e
       (List.range n).map (fun i =>
         ((s, dotIndex D (child t T s) e i), (u, dotIndex D (child t T u) f (n - 1 - i)))))).flatten

def neighbours (E : List Edge) (x : Corner) : List Corner :=
  (E.filter (fun ed => ed.1 == x || ed.2 == x)).map (fun ed => if ed.1 == x then ed.2 else ed.1)

/-- Walk from an outer node along chords and welds until another outer node; fuel bounds it. -/
def walk (E : List Edge) (outer : List Corner) : Nat → Corner → Corner → List Corner → List Corner
  | 0, _, cur, acc => (cur :: acc).reverse
  | n + 1, prev, cur, acc =>
    if outer.contains cur && !acc.isEmpty then (cur :: acc).reverse
    else match (neighbours E cur).filter (fun y => y != prev) with
      | [] => (cur :: acc).reverse
      | y :: _ => walk E outer n cur y (cur :: acc)

def arcFrom (E : List Edge) (outer : List Corner) (x : Corner) : List Corner :=
  walk E outer (2 * E.length + 2) x x []

def indexOf (xs : List Corner) (x : Corner) : Nat := (xs.takeWhile (fun y => y != x)).length

def nodesOf (E : List Edge) : List Corner := (E.map (fun ed => [ed.1, ed.2])).flatten.eraseDups

def degreesOk (E : List Edge) (outer : List Corner) : Bool :=
  (nodesOf E).all (fun x => (neighbours E x).length == (if outer.contains x then 1 else 2))

/-- Outer nodes are enumerated in outline order, so keeping the first occurrence of each pair
  lists the pairs by their smaller index, the order of the level-1 data. -/
def Fpairs (E : List Edge) (outer : List Corner) : List (Nat × Nat) :=
  (outer.map (fun x =>
    let y := (arcFrom E outer x).getLastD x
    (min (indexOf outer x) (indexOf outer y), max (indexOf outer x) (indexOf outer y)))).eraseDups

def onArcs (E : List Edge) (outer : List Corner) : List Corner := (outer.map (arcFrom E outer)).flatten

def newCircuits (E : List Edge) (outer : List Corner) : Nat :=
  let on := onArcs E outer
  let rest := (nodesOf E).filter (fun x => !on.contains x)
  (rest.filter (fun x => (walk E [] (2 * E.length + 2) x x []).all (fun y => !pairLess y x))).length

def Fstep (t : Tables) (D : Dots) (S : RState) : RState :=
  allTypes.map (fun T =>
    let E := linkEdges t D S T
    let outer := outerNodes t D T
    (Fpairs E outer, ((slotsOf t T).map (fun s => (S.getD (child t T s) ([], 0)).2)).foldl (· + ·) 0 + newCircuits E outer))

def degreesAllOk (t : Tables) (D : Dots) (S : RState) : Bool :=
  allTypes.all (fun T => degreesOk (linkEdges t D S T) (outerNodes t D T))

/-- One substitution step on (children's dot counts, children's states). -/
def Phi (t : Tables) (x : Dots × RState) : Dots × RState := (dotsStep t x.1, Fstep t x.1 x.2)

def orbit (t : Tables) (x : Dots × RState) : Nat → Dots × RState
  | 0 => x
  | k + 1 => Phi t (orbit t x k)

def state1 (P : List (List (List Bool))) (S : List (List (Nat × Nat))) : Dots × RState :=
  (countsOf P, S.map (fun ps => (ps, 0)))

def zeroCircuits (x : Dots × RState) : Bool := allTypes.all (fun T => (x.2.getD T ([], 0)).2 == 0)
def psiOneArc (x : Dots × RState) : Bool := (x.2.getD 8 ([], 0)).1 == [(0, 1)]
def dotCounts (D : Dots) : List Nat := allTypes.map (fun T => (allEdges.map (ndots D T)).foldl (· + ·) 0)

/-! ## Periodicity: a property checked over one period of a fixed map holds forever -/

def iterate {α : Type} (f : α → α) : Nat → α → α
  | 0, x => x
  | k + 1, x => f (iterate f k x)

theorem iterate_add {α : Type} (f : α → α) (m n : Nat) (x : α) :
    iterate f (m + n) x = iterate f m (iterate f n x) := by
  induction m with
  | zero => simp [iterate]
  | succ m ih => simp [Nat.succ_add, iterate, ih]

theorem iterate_period_all {α : Type} (f : α → α) (P : α → Prop) (p : Nat) (x : α)
    (hp : 0 < p) (hper : iterate f p x = x) (hok : ∀ i, i < p → P (iterate f i x)) :
    ∀ k, P (iterate f k x) := by
  intro k
  induction k using Nat.strongRecOn with
  | _ k ih =>
    by_cases hk : k < p
    · exact hok k hk
    · have hkp : k - p + p = k := Nat.sub_add_cancel (Nat.le_of_not_lt hk)
      have : iterate f k x = iterate f (k - p) x := by
        rw [← hkp, iterate_add, hper, hkp]
      rw [this]
      exact ih (k - p) (by omega)

theorem orbit_eq_iterate (t : Tables) (x : Dots × RState) (k : Nat) : orbit t x k = iterate (Phi t) k x := by
  induction k with
  | zero => rfl
  | succ k ih => simp [orbit, iterate, ih]

theorem flIter_eq_iterate (t : Tables) (st : FLState) (k : Nat) : flIter t st k = iterate (flStep t) k st := by
  induction k with
  | zero => rfl
  | succ k ih => simp [flIter, iterate, ih]

/-- A period-2 orbit of the routing operator with zero circuits and a one-arc Psi on both states
  gives zero circuits and a one-arc Psi at every level. -/
theorem routing_all_levels (t : Tables) (x : Dots × RState)
    (hper : orbit t x 2 = x)
    (h0 : zeroCircuits x = true ∧ psiOneArc x = true)
    (h1 : zeroCircuits (orbit t x 1) = true ∧ psiOneArc (orbit t x 1) = true) :
    ∀ k, zeroCircuits (orbit t x k) = true ∧ psiOneArc (orbit t x k) = true := by
  intro k
  rw [orbit_eq_iterate]
  apply iterate_period_all (Phi t) (fun y => zeroCircuits y = true ∧ psiOneArc y = true) 2 x (by decide)
    (by rw [← orbit_eq_iterate]; exact hper)
  intro i hi
  rw [← orbit_eq_iterate]
  match i, hi with
  | 0, _ => exact h0
  | 1, _ => exact h1

theorem angles_all_levels (t : Tables) (st : FLState) (p : Nat) (hp : 0 < p)
    (hper : flIter t st p = st) (hok : ∀ i, i < p → anglesOk t (flIter t st i) = true) :
    ∀ k, anglesOk t (flIter t st k) = true := by
  intro k
  rw [flIter_eq_iterate]
  apply iterate_period_all (flStep t) (fun y => anglesOk t y = true) p st hp
    (by rw [← flIter_eq_iterate]; exact hper)
  intro i hi
  rw [← flIter_eq_iterate]
  exact hok i hi

theorem dotCounts_all_levels (t : Tables) (x : Dots × RState) (cs : List Nat)
    (hper : orbit t x 2 = x)
    (h0 : dotCounts x.1 = cs) (h1 : dotCounts (orbit t x 1).1 = cs) :
    ∀ k, dotCounts (orbit t x k).1 = cs := by
  intro k
  rw [orbit_eq_iterate]
  apply iterate_period_all (Phi t) (fun y => dotCounts y.1 = cs) 2 x (by decide)
    (by rw [← orbit_eq_iterate]; exact hper)
  intro i hi
  rw [← orbit_eq_iterate]
  match i, hi with
  | 0, _ => exact h0
  | 1, _ => exact h1

end FASS
