/**
 * `ComboBar` — the rule and combination, one line, the same on every page.
 *
 *  - The code (`2578-0100101100`): rule digits underlined in their class
 *    colours, one digit per tile type in that tile's colour. Tap the rule
 *    for the tail-free edge sets; tap a digit to step its tile.
 *  - Where the combination sits among the rule's (`58/64`), ‹ › to step the
 *    whole combination as an odometer (first tile fastest), and Random.
 *  - Copy, Paste (a box that reads a code or a link from any page through
 *    `lib/comboCode.ts` and shows what it read before it is used), Clear.
 *  - Below, every tile in its own colour with its pairing, its seams
 *    outlined in their class colours and its class numbers by its points,
 *    and a pairing slider. Tapping a tile opens `TileEditor`.
 *
 * Fully controlled: the page keeps the rule, the matching vector (full
 * enumeration indices, `leafOrder` order) and the contracts, and gets every
 * change through `onChange`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FAMILY_DISPLAY_NAMES,
  comboOptionCounts,
  comboToMatchingIndices,
  familyMajors,
  formatComboShareString,
  leafOrder,
  leafPts,
  matchingAt,
  matchingIndicesToCombo,
  metaEdges,
  comboDigitChar,
  orientCurve,
  strandCurve,
  validEdgeSubsets,
  type ColorSchemeId,
  type EdgeContracts,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { copyText } from '../../hooks/shareLink';
import { comboOdometer } from '../../lib/comboOdometer';
import { readCode } from '../../lib/comboCode';
import { cycleMatchingIndex, matchingOptions, tileMatchingInfo } from '../../lib/matchingModel';
import { edgeClassColor, tileColor } from '../../lib/palette';
import { seamPolyline } from '../../lib/tilingModel';
import { TileEditor } from '../TileEditor';
import '../../styles/combobar.css';

export interface ComboChange {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  /** Full matching index per leaf type, in `leafOrder(family)` order. */
  readonly matching: readonly number[];
}

export interface ComboBarProps {
  readonly family: TileFamilyId;
  /** Selected classes, sorted. */
  readonly subset: readonly number[];
  /** Full matching index per leaf type, in `leafOrder(family)` order. */
  readonly matching: readonly number[];
  readonly contracts?: EdgeContracts;
  /** Offer only pairings whose lines do not cross (the sliders and the tile view); on by default. */
  readonly nonCrossingOnly?: boolean;
  readonly curvedStrands?: boolean;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  /** Families a pasted code may be for; the page's own by default. */
  readonly families?: readonly TileFamilyId[];
  /** Show the row of tiles under the line; on by default. */
  readonly tiles?: boolean;
  /** Keep the tiles in one row that scrolls sideways, for a bar in a page's header. */
  readonly tilesInRow?: boolean;
  /** Spell every edge out (`2.0A`) in the tile view, instead of its bare class number. */
  readonly edgeLabels?: boolean;
  onChange(next: ComboChange): void;
  /** Set a class's strands per seam from the tile view; omit to hide its steppers. */
  onStrands?(major: number, count: number): void;
}

