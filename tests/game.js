// tests/game.js — what a plugin test needs from the game checkout (SP_GAME_DIR, set by tools/test.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = process.env.SP_GAME_DIR;

/** Skip unless run by tools/test.mjs, which composes the plugin's content set first. */
export const run = process.env.SP_PLUGIN_TEST_SET && dir ? {} : { skip: 'run with node tools/test.mjs <id> (or tools/ci.mjs)' };

/** Import a module of the game, e.g. `game('test/match/harness.js')`. */
export const game = (rel) => import(pathToFileURL(path.join(dir, rel)).href);

/** The game's own data file, without the plugin: what the plugin changes is compared against it. */
export const vanilla = (name) => JSON.parse(fs.readFileSync(path.join(dir, 'data', `${name}.json`), 'utf8'));
