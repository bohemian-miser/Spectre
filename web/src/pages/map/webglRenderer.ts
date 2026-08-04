/**
 * Raw WebGL2 instanced renderer for The Infinite Map — the production form of
 * `web/spike/webgl-instanced.html` (docs/BIGMAP_INVESTIGATION.md §3).
 *
 * One spectre outline geometry (14 verts, ear-clipped once) drawn with
 * `drawElementsInstanced`; per-instance data is the engine's 10-byte wire
 * format uploaded verbatim (pos f32×2 origin-relative, code u8, type u8) and
 * decoded in the vertex shader. Aggregate cuts (cutLevel ≥ 1) draw flavour
 * supertile glyphs instead, vertex-pulled from a small RG32F texture (all
 * nine glyph meshes padded to one length), so ANY mix of flavours is still a
 * single `drawArraysInstanced` call. Per frame: 1 draw call, +1 for the leaf
 * outline pass once zoomed past `OUTLINE_FADE_*` (like the spike's).
 *
 * STRAND LINES (stage 3, part 1) are a third pass built the same way: the
 * ten per-leaf-type chord sets of `chords.ts` live in one RGBA32F table, and
 * the pass is a single `drawArraysInstanced(LINES, 0, vertsPerInstance,
 * count)` — vertex-pulled by `(gl_VertexID, typeByte)`, padding texels pushed
 * outside the clip volume. So the whole frame stays at 1–3 draw calls no
 * matter how many tiles are on screen.
 *
 * The line pass runs ONLY at a leaf cut (`cutLevel === 0`). At an aggregate
 * cut there are no leaf instances on the GPU at all — each instance stands
 * for thousands of tiles — so there is nothing honest to draw a chord on;
 * `MapRenderStats.chordsDrawn` reports 0 and the HUD says lines are hidden.
 *
 * Camera precision: the shader only ever sees `pos` (origin-relative f32)
 * plus a small origin-relative camera offset — never absolute world
 * coordinates (§ "Layout/precision" in the stage-2 scope).
 */

import {
  LEAF_ORDER,
  TILE_NAMES,
  TILE_PALETTES,
  type Rgb,
  type ViewportCut,
} from '../../core';
import { originRelativeCenter, type MapCamera } from './camera';
import type { LeafChordTable } from './chords';
import { GLYPH_LEVEL, buildGlyphMeshes, buildLeafMesh, glyphFitForCut } from './glyphs';
import type { MapRenderStats, MapRenderStyle, MapRenderer } from './rendererTypes';

/** Leaf outlines fade in between these zooms (CSS px per world unit). */
export const OUTLINE_FADE_START = 5;
export const OUTLINE_FADE_END = 14;

export function outlineAlphaForScale(scale: number): number {
  return Math.min(1, Math.max(0, (scale - OUTLINE_FADE_START) / (OUTLINE_FADE_END - OUTLINE_FADE_START)));
}

/**
 * Pure JS mirror of the vertex-shader instance decode — kept next to the
 * GLSL so the packing test can pin them against `instanceAffine` bit for bit.
 */
export function shaderDecodeWorld(
  vx: number,
  vy: number,
  px: number,
  py: number,
  code: number,
): { x: number; y: number } {
  const mirror = Math.floor(code / 16);
  const k = code - mirror * 16;
  const ang = k * 0.5235987755982988;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const x = mirror > 0.5 ? -vx : vx;
  return { x: c * x - s * vy + px, y: s * x + c * vy + py };
}

const DECODE_GLSL = `
  float mir = floor(aCode / 16.0);
  float k = aCode - mir * 16.0;
  float ang = k * 0.5235987755982988;
  float c = cos(ang), s = sin(ang);
  if (mir > 0.5) v.x = -v.x;
  vec2 w = vec2(c * v.x - s * v.y, s * v.x + c * v.y) + aPos;
  gl_Position = vec4((w.x + uView.x) * uView.z, (w.y + uView.y) * uView.w, 0.0, 1.0);
`;

const VS_LEAF = `#version 300 es
layout(location=0) in vec2 aVert;
layout(location=1) in vec2 aPos;
layout(location=2) in float aCode;
layout(location=3) in float aType;
uniform vec4 uView;
uniform vec3 uPalette[10];
out vec3 vColor;
void main() {
  vec2 v = aVert;
${DECODE_GLSL}
  vColor = uPalette[int(aType + 0.5)];
}`;

