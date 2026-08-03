/**
 * Beat 9 — "the eight answers": one card per kernel member, the same patch
 * drawn under each rule.
 *
 * The cards are also the group table: pick any two and the gallery names their
 * symmetric difference and lights the card it lands on. Every pair lands on a
 * card, because XOR-ing two all-even patterns can only make another all-even
 * pattern — that is what makes these eight a group, (ℤ/2)³.
 */

import { useMemo, useState } from 'react';
import {
  KERNEL_MASKS,
  NEVER_INVITED,
  edgesOf,
  explorerHref,
  maskDigits,
  maskLabel,
  xorMask,
} from './presets';
import { PatchFigure } from './PatchFigure';

function badgesFor(mask: number): readonly string[] {
  const out: string[] = [];
  if (mask === 0) out.push('the coward’s answer');
  if ((mask >> 7) & 1) out.push('7 = Mystic seam');
  if (NEVER_INVITED.every((m) => !((mask >> m) & 1)) && edgesOf(mask).length === 8) {
    out.push('everything except 4');
  }
  return out;
}

export function KernelGallery(): JSX.Element {
  const [picked, setPicked] = useState<readonly number[]>([]);

  const result = useMemo(
    () => (picked.length === 2 ? xorMask(picked[0], picked[1]) : null),
    [picked],
  );

  const toggle = (mask: number): void =>
    setPicked((prev) => {
      if (prev.includes(mask)) return prev.filter((m) => m !== mask);
      if (prev.length >= 2) return [mask];
      return [...prev, mask];
    });

  return (
    <div className="tails-gallery">
      <p className="tails-note" role="status">
        {result === null
          ? 'Pick two cards to combine them: keep everything that is in exactly one of the two.'
          : `${maskLabel(picked[0])} ⊕ ${maskLabel(picked[1])} = ${maskLabel(result)} — also on the list. Always.`}
      </p>

      <div className="tails-gallery-grid">
        {KERNEL_MASKS.map((mask) => {
          const edges = edgesOf(mask);
          const isPicked = picked.includes(mask);
          const isResult = result === mask && !isPicked;
          return (
            <article
              key={mask}
              className={[
                'tails-card',
                isPicked ? 'is-picked' : '',
                isResult ? 'is-result' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-mask={mask}
              data-rule={maskDigits(mask)}
            >
              <header>
                <button
                  type="button"
                  className="tails-card-title"
                  aria-pressed={isPicked}
                  onClick={() => toggle(mask)}
                  title="Pick this rule to combine it with another"
                >
                  {maskLabel(mask)}
                </button>
                {badgesFor(mask).map((b) => (
                  <span key={b} className="tails-card-badge">
                    {b}
                  </span>
                ))}
              </header>

              <PatchFigure
                idPrefix={`tails-kernel-${mask}`}
                level={2}
                subset={edges}
                showDots={edges.length > 0}
                showLines={edges.length > 0}
                markOddTiles={false}
                tailEndMarkers={false}
                showOutlines={false}
                strokeWidth={0.16}
                height={190}
                ariaLabel={`Level 2 patch under rule ${maskDigits(mask)}`}
              />

              <footer>
                {edges.length === 0 ? (
                  <span className="muted">nothing drawn, nobody sad</span>
                ) : (
                  <a href={explorerHref(edges, { level: 3 })}>Open in the Explorer</a>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default KernelGallery;
