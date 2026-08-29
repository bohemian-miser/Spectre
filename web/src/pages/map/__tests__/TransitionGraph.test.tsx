// @vitest-environment jsdom
/**
 * The graph's job is to make DIRECTION visible: `Phi → Gamma1` and
 * `Gamma1 → Phi` are different facts about the substitution and must not be
 * drawn as one line. So the load-bearing test here is geometric — the two
 * directions of a pair must bow to opposite sides of the chord between them.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LEAF_ORDER } from '../../../core';
import { TransitionGraph } from '../TransitionGraph';
import type { Chain, GraphSelection } from '../transitions';

const N = LEAF_ORDER.length;
const colors = LEAF_ORDER.map((_, i) => `rgb(${i}, ${i}, ${i})`);
const indexOf = (name: string): number => LEAF_ORDER.indexOf(name as never);

/** An all-zero matrix with the given pairs set. */
function matrix(pairs: Record<string, number> = {}): number[] {
  const m = new Array<number>(N * N).fill(0);
  for (const [key, count] of Object.entries(pairs)) {
    const [from, to] = key.split('>');
    m[indexOf(from) * N + indexOf(to)] = count;
  }
  return m;
}

const edgeFor = (container: Element, from: string, to: string): SVGGElement => {
  const g = container.querySelector<SVGGElement>(
    `.tg-edge[data-from="${from}"][data-to="${to}"]`,
  );
  if (!g) throw new Error(`no edge ${from} → ${to}`);
  return g;
};

const lineOf = (g: Element): SVGPathElement =>
  g.querySelector<SVGPathElement>('.tg-line') as SVGPathElement;

/** Numbers out of a path `d`, in order. */
const nums = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

/** Which side of the directed line a→b the point c falls on. */
const side = (a: number[], b: number[], c: number[]): number =>
  Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));

/**
 * Hover is resolved by nearest curve to the pointer, so the tests have to give
 * the SVG a real box — jsdom reports 0×0 otherwise and every distance is
 * meaningless. 240×240 matches the viewBox, so viewBox units are pixels.
 */
function withBox(container: Element): SVGSVGElement {
  const svg = container.querySelector('svg') as SVGSVGElement;
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 240, height: 240, right: 240, bottom: 240, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return svg;
}

/** Where a type's name is drawn, in viewBox units (SIZE 240, LABEL_R 60). */
function labelAt(i: number): { clientX: number; clientY: number } {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  return { clientX: 120 + Math.cos(a) * 60, clientY: 120 + Math.sin(a) * 60 };
}

/** The midpoint of an edge's own curve, in viewBox units. */
function edgeMid(container: Element, from: string, to: string): { clientX: number; clientY: number } {
  const d = lineOf(edgeFor(container, from, to)).getAttribute('d')!;
  // Midpoint of the quadratic: (start + 2·ctrl + end) / 4.
  const [sx, sy, cx, cy, ex, ey] = nums(d);
  return { clientX: (sx + 2 * cx + ex) / 4, clientY: (sy + 2 * cy + ey) / 4 };
}

/** Move the pointer to a point on this edge's own curve. */
function hoverEdge(container: Element, from: string, to: string): void {
  fireEvent.mouseMove(withBox(container), edgeMid(container, from, to));
}

/** Click that same point — the pointer has to be there for the click to land. */
function clickEdge(container: Element, from: string, to: string): void {
  const at = edgeMid(container, from, to);
  fireEvent.mouseMove(withBox(container), at);
  fireEvent.click(withBox(container), at);
}

afterEach(cleanup);

