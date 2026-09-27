// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ClassificationsPage from '../ClassificationsPage';
import { buildData, findRow, rowCombo, type ClassificationMeta } from '../classifications/data';
import { createThumbnailClient } from '../../workers/thumbnailClient';

// A tiny dataset: the whole `15` rule (4 combinations) and part of `2578`.
const meta: ClassificationMeta = {
  version: 1,
  rowBytes: 16,
  classes: [
    { id: 'triangle', label: 'Triangle fractal' },
    { id: 'line', label: 'Infinite line' },
    { id: 'bounded', label: 'Bounded loops' },
  ],
  fields: Array.from({ length: 15 }, (_, i) => ({
    key: i === 0 ? 'gC' : i === 3 ? 'cFill' : `f${i}`,
    label: `Field ${i}`,
    lo: 0,
    hi: 1,
    scale: 'linear' as const,
    description: `About field ${i}`,
  })),
  blocks: [
    { family: 'spectre', rule: '15', count: 4, done: 4, offset: 0 },
    { family: 'spectre', rule: '2578', count: 64, done: 2, offset: 4 },
  ],
  levels: 'test',
};

function makeData() {
  const rows = new Uint8Array(68 * 16).fill(0);
  for (let r = 0; r < 68; r++) rows[r * 16] = 255; // not swept
  const set = (r: number, cls: number) => {
    rows[r * 16] = cls;
    rows[r * 16 + 1] = 40 + r;
    rows[r * 16 + 4] = 200 - r;
  };
  [0, 1, 2, 3].forEach((r) => set(r, 2));
  set(4, 1);
  set(5, 0);
  return buildData(meta, rows);
}

describe('ClassificationsPage', () => {
  afterEach(cleanup);

  it('recovers combination strings from row order', () => {
    const data = makeData();
    expect(rowCombo(data, 0)).toBe('0000000000');
    expect(rowCombo(data, 3)).toBe('0000100100');
    expect(findRow(data, 'spectre', '15', '0000100100')).toBe(3);
    expect(findRow(data, 'spectre', '2578', '0000000100')).toBe(5);
  });

  it('shows the classes with counts, toggles them, and tabulates rules', () => {
    render(
      <ClassificationsPage
        data={makeData()}
        syncUrl={false}
        thumbnailClient={createThumbnailClient({ forceSync: true })}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Classifications' })).toBeTruthy();
    const bounded = screen.getByTestId('cls-chip-bounded');
    expect(bounded.textContent).toContain('4');
    fireEvent.click(bounded);
    expect(bounded.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('2 of 64')).toBeTruthy();
    expect(screen.getByText(/62 combinations are not swept yet/)).toBeTruthy();
  });

  it('filters the legend counts by rule', () => {
    render(
      <ClassificationsPage
        data={makeData()}
        syncUrl={false}
        thumbnailClient={createThumbnailClient({ forceSync: true })}
      />,
    );
    fireEvent.change(screen.getByTestId('cls-rule'), { target: { value: 'spectre-2578' } });
    expect(screen.getByTestId('cls-chip-bounded').textContent).toContain('0');
    expect(screen.getByTestId('cls-chip-line').textContent).toContain('1');
  });
});
