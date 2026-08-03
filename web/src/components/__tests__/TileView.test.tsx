// @vitest-environment jsdom
/**
 * The DOM structure of §6.1 is a contract other stages build on (CSS hooks,
 * Playwright selectors, the explainer's hover tallies), so it is asserted here.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  connectionCount,
  connectionPoints,
  leafOrder,
  metaEdges,
  type TileTypeId,
} from '../../core';
import { TileView } from '../TileView';
import { TilingView } from '../TilingView';
import { CircuitLayer } from '../CircuitLayer';
import { MatchingSlider } from '../controls/MatchingSlider';
import { EdgeClassLegend } from '../controls/EdgeClassLegend';

afterEach(cleanup);

const SUBSET = new Set([2, 5, 7, 8]);

describe('TileView DOM contract (§6.1)', () => {
  it('renders the layer groups in order', () => {
    const { container } = render(<TileView family="spectre" tileType="Delta" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe('Delta tile');

    const groups = [...svg!.children].map((c) => c.getAttribute('class'));
    expect(groups).toEqual([
      'tile-fill',
      'meta-edges',
      'matching-chords',
      'overlays',
      'edge-labels',
    ]);
  });

  it('emits one focusable group per meta-edge with data-edge-id/data-major', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Delta" interaction="hover" />,
    );
    const seams = metaEdges('spectre', 'Delta');
    const groups = container.querySelectorAll('.meta-edges [data-edge-id]');
    expect(groups).toHaveLength(seams.length);

    seams.forEach((seam) => {
      const g = container.querySelector(`[data-edge-id="${seam.id}"]`);
      expect(g, seam.id).not.toBeNull();
      expect(g!.getAttribute('data-major')).toBe(String(seam.major));
      expect(g!.getAttribute('role')).toBe('button');
      expect(g!.getAttribute('tabindex')).toBe('0');
      expect(g!.querySelector('path.edge-hit')).not.toBeNull();
      expect(g!.querySelector('path.edge-visual')).not.toBeNull();
    });
  });

  it('draws a connection dot exactly for the selected classes', () => {
    for (const type of leafOrder('spectre')) {
      const { container, unmount } = render(
        <TileView family="spectre" tileType={type as TileTypeId} selectedEdges={SUBSET} />,
      );
      expect(container.querySelectorAll('circle.edge-dot')).toHaveLength(
        connectionCount('spectre', type, SUBSET),
      );
      unmount();
    }
  });

  it('drops every dot when nothing is selected', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Psi" selectedEdges={new Set()} />,
    );
    expect(container.querySelectorAll('circle.edge-dot')).toHaveLength(0);
  });

  it('draws one chord per pair of the active matching', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Psi" selectedEdges={SUBSET} matchingIndex={0} />,
    );
    const n = connectionCount('spectre', 'Psi', SUBSET);
    expect(container.querySelectorAll('.matching-chords line:not(.is-ghost)')).toHaveLength(n / 2);
  });

  it('ghostMatchings adds the remaining matchings at low alpha', () => {
    const { container } = render(
      <TileView
        family="spectre"
        tileType="Psi"
        selectedEdges={SUBSET}
        matchingIndex={0}
        ghostMatchings
      />,
    );
    expect(container.querySelectorAll('.matching-chords line.is-ghost').length).toBeGreaterThan(0);
  });

  it('renders the Mystic composite as two shapes with both leaves seams', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Gamma" selectedEdges={SUBSET} />,
    );
    expect(container.querySelectorAll('.tile-fill path')).toHaveLength(2);
    const expected =
      metaEdges('spectre', 'Gamma1').length + metaEdges('spectre', 'Gamma2').length;
    expect(container.querySelectorAll('[data-edge-id]')).toHaveLength(expected);
    expect(container.querySelector('[data-edge-id^="Gamma1/"]')).not.toBeNull();
    expect(container.querySelector('[data-edge-id^="Gamma2/"]')).not.toBeNull();
  });

  it('shows edge labels for every physical edge when asked', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Delta" showEdgeLabels />,
    );
    expect(container.querySelectorAll('.edge-labels text')).toHaveLength(14);
  });

  it('reports edge clicks with a resolved EdgeRef', () => {
    const onEdgeClick = vi.fn();
    const { container } = render(
      <TileView
        family="spectre"
        tileType="Delta"
        selectedEdges={SUBSET}
        interaction="edge-select"
        onEdgeClick={onEdgeClick}
      />,
    );
    const target = container.querySelector('[data-edge-id="Delta/2A"]') as Element;
    fireEvent.click(target);
    expect(onEdgeClick).toHaveBeenCalledTimes(1);
    const ref = onEdgeClick.mock.calls[0][0];
    expect(ref.metaEdgeId).toBe('Delta/2A');
    expect(ref.major).toBe(2);
    expect(ref.tileType).toBe('Delta');
    expect(ref.label.raw).toBe('2.0A');
    // pointIndex indexes connectionPoints() order — load-bearing for matchings.
    const points = connectionPoints('spectre', 'Delta', SUBSET);
    expect(points[ref.pointIndex].edge.id).toBe('Delta/2A');
  });

  it('cycles matchings from the keyboard', () => {
    const onMatchingCycle = vi.fn();
    const { container } = render(
      <TileView
        family="spectre"
        tileType="Psi"
        selectedEdges={SUBSET}
        onMatchingCycle={onMatchingCycle}
      />,
    );
    fireEvent.keyDown(container.querySelector('svg') as Element, { key: 'ArrowRight' });
    fireEvent.keyDown(container.querySelector('svg') as Element, { key: 'ArrowLeft' });
    expect(onMatchingCycle.mock.calls.map((c) => c[0])).toEqual([1, -1]);
  });

  it('marks tiles with an odd connection count', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Delta" selectedEdges={new Set([1])} markOdd />,
    );
    expect(connectionCount('spectre', 'Delta', new Set([1])) % 2).toBe(1);
    expect(container.querySelector('.tile-shape.is-odd')).not.toBeNull();
  });

  it('keeps decorative chords out of the hit-testing path', () => {
    // Chords are drawn dot-to-dot, i.e. exactly where a chord-draw gesture has
    // to press. Without pointer-events:none they swallow the pointerdown and
    // the drag never starts (found while wiring the explorer's overlay tool).
    const { container } = render(
      <TileView
        family="spectre"
        tileType="Delta"
        selectedEdges={SUBSET}
        matchingIndex={0}
        overlays={[[1, 2]]}
        interaction="chord-draw"
      />,
    );
    const decorative = [
      ...container.querySelectorAll('.matching-chords line, .overlays .overlay-chord'),
    ];
    expect(decorative.length).toBeGreaterThan(0);
    for (const node of decorative) {
      expect(node.getAttribute('pointer-events')).toBe('none');
    }
    // The seam hit areas remain the only pointer targets.
    expect(
      container.querySelector('.meta-edge .edge-hit')?.getAttribute('pointer-events'),
    ).toBe('stroke');
  });
});

describe('TilingView', () => {
  it('emits one <defs> path per leaf type and one <use> per instance', () => {
    const { container } = render(
      <TilingView family="spectre" level={2} idPrefix="t" ariaLabel="patch" />,
    );
    expect(container.querySelectorAll('use.tile-instance')).toHaveLength(71);
    const defs = container.querySelectorAll('defs > path');
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.length).toBeLessThan(12);
    for (const use of container.querySelectorAll('use.tile-instance')) {
      const href = use.getAttribute('href') as string;
      expect(container.querySelector(`defs > path[id="${href.slice(1)}"]`)).not.toBeNull();
    }
    expect(container.querySelector('svg')?.getAttribute('data-tile-count')).toBe('71');
  });

  it('adds a dot group per type and reuses it per instance', () => {
    const { container } = render(
      <TilingView family="spectre" level={1} idPrefix="d" showDots selectedEdges={SUBSET} />,
    );
    expect(container.querySelectorAll('defs > g[id^="d-dots-"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.tiling-dots use').length).toBeGreaterThan(0);
  });

  it('skips dots past the budget instead of emitting thousands of circles', () => {
    const { container } = render(
      <TilingView
        family="spectre"
        level={3}
        idPrefix="b"
        showDots
        selectedEdges={SUBSET}
        dotBudget={10}
      />,
    );
    expect(container.querySelector('.tiling-dots')).toBeNull();
  });

  it('accepts overlay children inside the camera group', () => {
    const { container } = render(
      <TilingView family="spectre" level={1} idPrefix="c">
        <CircuitLayer
          circuits={[{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], closed: true }]}
          tails={[{ points: [{ x: 0, y: 0 }, { x: 0, y: 2 }], closed: false }]}
          tailEndMarkers
        />
      </TilingView>,
    );
    expect(container.querySelectorAll('.circuit-layer .circuit-path')).toHaveLength(2);
    expect(container.querySelector('.circuit-path.is-circuit')?.getAttribute('d')).toMatch(/Z$/);
    expect(container.querySelectorAll('.tail-end')).toHaveLength(2);
  });
});

describe('controls', () => {
  it('MatchingSlider shows the option position and hides for point-less tiles', () => {
    const { container } = render(
      <MatchingSlider
        family="spectre"
        tileType="Psi"
        selectedEdges={SUBSET}
        value={0}
        onChange={() => undefined}
      />,
    );
    expect(container.querySelector('input[type="range"]')).not.toBeNull();
    expect(container.querySelector('.matching-badge')?.textContent).toMatch(/^1\//);

    const { container: empty } = render(
      <MatchingSlider
        family="spectre"
        tileType="Delta"
        selectedEdges={new Set([4])}
        value={0}
        onChange={() => undefined}
      />,
    );
    expect(empty.querySelector('.matching-slider')).toBeNull();
  });

  it('MatchingSlider raises the new full index when the range moves', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MatchingSlider
        family="spectre"
        tileType="Psi"
        selectedEdges={SUBSET}
        value={0}
        onChange={onChange}
      />,
    );
    fireEvent.change(container.querySelector('input[type="range"]') as Element, {
      target: { value: '2' },
    });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('EdgeClassLegend chips reflect and toggle the selection', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <EdgeClassLegend family="spectre" selected={SUBSET} onToggle={onToggle} />,
    );
    const chips = container.querySelectorAll('.edge-chip');
    expect(chips.length).toBeGreaterThan(0);
    const on = [...chips].filter((c) => c.getAttribute('aria-pressed') === 'true');
    expect(on.map((c) => c.getAttribute('data-major')).sort()).toEqual(['2', '5', '7', '8']);
    fireEvent.click(container.querySelector('[data-major="1"]') as Element);
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});
