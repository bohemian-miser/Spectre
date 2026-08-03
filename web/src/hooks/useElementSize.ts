/**
 * Observed pixel size of a DOM element. Used by the pan/zoom surface to
 * fit-to-bounds and to convert client coordinates.
 */

import { useEffect, useState, type RefObject } from 'react';
import type { Size } from '../lib/viewport';

const ZERO: Size = { width: 0, height: 0 };

export function useElementSize(ref: RefObject<Element | null>): Size {
  const [size, setSize] = useState<Size>(ZERO);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = (): void => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
