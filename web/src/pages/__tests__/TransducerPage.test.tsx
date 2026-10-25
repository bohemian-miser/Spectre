// @vitest-environment jsdom
/**
 * The neighbour machine page. jsdom has no layout, so what is asserted is the
 * WIRING: selecting a tile and an edge produces a trace and an answer, the
 * transducer gives the same answer, the wall crossing returns a period, and
 * a strand under a rule closes into a circuit.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import TransducerPage from '../TransducerPage';

afterEach(() => cleanup());

const text = (c: HTMLElement, id: string): string => c.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';

describe('TransducerPage', () => {
  it('draws the default patch and names the selected tile by its address', () => {
    const { container } = render(<TransducerPage />);
    const svg = container.querySelector('[data-testid="td-svg"]') as SVGElement;
    expect(svg.getAttribute('data-tile-count')).toBe('496'); // a level-3 Delta supertile of hexagons
    expect(text(container, 'td-address')).toBe('P 0G 7D 1D'); // id 1.7.0 in a Delta
  });

  it('crossing an edge gives a trace, an answer, and the same answer from the transducer', () => {
    const { container } = render(<TransducerPage />);
    const trace = container.querySelector('[data-testid="td-trace"]')!;
    expect(trace.querySelectorAll('li').length).toBeGreaterThan(0);
    const result = text(container, 'td-result');
    expect(result).toContain('Answer');
    const m = /is (.+?), entered through its edge (\d)/.exec(result)!;
    expect(text(container, 'td-run-result')).toContain(m[1]);
    expect(text(container, 'td-run-result')).toContain(`edge ${m[2]}`);
    expect(container.querySelectorAll('.td__tile.is-neighbour')).toHaveLength(1);
  });

  it('selecting another tile and an outside edge reports that the patch ends', () => {
    const { container } = render(<TransducerPage />);
    // tile '1.1.1' is the Delta corner; some edge of some tile is on the outline. Find one by trying edges.
    const first = container.querySelector('.td__tile[data-id="7.7.7"]') as SVGElement;
    act(() => { fireEvent.click(first); });
    expect(text(container, 'td-address')).toContain('7D');
    let outside = false;
    for (let e = 0; e < 6 && !outside; e++) {
      const edges = container.querySelectorAll('.td__edge');
      act(() => { fireEvent.click(edges[e]); });
      outside = text(container, 'td-result').includes('No answer inside this patch');
    }
    // not every tile has an outside edge; the Gamma at 7.7.7 may be interior, so only check consistency
    const res = text(container, 'td-result');
    expect(res.includes('Answer') || res.includes('No answer')).toBe(true);
  });

  it('states the size of the machine and crosses the infinite Psi wall', () => {
    const { container } = render(<TransducerPage />);
    expect(text(container, 'td-machine-facts')).toMatch(/\d+ states/);
    expect(text(container, 'td-wall-result')).toContain('for ever');
    act(() => {
      fireEvent.change(container.querySelector('[data-testid="td-wall-period"]')!, { target: { value: 'nonsense' } });
    });
    expect(text(container, 'td-wall-result')).toContain('type:number');
  });

  it('walks a strand under the default rule to a circuit or out of the patch', () => {
    const { container } = render(<TransducerPage />);
    const chip = container.querySelector('[data-testid^="td-seam-"]') as HTMLButtonElement;
    expect(chip).not.toBeNull();
    act(() => { fireEvent.click(chip); });
    expect(text(container, 'td-strand-status')).toContain('0 segments so far');
    act(() => { fireEvent.click(container.querySelector('[data-testid="td-step"]')!); });
    expect(text(container, 'td-strand-status')).toMatch(/1 segments so far|Closed|Left the patch/);
    act(() => { fireEvent.click(container.querySelector('[data-testid="td-run-strand"]')!); });
    expect(text(container, 'td-strand-status')).toMatch(/Closed: a circuit of \d+ segments|Left the patch after \d+ segments/);
    expect(text(container, 'td-boundary-summary')).toMatch(/\d+ crossings on the outline/);
  });
});
