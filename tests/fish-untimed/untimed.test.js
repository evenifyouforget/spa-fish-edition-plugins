import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run, game } from '../game.js';

test('co-op Rest Phases have no countdown and end when every Doctor is ready', run, async () => {
  const { makeMatch } = await game('test/match/harness.js');
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 7, fake: true });
  for (let r = 1; r <= 12; r++) assert.equal(h.m.gd.prepTime(r), null, `round ${r}`);
  h.start();
  for (const r of [1, 2]) {
    // ready: the humans confirm, draft and ready up on the way, but the predicate is checked before they ready here
    assert.ok(h.drive(() => h.m.phase === 'PREP' && h.m.round === r, { ready: true }), `reached R${r} prep`);
    assert.ok(!h.m.deadline, `R${r} prep has no deadline`);
    h.sched.advance(10 * 60 * 1000);
    h.m.flush(true);
    assert.ok(h.m.phase === 'PREP' && h.m.round === r, `R${r} prep still waits for the players after 10 minutes`);
  }
  assert.ok(h.drive(() => h.m.phase !== 'PREP'), 'prep ends once everyone is ready');
  h.invariants();
});
