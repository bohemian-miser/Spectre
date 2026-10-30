/**
 * A chain as one row: its foundational circuit's card, then its harmonics by
 * level, a column per level as on the Harmonics page's table. Each harmonic
 * built is drawn at the place the data names, once the row scrolls into
 * view; each one predicted above the build is a blank square with its
 * predicted tiles.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { harmonicsHref, nf, subsetOf } from './data';
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

export function ChainRow(props: { data: PageCombo; chain: readonly ChainStep[]; columns: readonly number[]; client: DrawClient; card: ReactNode }): JSX.Element {
  const { data, chain } = props;
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
  return (
    <div className="fd-chain-row" ref={ref} data-testid="fd-chain">
      {props.card}
      {props.columns.map((level) => {
        const st = chain.find((s) => s.level === level);
        return (
          <div key={level} className="fd-harm-col">
            {st?.members.map((m, i) =>
              m.id === null ? <Predicted key={i} m={m} level={level} /> : <Built key={i} data={data} h={harm.get(m.id)!} mark={m.mark} drawing={drawings.get(m.id)} />,
            )}
          </div>
        );
      })}
      {error ? <p className="fd-muted fd-chain-error">Could not draw: {error}</p> : null}
    </div>
  );
}