const ICON = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function ComboBar(props: ComboBarProps): JSX.Element {
  const { family, subset, matching, contracts, nonCrossingOnly = true, curvedStrands = false, colorScheme = 'bright', customColors } = props;
  const { families = [family], tiles = true, tilesInRow = false, edgeLabels = false, onChange, onStrands } = props;
  const order = leafOrder(family);
  const selected = useMemo(() => new Set(subset), [subset]);
  const infos = useMemo(() => order.map((t) => tileMatchingInfo(family, t, selected, contracts)), [order, family, selected, contracts]);
  const code = useMemo(() => {
    const combo = matchingIndicesToCombo(family, subset, matching, contracts);
    return combo === null ? null : formatComboShareString(subset, combo);
  }, [family, subset, matching, contracts]);
  // The whole-combination stepper goes through what the sliders offer: codes only, unless crossing pairings are on.
  const odometer = useMemo(() => comboOdometer(family, selected, matching, contracts, nonCrossingOnly), [family, selected, matching, contracts, nonCrossingOnly]);
  const valid = useMemo(() => validEdgeSubsets(family).map((v) => v.edges.join('')), [family]);
  const rule = subset.join('');

  /** Each tile's digit: its pairing's place among the non-crossing ones, or why it has none. */
  const digits = infos.map((info, i) => {
    if (info.odd) return { ch: '0', kind: 'odd' as const };
    if (info.nonCrossing.length <= 1) return { ch: '0', kind: 'fixed' as const };
    const at = info.nonCrossing.indexOf(matching[i] ?? 0);
    return at < 0 ? { ch: '?', kind: 'cross' as const } : { ch: comboDigitChar(at) ?? '?', kind: 'free' as const };
  });
  const odd = order.filter((_, i) => digits[i].kind === 'odd');
  const crossing = order.filter((_, i) => digits[i].kind === 'cross');

  const [hover, setHover] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [editing, setEditing] = useState<TileTypeId | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditing(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);
  useEffect(() => setEditing(null), [family]);

  const change = (next: Partial<ComboChange>) => {
    setNote(null);
    onChange({ family, subset, matching, ...next });
  };
  const withRule = (next: readonly number[]) =>
    change({ subset: next, matching: comboToMatchingIndices(family, next, '0'.repeat(order.length), contracts) });
  const setTile = (i: number, index: number) => change({ matching: order.map((_, j) => (j === i ? index : matching[j] ?? 0)) });
  const stepTile = (i: number, d: number) => setTile(i, cycleMatchingIndex(infos[i], matching[i] ?? 0, d, nonCrossingOnly));
  /** One class on or off, each tile keeping its pairing where it still exists (the page normalises the rest). */
  const toggleClass = (major: number) =>
    change({ subset: subset.includes(major) ? subset.filter((m) => m !== major) : [...subset, major].sort((a, b) => a - b), matching });

  const status = note
    ? note
    : crossing.length
      ? `${crossing.join(', ')}: the lines cross, so no code names this pairing.`
      : odd.length
        ? `Tails on ${odd.join(', ')}: an odd number of points, one left over.`
        : hover !== null
          ? `${order[hover]} · ${infos[hover].nonCrossing.length > 1 ? `pairing ${infos[hover].nonCrossing.indexOf(matching[hover] ?? 0) + 1} of ${infos[hover].nonCrossing.length}` : infos[hover].pointCount ? 'one pairing' : 'no crossings'}`
          : code === null && !crossing.length
            ? 'Several strands on a class: no code has room for that, so the link spells the pairings out.'
            : null;

  return (
    <div className="combo-bar" data-testid="combo-bar">
      <div className="combo-line">
        <div className="combo-code" data-testid="combo-code" data-code={code ?? ''}>
          <button
            type="button"
            className="combo-rule"
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label={`Rule ${rule || 'empty'}: choose an edge set`}
            onClick={() => setMenu((m) => !m)}
            data-testid="combo-rule"
          >
            {rule ? [...rule].map((c) => <span key={c} className="combo-class" style={{ ['--c' as string]: edgeClassColor(Number(c)) }}>{c}</span>) : <span className="combo-empty">∅</span>}
            <span className="combo-caret" aria-hidden="true">▾</span>
          </button>
          <span className="combo-dash">-</span>
          {order.map((t, i) => {
            const d = digits[i];
            const n = d.kind === 'free' || d.kind === 'cross' ? infos[i].nonCrossing.length : 1;
            return (
              <button
                type="button"
                key={t}
                className={`combo-digit is-${d.kind}${hover === i ? ' is-hl' : ''}`}
                style={{ ['--t' as string]: tileColor(t, colorScheme, customColors) }}
                aria-label={d.kind === 'odd' ? `${t}: odd, one tail` : d.kind === 'cross' ? `${t}: lines cross; tap for its first pairing` : n > 1 ? `${t}: pairing ${d.ch}, tap for the next` : `${t}: one pairing`}
                title={t}
                disabled={n <= 1}
                onClick={() => (d.kind === 'cross' ? setTile(i, infos[i].nonCrossing[0]) : stepTile(i, 1))}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                data-testid={`combo-digit-${t}`}
              >
                {d.ch}
              </button>
            );
          })}
        </div>
        <span className="combo-count" data-testid="combo-count" title={odometer.exact ? `Combination ${(odometer.position + 1).toLocaleString('en-US')} of ${odometer.total.toLocaleString('en-US')}` : undefined}>
          {nonCrossingOnly && crossing.length ? '–' : odometer.exact ? (odometer.position + 1).toLocaleString('en-US') : '…'}/{odometer.exact ? odometer.total.toLocaleString('en-US') : 'many'}
        </span>
        <span className="combo-buttons">
          <button type="button" className="combo-icon" aria-label="Previous combination" data-tip="Previous" disabled={odometer.total <= 1} onClick={() => change({ matching: odometer.step(-1) })}>
            <svg viewBox="0 0 20 20" {...ICON} strokeWidth={2}><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
          </button>
          <button type="button" className="combo-icon" aria-label="Next combination" data-tip="Next" disabled={odometer.total <= 1} onClick={() => change({ matching: odometer.step(1) })}>
            <svg viewBox="0 0 20 20" {...ICON} strokeWidth={2}><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
          </button>
          <button type="button" className="combo-random primary" disabled={odometer.total <= 1} onClick={() => change({ matching: odometer.random() })}>
            Random
          </button>
          <button
            type="button"
            className={`combo-icon${copied ? ' show-tip' : ''}`}
            aria-label="Copy"
            data-tip={copied ?? (code === null ? 'No code to copy' : 'Copy')}
            disabled={code === null}
            onClick={() => code && void copyText(code).then((ok) => { setCopied(ok ? 'Copied' : code); window.setTimeout(() => setCopied(null), 1400); })}
            data-testid="combo-copy"
          >
            <svg viewBox="0 0 20 20" {...ICON} strokeWidth={1.7}><rect x="7" y="7" width="9.5" height="10" rx="1.6" /><path d="M13 7V4.6A1.6 1.6 0 0 0 11.4 3H5.1a1.6 1.6 0 0 0-1.6 1.6v6.8A1.6 1.6 0 0 0 5.1 13H7" /></svg>
          </button>
          <button type="button" className="combo-icon" aria-label="Paste a code or link" data-tip="Paste a code" onClick={() => setPasting(true)} data-testid="combo-paste">
            <svg viewBox="0 0 20 20" {...ICON} strokeWidth={1.7}><rect x="4" y="4" width="12" height="13.5" rx="1.6" /><path d="M7.5 4V2.8h5V4M7.5 9h5M7.5 12.5h3.5" /></svg>
          </button>
          <button
            type="button"
            className="combo-icon"
            aria-label="Clear"
            data-tip="Clear"
            onClick={() => {
              withRule([]);
              setNote('Cleared: no edges carry a line.');
            }}
            data-testid="combo-clear"
          >
            <svg viewBox="0 0 20 20" {...ICON} strokeWidth={1.8}><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" /></svg>
          </button>
        </span>
        {menu ? (
          <RuleMenu
            family={family}
            current={rule}
            valid={valid}
            onPick={(r) => {
              setMenu(false);
              withRule([...r].map(Number));
            }}
            onClose={() => setMenu(false)}
          />
        ) : null}
      </div>
      <div className={`combo-status${crossing.length || odd.length ? ' is-warn' : ''}`} role="status" data-testid="combo-status">
        {status}
      </div>
      {tiles ? (
        <div className={`combo-tiles${tilesInRow ? ' is-row' : ''}`} data-testid="combo-tiles">
          {order.map((t, i) => (
            <TileCard
              key={t}
              family={family}
              type={t}
              selected={selected}
              contracts={contracts}
              index={matching[i] ?? 0}
              nonCrossingOnly={nonCrossingOnly}
              curvedStrands={curvedStrands}
              fill={tileColor(t, colorScheme, customColors)}
              highlighted={hover === i}
              onHover={(on) => setHover(on ? i : null)}
              onOpen={() => setEditing(t)}
              onSet={(index) => setTile(i, index)}
              onStep={(d) => stepTile(i, d)}
            />
          ))}
        </div>
      ) : null}
      {pasting ? (
        <PasteBox
          family={family}
          families={families}
          onUse={(r) => {
            setPasting(false);
            const m = comboToMatchingIndices(r.family, r.subset, r.combo, r.family === family ? contracts : undefined);
            onChange({ family: r.family, subset: r.subset, matching: m });
            setNote(`Read ${FAMILY_DISPLAY_NAMES[r.family]} ${formatComboShareString(r.subset, r.combo)} from ${r.via}.${r.tails ? ' This edge set has tails.' : ''}`);
          }}
          onClose={() => setPasting(false)}
        />
      ) : null}
      {editing ? (
        <TileEditor
          key={editing}
          family={family}
          type={editing}
          selected={selected}
          contracts={contracts}
          index={matching[order.indexOf(editing)] ?? 0}
          nonCrossingOnly={nonCrossingOnly}
          curvedStrands={curvedStrands}
          fullLabels={edgeLabels}
          onSetIndex={(index) => setTile(order.indexOf(editing), index)}
          onToggleClass={toggleClass}
          onStepTile={(d) => setEditing(order[(order.indexOf(editing) + d + order.length) % order.length])}
          onClose={() => setEditing(null)}
          onStrands={onStrands}
        />
      ) : null}
    </div>
  );
}