describe('TransitionGraph', () => {
  it('names every leaf type, in its own colour', () => {
    const { container } = render(<TransitionGraph transitions={matrix()} colors={colors} />);
    const labels = [...container.querySelectorAll<SVGTextElement>('.tg-node text')];
    expect(labels.map((t) => t.textContent)).toEqual([...LEAF_ORDER]);
    expect(labels[indexOf('Phi')].getAttribute('fill')).toBe(colors[indexOf('Phi')]);
  });

  it('draws every ordered pair — all n², self-transitions included', () => {
    const { container } = render(<TransitionGraph transitions={matrix()} colors={colors} />);
    expect(container.querySelectorAll('.tg-edge')).toHaveLength(N * N);
    // A tile type really can follow itself, so that edge has to exist too.
    expect(() => edgeFor(container, 'Psi', 'Psi')).not.toThrow();
  });

  it('bows the two directions of a pair to OPPOSITE sides of their chord', () => {
    const { container } = render(<TransitionGraph transitions={matrix()} colors={colors} />);
    const fwd = nums(lineOf(edgeFor(container, 'Phi', 'Gamma1')).getAttribute('d')!);
    const rev = nums(lineOf(edgeFor(container, 'Gamma1', 'Phi')).getAttribute('d')!);
    // "M sx sy Q cx cy ex ey"
    const [fsx, fsy, fcx, fcy, fex, fey] = fwd;
    const [, , rcx, rcy] = rev;

    const start = [fsx, fsy];
    const end = [fex, fey];
    const a = side(start, end, [fcx, fcy]);
    const b = side(start, end, [rcx, rcy]);
    expect(a).not.toBe(0);
    expect(b).not.toBe(0);
    expect(a).toBe(-b);

    // And they are genuinely different curves, not a mirrored duplicate.
    expect(fwd).not.toEqual(rev);
  });

  it('points each edge at its target with an arrow in the source colour', () => {
    const { container } = render(<TransitionGraph transitions={matrix()} colors={colors} />);
    const line = lineOf(edgeFor(container, 'Phi', 'Gamma1'));
    const marker = line.getAttribute('marker-end');
    expect(marker).toMatch(/^url\(#tg-/);
    const id = marker!.slice(5, -1);
    const head = container.querySelector(`#${id} path`);
    // The arrow says who is leaving, so it wears the SOURCE type's colour.
    expect(head?.getAttribute('fill')).toBe(colors[indexOf('Phi')]);
  });

  it('weights an edge by its count, and keeps unused pairs faint but drawn', () => {
    const { container } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 40, 'Xi>Pi': 4 })}
        colors={colors}
      />,
    );
    const w = (f: string, t: string): number =>
      Number(lineOf(edgeFor(container, f, t)).getAttribute('stroke-width'));
    const o = (f: string, t: string): number =>
      Number(lineOf(edgeFor(container, f, t)).getAttribute('stroke-opacity'));

    expect(w('Phi', 'Gamma1')).toBeGreaterThan(w('Xi', 'Pi'));
    expect(w('Xi', 'Pi')).toBeGreaterThan(w('Delta', 'Theta')); // unused
    expect(o('Delta', 'Theta')).toBeGreaterThan(0); // faint, not gone
    expect(o('Delta', 'Theta')).toBeLessThan(o('Phi', 'Gamma1'));
  });

  it('shows the count on hover, and drops it again on leave', () => {
    const { container, queryByTestId } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 12 })} colors={colors} />,
    );
    expect(queryByTestId('transition-readout')).toBeNull();

    hoverEdge(container, 'Phi', 'Gamma1');
    expect(queryByTestId('transition-readout')?.textContent).toBe('Phi → Gamma1: 12');

    fireEvent.mouseLeave(withBox(container));
    expect(queryByTestId('transition-readout')).toBeNull();
  });

  it('reads a direction apart from its reverse on hover', () => {
    const { container, queryByTestId } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 12, 'Gamma1>Phi': 3 })}
        colors={colors}
      />,
    );
    // The two directions bow apart, so aiming at one must not read the other.
    hoverEdge(container, 'Gamma1', 'Phi');
    expect(queryByTestId('transition-readout')?.textContent).toBe('Gamma1 → Phi: 3');
    hoverEdge(container, 'Phi', 'Gamma1');
    expect(queryByTestId('transition-readout')?.textContent).toBe('Phi → Gamma1: 12');
  });

  it('carries the count on every edge for hover-free readers too', () => {
    const { container } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 12 })} colors={colors} />,
    );
    expect(edgeFor(container, 'Phi', 'Gamma1').getAttribute('data-count')).toBe('12');
    expect(edgeFor(container, 'Phi', 'Gamma1').querySelector('title')?.textContent).toBe(
      'Phi → Gamma1: 12',
    );
  });

  it('ignores a pointer far from every counted edge', () => {
    const { container, queryByTestId } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 12 })} colors={colors} />,
    );
    // A corner, well outside the ring: nothing uncounted may claim the pointer.
    fireEvent.mouseMove(withBox(container), { clientX: 8, clientY: 8 });
    expect(queryByTestId('transition-readout')).toBeNull();
  });

  it('expands to four times the area and back', () => {
    const { container, getByTestId } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 3 })} colors={colors} />,
    );
    const panel = container.querySelector('.trace-graph')!;
    expect(panel.getAttribute('data-expanded')).toBe('0');
    expect(panel.className).not.toContain('is-big');

    fireEvent.click(getByTestId('transition-expand'));
    expect(panel.getAttribute('data-expanded')).toBe('1');
    expect(panel.className).toContain('is-big');

    fireEvent.click(getByTestId('transition-expand'));
    expect(panel.getAttribute('data-expanded')).toBe('0');
  });

  it('reports the hovered edge outward, and clears it on leave', () => {
    const seen: (GraphSelection | null)[] = [];
    const { container } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 3 })}
        colors={colors}
        onSelect={(p) => seen.push(p)}
      />,
    );
    seen.length = 0;
    hoverEdge(container, 'Phi', 'Gamma1');
    expect(seen.at(-1)).toEqual({ kind: 'pair', from: indexOf('Phi'), to: indexOf('Gamma1') });
    fireEvent.mouseLeave(withBox(container));
    expect(seen.at(-1)).toBeNull();
  });

  it('offers the highlight toggles only when the page handles them', () => {
    const bare = render(<TransitionGraph transitions={matrix()} colors={colors} />);
    expect(bare.queryByTestId('highlight-on-screen')).toBeNull();
    cleanup();

    const onScreen = vi.fn();
    const inPath = vi.fn();
    const wired = render(
      <TransitionGraph
        transitions={matrix()}
        colors={colors}
        highlightOnScreen
        onToggleOnScreen={onScreen}
        highlightInPath={false}
        onToggleInPath={inPath}
      />,
    );
    expect((wired.getByTestId('highlight-on-screen') as HTMLInputElement).checked).toBe(true);
    expect((wired.getByTestId('highlight-in-path') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(wired.getByTestId('highlight-in-path'));
    expect(inPath).toHaveBeenCalled();
  });

  it('renders nothing without a square matrix to draw', () => {
    const { container } = render(<TransitionGraph transitions={[]} colors={colors} />);
    expect(container.querySelector('.trace-graph')).toBeNull();
    const { container: ragged } = render(
      <TransitionGraph transitions={[1, 2, 3]} colors={colors} />,
    );
    expect(ragged.querySelector('.trace-graph')).toBeNull();
  });

  it('survives a colour table shorter than the type list', () => {
    const { container } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 2 })} colors={['rgb(1, 1, 1)']} />,
    );
    expect(container.querySelectorAll('.tg-edge')).toHaveLength(N * N);
  });
});

