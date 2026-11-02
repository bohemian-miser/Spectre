// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { matchingIndicesToCombo } from '../../core';
import { hashToState } from '../../lib/urlState';
import FoundationsPage from '../FoundationsPage';
import { indexLine, LIMIT_PARTS, type PageIndex } from '../foundations/pageData';

const dir = resolve(__dirname, '../../../public/data/foundations/hex-023468');

describe('FoundationsPage', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/Spectre/foundations.html');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(readFileSync(resolve(dir, url.split('/').pop()!), 'utf8'))),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a combination, its summary and a card per foundational circuit, drawn', async () => {
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/^First2Last found6Foundational5Chains \/ nuggets4 \/ 1Tails at 956\.4%Limit99\.45%Not accounted for0\.55%Marks short$/));
    expect(screen.getByTestId('fd-note').textContent).toMatch(/New foundationalnone at levels 7–9; not proven beyond/);
    const cards = screen.getAllByTestId('fd-card');
    expect(cards).toHaveLength(5);
    // the 303 at level 4 and its chain, each harmonic predicted, then built, and the next predicted above the build
    const c303 = cards.find((c) => c.textContent!.startsWith('303 tiles'))!;
    const row303 = c303.closest('[data-testid="fd-chain"]') as HTMLElement;
    expect([...row303.querySelectorAll('.fd-harm')].map((h) => h.textContent)).toEqual([
      '14,679 tileslevel 6 · 1 place ✓',
      '734,256 tileslevel 8 · 1 place ✓',
      '?36,701,253 tileslevel 10 · predictedBrute force',
    ]);
    // the 447 at level 6 is one circuit, in eight places there, and late
    const c447 = cards.find((c) => c.textContent!.startsWith('447 tiles'))!;
    expect(c447.textContent).toMatch(/late/);
    expect(c447.textContent).toMatch(/47 places from level 6 · children 07, 12, 13, 14, …/);
    // the 60 is a nugget
    expect(cards.find((c) => c.textContent!.startsWith('60 tiles'))!.textContent).toMatch(/nugget/);
    await waitFor(() => expect(c303.querySelector('svg polygon')).not.toBeNull(), { timeout: 30000 });
    expect(within(c303).getByText('Build-up').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}buildup.html?rule=023468&combo=140000001&level=4&circuit=303`);
    expect(within(c303).getByText('Explorer').getAttribute('href')).toMatch(/#\/explorer\?/);
    expect(within(c303).getByText('Harmonics').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}harmonics.html?rule=023468&combo=140000001&level=8&c=4-303`);
    // the combination's own links, the Explorer's read back by the Explorer's own reader
    const links = within(screen.getByTestId('fd-combo-links'));
    const href = links.getByText('Explorer').getAttribute('href')!;
    expect(href.startsWith(`${import.meta.env.BASE_URL}#/explorer?`)).toBe(true);
    const state = hashToState(href.slice(href.indexOf('#')));
    expect([state.family, state.subset.join(''), matchingIndicesToCombo(state.family, state.subset, state.matching), state.rootTile, state.level, state.mode]).toEqual([
      'hex',
      '023468',
      '140000001',
      'Delta',
      4,
      undefined,
    ]);
    expect(links.getByText('Harmonics').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}harmonics.html?rule=023468&combo=140000001&level=8`);
    expect(links.getByText('Build-up').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}buildup.html?rule=023468&combo=140000001&level=4`);
    // choosing a card puts it in the address
    fireEvent.click(c303);
    expect(location.search).toBe('?combo=140000001&circuit=1');
  }, 60000);

  it('sorts the list by limit, short ones first, and filters it by mark', async () => {
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getAllByTestId('fd-row')).toHaveLength(320));
    fireEvent.click(screen.getByTestId('fd-sort-limit'));
    const limits = screen.getAllByTestId('fd-limit').map((e) => parseFloat(e.textContent!));
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
    expect(screen.getAllByTestId('fd-row').slice(0, 4).map((r) => r.querySelector('.fd-digits')!.textContent)).toEqual(['110000001', '111000001', '101000001', '140000001']);
    // each row's bar is its limit's parts, from the index; its title gives each part's share
    const index = JSON.parse(readFileSync(resolve(dir, 'index.json'), 'utf8')) as PageIndex;
    for (const row of screen.getAllByTestId('fd-row')) {
      const r = index.combos.find((x) => x.combo === row.querySelector('.fd-digits')!.textContent)!;
      const bar = within(row).getByTestId('fd-bar');
      const drawn = [...bar.querySelectorAll('i')].map((i) => [i.getAttribute('data-part'), Number(i.getAttribute('data-value'))]);
      expect(drawn).toEqual(LIMIT_PARTS.map((x, i) => [x.key, r.parts[i]]).filter(([, v]) => (v as number) > 0));
    }
    expect(within(screen.getAllByTestId('fd-row')[0]).getByTestId('fd-bar').getAttribute('title')).toBe('Nuggets 37.5%\nFoundational 9.7%\nHarmonics 16.1%\nNot accounted for 36.7%');
    // sorted by what is not accounted for, the short ones lead
    fireEvent.click(screen.getByTestId('fd-sort-unaccounted'));
    expect(screen.getAllByTestId('fd-row').slice(0, 4).map((r) => r.querySelector('.fd-digits')!.textContent)).toEqual(['110000001', '111000001', '101000001', '140000001']);
    fireEvent.click(screen.getByTestId('fd-sort-limit'));
    const short = screen.getByTestId('fd-mark-short');
    expect(short.textContent).toMatch(/short 4$/);
    fireEvent.click(short);
    const rows = screen.getAllByTestId('fd-row');
    expect(rows).toHaveLength(4);
    for (const r of rows) expect(r.querySelector('[data-testid="fd-marks"]')!.getAttribute('data-marks')).toMatch(/^short\b/);
    // the panel of a short one names what is not accounted for and the chain not forecast
    fireEvent.click(rows[0]);
    await waitFor(() => expect(screen.getByTestId('fd-combo-marks').textContent).toMatch(/^ ?short/));
    expect(screen.getByTestId('fd-unaccounted').textContent).toBe('36.68%');
    expect(screen.getByTestId('fd-note').textContent).toMatch(/Not forecastchain of 60 at level 5: its members' shares do not fall \(ratio 1\.27\)/);
  }, 60000);

  it('lists the monsters and opens one in its combination', async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?view=monsters');
    render(<FoundationsPage forceSync />);
    const table = await screen.findByTestId('fd-monsters');
    // the short combinations are open problems there too, with what is not accounted for and the chain not forecast
    const short = screen.getAllByTestId('fd-short-row');
    expect(short.map((r) => r.querySelector('.fd-digits')!.textContent)).toEqual(['110000001', '111000001', '101000001', '140000001']);
    expect(short[0].textContent).toMatch(/^11000000163\.32%36\.68%chain of 60 at level 5: its members' shares do not fall \(ratio 1\.27\)$/);
    expect(short[1].textContent).toMatch(/chain of 60 at level 5/);
    expect(table.textContent).toMatch(/41 in 29 combinations: 24 late, 19 giant/);
    // a short combination is a monster: 41 circuits and 4 combinations
    expect(screen.getByTestId('fd-tab-monsters').textContent).toBe('Monsters (45) · short 4');
    expect(screen.getByTestId('fd-short').querySelector('h3')!.textContent).toMatch(/Short combinations: 4/);
    // the late ones that start a chain are explained, the two late nuggets not
    expect([screen.getByTestId('fd-explained').textContent, screen.getByTestId('fd-unexplained').textContent]).toEqual(['22', '2']);
    const first = screen.getAllByTestId('fd-monster-row')[0];
    expect(first.textContent).toMatch(/^031001001\s*47170,976/);
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/^First4/));
    expect(location.search).toMatch(/^\?combo=031001001&circuit=\d+$/);
    expect(screen.getAllByTestId('fd-card').find((c) => c.className.includes('fd-card-on'))!.textContent).toMatch(/^170,976 tiles/);
  }, 60000);

  it("reads another rule's precomputed data at its level", async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?rule=258');
    const d258 = resolve(dir, '../hex-258');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(readFileSync(resolve(d258, url.split('/').pop()!), 'utf8'))));
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getAllByTestId('fd-row')).toHaveLength(64));
    expect(screen.getByTestId('fd-live').textContent).toMatch(/^Rule 258: 64 combinations · precomputed to level 8/);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/^First\d/));
    expect(screen.queryByTestId('fd-sweep')).toBeNull();
  }, 60000);

  it('lists a rule written as index lines by first digit', async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?rule=258');
    const d258 = resolve(dir, '../hex-258');
    const rows = (JSON.parse(readFileSync(resolve(d258, 'index.json'), 'utf8')) as PageIndex).combos;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('index.json')
          ? // level 4, so the combination analysed live on opening is quick
            new Response(JSON.stringify({ rule: '258', format: 'lines', levels: 4, shards: { 0: rows.length } }))
          : new Response(rows.map(indexLine).join('\n')),
      ),
    );
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getAllByTestId('fd-row')).toHaveLength(64));
    expect(screen.getByTestId('fd-live').textContent).toMatch(/^Rule 258: 64 combinations · listed to level 4; each combination analysed here when chosen/);
    expect((screen.getByTestId('fd-first-digit') as HTMLSelectElement).value).toBe('0');
  }, 60000);

  it('analyses a rule with no precomputed data live, and sweeps it', async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?rule=15&level=6');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/^First\d/), { timeout: 60000 });
    expect(screen.getByTestId('fd-live').textContent).toMatch(/Rule 15: \d+ combinations · level 6, analysed here/);
    fireEvent.click(screen.getByTestId('fd-sweep'));
    await waitFor(() => expect(screen.getByTestId('fd-rows').textContent).toMatch(/\d{9}/), { timeout: 120000 });
    expect(location.search).toMatch(/rule=15/);
  }, 180000);
});
