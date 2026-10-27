// @vitest-environment jsdom
/**
 * The board's camera under touch: one finger pans, two fingers pinch-zoom
 * about their midpoint, a tap reaches the tile. The board is laid out at
 * 900 x 900 px; one Delta at the origin fits as the 9 x 9 viewBox at
 * (-4, -4), so one world unit is 100 px and every expected viewBox below
 * follows from that by hand.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HexBoard } from '../HexBoard';

afterEach(cleanup);

// jsdom has no PointerEvent; a MouseEvent carrying the pointer fields is enough for React's handlers
if (!('PointerEvent' in window)) {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.assign(window, { PointerEvent: PointerEventShim });
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, x: 0, y: 0, width: 900, height: 900, right: 900, bottom: 900, toJSON: () => ({}) } as DOMRect);
});

const board = (onTileClick?: (id: string) => void) => {
  const r = render(<HexBoard tiles={[{ id: '', type: 'Delta', xform: [1, 0, 0, 0, 1, 0], tone: 'solid' }]} onTileClick={onTileClick} testId="b" />);
  return r.getByTestId('b') as unknown as SVGSVGElement;
};
const viewBox = (svg: SVGSVGElement) => svg.getAttribute('viewBox')!.split(' ').map(Number);
const touch = (pointerId: number, clientX: number, clientY: number) => ({ pointerId, pointerType: 'touch', isPrimary: pointerId === 1, button: 0, clientX, clientY });

describe('HexBoard touch camera', () => {
  it('fits one tile as a 9 x 9 view', () => {
    expect(viewBox(board())).toEqual([-4, -4, 9, 9]);
  });

  it('pans with one finger: the world point under it follows it', () => {
    const svg = board();
    fireEvent.pointerDown(svg, touch(1, 450, 450));
    for (let i = 1; i <= 4; i++) fireEvent.pointerMove(svg, touch(1, 450 + 50 * i, 450 + 25 * i));
    fireEvent.pointerUp(svg, touch(1, 650, 550));
    const [x, y, w, h] = viewBox(svg);
    expect([x, y, w, h].map((n) => +n.toFixed(9))).toEqual([-6, -5, 9, 9]);
  });

  it('pinch-zooms with two fingers about their midpoint, which it then follows', () => {
    const svg = board();
    // fingers 100 px apart about the centre (world 0.5, 0.5), moved to 300 px apart about a midpoint 100 px right
    fireEvent.pointerDown(svg, touch(1, 400, 450));
    fireEvent.pointerDown(svg, touch(2, 500, 450));
    fireEvent.pointerMove(svg, touch(1, 400, 450));
    fireEvent.pointerMove(svg, touch(2, 700, 450));
    fireEvent.pointerUp(svg, touch(2, 700, 450));
    fireEvent.pointerUp(svg, touch(1, 400, 450));
    // 3x zoom: a 3 x 3 view, 300 px a unit, with world (0.5, 0.5) under client (550, 450)
    const [x, y, w, h] = viewBox(svg);
    expect([x, y, w, h].map((n) => +n.toFixed(9))).toEqual([+(0.5 - 550 / 300).toFixed(9), -1, 3, 3]);
  });

  it('passes a tap without movement through to the tile', () => {
    const clicked: string[] = [];
    const svg = board((id) => clicked.push(id));
    const tile = svg.querySelector('polygon.hb__tile')!;
    fireEvent.pointerDown(tile, touch(1, 450, 450));
    fireEvent.pointerMove(tile, touch(1, 452, 451));
    fireEvent.pointerUp(tile, touch(1, 452, 451));
    fireEvent.click(tile);
    expect(clicked).toEqual(['']);
    expect(viewBox(svg)).toEqual([-4, -4, 9, 9]);
  });
});
