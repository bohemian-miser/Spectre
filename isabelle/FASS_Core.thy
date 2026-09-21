(*
  The combinatorial core of docs/FASS_THEOREM.md, for Isabelle/HOL.

  What this development checks, with Isabelle re-running every computation:

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

  What it does NOT check, because it is geometry rather than combinatorics:

  * that the tables describe the actual level-1 and level-2 patches (01-tables.ts,
    exact arithmetic), and that those patches are valid (Lemma 1.1 of the write-up);
  * the covering-space argument of §4 (non-overlap at every level, exhaustion);
  * the vertex stars and chord crossings of §6.

  Those are the inputs; everything below them is re-derived by the kernel.
  Conventions: types are 0..8 (Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi),
  slots 0..7, meta-edges 0..5, directions 0..11. A direction map x |-> s*x + c is
  the pair (s, c). Words are functions nat => nat => int list (type, edge).
*)
theory FASS_Core
  imports Main
begin

section \<open>Tables\<close>

record tables =
  classes :: "int list list"
  rules   :: "nat list list"
  B       :: "(nat \<times> nat) list list list"
  G       :: "((nat \<times> nat) \<times> (nat \<times> nat)) list list"
  Q       :: "int list list"
  Q1      :: "int list list"
  linear  :: "(int \<times> int) list"

definition nTypes :: nat where "nTypes = 9"

text \<open>A lexicographic order on pairs, so that nothing here needs HOL-Library.\<close>
definition pairLess :: "nat \<times> nat \<Rightarrow> nat \<times> nat \<Rightarrow> bool" where
  "pairLess x y = (fst x < fst y \<or> (fst x = fst y \<and> snd x < snd y))"
definition allTypes :: "nat list" where "allTypes = [0..<9]"
definition allSlots :: "nat list" where "allSlots = [0..<8]"
definition allEdges :: "nat list" where "allEdges = [0..<6]"

definition child :: "tables \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> nat" where
  "child t T s = rules t ! T ! s"

definition hasChild :: "tables \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> bool" where
  "hasChild t T s = (child t T s \<noteq> 9)"

definition slotsOf :: "tables \<Rightarrow> nat \<Rightarrow> nat list" where
  "slotsOf t T = filter (hasChild t T) allSlots"

text \<open>Parent corner j is child corner e+1 of the first child edge (s,e) of parent edge j:
  the parent traverses child edges backwards.\<close>
definition CT :: "tables \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> nat \<times> nat" where
  "CT t T j = (fst (hd (B t ! T ! j)), (snd (hd (B t ! T ! j)) + 1) mod 6)"

section \<open>Direction maps\<close>

type_synonym dmap = "int \<times> int"

definition dapply :: "dmap \<Rightarrow> int \<Rightarrow> int" where
  "dapply f x = (fst f * x + snd f) mod 12"

definition dcomp :: "dmap \<Rightarrow> dmap \<Rightarrow> dmap" where
  "dcomp f g = (fst f * fst g, (fst f * snd g + snd f) mod 12)"

definition dinv :: "dmap \<Rightarrow> dmap" where
  "dinv f = (fst f, (- (fst f * snd f)) mod 12)"

definition dneg :: dmap where "dneg = (1, 6)"

definition validm :: "dmap \<Rightarrow> bool" where
  "validm f = (fst f = 1 \<or> fst f = -1)"

definition Lmap :: "tables \<Rightarrow> nat \<Rightarrow> dmap" where "Lmap t s = linear t ! s"

text \<open>What a child's word undergoes when its parent traverses the child edge backwards:
  reverse it and apply phi_s = neg o L_s.\<close>
definition phi :: "tables \<Rightarrow> nat \<Rightarrow> dmap" where "phi t s = dcomp dneg (Lmap t s)"

definition mapw :: "dmap \<Rightarrow> int list \<Rightarrow> int list" where "mapw f w = map (dapply f) w"
definition negw :: "int list \<Rightarrow> int list" where "negw w = map (\<lambda>x. (x + 6) mod 12) w"
definition revneg :: "int list \<Rightarrow> int list" where "revneg w = rev (negw w)"

definition validw :: "int list \<Rightarrow> bool" where
  "validw w = (\<forall>x \<in> set w. 0 \<le> x \<and> x < 12)"

lemma validm_dcomp: "validm f \<Longrightarrow> validm g \<Longrightarrow> validm (dcomp f g)"
  by (auto simp: validm_def dcomp_def)

lemma validm_dinv: "validm f \<Longrightarrow> validm (dinv f)"
  by (auto simp: validm_def dinv_def)

lemma validm_dneg: "validm dneg"
  by (simp add: validm_def dneg_def)

lemma dapply_comp:
  assumes "validm f" "validm g"
  shows "dapply f (dapply g x) = dapply (dcomp f g) x"
proof -
  obtain s1 c1 where f: "f = (s1, c1)" by (cases f)
  obtain s2 c2 where g: "g = (s2, c2)" by (cases g)
  have "s1 = 1 \<or> s1 = -1" "s2 = 1 \<or> s2 = -1" using assms by (auto simp: validm_def f g)
  then show ?thesis unfolding dapply_def dcomp_def f g by (elim disjE) (simp; presburger)+
qed

lemma mapw_comp:
  assumes "validm f" "validm g"
  shows "mapw f (mapw g w) = mapw (dcomp f g) w"
  using assms by (simp add: mapw_def dapply_comp)

lemma dapply_neg:
  assumes "validm f"
  shows "dapply f ((x + 6) mod 12) = (dapply f x + 6) mod 12"
proof -
  obtain s c where f: "f = (s, c)" by (cases f)
  have "s = 1 \<or> s = -1" using assms by (auto simp: validm_def f)
  then show ?thesis unfolding dapply_def f by (elim disjE) (simp; presburger)+
qed

lemma mapw_negw: "validm f \<Longrightarrow> mapw f (negw w) = negw (mapw f w)"
  by (simp add: mapw_def negw_def dapply_neg)

lemma mapw_rev: "mapw f (rev w) = rev (mapw f w)"
  by (simp add: mapw_def rev_map)

lemma dcomp_dinv:
  assumes "validm f"
  shows "dcomp f (dinv f) = (1, 0)"
proof -
  obtain s c where f: "f = (s, c)" by (cases f)
  have "s = 1 \<or> s = -1" using assms by (auto simp: validm_def f)
  then show ?thesis unfolding dcomp_def dinv_def f by (elim disjE) (simp; presburger)+
qed

