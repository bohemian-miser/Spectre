/**
 * A chain as one row: its foundational circuit's card, then its harmonics by
 * level, a column per level as on the Harmonics page's table. Each harmonic
 * built is drawn at the place the data names, once the row scrolls into
 * view; each one predicted above the build is a dashed square with its
 * predicted tiles and a button that brute-forces it as the Harmonics page
 * does (`bruteChains.ts`). A member found is drawn with its tiles against
 * the forecast, and opens a square two levels further.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { describeResult } from '../harmonics/bruteJob';
import type { BruteAt, BruteCell, ChainBrute } from './bruteChains';
import { compact, harmonicsHref, nf, subsetOf } from './data';
import type { DrawClient, Drawing } from './drawings';
import { Glyph } from './Glyph';
import type { ChainMember, ChainStep, HarmRow, PageCombo } from './pageData';

export const MARK: Record<ChainMember['mark'], { sign: string; title: string }> = {
  confirmed: { sign: '✓', title: 'predicted from two levels down, then built' },
  built: { sign: '', title: 'built (below the levels predictions start at)' },
  missed: { sign: '!', title: 'built, but not predicted' },
  predicted: { sign: '?', title: 'predicted, above the build' },
  other: { sign: '≠', title: "the walk predicted is another circuit's harmonic" },
};

/** Whether an element has come within a screen's height of the view; true at once where there is no IntersectionObserver. */
function useSeen(ref: RefObject<Element>): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '100% 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, ref]);
  return seen;
}

const THUMB = 64;

function Built(props: { data: PageCombo; h: HarmRow; mark: ChainMember['mark']; drawing: Drawing | undefined }): JSX.Element {
  const { data, h, mark } = props;
  const [, level, length, , , places] = h;
  const sign = MARK[mark].sign;
  return (
    <a
      className={`fd-harm fd-m-${mark}`}
      href={harmonicsHref(import.meta.env.BASE_URL, data.combo, level, data.rule, { level, length })}
      title={`${nf(length)} tiles, first closing at level ${level} in ${nf(places)} ${places === 1 ? 'place' : 'places'}: ${MARK[mark].title}. Opens its chain on the Harmonics page.`}
      data-testid="fd-harm"
      data-level={level}
      data-tiles={length}
      onClick={(e) => e.stopPropagation()}
    >
      <Glyph drawing={props.drawing} size={THUMB} />
      <span className="fd-harm-tiles">{nf(length)} tiles</span>
      <span className="fd-harm-meta">
        level {level} · {nf(places)} {places === 1 ? 'place' : 'places'}
        {sign ? <span className="fd-harm-sign"> {sign}</span> : null}
      </span>
    </a>
  );
}

function Predicted(props: { m: ChainMember; level: number }): JSX.Element {
  const { m } = props;
  return (
    <div className={`fd-harm fd-harm-pred fd-m-${m.mark}`} title={`${nf(m.length)} tiles at level ${props.level}: ${MARK[m.mark].title}`} data-testid="fd-harm-predicted" data-level={props.level} data-tiles={m.length}>
      <div className="fd-glyph fd-glyph-pred" style={{ width: THUMB, height: THUMB }}>
        {MARK[m.mark].sign}
      </div>
      <span className="fd-harm-tiles">{nf(m.length)} tiles</span>
      <span className="fd-harm-meta">
        level {props.level} · {m.mark === 'predicted' ? 'predicted' : "another's harmonic"}
      </span>
    </div>
  );
}

/**
 * A member above the build: predicted (with its tiles when the walk was
 * predicted from the tables) or the next after one found; brute-forced on
 * request, then drawn with its exact tiles against the forecast.
 */
function Brute(props: { at: BruteAt; cell: BruteCell | undefined; forecast: number | null; ready: boolean; brute: ChainBrute; onRun: () => void }): JSX.Element {
  const { at, cell, forecast } = props;
  const level = at.level;
  if (cell?.state === 'done' && cell.result.found) {
    const f = cell.result.found;
    const agrees = forecast === null ? null : forecast === f.length;
    return (
      <div className="fd-harm fd-harm-found" title={`${nf(f.length)} tiles, brute-forced. ${describeResult(cell.result)}`} data-testid="fd-harm-found" data-level={level} data-tiles={f.length}>
        {cell.undrawn ? (
          <div className="fd-glyph fd-glyph-pred" style={{ width: THUMB, height: THUMB }} title={`not drawn: ${cell.undrawn}`}>
            ✗
          </div>
        ) : (
          <Glyph drawing={cell.pts ? { xy: cell.pts } : undefined} size={THUMB} />
        )}
        <span className="fd-harm-tiles">{nf(f.length)} tiles</span>
        <span className="fd-harm-meta">level {level} · brute-forced</span>
        {forecast !== null ? (
          <span className={`fd-harm-meta${agrees ? '' : ' fd-warn'}`} data-testid="fd-harm-forecast" data-agrees={agrees ? 1 : 0}>
            forecast {compact(forecast)} {agrees ? '✓' : '≠'}
          </span>
        ) : null}
      </div>
    );
  }
  const head = forecast === null ? 'next harmonic' : `${nf(forecast)} tiles`;
  const meta = forecast === null ? `level ${level} · forecast` : `level ${level} · predicted`;
  let body: ReactNode;
  if (!cell)
    body = (
      <button type="button" className="fd-brute" disabled={props.brute.running || !props.ready} onClick={props.onRun} data-testid="fd-brute" title="Follow the strands two levels above the member before, as the Harmonics page's brute force does">
        Brute force
      </button>
    );
  else if (cell.state === 'running')
    body = (
      <>
        <span className="fd-harm-meta" data-testid="fd-brute-running">
          {cell.progress ? `L${cell.progress.level} · ${compact(cell.progress.calls)} routes` : 'starting'}
        </span>
        <button type="button" className="fd-brute" onClick={props.brute.stop}>
          Stop
        </button>
      </>
    );
  else
    body = (
      <span className="fd-harm-meta fd-warn" title={cell.state === 'failed' ? cell.error : describeResult(cell.result)} data-testid="fd-brute-none">
        ✗ {cell.state === 'failed' ? 'failed' : 'none found'}
      </span>
    );
  return (
    <div className="fd-harm fd-harm-pred fd-m-predicted" title={`${head} at level ${level}: ${MARK.predicted.title}`} data-testid="fd-harm-predicted" data-level={level} data-tiles={forecast ?? 0}>
      <div className="fd-glyph fd-glyph-pred" style={{ width: THUMB, height: THUMB }}>
        ?
      </div>
      <span className="fd-harm-tiles">{head}</span>
      <span className="fd-harm-meta">{meta}</span>
      {body}
    </div>
  );
}

