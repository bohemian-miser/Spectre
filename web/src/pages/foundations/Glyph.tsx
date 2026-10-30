/** A circuit drawn (`drawings.ts`) as a closed outline fitted to a square; a blank square while it is being drawn. */
import type { Drawing } from './drawings';

export function Glyph(props: { drawing: Drawing | undefined; size: number }): JSX.Element {
  const d = props.drawing;
  if (!d) return <div className="fd-glyph fd-glyph-wait" style={{ width: props.size, height: props.size }} />;
  const xy = d.xy;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < xy.length; i += 2) {
    x0 = Math.min(x0, xy[i]);
    x1 = Math.max(x1, xy[i]);
    y0 = Math.min(y0, xy[i + 1]);
    y1 = Math.max(y1, xy[i + 1]);
  }
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  const pad = 0.06 * s;
  const pts: string[] = [];
  for (let i = 0; i < xy.length; i += 2) pts.push(`${(xy[i] - x0 + (s - (x1 - x0)) / 2 + pad).toFixed(3)},${(y1 - xy[i + 1] + (s - (y1 - y0)) / 2 + pad).toFixed(3)}`);
  return (
    <svg className="fd-glyph" viewBox={`0 0 ${s + 2 * pad} ${s + 2 * pad}`} width={props.size} height={props.size} aria-hidden="true">
      <polygon points={pts.join(' ')} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
