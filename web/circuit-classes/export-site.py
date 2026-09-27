"""
Pack the classification of every combination into the Classifications page's
data: web/public/data/classifications/meta.json + points.bin.gz.

Each (family, rule) is a block of rows in combination-enumeration order (the
page turns a row index back into the combination string with
`comboDigitsFromIndex`, so no strings are stored). A row is one byte for the class
id, then one byte per field (including the nesting stats from
nest-sweep.ts), quantised linearly (or on log2(1+x)) between
the bounds given in meta.json. The file holds these rows column by column
(`layout: "columns"`). Rows not yet swept get class 255 and are skipped
by the page.

meta.json also carries the classifier's thresholds (from classify.py) and, per
field, its group, level and formula, so the page explains the numbers the data
was actually made with.

Hats and turtles are left out: their strand graphs are identical to Tile(1,1)'s.

Usage: python3 export-site.py [--allow-partial]
"""
import glob, gzip, json, math, os, subprocess, sys
from classify import CLASSES, THRESHOLDS, classify, features, growth

OUT = '../public/data/classifications'
CLASS_IDS = list(CLASSES)

GROWTH = 'Growth & dimension'
CIRCUIT = 'Biggest circuit shape'
OPEN = 'Longest open strand'
COUNTS = 'Counts & lengths'
NESTING = 'Nesting'


def F(key, label, group, lo, hi, scale, level, formula, description, integer=False):
    return dict(key=key, label=label, group=group, lo=lo, hi=hi, scale=scale, level=level,
                formula=formula, description=description, integer=integer)