lemma mapw_id: "validw w \<Longrightarrow> mapw (1, 0) w = w"
  by (induction w) (auto simp: mapw_def dapply_def validw_def)

lemma validw_mapw: "validw (mapw f w)"
  by (auto simp: validw_def mapw_def dapply_def)

lemma validw_rev: "validw (rev w) = validw w"
  by (simp add: validw_def)

lemma validw_concat: "(\<forall>w \<in> set ws. validw w) \<Longrightarrow> validw (concat ws)"
  by (auto simp: validw_def)

section \<open>Words and the substitution step\<close>

type_synonym words = "nat \<Rightarrow> nat \<Rightarrow> int list"

definition stepW :: "tables \<Rightarrow> words \<Rightarrow> words" where
  "stepW t W = (\<lambda>a e. concat (map (\<lambda>p. rev (mapw (phi t (fst p)) (W (child t a (fst p)) (snd p)))) (B t ! a ! e)))"

definition iterW :: "tables \<Rightarrow> words \<Rightarrow> nat \<Rightarrow> words" where
  "iterW t W1 k = ((stepW t) ^^ k) W1"

definition validW :: "words \<Rightarrow> bool" where
  "validW W = (\<forall>a e. validw (W a e))"

lemma validW_step: "validW (stepW t W)"
  unfolding validW_def stepW_def
  by (auto intro!: validw_concat simp: validw_rev validw_mapw)

lemma validW_iter: "validW W1 \<Longrightarrow> validW (iterW t W1 k)"
  by (cases k) (auto simp: iterW_def validW_step)

section \<open>Word claims\<close>

text \<open>A claim ((a,e),(b,f),g) says: the class-c(a,e) edge of type a, moved by g, is the
  reversed class-c(b,f) edge of type b.\<close>
type_synonym claim = "(nat \<times> nat) \<times> (nat \<times> nat) \<times> dmap"

definition holds :: "words \<Rightarrow> claim \<Rightarrow> bool" where
  "holds W c = (mapw (snd (snd c)) (W (fst (fst c)) (snd (fst c)))
              = revneg (W (fst (fst (snd c))) (snd (fst (snd c)))))"

definition validc :: "tables \<Rightarrow> claim \<Rightarrow> bool" where
  "validc t c = validm (snd (snd c))"

definition validL :: "tables \<Rightarrow> bool" where
  "validL t = (\<forall>s \<in> set allSlots. validm (Lmap t s))"

lemma validm_phi: "validL t \<Longrightarrow> s < 8 \<Longrightarrow> validm (phi t s)"
  by (simp add: phi_def validL_def allSlots_def validm_dcomp validm_dneg)

definition subclaims :: "tables \<Rightarrow> claim \<Rightarrow> claim list" where
  "subclaims t c = (let a = fst (fst c); e = snd (fst c); b = fst (fst (snd c)); f = snd (fst (snd c)); g = snd (snd c)
     in map (\<lambda>q. ((child t a (fst (fst q)), snd (fst q)),
                  (child t b (fst (snd q)), snd (snd q)),
                  dcomp (dinv (phi t (fst (snd q)))) (dcomp g (phi t (fst (fst q))))))
            (zip (B t ! a ! e) (rev (B t ! b ! f))))"

definition expandable :: "tables \<Rightarrow> claim \<Rightarrow> bool" where
  "expandable t c = (length (B t ! fst (fst c) ! snd (fst c)) = length (B t ! fst (fst (snd c)) ! snd (fst (snd c))))"

definition slotsOk :: "tables \<Rightarrow> claim \<Rightarrow> bool" where
  "slotsOk t c = ((\<forall>p \<in> set (B t ! fst (fst c) ! snd (fst c)). fst p < 8)
                \<and> (\<forall>p \<in> set (B t ! fst (fst (snd c)) ! snd (fst (snd c))). fst p < 8))"

text \<open>The heart of C2: if a claim's subclaims all hold at one level, the claim holds at the next.\<close>
lemma holds_step:
  assumes L: "validL t" and V: "validW W" and vc: "validc t c"
      and ex: "expandable t c" and sl: "slotsOk t c"
      and sub: "\<forall>c' \<in> set (subclaims t c). holds W c'"
  shows "holds (stepW t W) c"
