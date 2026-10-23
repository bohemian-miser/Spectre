/**
 * `FlowLayer` — the Explorer's circuits with their labels' directions (see
 * core/flowOverlay.ts). Each run of strands from a source to a sink (or round
 * a closed flow loop) gets its own colour and arrows; source chords and seams
 * are green, sink ones red, undirected chords grey and dashed.
 */

import { useMemo } from 'react';
import type { FlowOverlay, Pt } from '../core';

export interface FlowLayerProps {
  readonly overlay: FlowOverlay;
  /** World units. */
  readonly strokeWidth?: number;
  /** Arrowheads on through strands; off for big patches. */
  readonly arrows?: boolean;
}

const RUN_COLOURS = ['#4f8ff7', '#f0883e', '#c86bd8', '#d4a72c', '#2fb5c9', '#8b8ff0', '#e07fb0', '#9bbf3a'];
const SOURCE = '#2ea043';
const SINK = '#e5534b';

function arrow(a: Pt, b: Pt, size: number): string {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const tip = { x: m.x + ux * size, y: m.y + uy * size };
  const l = { x: m.x - ux * size - uy * size * 0.8, y: m.y - uy * size + ux * size * 0.8 };
  const r = { x: m.x - ux * size + uy * size * 0.8, y: m.y - uy * size - ux * size * 0.8 };
  return `M${tip.x},${tip.y}L${l.x},${l.y}L${r.x},${r.y}Z`;
}

export function FlowLayer(props: FlowLayerProps): JSX.Element {
  const { overlay, strokeWidth = 0.12, arrows = true } = props;
  // One path per colour keeps the DOM small at level 4.
  const byColour = useMemo(() => {
    const groups = new Map<string, { d: string[]; heads: string[]; dashed: boolean }>();
    const push = (colour: string, dashed: boolean, a: Pt, b: Pt, head: boolean) => {
      const key = `${colour}|${dashed}`;
      const g = groups.get(key) ?? { d: [], heads: [], dashed };
      g.d.push(`M${a.x},${a.y}L${b.x},${b.y}`);
      if (head) g.heads.push(arrow(a, b, strokeWidth * 2.2));
      groups.set(key, g);
    };
    overlay.chords.forEach((c, i) => {
      if (c.kind === 'through') push(RUN_COLOURS[overlay.runOf[i] % RUN_COLOURS.length], false, c.a, c.b, arrows);
      else if (c.kind === 'source') push(SOURCE, false, c.a, c.b, false);
      else if (c.kind === 'sink') push(SINK, false, c.a, c.b, false);
      else push('currentColor', true, c.a, c.b, false);
    });
    return [...groups.entries()].map(([key, g]) => ({ colour: key.split('|')[0], ...g }));
  }, [overlay, strokeWidth, arrows]);
  const r = strokeWidth * 1.6;
  return (
    <g className="flow-layer" data-sources={overlay.sources.length} data-sinks={overlay.sinks.length} data-runs={overlay.runs.length}>
      {byColour.map((g) => (
        <g key={`${g.colour}${g.dashed}`}>
          <path
            d={g.d.join('')}
            fill="none"
            stroke={g.colour}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={g.dashed ? `${strokeWidth * 1.5} ${strokeWidth * 1.5}` : undefined}
            opacity={g.dashed ? 0.45 : 1}
          />
          {g.heads.length ? <path d={g.heads.join('')} fill={g.colour} /> : null}
        </g>
      ))}
      {overlay.sources.map((p, i) => (
        <circle key={`s${i}`} className="flow-source" cx={p.x} cy={p.y} r={r} fill={SOURCE} stroke="white" strokeWidth={strokeWidth * 0.35} />
      ))}
      {overlay.sinks.map((p, i) => (
        <circle key={`k${i}`} className="flow-sink" cx={p.x} cy={p.y} r={r} fill={SINK} stroke="white" strokeWidth={strokeWidth * 0.35} />
      ))}
    </g>
  );
}

export default FlowLayer;