# Order within a group is the order in the page's dropdowns.
FIELDS = [
    # Growth & dimension
    F('gC', 'Largest circuit: growth', GROWTH, 0, 2.5, 'linear', '4 → 6',
      'gC = log(Lc₆ / Lc₄) / log(N₆ / N₄), N = tiles in the patch',
      'The exponent a in "length of the largest circuit ∝ N^a". 0 bounded, about 0.7 for triangle outlines, '
      'about 0.9 for thin wandering circuits, 1 for space-filling ones. Above 1 means the biggest circuit at level 4 '
      'was still cut open by the patch edge.'),
    F('gO', 'Longest open strand: growth', GROWTH, 0, 1.5, 'linear', '4 → 6',
      'gO = log(Lo₆ / Lo₄) / log(N₆ / N₄)',
      'The same exponent for the longest strand that reaches the edge of the patch.'),
    F('dC', 'Largest circuit: dimension from growth', GROWTH, 0, 5, 'linear', '4 → 6',
      'dC = 2 × gC',
      'Twice gC: roughly the fractal dimension of the largest circuit, if it spans the patch. A patch of N tiles '
      'is about N^½ tiles wide, so a curve of dimension d across it is about N^(d/2) long. About 1.4 for triangle outlines, 1.9 for thin circuits, 2 for space-filling ones. '
      'Only meaningful between 1 and 2; values above 2 are an artefact of the level-4 circuit being cut short.'),
    F('dO', 'Longest open strand: dimension from growth', GROWTH, 0, 3, 'linear', '4 → 6',
      'dO = 2 × gO',
      'Twice gO: roughly the fractal dimension of the longest open strand. About 2 for an infinite space-filling '
      'line.'),
    F('dCr', 'Largest circuit: mass-radius dimension', GROWTH, 0, 3, 'linear', '4 → 6',
      'dCr = log(Lc₆ / Lc₄) / log(Rg₆ / Rg₄), Rg = radius of gyration',
      'Fractal dimension from the largest circuit\'s length against its own radius, not the patch\'s. It agrees with dC when the biggest circuit '
      'grows with the patch and does not depend on it spanning the patch. 0 when the circuit does not grow '
      '(its radius grows by less than 1.5 times), where no dimension can be read off.'),
    F('gC45', 'Largest circuit: growth, level 4 → 5', GROWTH, 0, 4.5, 'linear', '4 → 5',
      'log(Lc₅ / Lc₄) / log(N₅ / N₄)',
      'One-level growth exponent. Triangle circuits grow on alternate levels, so this and the 5 → 6 step '
      'often flicker between about 0 and about 1.4 while their average (gC) stays steady.'),
    F('gC56', 'Largest circuit: growth, level 5 → 6', GROWTH, 0, 4.5, 'linear', '5 → 6',
      'log(Lc₆ / Lc₅) / log(N₆ / N₅)',
      'The next one-level step. Plot it against the 4 → 5 step to see the alternating-level rhythm.'),
    F('gO45', 'Longest open strand: growth, level 4 → 5', GROWTH, 0, 4.5, 'linear', '4 → 5',
      'log(Lo₅ / Lo₄) / log(N₅ / N₄)',
      'One-level growth exponent of the longest open strand.'),
    F('gO56', 'Longest open strand: growth, level 5 → 6', GROWTH, 0, 4.5, 'linear', '5 → 6',
      'log(Lo₆ / Lo₅) / log(N₆ / N₅)',
      'The next one-level step of the longest open strand.'),
    # Biggest circuit shape
    F('cFill', 'Biggest circuit: fill', CIRCUIT, 0, 1.5, 'linear', '6',
      'segments / (hull area × segments per unit area of the whole patch)',
      'Its segments over what its convex hull holds at average density. About 1 space-filling, small for an '
      'outline or a thread.'),
    F('cFat', 'Biggest circuit: enclosed area / hull', CIRCUIT, 0, 1, 'linear', '6',
      'area inside the circuit (shoelace) / convex hull area',
      'How much of its convex hull the circuit encloses. Triangle outlines about 0.6, thin circuits about 0.2.'),
    F('cTri', 'Biggest circuit: triangularity', CIRCUIT, 0, 1, 'linear', '6',
      'hull area / area of the smallest equilateral triangle around the hull (any rotation)',
      'How close its hull is to an equilateral triangle: 1 for a triangle, 0.67 for a regular hexagon, 0.6 for a '
      'disk.'),
    F('cElong', 'Biggest circuit: elongation', CIRCUIT, 1, 8, 'linear', '6',
      '√(λ₁ / λ₂), the principal moments of its points',
      'How stretched it is: 1 for a round or triangular shape, large for a long thin one.'),
    F('cRg', 'Biggest circuit: radius of gyration', CIRCUIT, 0, 10, 'log2', '6',
      'Rg = √(mean squared distance of its points from their centre), in tile edge lengths',
      'How big the biggest circuit is. It stays a few edges for bounded loops and reaches a good part of the '
      'patch for growing classes.'),
    # Longest open strand
    F('oFill', 'Longest open strand: fill', OPEN, 0, 1.5, 'linear', '6',
      'as for the circuit fill',
      'How much of its convex hull the longest open strand covers. Infinite lines fill their region; cut-open '
      'triangle outlines do not.'),
    F('oElong', 'Longest open strand: elongation', OPEN, 1, 10, 'linear', '6',
      '√(λ₁ / λ₂)',
      'How stretched the longest open strand is. Slivers cut off along the patch edge are very elongated.'),
    F('oTri', 'Longest open strand: triangularity', OPEN, 0, 1, 'linear', '6',
      'hull area / smallest enclosing equilateral triangle',
      'How close its hull is to an equilateral triangle. A triangle outline cut open by the patch edge still '
      'scores high.'),
    # Counts & lengths
    F('fo', 'Share of segments on open strands', COUNTS, 0, 1, 'linear', '6',
      'segments on strands that reach the patch edge / all segments',
      'How much of the drawing reaches the patch edge. Near 1 when one or a few lines carry everything, small when nearly everything closes up.'),
    F('top1', 'Share on the longest strand', COUNTS, 0, 1, 'linear', '6',
      'segments of the largest component / all segments',
      'How much of the drawing one strand carries, open or closed. High for an infinite line that carries most of the drawing.'),
    F('top4', 'Share on the 4 longest strands', COUNTS, 0, 1, 'linear', '6',
      'segments of the four largest components / all segments',
      'How much of the drawing the four largest strands carry, open or closed.'),
    F('bigMass', 'Share on circuits of 64+ segments', COUNTS, 0, 1, 'linear', '6',
      'segments on circuits at least 64 long / all segments',
      'How much of the drawing is in big circuits.'),
    F('Lc4', 'Longest circuit at level 4', COUNTS, 0, 20, 'log2', '4',
      'Lc₄, in segments', 'Length of the longest circuit at level 4.', integer=True),
    F('Lc5', 'Longest circuit at level 5', COUNTS, 0, 20, 'log2', '5',
      'Lc₅, in segments', 'Length of the longest circuit at level 5.', integer=True),
    F('Lc', 'Longest circuit at level 6', COUNTS, 0, 20, 'log2', '6',
      'Lc₆, in segments', 'Length of the longest circuit at level 6.', integer=True),
    F('Lo4', 'Longest open strand at level 4', COUNTS, 0, 20, 'log2', '4',
      'Lo₄, in segments', 'Length of the longest open strand at level 4.', integer=True),
    F('Lo5', 'Longest open strand at level 5', COUNTS, 0, 20, 'log2', '5',
      'Lo₅, in segments', 'Length of the longest open strand at level 5.', integer=True),
    F('Lo', 'Longest open strand at level 6', COUNTS, 0, 20, 'log2', '6',
      'Lo₆, in segments', 'Length of the longest open strand at level 6.', integer=True),
    F('nClosed', 'Number of circuits', COUNTS, 0, 20, 'log2', '6',
      'count of closed strands', 'How many circuits the level-6 patch holds.', integer=True),
    F('nOpen', 'Number of open strands', COUNTS, 0, 20, 'log2', '6',
      'count of strands with an end on the patch edge',
      'How many strands reach the patch edge at level 6. Mostly set by the rule and the patch outline, since every strand crossing the edge counts.', integer=True),
    F('cPerTile', 'Circuits per tile', COUNTS, 0, 0.6, 'linear', '6',
      'number of circuits / tiles', 'How many circuits there are for each tile. High for many small loops.'),
    F('distinct', 'Distinct circuit lengths', COUNTS, 0, 255, 'linear', '6',
      'number of different circuit lengths (capped at 255)',
      'Low for a few repeated loop shapes, high for a hierarchy of sizes.', integer=True),
    # Nesting
    F('maxNest4', 'Max nested at level 4', NESTING, 0, 255, 'linear', '4',
      'max over circuits of the number of circuits around it',
      'The deepest nesting at level 4.', integer=True),
    F('maxNest', 'Max nested at level 6', NESTING, 0, 255, 'linear', '6',
      'max over circuits of the number of circuits around it',
      'The most circuits enclosing any one circuit at level 6. Circuits cut open by the patch edge enclose '
      'nothing.', integer=True),
    F('nestSum4', 'Nest sum at level 4', NESTING, 0, 24, 'log2', '4',
      'sum over circuits of the number of circuits around it',
      'Every circuit\'s depth added up at level 4.', integer=True),
    F('nestSum', 'Nest sum at level 6', NESTING, 0, 24, 'log2', '6',
      'sum over circuits of the number of circuits around it',
      'Every circuit\'s depth added up at level 6: +1 for every circuit inside another circuit, counted once for '
      'each circuit around it.', integer=True),
    F('nested', 'Circuits inside another', NESTING, 0, 20, 'log2', '6',
      'count of circuits with depth at least 1',
      'How many circuits sit inside at least one other circuit at level 6.', integer=True),
    F('nestGrowth', 'Nest sum: growth', NESTING, 0, 3, 'linear', '4 → 6',
      'log((1 + nest sum₆) / (1 + nest sum₄)) / log(N₆ / N₄)',
      'How fast nesting grows with the patch. 1 means the nest sum grows in step with the tile count, as it does '
      'when circuits of every size keep nesting; above 1, depth keeps increasing too. The +1 keeps patterns '
      'without nesting at 0.'),
]
NEST_KEYS = ('maxNest4', 'maxNest', 'nestSum4', 'nestSum', 'nested')
MIN_RG_RATIO = 1.5


