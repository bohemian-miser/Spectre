/**
 * Shape sound: paint a rule's circuits with a brush. The brush holds a mode
 * (`shapesound/render.ts`: Fourier spectrum, distance from the centre,
 * corners), its settings, and whether it plays the lap on a loop or a held
 * tone. Clicking a circuit turns it on with the brush as it stands and
 * selects it, or turns it off; shift-click selects an on circuit. Brush edits
 * re-render the selected circuit live. Each painted circuit is a voice in the
 * list under the map. Picking, tiling and map drawing are the Sound page's.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  comboToMatchingIndices,
  matchingIndicesToCombo,
  normalizeMatchingVector,
  type Pt,
  type TileFamilyId,
} from '../core';
import { ComboBar } from '../components';
import { panBy, screenToWorld, worldToScreen, zoomAt, type MapCamera } from './map/camera';
import { createCanvas2dRenderer } from './map/canvasRenderer';
import { findTableOf } from './map/findPass';
import type { MapRenderer } from './map/rendererTypes';
import { LIGHT_LINE_COLOR } from './map/webglRenderer';
import { loadWorld, reelDefaults } from './reel/director';
import { cutCuller } from './reel/stage';
import { strandFinder } from './sound/strands';
import { createMixer } from './shapesound/mixer';
import { applyBrush, brushOf, paint, type Brush, type Voice } from './shapesound/paint';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  MAPPINGS,
  PLAYS,
  REVERB,
  clipSeconds,
  render,
  renderPen,
  renderPenConstant,
  type Clip,
  type Mapping,
  type Settings,
} from './shapesound/render';
import { cornerEps, fitCorners, makeShape, type Shape } from './shapesound/shape';
import { ShapeView } from './shapesound/ShapeView';
import { cardAudio, cardInfo, cardPainter, recordCard, type CardOptions, type CardPainter, type CardSource } from './shapesound/card';
import { decodeHash, encodeHash, type HashState } from './shapesound/hash';
import '../styles/sound.css';
import '../styles/shapesound.css';

const SR = 44100;
const CLICK_PX = 4;
/** How near a click must land to a strand, px: generous, for sweeping. */
const PICK_PX = 22;
/** Rendered clips kept for toggling a circuit back on. */
const CACHE_CLIPS = 48;

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

const MODE_LABELS: Record<Mapping, string> = { spectrum: 'Spectrum', radius: 'Distance from centre', corners: 'Corners' };
const PLAY_LABELS = { loop: 'Loop', constant: 'Constant' } as const;
/** Ink of a painted circuit, by mode. */
const MODE_COLORS: Record<Mapping, readonly [number, number, number]> = {
  spectrum: [250, 150, 50],
  radius: [90, 160, 240],
  corners: [90, 220, 170],
};
const rgb = (c: readonly number[], a = 1): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const mainSig = (v: Brush & { key: string }): string => {
  const s = v.mode === 'spectrum' ? { f0: v.settings.spectrum.f0, terms: v.settings.spectrum.terms } : v.settings[v.mode];
  // A held tone has no lap.
  const { lap: _lap, ...held } = s as { lap?: number };
  return `${v.key}|${v.play}|${v.mode}|${JSON.stringify(v.play === 'constant' ? held : s)}`;
};
const penSig = (v: Brush & { key: string }): string => {
  const s = v.settings.spectrum;
  return v.mode === 'spectrum' && s.pen ? `${v.key}|pen|${v.play}|${s.penSpeed}|${s.penRate}|${s.penFrom}|${s.penMax}` : '';
};

function LogSlider(props: { label: string; min: number; max: number; value: number; show: string; onChange: (v: number) => void }): JSX.Element {
  const { min, max } = props;
  const x = Math.round((1000 * Math.log(props.value / min)) / Math.log(max / min));
  return (
    <label className="sound-slider">
      <span>{props.label}</span>
      <input type="range" min={0} max={1000} step={1} value={x} aria-label={props.label} onChange={(e) => props.onChange(min * (max / min) ** (Number(e.target.value) / 1000))} />
      <span className="sound-value">{props.show}</span>
    </label>
  );
}

