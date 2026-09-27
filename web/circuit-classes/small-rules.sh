#!/bin/bash
# Every valid rule except the full one, for every family, levels 3-6.
cd "$(dirname "$0")"
for fam in spectre hex spectre-iso hat turtle; do
  for rule in $(npx --yes tsx -e "import {validEdgeSubsets} from '../src/core/index.ts'; console.log(validEdgeSubsets('$fam').filter(s=>s.edges.length>0 && s.edges.length<8).map(s=>s.edges.join('')).join(' '))"); do
    npx --yes tsx sweep.ts $fam $rule 3,4,5,6 data/$fam-$rule.jsonl
  done
done
