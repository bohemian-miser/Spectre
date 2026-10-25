"""
Lay out a centre-map sweep (centremap-sweep.ts) for the Centre map page.

Usage: python3 centremap-embed.py <shardDir> <outDir>

Reads plan.json and every rows-<k>.u8 / stats-<k>.u32 in shardDir (shards in
order), then:
  1. drops duplicate rows (pairings whose distances to every landmark are the
     same lay out on one spot anyway),
  2. reduces the distinct rows to 50 dimensions (incremental PCA, in batches),
  3. runs UMAP on them (2-D),
and writes to outDir:
  meta.json     the plan, how many distinct rows, the layout's bounds
  xy.i16        per pairing, x and y scaled to int16 over the bounds
  longest.u16   per pairing, its longest circuit (capped at 65535)
"""
import json
import os
import sys
import time

import numpy as np
from sklearn.decomposition import IncrementalPCA
import umap

shard_dir, out_dir = sys.argv[1], sys.argv[2]
t0 = time.time()
plan = json.load(open(os.path.join(shard_dir, 'plan.json')))
L = len(plan['landmarks'])
n_shards = plan['shards']

rows = []
stats = []
for k in range(n_shards):
    rows.append(np.fromfile(os.path.join(shard_dir, f'rows-{k}.u8'), dtype=np.uint8).reshape(-1, L))
    stats.append(np.fromfile(os.path.join(shard_dir, f'stats-{k}.u32'), dtype=np.uint32).reshape(-1, 3))
rows = np.concatenate(rows)
stats = np.concatenate(stats)
N = rows.shape[0]
assert N == plan['total'], (N, plan['total'])
print(f'{N} pairings x {L} landmarks loaded in {time.time() - t0:.0f}s', flush=True)

unique, inverse = np.unique(rows, axis=0, return_inverse=True)
inverse = inverse.reshape(-1)
U = unique.shape[0]
del rows
print(f'{U} distinct rows ({U / N:.1%}) after {time.time() - t0:.0f}s', flush=True)

dims = min(50, L, U)
pca = IncrementalPCA(n_components=dims, batch_size=max(dims, 50000))
for i in range(0, U, 50000):
    batch = unique[i:i + 50000].astype(np.float32)
    if batch.shape[0] >= dims:
        pca.partial_fit(batch)
reduced = np.concatenate([pca.transform(unique[i:i + 50000].astype(np.float32)) for i in range(0, U, 50000)]).astype(np.float32)
del unique
print(f'PCA to {dims} dims ({pca.explained_variance_ratio_.sum():.1%} of the variance) after {time.time() - t0:.0f}s', flush=True)

if U > 3:
    xy_u = umap.UMAP(n_components=2, n_neighbors=min(15, U - 1), min_dist=0.1, low_memory=True, verbose=True).fit_transform(reduced)
else:
    xy_u = np.zeros((U, 2), dtype=np.float32)
print(f'UMAP done after {time.time() - t0:.0f}s', flush=True)

xy = xy_u[inverse]
lo = xy.min(axis=0)
hi = xy.max(axis=0)
scale = np.where(hi > lo, 65534.0 / (hi - lo), 1.0)
q = np.round((xy - lo) * scale - 32767).astype(np.int16)

os.makedirs(out_dir, exist_ok=True)
q.tofile(os.path.join(out_dir, 'xy.i16'))
np.minimum(stats[:, 2], 65535).astype(np.uint16).tofile(os.path.join(out_dir, 'longest.u16'))
meta = dict(plan)
meta.pop('shards', None)
meta.update(
    distinct=int(U),
    bounds=dict(min=[float(lo[0]), float(lo[1])], max=[float(hi[0]), float(hi[1])]),
    files=dict(xy='xy.i16', longest='longest.u16'),
    pca=dict(dims=int(dims), variance=float(pca.explained_variance_ratio_.sum())),
    generated=time.strftime('%Y-%m-%d', time.gmtime()),
)
json.dump(meta, open(os.path.join(out_dir, 'meta.json'), 'w'), indent=1)
print(f'wrote {out_dir} after {time.time() - t0:.0f}s', flush=True)