proof -
  define a where "a = fst (fst c)"
  define e where "e = snd (fst c)"
  define b where "b = fst (fst (snd c))"
  define f where "f = snd (fst (snd c))"
  define g where "g = snd (snd c)"
  have vg: "validm g" using vc by (simp add: validc_def g_def)
  define Ba where "Ba = B t ! a ! e"
  define Bb where "Bb = rev (B t ! b ! f)"
  have len: "length Ba = length Bb" using ex by (simp add: expandable_def Ba_def Bb_def a_def e_def b_def f_def)
  define F where "F = (\<lambda>p. rev (mapw (phi t (fst p)) (W (child t a (fst p)) (snd p))))"
  define F' where "F' = (\<lambda>q. rev (mapw (phi t (fst q)) (W (child t b (fst q)) (snd q))))"
  have lhs: "mapw g (stepW t W a e) = concat (map (\<lambda>p. mapw g (F p)) Ba)"
    by (simp add: stepW_def F_def Ba_def mapw_def map_concat comp_def)
  have rhs: "revneg (stepW t W b f) = concat (map (\<lambda>q. rev (negw (F' q))) Bb)"
    by (simp add: stepW_def F'_def Bb_def revneg_def negw_def map_concat rev_concat rev_map comp_def)
  have term: "\<And>i. i < length Ba \<Longrightarrow> mapw g (F (Ba ! i)) = rev (negw (F' (Bb ! i)))"
  proof -
    fix i assume i: "i < length Ba"
    define s where "s = fst (Ba ! i)"
    define x where "x = snd (Ba ! i)"
    define u where "u = fst (Bb ! i)"
    define y where "y = snd (Bb ! i)"
    have s8: "s < 8" using sl i by (auto simp: slotsOk_def s_def Ba_def a_def e_def)
    have u8: "u < 8" using sl i len by (auto simp: slotsOk_def u_def Bb_def b_def f_def)
    have vs: "validm (phi t s)" and vu: "validm (phi t u)" using L s8 u8 by (simp_all add: validm_phi)
    define Wa where "Wa = W (child t a s) x"
    define Wb where "Wb = W (child t b u) y"
    have vWa: "validw Wa" using V by (simp add: validW_def Wa_def)
    define h where "h = dcomp g (phi t s)"
    have vh: "validm h" using vg vs by (simp add: h_def validm_dcomp)
    have zipmem: "(Ba ! i, Bb ! i) \<in> set (zip Ba Bb)" using i len by (auto simp: set_zip)
    have inS: "((child t a s, x), (child t b u, y), dcomp (dinv (phi t u)) h) \<in> set (subclaims t c)"
    proof -
      have "((child t a s, x), (child t b u, y), dcomp (dinv (phi t u)) h)
            \<in> (\<lambda>q. ((child t a (fst (fst q)), snd (fst q)), (child t b (fst (snd q)), snd (snd q)),
                     dcomp (dinv (phi t (fst (snd q)))) (dcomp g (phi t (fst (fst q)))))) ` set (zip Ba Bb)"
        using zipmem by (intro image_eqI[where x = "(Ba ! i, Bb ! i)"]) (simp_all add: s_def x_def u_def y_def h_def)
      then show ?thesis by (simp add: subclaims_def Let_def Ba_def Bb_def a_def e_def b_def f_def g_def)
    qed
    then have sc: "mapw (dcomp (dinv (phi t u)) h) Wa = revneg Wb"
      using sub by (auto simp: holds_def Wa_def Wb_def)
    have A: "mapw (phi t u) (mapw (dcomp (dinv (phi t u)) h) Wa) = mapw h Wa"
    proof -
      have "mapw (dcomp (dinv (phi t u)) h) Wa = mapw (dinv (phi t u)) (mapw h Wa)"
        using vu vh by (simp add: mapw_comp validm_dinv)
      then have "mapw (phi t u) (mapw (dcomp (dinv (phi t u)) h) Wa) = mapw (dcomp (phi t u) (dinv (phi t u))) (mapw h Wa)"
        using vu by (simp add: mapw_comp validm_dinv)
      also have "\<dots> = mapw (1, 0) (mapw h Wa)" using vu by (simp add: dcomp_dinv)
      also have "\<dots> = mapw h Wa" by (simp add: mapw_id validw_mapw)
      finally show ?thesis .
    qed
    have key: "mapw h Wa = rev (negw (mapw (phi t u) Wb))"
    proof -
      have "mapw h Wa = mapw (phi t u) (revneg Wb)" using A sc by simp
      also have "\<dots> = rev (negw (mapw (phi t u) Wb))" using vu by (simp add: revneg_def mapw_rev mapw_negw)
      finally show ?thesis .
    qed
    have "mapw g (F (Ba ! i)) = rev (mapw h Wa)"
      by (simp add: F_def h_def s_def x_def Wa_def mapw_rev mapw_comp vg vs)
    also have "\<dots> = negw (mapw (phi t u) Wb)" using key by simp
    also have "\<dots> = rev (negw (F' (Bb ! i)))"
      by (simp add: F'_def u_def y_def Wb_def negw_def rev_map)
    finally show "mapw g (F (Ba ! i)) = rev (negw (F' (Bb ! i)))" .
  qed
  have "map (\<lambda>p. mapw g (F p)) Ba = map (\<lambda>q. rev (negw (F' q))) Bb"
    using len term by (intro nth_equalityI) auto
  then show ?thesis unfolding holds_def
    using lhs rhs by (simp add: a_def e_def b_def f_def g_def)
qed

definition closedSet :: "tables \<Rightarrow> claim list \<Rightarrow> bool" where
  "closedSet t S = (\<forall>c \<in> set S. validc t c \<and> expandable t c \<and> slotsOk t c \<and> set (subclaims t c) \<subseteq> set S)"

theorem claims_all_levels:
  assumes L: "validL t" and V1: "validW W1"
      and cl: "closedSet t S" and base: "\<forall>c \<in> set S. holds W1 c"
  shows "\<forall>c \<in> set S. holds (iterW t W1 k) c"
proof (induction k)
  case 0 then show ?case using base by (simp add: iterW_def)
next
  case (Suc k)
  have V: "validW (iterW t W1 k)" using V1 by (rule validW_iter)
  have "holds (stepW t (iterW t W1 k)) c" if "c \<in> set S" for c
    using cl that Suc.IH V L by (intro holds_step) (auto simp: closedSet_def)
  then show ?case by (simp add: iterW_def)
qed

text \<open>Executable closure: add subclaims until nothing new appears, with a round bound.\<close>
fun closureIter :: "tables \<Rightarrow> nat \<Rightarrow> claim list \<Rightarrow> claim list" where
  "closureIter t 0 S = S"
| "closureIter t (Suc n) S = closureIter t n (remdups (S @ concat (map (subclaims t) S)))"

definition symc :: "claim \<Rightarrow> claim" where
  "symc c = (fst (snd c), fst c, dinv (snd (snd c)))"

definition seeds :: "tables \<Rightarrow> claim list" where
  "seeds t = remdups (concat (map (\<lambda>T. concat (map (\<lambda>gp. let c = ((child t T (fst (fst gp)), snd (fst gp)),
                                                          (child t T (fst (snd gp)), snd (snd gp)),
                                                          dcomp (dinv (Lmap t (fst (snd gp)))) (Lmap t (fst (fst gp))))
                                                   in [c, symc c]) (G t ! T))) allTypes))"

definition wordsOf :: "int list list list \<Rightarrow> words" where
  "wordsOf L = (\<lambda>a e. L ! a ! e)"

definition validData :: "int list list list \<Rightarrow> bool" where
  "validData L = (length L = 9 \<and> (\<forall>ws \<in> set L. length ws = 6 \<and> (\<forall>w \<in> set ws. validw w)))"

lemma validW_of_data:
  assumes "validData L" shows "validW (wordsOf L)"
proof -
  have "validw (L ! a ! e)" for a e
  proof (cases "a < 9")
    case True
    then have "L ! a \<in> set L" using assms by (simp add: validData_def)
    then have l6: "length (L ! a) = 6" and vv: "\<forall>w \<in> set (L ! a). validw w" using assms by (auto simp: validData_def)
    show ?thesis
    proof (cases "e < 6")
      case True then show ?thesis using l6 vv by simp
    next
      case False then show ?thesis using l6 by (simp add: validw_def)
    qed
  next
    case False
    then have "L ! a = []" using assms by (simp add: validData_def)
    then show ?thesis by (simp add: validw_def)
  qed
  then show ?thesis by (simp add: validW_def wordsOf_def)
qed

section \<open>Label claims\<close>

text \<open>Leaf labels are (sign, major, minor). Across a glued pair, label i of one edge meets
  label n-1-i of the other with the same major and opposite sign, except the self-glued class 0,
  whose minors are reversed within its seam (of length zeroLen: 1 for hexagons, 2 for spectres).\<close>
type_synonym lab = "int \<times> nat \<times> nat"
type_synonym labwords = "nat \<Rightarrow> nat \<Rightarrow> lab list"

definition flipLab :: "nat \<Rightarrow> lab \<Rightarrow> lab" where
  "flipLab zl l = (if fst (snd l) = 0 then (fst l, 0, zl - 1 - snd (snd l)) else (- fst l, fst (snd l), snd (snd l)))"

definition holdsL :: "nat \<Rightarrow> labwords \<Rightarrow> claim \<Rightarrow> bool" where
  "holdsL zl Lw c = (Lw (fst (fst c)) (snd (fst c)) = rev (map (flipLab zl) (Lw (fst (fst (snd c))) (snd (fst (snd c))))))"

definition stepL :: "tables \<Rightarrow> labwords \<Rightarrow> labwords" where
  "stepL t Lw = (\<lambda>a e. concat (map (\<lambda>p. rev (Lw (child t a (fst p)) (snd p))) (B t ! a ! e)))"

definition iterL :: "tables \<Rightarrow> labwords \<Rightarrow> nat \<Rightarrow> labwords" where
  "iterL t L1 k = ((stepL t) ^^ k) L1"

lemma holdsL_step:
  assumes ex: "expandable t c"
      and sub: "\<forall>c' \<in> set (subclaims t c). holdsL zl Lw c'"
  shows "holdsL zl (stepL t Lw) c"
proof -
  define a where "a = fst (fst c)"
  define e where "e = snd (fst c)"
  define b where "b = fst (fst (snd c))"
  define f where "f = snd (fst (snd c))"
  define Ba where "Ba = B t ! a ! e"
  define Bb where "Bb = rev (B t ! b ! f)"
  have len: "length Ba = length Bb" using ex by (simp add: expandable_def Ba_def Bb_def a_def e_def b_def f_def)
  define F where "F = (\<lambda>p. rev (Lw (child t a (fst p)) (snd p)))"
  define F' where "F' = (\<lambda>q. rev (Lw (child t b (fst q)) (snd q)))"
  have lhs: "stepL t Lw a e = concat (map F Ba)" by (simp add: stepL_def F_def Ba_def)
  have rhs: "rev (map (flipLab zl) (stepL t Lw b f)) = concat (map (\<lambda>q. rev (map (flipLab zl) (F' q))) Bb)"
    by (simp add: stepL_def F'_def Bb_def map_concat rev_concat rev_map comp_def)
  have term: "\<And>i. i < length Ba \<Longrightarrow> F (Ba ! i) = rev (map (flipLab zl) (F' (Bb ! i)))"
  proof -
    fix i assume i: "i < length Ba"
    have zipmem: "(Ba ! i, Bb ! i) \<in> set (zip Ba Bb)" using i len by (auto simp: set_zip)
    have "((child t a (fst (Ba ! i)), snd (Ba ! i)), (child t b (fst (Bb ! i)), snd (Bb ! i)),
           dcomp (dinv (phi t (fst (Bb ! i)))) (dcomp (snd (snd c)) (phi t (fst (Ba ! i)))))
          \<in> (\<lambda>q. ((child t a (fst (fst q)), snd (fst q)), (child t b (fst (snd q)), snd (snd q)),
                   dcomp (dinv (phi t (fst (snd q)))) (dcomp (snd (snd c)) (phi t (fst (fst q)))))) ` set (zip Ba Bb)"
      using zipmem by (intro image_eqI[where x = "(Ba ! i, Bb ! i)"]) simp_all
    then have "((child t a (fst (Ba ! i)), snd (Ba ! i)), (child t b (fst (Bb ! i)), snd (Bb ! i)),
                dcomp (dinv (phi t (fst (Bb ! i)))) (dcomp (snd (snd c)) (phi t (fst (Ba ! i))))) \<in> set (subclaims t c)"
      by (simp add: subclaims_def Let_def Ba_def Bb_def a_def e_def b_def f_def)
    then have "Lw (child t a (fst (Ba ! i))) (snd (Ba ! i)) = rev (map (flipLab zl) (Lw (child t b (fst (Bb ! i))) (snd (Bb ! i))))"
      using sub by (auto simp: holdsL_def)
    then show "F (Ba ! i) = rev (map (flipLab zl) (F' (Bb ! i)))"
      by (simp add: F_def F'_def rev_map)
  qed
  have "map F Ba = map (\<lambda>q. rev (map (flipLab zl) (F' q))) Bb"
    using len term by (intro nth_equalityI) auto
  then show ?thesis unfolding holdsL_def using lhs rhs by (simp add: a_def e_def b_def f_def)
qed

theorem labclaims_all_levels:
  assumes cl: "closedSet t S" and base: "\<forall>c \<in> set S. holdsL zl L1 c"
  shows "\<forall>c \<in> set S. holdsL zl (iterL t L1 k) c"
proof (induction k)
  case 0 then show ?case using base by (simp add: iterL_def)
next
  case (Suc k)
  have "holdsL zl (stepL t (iterL t L1 k)) c" if "c \<in> set S" for c
    using cl that Suc.IH by (intro holdsL_step) (auto simp: closedSet_def)
  then show ?case by (simp add: iterL_def)
qed

definition labwordsOf :: "lab list list list \<Rightarrow> labwords" where
  "labwordsOf L = (\<lambda>a e. L ! a ! e)"

section \<open>C1: structure\<close>

definition edgesInB :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list" where
  "edgesInB t T = concat (B t ! T)"

definition edgesInG :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list" where
  "edgesInG t T = concat (map (\<lambda>gp. [fst gp, snd gp]) (G t ! T))"

definition allChildEdges :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list" where
  "allChildEdges t T = concat (map (\<lambda>s. map (\<lambda>e. (s, e)) allEdges) (slotsOf t T))"

definition c1_ok :: "tables \<Rightarrow> bool" where
  "c1_ok t = (\<forall>T \<in> set allTypes.
     let used = edgesInB t T @ edgesInG t T in
     distinct used \<and> set used = set (allChildEdges t T)
     \<and> (\<forall>j \<in> set allEdges. B t ! T ! j \<noteq> []))"

