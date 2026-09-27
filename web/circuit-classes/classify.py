"""
Classify every swept combination into a pattern class, from how its strands
scale between two levels two apart (the triangle circuits grow on alternate
levels, so one-level steps flicker between x1 and x8).

  gC  growth exponent of the largest CLOSED strand vs tile count:
      length ~ N^gC, so its fractal dimension is about 2*gC.
      0 = bounded, ~0.7 = fractal outline (dim 1.4), ~0.85 = thin space-ish
      curve (dim 1.7), 1 = fills a fixed fraction of the plane.
  gO  the same for the largest OPEN strand (one that reaches the patch edge).
  fo  fraction of all segments on open strands.
  tri, fat, fill  shape of the biggest circuit (see features.ts).

Usage: python3 classify.py 'data/*.jsonl' > classes.csv
"""
import csv, glob, json, math, sys

CLASSES = {
    'triangle': 'Triangle fractal',
    'thin': 'Chaotic thin circuits',
    'line': 'Infinite line',
    'mixed': 'Space-filling + triangle',
    'blob': 'Space-filling circuits',
    'bounded': 'Bounded loops',
    'unclear': 'Unclear',
}

# Thresholds, in one place so they are easy to move. See README.md.
# export-site.py copies THRESHOLDS into meta.json so the page explains the
# classifier with the numbers it actually used.
THRESHOLDS = {
    'GROW': (0.5, 'gC or gO at or above this: the strand keeps growing with the patch'),
    'STATIC': (0.3, 'below this: it has stopped growing'),
    'LINE_G': (0.9, 'an open strand growing like N^1 or faster is a space-filling infinite line'),
    'LINE_FO': (0.5, '...and open strands must carry at least this share of all segments'),
    'SLIVER': (4, 'open strands at least this elongated are cut-offs along the patch edge, not lines'),
    'OFILL': (0.35, '...and a line fills its hull; a cut-open triangle outline does not'),
    'FILL': (0.45, 'a circuit covering this share of its hull is space-filling'),
    'TRI': (0.8, 'hull area over the smallest enclosing equilateral triangle: triangular at or above this'),
    'FAT': (0.35, 'enclosed area over hull area: a triangle outline encloses at least this much'),
    'THIN': (0.3, 'enclosed area over hull area: a thin thread encloses less than this'),
}
GROW, STATIC, LINE_G, LINE_FO, SLIVER, OFILL, FILL, TRI, FAT, THIN = (
    THRESHOLDS[k][0] for k in ('GROW', 'STATIC', 'LINE_G', 'LINE_FO', 'SLIVER', 'OFILL', 'FILL', 'TRI', 'FAT', 'THIN'))

def growth(a, b, na, nb):
    return math.log(max(b, 1) / max(a, 1)) / math.log(nb / na)

def features(d):
    L = d['levels']
    a, b = L[-3], L[-1]
    gC = growth(a['lmaxClosed'], b['lmaxClosed'], a['tiles'], b['tiles'])
    gO = growth(a['lmaxOpen'], b['lmaxOpen'], a['tiles'], b['tiles'])
    closed = [t for t in b['top'] if t['closed']]
    opened = [t for t in b['top'] if not t['closed']]
    c = closed[0] if closed else None
    o = opened[0] if opened else None
    # Share of segments on circuits that are "large" (>= 64 segments).
    big_mass = sum(m for k, m in enumerate(b['closedMass']) if k >= 6)
    return dict(
        family=d['family'], rule=d['rule'], combo=d['combo'], level=b['level'],
        gC=gC, gO=gO, fo=b['fracOpen'], top4=b['fracTop4'],
        Lc=b['lmaxClosed'], Lo=b['lmaxOpen'], nClosed=b['nClosed'], distinct=b['distinctClosed'],
        junctions=b['junctions'], bigMass=big_mass,
        cTri=c['tri'] if c else 0, cFat=c['fat'] if c else 0, cFill=c['fill'] if c else 0,
        cElong=c['elong'] if c else 0,
        loops=b['nClosed'] > 0 and b['fracOpen'] < 0.97,
        oFill=o['fill'] if o else 0, oElong=o['elong'] if o else 0, oTri=o['tri'] if o else 0,
    )

def classify(f):
    gC, gO, fo = f['gC'], f['gO'], f['fo']
    grows_c = gC >= GROW
    line_like = gO >= LINE_G and fo >= LINE_FO and f['oElong'] < SLIVER and f['oFill'] >= OFILL
    fat, tri, fill = f['cFat'], f['cTri'], f['cFill']
    if not grows_c and gO < STATIC:
        return 'bounded'
    if not grows_c and line_like:
        return 'line'
    if grows_c and line_like:
        # A space-filling line coexisting with circuits that keep growing.
        return 'mixed'
    if grows_c:
        if fill >= FILL:
            return 'mixed' if tri >= TRI else 'blob'
        if fat < 0:  # circuit runs through a class-0 junction: no enclosed area
            return 'triangle' if tri >= TRI else 'unclear'
        if tri >= TRI and fat >= FAT:
            return 'triangle'
        if fat < THIN:
            return 'thin'
    return 'unclear'

def main():
    rows = []
    for path in sorted(glob.glob(sys.argv[1])):
        with open(path) as fh:
            for line in fh:
                if line.strip():
                    f = features(json.loads(line))
                    f['cls'] = classify(f)
                    rows.append(f)
    w = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()))
    w.writeheader()
    for r in rows:
        w.writerow({k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()})

if __name__ == '__main__':
    main()
