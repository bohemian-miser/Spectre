# Corner triples on one level-6 Delta supertile, rule 023468

From `points.ts 023468 6 20` (every combination traced on the same patch;
circuits of 20 tiles or more). The full listing, one row per strand through
a triple, is 21,642,457 rows (1.5 GB) and is not committed; rerun to get it.

208,719 triples. For each: how many circuits have it as their own corners,
how many other circuits pass through all three tiles, and whether an open
strand does.

| own corners of | other circuits through it | open strand through it | triples |
|---|---|---|---|
| 1 | 6+ | yes | 118,930 |
| 2–5 | 6+ | yes | 64,958 |
| 6+ | 6+ | yes | 6,862 |
| 1 | 2–5 | yes | 6,764 |
| 1 | 6+ | no | 3,462 |
| 2–5 | 6+ | no | 2,426 |
| 2–5 | 2–5 | yes | 2,001 |
| 6+ | 6+ | no | 1,060 |
| 1 | 1 | yes | 761 |
| 1 | 2–5 | no | 609 |
| 2–5 | 2–5 | no | 506 |
| 1 | 0 | yes | 216 |
| 1 | 1 | no | 75 |
| 6+ | 2–5 | no | 57 |
| 6+ | 2–5 | yes | 19 |
| 2–5 | 0 | yes | 12 |
| 6+ | 0 | no | 1 |

| | triples |
|---|---|
| corners of more than one circuit | 77,902 |
| of those, every such circuit covers the same tiles | 6,681 |
| some other circuit through the three tiles covers the same tiles as a circuit whose corners they are | 119,454 |
