/**
 * Compare: two circuits named in the URL hash, side by side
 * (`compare/CompareView.tsx`). With no hash, a form to name them.
 */

import { useEffect, useState } from 'react';
import { CompareView } from './compare/CompareView';
import { formatRef, hashOf, parseRef, refsFromHash, type CircuitRef } from './compare/refs';
import '../styles/shapes.css';

const EXAMPLE = { a: '023468-140000001:4:303', b: '023468-140000001:6:14679' };

export default function ComparePage(props: { forceSync?: boolean; hash?: string }): JSX.Element {
  const [hash, setHash] = useState(() => props.hash ?? (typeof window === 'undefined' ? '' : window.location.hash));
  const [draft, setDraft] = useState(() => {
    const r = refsFromHash(hash);
    return r ? { a: formatRef(r.a), b: formatRef(r.b) } : EXAMPLE;
  });
  useEffect(() => {
    if (props.hash !== undefined) return;
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [props.hash]);
  const refs = refsFromHash(hash);
  const go = (a: CircuitRef, b: CircuitRef): void => {
    const h = hashOf(a, b);
    if (props.hash === undefined && typeof window !== 'undefined') window.location.hash = h;
    setHash(h);
  };
  const pa = parseRef(draft.a);
  const pb = parseRef(draft.b);
  return (
    <div className="shapes-page compare-page">
      <h1>Compare</h1>
      <p className="shapes-note">
        Two circuits of any combinations of the hexagon rules, each named by its combination, the level it is born at and its length (as the Harmonics page
        lists them), drawn side by side, compared through their Fourier terms and read level by level. The page&apos;s link names both, so it can be sent on.
      </p>
      <form
        className="shapes-controls"
        onSubmit={(e) => {
          e.preventDefault();
          if (pa && pb) go(pa, pb);
        }}
        data-testid="compare-form"
      >
        <label>
          A
          <input value={draft.a} onChange={(e) => setDraft({ ...draft, a: e.target.value })} size={28} data-testid="compare-a" />
        </label>
        <label>
          B
          <input value={draft.b} onChange={(e) => setDraft({ ...draft, b: e.target.value })} size={28} data-testid="compare-b" />
        </label>
        <button type="submit" disabled={!pa || !pb}>
          Compare
        </button>
        <span className="shapes-note">rule-combination:level:length, such as {EXAMPLE.a}</span>
      </form>
      {refs ? <CompareView a={refs.a} b={refs.b} forceSync={props.forceSync} /> : <p className="shapes-note">Name two circuits above.</p>}
    </div>
  );
}
