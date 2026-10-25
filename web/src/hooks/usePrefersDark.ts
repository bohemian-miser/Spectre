import { useEffect, useState } from 'react';

/** Whether the page is in the dark scheme (the default unless the browser asks for light). */
export function usePrefersDark(): boolean {
  const query = '(prefers-color-scheme: light)';
  const get = () => typeof window === 'undefined' || !window.matchMedia || !window.matchMedia(query).matches;
  const [dark, setDark] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setDark(!mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return dark;
}
