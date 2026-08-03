// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatsPage from '../../StatsPage';

const DATASET = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/circuit_stats.json'), 'utf8'));

describe('dump', () => {
  it('dumps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => DATASET } as unknown as Response)));
    const { container } = render(<StatsPage syncUrl={false} base="/Spectre/" />);
    await waitFor(() => expect(container.querySelector('.stats-browse')).not.toBeNull());
    console.log('=== OVERVIEW\n' + container.querySelector('.stats-overview')!.textContent);
    console.log('=== CONTROLS\n' + container.querySelector('.stats-controls')!.textContent);
    console.log('=== CAPTION\n' + container.querySelector('.stats-table-caption')!.textContent);
    console.log('=== HEADERS\n' + [...container.querySelectorAll('thead th')].map(t=>t.textContent).join(' | '));
    console.log('=== ROW\n' + [...container.querySelectorAll('tr.stats-row')].slice(0,2).map(r=>r.textContent).join('\n'));
    fireEvent.click(container.querySelector('tr[data-row-id="2578-0000001100"] .stats-row-open')!);
    console.log('=== DETAIL\n' + container.querySelector('.stats-detail')!.textContent);
    console.log('=== PROVENANCE\n' + container.querySelector('.stats-provenance')!.textContent);
  });
});