/** The tail-free edge sets, each with its number of combinations; the current rule first when it has tails. */
function RuleMenu(props: { family: TileFamilyId; current: string; valid: readonly string[]; onPick(rule: string): void; onClose(): void }): JSX.Element {
  const { family, current, valid, onPick, onClose } = props;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest?.('.combo-rule')) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  const count = (r: string) => comboOptionCounts(family, [...r].map(Number)).reduce((a, b) => a * b, 1);
  const digitsOf = (r: string) => (r ? [...r].map((c) => <span key={c} className="combo-class" style={{ ['--c' as string]: edgeClassColor(Number(c)) }}>{c}</span>) : <span className="combo-empty">∅</span>);
  return (
    <div className="combo-menu" role="menu" ref={ref} data-testid="combo-menu">
      <div className="combo-menu-head">Tail-free edge sets, {FAMILY_DISPLAY_NAMES[family]}</div>
      {valid.includes(current) ? null : (
        <button type="button" role="menuitemradio" aria-checked="true" onClick={onClose}>
          <span className="combo-menu-rule">{digitsOf(current)}</span>
          <span className="combo-menu-n is-warn">now, with tails</span>
        </button>
      )}
      {valid.map((r) => {
        const n = count(r);
        return (
          <button type="button" key={r || 'none'} role="menuitemradio" aria-checked={r === current} onClick={() => onPick(r)} data-rule={r}>
            <span className="combo-menu-rule">{digitsOf(r)}</span>
            <span className="combo-menu-n">
              {n.toLocaleString('en-US')} combination{n === 1 ? '' : 's'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A box to paste a code or link into; it shows what it read before it is used. */
function PasteBox(props: {
  family: TileFamilyId;
  families: readonly TileFamilyId[];
  onUse(r: Extract<ReturnType<typeof readCode>, { ok: true }>): void;
  onClose(): void;
}): JSX.Element {
  const { family, families, onUse, onClose } = props;
  const [text, setText] = useState('');
  const read = readCode(text, { family, families });
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="combo-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="combo-modal" role="dialog" aria-modal="true" aria-labelledby="combo-paste-h" data-testid="combo-paste-box">
        <h3 id="combo-paste-h">Paste a code or link</h3>
        <textarea
          ref={ref}
          value={text}
          spellCheck={false}
          placeholder="023468-140000001, or a link from any page"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (read?.ok) onUse(read);
            }
          }}
          data-testid="combo-paste-text"
        />
        <p className={`combo-status${read && !read.ok ? ' is-warn' : ''}`} data-testid="combo-paste-read">
          {!read
            ? 'A code, or a link from the Explorer, Harmonics, Build-up, Foundations, Supertiles or Compare.'
            : read.ok
              ? `${FAMILY_DISPLAY_NAMES[read.family]} ${formatComboShareString(read.subset, read.combo)}, read from ${read.via}.${read.tails ? ' This edge set has tails.' : ''}`
              : read.error}
        </p>
        <div className="combo-modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={!read?.ok} onClick={() => read?.ok && onUse(read)} data-testid="combo-paste-use">
            Use it
          </button>
        </div>
      </div>
    </div>
  );
}

/** Badge, dot and gap sizes as fractions of the tile's size; seams pulled back by `SEAM_TRIM` (as `TileView`'s). */
const CARD = { dot: 0.04, badge: 0.07, gap: 0.018 };
const SEAM_TRIM = 0.1;

/** A polyline with `cut` of its length taken off each end. */
function trimmed(line: readonly Pt[], cut: number): readonly Pt[] {
  const len = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
  const total = line.slice(1).reduce((acc, p, j) => acc + len(line[j], p), 0);
  if (total <= 2 * cut) return line;
  const at = (d: number): [number, Pt] => {
    let acc = 0;
    for (let j = 1; j < line.length; j++) {
      const l = len(line[j - 1], line[j]);
      if (acc + l >= d) {
        const u = (d - acc) / l;
        return [j, { x: line[j - 1].x + u * (line[j].x - line[j - 1].x), y: line[j - 1].y + u * (line[j].y - line[j - 1].y) }];
      }
      acc += l;
    }
    return [line.length - 1, line[line.length - 1]];
  };
  const [j0, p0] = at(cut);
  const [j1, p1] = at(total - cut);
  return [p0, ...line.slice(j0, j1), p1];
}

/** One tile in its own colour: seams outlined by class, class numbers by their points, the pairing, and a slider. */
function TileCard(props: {
  family: TileFamilyId;
  type: TileTypeId;
  selected: ReadonlySet<number>;
  contracts?: EdgeContracts;
  index: number;
  nonCrossingOnly: boolean;
  curvedStrands: boolean;
  fill: string;
  highlighted: boolean;
  onHover(on: boolean): void;
  onOpen(): void;
  onSet(index: number): void;
  onStep(d: 1 | -1): void;
}): JSX.Element {
  const { family, type, selected, contracts, index, nonCrossingOnly, curvedStrands, fill, highlighted, onHover, onOpen, onSet, onStep } = props;
  const outline = leafPts(family, type);
  const info = tileMatchingInfo(family, type, selected, contracts);
  const options = info.odd ? [] : matchingOptions(info, nonCrossingOnly);
  const position = options.indexOf(index);
  const pairs = info.odd ? [] : (matchingAt(info.pointCount, index) ?? []);
  const geometry = useMemo(() => {
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    const s = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const c = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
    // One spot per seam, where its point sits with one strand: the class number goes just outside it.
    const all = tileMatchingInfo(family, type, new Set(familyMajors(family))).points;
    const d = (CARD.dot + CARD.badge + CARD.gap) * s;
    const badges = all.map((p) => {
      const dx = p.pt.x - c.x;
      const dy = p.pt.y - c.y;
      const l = Math.hypot(dx, dy) || 1;
      return { at: { x: p.pt.x + (dx / l) * d, y: p.pt.y + (dy / l) * d }, pt: p.pt, major: p.edge.major };
    });
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (const b of badges) {
      const r = CARD.badge * s * 1.08;
      x0 = Math.min(x0, b.at.x - r); x1 = Math.max(x1, b.at.x + r); y0 = Math.min(y0, b.at.y - r); y1 = Math.max(y1, b.at.y + r);
    }
    const side = Math.max(x1 - x0, y1 - y0);
    const seams = metaEdges(family, type).map((m) => ({ major: m.major, line: trimmed(seamPolyline(outline, m), SEAM_TRIM) }));
    return { s, badges, seams, vb: `${(x0 + x1) / 2 - side / 2} ${(y0 + y1) / 2 - side / 2} ${side} ${side}` };
  }, [family, type, outline]);
  const sw = geometry.s * 0.03;
  const pts = info.points.map((p) => p.pt);
  const chordD = ([i, j]: readonly [number, number]): string => {
    const p = pts[i];
    const q = pts[j];
    if (!curvedStrands) return `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
    const [h1, h2] = orientCurve(strandCurve(family, type, p, q), p);
    return `M ${p.x} ${p.y} C ${h1.x} ${h1.y} ${h2.x} ${h2.y} ${q.x} ${q.y}`;
  };
  const one = options.length <= 1;
  const label = info.odd ? 'odd' : position < 0 ? `crossing/${options.length}` : `${position + 1}/${Math.max(1, options.length)}`;
  return (
    <div className={`combo-tile${highlighted ? ' is-hl' : ''}${info.odd ? ' is-odd' : ''}`} onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)} data-tile={type}>
      <button type="button" className="combo-tile-open" onClick={onOpen} aria-label={`Open ${type} to draw its lines`}>
        <svg viewBox={geometry.vb} aria-hidden="true">
          <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} fill={fill} className="combo-tile-body" strokeWidth={sw * 0.4} />
          {geometry.seams.map((m, k) => {
            const on = selected.has(m.major);
            const d = m.line.map((p, j) => `${j ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
            const w = sw * (on ? 1.5 : 0.9);
            return (
              <g key={k}>
                <path d={d} className="combo-tile-casing" strokeOpacity={on ? 0.85 : 0.3} strokeWidth={w + sw * 0.6} />
                <path d={d} fill="none" stroke={edgeClassColor(m.major)} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
          {pairs.map((pair, k) => (
            <path key={k} d={chordD(pair)} className="combo-tile-chord" strokeWidth={sw} />
          ))}
          {geometry.badges.map((b, k) => {
            const on = selected.has(b.major);
            const r = geometry.s * CARD.badge;
            return (
              <g key={k}>
                <circle cx={b.at.x} cy={b.at.y} r={r} className={`combo-tile-badge${on ? ' is-on' : ''}`} style={{ ['--c' as string]: edgeClassColor(b.major) }} strokeWidth={sw * 0.5} />
                <text x={b.at.x} y={b.at.y} fontSize={r * 1.25} className={`combo-tile-num${on ? ' is-on' : ''}`}>
                  {b.major}
                </text>
              </g>
            );
          })}
          {geometry.badges.map((b, k) =>
            selected.has(b.major) ? null : (
              <circle key={k} cx={b.pt.x} cy={b.pt.y} r={geometry.s * CARD.dot * 0.7} className="combo-tile-dot is-off" style={{ ['--c' as string]: edgeClassColor(b.major) }} strokeWidth={sw * 0.6} />
            ),
          )}
          {info.points.map((p, k) => (
            <circle key={`p${k}`} cx={p.pt.x} cy={p.pt.y} r={geometry.s * CARD.dot} className={`combo-tile-dot${info.odd ? ' is-odd' : ''}`} style={{ ['--c' as string]: edgeClassColor(p.edge.major) }} strokeWidth={sw * 0.4} />
          ))}
        </svg>
        <span className="combo-tile-name">{type}</span>
      </button>
      <div className="combo-tile-slider">
        <button type="button" aria-label={`${type}: previous pairing`} disabled={one} onClick={() => onStep(-1)}>
          ‹
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, options.length - 1)}
          step={1}
          value={Math.max(0, position)}
          disabled={one}
          aria-label={`${type} pairing`}
          onChange={(e) => onSet(options[Number(e.target.value)] ?? 0)}
        />
        <button type="button" aria-label={`${type}: next pairing`} disabled={one} onClick={() => onStep(1)}>
          ›
        </button>
      </div>
      <span className={`combo-tile-of${info.odd || position < 0 ? ' is-warn' : ''}`}>{label}</span>
    </div>
  );
}

export default ComboBar;
