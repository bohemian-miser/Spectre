// @vitest-environment jsdom
/**
 * The chain rows of 140000001 against its data file read directly: a
 * harmonic drawn in each row for each `harm` row of that chain, linked to
 * the Harmonics page at its own level, a blank square for each harmonic
 * predicted above the build, and each drawing's runs of tiles adding up to
 * the harmonic's tiles.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComboView } from '../ComboView';
import { BUDGET, createDrawClient, drawCircuits } from '../drawings';
import type { PageCombo } from '../pageData';

const file = resolve(__dirname, '../../../../public/data/foundations/hex-023468/140000001.json');
const raw = JSON.parse(readFileSync(file, 'utf8')) as {
  found: [number, number, number, string, number, number, number, number, number, number][];
  harm: [number, number, number, number, number, number, number, number, number][];
  pred: [number, number, string, number][];
};

describe('chain rows of 140000001', () => {
  afterEach(cleanup);

  it('draw each harmonic of the data in its chain, linked at its level, and each predicted one as a blank square', async () => {
    const data = raw as unknown as PageCombo;
    const client = createDrawClient({ forceSync: true });
    const { container } = render(<ComboView data={data} client={client} circuit={null} onCircuit={() => undefined} />);
    const rows = [...container.querySelectorAll<HTMLElement>('[data-testid="fd-chain"]')];
    const rootOf = (row: HTMLElement): number => Number(row.querySelector('[data-testid="fd-card"]')!.getAttribute('data-circuit'));
    // a row per foundational circuit that is not a nugget
    expect(rows.map(rootOf).sort()).toEqual(raw.found.filter((f) => !f[9]).map((f) => f[0]).sort());

    const shown = rows.flatMap((row) =>
      [...row.querySelectorAll<HTMLAnchorElement>('[data-testid="fd-harm"]')].map((a) => ({ root: rootOf(row), level: Number(a.dataset.level), tiles: Number(a.dataset.tiles), href: a.getAttribute('href')! })),
    );
    const want = raw.harm.map((h) => ({ root: h[4], level: h[1], tiles: h[2] }));
    const key = (x: { root: number; level: number; tiles: number }) => `${x.root}/${x.level}/${x.tiles}`;
    expect(shown.map(key).sort()).toEqual(want.map(key).sort());
    for (const s of shown) {
      const q = new URL(s.href, 'http://x/').searchParams;
      expect(s.href).toMatch(/harmonics\.html\?/);
      expect([q.get('rule'), q.get('combo'), q.get('level'), q.get('c')]).toEqual(['023468', '140000001', String(s.level), `${s.level}-${s.tiles}`]);
    }

    // predicted above the build: the forecasts, two levels above the member predicted from, in its chain
    const rootOfId = new Map<number, number>([...raw.found.map((f) => [f[0], f[0]] as [number, number]), ...raw.harm.map((h) => [h[0], h[4]] as [number, number])]);
    const predicted = rows.flatMap((row) =>
      [...row.querySelectorAll<HTMLElement>('[data-testid="fd-harm-predicted"]')].map((d) => `${rootOf(row)}/${d.dataset.level}/${d.dataset.tiles}`),
    );
    expect(predicted.sort()).toEqual(raw.pred.filter((p) => p[2] === 'forecast' && p[3] > 0).map((p) => `${rootOfId.get(p[0])}/${p[1] + 2}/${p[3]}`).sort());

    // every harmonic drawn, within the point budget
    await waitFor(() => expect(container.querySelectorAll('[data-testid="fd-harm"] svg polygon')).toHaveLength(raw.harm.length), { timeout: 60000 });
    for (const p of container.querySelectorAll('[data-testid="fd-harm"] svg polygon')) expect(p.getAttribute('points')!.split(' ').length).toBeLessThanOrEqual(BUDGET);
    client.dispose();
  }, 90000);

  it('draws each harmonic at the place the data names: its runs add up to its tiles', () => {
    const ds = drawCircuits({ subset: [0, 2, 3, 4, 6, 8], combo: '140000001', want: raw.harm.map((h) => ({ id: h[0], place: h[8], level: h[1], length: h[2] })) });
    expect(ds.map((d) => [d.id, d.runs.reduce((a, b) => a + b, 0)])).toEqual(raw.harm.map((h) => [h[0], h[2]]));
    for (const d of ds) expect(d.xy.length / 2).toBeLessThanOrEqual(BUDGET);
  }, 60000);
});
