/**
 * Give tile types, their edges and the lines through them a sound: pick a
 * tile type, press a point (its edge) or a line in the tile editor, choose
 * what the assignment applies to, then set a note and/or a setting change.
 * The map itself is plain JSON (`tileSounds.ts`), owned by the page.
 */

import { useMemo, useRef, useState } from 'react';
import { familyMajors, leafOrder, type TileFamilyId } from '../../core';
import { TileEditor, TileGlyph, type TilePick } from '../../components';
import { tileMatchingInfo } from '../../lib/matchingModel';
import { seamLabel } from './steps';
import {
  EMPTY_TILE_SOUNDS,
  INSTRUMENTS,
  MODES,
  TARGETS,
  TARGET_HELP,
  chordKey,
  describeAssignment,
  keyLabel,
  presets,
  readTileSounds,
  withAssignment,
  type Assignment,
  type Instrument,
  type Mode,
  type Target,
  type TileSounds,
} from './tileSounds';

export function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface TileSoundEditorProps {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  /** Full matching index per leaf type, `leafOrder(family)` order. */
  readonly matching: readonly number[];
  readonly map: TileSounds;
  onMap(map: TileSounds): void;
  onMatching(typeIndex: number, index: number): void;
  onToggleClass(major: number): void;
}

interface Scope {
  readonly label: string;
  /** Tile type, or `*` for every type. */
  readonly scope: string;
  readonly key: string;
}