/** Where a chain row's cells above the build sit: per member predicted (by the member it is predicted from), the levels found, and the next. */
export function bruteLevels(data: PageCombo, root: number, chain: readonly ChainStep[], brute: ChainBrute): { tip: number; levels: number[] }[] {
  const out: { tip: number; levels: number[] }[] = [];
  for (const st of chain)
    for (const m of st.members) {
      if (m.mark !== 'predicted' || m.from === undefined) continue;
      const levels = [st.level];
      for (;;) {
        const c = brute.cell({ rule: data.rule, combo: data.combo, root, tip: m.from, level: levels[levels.length - 1] });
        if (c?.state !== 'done' || !c.result.found) break;
        levels.push(levels[levels.length - 1] + 2);
      }
      out.push({ tip: m.from, levels });
    }
  return out;
}

export function ChainRow(props: {
  data: PageCombo;
  root: number;
  chain: readonly ChainStep[];
  columns: readonly number[];
  client: DrawClient;
  card: ReactNode;
  brute: ChainBrute;
  /** The foundational circuit's drawing, for a chain whose first harmonic is predicted above the build. */
  rootDrawing: Drawing | undefined;
}): JSX.Element {
  const { data, chain, root, brute } = props;
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref);
  const harm = useMemo(() => new Map(data.harm.map((h) => [h[0], h] as const)), [data]);
  const built = useMemo(() => chain.flatMap((st) => st.members.flatMap((m) => (m.id === null ? [] : [harm.get(m.id)!]))), [chain, harm]);
  const [drawings, setDrawings] = useState<Map<number, Drawing>>(new Map());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!seen || !built.length) return;
    let on = true;
    props.client
      .draw({ subset: subsetOf(data.rule), combo: data.combo, want: built.map(([id, level, length, , , , , , place]) => ({ id, place, level, length })) })
      .then((ds) => on && setDrawings(new Map(ds.map((d) => [d.id, d]))))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
  }, [seen, built, data, props.client]);
  const above = bruteLevels(data, root, chain, brute);
  /** The walk a member built is drawn as, to brute-force the member above it from. */
  const start = (tip: number) => {
    const d = tip === root ? props.rootDrawing : drawings.get(tip);
    const h = harm.get(tip);
    const f = data.found.find((x) => x[0] === tip);
    const level = h?.[1] ?? f?.[1];
    const length = h?.[2] ?? f?.[2];
    return d && level !== undefined && length !== undefined ? { level, type: d.type, length, steps: d.steps } : null;
  };
  return (
    <div className="fd-chain-row" ref={ref} data-testid="fd-chain">
      {props.card}
      {props.columns.map((level) => {
        const st = chain.find((s) => s.level === level);
        const cells = above.flatMap(({ tip, levels }) => {
          const i = levels.indexOf(level);
          if (i < 0) return [];
          const at = { rule: data.rule, combo: data.combo, root, tip, level };
          const forecast = i === 0 ? (st?.members.find((m) => m.from === tip)?.length ?? null) : null;
          return [
            <Brute key={`b${tip}`} at={at} cell={brute.cell(at)} forecast={forecast} ready={i > 0 || start(tip) !== null} brute={brute} onRun={() => brute.run(at, data.floor, i > 0 ? null : start(tip))} />,
          ];
        });
        return (
          <div key={level} className="fd-harm-col">
            {st?.members.map((m, i) =>
              m.id !== null ? (
                <Built key={i} data={data} h={harm.get(m.id)!} mark={m.mark} drawing={drawings.get(m.id)} />
              ) : m.mark === 'predicted' && m.from !== undefined ? null : (
                <Predicted key={i} m={m} level={level} />
              ),
            )}
            {cells}
          </div>
        );
      })}
      {error ? <p className="fd-muted fd-chain-error">Could not draw: {error}</p> : null}
    </div>
  );
}
