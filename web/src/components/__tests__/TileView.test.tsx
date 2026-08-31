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
import { seamPolyline, tileParts } from '../../lib/tilingModel';
import { MatchingSlider } from '../controls/MatchingSlider';
import { EdgeClassLegend } from '../controls/EdgeClassLegend';

afterEach(cleanup);

const SUBSET = new Set([2, 5, 7, 8]);

type P = { x: number; y: number };

/** Vertices of an `M x y L x y …` path. */
function pathPoints(d: string): P[] {
  return [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

function polyLength(pts: readonly P[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return total;
}

/** The true (untrimmed) vertex chain of a tile's i-th seam. */
function seamChain(type: TileTypeId, index: number): readonly P[] {
  const pts = tileParts('spectre', type)[0].pts;
  return seamPolyline(pts, metaEdges('spectre', type)[index]);
}

function seamEndpoints(type: TileTypeId): P[][] {
  return metaEdges('spectre', type).map((_, i) => {
    const chain = seamChain(type, i);
    return [chain[0], chain[chain.length - 1]];
  });
}

/** Smallest gap between any two seams' endpoints. */
function closestPair(ends: readonly (readonly P[])[]): number {
  let best = Infinity;
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      for (const a of ends[i]) {
        for (const b of ends[j]) best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
      }
    }
  }
  return best;
}

/** The point halfway along a chain by arc length — a label's anchor. */
function chainMidpoint(chain: readonly P[]): P {
  let remaining = polyLength(chain) / 2;
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1];
    const b = chain[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg >= remaining && seg > 0) {
      const t = remaining / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= seg;
  }
  return chain[chain.length - 1];
}

function pointInPolygon(pt: P, poly: readonly P[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

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
      // A watermark: under the seams and the chord it belongs to.
      'tile-names',
      'meta-edges',
      'matching-chords',
      'overlays',
      'major-numbers',
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

  it('hangTails pairs what it can and dangles the leftover crossing', () => {
    // Theta owns three class-2 seams: one happy pair, one tail.
    const { container } = render(
      <TileView family="spectre" tileType="Theta" selectedEdges={new Set([2])} hangTails />,
    );
    expect(container.querySelectorAll('circle.edge-dot')).toHaveLength(3);
    expect(container.querySelectorAll('.matching-chords line')).toHaveLength(1);
    const tails = container.querySelectorAll('.matching-chords .chord-tail');
    expect(tails).toHaveLength(1);
    expect(tails[0].querySelector('path.is-tail')).not.toBeNull();
    expect(tails[0].querySelector('circle.tail-end')).not.toBeNull();
  });

  it('hangTails cannot invent a partner: Delta under {1} is one bare tail', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Delta" selectedEdges={new Set([1])} hangTails />,
    );
    expect(container.querySelectorAll('.matching-chords line')).toHaveLength(0);
    expect(container.querySelectorAll('.chord-tail')).toHaveLength(1);
  });

  it('draws no tail without hangTails, and none on tiles that pair up', () => {
    const { container: odd } = render(
      <TileView family="spectre" tileType="Theta" selectedEdges={new Set([2])} />,
    );
    expect(odd.querySelectorAll('.matching-chords line, .chord-tail')).toHaveLength(0);

    const { container: even } = render(
      <TileView family="spectre" tileType="Psi" selectedEdges={SUBSET} hangTails />,
    );
    expect(even.querySelectorAll('.chord-tail')).toHaveLength(0);
    expect(even.querySelectorAll('.matching-chords line').length).toBeGreaterThan(0);
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

  it('names the tile and numbers its major classes when asked', () => {
    const { container } = render(
      <TileView
        family="spectre"
        tileType="Delta"
        selectedEdges={new Set([2, 5, 7, 8])}
        showTileName
        showMajorNumbers
      />,
    );
    expect(container.querySelector('[data-tile-name="Delta"]')).not.toBeNull();

    const nums = [...container.querySelectorAll<SVGTextElement>('[data-major-number]')];
    // One per SEAM — a three-edge seam wears a single number at its middle,
    // not the same digit three times.
    expect(nums).toHaveLength(metaEdges('spectre', 'Delta').length);
    // Majors only: no minor suffix survives, so every label is a bare digit.
    expect(nums.every((t) => /^\d+$/.test(t.textContent ?? ''))).toBe(true);

    // In the rule vs out of it, and the out ones are much fainter.
    const on = nums.filter((t) => t.getAttribute('data-major-on') === '1');
    const off = nums.filter((t) => t.getAttribute('data-major-on') === '0');
    expect(on.length).toBeGreaterThan(0);
    expect(off.length).toBeGreaterThan(0);
    expect(on.every((t) => new Set(['2', '5', '7', '8']).has(t.textContent ?? ''))).toBe(true);
    expect(off.every((t) => !new Set(['2', '5', '7', '8']).has(t.textContent ?? ''))).toBe(true);
    const alpha = (t: Element): number => Number(t.getAttribute('fill-opacity'));
    expect(alpha(on[0])).toBeGreaterThan(alpha(off[0]) * 2);
  });

  it('trims each drawn seam so neighbours read as two, not one long stroke', () => {
    const { container } = render(<TileView family="spectre" tileType="Delta" />);
    const drawn = [...container.querySelectorAll<SVGPathElement>('.meta-edge .edge-visual')].map(
      (path) => pathPoints(path.getAttribute('d') ?? ''),
    );
    expect(drawn.length).toBe(metaEdges('spectre', 'Delta').length);

    // The true seams run vertex-to-vertex and so share endpoints; the drawn
    // ones must not, or two adjacent seams look like a single stroke.
    const trueEnds = seamEndpoints('Delta');
    expect(closestPair(trueEnds)).toBeLessThan(1e-9);
    expect(closestPair(drawn.map((pts) => [pts[0], pts[pts.length - 1]]))).toBeGreaterThan(0.05);

    // Trimmed, not truncated: every seam keeps most of its length.
    drawn.forEach((pts, i) => {
      const kept = polyLength(pts);
      const full = polyLength(seamChain('Delta', i));
      expect(kept).toBeLessThan(full);
      expect(kept).toBeGreaterThan(full * 0.5);
    });
  });

  it('floats each major number outside the tile, clear of the fill', () => {
    const { container } = render(
      <TileView family="spectre" tileType="Delta" showMajorNumbers />,
    );
    const outline = tileParts('spectre', 'Delta')[0].pts;
    const nums = [...container.querySelectorAll<SVGTextElement>('[data-major-number]')];
    expect(nums).toHaveLength(metaEdges('spectre', 'Delta').length);

    for (const text of nums) {
      const at = {
        x: Number(text.getAttribute('x')),
        y: Number(text.getAttribute('y')),
      };
      expect(pointInPolygon(at, outline), text.textContent ?? '').toBe(false);
      // Just outside, not adrift: a fixed clearance from its seam's middle.
      const mid = chainMidpoint(seamChain('Delta', nums.indexOf(text)));
      expect(Math.hypot(at.x - mid.x, at.y - mid.y)).toBeCloseTo(0.34, 6);
    }
  });

  it('draws neither label layer unless asked', () => {
    const { container } = render(<TileView family="spectre" tileType="Delta" />);
    expect(container.querySelector('[data-tile-name]')).toBeNull();
    expect(container.querySelector('[data-major-number]')).toBeNull();
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
