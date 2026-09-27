#!/bin/bash
# Nesting for everything the Classifications page shows: every small rule of
# Tile(1,1), hexagons and the iso labelling, then Tile(1,1)'s full rule on 4 shards.
cd "$(dirname "$0")"
mkdir -p data/nest
for fam in spectre hex spectre-iso; do
  for rule in $(npx --yes tsx -e "import {validEdgeSubsets} from '../src/core'; console.log(validEdgeSubsets('$fam').filter(s=>s.edges.length>0 && s.edges.length<8).map(s=>s.edges.join('')).join(' '))"); do
    npx --yes tsx nest-sweep.ts $fam $rule 4,6 data/nest/$fam-$rule.jsonl
  done
done
for k in 0 1 2 3; do
  npx --yes tsx nest-sweep.ts spectre 01235678 4,6 data/nest/spectre-01235678.s$k.jsonl $k 4 > data/nest/sweep-s$k.log 2>&1 &
done
wait
