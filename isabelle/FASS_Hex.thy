(*
  Configuration (A): hex / 128 / 010100000.

  Every `by eval` line is a closed computation the kernel re-runs on the data of
  FASS_Data_Hex; every `theorem` is the corresponding all-levels statement, obtained
  from the general lemmas of FASS_Core by induction on the level.
*)
theory FASS_Hex
  imports FASS_Data_Hex
begin

abbreviation hexT :: tables where "hexT \<equiv> fass_data_hex_tables"
abbreviation hexClosure :: "claim list" where "hexClosure \<equiv> closureIter hexT 5 (seeds hexT)"
abbreviation hexW1 :: words where "hexW1 \<equiv> wordsOf fass_data_hex_dir1"
abbreviation hexL1 :: labwords where "hexL1 \<equiv> labwordsOf fass_data_hex_lab1"

section \<open>C1: structure\<close>

lemma hex_c1: "c1_ok hexT" by eval
lemma hex_ct: "ctChains hexT" by eval

section \<open>C2: word claims — closed under substitution, true at level 1, hence at every level\<close>

lemma hex_validL: "validL hexT" by eval
lemma hex_validData: "validData fass_data_hex_dir1" by eval
lemma hex_closed: "closedSet hexT hexClosure" by eval
lemma hex_base_dir: "\<forall>c \<in> set hexClosure. holds hexW1 c" by eval
lemma hex_base_lab: "\<forall>c \<in> set hexClosure. holdsL 1 hexL1 c" by eval
lemma hex_seeds_in: "set (seeds hexT) \<subseteq> set hexClosure" by eval

theorem hex_words_all_levels:
  "\<forall>c \<in> set hexClosure. holds (iterW hexT hexW1 k) c"
  by (rule claims_all_levels[OF hex_validL validW_of_data[OF hex_validData] hex_closed hex_base_dir])

theorem hex_labels_all_levels:
  "\<forall>c \<in> set hexClosure. holdsL 1 (iterL hexT hexL1 k) c"
  by (rule labclaims_all_levels[OF hex_closed hex_base_lab])

text \<open>In particular every glued pair of every parent, at every level, has the same shape and
  carries +c.m against -c.m.\<close>
corollary hex_glued_pairs_all_levels:
  "\<forall>c \<in> set (seeds hexT). holds (iterW hexT hexW1 k) c \<and> holdsL 1 (iterL hexT hexL1 k) c"
  using hex_words_all_levels hex_labels_all_levels hex_seeds_in by blast

section \<open>C3: corner coincidences from the quad chainings\<close>

lemma hex_sameCorner: "sameCornerClosed hexT" "sameCornerBase hexT fass_data_hex_corners1" by eval+
lemma hex_c3: "c3_ok hexT fass_data_hex_Q" by eval
lemma hex_c3_level1: "c3_ok hexT fass_data_hex_Q1" by eval

section \<open>C4: the glued children form a disk\<close>

lemma hex_c4: "c4_ok hexT" by eval

section \<open>C5: corner angles at every level\<close>

lemma hex_fl_period: "((flStep hexT) ^^ 2) (flOf fass_data_hex_dir1) = flOf fass_data_hex_dir1" by eval
lemma hex_angles_base: "anglesOk hexT (flOf fass_data_hex_dir1)" "anglesOk hexT (flStep hexT (flOf fass_data_hex_dir1))" by eval+

theorem hex_angles_all_levels: "anglesOk hexT (((flStep hexT) ^^ k) (flOf fass_data_hex_dir1))"
proof -
  have ok: "\<forall>i < 2. anglesOk hexT (((flStep hexT) ^^ i) (flOf fass_data_hex_dir1))"
    using hex_angles_base unfolding numeral_2_eq_2 by (auto simp: less_Suc_eq)
  show ?thesis by (rule angles_all_levels[OF hex_fl_period _ ok]) simp
qed

section \<open>C6: quad points\<close>

lemma hex_c6: "c6_ok hexT fass_data_hex_Q" by eval

section \<open>C7: burial\<close>

lemma hex_buried: "buried hexT 8 [0, 0, 5, 0]" by eval
lemma hex_not_buried_depth3: "\<not> buried hexT 8 [0, 0, 5]" by eval

section \<open>The strands: the routing operator from the level-1 states\<close>

abbreviation hexX1 :: "dots \<times> rstate" where "hexX1 \<equiv> state1 fass_data_hex_dots1 fass_data_hex_state1"

lemma hex_degrees: "degreesAllOk hexT (fst hexX1) (snd hexX1)" "degreesAllOk hexT (fst (orbit hexT hexX1 1)) (snd (orbit hexT hexX1 1))" by eval+
lemma hex_orbit_period: "orbit hexT hexX1 2 = hexX1" by eval
lemma hex_orbit_base: "zeroCircuits hexX1" "zeroCircuits (orbit hexT hexX1 1)" "psiOneArc hexX1" "psiOneArc (orbit hexT hexX1 1)" by eval+

theorem hex_routing_all_levels: "zeroCircuits (orbit hexT hexX1 k) \<and> psiOneArc (orbit hexT hexX1 k)"
  by (rule routing_all_levels[OF hex_orbit_period hex_orbit_base])

text \<open>The boundary dot counts of every type are the same at every level.\<close>
definition dotCounts :: "dots \<Rightarrow> nat list" where
  "dotCounts D = map (\<lambda>T. sum_list (map (ndots D T) allEdges)) allTypes"

lemma hex_dot_counts: "dotCounts (fst hexX1) = [10, 8, 6, 6, 4, 4, 10, 4, 2]"
                      "dotCounts (fst (orbit hexT hexX1 1)) = [10, 8, 6, 6, 4, 4, 10, 4, 2]" by eval+

theorem hex_dot_counts_all_levels: "dotCounts (fst (orbit hexT hexX1 k)) = [10, 8, 6, 6, 4, 4, 10, 4, 2]"
proof -
  have per': "((Phi hexT) ^^ 2) hexX1 = hexX1" using hex_orbit_period by (simp add: orbit_def)
  have ok: "\<forall>i < 2. dotCounts (fst (((Phi hexT) ^^ i) hexX1)) = [10, 8, 6, 6, 4, 4, 10, 4, 2]"
    using hex_dot_counts unfolding numeral_2_eq_2 by (auto simp: orbit_def less_Suc_eq)
  show ?thesis unfolding orbit_def
    by (rule funpow_period_all[where P = "\<lambda>y. dotCounts (fst y) = [10, 8, 6, 6, 4, 4, 10, 4, 2]" and p = 2, OF per' _ ok]) simp
qed

end
