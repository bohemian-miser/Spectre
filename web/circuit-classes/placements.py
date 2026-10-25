"""Which combinations put their circuits in the same places?

Reads the per-tile maps of placement-maps.ts and the birth tables of
routing-orbit.ts, and writes the numbers and figures in docs/PLACEMENTS.md.

    cd web
    npx tsx circuit-classes/placement-maps.ts spectre 6 circuit-classes/data/maps
    npx tsx circuit-classes/placement-maps.ts hex 6 circuit-classes/data/maps
    npx tsx circuit-classes/placement-maps.ts spectre 6 circuit-classes/data/maps \\
        15,0136,0356,1278,2578,023678,01235678 3000
    for r in 15 128 258 01346 03456 023468; do   # every combination of each rule
      npx tsx circuit-classes/routing-orbit.ts hex 9 <rule-combo ...> > circuit-classes/data/orbit/hex-$r.jsonl
    done
    python3 circuit-classes/placements.py [figure dir]

Two combinations are compared by the Pearson correlation of their coarse maps:
for every level-1 supertile of the shared patch, the fraction of its tiles on a
circuit of at least 2^8 segments. Placements are average-linkage clusters at
correlation 0.7 (distance 0.3).
"""
import collections, gzip, json, math, os, sys
import numpy as np
from scipy.cluster.hierarchy import fcluster, linkage
from scipy.spatial.distance import squareform

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.join(HERE, 'data', 'maps')
ORBIT = os.path.join(HERE, 'data', 'orbit')
CLASSES = os.path.join(HERE, '..', 'public', 'data', 'classifications')
GROWING = ('triangle', 'mixed', 'thin', 'blob', 'line')
BLUE, ORANGE, INK, MUTED, SURFACE = '#2a78d6', '#eb6834', '#0b0b0b', '#52514e', '#fcfcfb'