/**
 * A pick has to outlive the pointer. Hovering a hundred curves is how you find
 * one; holding on to it is how you then go and look at the tiling.
 */
describe('TransitionGraph — picking things out', () => {
  const seen = (): { list: (GraphSelection | null)[]; onSelect(s: GraphSelection | null): void } => {
    const list: (GraphSelection | null)[] = [];
    return { list, onSelect: (s) => list.push(s) };
  };

  it('pins a clicked edge, and keeps it after the pointer leaves', () => {
    const out = seen();
    const { container, queryByTestId } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 12 })}
        colors={colors}
        onSelect={out.onSelect}
      />,
    );
    clickEdge(container, 'Phi', 'Gamma1');
    fireEvent.mouseLeave(withBox(container));

    expect(out.list.at(-1)).toEqual({ kind: 'pair', from: indexOf('Phi'), to: indexOf('Gamma1') });
    expect(queryByTestId('transition-pinned')?.textContent).toContain('Phi → Gamma1');
    // The readout still names it with nothing under the pointer.
    expect(queryByTestId('transition-readout')?.textContent).toBe('Phi → Gamma1: 12');
  });

  it('picks the whole type when a name is clicked', () => {
    const out = seen();
    const { container, queryByTestId } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 4 })} colors={colors} onSelect={out.onSelect} />,
    );
    const box = withBox(container);
    fireEvent.mouseMove(box, labelAt(indexOf('Lambda')));
    fireEvent.click(box, labelAt(indexOf('Lambda')));
    expect(out.list.at(-1)).toEqual({ kind: 'type', type: indexOf('Lambda') });
    expect(queryByTestId('transition-pinned')?.textContent).toContain('Lambda');
  });

  it('lets go when the background is clicked', () => {
    const out = seen();
    const { container, queryByTestId } = render(
      <TransitionGraph transitions={matrix({ 'Phi>Gamma1': 4 })} colors={colors} onSelect={out.onSelect} />,
    );
    clickEdge(container, 'Phi', 'Gamma1');
    expect(queryByTestId('transition-pinned')).not.toBeNull();

    // A corner. The ring and its names are all within about 60 units of the
    // middle, so this is the one part that is background whatever the counts —
    // the middle is not, since long edges bow straight across it.
    const box = withBox(container);
    fireEvent.mouseMove(box, { clientX: 8, clientY: 8 });
    fireEvent.click(box, { clientX: 8, clientY: 8 });
    expect(queryByTestId('transition-pinned')).toBeNull();
    expect(out.list.at(-1)).toBeNull();
  });

  it('replaces one pick with the next rather than stacking them', () => {
    const out = seen();
    const { container, queryByTestId } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 12, 'Xi>Pi': 5 })}
        colors={colors}
        onSelect={out.onSelect}
      />,
    );
    clickEdge(container, 'Phi', 'Gamma1');
    clickEdge(container, 'Xi', 'Pi');
    fireEvent.mouseLeave(withBox(container));
    expect(out.list.at(-1)).toEqual({ kind: 'pair', from: indexOf('Xi'), to: indexOf('Pi') });
    expect(queryByTestId('transition-pinned')?.textContent).toContain('Xi → Pi');
  });

  /**
   * Clicking something and seeing nothing happen is the trap this avoids: the
   * path marks are one linear read of the trail, so an explicit pick turns
   * them on rather than quietly needing a checkbox first.
   */
  it('turns the path marks on when a pick would otherwise show nothing', () => {
    const inPath = vi.fn();
    const { container } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 12 })}
        colors={colors}
        highlightOnScreen={false}
        onToggleOnScreen={vi.fn()}
        highlightInPath={false}
        onToggleInPath={inPath}
      />,
    );
    clickEdge(container, 'Phi', 'Gamma1');
    expect(inPath).toHaveBeenCalledTimes(1);
  });

  it('leaves the modes alone when one is already on', () => {
    const inPath = vi.fn();
    const { container } = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 12 })}
        colors={colors}
        highlightOnScreen
        onToggleOnScreen={vi.fn()}
        highlightInPath={false}
        onToggleInPath={inPath}
      />,
    );
    clickEdge(container, 'Phi', 'Gamma1');
    expect(inPath).not.toHaveBeenCalled();
  });
});