section \<open>Corner classes (union-find on lists of lists)\<close>

definition mod6 :: "nat \<Rightarrow> nat" where "mod6 x = x mod 6"

fun findClass :: "(nat \<times> nat) list list \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) list" where
  "findClass [] x = [x]"
| "findClass (c # cs) x = (if x \<in> set c then c else findClass cs x)"

definition sameClass :: "(nat \<times> nat) list list \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) \<Rightarrow> bool" where
  "sameClass P x y = (y \<in> set (findClass P x))"

definition mergeClass :: "(nat \<times> nat) list list \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) list list" where
  "mergeClass P x y = (if sameClass P x y then P
     else (findClass P x @ findClass P y) # filter (\<lambda>c. c \<noteq> findClass P x \<and> c \<noteq> findClass P y) P)"

definition initialClasses :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list list" where
  "initialClasses t T = map (\<lambda>x. [x]) (concat (map (\<lambda>s. map (\<lambda>c. (s, c)) allEdges) (slotsOf t T)))"

text \<open>Glued (s,e)~(u,f): corner (s,e) = corner (u,f+1) and corner (s,e+1) = corner (u,f).
  Consecutive outer edges chain: the end of (s,e), which is child corner e, meets the start of the
  next, which is child corner e'+1.\<close>
definition cornerIdents :: "tables \<Rightarrow> nat \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "cornerIdents t T =
     concat (map (\<lambda>gp. [((fst (fst gp), snd (fst gp)), (fst (snd gp), mod6 (snd (snd gp) + 1))),
                        ((fst (fst gp), mod6 (snd (fst gp) + 1)), (fst (snd gp), snd (snd gp)))]) (G t ! T))
     @ (let outer = edgesInB t T in
        map (\<lambda>i. ((fst (outer ! i), snd (outer ! i)),
                  (fst (outer ! ((i + 1) mod length outer)), mod6 (snd (outer ! ((i + 1) mod length outer)) + 1))))
            [0..<length outer])"

