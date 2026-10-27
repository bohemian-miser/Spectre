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

  it('previews each parent option faintly, cycles with the arrow keys, and Enter chooses the one shown', () => {
    const { container } = render(<TransducerPage />);
    key('0');
    const svg = container.querySelector('[data-testid="td-svg"]')!;
    expect(Number(svg.getAttribute('data-preview'))).toBeGreaterThan(0);
    const first = text(container, 'td-preview');
    expect(first).toContain('(1 of');
    key('ArrowRight');
    const second = text(container, 'td-preview');
    expect(second).toContain('(2 of');
    expect(second).not.toBe(first);
    key('ArrowLeft');
    expect(text(container, 'td-preview')).toBe(first);
    // the option shown is the one Enter chooses
    const m = /slot (\d) of a (\w+)/.exec(first)!;
    key('Enter');
    expect(container.querySelector('[data-testid="td-pending"]')).toBeNull();
    expect(text(container, 'td-world')).toContain(`level-1 ${m[2]}`);
    expect(text(container, 'td-address')).toContain(`of ${m[2]}`);
    expect(Number(container.querySelector('[data-testid="td-svg"]')!.getAttribute('data-preview'))).toBe(0);
  });

  it('every drawn tile has an orientation flag, and supertile boundaries are drawn once the world has a level', () => {
    const { container } = render(<TransducerPage />);
    expect(container.querySelectorAll('[data-testid="td-svg"] > path.td__flag')).toHaveLength(1);
    expect(container.querySelector('[data-testid="td-svg"]')!.getAttribute('data-boundaries')).toBe('0');
    key('0');
    act(() => { fireEvent.click(container.querySelector('[data-testid="td-parent-Gamma-0"]')!); });
    const svg = container.querySelector('[data-testid="td-svg"]')!;
    // every revealed tile is flagged (the faint ones too, up to a cap)
    expect(svg.querySelectorAll(':scope > path.td__flag').length).toBeGreaterThanOrEqual(Number(svg.getAttribute('data-revealed')));
    expect(svg.querySelectorAll(':scope > path.td__flag').length).toBeLessThanOrEqual(Number(svg.getAttribute('data-drawn')));
    expect(Number(svg.getAttribute('data-boundaries'))).toBeGreaterThan(0);
    // the rule pictures carry the same flags, one per child
    expect(container.querySelectorAll('[data-testid="xmap-Gamma"] .td__flag')).toHaveLength(7);
  });

  it('after choosing a start type in the dropdown, edge keys still cross, and arrows on the dropdown do not reset the board', () => {
    const { container } = render(<TransducerPage />);
    const select = container.querySelector('[data-testid="td-start"]') as HTMLSelectElement;
    act(() => { select.focus(); fireEvent.change(select, { target: { value: 'Gamma' } }); });
    expect(document.activeElement).not.toBe(select); // focus leaves the dropdown once a type is chosen
    key('0');
    expect(container.querySelector('[data-testid="td-pending"]')).not.toBeNull();
    // a digit typed while the dropdown has focus still crosses
    act(() => { fireEvent.click(container.querySelector('[data-testid="td-reset"]')!); });
    act(() => { select.focus(); fireEvent.keyDown(select, { key: '0' }); });
    expect(container.querySelector('[data-testid="td-pending"]')).not.toBeNull();
    // an arrow on the dropdown is the dropdown's, not the preview's
    const before = text(container, 'td-preview');
    act(() => { fireEvent.keyDown(select, { key: 'ArrowDown' }); });
    expect(text(container, 'td-preview')).toBe(before);
  });

  it('edge 0 of a Gamma: the first option offered is not the Gamma that repeats, and Enter twice lands the crossing', () => {
    const { container } = render(<TransducerPage />);
    act(() => { fireEvent.change(container.querySelector('[data-testid="td-start"]')!, { target: { value: 'Gamma' } }); });
    key('0');
    const chips = [...container.querySelectorAll('[data-testid^="td-parent-"]')].map((b) => b.getAttribute('data-testid'));
    expect(chips[0]).not.toBe('td-parent-Gamma-7');
    expect(text(container, 'td-preview')).toContain('1 more parent');
    key('Enter');
    expect(container.querySelector('[data-testid="td-pending"]')).not.toBeNull();
    key('Enter');
    expect(container.querySelector('[data-testid="td-pending"]')).toBeNull();
    expect(text(container, 'td-result')).toContain('Across it');
    expect(text(container, 'td-world')).toContain('level-2');
  });

  it('Enter on a focused parent button is left to the button: one choice, one growth', () => {
    const { container } = render(<TransducerPage />);
    key('0');
    const chip = container.querySelector('[data-testid="td-parent-Gamma-0"]') as HTMLButtonElement;
    act(() => { chip.focus(); fireEvent.keyDown(chip, { key: 'Enter' }); });
    expect(text(container, 'td-world')).toContain('level-0'); // the page did not act on it
    act(() => { fireEvent.click(chip); });
    expect(text(container, 'td-world')).toContain('level-1');
  });

  it('random keys and clicks never leave the board inconsistent', () => {
    let seed = 7;
    const r = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let run = 0; run < 12; run++) {
      const { container, unmount } = render(<TransducerPage />);
      const level = (): number => Number(/level-(\d+)/.exec(text(container, 'td-world'))![1]);
      for (let step = 0; step < 30; step++) {
        const x = r();
        const chips = container.querySelectorAll<HTMLButtonElement>('[data-testid^="td-parent-"]');
        if (x < 0.4) key(String(Math.floor(r() * 6)));
        else if (x < 0.55 && level() < 4) key('Enter');
        else if (x < 0.65) key(r() < 0.5 ? 'ArrowRight' : 'ArrowLeft');
        else if (x < 0.75 && chips.length && level() < 4) act(() => { fireEvent.click(chips[Math.floor(r() * chips.length)]); });
        else if (x < 0.85) {
          const tiles = container.querySelectorAll('.td__tile.is-revealed');
          act(() => { fireEvent.click(tiles[Math.floor(r() * tiles.length)]); });
        } else if (x < 0.9) {
          const select = container.querySelector('[data-testid="td-start"]') as HTMLSelectElement;
          act(() => { select.focus(); fireEvent.keyDown(select, { key: String(Math.floor(r() * 6)) }); });
        } else if (x < 0.95 && chips.length) act(() => { chips[0].focus(); fireEvent.keyDown(chips[0], { key: 'Enter' }); });
        else act(() => { fireEvent.click(container.querySelector('[data-testid="td-reset"]')!); });
        const svg = container.querySelector('[data-testid="td-svg"]')!;
        expect(svg.querySelectorAll('.td__tile.is-revealed').length, `run ${run} step ${step}`).toBe(Number(svg.getAttribute('data-revealed')));
        const id = text(container, 'td-id');
        expect(svg.querySelector(`.td__tile.is-selected[data-id="${id === '(the root itself)' ? '' : id}"]`), `run ${run} step ${step}: selected ${id} drawn`).not.toBeNull();
      }
      unmount();
    }
  }, 60_000);

  it('states the size of the machine and crosses the infinite Psi wall', () => {
    const { container } = render(<TransducerPage />);
    expect(text(container, 'td-machine-facts')).toMatch(/\d+ rows/);
    expect(text(container, 'td-wall-result')).toContain('repeating');
    act(() => {
      fireEvent.change(container.querySelector('[data-testid="td-wall-period"]')!, { target: { value: 'nonsense' } });
    });
    expect(text(container, 'td-wall-result')).toContain('type:number');
  });

  it('the wall view adds a level with + and lists one more row of both slot paths', () => {
    const { container } = render(<TransducerPage />);
    const rows = (): number => container.querySelectorAll('[data-testid="wall-table"] tbody tr').length;
    const svg = container.querySelector('[data-testid="wall-svg"]')!;
    expect(text(container, 'wall-n')).toBe('2');
    const before = rows();
    const tiles = Number(svg.getAttribute('data-tiles'));
    act(() => { fireEvent.click(container.querySelector('[data-testid="wall-more"]')!); });
    expect(text(container, 'wall-n')).toBe('3');
    expect(rows()).toBe(before + 1);
    expect(Number(svg.getAttribute('data-tiles'))).toBeGreaterThan(tiles);
    // the two key tiles carry orientation flags
    expect(svg.querySelectorAll('path.td__flag')).toHaveLength(2);
    // the frame follows n until a level is picked; picking one narrows the view
    expect(svg.getAttribute('data-framed')).toBe('3');
    const wide = svg.getAttribute('viewBox')!.split(' ').map(Number);
    act(() => { fireEvent.click(container.querySelector('[data-testid="wall-fit-0"]')!); });
    expect(svg.getAttribute('data-framed')).toBe('0');
    const narrow = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(narrow[2]).toBeLessThan(wide[2]);
    act(() => { fireEvent.change(container.querySelector('[data-testid="wall-preset"]')!, { target: { value: '2' } }); });
    expect(text(container, 'wall-table')).toContain('slot 2 of a Psi');
    act(() => { fireEvent.click(container.querySelector('[data-testid="wall-less"]')!); });
    act(() => { fireEvent.click(container.querySelector('[data-testid="wall-less"]')!); });
    expect(text(container, 'wall-n')).toBe('1');
    expect((container.querySelector('[data-testid="wall-less"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Start again returns to a single tile of the chosen type', () => {
    const { container } = render(<TransducerPage />);
    act(() => { fireEvent.change(container.querySelector('[data-testid="td-start"]')!, { target: { value: 'Delta' } }); });
    expect(text(container, 'td-address')).toBe('Delta');
    expect(container.querySelector('[data-testid="td-svg"]')!.getAttribute('data-revealed')).toBe('1');
  });
});