const VS_LEAF_LINE = `#version 300 es
layout(location=0) in vec2 aVert;
layout(location=1) in vec2 aPos;
layout(location=2) in float aCode;
uniform vec4 uView;
void main() {
  vec2 v = aVert;
${DECODE_GLSL}
}`;

const VS_GLYPH = `#version 300 es
layout(location=1) in vec2 aPos;
layout(location=2) in float aCode;
layout(location=3) in float aType;
uniform sampler2D uGlyphTex;
uniform vec4 uView;
uniform vec4 uFitLin; // row-major linear part a,b,d,e of the level fit
uniform vec2 uFitOff;
uniform vec3 uPalette[9];
out vec3 vColor;
void main() {
  int t = int(aType + 0.5) - 128;
  vec2 g = texelFetch(uGlyphTex, ivec2(gl_VertexID, t), 0).rg;
  vec2 v = vec2(uFitLin.x * g.x + uFitLin.y * g.y + uFitOff.x,
                uFitLin.z * g.x + uFitLin.w * g.y + uFitOff.y);
${DECODE_GLSL}
  vColor = uPalette[t];
}`;

/**
 * Strand-line pass: vertex-pull the tile-local chord endpoints for this
 * (chord, leaf type) from the RGBA32F chord table, then run the SAME instance
 * decode as the fill pass so the chord rides its tile exactly.
 *
 * Chords are drawn as TRIANGLES, not `LINES`, because `gl.lineWidth` above 1
 * is not honoured by core WebGL2 on any mainstream driver — a hairline is all
 * `LINES` can ever give. Each chord is expanded here into a quad: both
 * endpoints are transformed to clip space, converted to pixels, and offset
 * along the segment normal by `uHalfPx`, so thickness is exact in device
 * pixels and independent of zoom (which is what makes it adjustable at all).
 *
 * Six vertices per chord, corners `[A- A+ B- B+]` indexed `0 1 2 / 2 1 3`.
 * A padding texel (`valid == 0`) throws every corner outside the clip volume,
 * discarding both triangles.
 */
const VS_CHORD = `#version 300 es
layout(location=1) in vec2 aPos;
layout(location=2) in float aCode;
layout(location=3) in float aType;
uniform sampler2D uChordTex;
uniform vec4 uView;
uniform vec2 uHalfRes; // device px per NDC unit: (width/2, height/2)
uniform float uHalfPx; // half line width, device px

vec2 decode(vec2 v, float code, vec2 pos) {
  float mir = floor(code / 16.0);
  float k = code - mir * 16.0;
  float ang = k * 0.5235987755982988;
  float c = cos(ang), s = sin(ang);
  if (mir > 0.5) v.x = -v.x;
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y) + pos;
}

void main() {
  int chord = gl_VertexID / 6;
  int corner = gl_VertexID - chord * 6;
  // 0 1 2 / 2 1 3 over corners [A-, A+, B-, B+].
  int idx = corner == 0 ? 0 : corner == 1 ? 1 : corner == 2 ? 2 : corner == 3 ? 2 : corner == 4 ? 1 : 3;
  int t = int(aType + 0.5);

  vec4 ga = texelFetch(uChordTex, ivec2(chord * 2, t), 0);
  vec4 gb = texelFetch(uChordTex, ivec2(chord * 2 + 1, t), 0);
  if (ga.z < 0.5 || gb.z < 0.5) {
    gl_Position = vec4(4.0, 4.0, 0.0, 1.0); // outside NDC ⇒ triangles clipped
    return;
  }

  vec2 wa = decode(ga.xy, aCode, aPos);
  vec2 wb = decode(gb.xy, aCode, aPos);
  vec2 ca = vec2((wa.x + uView.x) * uView.z, (wa.y + uView.y) * uView.w);
  vec2 cb = vec2((wb.x + uView.x) * uView.z, (wb.y + uView.y) * uView.w);

  vec2 pa = ca * uHalfRes;
  vec2 pb = cb * uHalfRes;
  vec2 delta = pb - pa;
  float len = length(delta);
  // A zero-length chord has no direction to offset along; +x keeps it a dot
  // rather than a NaN that would take out the whole triangle.
  vec2 dir = len > 1e-6 ? delta / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);

  vec2 base = (idx < 2) ? pa : pb;
  float side = (idx == 0 || idx == 2) ? -1.0 : 1.0;
  // Extend the ends by the half width so consecutive chords meet squarely
  // instead of leaving a notch at every connection point.
  vec2 cap = ((idx < 2) ? -dir : dir) * uHalfPx;
  vec2 p = base + nrm * (side * uHalfPx) + cap;

  gl_Position = vec4(p / uHalfRes, 0.0, 1.0);
}`;