def extra_features(d, nest):
    """Everything the page shows beyond what classify.features gives."""
    L = d['levels']
    a, m, b = L[-3], L[-2], L[-1]
    closed = lambda lv: next((t for t in lv['top'] if t['closed']), None)
    opened = lambda lv: next((t for t in lv['top'] if not t['closed']), None)
    ca, cb, ob = closed(a), closed(b), opened(b)
    gC = growth(a['lmaxClosed'], b['lmaxClosed'], a['tiles'], b['tiles'])
    gO = growth(a['lmaxOpen'], b['lmaxOpen'], a['tiles'], b['tiles'])
    dCr = 0.0
    if ca and cb and ca['rg'] > 0 and cb['rg'] >= MIN_RG_RATIO * ca['rg']:
        dCr = math.log(cb['segs'] / ca['segs']) / math.log(cb['rg'] / ca['rg'])
    n4 = nest.get(4, {'max': 0, 'sum': 0})
    n6 = nest.get(6, {'max': 0, 'sum': 0, 'nested': 0})
    return dict(
        dC=2 * gC, dO=2 * gO, dCr=dCr,
        gC45=growth(a['lmaxClosed'], m['lmaxClosed'], a['tiles'], m['tiles']),
        gC56=growth(m['lmaxClosed'], b['lmaxClosed'], m['tiles'], b['tiles']),
        gO45=growth(a['lmaxOpen'], m['lmaxOpen'], a['tiles'], m['tiles']),
        gO56=growth(m['lmaxOpen'], b['lmaxOpen'], m['tiles'], b['tiles']),
        cRg=cb['rg'] if cb else 0,
        oTri=ob['tri'] if ob else 0,
        top1=b['fracTop1'],
        Lc4=a['lmaxClosed'], Lc5=m['lmaxClosed'], Lo4=a['lmaxOpen'], Lo5=m['lmaxOpen'],
        nOpen=b['nOpen'], cPerTile=b['nClosed'] / b['tiles'],
        maxNest4=n4['max'], maxNest=n6['max'], nestSum4=n4['sum'], nestSum=n6['sum'],
        nested=n6.get('nested', 0),
        nestGrowth=math.log((1 + n6['sum']) / (1 + n4['sum'])) / math.log(b['tiles'] / a['tiles']),
    )