definition cornerClasses :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list list" where
  "cornerClasses t T = foldl (\<lambda>P xy. mergeClass P (fst xy) (snd xy)) (initialClasses t T) (cornerIdents t T)"

definition ctChains :: "tables \<Rightarrow> bool" where
  "ctChains t = (\<forall>T \<in> set allTypes. \<forall>j \<in> set allEdges.
     let P = cornerClasses t T; lastPrev = last (B t ! T ! ((j + 5) mod 6))
     in sameClass P (CT t T j) (fst lastPrev, snd lastPrev))"

section \<open>C3: corner coincidences propagate from the quad chainings\<close>

definition tRulesFrom :: "nat list" where "tRulesFrom = [3, 2, 3, 3, 2, 3, 3]"
definition tRulesTo :: "nat list" where "tRulesTo = [1, 0, 1, 1, 0, 1, 3]"
definition superQuad :: "(nat \<times> nat) list" where "superQuad = [(6, 2), (5, 1), (3, 2), (0, 1)]"

definition qc :: "int list list \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> int" where "qc Qt T i = Qt ! T ! i"

text \<open>Seeds: the chaining of slot s identifies quad[to] of the child at s with quad[from] of the
  child at s-1, both of which the quad-corner table names as corners.\<close>
definition chainSeeds :: "tables \<Rightarrow> int list list \<Rightarrow> nat \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list option" where
  "chainSeeds t Qt T = (let ss = filter (\<lambda>s. hasChild t T s \<and> hasChild t T (s - 1)) [1..<8] in
     if (\<forall>s \<in> set ss. qc Qt (child t T s) (tRulesTo ! (s - 1)) \<ge> 0 \<and> qc Qt (child t T (s - 1)) (tRulesFrom ! (s - 1)) \<ge> 0)
     then Some (map (\<lambda>s. ((s, nat (qc Qt (child t T s) (tRulesTo ! (s - 1)))),
                         (s - 1, nat (qc Qt (child t T (s - 1)) (tRulesFrom ! (s - 1)))))) ss)
     else None)"

text \<open>One round of propagation: a glued pair whose starts are known to coincide has its ends coincide,
  and conversely, because the words agree (C2).\<close>
definition propagate1 :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list list \<Rightarrow> (nat \<times> nat) list list" where
  "propagate1 t T P = foldl (\<lambda>P gp.
     let s = fst (fst gp); e = snd (fst gp); u = fst (snd gp); f = snd (snd gp);
         s1 = (s, e); e1 = (s, mod6 (e + 1)); s2 = (u, mod6 (f + 1)); e2 = (u, f)
     in if sameClass P s1 s2 then mergeClass P e1 e2 else if sameClass P e1 e2 then mergeClass P s1 s2 else P)
     P (G t ! T)"

fun propagateN :: "tables \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list list \<Rightarrow> (nat \<times> nat) list list" where
  "propagateN t T 0 P = P"
| "propagateN t T (Suc n) P = propagateN t T n (propagate1 t T P)"

definition refines :: "(nat \<times> nat) list list \<Rightarrow> (nat \<times> nat) list list \<Rightarrow> bool" where
  "refines Known Abstract = (\<forall>c \<in> set Abstract. \<forall>x \<in> set c. \<forall>y \<in> set c. sameClass Known x y)"

text \<open>SameCorner: corners of two outline-sharing types that are the same point. The greatest fixed
  point of "same CT entry, and the children there are SameCorner", computed by iteration; it is
  verified at level 1 against the corner indices in the shared outline.\<close>
definition nonGammaTypes :: "tables \<Rightarrow> nat list" where
  "nonGammaTypes t = filter (\<lambda>T. \<forall>s \<in> set allSlots. hasChild t T s) allTypes"

definition scStart :: "tables \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "scStart t = [((a, c), (b, d)). a \<leftarrow> nonGammaTypes t, b \<leftarrow> nonGammaTypes t, c \<leftarrow> allEdges, d \<leftarrow> allEdges, CT t a c = CT t b d]"

definition scRefine :: "tables \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "scRefine t S = filter (\<lambda>p. let a = fst (fst p); c = snd (fst p); b = fst (snd p); d = snd (snd p);
                                  s = fst (CT t a c); e = snd (CT t a c)
                              in ((child t a s, e), (child t b s, e)) \<in> set S) S"

fun scIter :: "tables \<Rightarrow> nat \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "scIter t 0 S = S"
| "scIter t (Suc n) S = scIter t n (scRefine t S)"

definition sameCorner :: "tables \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "sameCorner t = scIter t 20 (scStart t)"

definition sameCornerClosed :: "tables \<Rightarrow> bool" where
  "sameCornerClosed t = (scRefine t (sameCorner t) = sameCorner t)"

