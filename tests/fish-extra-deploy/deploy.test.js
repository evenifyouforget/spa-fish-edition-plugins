import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run, game, vanilla } from '../game.js';

test('every Doctor deploys 2 more operators', run, async () => {
  const { makeMatch } = await game('test/match/harness.js');
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 3, fake: true }).start().toPrep(1);
  for (const ps of h.m.players.values()) assert.equal(ps.deployCap, vanilla('config').economy.deployCap + 2);
  h.invariants();
});
