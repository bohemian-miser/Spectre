"""Summarise a points.L.csv listing (points.ts) as Markdown, reading it once.

Usage: python3 points-summary.py <points.L.csv> > points.L.md
"""
import collections
import csv
import sys

path = sys.argv[1]
own = collections.defaultdict(set)
own_tiles = collections.defaultdict(set)
other = collections.defaultdict(set)
other_tiles = collections.defaultdict(set)
opens = collections.Counter()
rows = 0
with open(path) as f:
    r = csv.reader(f)
    next(r)
    for triple, combo, strand, length, own_corners, tiles_id in r:
        rows += 1
        if own_corners == '1':
            own[triple].add(strand)
            own_tiles[triple].add(tiles_id)
        elif strand == 'open':
            opens[triple] += 1
        else:
            other[triple].add(strand)
            other_tiles[triple].add(tiles_id)


def bucket(n):
    return '0' if n == 0 else '1' if n == 1 else '2–5' if n <= 5 else '6+'


tab = collections.Counter((bucket(len(own[t])), bucket(len(other[t] - own[t])), opens[t] > 0) for t in own)
multi = [t for t in own if len(own[t]) > 1]
print(f'# Corner triples on one patch ({path.split("/")[-1]})\n')
print(f'{rows:,} rows, one per strand through a triple; {len(own):,} triples.\n')
print('| own corners of | other circuits through it | open strand through it | triples |')
print('|---|---|---|---|')
for (a, b, o), n in sorted(tab.items(), key=lambda x: -x[1]):
    print(f'| {a} | {b} | {"yes" if o else "no"} | {n:,} |')
print('\n| | triples |\n|---|---|')
print(f'| corners of more than one circuit | {len(multi):,} |')
print(f'| of those, every such circuit covers the same tiles | {sum(1 for t in multi if len(own_tiles[t]) == 1):,} |')
print(f'| some other circuit through the three tiles covers the same tiles as a circuit whose corners they are | {sum(1 for t in own if other_tiles[t] & own_tiles[t]):,} |')
