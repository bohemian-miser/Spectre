// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TileEditor } from '../TileEditor';
import { connectionPoints, leafPts, matchingAt, type Pt } from '../../core';

// jsdom has no SVG geometry: make screen coordinates the tile's own.
beforeAll(() => {
  class FakePoint {
    constructor(public x = 0, public y = 0) {}
    matrixTransform(): FakePoint {
      return this;
    }
  }
  (globalThis as unknown as { DOMPoint: unknown }).DOMPoint = FakePoint;
  (SVGElement.prototype as unknown as { getScreenCTM: () => unknown }).getScreenCTM = () => ({ inverse: () => ({}) });
  // jsdom has no PointerEvent either; a MouseEvent carries the coordinates.
  if (!('PointerEvent' in window)) {
    class FakePointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = FakePointerEvent;
  }
});
afterEach(cleanup);

const at = (p: Pt) => ({ clientX: p.x, clientY: p.y, pointerId: 1 });

function setup(selected: number[], index = 0) {
  const props = {
    family: 'hex' as const,
    type: 'Pi' as const,
    selected: new Set(selected),
    index,
    onSetIndex: vi.fn(),
    onToggleClass: vi.fn(),
    onStepTile: vi.fn(),
    onClose: vi.fn(),
  };
  render(<TileEditor {...props} />);
  const stage = document.querySelector('svg.tile-editor-stage') as SVGSVGElement;
  return { props, stage };
}

describe('TileEditor', () => {
  it('drags a line from one point to another and keeps what else of the pairing fits', () => {
    // Pi's edges are 1, 5, 5, 1, 8, 2: with {1, 5} it has four points, paired (0 1)(2 3) at first.
    const { props, stage } = setup([1, 5]);
    const pts = connectionPoints('hex', 'Pi', new Set([1, 5])).map((c) => c.pt);
    expect(pts).toHaveLength(4);
    fireEvent.pointerDown(stage, at(pts[0]));
    fireEvent.pointerMove(stage, at(pts[3]));
    fireEvent.pointerUp(stage, at(pts[3]));
    expect(props.onSetIndex).toHaveBeenCalledTimes(1);
    const m = matchingAt(4, props.onSetIndex.mock.calls[0][0])!;
    expect(m.some(([a, b]) => (a === 0 && b === 3) || (a === 3 && b === 0))).toBe(true);
    expect(m.some(([a, b]) => (a === 1 && b === 2) || (a === 2 && b === 1))).toBe(true);
  });

  it('tapping an edge away from its points turns that class on or off', () => {
    const { props, stage } = setup([1, 5]);
    // Pi's edge 4 is class 8; tap a quarter of the way along it.
    const outline = leafPts('hex', 'Pi');
    const a = outline[4];
    const b = outline[5];
    fireEvent.pointerDown(stage, at({ x: a.x + (b.x - a.x) * 0.25, y: a.y + (b.y - a.y) * 0.25 }));
    expect(props.onToggleClass).toHaveBeenCalledWith(8);
  });

  it('steps pairings and tiles, and closes', () => {
    const { props } = setup([1, 5]);
    expect(screen.getByTestId('tile-editor-position').textContent).toBe('1/3');
    fireEvent.click(screen.getByLabelText('Next pairing'));
    expect(props.onSetIndex).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByLabelText('Next tile'));
    expect(props.onStepTile).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('says so when a tile has an odd number of points', () => {
    // Pi has one class-8 edge.
    setup([8]);
    expect(screen.getByTestId('tile-editor-hint').textContent).toContain('odd number of points');
  });

  it('arrow keys: left and right change the tile, up and down step the pairings', () => {
    const { props } = setup([1, 5]);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(props.onStepTile).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(props.onStepTile).toHaveBeenLastCalledWith(-1);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(props.onSetIndex).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // From the first of three pairings, down wraps to the last.
    expect(props.onSetIndex).toHaveBeenLastCalledWith(2);
  });
});