def site_classes():
    """(family, rule, combo index) -> class id, from the Classifications page data."""
    meta = json.load(open(os.path.join(CLASSES, 'meta.json')))
    raw = np.frombuffer(gzip.open(os.path.join(CLASSES, 'points.bin.gz')).read(), np.uint8)
    col = raw[: len(raw) // meta['rowBytes']]  # column 0 is the class
    return {(b['family'], b['rule'], i): meta['classes'][col[b['offset'] + i]]['id']
            for b in meta['blocks'] for i in range(b['count'])}


def load_maps(name, classes):
    d = json.load(open(os.path.join(MAPS, name + '.json')))
    T = np.fromfile(os.path.join(MAPS, name + '.tiles.bin'), np.uint8).reshape(len(d['combos']), d['nTiles'])
    seen = collections.Counter()
    for c in d['combos']:
        i = c.get('index', seen[c['rule']])
        seen[c['rule']] += 1
        c['cls'] = classes.get((d['family'], c['rule'], i), '?')
    return d, T


def coarse_corr(d, T, rows, thr=8.0):
    idx = np.array(d['sup1'])
    cnt = np.bincount(idx, minlength=d['nSup1']).astype(float)
    C = np.stack([np.bincount(idx, weights=(T[r] >= thr * 10).astype(float), minlength=d['nSup1']) / cnt
                  for r in rows]).astype(np.float32)
    C -= C.mean(1, keepdims=True)
    C /= np.linalg.norm(C, axis=1, keepdims=True) + 1e-12
    return C @ C.T


def cluster(R, cut=0.3):
    D = np.clip(1 - R, 0, 2)
    D = (D + D.T) / 2
    np.fill_diagonal(D, 0)
    return fcluster(linkage(squareform(D, checks=False), 'average'), cut, 'distance')


def best_match_table(d, T):
    cs = d['combos']
    sel = [i for i, c in enumerate(cs) if c['cls'] in GROWING]
    R = coarse_corr(d, T, sel)
    rules = [cs[i]['rule'] for i in sel]
    rs = sorted(set(rules), key=lambda r: (len(r), r))
    print(f"\n{d['family']}: mean over a row rule's growing combinations of the best correlation in the column rule")
    print('| | ' + ' | '.join(f'`{r}`' for r in rs) + ' |\n|---|' + '---|' * len(rs))
    for ra in rs:
        ia = [k for k, r in enumerate(rules) if r == ra]
        out = []
        for rb in rs:
            ib = [k for k, r in enumerate(rules) if r == rb]
            sub = R[np.ix_(ia, ib)].copy()
            if ra == rb:
                np.fill_diagonal(sub, -1)
            out.append('–' if ra == rb and len(ia) < 2 else f'{sub.max(1).mean():.2f}')
        print(f'| `{ra}` | ' + ' | '.join(out) + ' |')


def placement_figure(d, T, out):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    cs = d['combos']
    sel = [i for i, c in enumerate(cs) if c['cls'] in GROWING]
    R = coarse_corr(d, T, sel)
    groups = collections.defaultdict(list)
    for k, (i, l) in enumerate(zip(sel, cluster(R))):
        groups[l].append((i, k))
    big = sorted(groups.values(), key=len, reverse=True)
    print(f"\n{d['family']} with the sampled full rule: {len(sel)} growing combinations, {len(big)} placements")
    xy = np.array(d['centre'])
    fig, axs = plt.subplots(2, 3, figsize=(15, 10.5), facecolor=SURFACE)
    for n, (ax, m) in enumerate(zip(axs.ravel(), big)):
        ks = [k for _, k in m]
        med = m[int(np.argmax(R[np.ix_(ks, ks)].mean(1)))][0]
        v = T[med] / 10
        on = v >= 8
        ax.scatter(*xy.T, s=0.02, c='#e4e3df', lw=0, rasterized=True)
        ax.scatter(*xy[on].T, s=0.12, c=v[on], cmap='Blues', vmin=6, vmax=15, lw=0, rasterized=True)
        rules = collections.Counter(cs[i]['rule'] for i, _ in m)
        ax.set_title(f"placement {n + 1}: {len(m)} combinations\n"
                     + ', '.join(f'{r} ×{c}' for r, c in rules.most_common())
                     + f"\nshown: {cs[med]['rule']}-{cs[med]['combo']}", fontsize=9, color=INK)
        ax.set_aspect('equal')
        ax.axis('off')
        print(f'  {n + 1}: {len(m)} ' + ', '.join(f'{r} x{c}' for r, c in rules.most_common())
              + f" | {dict(collections.Counter(cs[i]['cls'] for i, _ in m))} | medoid {cs[med]['rule']}-{cs[med]['combo']}")
    plt.tight_layout()
    plt.savefig(out, dpi=80, facecolor=SURFACE)
    plt.close()


def load_orbits(family):
    out = {}
    if not os.path.isdir(ORBIT):
        return out
    for f in sorted(os.listdir(ORBIT)):
        if f.startswith(family + '-') and f.endswith('.jsonl'):
            for line in open(os.path.join(ORBIT, f)):
                if line.startswith('{'):
                    o = json.loads(line)
                    out[o['share']] = o
    return out


def triangle_lengths(o, slots='013467'):
    t = {}
    for k, _T, sl, ln, _c in o['births']:
        if sl == slots:
            t[k] = max(t.get(k, 0), ln)
    return t


def orbit_report(orbs, out):
    lam = 4 + math.sqrt(15)  # area inflation of the substitution
    parity = collections.Counter()
    by_rule = collections.defaultdict(collections.Counter)
    ratios = []
    series = {'even': [], 'odd': []}
    for share, o in orbs.items():
        t = triangle_lengths(o)
        late = {k for k in t if k >= 6}
        p = 'none' if not late else 'even' if all(k % 2 == 0 for k in late) else 'odd' if all(k % 2 for k in late) else 'both'
        parity[p] += 1
        by_rule[share.split('-')[0]][p] += 1
        if t.get(7) and t.get(9):
            ratios.append(t[9] / t[7])
        if p in series:
            series[p].append(t)
    print('\nhex: levels (6..9) at which a 013467 circuit is born, by rule')
    for r, c in by_rule.items():
        print(f'  {r}: {dict(c)}')
    if ratios:
        r = min(ratios)
        print(f'  growth 7 -> 9: {min(ratios):.3f} .. {max(ratios):.3f}; dimension 2 ln(ratio) / (2 ln lambda) = {math.log(r) / math.log(lam):.3f}')
    any_o = next(iter(orbs.values()))
    dots = [sum(x) for x in any_o['dots']]
    g = dots[-1] / dots[-2]
    print(f'  boundary dots per level: x{g:.4f} (2+sqrt5 = {2 + math.sqrt(5):.4f}); dimension {2 * math.log(g) / math.log(lam):.3f}')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(7, 4.2), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    for p, col in (('even', BLUE), ('odd', ORANGE)):
        for t in series[p]:
            ks = sorted(k for k in t if k >= 2)
            ax.plot(ks, [t[k] for k in ks], color=col, lw=0.6, alpha=0.25, marker='o', ms=2.5)
        ax.plot([], [], color=col, lw=2, label=f'born at {p} levels ({len(series[p])} combinations)')
    ax.set_yscale('log')
    ax.set_xlabel('level of the supertile that closes the circuit', color=MUTED)
    ax.set_ylabel('length of the 013467 circuit (segments)', color=MUTED)
    ax.grid(axis='y', color='#e4e3df', lw=0.6)
    for sp in ('top', 'right'):
        ax.spines[sp].set_visible(False)
    ax.tick_params(colors=MUTED)
    ax.legend(frameon=False, fontsize=9)
    ax.set_title('Hexagons: the triangle circuit of every supertile, levels 2–9', color=INK, fontsize=10, loc='left')
    plt.tight_layout()
    plt.savefig(out, dpi=110, facecolor=SURFACE)
    plt.close()


if __name__ == '__main__':
    figs = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'docs', 'placements')
    os.makedirs(figs, exist_ok=True)
    classes = site_classes()
    for name in ('spectre-L6', 'hex-L6'):
        if os.path.exists(os.path.join(MAPS, name + '.json')):
            best_match_table(*load_maps(name, classes))
    full = 'spectre-L6-15_0136_0356_1278_2578_023678_01235678'
    if os.path.exists(os.path.join(MAPS, full + '.json')):
        placement_figure(*load_maps(full, classes), os.path.join(figs, 'spectre-placements.png'))
    orbs = load_orbits('hex')
    if orbs:
        orbit_report(orbs, os.path.join(figs, 'hex-triangle-births.png'))