definition sameCornerBase :: "tables \<Rightarrow> nat list list \<Rightarrow> bool" where
  "sameCornerBase t corners1 = (\<forall>p \<in> set (sameCorner t). corners1 ! fst (fst p) ! snd (fst p) = corners1 ! fst (snd p) ! snd (snd p))"

text \<open>For a parent with an empty slot (Gamma), transfer the coincidences of a parent P without one,
  through corners that the children in the same slot share as points.\<close>
definition transferSeeds :: "tables \<Rightarrow> nat \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "transferSeeds t T = (if (\<forall>s \<in> set allSlots. hasChild t T s) then [] else
     concat (map (\<lambda>P. concat (map (\<lambda>cls.
        let here = [(sp, c). sp \<leftarrow> map fst cls, c \<leftarrow> allEdges, hasChild t T sp,
                    (\<exists>q \<in> set cls. fst q = sp \<and> ((child t T sp, c), (child t P sp, snd q)) \<in> set (sameCorner t))]
        in (if here = [] then [] else map (\<lambda>h. (hd here, h)) (tl here)))
       (cornerClasses t P))) (nonGammaTypes t)))"

definition c3_ok :: "tables \<Rightarrow> int list list \<Rightarrow> bool" where
  "c3_ok t Qt = (\<forall>T \<in> set allTypes.
     case chainSeeds t Qt T of None \<Rightarrow> False
     | Some seedsT \<Rightarrow>
        let A = cornerClasses t T in
        (\<forall>xy \<in> set seedsT. sameClass A (fst xy) (snd xy)) \<and>
        (let K0 = foldl (\<lambda>P xy. mergeClass P (fst xy) (snd xy)) (initialClasses t T) (seedsT @ transferSeeds t T);
             K = propagateN t T 20 K0
         in refines K A))"

section \<open>C4: the glued children form a disk\<close>

definition gluedTo :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) option" where
  "gluedTo t T x = (case filter (\<lambda>gp. fst gp = x \<or> snd gp = x) (G t ! T) of [] \<Rightarrow> None
     | gp # _ \<Rightarrow> Some (if fst gp = x then snd gp else fst gp))"

definition edgeNode :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat)" where
  "edgeNode t T x = (case gluedTo t T x of None \<Rightarrow> x | Some y \<Rightarrow> (if pairLess y x then y else x))"

definition cornerEdges :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) list" where
  "cornerEdges t T x = [edgeNode t T (fst x, mod6 (snd x + 5)), edgeNode t T (fst x, snd x)]"

text \<open>The link of a vertex class: nodes are its incident (glued-identified) edges, each corner joins
  its two edges. It must be a path (two nodes of degree 1, both outer edges) or a cycle.\<close>
definition linkOk :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list \<Rightarrow> bool" where
  "linkOk t T cls = (let nodes = remdups (concat (map (cornerEdges t T) cls));
                         deg = (\<lambda>n. length (filter (\<lambda>x. n \<in> set (cornerEdges t T x)) cls));
                         ends = filter (\<lambda>n. deg n = 1) nodes;
                         adj = (\<lambda>n. concat (map (\<lambda>x. filter (\<lambda>m. m \<noteq> n) (cornerEdges t T x)) (filter (\<lambda>x. n \<in> set (cornerEdges t T x)) cls)));
                         grow = (\<lambda>R. remdups (R @ concat (map adj R)));
                         reach = (grow ^^ length cls) [hd nodes]
                     in (\<forall>n \<in> set nodes. deg n \<le> 2) \<and> (length ends = 0 \<or> length ends = 2)
                        \<and> (\<forall>n \<in> set ends. gluedTo t T n = None)
                        \<and> length nodes = length cls + (if ends = [] then 0 else 1)
                        \<and> set nodes \<subseteq> set reach)"

definition connectedChildren :: "tables \<Rightarrow> nat \<Rightarrow> bool" where
  "connectedChildren t T = (let ss = slotsOf t T;
      adj = (\<lambda>s. remdups (concat (map (\<lambda>gp. if fst (fst gp) = s then [fst (snd gp)] else if fst (snd gp) = s then [fst (fst gp)] else []) (G t ! T))));
      grow = (\<lambda>R. remdups (R @ concat (map adj R)));
      reach = (grow ^^ 8) [hd ss]
    in set ss \<subseteq> set reach)"

definition c4_ok :: "tables \<Rightarrow> bool" where
  "c4_ok t = (\<forall>T \<in> set allTypes.
     let nF = length (slotsOf t T); nE = length (G t ! T) + length (edgesInB t T);
         P = cornerClasses t T; nV = length P
     in int nV - int nE + int nF = 1 \<and> connectedChildren t T \<and> (\<forall>cls \<in> set P. linkOk t T cls))"

section \<open>C5: corner angles, over the period of the first/last directions\<close>

type_synonym flstate = "(int \<times> int) list list"

definition flOf :: "int list list list \<Rightarrow> flstate" where
  "flOf L = map (map (\<lambda>w. (hd w, last w))) L"

definition flStep :: "tables \<Rightarrow> flstate \<Rightarrow> flstate" where
  "flStep t st = map (\<lambda>T. map (\<lambda>arc. let f = hd arc; l = last arc in
      (dapply (phi t (fst f)) (snd (st ! child t T (fst f) ! snd f)),
       dapply (phi t (fst l)) (fst (st ! child t T (fst l) ! snd l)))) (B t ! T)) allTypes"

definition turnAt :: "flstate \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> int" where
  "turnAt st T c = (let d = (fst (st ! T ! c) - snd (st ! T ! ((c + 5) mod 6))) mod 12 in if d > 6 then d - 12 else d)"

definition isCycleClass :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list \<Rightarrow> bool" where
  "isCycleClass t T cls = (let nodes = remdups (concat (map (cornerEdges t T) cls));
                              deg = (\<lambda>n. length (filter (\<lambda>x. n \<in> set (cornerEdges t T x)) cls))
                          in \<forall>n \<in> set nodes. deg n = 2)"

definition parentCornerOf :: "tables \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list \<Rightarrow> nat option" where
  "parentCornerOf t T cls = (case filter (\<lambda>j. CT t T j \<in> set cls) allEdges of [] \<Rightarrow> None | j # _ \<Rightarrow> Some j)"

