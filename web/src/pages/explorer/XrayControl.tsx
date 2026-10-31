/** The X-ray switch and its level slider, one item of the viewport's tool row. */

/** Highest supertile level the X-ray shows on the infinite plane (its outline is worked out whole, once). */
export const XRAY_INFINITE_MAX = 6;

export function XrayControl(props: {
  on: boolean;
  level: number;
  lowest: number;
  highest: number;
  busy: boolean;
  note: string | null;
  onToggle(on: boolean): void;
  onLevel(level: number): void;
}): JSX.Element {
  const { on, level, lowest, highest, busy, note, onToggle, onLevel } = props;
  return (
    <div className="xray-control" data-testid="xray-control" data-panzoom-ignore="">
      <label title="Outline the supertiles of one level over the tiles; hover one for its type and slot path">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} data-testid="xray-toggle" />
        X-ray
      </label>
      {on ? (
        <>
          <input
            type="range"
            min={lowest}
            max={highest}
            step={1}
            value={level}
            disabled={lowest >= highest}
            onChange={(e) => onLevel(Number(e.target.value))}
            aria-label="Supertile level"
            data-testid="xray-level"
          />
          <span className="xray-level" data-testid="xray-level-label">
            level {level}
            {busy ? '…' : ''}
            {note ? ` · ${note}` : ''}
          </span>
        </>
      ) : null}
    </div>
  );
}
