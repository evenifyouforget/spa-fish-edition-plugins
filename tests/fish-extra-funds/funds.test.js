import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run, game } from '../game.js';

// A room's match host registers the set's prep DSL and grants it to every player (server/match/host/entry.js); a test
// match does the same by hand. Two matches with the same seed, one with the grant: the Funds differ by 2 per round.
async function fundsByRound(grant) {
  const { makeMatch } = await game('test/match/harness.js');
  const { getDefaultRegistry } = await game('server/match/effectsMeta.js');
  const { registerDslMeta } = await game('server/match/dslMeta.js');
  const { getData } = await game('server/data.js');
  const registry = getDefaultRegistry();
  for (const [pluginId, specs] of Object.entries(getData().dsl)) for (const spec of specs) registerDslMeta(registry, spec, { pluginId });
  const h = makeMatch({ mode: 'solo', seed: 11, fake: true, registry });
  if (grant) for (const ps of h.m.players.values()) ps.effects.push({ id: 'dsl:effect:fish-extra-funds:income', key: 'effect:fish-extra-funds:income', battle: false, hidden: true });
  h.start();
  const funds = [];
  for (const r of [1, 2, 3]) {
    h.drive(() => h.m.phase === 'PREP' && h.m.round === r, { ready: true, band: 'band_bldsk' });
    funds.push(h.ps('p_0').funds);
    h.invariants();
  }
  return funds;
}

test('every Doctor gains 2 more Funds at the start of every round', run, async () => {
  const base = await fundsByRound(false);
  const more = await fundsByRound(true);
  assert.deepEqual(more, base.map((f) => f + 2), `with ${more}, without ${base}`);
});
