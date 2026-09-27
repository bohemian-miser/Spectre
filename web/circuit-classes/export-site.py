"""
Pack the classification of every combination into the Classifications page's
data: web/public/data/classifications/meta.json + points.bin.gz.

Each (family, rule) is a block of rows in combination-enumeration order (the
page turns a row index back into the combination string with
`comboDigitsFromIndex`, so no strings are stored). A row is 16 bytes: the class
id, then one byte per feature, quantised linearly (or on log2(1+x)) between
the bounds given in meta.json. Rows not yet swept get class 255 and are skipped
by the page.

Hats and turtles are left out: their strand graphs are identical to Tile(1,1)'s.

Usage: python3 export-site.py [--allow-partial]
"""
import glob, gzip, json, math, os, subprocess, sys
from classify import CLASSES, classify, features

OUT = '../public/data/classifications'
CLASS_IDS = list(CLASSES)
FIELDS = [
    # key, label, lo, hi, scale, description
    ('gC', 'Largest circuit: growth', 0, 2.5, 'linear',
     'a in "length of the largest circuit ∝ N^a", from level 4 to level 6 (N = tiles). 0 bounded, ~0.7 triangle outline, ~0.85 thin wanderer, 1 space-filling.'),
    ('gO', 'Longest open strand: growth', 0, 1.5, 'linear',
     'The same exponent for the longest strand that reaches the edge of the patch.'),
    ('fo', 'Share of segments on open strands', 0, 1, 'linear',
     'Fraction of all strand segments on strands that reach the patch edge (level 6).'),
    ('cFill', 'Biggest circuit: fill', 0, 1.5, 'linear',
     'Its segments over what its convex hull holds at average density. ~1 space-filling, small = an outline or a thread.'),
    ('cFat', 'Biggest circuit: enclosed area / hull', 0, 1, 'linear',
     'Area the circuit encloses over its convex hull area. Triangles ~0.6, thin circuits ~0.2.'),
    ('cTri', 'Biggest circuit: triangularity', 0, 1, 'linear',
     'Hull area over the smallest enclosing equilateral triangle. 1 triangle, 0.67 hexagon, 0.6 disk.'),
    ('cElong', 'Biggest circuit: elongation', 1, 8, 'linear',
     'Square root of the ratio of its principal moments.'),
    ('oFill', 'Longest open strand: fill', 0, 1.5, 'linear',
     'Fill of the longest open strand. Infinite lines fill their region; cut-open triangle outlines do not.'),
    ('oElong', 'Longest open strand: elongation', 1, 10, 'linear',
     'Slivers cut off along the patch edge are very elongated.'),
    ('top4', 'Share on the 4 longest strands', 0, 1, 'linear',
     'Fraction of all segments on the four largest components.'),
    ('bigMass', 'Share on circuits of 64+ segments', 0, 1, 'linear',
     'Fraction of all segments on circuits at least 64 segments long.'),
    ('Lc', 'Longest circuit (segments)', 0, 20, 'log2',
     'Length of the longest circuit at level 6.'),
    ('Lo', 'Longest open strand (segments)', 0, 20, 'log2',
     'Length of the longest open strand at level 6.'),
    ('nClosed', 'Number of circuits', 0, 20, 'log2',
     'How many circuits the level-6 patch holds.'),
    ('distinct', 'Distinct circuit lengths', 0, 255, 'linear',
     'How many different circuit lengths occur at level 6.'),
]

def q(v, lo, hi, scale):
    if scale == 'log2':
        v = math.log2(1 + max(v, 0))
    return max(0, min(255, round((v - lo) / (hi - lo) * 255)))

def main():
    partial = '--allow-partial' in sys.argv
    counts = json.loads(subprocess.run(['npx', '--yes', 'tsx', 'option-counts.ts'], capture_output=True,
                                       text=True, check=True).stdout)
    rows = {}
    for path in sorted(glob.glob('data/*.jsonl')):
        with open(path) as fh:
            for line in fh:
                if not line.strip():
                    continue
                d = json.loads(line)
                if d['family'] in ('hat', 'turtle') or len(d['levels']) < 3:
                    continue
                f = features(d)
                if f['level'] != 6:
                    continue
                cls = CLASS_IDS.index(classify(f))
                rows.setdefault((d['family'], d['rule']), {})[d['combo']] = bytes(
                    [cls] + [q(f[k], lo, hi, sc) for k, _, lo, hi, sc, _ in FIELDS])
    blocks, chunks, offset = [], [], 0
    order = {'spectre': 0, 'hex': 1, 'spectre-iso': 2}
    for (fam, rule) in sorted(rows, key=lambda k: (order[k[0]], len(k[1]), k[1])):
        oc = counts[f'{fam}|{rule}']
        total = math.prod(oc)
        have = rows[(fam, rule)]
        if len(have) < total and not partial:
            sys.exit(f'{fam} {rule}: only {len(have)} of {total} rows; pass --allow-partial')
        # Enumeration order == lexicographic order of the combination string.
        out = bytearray(b'\xff' + bytes(len(FIELDS))) * total
        for combo, row in have.items():
            idx = 0
            for digit, k in zip(combo, oc):
                idx = idx * k + int(digit, 36)
            out[idx * 16:(idx + 1) * 16] = row
        chunks.append(bytes(out))
        blocks.append({'family': fam, 'rule': rule, 'count': total, 'done': len(have), 'offset': offset})
        offset += total
    os.makedirs(OUT, exist_ok=True)
    with gzip.open(f'{OUT}/points.bin.gz', 'wb', compresslevel=9) as fh:
        for c in chunks:
            fh.write(c)
    meta = {
        'version': 1,
        'rowBytes': 16,
        'classes': [{'id': c, 'label': CLASSES[c]} for c in CLASS_IDS],
        'fields': [{'key': k, 'label': l, 'lo': lo, 'hi': hi, 'scale': sc, 'description': desc}
                   for k, l, lo, hi, sc, desc in FIELDS],
        'blocks': blocks,
        'levels': 'Growth from level 4 to level 6; everything else at level 6.',
    }
    json.dump(meta, open(f'{OUT}/meta.json', 'w'), indent=1, ensure_ascii=False)
    print(len(blocks), 'blocks,', offset, 'rows,', os.path.getsize(f'{OUT}/points.bin.gz'), 'bytes gzipped')

if __name__ == '__main__':
    main()
