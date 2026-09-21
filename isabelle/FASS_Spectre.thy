(*
  Configuration (B): spectre / 1278 / 0101000000.

  Every `by eval` line is a closed computation the kernel re-runs on the data of
  FASS_Data_Spectre; every `theorem` is the corresponding all-levels statement, obtained
  from the general lemmas of FASS_Core by induction on the level.
*)
theory FASS_Spectre
  imports FASS_Data_Spectre
begin

abbreviation specT :: tables where "specT \<equiv> fass_data_spectre_tables"
abbreviation specClosure :: "claim list" where "specClosure \<equiv> closureIter specT 5 (seeds specT)"
abbreviation specW1 :: words where "specW1 \<equiv> wordsOf fass_data_spectre_dir1"
abbreviation specL1 :: labwords where "specL1 \<equiv> labwordsOf fass_data_spectre_lab1"

section \<open>C1: structure\<close>

lemma spec_c1: "c1_ok specT" by eval
lemma spec_ct: "ctChains specT" by eval

section \<open>C2: word claims — closed under substitution, true at level 1, hence at every level\<close>

lemma spec_validL: "validL specT" by eval
lemma spec_validData: "validData fass_data_spectre_dir1" by eval
lemma spec_closed: "closedSet specT specClosure" by eval
lemma spec_base_dir: "\<forall>c \<in> set specClosure. holds specW1 c" by eval
lemma spec_base_lab: "\<forall>c \<in> set specClosure. holdsL 2 specL1 c" by eval
lemma spec_seeds_in: "set (seeds specT) \<subseteq> set specClosure" by eval

theorem spec_words_all_levels:
  "\<forall>c \<in> set specClosure. holds (iterW specT specW1 k) c"
  by (rule claims_all_levels[OF spec_validL validW_of_data[OF spec_validData] spec_closed spec_base_dir])

theorem spec_labels_all_levels:
  "\<forall>c \<in> set specClosure. holdsL 2 (iterL specT specL1 k) c"
  by (rule labclaims_all_levels[OF spec_closed spec_base_lab])

text \<open>In particular every glued pair of every parent, at every level, has the same shape and
  carries +c.m against -c.m.\<close>
corollary spec_glued_pairs_all_levels:
  "\<forall>c \<in> set (seeds specT). holds (iterW specT specW1 k) c \<and> holdsL 2 (iterL specT specL1 k) c"
  using spec_words_all_levels spec_labels_all_levels spec_seeds_in by blast

section \<open>C3: corner coincidences from the quad chainings\<close>

lemma spec_sameCorner: "sameCornerClosed specT" "sameCornerBase specT fass_data_spectre_corners1" by eval+
lemma spec_c3: "c3_ok specT fass_data_spectre_Q" by eval
lemma spec_c3_level1: "c3_ok specT fass_data_spectre_Q1" by eval

section \<open>C4: the glued children form a disk\<close>

lemma spec_c4: "c4_ok specT" by eval

section \<open>C5: corner angles at every level\<close>

lemma spec_fl_period: "((flStep specT) ^^ 2) (flOf fass_data_spectre_dir1) = flOf fass_data_spectre_dir1" by eval
lemma spec_angles_base: "anglesOk specT (flOf fass_data_spectre_dir1)" "anglesOk specT (flStep specT (flOf fass_data_spectre_dir1))" by eval+

theorem spec_angles_all_levels: "anglesOk specT (((flStep specT) ^^ k) (flOf fass_data_spectre_dir1))"
proof -
  have ok: "\<forall>i < 2. anglesOk specT (((flStep specT) ^^ i) (flOf fass_data_spectre_dir1))"
    using spec_angles_base unfolding numeral_2_eq_2 by (auto simp: less_Suc_eq)
  show ?thesis by (rule angles_all_levels[OF spec_fl_period _ ok]) simp
qed

section \<open>C6: quad points\<close>

lemma spec_c6: "c6_ok specT fass_data_spectre_Q" by eval

section \<open>C7: burial\<close>

lemma spec_buried: "buried specT 8 [0, 0, 5, 0]" by eval
lemma spec_not_buried_depth3: "\<not> buried specT 8 [0, 0, 5]" by eval

section \<open>The strands: the routing operator from the level-1 states\<close>

abbreviation specX1 :: "dots \<times> rstate" where "specX1 \<equiv> state1 fass_data_spectre_dots1 fass_data_spectre_state1"

lemma spec_degrees: "degreesAllOk specT (fst specX1) (snd specX1)" "degreesAllOk specT (fst (orbit specT specX1 1)) (snd (orbit specT specX1 1))" by eval+
lemma spec_orbit_period: "orbit specT specX1 2 = specX1" by eval
lemma spec_orbit_base: "zeroCircuits specX1" "zeroCircuits (orbit specT specX1 1)" "psiOneArc specX1" "psiOneArc (orbit specT specX1 1)" by eval+

theorem spec_routing_all_levels: "zeroCircuits (orbit specT specX1 k) \<and> psiOneArc (orbit specT specX1 k)"
  by (rule routing_all_levels[OF spec_orbit_period spec_orbit_base])

text \<open>The boundary dot counts of every type are the same at every level.\<close>
definition dotCounts :: "dots \<Rightarrow> nat list" where
  "dotCounts D = map (\<lambda>T. sum_list (map (ndots D T) allEdges)) allTypes"

lemma spec_dot_counts: "dotCounts (fst specX1) = [10, 8, 6, 6, 4, 4, 10, 4, 2]"
                      "dotCounts (fst (orbit specT specX1 1)) = [10, 8, 6, 6, 4, 4, 10, 4, 2]" by eval+

theorem spec_dot_counts_all_levels: "dotCounts (fst (orbit specT specX1 k)) = [10, 8, 6, 6, 4, 4, 10, 4, 2]"
proof -
  have per': "((Phi specT) ^^ 2) specX1 = specX1" using spec_orbit_period by (simp add: orbit_def)
  have ok: "\<forall>i < 2. dotCounts (fst (((Phi specT) ^^ i) specX1)) = [10, 8, 6, 6, 4, 4, 10, 4, 2]"
    using spec_dot_counts unfolding numeral_2_eq_2 by (auto simp: orbit_def less_Suc_eq)
  show ?thesis unfolding orbit_def
    by (rule funpow_period_all[where P = "\<lambda>y. dotCounts (fst y) = [10, 8, 6, 6, 4, 4, 10, 4, 2]" and p = 2, OF per' _ ok]) simp
qed

end
