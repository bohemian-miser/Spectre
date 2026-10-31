// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import IdentifyPage from '../IdentifyPage';
import { CircuitShapes } from '../shapes/circuitShapes';
import { tileOf } from '../identify/identify';
import { identifyHref } from '../identify/href';

const SUBSET = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';

describe('IdentifyPage', () => {
  afterEach(cleanup);

  it('draws the strand beside its candidate and the candidate’s chain, level by level climbed', async () => {
    // a tile of the 14,679, built only to level 4: still open there
    const cs = new CircuitShapes('hex', SUBSET, [...COMBO].map((c) => parseInt(c, 36)), 6, 1, false);
    const c = cs.born.find((b) => b.level === 6 && b.length === 14679 && b.type === 'Delta')!;
    const at = tileOf(cs, c, Math.floor(c.length / 2));
    history.replaceState(null, '', `${identifyHref('/', { subset: SUBSET, combo: COMBO, tile: at.tile, edge: at.edge, level: 6 })}&upto=4`);
    render(<IdentifyPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('identify-verdict').textContent).toMatch(/^Open at level 4 after [\d,]+ tiles; most likely harmonic 1 of the 303, level 6/), { timeout: 30000 });
    // the strand, the candidate above the build, and the 303 it is carried up from, in one row of views
    await waitFor(() => expect(screen.getAllByTestId('harm-side')).toHaveLength(3), { timeout: 20000 });
    const captions = () => screen.getAllByTestId('harm-side').map((s) => s.querySelector('figcaption')!.textContent!);
    expect(captions()[0]).toMatch(/^this strand at level 3: /);
    expect(captions()[1]).toMatch(/^[=≠]?harmonic 1 of the 303, level 6 at level 3: /);
    expect(captions()[2]).toMatch(/^[=≠]?303 L4 at level 1: /);
    expect(screen.getByTestId('identify-harmonics-link').getAttribute('href')).toContain('c=4-303');

    // hovering a visit of the strand lights the visit of the candidate its reading is matched with
    await waitFor(() => expect(screen.getAllByTestId('harm-row').length).toBe(9), { timeout: 20000 });
    const rows = screen.getAllByTestId('harm-row');
    // three members a row: the strand's row at level 3 is the seventh
    const strandRow = rows[6], candidateRow = rows[7];
    expect(strandRow.dataset.level).toBe('3');
    expect(candidateRow.dataset.level).toBe('3');
    const visit = strandRow.querySelector('[data-testid="harm-item"]')!;
    fireEvent.mouseEnter(visit);
    await waitFor(() => expect(candidateRow.querySelector('.is-lit')?.textContent).toBe(visit.textContent), { timeout: 10000 });

    // a level lower, the strand's piece is shorter and compared afresh
    const before = screen.getByTestId('identify-at').textContent;
    fireEvent.change(screen.getByTestId('identify-climb'), { target: { value: '3' } });
    await waitFor(() => expect(screen.getByTestId('identify-at').textContent).not.toBe(before));
    await waitFor(() => expect(captions()[0]).toMatch(/^this strand at level 2: /), { timeout: 20000 });
  }, 90000);
});