def q(v, lo, hi, scale):
    if scale == 'log2':
        v = math.log2(1 + max(v, 0))
    return max(0, min(255, round((v - lo) / (hi - lo) * 255)))


def read_jsonl(path):
    """Lines of a JSONL file. A sweep may be appending to it, so a torn last line is skipped."""
    with open(path) as fh:
        for line in fh:
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def main():
    partial = '--allow-partial' in sys.argv
    counts = json.loads(subprocess.run(['npx', '--yes', 'tsx', 'option-counts.ts'], capture_output=True,
                                       text=True, check=True).stdout)
    nest = {}
    for path in sorted(glob.glob('data/nest/*.jsonl')):
        for d in read_jsonl(path):
            nest[(d['family'], d['rule'], d['combo'])] = {n['level']: n for n in d['nest']}
    missing_nest = 0
    clamped = {f['key']: [0, 0] for f in FIELDS}
    rows = {}
    for path in sorted(glob.glob('data/*.jsonl')):
        for d in read_jsonl(path):
            if d['family'] in ('hat', 'turtle') or len(d['levels']) < 3:
                continue
            f = features(d)
            if f['level'] != 6:
                continue
            cls = CLASS_IDS.index(classify(f))
            n = nest.get((d['family'], d['rule'], d['combo']))
            if n is None or 6 not in n:
                missing_nest += 1
                if not partial:
                    sys.exit(f"no nesting for {d['family']} {d['rule']} {d['combo']}; run nest-all.sh or pass --allow-partial")
                n = {}
            f.update(extra_features(d, n))
            row = [cls]
            for fd in FIELDS:
                v, lo, hi = f[fd['key']], fd['lo'], fd['hi']
                s = math.log2(1 + max(v, 0)) if fd['scale'] == 'log2' else v
                if s < lo - 1e-9:
                    clamped[fd['key']][0] += 1
                elif s > hi + 1e-9:
                    clamped[fd['key']][1] += 1
                row.append(q(v, lo, hi, fd['scale']))
            rows.setdefault((d['family'], d['rule']), {})[d['combo']] = bytes(row)
    blocks, chunks, offset = [], [], 0
    order = {'spectre': 0, 'hex': 1, 'spectre-iso': 2}
    for (fam, rule) in sorted(rows, key=lambda k: (order[k[0]], len(k[1]), k[1])):
        oc = counts[f'{fam}|{rule}']
        total = math.prod(oc)
        have = rows[(fam, rule)]
        if len(have) < total and not partial:
            sys.exit(f'{fam} {rule}: only {len(have)} of {total} rows; pass --allow-partial')
        # Enumeration order == lexicographic order of the combination string.
        rb = 1 + len(FIELDS)
        out = bytearray(b'\xff' + bytes(len(FIELDS))) * total
        for combo, row in have.items():
            idx = 0
            for digit, k in zip(combo, oc):
                idx = idx * k + int(digit, 36)
            out[idx * rb:(idx + 1) * rb] = row
        chunks.append(bytes(out))
        blocks.append({'family': fam, 'rule': rule, 'count': total, 'done': len(have), 'offset': offset})
        offset += total
    os.makedirs(OUT, exist_ok=True)
    # Stored column by column (every row's class, then every row's first field,
    # ...): similar bytes sit together and gzip about a quarter smaller. The
    # page transposes back to rows on load.
    packed = b''.join(chunks)
    rb = 1 + len(FIELDS)
    with gzip.open(f'{OUT}/points.bin.gz', 'wb', compresslevel=9) as fh:
        for k in range(rb):
            fh.write(packed[k::rb])
    meta = {
        'version': 3,
        'rowBytes': 1 + len(FIELDS),
        'layout': 'columns',
        'classes': [{'id': c, 'label': CLASSES[c]} for c in CLASS_IDS],
        'fields': [{k: v for k, v in fd.items() if k != 'integer' or v} for fd in FIELDS],
        'blocks': blocks,
        'levels': 'Growth from level 4 to level 6; everything else at level 6 unless the field says otherwise.',
        'thresholds': {k: {'value': v, 'meaning': m} for k, (v, m) in THRESHOLDS.items()},
    }
    with open(f'{OUT}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=1, ensure_ascii=False)
    for k, (lo, hi) in clamped.items():
        if lo or hi:
            print(f'note: {k}: {lo} rows below its range, {hi} above (clamped)')
    if missing_nest:
        print(f'warning: {missing_nest} rows have no nesting yet (written as 0)')
    print(len(blocks), 'blocks,', offset, 'rows,', os.path.getsize(f'{OUT}/points.bin.gz'), 'bytes gzipped')


if __name__ == '__main__':
    main()
