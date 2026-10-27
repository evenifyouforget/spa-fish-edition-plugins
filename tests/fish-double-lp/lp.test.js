import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run, game, vanilla } from '../game.js';

test('every Strategy starts with twice its LP', run, async () => {
  const { makeMatch } = await game('test/match/harness.js');
  const bands = vanilla('bands');
  const h = makeMatch({ mode: 'solo', seed: 5, fake: true });
  for (const [id, band] of Object.entries(bands)) assert.equal(h.m.gd.startLp(id), band.totalHp * 2, id);
  h.start().toPrep(1, { band: 'band_bldsk' });
  assert.equal(h.ps('p_0').lp, bands.band_bldsk.totalHp * 2);
  h.invariants();
});
