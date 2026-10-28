// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShapesPage from '../ShapesPage';

/** A lopsided loop of n samples, as the data files store it (Int16 over the bounding square [-2, 2]). */
function loop(n: number, wobble: number, turn: number) {
  const q = new Int16Array(2 * n);
  for (let j = 0; j < n; j++) {
    const t = (2 * Math.PI * j) / n;
    const r = 1 + wobble * Math.cos(2 * t + 0.4) + 0.15 * Math.sin(3 * t);
    const x = r * Math.cos(t + turn);
    const y = r * Math.sin(t + turn);
    q[2 * j] = Math.round(((x + 2) / 4) * 65535) - 32768;
    q[2 * j + 1] = Math.round(((y + 2) / 4) * 65535) - 32768;
  }
  return Buffer.from(q.buffer).toString('base64');
}

const meta = (family: string, level: number, length: number) => ({ family, aliases: [], level, type: 'Delta', length, rg: 1, samples: 240, box: [-2, -2, 4] as const });
const classes = {
  '000100000': [
    { ...meta('013467', 6, 8784), pts: loop(240, 0.3, 0) },
    { ...meta('013467', 8, 175221), pts: loop(240, 0.3, 1.1) },
  ],
  '020001001': [{ ...meta('07', 8, 25878), pts: loop(240, 0.7, 0.2) }],
};
const index = {
  family: 'hex',
  rule: '023468',
  samples: 4320,
  generated: '2026-10-28',
  classes: Object.entries(classes).map(([combo, cs]) => ({ combo, pattern: combo, kind: 'triangle', members: 1, maxLevel: 9, circuits: cs.map(({ pts: _p, ...m }) => m) })),
};

describe('ShapesPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('groups turned copies of one shape and keeps a different shape apart', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('index.json')) return new Response(JSON.stringify(index));
        const combo = url.split('/').pop()!.replace('.json', '') as keyof typeof classes;
        return new Response(JSON.stringify({ combo, circuits: classes[combo] }));
      }),
    );
    render(<ShapesPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('shapes-summary').textContent).toBe('3 circuits in 2 groups: 1 of two or more, 1 alone.'), { timeout: 10000 });
    // The nearest shape to the first circuit is its turned copy, at a gap of about nothing.
    const first = screen.getByTestId('shapes-nearest').querySelector('tbody tr')!;
    expect(first.textContent).toMatch(/000100000 \[013467\] L8.*175,221.*0\.00\d/);
    expect(screen.getByTestId('shapes-groups').textContent).toMatch(/Group 1.*2 circuits.*1 combination; \[013467\] ×2/);
    // A threshold above the gap to the other shape puts all three together.
    fireEvent.change(screen.getByTestId('shapes-threshold'), { target: { value: '100' } });
    await waitFor(() => expect(screen.getByTestId('shapes-summary').textContent).toBe('3 circuits in 1 group: 1 of two or more, 0 alone.'));
  });
});