function Slider(props: { label: string; min: number; max: number; step: number; value: number; show: string; onChange: (v: number) => void }): JSX.Element {
  return (
    <label className="sound-slider">
      <span>{props.label}</span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} aria-label={props.label} onChange={(e) => props.onChange(Number(e.target.value))} />
      <span className="sound-value">{props.show}</span>
    </label>
  );
}

function Segmented<T extends string>(props: { label: string; options: readonly T[]; names: Record<T, string>; value: T; onChange: (v: T) => void }): JSX.Element {
  return (
    <div className="shapesound-segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={props.value === o} className={props.value === o ? 'is-on' : undefined} onClick={() => props.onChange(o)}>
          {props.names[o]}
        </button>
      ))}
    </div>
  );
}

interface Preview {
  readonly key: string;
  readonly points: readonly Pt[];
}

export function ShapeSoundPage(): JSX.Element {
  const [initial] = useState<HashState>(() => {
    const d = reelDefaults('hex');
    const fallback: HashState = { family: 'hex', subset: d.subset, combo: d.combo, circuit: null, brush: { mode: 'spectrum', play: 'loop', settings: DEFAULT_SETTINGS } };
    try {
      return decodeHash(window.location.hash, fallback);
    } catch {
      return fallback;
    }
  });
  const [family, setFamily] = useState<TileFamilyId>(initial.family);
  const [subset, setSubset] = useState<readonly number[]>(initial.subset);
  const [matching, setMatching] = useState<readonly number[]>(() => {
    try {
      return comboToMatchingIndices(initial.family, initial.subset, initial.combo);
    } catch {
      const d = reelDefaults(initial.family);
      return comboToMatchingIndices(initial.family, d.subset, d.combo);
    }
  });
  /** The circuit the hash selects, painted once its world has loaded. */
  const pendingCircuit = useRef(initial.circuit);
  const combo = useMemo(() => matchingIndicesToCombo(family, subset, matching), [family, subset, matching]);
  const [brush, setBrush] = useState<Brush>(initial.brush);
  const brushRef = useRef(brush);
  brushRef.current = brush;
  const [voices, setVoices] = useState<readonly Voice[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<Preview | null>(null);
  const [clicked, setClicked] = useState<Preview | null>(null);
  const nextId = useRef(1);
  const voicesRef = useRef(voices);
  voicesRef.current = voices;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const loaded = useMemo(() => {
    const d = reelDefaults(family);
    if (combo === null) return { world: null, error: 'Crossing pairings' };
    try {
      return { world: loadWorld({ ...d, seed: 1, family, subset, combo, seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 }), error: null };
    } catch (err) {
      return { world: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [family, subset, combo]);
  const world = loaded.world;
  const findStrand = useMemo(() => (world ? strandFinder(world.cut, findTableOf(world.table), world.circuits) : null), [world]);

  // --- shapes, clips and the render queue -------------------------------------------
  const mixerRef = useRef(createMixer());
  const shapes = useRef(new Map<string, Shape>());
  const shapeOf = useCallback((c: Preview): Shape => {
    let s = shapes.current.get(c.key);
    if (!s) shapes.current.set(c.key, (s = makeShape(c.points)));
    return s;
  }, []);
  const clips = useRef(new Map<string, Clip>());
  const clipFor = (sig: string, make: () => Clip): Clip => {
    let c = clips.current.get(sig);
    if (c) {
      clips.current.delete(sig);
    } else {
      c = make();
      if (clips.current.size >= CACHE_CLIPS) clips.current.delete(clips.current.keys().next().value!);
    }
    clips.current.set(sig, c);
    return c;
  };
  /** A voice's lap clip and pen clip, rendered or from the cache. */
  const clipsOf = (v: Voice): { main: Clip; pen: Clip | null } => {
    const shape = shapeOf(v);
    const main = clipFor(mainSig(v), () => render(shape, v.mode, v.settings, SR, v.play));
    const ps = penSig(v);
    const speed = v.settings.spectrum.penSpeed;
    const pen = ps ? clipFor(ps, () => (v.play === 'constant' ? renderPenConstant(shape, speed, SR) : renderPen(shape, v.settings.spectrum, SR))) : null;
    return { main, pen };
  };
  const clipsRef = useRef(clipsOf);
  clipsRef.current = clipsOf;
  /** The signatures each voice's mixer clips were made from. */
  const given = useRef(new Map<number, string>());
  const queued = useRef(false);

  /** Render one out-of-date voice per task, so clicks keep landing while clips are made. */
  const pump = useCallback((): void => {
    if (queued.current) return;
    queued.current = true;
    setTimeout(() => {
      queued.current = false;
      const v = voicesRef.current.find((x) => given.current.get(x.id) !== mainSig(x) + penSig(x));
      if (!v) return;
      const { main, pen } = clipsRef.current(v);
      const m = mixerRef.current;
      const fresh = !given.current.has(v.id);
      given.current.set(v.id, mainSig(v) + penSig(v));
      m.setClips(v.id, main, pen, REVERB[v.mode]);
      if (fresh) m.start(v.id, true);
      pump();
    }, 30);
  }, []);

  useEffect(() => {
    const m = mixerRef.current;
    for (const v of voices) {
      m.setLevel(v.id, v.on ? v.level : 0);
      const s = v.settings.spectrum;
      m.setPenLevel(v.id, v.mode === 'spectrum' && s.pen ? s.penLevel : 0);
    }
    pump();
  }, [voices, pump]);

  useEffect(() => () => mixerRef.current.stopAll(), []);

  const dropVoice = (id: number): void => {
    mixerRef.current.remove(id);
    given.current.delete(id);
    if (selectedRef.current === id) setSelected(null);
  };
  const clearAll = (): void => {
    voicesRef.current.forEach((v) => dropVoice(v.id));
    setVoices([]);
    setSelected(null);
  };

  // Brush edits go to the selected circuit.
  useEffect(() => {
    setVoices((vs) => applyBrush(vs, selectedRef.current, brush));
  }, [brush]);

  const select = (v: Voice): void => {
    setSelected(v.id);
    setBrush(brushOf(v));
  };

  // A new rule drops the circuits painted in the old one.
  useEffect(() => {
    voicesRef.current.forEach((v) => {
      mixerRef.current.remove(v.id);
      given.current.delete(v.id);
    });
    setVoices([]);
    setSelected(null);
    setHover(null);
    setClicked(null);
    shapes.current.clear();
    // Kept until the rule changes: a remount runs this again and must paint it again.
    const want = pendingCircuit.current;
    if (!want || !world) return;
    // The circuit by key if its size matches, else the copy of that size nearest the centre.
    const sized = world.circuits.filter((c) => !want.steps || c.points.length === want.steps);
    const byKey = sized.find((c) => `c${c.id}` === want.key);
    const c = byKey ?? [...sized].sort((a, b) => Math.hypot(a.centre.x, a.centre.y) - Math.hypot(b.centre.x, b.centre.y))[0];
    if (!c) return;
    const r = paint([], null, { key: `c${c.id}`, points: c.points }, brushRef.current, false, nextId.current++);
    voicesRef.current = r.voices;
    selectedRef.current = r.selected;
    setVoices(r.voices);
    setSelected(r.selected);
    setClicked({ key: `c${c.id}`, points: c.points });
  }, [world]);

  const onPaint = (c: Preview, shift: boolean): void => {
    setClicked(c);
    const r = paint(voicesRef.current, selectedRef.current, c, brush, shift, nextId.current);
    if (r.kind === 'add') {
      nextId.current++;
      // Make the voice (and the audio context) inside the click; the queue starts it once its clip is ready.
      mixerRef.current.setLevel(r.id!, 0);
    }
    if (r.kind === 'remove') dropVoice(r.id!);
    if (r.kind === 'select') setBrush(brushOf(r.voices.find((v) => v.id === r.selected)!));
    voicesRef.current = r.voices;
    selectedRef.current = r.selected;
    setVoices(r.voices);
    setSelected(r.selected);
  };

  // --- map --------------------------------------------------------------------
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const camRef = useRef<MapCamera>({ cx: 0, cy: 0, scale: reelDefaults('hex').scale });
  const sizeRef = useRef({ w: 1, h: 1 });
  const cullRef = useRef<ReturnType<typeof cutCuller> | null>(null);
  const frameRef = useRef(0);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  const draw = useCallback((): void => {
    const r = rendererRef.current;
    if (!r || !world || !cullRef.current) return;
    const { w, h } = sizeRef.current;
    const cam = camRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    r.setStyle({ showFills: false, showOutlines: false, lineColor: LIGHT_LINE_COLOR, lineScale: 1.5 });
    r.setCut(cullRef.current(cam, w, h));
    r.setCircuits([]);
    r.setTrail(null);
    r.render(cam, w, h, dpr);

    // Painted circuits over the tiles: the mode's colour, solid when held, dashed when looping.
    const o = overlayRef.current;
    const g = o?.getContext('2d');
    if (!o || !g) return;
    if (o.width !== Math.round(w * dpr) || o.height !== Math.round(h * dpr)) {
      o.width = Math.round(w * dpr);
      o.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.lineJoin = 'round';
    const stroke = (pts: readonly Pt[]): void => {
      g.beginPath();
      pts.forEach((p, i) => {
        const s = worldToScreen(cam, p.x, p.y, w, h);
        if (i === 0) g.moveTo(s.x, s.y);
        else g.lineTo(s.x, s.y);
      });
      g.closePath();
      g.stroke();
    };
    for (const v of voicesRef.current) {
      if (v.id === selectedRef.current) {
        // The selected circuit: a white outline under its colour.
        g.setLineDash([]);
        g.strokeStyle = '#fff';
        g.lineWidth = 8;
        stroke(v.points);
      }
      g.strokeStyle = rgb(MODE_COLORS[v.mode], v.on ? 1 : 0.3);
      g.lineWidth = 3.5;
      g.setLineDash(v.play === 'loop' ? [9, 6] : []);
      stroke(v.points);
    }
    const hv = hoverRef.current;
    if (hv) {
      g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 1.5;
      stroke(hv.points);
    }
  }, [world]);

  const redraw = useCallback((): void => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      draw();
    });
  }, [draw]);

  useEffect(redraw, [voices, selected, hover, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = createCanvas2dRenderer(canvas, family, Infinity);
    rendererRef.current = r;
    if (r && world) r.setChords(world.table);
    cullRef.current = world ? cutCuller(world.cut) : null;
    camRef.current = { cx: 0, cy: 0, scale: reelDefaults(family).scale };
    redraw();
    return () => {
      r?.dispose();
      rendererRef.current = null;
    };
  }, [family, world, redraw]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!host || !canvas || !overlay) return;
    const ro = new ResizeObserver(() => {
      sizeRef.current = { w: host.clientWidth, h: host.clientHeight };
      for (const c of [canvas, overlay]) {
        c.style.width = `${host.clientWidth}px`;
        c.style.height = `${host.clientHeight}px`;
      }
      redraw();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      camRef.current = zoomAt(camRef.current, e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015), rect.width, rect.height);
      redraw();
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
  }, [redraw]);

  const pick = (e: React.PointerEvent): Preview | null => {
    if (!findStrand) return null;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cam = camRef.current;
    const c = findStrand(screenToWorld(cam, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height), PICK_PX / cam.scale);
    return c && c.closed ? { key: c.key, points: c.points } : null;
  };
  const dragRef = useRef<{ x: number; y: number; moved: number } | null>(null);
  const hoverFrame = useRef(0);
  const onPointerDown = (e: React.PointerEvent): void => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (!d) {
      if (hoverFrame.current) return;
      const ev = { clientX: e.clientX, clientY: e.clientY, currentTarget: e.currentTarget } as React.PointerEvent;
      hoverFrame.current = requestAnimationFrame(() => {
        hoverFrame.current = 0;
        const c = pick(ev);
        setHover((h) => (h?.key === c?.key ? h : c));
      });
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.moved >= CLICK_PX) {
      camRef.current = panBy(camRef.current, dx, dy);
      redraw();
    }
  };
  const onPointerUp = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved >= CLICK_PX) return;
    const c = pick(e);
    if (c) onPaint(c, e.shiftKey);
  };

  const changeFamily = (f: TileFamilyId): void => {
    pendingCircuit.current = null;
    const d = reelDefaults(f);
    setFamily(f);
    setSubset(d.subset);
    setMatching(comboToMatchingIndices(f, d.subset, d.combo));
  };
  const setRule = (f: TileFamilyId, nextSubset: readonly number[], nextMatching: readonly number[]): void => {
    if (f !== family) return changeFamily(f);
    pendingCircuit.current = null;
    setSubset(nextSubset);
    setMatching(normalizeMatchingVector(f, nextSubset, nextMatching));
  };

  // --- brush ----------------------------------------------------------------------
  const setSetting = <M extends Mapping>(m: M, patch: Partial<Settings[M]>): void =>
    setBrush((b) => ({ ...b, settings: { ...b.settings, [m]: { ...b.settings[m], ...patch } } }));
  const sel = voices.find((v) => v.id === selected) ?? null;

  useEffect(() => {
    if (combo === null) return;
    const hash = encodeHash({ family, subset, combo, circuit: sel ? { key: sel.key, steps: sel.points.length } : null, brush });
    window.history.replaceState(null, '', `#${hash}`);
  }, [family, subset, combo, sel, brush]);

  /** The selected circuit as a card, and the file name it goes by. */
  const cardOf = (v: Voice): { src: CardSource; name: string } => {
    const shape = shapeOf(v);
    const { main, pen } = clipsOf(v);
    const s = v.settings;
    const sp = s.spectrum;
    const k = (n: number): string => (n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : `${Math.round(n)}`);
    const penPart = !sp.pen ? '' : sp.penRate > 0 ? `-pen-ramp${k(sp.penRate)}-${k(sp.penMax)}${sp.penFrom > 0 ? `-from${k(sp.penFrom)}` : ''}` : `-pen${k(sp.penSpeed)}`;
    const params =
      v.mode === 'spectrum'
        ? `${Math.round(sp.f0)}hz-k${sp.terms}${penPart}`
        : v.mode === 'radius'
          ? `${Math.round(s.radius.f0)}hz-r${s.radius.range}`
          : `t${Number(s.corners.tolerance.toPrecision(2))}-${noteName(s.corners.root)}`;
    const edges = subset.some((e) => e > 9) ? subset.join(',') : subset.join('');
    return {
      src: { shape, mapping: v.mode, play: v.play, settings: s, fit: fitCorners(shape, s.corners.tolerance), main, pen, penLevel: s.spectrum.pen ? s.spectrum.penLevel : 0, reverb: REVERB[v.mode] },
      name: [family, edges, combo, v.points.length, v.mode, ...(v.play === 'constant' ? ['constant'] : []), params].join('-'),
    };
  };
  const cardRef = useRef(cardOf);
  cardRef.current = cardOf;
  const selRef = useRef(sel);
  selRef.current = sel;

  // The hook export_card.py drives: the selected circuit's card, frame by frame and its sound.
  useEffect(() => {
    let painter: { sig: string; p: CardPainter } | null = null;
    const current = (opts: CardOptions = {}): { src: CardSource; name: string; sig: string } => {
      const v = selRef.current;
      if (!v) throw new Error('no circuit selected');
      return { ...cardRef.current(v), sig: mainSig(v) + penSig(v) + JSON.stringify(v.settings.spectrum) + JSON.stringify(opts) };
    };
    (window as unknown as { __shapesoundCard?: unknown }).__shapesoundCard = {
      ready: () => !!selRef.current,
      info: (opts: CardOptions = {}) => {
        const c = current(opts);
        return { ...cardInfo(c.src, opts), name: c.name, hash: window.location.hash };
      },
      frame: (t: number, opts: CardOptions = {}) => {
        const c = current(opts);
        if (!painter || painter.sig !== c.sig) painter = { sig: c.sig, p: cardPainter(c.src, opts) };
        painter.p.draw(t);
        return painter.p.canvas.toDataURL('image/png');
      },
      audio: async (opts: CardOptions = {}) => {
        const a = await cardAudio(current(opts).src, opts);
        const inter = new Float32Array(2 * a.left.length);
        for (let i = 0; i < a.left.length; i++) {
          inter[2 * i] = a.left[i];
          inter[2 * i + 1] = a.right[i];
        }
        const bytes = new Uint8Array(inter.buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return { sr: a.sr, data: btoa(bin) };
      },
    };
  }, []);

  const [exporting, setExporting] = useState(false);
  const exportCard = async (): Promise<void> => {
    if (!sel) return;
    setExporting(true);
    try {
      const { src, name } = cardOf(sel);
      const blob = await recordCard(src);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } finally {
      setExporting(false);
    }
  };
  const preview = hover ?? sel ?? clicked;
  const pShape = preview ? shapeOf(preview) : null;
  const tol = brush.settings.corners.tolerance;
  const fit = useMemo(() => (pShape ? fitCorners(pShape, tol) : null), [pShape, tol]);
  const clock = useRef(performance.now() / 1000);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  /** The preview's place in the lap: a painted copy's if it plays the brush's lap, else a clock of its own. */
  const time = useCallback((): number | null => {
    const b = brushRef.current;
    const p = previewRef.current;
    if (!p || b.play === 'constant') return null;
    const v = voicesRef.current.find((x) => x.key === p.key && x.play === 'loop' && mainSig(x) === mainSig({ ...b, key: p.key }));
    const t = v ? mixerRef.current.playback(v.id).t : null;
    return t ?? (performance.now() / 1000 - clock.current) % clipSeconds(b.mode, b.settings);
  }, []);

  const sp = brush.settings.spectrum;
  const ra = brush.settings.radius;
  const co = brush.settings.corners;
  const loop = brush.play === 'loop';

  return (
    <article className="sound-page shapesound-page">
      <header>
        <h1>Shape sound</h1>
      </header>
      <div className="sound-controls">
        <label className="sound-choice">
          <span>Family</span>
          <select aria-label="Tile family" value={family} onChange={(e) => changeFamily(e.target.value as TileFamilyId)}>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {FAMILY_DISPLAY_NAMES[f]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ComboBar family={family} subset={subset} matching={matching} nonCrossingOnly tiles={false} onChange={(next) => setRule(next.family, next.subset, next.matching)} />

      <div className="shapesound-main">
        <div className="shapesound-left">
          <div
            ref={hostRef}
            className="sound-stage shapesound-map"
            data-testid="shapesound-map"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setHover(null)}
          >
            <canvas ref={canvasRef} />
            <canvas ref={overlayRef} className="shapesound-overlay" />
            {loaded.error ? <p className="sound-error">{loaded.error}</p> : null}
          </div>

          <div className="sound-buttons">
            <button type="button" disabled={!voices.length} onClick={() => voices.forEach((v) => mixerRef.current.start(v.id, true))}>
              Play all
            </button>
            <button type="button" disabled={!voices.length} onClick={() => mixerRef.current.stopAll()}>
              Stop all
            </button>
            <button type="button" disabled={!voices.length} onClick={clearAll}>
              Clear
            </button>
            <span className="sound-value shapesound-count">{voices.length} / 16</span>
          </div>
          <ul className="shapesound-voices" data-testid="shapesound-voices">
            {voices.map((v, i) => (
              <li key={v.id} className={v.id === selected ? 'is-selected' : undefined} onClick={() => select(v)}>
                <span className={`shapesound-swatch is-${v.play}`} style={{ borderColor: rgb(MODE_COLORS[v.mode]) }} />
                <span className="shapesound-voice-name">
                  {v.points.length} · {MODE_LABELS[v.mode]} · {PLAY_LABELS[v.play].toLowerCase()}
                </span>
                <label className="sound-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Voice ${i + 1} on`}
                    checked={v.on}
                    onChange={(e) => setVoices((vs) => vs.map((x) => (x.id === v.id ? { ...x, on: e.target.checked } : x)))}
                  />
                  On
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={v.level}
                  aria-label={`Voice ${i + 1} level`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setVoices((vs) => vs.map((x) => (x.id === v.id ? { ...x, level: Number(e.target.value) } : x)))}
                />
                <button
                  type="button"
                  aria-label={`Remove voice ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dropVoice(v.id);
                    setVoices((vs) => vs.filter((x) => x.id !== v.id));
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="sound-panel shapesound-panel" data-testid="shapesound-brush">
          <Segmented label="Mode" options={MAPPINGS} names={MODE_LABELS} value={brush.mode} onChange={(mode) => setBrush((b) => ({ ...b, mode }))} />
          <Segmented label="Play" options={PLAYS} names={PLAY_LABELS} value={brush.play} onChange={(play) => setBrush((b) => ({ ...b, play }))} />
          {pShape && fit ? (
            <ShapeView shape={pShape} mapping={brush.mode} play={brush.play} settings={brush.settings} fit={fit} time={time} />
          ) : (
            <div className="shapesound-view shapesound-view-empty" />
          )}
          <div className="sound-buttons">
            <button type="button" disabled={!sel || exporting} onClick={() => void exportCard()}>
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
          <fieldset>
            <legend>{MODE_LABELS[brush.mode]}</legend>
            {brush.mode === 'spectrum' ? (
              <>
                <LogSlider label="Base frequency" min={40} max={400} value={sp.f0} show={`${Math.round(sp.f0)} Hz`} onChange={(f0) => setSetting('spectrum', { f0 })} />
                <Slider label="Terms" min={2} max={48} step={1} value={sp.terms} show={`±${sp.terms}`} onChange={(terms) => setSetting('spectrum', { terms })} />
                <label className="sound-check">
                  <input type="checkbox" aria-label="Pen" checked={sp.pen} onChange={(e) => setSetting('spectrum', { pen: e.target.checked })} />
                  Pen
                </label>
                {sp.pen ? (
                  <>
                    <Slider label="Pen ramp" min={0} max={5000} step={100} value={sp.penRate} show={sp.penRate > 0 ? `${sp.penRate} steps/s²` : 'off'} onChange={(penRate) => setSetting('spectrum', { penRate })} />
                    {sp.penRate > 0 ? (
                      <>
                        <Slider label="Ramp from" min={0} max={40000} step={500} value={sp.penFrom} show={`${sp.penFrom} steps/s`} onChange={(penFrom) => setSetting('spectrum', { penFrom })} />
                        <LogSlider label="Ramp to" min={500} max={40000} value={sp.penMax} show={`${Math.round(sp.penMax)} steps/s`} onChange={(penMax) => setSetting('spectrum', { penMax: Math.round(penMax) })} />
                        <Slider label="Hold" min={0} max={30} step={0.5} value={sp.penHold} show={`${sp.penHold} s`} onChange={(penHold) => setSetting('spectrum', { penHold })} />
                      </>
                    ) : (
                      <LogSlider label="Pen speed" min={500} max={40000} value={sp.penSpeed} show={`${Math.round(sp.penSpeed)} steps/s`} onChange={(penSpeed) => setSetting('spectrum', { penSpeed })} />
                    )}
                    <Slider label="Pen level" min={0} max={1} step={0.01} value={sp.penLevel} show={`${Math.round(sp.penLevel * 100)}%`} onChange={(penLevel) => setSetting('spectrum', { penLevel })} />
                  </>
                ) : null}
              </>
            ) : brush.mode === 'radius' ? (
              <>
                <LogSlider label="Base frequency" min={55} max={880} value={ra.f0} show={`${Math.round(ra.f0)} Hz`} onChange={(f0) => setSetting('radius', { f0 })} />
                <LogSlider label="Pitch range" min={LIMITS.radius.range![0]} max={LIMITS.radius.range![1]} value={ra.range} show={`${Number(ra.range.toPrecision(3))} oct`} onChange={(range) => setSetting('radius', { range })} />
                {loop ? <LogSlider label="Lap" min={LIMITS.radius.lap![0]} max={LIMITS.radius.lap![1]} value={ra.lap} show={`${Number(ra.lap.toPrecision(2))} s`} onChange={(lap) => setSetting('radius', { lap })} /> : null}
              </>
            ) : (
              <>
                <LogSlider
                  label="Threshold"
                  min={0.05}
                  max={50}
                  value={co.tolerance}
                  show={pShape ? `${(cornerEps(pShape, co.tolerance) / pShape.tile).toPrecision(2)} tiles` : `×${co.tolerance.toPrecision(2)}`}
                  onChange={(tolerance) => setSetting('corners', { tolerance })}
                />
                {fit ? (
                  <p className="sound-value shapesound-count" data-testid="shapesound-corners">
                    {fit.cuts.length} corners
                  </p>
                ) : null}
                <Slider label="Root" min={36} max={84} step={1} value={co.root} show={noteName(co.root)} onChange={(root) => setSetting('corners', { root })} />
                {loop ? <LogSlider label="Lap" min={LIMITS.corners.lap![0]} max={LIMITS.corners.lap![1]} value={co.lap} show={`${Number(co.lap.toPrecision(2))} s`} onChange={(lap) => setSetting('corners', { lap })} /> : null}
              </>
            )}
          </fieldset>
        </aside>
      </div>
    </article>
  );
}

export default ShapeSoundPage;