definition anglesOk :: "tables \<Rightarrow> flstate \<Rightarrow> bool" where
  "anglesOk t st = (\<forall>T \<in> set allTypes. \<forall>cls \<in> set (cornerClasses t T).
     let n = int (length cls); tot = sum_list (map (\<lambda>x. turnAt st (child t T (fst x)) (snd x)) cls);
         next = flStep t st
     in (\<forall>x \<in> set cls. turnAt st (child t T (fst x)) (snd x) \<noteq> 6) \<and>
        (if isCycleClass t T cls then tot = 6 * (n - 2)
         else tot > 6 * (n - 2) \<and> tot < 6 * n \<and>
              (case parentCornerOf t T cls of None \<Rightarrow> True | Some j \<Rightarrow> turnAt next T j = tot - 6 * (n - 1))))"

section \<open>C6: quad points\<close>

definition neededStep :: "tables \<Rightarrow> (nat \<times> nat) list \<Rightarrow> (nat \<times> nat) list" where
  "neededStep t N = remdups (N @ concat (map (\<lambda>P. concat (map (\<lambda>i. if (P, i) \<in> set N then [(child t P (fst (superQuad ! i)), snd (superQuad ! i))] else []) [0..<4])) allTypes))"

definition neededBase :: "tables \<Rightarrow> (nat \<times> nat) list" where
  "neededBase t = remdups (concat (map (\<lambda>P. concat (map (\<lambda>s.
      (if hasChild t P s \<and> s \<ge> 1 \<and> hasChild t P (s - 1) then [(child t P s, tRulesTo ! (s - 1))] else [])
      @ (if hasChild t P s \<and> s \<le> 6 \<and> hasChild t P (s + 1) then [(child t P s, tRulesFrom ! s)] else [])) allSlots)) allTypes))"

definition needed :: "tables \<Rightarrow> (nat \<times> nat) list" where
  "needed t = ((neededStep t) ^^ 10) (neededBase t)"

definition c6_ok :: "tables \<Rightarrow> int list list \<Rightarrow> bool" where
  "c6_ok t Qt = ((\<forall>p \<in> set (needed t). qc Qt (fst p) (snd p) \<ge> 0) \<and>
     (\<forall>p \<in> set (needed t). let T = fst p; i = snd p; s = fst (superQuad ! i); j = snd (superQuad ! i);
          cj = qc Qt (child t T s) j; A = cornerClasses t T
        in cj \<ge> 0 \<and> sameClass A (s, nat cj) (CT t T (nat (qc Qt T i)))))"

section \<open>C7: burial\<close>

fun exposed :: "tables \<Rightarrow> nat \<Rightarrow> nat list \<Rightarrow> nat list \<Rightarrow> nat list" where
  "exposed t T ex [] = ex"
| "exposed t T ex (s # addr) = exposed t (child t T s) (remdups (concat (map (\<lambda>j. map snd (filter (\<lambda>p. fst p = s) (B t ! T ! j))) ex))) addr"

definition buried :: "tables \<Rightarrow> nat \<Rightarrow> nat list \<Rightarrow> bool" where
  "buried t T addr = (exposed t T allEdges addr = [])"

section \<open>The routing operator\<close>

text \<open>The routing operator reads only how many dots each meta-edge carries. The parent's count on
  edge j is the sum over the child edges composing it (labels are properties of the leaves, so the
  dot pattern of a parent edge is the concatenation of the reversed child patterns).\<close>
type_synonym dots = "nat list list"
type_synonym rstate = "((nat \<times> nat) list \<times> nat) list"

definition dotsStep :: "tables \<Rightarrow> dots \<Rightarrow> dots" where
  "dotsStep t D = map (\<lambda>T. map (\<lambda>arc. sum_list (map (\<lambda>p. D ! child t T (fst p) ! snd p) arc)) (B t ! T)) allTypes"

definition countsOf :: "bool list list list \<Rightarrow> dots" where
  "countsOf P = map (map (\<lambda>w. length (filter id w))) P"

definition ndots :: "dots \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> nat" where
  "ndots D T e = D ! T ! e"

definition dotIndex :: "dots \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> nat \<Rightarrow> nat" where
  "dotIndex D T e i = sum_list (map (ndots D T) [0..<e]) + i"

definition outerNodes :: "tables \<Rightarrow> dots \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) list" where
  "outerNodes t D T = concat (map (\<lambda>p. let s = fst p; e = snd p; n = ndots D (child t T s) e
      in map (\<lambda>i. (s, dotIndex D (child t T s) e (n - 1 - i))) [0..<n]) (edgesInB t T))"

definition linkEdges :: "tables \<Rightarrow> dots \<Rightarrow> rstate \<Rightarrow> nat \<Rightarrow> ((nat \<times> nat) \<times> (nat \<times> nat)) list" where
  "linkEdges t D S T =
     concat (map (\<lambda>s. map (\<lambda>ab. ((s, fst ab), (s, snd ab))) (fst (S ! child t T s))) (slotsOf t T))
   @ concat (map (\<lambda>gp. let s = fst (fst gp); e = snd (fst gp); u = fst (snd gp); f = snd (snd gp);
                         n = ndots D (child t T s) e
                     in map (\<lambda>i. ((s, dotIndex D (child t T s) e i), (u, dotIndex D (child t T u) f (n - 1 - i)))) [0..<n]) (G t ! T))"

definition neighbours :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) list" where
  "neighbours E x = map (\<lambda>ed. if fst ed = x then snd ed else fst ed) (filter (\<lambda>ed. fst ed = x \<or> snd ed = x) E)"

text \<open>Walk from an outer node along chords and welds until another outer node is reached.
  Each interior node has exactly two neighbours, each outer node one; fuel bounds the walk.\<close>
fun walk :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) list \<Rightarrow> nat \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) list \<Rightarrow> (nat \<times> nat) list" where
  "walk E outer 0 prev cur acc = rev (cur # acc)"
| "walk E outer (Suc n) prev cur acc =
     (if cur \<in> set outer \<and> acc \<noteq> [] then rev (cur # acc)
      else case filter (\<lambda>y. y \<noteq> prev) (neighbours E cur) of [] \<Rightarrow> rev (cur # acc)
           | y # _ \<Rightarrow> walk E outer n cur y (cur # acc))"

definition arcFrom :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) list \<Rightarrow> (nat \<times> nat) \<Rightarrow> (nat \<times> nat) list" where
  "arcFrom E outer x = walk E outer (2 * length E + 2) x x []"

definition indexOf :: "(nat \<times> nat) list \<Rightarrow> (nat \<times> nat) \<Rightarrow> nat" where
  "indexOf xs x = length (takeWhile (\<lambda>y. y \<noteq> x) xs)"

definition degreesOk :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) list \<Rightarrow> bool" where
  "degreesOk E outer = (\<forall>x \<in> set (remdups (concat (map (\<lambda>ed. [fst ed, snd ed]) E))).
     length (neighbours E x) = (if x \<in> set outer then 1 else 2))"