const chain = (names: string[], count: number): Chain => ({
  types: names.map(indexOf),
  count,
});

describe('TransitionGraph — ranked runs', () => {
  const CHAINS: readonly Chain[] = [
    chain(['Phi', 'Gamma1'], 40),
    chain(['Xi', 'Pi'], 9),
    chain(['Delta', 'Theta'], 2),
  ];

  const ranked = (extra: Partial<React.ComponentProps<typeof TransitionGraph>> = {}) => {
    const r = render(
      <TransitionGraph
        transitions={matrix({ 'Phi>Gamma1': 40 })}
        colors={colors}
        chains={CHAINS}
        chainLength={2}
        {...extra}
      />,
    );
    fireEvent.click(r.getByTestId('transition-mode'));
    return r;
  };

  it('asks for pairs when opened, and for nothing when closed again', () => {
    const onChainLength = vi.fn();
    const r = render(
      <TransitionGraph transitions={matrix()} colors={colors} onChainLength={onChainLength} />,
    );
    expect(onChainLength).toHaveBeenLastCalledWith(null);
    fireEvent.click(r.getByTestId('transition-mode'));
    expect(onChainLength).toHaveBeenLastCalledWith(2);
    fireEvent.click(r.getByTestId('chain-length-5'));
    expect(onChainLength).toHaveBeenLastCalledWith(5);
    fireEvent.click(r.getByTestId('transition-mode'));
    expect(onChainLength).toHaveBeenLastCalledWith(null);
  });

  it('swaps the circle for a list, and grows to the full height', () => {
    const { container, getByTestId, queryByTestId } = ranked();
    expect(container.querySelector('.trace-graph')?.getAttribute('data-mode')).toBe('ranked');
    expect(container.querySelector('.trace-graph')?.className).toContain('is-tall');
    expect(container.querySelector('svg')).toBeNull();
    expect(getByTestId('chain-rows').children).toHaveLength(3);
    expect(queryByTestId('chain-distinct')?.textContent).toBe('3 distinct');
  });

  it('ranks commonest first, and rarest first on request', () => {
    const { getByTestId } = ranked();
    const counts = (): number[] =>
      [...getByTestId('chain-rows').children].map((li) => Number((li as HTMLElement).dataset.count));
    expect(counts()).toEqual([40, 9, 2]);
    fireEvent.click(getByTestId('chain-order'));
    expect(counts()).toEqual([2, 9, 40]);
  });

  it('picks a pair from a two-long row, and a chain from a longer one', () => {
    const out: (GraphSelection | null)[] = [];
    const three = [...CHAINS, chain(['Phi', 'Gamma1', 'Xi'], 7)];
    const { getByTestId } = ranked({ chains: three, chainLength: 3, onSelect: (s) => out.push(s) });

    fireEvent.click(getByTestId(`chain-row-${[indexOf('Xi'), indexOf('Pi')].join(',')}`));
    expect(out.at(-1)).toEqual({ kind: 'pair', from: indexOf('Xi'), to: indexOf('Pi') });

    const seq = ['Phi', 'Gamma1', 'Xi'].map(indexOf);
    fireEvent.click(getByTestId(`chain-row-${seq.join(',')}`));
    expect(out.at(-1)).toEqual({ kind: 'chain', types: seq });
    expect(getByTestId('transition-pinned').textContent).toContain('Phi Gamma1 Xi');
  });

  it('previews a row on hover and falls back to the pin on leave', () => {
    const out: (GraphSelection | null)[] = [];
    const { getByTestId } = ranked({ onSelect: (s) => out.push(s) });
    const pair = getByTestId(`chain-row-${[indexOf('Phi'), indexOf('Gamma1')].join(',')}`);
    const other = getByTestId(`chain-row-${[indexOf('Xi'), indexOf('Pi')].join(',')}`);

    fireEvent.click(pair);
    fireEvent.mouseEnter(other);
    expect(out.at(-1)).toEqual({ kind: 'pair', from: indexOf('Xi'), to: indexOf('Pi') });
    fireEvent.mouseLeave(other);
    expect(out.at(-1)).toEqual({ kind: 'pair', from: indexOf('Phi'), to: indexOf('Gamma1') });
  });

  it('offers every length from one tile to thirty', () => {
    const { getByTestId, queryByTestId } = ranked();
    expect(queryByTestId('chain-length-1')).not.toBeNull();
    expect(queryByTestId('chain-length-30')).not.toBeNull();
    expect(queryByTestId('chain-length-31')).toBeNull();
    fireEvent.click(getByTestId('chain-length-1'));
    // A single tile is a type, so its row picks the type out.
    expect(getByTestId('chain-length-1').getAttribute('aria-pressed')).toBe('true');
  });

  it('says it is counting until the numbers are for the length asked for', () => {
    const { getByTestId } = ranked({ chainLength: 2 });
    expect(getByTestId('chain-distinct').textContent).toBe('3 distinct');
    fireEvent.click(getByTestId('chain-length-7'));
    expect(getByTestId('chain-distinct').textContent).toBe('counting…');
  });

  it('draws a page of rows at a time, and more when asked', () => {
    const many: Chain[] = [];
    // Distinct sequences, as a real count is: i in base N, three digits.
    for (let i = 0; i < 450; i++) {
      many.push({ types: [i % N, Math.floor(i / N) % N, Math.floor(i / (N * N))], count: 450 - i });
    }
    const { getByTestId, queryByTestId } = ranked({ chains: many, chainLength: 3 });
    expect(getByTestId('chain-rows').children.length).toBe(200);
    fireEvent.click(getByTestId('chain-more'));
    expect(getByTestId('chain-rows').children.length).toBe(400);
    fireEvent.click(getByTestId('chain-more'));
    expect(getByTestId('chain-rows').children.length).toBe(450);
    expect(queryByTestId('chain-more')).toBeNull();
  });
});