export function TileSoundEditor(props: TileSoundEditorProps): JSX.Element {
  const { family, subset, matching, map, onMap } = props;
  const types = leafOrder(family);
  const selected = useMemo(() => new Set(subset), [subset]);
  const [typeIdx, setTypeIdx] = useState(0);
  const [pick, setPick] = useState<TilePick | null>(null);
  const [scopeIdx, setScopeIdx] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = Math.min(typeIdx, types.length - 1);
  const type = types[t];
  const info = tileMatchingInfo(family, type, selected);
  const edge = (i: number) => ({ label: seamLabel(info.points[i].edge.id), major: info.points[i].edge.major });

  const scopes = useMemo((): Scope[] => {
    if (!pick || ('point' in pick ? pick.point >= info.points.length : pick.pair[1] >= info.points.length)) {
      return [
        { label: `every ${type} step`, scope: type, key: 'tile' },
        { label: 'every step, any tile', scope: '*', key: 'tile' },
      ];
    }
    if ('point' in pick) {
      const e = edge(pick.point);
      return [
        { label: `entering ${type} by edge ${e.label}`, scope: type, key: `edge:${e.label}` },
        { label: `entering ${type} by class ${e.major}`, scope: type, key: `class:${e.major}` },
        { label: `entering any tile by class ${e.major}`, scope: '*', key: `class:${e.major}` },
      ];
    }
    const a = edge(pick.pair[0]);
    const b = edge(pick.pair[1]);
    return [
      { label: `line ${a.label} – ${b.label}, either way`, scope: type, key: chordKey(a.label, b.label) },
      { label: `${type}, class ${a.major} → ${b.major}`, scope: type, key: `classes:${a.major}>${b.major}` },
      { label: `${type}, class ${b.major} → ${a.major}`, scope: type, key: `classes:${b.major}>${a.major}` },
      { label: `any tile, class ${a.major} → ${b.major}`, scope: '*', key: `classes:${a.major}>${b.major}` },
      { label: `any tile, class ${b.major} → ${a.major}`, scope: '*', key: `classes:${b.major}>${a.major}` },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, info, type]);
  const scope = scopes[Math.min(scopeIdx, scopes.length - 1)];
  const current: Assignment = map.tiles[scope.scope]?.[scope.key] ?? {};
  const set = (next: Assignment): void => onMap(withAssignment(map, scope.scope, scope.key, next));

  // Outline the points and lines of this tile that something is assigned to.
  const marks = useMemo(() => {
    const own = map.tiles[type] ?? {};
    const any = map.tiles['*'] ?? {};
    const points = new Set<number>();
    const pairs = new Set<string>();
    info.points.forEach((_, i) => {
      const e = edge(i);
      if (own[`edge:${e.label}`] || own[`class:${e.major}`] || any[`class:${e.major}`]) points.add(i);
      for (let j = i + 1; j < info.points.length; j++) {
        const f = edge(j);
        const keys = [chordKey(e.label, f.label), `classes:${e.major}>${f.major}`, `classes:${f.major}>${e.major}`];
        if (own[keys[0]] || keys.slice(1).some((k) => own[k] || any[k])) pairs.add(`${i}-${j}`);
      }
    });
    return { points, pairs, picked: pick };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, type, info, pick]);

  const choose = (next: TilePick | null): void => {
    setPick(next);
    setScopeIdx(0);
  };
  const entries = Object.entries(map.tiles).flatMap(([s, row]) => Object.entries(row).map(([k, a]) => ({ scope: s, key: k, a })));
  const examples = useMemo(() => presets(types, familyMajors(family)), [types, family]);

  return (
    <div className="sound-tiles">
      <div className="sound-tile-row" role="group" aria-label="Tile type">
        {types.map((name, i) => (
          <button
            key={name}
            type="button"
            className={i === t ? 'is-active' : undefined}
            aria-pressed={i === t}
            title={name}
            onClick={() => {
              setTypeIdx(i);
              choose(null);
            }}
          >
            <TileGlyph family={family} type={name} selected={selected} index={matching[i] ?? 0} size={34} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <TileEditor
        family={family}
        type={type}
        selected={selected}
        index={matching[t] ?? 0}
        nonCrossingOnly
        onSetIndex={(index) => {
          props.onMatching(t, index);
          choose(null);
        }}
        onToggleClass={(m) => {
          props.onToggleClass(m);
          choose(null);
        }}
        onStepTile={(d) => {
          setTypeIdx((t + d + types.length) % types.length);
          choose(null);
        }}
        onClose={() => choose(null)}
        onPick={choose}
        marks={marks}
      />

      <label className="sound-choice">
        <span>Applies to</span>
        <select value={Math.min(scopeIdx, scopes.length - 1)} onChange={(e) => setScopeIdx(Number(e.target.value))} aria-label="Applies to">
          {scopes.map((s, i) => (
            <option key={i} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="sound-check">
        <input
          type="checkbox"
          checked={!!current.note}
          onChange={(e) => set({ ...current, note: e.target.checked ? { instrument: 'pluck', degree: 0, velocity: 0.6 } : undefined })}
        />
        Play a note
      </label>
      {current.note ? (
        <div className="sound-assign">
          <select aria-label="Instrument" value={current.note.instrument} onChange={(e) => set({ ...current, note: { ...current.note!, instrument: e.target.value as Instrument } })}>
            {INSTRUMENTS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="number"
            aria-label={current.note.midi ? 'MIDI note' : 'Scale degree'}
            value={current.note.degree}
            onChange={(e) => set({ ...current, note: { ...current.note!, degree: Number(e.target.value) || 0 } })}
          />
          <label className="sound-check">
            <input type="checkbox" checked={!!current.note.midi} onChange={(e) => set({ ...current, note: { ...current.note!, midi: e.target.checked || undefined } })} />
            MIDI
          </label>
          <input
            type="range"
            aria-label="Velocity"
            min={0}
            max={1}
            step={0.05}
            value={current.note.velocity}
            onChange={(e) => set({ ...current, note: { ...current.note!, velocity: Number(e.target.value) } })}
          />
        </div>
      ) : null}

      <label className="sound-check">
        <input
          type="checkbox"
          checked={!!current.mod}
          onChange={(e) => set({ ...current, mod: e.target.checked ? { target: 'pitch', mode: 'add', amount: 2 } : undefined })}
        />
        Change a setting
      </label>
      {current.mod ? (
        <>
          <div className="sound-assign">
            <select aria-label="Mode" value={current.mod.mode} onChange={(e) => set({ ...current, mod: { ...current.mod!, mode: e.target.value as Mode } })}>
              {MODES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select aria-label="Setting" value={current.mod.target} onChange={(e) => set({ ...current, mod: { ...current.mod!, target: e.target.value as Target } })}>
              {TARGETS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              type="number"
              aria-label="Amount"
              step="any"
              value={current.mod.amount}
              onChange={(e) => set({ ...current, mod: { ...current.mod!, amount: Number(e.target.value) || 0 } })}
            />
          </div>
          <p className="sound-note">
            {current.mod.target}: {TARGET_HELP[current.mod.target]}.
          </p>
        </>
      ) : null}

      <div className="sound-assigned">
        <b>Assigned</b>
        {entries.length === 0 ? <p className="sound-note">Nothing yet: tile crossings change nothing.</p> : null}
        <ul>
          {entries.map((x) => (
            <li key={`${x.scope}/${x.key}`}>
              <span>
                {x.scope === '*' ? 'any tile' : x.scope}, {keyLabel(x.key)}: {describeAssignment(x.a)}
              </span>
              <button type="button" aria-label="Remove" onClick={() => onMap(withAssignment(map, x.scope, x.key, null))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sound-buttons">
        <select aria-label="Example" defaultValue="" onChange={(e) => {
          const ex = examples[Number(e.target.value)];
          if (ex) onMap(ex.map);
          e.target.value = '';
        }}>
          <option value="" disabled>
            Load an example…
          </option>
          {examples.map((ex, i) => (
            <option key={ex.name} value={i}>
              {ex.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onMap(EMPTY_TILE_SOUNDS)}>
          Clear
        </button>
        <button type="button" onClick={() => download(`tile-sounds-${family}.json`, JSON.stringify(map, null, 2))}>
          Export
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              onMap(readTileSounds(JSON.parse(await file.text())));
              setNote(null);
            } catch (err) {
              setNote(`Could not read ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
        />
      </div>
      {note ? <p className="sound-error-text">{note}</p> : null}
    </div>
  );
}
