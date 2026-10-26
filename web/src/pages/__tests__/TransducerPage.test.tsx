// @vitest-environment jsdom
/**
 * The neighbour machine page. jsdom has no layout, so what is asserted is the
 * WIRING: a crossing reveals the neighbour or asks for a parent, choosing a
 * parent grows the world and retries, the rules carry the lookup's marks, the
 * machine's run agrees, and a strand step crosses the partner edge.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import TransducerPage from '../TransducerPage';

afterEach(() => cleanup());

const text = (c: HTMLElement, id: string): string => c.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';
const key = (k: string): void => { act(() => { fireEvent.keyDown(window, { key: k }); }); };

describe('TransducerPage', () => {
  it('starts with one tile and no world above it', () => {
    const { container } = render(<TransducerPage />);
    const svg = container.querySelector('[data-testid="td-svg"]')!;
    expect(svg.getAttribute('data-revealed')).toBe('1');
    expect(svg.getAttribute('data-drawn')).toBe('1');
    expect(text(container, 'td-address')).toBe('Pi');
    expect(container.querySelector('[data-testid="td-lookup"]')).toBeNull();
  });

  it('a crossing with no parent asks for one; choosing it grows the world and reveals the neighbour', () => {
    const { container } = render(<TransducerPage />);
    key('0');
    expect(container.querySelector('[data-testid="td-pending"]')).not.toBeNull();
    expect(text(container, 'td-result')).toContain('No answer yet');
    // Pi is slot 0 of a Gamma, among others
    const choice = container.querySelector('[data-testid="td-parent-Gamma-0"]') as HTMLButtonElement;
    expect(choice).not.toBeNull();
    act(() => { fireEvent.click(choice); });
    expect(container.querySelector('[data-testid="td-pending"]')).toBeNull();
    const svg = container.querySelector('[data-testid="td-svg"]')!;
    // the start tile and its neighbour are revealed, and the consulted supertile is drawn faintly
    expect(Number(svg.getAttribute('data-revealed'))).toBe(2);
    expect(Number(svg.getAttribute('data-drawn'))).toBeGreaterThan(2);
    expect(text(container, 'td-result')).toContain('Across it');
    expect(text(container, 'td-id')).not.toBe('(the root itself)');
    // the rule used carries a numbered badge
    const used = container.querySelectorAll('[data-testid="td-rules"] .xmap[data-used="1"]');
    expect(used.length).toBeGreaterThan(0);
    expect(container.querySelector('.xmap__badge')).not.toBeNull();
    // the machine agrees with the lookup
    const id = text(container, 'td-id');
    expect(text(container, 'td-run-result')).toContain(id);
  });

  it('a crossing inside the world reveals the neighbour at once and keeps the trail', () => {
    const { container } = render(<TransducerPage />);
    key('0');
    act(() => { fireEvent.click(container.querySelector('[data-testid="td-parent-Gamma-0"]')!); });
    const before = text(container, 'td-id');
    // cross back through the edge we entered by: that is inside the Gamma, no new parent needed
    const entry = /edge (\d)\./.exec(text(container, 'td-result'))![1];
    key(entry);
    expect(container.querySelector('[data-testid="td-pending"]')).toBeNull();
    expect(text(container, 'td-id')).toBe('0'); // back at the start, now slot 0 of the Gamma
    expect(text(container, 'td-id')).not.toBe(before);
    expect(container.querySelector('.td__trail')).not.toBeNull();
  });

  it('a strand step crosses the partner edge of the entry', () => {
    const { container } = render(<TransducerPage />);
    key('0');
    act(() => { fireEvent.click(container.querySelector('[data-testid="td-parent-Gamma-0"]')!); });
    const status = text(container, 'td-strand-status');
    if (status.includes('joins it to edge')) {
      const idBefore = text(container, 'td-id');
      act(() => { fireEvent.click(container.querySelector('[data-testid="td-strand-step"]')!); });
      const after = text(container, 'td-id');
      expect(after === idBefore ? container.querySelector('[data-testid="td-pending"]') !== null : true).toBe(true);
    } else {
      expect(status).toMatch(/carries no crossing|Pick the edge/);
    }
  });

  it('states the size of the machine and crosses the infinite Psi wall', () => {
    const { container } = render(<TransducerPage />);
    expect(text(container, 'td-machine-facts')).toMatch(/\d+ rows/);
    expect(text(container, 'td-wall-result')).toContain('repeating');
    act(() => {
      fireEvent.change(container.querySelector('[data-testid="td-wall-period"]')!, { target: { value: 'nonsense' } });
    });
    expect(text(container, 'td-wall-result')).toContain('type:number');
  });

  it('Start again returns to a single tile of the chosen type', () => {
    const { container } = render(<TransducerPage />);
    act(() => { fireEvent.change(container.querySelector('[data-testid="td-start"]')!, { target: { value: 'Delta' } }); });
    expect(text(container, 'td-address')).toBe('Delta');
    expect(container.querySelector('[data-testid="td-svg"]')!.getAttribute('data-revealed')).toBe('1');
  });
});