text \<open>The parent's matching: for each outer node, the outer node its arc reaches. Circuits: nodes on no
  arc are on closed walks; each closed walk is counted once by its least node.\<close>
text \<open>Outer nodes are enumerated in outline order, so keeping the first occurrence of each pair
  lists the pairs by their smaller index, which is the order of the level-1 data.\<close>
definition Fpairs :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) list \<Rightarrow> (nat \<times> nat) list" where
  "Fpairs E outer = remdups (map (\<lambda>x. let y = last (arcFrom E outer x) in
      (min (indexOf outer x) (indexOf outer y), max (indexOf outer x) (indexOf outer y))) outer)"

definition onArcs :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) list \<Rightarrow> (nat \<times> nat) list" where
  "onArcs E outer = concat (map (arcFrom E outer) outer)"

definition newCircuits :: "((nat \<times> nat) \<times> (nat \<times> nat)) list \<Rightarrow> (nat \<times> nat) list \<Rightarrow> nat" where
  "newCircuits E outer = (let nodes = remdups (concat (map (\<lambda>ed. [fst ed, snd ed]) E));
                              rest = filter (\<lambda>x. x \<notin> set (onArcs E outer)) nodes
                          in length (filter (\<lambda>x. \<forall>y \<in> set (walk E [] (2 * length E + 2) x x []). \<not> pairLess y x) rest))"

definition Fstep :: "tables \<Rightarrow> dots \<Rightarrow> rstate \<Rightarrow> rstate" where
  "Fstep t D S = map (\<lambda>T. let E = linkEdges t D S T; outer = outerNodes t D T in
     (Fpairs E outer, sum_list (map (\<lambda>s. snd (S ! child t T s)) (slotsOf t T)) + newCircuits E outer)) allTypes"

definition degreesAllOk :: "tables \<Rightarrow> dots \<Rightarrow> rstate \<Rightarrow> bool" where
  "degreesAllOk t D S = (\<forall>T \<in> set allTypes. degreesOk (linkEdges t D S T) (outerNodes t D T))"

text \<open>One substitution step on (children's dot layout, children's states).\<close>
definition Phi :: "tables \<Rightarrow> dots \<times> rstate \<Rightarrow> dots \<times> rstate" where
  "Phi t x = (dotsStep t (fst x), Fstep t (fst x) (snd x))"

definition orbit :: "tables \<Rightarrow> dots \<times> rstate \<Rightarrow> nat \<Rightarrow> dots \<times> rstate" where
  "orbit t x k = ((Phi t) ^^ k) x"

lemma funpow_periodic:
  fixes f :: "'a \<Rightarrow> 'a"
  assumes "(f ^^ p) x = x"
  shows "(f ^^ (k + p)) x = (f ^^ k) x"
proof -
  have "(f ^^ (k + p)) x = (f ^^ k) ((f ^^ p) x)" by (simp add: funpow_add)
  then show ?thesis using assms by simp
qed

lemma funpow_period_all:
  fixes f :: "'a \<Rightarrow> 'a"
  assumes per: "(f ^^ p) x = x" and pos: "0 < p"
      and ok: "\<forall>i < p. P ((f ^^ i) x)"
  shows "P ((f ^^ k) x)"
proof (induction k rule: less_induct)
  case (less k)
  show ?case
  proof (cases "k < p")
    case True then show ?thesis using ok by simp
  next
    case False
    then have kp: "k - p + p = k" by simp
    have "(f ^^ k) x = (f ^^ (k - p)) x" using funpow_periodic[OF per, of "k - p"] kp by simp
    then show ?thesis using less.IH[of "k - p"] False pos by simp
  qed
qed

text \<open>Circuits never disappear: the parent's count is the children's sum plus the new ones.\<close>
lemma circuits_monotone:
  assumes "T < 9" "s \<in> set (slotsOf t T)"
  shows "snd (S ! child t T s) \<le> snd (Fstep t D S ! T)"
proof -
  have "snd (Fstep t D S ! T) = sum_list (map (\<lambda>s. snd (S ! child t T s)) (slotsOf t T)) + newCircuits (linkEdges t D S T) (outerNodes t D T)"
    using assms(1) by (simp add: Fstep_def allTypes_def Let_def)
  moreover have "snd (S ! child t T s) \<le> sum_list (map (\<lambda>s. snd (S ! child t T s)) (slotsOf t T))"
    using assms(2) by (simp add: member_le_sum_list)
  ultimately show ?thesis by simp
qed

definition zeroCircuits :: "dots \<times> rstate \<Rightarrow> bool" where
  "zeroCircuits x = (\<forall>T \<in> set allTypes. snd (snd x ! T) = 0)"

definition psiOneArc :: "dots \<times> rstate \<Rightarrow> bool" where
  "psiOneArc x = (fst (snd x ! 8) = [(0, 1)])"

definition state1 :: "bool list list list \<Rightarrow> (nat \<times> nat) list list \<Rightarrow> dots \<times> rstate" where
  "state1 P S = (countsOf P, map (\<lambda>ps. (ps, 0)) S)"

theorem routing_all_levels:
  assumes per: "orbit t x 2 = x"
      and z0: "zeroCircuits x" "zeroCircuits (orbit t x 1)"
      and p0: "psiOneArc x" "psiOneArc (orbit t x 1)"
  shows "zeroCircuits (orbit t x k) \<and> psiOneArc (orbit t x k)"
proof -
  have per': "((Phi t) ^^ 2) x = x" using per by (simp add: orbit_def)
  have ok: "\<forall>i < 2. zeroCircuits (((Phi t) ^^ i) x) \<and> psiOneArc (((Phi t) ^^ i) x)"
    using z0 p0 unfolding numeral_2_eq_2 by (auto simp: orbit_def less_Suc_eq)
  show ?thesis unfolding orbit_def
    by (rule funpow_period_all[where P = "\<lambda>y. zeroCircuits y \<and> psiOneArc y" and p = 2, OF per' _ ok]) simp
qed

theorem angles_all_levels:
  assumes per: "((flStep t) ^^ p) st = st" and pos: "0 < p"
      and ok: "\<forall>i < p. anglesOk t (((flStep t) ^^ i) st)"
  shows "anglesOk t (((flStep t) ^^ k) st)"
  by (rule funpow_period_all[OF per pos ok])

end
