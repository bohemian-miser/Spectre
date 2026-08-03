// @vitest-environment jsdom
/**
 * The SVG export must be openable outside the app: namespaced, pixel-sized and
 * carrying a viewBox even though the live renderer has none (its framing lives
 * in a camera transform).
 */
import { describe, expect, it } from 'vitest';
import { sceneFilename, serializeSceneSvg } from '../exportScene';

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tiling-view');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', 'matrix(2,0,0,2,10,10)');
  svg.appendChild(g);
  document.body.appendChild(svg);
  return svg;
}

describe('serializeSceneSvg', () => {
  it('produces a standalone document at the requested pixel size', () => {
    const text = serializeSceneSvg(makeSvg(), { width: 640, height: 480 });
    expect(text.startsWith('<?xml')).toBe(true);
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(text).toContain('width="640"');
    expect(text).toContain('height="480"');
    expect(text).toContain('viewBox="0 0 640 480"');
    // The live scene content rides along.
    expect(text).toContain('matrix(2,0,0,2,10,10)');
  });

  it('keeps an existing viewBox and can add a background and title', () => {
    const svg = makeSvg();
    svg.setAttribute('viewBox', '-1 -2 3 4');
    const text = serializeSceneSvg(svg, {
      width: 100,
      height: 100,
      background: '#123456',
      title: 'Spectre',
    });
    expect(text).toContain('viewBox="-1 -2 3 4"');
    expect(text).toContain('#123456');
    expect(text).toContain('<title>Spectre</title>');
  });

  it('does not mutate the live node', () => {
    const svg = makeSvg();
    serializeSceneSvg(svg, { width: 10, height: 10, background: 'red' });
    expect(svg.getAttribute('width')).toBeNull();
    expect(svg.querySelector('rect')).toBeNull();
  });
});

describe('sceneFilename', () => {
  it('names files after the scene', () => {
    expect(sceneFilename('spectre', 'Delta', 3, [2, 5, 7, 8])).toBe('spectre-Delta-lv3-2578');
    expect(sceneFilename('hex', 'Gamma', 0, [])).toBe('hex-Gamma-lv0-none');
  });
});
