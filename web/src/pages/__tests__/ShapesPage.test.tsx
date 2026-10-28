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
    vi.restoreAllMocks();
  });

  it('groups turned copies of one shape and keeps a different shape apart', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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
    // The selected circuit's terms, rebuilt: with every term kept nothing is left over.
    expect(screen.getByTestId('shapes-terms-chart')).toBeTruthy();
    fireEvent.change(screen.getByTestId('shapes-rebuild-count'), { target: { value: '60' } });
    expect(screen.getByTestId('shapes-rebuild-left').textContent).toMatch(/^rms distance left to the circuit: 0\.0\d\d/);
    expect(screen.getByTestId('shapes-termgaps-note').textContent).toMatch(/^Gap over these terms 0\.0/);
  }, 30000);

  it('adds a combination of another rule, computed in the page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('index.json')) return new Response(JSON.stringify(index));
        const combo = url.split('/').pop()!.replace('.json', '') as keyof typeof classes;
        return new Response(JSON.stringify({ combo, circuits: classes[combo] }));
      }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ShapesPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('shapes-summary').textContent).toMatch(/^3 circuits/), { timeout: 10000 });
    fireEvent.change(screen.getByTestId('shapes-combo-level'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('shapes-combo-add'));
    await waitFor(() => expect(screen.getByTestId('shapes-added').textContent).toMatch(/023468·000000000/), { timeout: 20000 });
    await waitFor(() => expect(screen.getByTestId('shapes-summary').textContent).toMatch(/^([4-9]|\d\d) circuits in/), { timeout: 20000 });
    // A computed circuit knows its first tile, so it opens in the Explorer, tracing it from there.
    const link = screen.getByTestId('shapes-explorer').getAttribute('href')!;
    expect(link).toMatch(/#\/explorer\?.*md=infinite/);
    expect(link).toMatch(/wc=[A-Za-z]+(-\d-[A-Za-z]+)+/);
    expect(link).toMatch(/ts=/);
  }, 60000);
});
