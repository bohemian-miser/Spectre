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
 * Camera precision: the shader only ever sees `pos` (origin-relative f32)
 * plus a small origin-relative camera offset — never absolute world
 * coordinates (§ "Layout/precision" in the stage-2 scope).
 */

import {
  LEAF_ORDER,
  TILE_NAMES,
  TILE_PALETTES,
  type ViewportCut,
} from '../../core';
import { originRelativeCenter, type MapCamera } from './camera';
import { GLYPH_LEVEL, buildGlyphMeshes, buildLeafMesh, glyphFitForCut } from './glyphs';
import type { MapRenderStats, MapRenderer } from './rendererTypes';

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
  try {
    progLeaf = link(VS_LEAF, FS_COLOR);
    progLine = link(VS_LEAF_LINE, FS_LINE);
    progGlyph = link(VS_GLYPH, FS_COLOR);
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

  const vaoGlyph = G.createVertexArray();
  G.bindVertexArray(vaoGlyph);
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

  // --- uniforms ---------------------------------------------------------------
  const leafPalette = paletteVec(LEAF_ORDER);
  const aggPalette = paletteVec(TILE_NAMES);
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

  const render = (cam: MapCamera, cssW: number, cssH: number, dpr: number): MapRenderStats => {
    const t0 = performance.now();
    let drawCalls = 0;
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
          G.useProgram(progLeaf);
          G.uniform4f(uLeafView, vx, vy, kx, ky);
          G.uniform3fv(uLeafPal, leafPalette);
          G.bindVertexArray(vaoLeaf);
          G.drawElementsInstanced(G.TRIANGLES, leaf.tris.length, G.UNSIGNED_SHORT, 0, count);
          drawCalls++;

          const alpha = outlineAlphaForScale(cam.scale);
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
    };
  };

  return {
    mode: 'webgl2',
    setCut,
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
      if (glyphTex) G.deleteTexture(glyphTex);
      G.deleteProgram(progLeaf);
      G.deleteProgram(progLine);
      G.deleteProgram(progGlyph);
    },
  };
}