const FS_COLOR = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 o;
void main() { o = vec4(vColor, 1.0); }`;

const FS_LINE = `#version 300 es
precision mediump float;
uniform vec4 uLine;
out vec4 o;
void main() { o = uLine; }`;

const BG: readonly [number, number, number] = [0.055, 0.066, 0.094];

/**
 * Default strand colour — ONE flat ink, no circuit colouring (that is stage 3
 * part 2). Dark, because every entry of every tile palette is light, so a dark
 * chord reads on all nine flavours; a page that turns fills off (the Explorer,
 * "backgrounds" unchecked) passes {@link LIGHT_LINE_COLOR} instead.
 */
export const DEFAULT_LINE_COLOR: readonly [number, number, number, number] = [
  0.04, 0.05, 0.09, 0.95,
];

/**
 * Strand-line width at scale 1, in CSS px. Slightly over 1 so the default is a
 * touch heavier than the old `LINES` hairline it replaces, which read as thin
 * on HiDPI screens.
 */
export const BASE_LINE_PX = 1.4;

/** Strand colour for dark backgrounds (fills off). */
export const LIGHT_LINE_COLOR: readonly [number, number, number, number] = [
  0.96, 0.98, 1.0, 0.95,
];

function paletteVec(names: readonly string[]): Float32Array {
  const table = TILE_PALETTES.bright;
  const out = new Float32Array(names.length * 3);
  names.forEach((name, i) => {
    const rgb = table[name] ?? [200, 200, 200];
    out[i * 3] = rgb[0] / 255;
    out[i * 3 + 1] = rgb[1] / 255;
    out[i * 3 + 2] = rgb[2] / 255;
  });
  return out;
}

/** Pack an explicit style palette (0..255 per channel) into a GL uniform. */
export function packPalette(colors: readonly Rgb[], slots: number): Float32Array {
  const out = new Float32Array(slots * 3);
  for (let i = 0; i < slots; i++) {
    const rgb = colors[i] ?? [200, 200, 200];
    out[i * 3] = rgb[0] / 255;
    out[i * 3 + 1] = rgb[1] / 255;
    out[i * 3 + 2] = rgb[2] / 255;
  }
  return out;
}

export interface WebGLRendererOptions {
  /** Notified once if the GL context is irrecoverably lost. */
  readonly onContextLost?: () => void;
}

/** Returns null when a WebGL2 context cannot be created. */
export function createWebGLRenderer(
  canvas: HTMLCanvasElement,
  opts: WebGLRendererOptions = {},
): MapRenderer | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    }) as WebGL2RenderingContext | null;
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const G = gl;

  const compile = (type: number, src: string): WebGLShader => {
    const sh = G.createShader(type);
    if (!sh) throw new Error('createShader failed');
    G.shaderSource(sh, src);
    G.compileShader(sh);
    if (!G.getShaderParameter(sh, G.COMPILE_STATUS)) {
      throw new Error(String(G.getShaderInfoLog(sh)));
    }
    return sh;
  };
  const link = (vs: string, fs: string): WebGLProgram => {
    const p = G.createProgram();
    if (!p) throw new Error('createProgram failed');
    G.attachShader(p, compile(G.VERTEX_SHADER, vs));
    G.attachShader(p, compile(G.FRAGMENT_SHADER, fs));
    G.linkProgram(p);
    if (!G.getProgramParameter(p, G.LINK_STATUS)) {
      throw new Error(String(G.getProgramInfoLog(p)));
    }
    return p;
  };

  let progLeaf: WebGLProgram;
  let progLine: WebGLProgram;
  let progGlyph: WebGLProgram;
  let progChord: WebGLProgram;
  try {
    progLeaf = link(VS_LEAF, FS_COLOR);
    progLine = link(VS_LEAF_LINE, FS_LINE);
    progGlyph = link(VS_GLYPH, FS_COLOR);
    progChord = link(VS_CHORD, FS_LINE);
  } catch {
    return null; // context exists but shaders failed — let the caller fall back
  }

  // --- static geometry -----------------------------------------------------
  const leaf = buildLeafMesh();
  const vboVerts = G.createBuffer();
  G.bindBuffer(G.ARRAY_BUFFER, vboVerts);
  G.bufferData(G.ARRAY_BUFFER, leaf.verts, G.STATIC_DRAW);
  const ibo = G.createBuffer();
  G.bindBuffer(G.ELEMENT_ARRAY_BUFFER, ibo);
  G.bufferData(G.ELEMENT_ARRAY_BUFFER, leaf.tris, G.STATIC_DRAW);

  // --- per-instance buffers (re-uploaded per cut) ----------------------------
  const vboPos = G.createBuffer();
  const vboCode = G.createBuffer();
  const vboType = G.createBuffer();

  const bindInstanceAttrs = (withType: boolean): void => {
    G.bindBuffer(G.ARRAY_BUFFER, vboPos);
    G.enableVertexAttribArray(1);
    G.vertexAttribPointer(1, 2, G.FLOAT, false, 0, 0);
    G.vertexAttribDivisor(1, 1);
    G.bindBuffer(G.ARRAY_BUFFER, vboCode);
    G.enableVertexAttribArray(2);
    G.vertexAttribPointer(2, 1, G.UNSIGNED_BYTE, false, 0, 0);
    G.vertexAttribDivisor(2, 1);
    if (withType) {
      G.bindBuffer(G.ARRAY_BUFFER, vboType);
      G.enableVertexAttribArray(3);
      G.vertexAttribPointer(3, 1, G.UNSIGNED_BYTE, false, 0, 0);
      G.vertexAttribDivisor(3, 1);
    }
  };

  const vaoLeaf = G.createVertexArray();
  G.bindVertexArray(vaoLeaf);
  G.bindBuffer(G.ARRAY_BUFFER, vboVerts);
  G.enableVertexAttribArray(0);
  G.vertexAttribPointer(0, 2, G.FLOAT, false, 0, 0);
  bindInstanceAttrs(true);
  G.bindBuffer(G.ELEMENT_ARRAY_BUFFER, ibo);
  G.bindVertexArray(null);

  const vaoLine = G.createVertexArray();
  G.bindVertexArray(vaoLine);
  G.bindBuffer(G.ARRAY_BUFFER, vboVerts);
  G.enableVertexAttribArray(0);
  G.vertexAttribPointer(0, 2, G.FLOAT, false, 0, 0);
  bindInstanceAttrs(false);
  G.bindVertexArray(null);

  // The glyph and chord passes both vertex-pull their geometry from a texture,
  // so they need only the three per-instance attributes (no vertex buffer).
  const vaoGlyph = G.createVertexArray();
  G.bindVertexArray(vaoGlyph);
  bindInstanceAttrs(true);
  G.bindVertexArray(null);

  const vaoChord = G.createVertexArray();
  G.bindVertexArray(vaoChord);
  bindInstanceAttrs(true);
  G.bindVertexArray(null);

  // --- glyph vertex-pull texture (lazy: first aggregate cut) -----------------
  let glyphTex: WebGLTexture | null = null;
  let glyphVertCount = 0;

  const ensureGlyphTexture = (): void => {
    if (glyphTex) return;
    const meshes = buildGlyphMeshes(GLYPH_LEVEL);
    let pad = 0;
    for (const m of meshes) pad = Math.max(pad, m.triVerts.length / 2);
    const data = new Float32Array(pad * 2 * meshes.length);
    meshes.forEach((m, row) => {
      const base = row * pad * 2;
      data.set(m.triVerts, base);
      const lastX = m.triVerts[m.triVerts.length - 2];
      const lastY = m.triVerts[m.triVerts.length - 1];
      for (let v = m.triVerts.length / 2; v < pad; v++) {
        data[base + v * 2] = lastX; // degenerate padding, zero raster area
        data[base + v * 2 + 1] = lastY;
      }
    });
    glyphTex = G.createTexture();
    G.activeTexture(G.TEXTURE0);
    G.bindTexture(G.TEXTURE_2D, glyphTex);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.NEAREST);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.NEAREST);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
    G.texImage2D(G.TEXTURE_2D, 0, G.RG32F, pad, meshes.length, 0, G.RG, G.FLOAT, data);
    glyphVertCount = pad;
  };

  // --- strand chord table (uploaded on demand) -------------------------------
  let chordTex: WebGLTexture | null = null;
  let chordVerts = 0;
  let chordsPerTile = 0;

  const uploadChords = (table: LeafChordTable | null): void => {
    chordVerts = 0;
    chordsPerTile = 0;
    if (!table || table.vertsPerInstance === 0) return;
    if (!chordTex) chordTex = G.createTexture();
    G.activeTexture(G.TEXTURE0);
    G.bindTexture(G.TEXTURE_2D, chordTex);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.NEAREST);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.NEAREST);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
    G.texImage2D(
      G.TEXTURE_2D,
      0,
      G.RGBA32F,
      table.vertsPerInstance,
      table.rows,
      0,
      G.RGBA,
      G.FLOAT,
      table.data,
    );
    chordVerts = table.vertsPerInstance;
    chordsPerTile = table.maxChords;
  };

  // --- uniforms ---------------------------------------------------------------
  const defaultLeafPalette = paletteVec(LEAF_ORDER);
  const defaultAggPalette = paletteVec(TILE_NAMES);
  let leafPalette = defaultLeafPalette;
  let aggPalette = defaultAggPalette;
  let showFills = true;
  let showOutlines = true;
  let lineColor = DEFAULT_LINE_COLOR;
  let lineScale = 1;
  const loc = (p: WebGLProgram, name: string): WebGLUniformLocation | null =>
    G.getUniformLocation(p, name);
  const uLeafView = loc(progLeaf, 'uView');
  const uLeafPal = loc(progLeaf, 'uPalette');
  const uLineView = loc(progLine, 'uView');
  const uLineColor = loc(progLine, 'uLine');
  const uGlyphView = loc(progGlyph, 'uView');
  const uGlyphPal = loc(progGlyph, 'uPalette');
  const uGlyphTexLoc = loc(progGlyph, 'uGlyphTex');
  const uFitLin = loc(progGlyph, 'uFitLin');
  const uFitOff = loc(progGlyph, 'uFitOff');
  const uChordView = loc(progChord, 'uView');
  const uChordColor = loc(progChord, 'uLine');
  const uChordTexLoc = loc(progChord, 'uChordTex');
  const uChordHalfRes = loc(progChord, 'uHalfRes');
  const uChordHalfPx = loc(progChord, 'uHalfPx');

  // --- state ------------------------------------------------------------------
  let count = 0;
  let cutLevel = 0;
  let origin = { x: 0, y: 0 };
  let disposed = false;
  let contextLost = false;

  const onLost = (e: Event): void => {
    e.preventDefault();
    contextLost = true;
    opts.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const setCut = (cut: ViewportCut): void => {
    if (disposed || contextLost) return;
    count = cut.count;
    cutLevel = cut.cutLevel;
    origin = cut.origin;
    G.bindBuffer(G.ARRAY_BUFFER, vboPos);
    G.bufferData(G.ARRAY_BUFFER, cut.pos, G.DYNAMIC_DRAW);
    G.bindBuffer(G.ARRAY_BUFFER, vboCode);
    G.bufferData(G.ARRAY_BUFFER, cut.code, G.DYNAMIC_DRAW);
    G.bindBuffer(G.ARRAY_BUFFER, vboType);
    G.bufferData(G.ARRAY_BUFFER, cut.type, G.DYNAMIC_DRAW);
    if (cutLevel > 0) ensureGlyphTexture();
  };

  const setChords = (table: LeafChordTable | null): void => {
    if (disposed || contextLost) return;
    uploadChords(table);
  };

  const setStyle = (style: MapRenderStyle | null): void => {
    leafPalette = style?.leafColors
      ? packPalette(style.leafColors, LEAF_ORDER.length)
      : defaultLeafPalette;
    aggPalette = style?.aggColors
      ? packPalette(style.aggColors, TILE_NAMES.length)
      : defaultAggPalette;
    showFills = style?.showFills ?? true;
    showOutlines = style?.showOutlines ?? true;
    lineColor = style?.lineColor ?? DEFAULT_LINE_COLOR;
    lineScale = style?.lineScale ?? 1;
  };

  const render = (cam: MapCamera, cssW: number, cssH: number, dpr: number): MapRenderStats => {
    const t0 = performance.now();
    let drawCalls = 0;
    let chordsDrawn = 0;
    if (!disposed && !contextLost) {
      const bw = Math.max(1, Math.round(cssW * dpr));
      const bh = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      G.viewport(0, 0, bw, bh);
      G.disable(G.DEPTH_TEST);
      G.disable(G.BLEND);
      G.clearColor(BG[0], BG[1], BG[2], 1);
      G.clear(G.COLOR_BUFFER_BIT);

      if (count > 0) {
        const off = originRelativeCenter(cam, origin);
        const vx = -off.x;
        const vy = -off.y;
        const kx = (2 * cam.scale * dpr) / bw;
        const ky = (-2 * cam.scale * dpr) / bh;

        if (cutLevel > 0) {
          G.useProgram(progGlyph);
          G.uniform4f(uGlyphView, vx, vy, kx, ky);
          G.uniform3fv(uGlyphPal, aggPalette);
          const fit = glyphFitForCut(cutLevel);
          G.uniform4f(uFitLin, fit[0], fit[1], fit[3], fit[4]);
          G.uniform2f(uFitOff, fit[2], fit[5]);
          G.activeTexture(G.TEXTURE0);
          G.bindTexture(G.TEXTURE_2D, glyphTex);
          G.uniform1i(uGlyphTexLoc, 0);
          G.bindVertexArray(vaoGlyph);
          G.drawArraysInstanced(G.TRIANGLES, 0, glyphVertCount, count);
          drawCalls++;
        } else {
          if (showFills) {
            G.useProgram(progLeaf);
            G.uniform4f(uLeafView, vx, vy, kx, ky);
            G.uniform3fv(uLeafPal, leafPalette);
            G.bindVertexArray(vaoLeaf);
            G.drawElementsInstanced(G.TRIANGLES, leaf.tris.length, G.UNSIGNED_SHORT, 0, count);
            drawCalls++;
          }

          const alpha = showOutlines ? outlineAlphaForScale(cam.scale) : 0;
          if (alpha > 0.02) {
            G.useProgram(progLine);
            G.uniform4f(uLineView, vx, vy, kx, ky);
            G.uniform4f(uLineColor, 0.04, 0.05, 0.08, 0.85 * alpha);
            G.enable(G.BLEND);
            G.blendFunc(G.SRC_ALPHA, G.ONE_MINUS_SRC_ALPHA);
            G.bindVertexArray(vaoLine);
            G.drawArraysInstanced(G.LINE_LOOP, 0, leaf.verts.length / 2, count);
            G.disable(G.BLEND);
            drawCalls++;
          }

          // Strand lines: leaf cuts only (see the module note). One extra
          // instanced call for every chord of every visible tile.
          if (chordVerts > 0 && chordTex) {
            G.useProgram(progChord);
            G.uniform4f(uChordView, vx, vy, kx, ky);
            G.uniform4f(uChordColor, lineColor[0], lineColor[1], lineColor[2], lineColor[3]);
            G.uniform2f(uChordHalfRes, bw / 2, bh / 2);
            // Width is authored in CSS px, so it must be scaled to device px to
            // look the same weight on a HiDPI screen as on a 1x one.
            G.uniform1f(uChordHalfPx, (BASE_LINE_PX * lineScale * dpr) / 2);
            G.activeTexture(G.TEXTURE0);
            G.bindTexture(G.TEXTURE_2D, chordTex);
            G.uniform1i(uChordTexLoc, 0);
            G.enable(G.BLEND);
            G.blendFunc(G.SRC_ALPHA, G.ONE_MINUS_SRC_ALPHA);
            G.bindVertexArray(vaoChord);
            // Six verts per chord (two triangles), not two — see VS_CHORD.
            G.drawArraysInstanced(G.TRIANGLES, 0, chordsPerTile * 6, count);
            G.disable(G.BLEND);
            drawCalls++;
            chordsDrawn = count * chordsPerTile;
          }
        }
        G.bindVertexArray(null);
        G.finish(); // honest HUD timing (the page draws on demand, not in a loop)
      }
    }
    return {
      mode: 'webgl2',
      instances: count,
      drawCalls,
      drawMs: performance.now() - t0,
      capped: false,
      chordsDrawn,
    };
  };

  return {
    mode: 'webgl2',
    setCut,
    setChords,
    setStyle,
    render,
    dispose(): void {
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      G.deleteBuffer(vboVerts);
      G.deleteBuffer(ibo);
      G.deleteBuffer(vboPos);
      G.deleteBuffer(vboCode);
      G.deleteBuffer(vboType);
      G.deleteVertexArray(vaoLeaf);
      G.deleteVertexArray(vaoLine);
      G.deleteVertexArray(vaoGlyph);
      G.deleteVertexArray(vaoChord);
      if (glyphTex) G.deleteTexture(glyphTex);
      if (chordTex) G.deleteTexture(chordTex);
      G.deleteProgram(progLeaf);
      G.deleteProgram(progLine);
      G.deleteProgram(progGlyph);
      G.deleteProgram(progChord);
    },
  };
}
