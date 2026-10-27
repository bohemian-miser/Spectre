// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CircuitsPage from '../CircuitsPage';
import { shapePath, type Atlas } from '../circuits/data';

const square = { what: 'family [07]', level: 8, length: 25692, stop: 2, closed: true, pts: [0, 0, 4095, 0, 4095, 4095, 0, 4095], box: [0, 0, 400, 400] as const };
const strand = { ...square, what: 'longest open strand', closed: false, length: 99999 };
const atlas: Atlas = {
  family: 'hex',
  rule: '023468',
  generated: '2026-10-25',
  classes: [
    { representative: '000100000', members: ['000100000', '000100001'], pattern: '00010000?', kind: 'triangle', dimension: 1.45, growth: 19.9, depth: 9, longest: [0, 18, 3, 441, 66, 8784, 1272, 175221, 25356], openArc: [1, 2, 3, 4, 5, 6, 7, 8, 9], families: [{ slots: '013467', firstLevel: 4, lengths: [[], [], [], [441], [], [8784], [], [175221], []], counts: [0, 0, 0, 1, 0, 1, 0, 1, 0], growth: 19.9 }], shapes: [square] },
    { representative: '111000100', members: ['111000100', '111001101'], pattern: '1110?110?', kind: 'space-filling', dimension: 2.0, growth: 63.9, depth: 10, longest: [0, 0, 6, 6, 6, 402, 402, 25692, 25692, 1426650], openArc: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], families: [], shapes: [square, strand] },
  ],
};

describe('CircuitsPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a rule’s classes by kind, the space-fillers first, and a class’s families and silhouettes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(atlas))));
    render(<CircuitsPage />);
    await waitFor(() => expect(screen.getByTestId('circuits-summary').textContent).toMatch(/^4 pairings in 2 classes/));
    const headings = [...document.querySelectorAll('.circuits-kind h2')].map((h) => h.textContent);
    expect(headings[0]).toMatch(/^Space-filling/);
    expect(headings[1]).toMatch(/^Triangle fractals/);
    const cards = screen.getAllByTestId('circuits-card');
    expect(cards[0].textContent).toMatch(/1110\?110\?.*D 2\.00/);
    fireEvent.click(cards[0]);
    const detail = screen.getByTestId('circuits-detail');
    expect(detail.textContent).toMatch(/dimension 2\.00/);
    expect(detail.querySelectorAll('.circuits-members a')).toHaveLength(2);
    expect(detail.querySelector('.circuits-members a')!.getAttribute('href')).toMatch(/#\/explorer\?v=1/);
    // The open strand is the second silhouette.
    const tabs = screen.getAllByTestId('circuits-shape-tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['25,692 tiles', 'open strand, 99,999+']);
    fireEvent.click(tabs[1]);
    expect(screen.getByTestId('circuits-caption').textContent).toMatch(/still open/);
    fireEvent.click(cards[1]);
    expect(screen.getByTestId('circuits-families').textContent).toMatch(/013467.*L4.*175,221/);
  });

  it('draws closed silhouettes as closed paths', () => {
    expect(shapePath(square)).toBe('M0 0L4095 0L4095 4095L0 4095Z');
    expect(shapePath(strand).endsWith('Z')).toBe(false);
  });
});
