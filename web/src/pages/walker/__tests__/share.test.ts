/**
 * A shared link brings back the same walk: the link round-trips, and
 * replaying its choices gives the same tree of choices and the same current
 * stage as the walk it was made from.
 */
import { describe, expect, it } from 'vitest';

import { choicesOf, makeWalker, reducePossible, replayChoices, startWalk } from '../possible';
import { decodeLink, encodeLink, type WalkerLink } from '../share';
import { patternOf } from '../walk';

const triangle = patternOf([0, 2, 3, 4, 6, 8], '000100000');

describe('walker links', () => {
  it('round-trip', () => {
    const l: WalkerLink = {
      subset: triangle.subset, matching: triangle.matching, mode: 'landings', start: 'Delta', edge: 4,
      find: { level: 4, id: '0.4.0.1' }, choices: [{ parent: 0, key: 'Phi 5' }, { parent: 1, key: 'open' }, { parent: 1, key: 'closes' }], current: 2, whole: true,
      grows: [], steps: 0,
    };
    expect(decodeLink(encodeLink(l))).toEqual(l);
    const a: WalkerLink = { ...l, mode: 'ancestors', find: null, choices: [], current: 0, whole: false, grows: [{ parent: 'Gamma', slot: 1 }, { parent: 'Delta', slot: 3 }], steps: 40 };
    const back = decodeLink(encodeLink(a))!;
    expect(back.grows).toEqual(a.grows.filter((g) => g.parent === 'Gamma' || g.parent === 'Delta'));
    expect(back.steps).toBe(40);
    expect(decodeLink('r=023468')).toBeNull();
    expect(decodeLink('r=023468&m=0.0&s=Nope&e=9&t=5-Phi5')).toMatchObject({ start: 'Delta', edge: null, choices: [] });
  });

  it('replaying the choices rebuilds the same walk', () => {
    const wk = makeWalker(triangle, 'Delta', 4, 5);
    let pw = reducePossible(startWalk(wk), { type: 'run', cap: 5000 });
    // walk on taking the commonest landing, then go back and take another one at the first fork
    for (let i = 0; i < 4 && pw.stage.status === 'choice'; i++) {
      pw = reducePossible(reducePossible(pw, { type: 'choose', key: pw.stage.pending[0].key }), { type: 'run', cap: 5000 });
    }
    const other = pw.nodes[0].fork!.options[1].key;
    pw = reducePossible(reducePossible(pw, { type: 'chooseAt', id: 0, key: other }), { type: 'run', cap: 5000 });
    const again = replayChoices(startWalk(wk), choicesOf(pw), pw.current);
    expect(choicesOf(again)).toEqual(choicesOf(pw));
    expect(again.current).toBe(pw.current);
    expect(again.stage.seen).toEqual(pw.stage.seen);
    expect(again.stage.worlds.length).toBe(pw.stage.worlds.length);
  });
});
