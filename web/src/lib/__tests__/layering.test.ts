/**
 * Widget-layer counterpart of `core/__tests__/layering.test.ts`.
 *
 * DESIGN.md §1.2: `components/**` may import `core/` only (plus React and the
 * pure `lib/` view-model helpers added in stage 2). Nothing in the new layer may
 * touch p5 or the old app modules — that is the whole point of the rebuild.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../..', import.meta.url).pathname;
const LAYERS = ['components', 'hooks', 'lib', 'pages', 'workers'];

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function walk(dir: string, out: { file: string; text: string }[] = []): typeof out {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push({ file: full.slice(SRC.length), text: stripComments(readFileSync(full, 'utf8')) });
    }
  }
  return out;
}

const all = LAYERS.flatMap((layer) => walk(join(SRC, layer)));
/** Test files may reach for test-only tooling; production sources may not. */
const sources = all.filter((s) => !s.file.includes('__tests__'));

/** p5 and the old p5-app modules are off limits to everything new. */
const FORBIDDEN =
  /from\s+['"](p5|[^'"]*\/(sketch|ui|state|config|analysis|utils)|\.\.?\/(sketch|ui|state|config|analysis|utils))['"]/;

/** Only `components/` needs the old `tiles.ts`/`analysis.ts` ban spelled out. */
const OLD_APP_ROOT = /from\s+['"]\.\.\/(tiles|analysis|utils|config|state|sketch|ui)['"]/;

describe('widget layering', () => {
  it('finds the widget sources', () => {
    expect(sources.length).toBeGreaterThanOrEqual(20);
    expect(sources.map((s) => s.file)).toContain('components/TileView.tsx');
    expect(sources.map((s) => s.file)).toContain('lib/viewport.ts');
  });

  it('never imports p5 or the old p5-app modules', () => {
    for (const { file, text } of sources) {
      expect(FORBIDDEN.test(text), `${file} imports a p5-era module`).toBe(false);
      expect(OLD_APP_ROOT.test(text), `${file} imports an old root module`).toBe(false);
    }
  });

  it('components/ import only core, lib, hooks and each other', () => {
    for (const { file, text } of sources.filter((s) => s.file.startsWith('components/'))) {
      const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) {
        if (!spec.startsWith('.')) {
          expect(['react', 'react-dom'], `${file} imports ${spec}`).toContain(spec);
          continue;
        }
        expect(
          /(^|\/)(core|lib|hooks|controls)(\/|$)|^\.\/[A-Z]|^\.\.\/[A-Z]/.test(spec),
          `${file} imports ${spec}`,
        ).toBe(true);
      }
    }
  });

  it('lib/ stays React-free so its logic is testable in node', () => {
    for (const { file, text } of sources.filter(
      (s) => s.file.startsWith('lib/') && !s.file.includes('__tests__'),
    )) {
      expect(/from\s+['"]react/.test(text), `${file} imports react`).toBe(false);
      expect(/\bdocument\b|\bwindow\b/.test(text), `${file} touches the DOM`).toBe(false);
    }
  });

  it('only the worker entry touches the worker global scope', () => {
    const workerUsers = sources.filter((s) => /\bself\b/.test(s.text));
    expect(workerUsers.map((s) => s.file)).toEqual(['workers/analysis.worker.ts']);
  });
});
