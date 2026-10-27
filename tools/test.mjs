// tools/test.mjs — run tests/<id>/*.test.js with the plugin's content set installed, like the game's
// `node tools/plugin.mjs test <id>`.
//
//   node tools/test.mjs <id> [<id> …]    (the plugin must already be copied into the game's plugins/: tools/ci.mjs)
//
// Why not the game's own command: it runs the plugin folder's test/*.test.js, and a content plugin may not carry .js
// files at all (PLUGIN_FILE_TYPE), so the tests live here, outside the shipped folder. The rest is the same: compose the
// set with the game's registry and builder (script plugins as trusted, the explicit local test being the consent),
// write it to SP_PLUGIN_TEST_SET, and preload the game's server/plugins/scriptTestSetup.js. Tests import the game
// through tests/game.js, which reads SP_GAME_DIR.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOT, ensureGame } from './game.mjs';

/** Compose `id` against the game at `game` and run its tests. Returns the exit status. */
export async function testPlugin(game, id) {
  const tests = path.join(ROOT, 'tests', id);
  const files = fs.existsSync(tests) ? fs.readdirSync(tests).filter((f) => f.endsWith('.test.js')).sort().map((f) => path.join(tests, f)) : [];
  if (!files.length) return 0;
  const from = (rel) => import(pathToFileURL(path.join(game, rel)).href);
  const { createPluginRegistry } = await from('server/plugins/registry.js');
  const { buildContentSet } = await from('server/plugins/contentSet.js');
  const registry = createPluginRegistry({ publicDir: path.join(game, 'public'), dataDir: path.join(game, 'data'),
    packsDir: path.join(game, 'packs'), pluginsDir: path.join(game, 'plugins') });
  const lookup = registry.plugin;
  const testing = { ...registry, plugin: (key) => {
    const p = lookup(key);
    return p ? { ...p, status: 'loaded', ...(p.script ? { script: { ...p.script, execution: 'trusted' } } : {}) } : null;
  } };
  const set = buildContentSet({ registry: testing, ids: [id] });
  if (!set.cs) { console.error(JSON.stringify(set.problems)); return 1; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fish-plugin-test-'));
  try {
    const file = path.join(tmp, 'set.json');
    // The game's preload reads set.scripts unconditionally; a set without script plugins has none (game v0.3.3)
    fs.writeFileSync(file, JSON.stringify({ ...set, scripts: set.scripts ?? [] }));
    const env = { ...process.env, SP_PLUGIN_TEST_SET: file, SP_GAME_DIR: game };
    delete env.NODE_TEST_CONTEXT;
    const setup = pathToFileURL(path.join(game, 'server/plugins/scriptTestSetup.js')).href;
    const r = spawnSync(process.execPath, ['--import', setup, '--test-reporter=spec', '--test', ...files],
      { stdio: 'inherit', env, cwd: game, timeout: 300000 });
    return r.status ?? 1;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const game = ensureGame();
  let status = 0;
  for (const id of process.argv.slice(2)) status = (await testPlugin(game, id)) || status;
  process.exit(status);
}
