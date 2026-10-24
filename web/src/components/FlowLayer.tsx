/**
 * `FlowLayer` — the Explorer's circuits with their labels' directions (see
 * core/flowOverlay.ts). Each run of strands from a source to a sink (or round
 * a closed flow loop) gets its own colour and arrows; source chords and seams
 * are green, sink ones red, undirected chords grey and dashed.
 */

import { useMemo } from 'react';
import { orientCurve, type FlowOverlay, type Pt, type StrandCurve } from '../core';

export interface FlowLayerProps {
  readonly overlay: FlowOverlay;
  /** World units. */
  readonly strokeWidth?: number;
  /** Arrowheads on through strands; off for big patches. */
  readonly arrows?: boolean;
  /** Bend each strand, leaving every edge square to it. */
  readonly curved?: boolean;
}

const RUN_COLOURS = ['#4f8ff7', '#f0883e', '#c86bd8', '#d4a72c', '#2fb5c9', '#8b8ff0', '#e07fb0', '#9bbf3a'];
const SOURCE = '#2ea043';
const SINK = '#e5534b';

/** Arrowhead at the strand's midpoint (on the curve, when there is one), pointing a → b. */
function arrow(a: Pt, b: Pt, size: number, c?: StrandCurve): string {
  const m = c ? curveMid(a, b, c) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const tip = { x: m.x + ux * size, y: m.y + uy * size };
  const l = { x: m.x - ux * size - uy * size * 0.8, y: m.y - uy * size + ux * size * 0.8 };
  const r = { x: m.x - ux * size + uy * size * 0.8, y: m.y - uy * size - ux * size * 0.8 };
  return `M${tip.x},${tip.y}L${l.x},${l.y}L${r.x},${r.y}Z`;
}

/** The cubic's point at t = ½ (the same whichever way round its handles are). */
function curveMid(a: Pt, b: Pt, c: StrandCurve): Pt {
  return { x: (a.x + 3 * c.c1.x + 3 * c.c2.x + b.x) / 8, y: (a.y + 3 * c.c1.y + 3 * c.c2.y + b.y) / 8 };
}

export function FlowLayer(props: FlowLayerProps): JSX.Element {
  const { overlay, strokeWidth = 0.12, arrows = true, curved = false } = props;
  // One path per colour keeps the DOM small at level 4.
  const byColour = useMemo(() => {
    const groups = new Map<string, { d: string[]; heads: string[]; dashed: boolean }>();
    const push = (colour: string, dashed: boolean, a: Pt, b: Pt, ctrl: StrandCurve, head: boolean) => {
      const key = `${colour}|${dashed}`;
      const g = groups.get(key) ?? { d: [], heads: [], dashed };
      if (curved) {
        const [h1, h2] = orientCurve(ctrl, a);
        g.d.push(`M${a.x},${a.y}C${h1.x},${h1.y} ${h2.x},${h2.y} ${b.x},${b.y}`);
      } else g.d.push(`M${a.x},${a.y}L${b.x},${b.y}`);
      if (head) g.heads.push(arrow(a, b, strokeWidth * 2.2, curved ? ctrl : undefined));
      groups.set(key, g);
    };
    overlay.chords.forEach((c, i) => {
      if (c.kind === 'through') push(RUN_COLOURS[overlay.runOf[i] % RUN_COLOURS.length], false, c.a, c.b, c.ctrl, arrows);
      else if (c.kind === 'source') push(SOURCE, false, c.a, c.b, c.ctrl, false);
      else if (c.kind === 'sink') push(SINK, false, c.a, c.b, c.ctrl, false);
      else push('currentColor', true, c.a, c.b, c.ctrl, false);
    });
    return [...groups.entries()].map(([key, g]) => ({ colour: key.split('|')[0], ...g }));
  }, [overlay, strokeWidth, arrows, curved]);
  const r = strokeWidth * 1.6;
  // Chord sources and sinks sit on their strand's midpoint (on the curve when curved);
  // the rest of the list are seams where two ends clash.
  const onChord = (i: number): Pt => {
    const c = overlay.chords[i];
    return curved ? curveMid(c.a, c.b, c.ctrl) : { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 };
  };
  const sourceDots = [...overlay.sourceChords.map(onChord), ...overlay.sources.slice(overlay.sourceChords.length)];
  const sinkDots = [...overlay.sinkChords.map(onChord), ...overlay.sinks.slice(overlay.sinkChords.length)];
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
      {sourceDots.map((p, i) => (
        <circle key={`s${i}`} className="flow-source" cx={p.x} cy={p.y} r={r} fill={SOURCE} stroke="white" strokeWidth={strokeWidth * 0.35} />
      ))}
      {sinkDots.map((p, i) => (
        <circle key={`k${i}`} className="flow-sink" cx={p.x} cy={p.y} r={r} fill={SINK} stroke="white" strokeWidth={strokeWidth * 0.35} />
      ))}
    </g>
  );
}

export default FlowLayer;
