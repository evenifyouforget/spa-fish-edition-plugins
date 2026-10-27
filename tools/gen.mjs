// tools/gen.mjs — write the plugin data files that are computed from the game's data, so they follow the game version.
//
//   node tools/gen.mjs           rewrite them from the game checkout (tools/game.mjs)
//   node tools/gen.mjs --check   only report the ones that differ (CI)
//
// A data patch can only set values, not compute them, so "double every Strategy's LP" is one `set` per record, read
// from the data of GAME_VERSION. When the game version moves, run this and commit what changed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, ensureGame } from './game.mjs';

const readData = (game, name) => JSON.parse(fs.readFileSync(path.join(game, 'data', `${name}.json`), 'utf8'));
/** A patch file, one operation per line (short diffs when the game's numbers move). */
const patch = (ops) => `{\n  "patch": 1,\n  "ops": [\n${ops.map((o) => `    ${JSON.stringify(o)}`).join(',\n')}\n  ]\n}\n`;

/** fish-double-lp: every Strategy's starting LP (bands totalHp) and the fallback (economy.defaultStartLp) × 2. */
function doubleLp(game) {
  const bands = readData(game, 'bands');
  const config = readData(game, 'config');
  const ops = [{ op: 'set', file: 'config', path: ['economy', 'defaultStartLp'], value: config.economy.defaultStartLp * 2 }];
  for (const id of Object.keys(bands).sort()) {
    const hp = bands[id].totalHp;
    if (Number.isInteger(hp) && hp > 0) ops.push({ op: 'set', file: 'bands', id, path: ['totalHp'], value: hp * 2 });
  }
  return patch(ops);
}

/** fish-untimed: every round that has a prep countdown gets none (prepTime 0 = untimed, GameData.prepTime). */
function untimed(game) {
  const config = readData(game, 'config');
  const ops = [];
  for (const modeId of Object.keys(config.modes).sort()) {
    const rounds = config.modes[modeId].rounds || {};
    for (const r of Object.keys(rounds).sort((a, b) => a - b)) {
      if (typeof rounds[r].prepTime === 'number' && rounds[r].prepTime > 0) {
        ops.push({ op: 'set', file: 'config', path: ['modes', modeId, 'rounds', r, 'prepTime'], value: 0 });
      }
    }
  }
  return patch(ops);
}

const FILES = {
  'plugins/fish-double-lp/data/lp.json': doubleLp,
  'plugins/fish-untimed/data/prep.json': untimed,
};

/** Write (or, with check, only compare) every generated file. Returns the ones that were or would be changed. */
export function generate(game, { check = false } = {}) {
  const changed = [];
  for (const [rel, make] of Object.entries(FILES)) {
    const file = path.join(ROOT, rel);
    const body = make(game);
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === body) continue;
    changed.push(rel);
    if (!check) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }
  }
  return changed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const changed = generate(ensureGame(), { check });
  if (check && changed.length) { console.error(`out of date: ${changed.join(', ')}`); process.exit(1); }
  console.log(changed.length ? `${check ? 'out of date' : 'wrote'}: ${changed.join(', ')}` : 'generated files are current');
}
