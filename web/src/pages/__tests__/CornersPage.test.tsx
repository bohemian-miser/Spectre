// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CornersPage from '../CornersPage';

/** A triangle with its corners cut off, traced by n points evenly spaced along it, as the data files store it. */
function truncatedTriangle(n: number, cut: number) {
  const corners: [number, number][] = [];
  for (let j = 0; j < 3; j++) {
    const a = (2 * Math.PI * j) / 3;
    const b = (2 * Math.PI * (j + 1)) / 3;
    const A = [Math.cos(a), Math.sin(a)];
    const B = [Math.cos(b), Math.sin(b)];
    corners.push([A[0] + (B[0] - A[0]) * cut, A[1] + (B[1] - A[1]) * cut], [A[0] + (B[0] - A[0]) * (1 - cut), A[1] + (B[1] - A[1]) * (1 - cut)]);
  }
  const len = corners.map((c, i) => Math.hypot(corners[(i + 1) % 6][0] - c[0], corners[(i + 1) % 6][1] - c[1]));
  const total = len.reduce((a, b) => a + b, 0);
  const q = new Int16Array(2 * n);
  for (let j = 0; j < n; j++) {
    let d = (j / n) * total;
    let s = 0;
    while (d > len[s]) d -= len[s++];
    const a = corners[s];
    const b = corners[(s + 1) % 6];
    const x = a[0] + ((b[0] - a[0]) * d) / len[s];
    const y = a[1] + ((b[1] - a[1]) * d) / len[s];
    q[2 * j] = Math.round(((x + 1) / 2) * 65535) - 32768;
    q[2 * j + 1] = Math.round(((y + 1) / 2) * 65535) - 32768;
  }
  return Buffer.from(q.buffer).toString('base64');
}

const meta = { family: '147', aliases: ['13'], level: 7, type: 'Delta', length: 216, rg: 0.6, samples: 216, box: [-1, -1, 2] as const };
const index = { family: 'hex', rule: '023468', samples: 4320, generated: '2026-10-28', classes: [{ combo: '000100000', pattern: '???10??0?', kind: 'triangle', members: 100, maxLevel: 9, circuits: [meta] }] };
const classFile = { combo: '000100000', maxLevel: 9, circuits: [{ ...meta, pts: truncatedTriangle(216, 0.2) }] };

describe('CornersPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('walks corners round a circuit, fits its polygons and finds it three-fold', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('index.json') ? index : classFile))),
    );
    // jsdom has no 2D canvas; the epicycles draw nothing.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<CornersPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('corners-caption').textContent).toMatch(/\[147\] = \[13\].*216 tiles.*level-7 Delta/));
    // A triangle with its corners cut off: six sides, two lengths.
    await waitFor(() => expect(screen.getByTestId('corners-chosen').textContent).toBe('Chosen: 6 sides. '), { timeout: 20000 });
    expect(screen.getByTestId('corners-walk-table').textContent).toMatch(/^corners.*3.*6.*9/);
    fireEvent.change(screen.getByTestId('corners-add-k'), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('corners-add'));
    await waitFor(() => expect(screen.getByTestId('corners-walk-table').querySelectorAll('tbody tr')).toHaveLength(4));
    await waitFor(() => expect(screen.getByTestId('corners-symmetry').querySelector('title')).not.toBeNull());
    const thirds = [...screen.getByTestId('corners-symmetry').querySelectorAll('title')].map((t) => t.textContent);
    expect(thirds[1]).toBe('3-fold: 100.00%');
    fireEvent.click(screen.getByTestId('corners-mode-thirds'));
    await waitFor(() => expect(screen.getByTestId('corners-chosen').textContent).toBe('Chosen: 6 sides. '));
  }, 30000);
});
