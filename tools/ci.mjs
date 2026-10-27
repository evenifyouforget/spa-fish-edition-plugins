// tools/ci.mjs — check, test and pack every plugin against the game (tools/game.mjs), as CI does.
//
//   node tools/ci.mjs              all plugins: generated files current, check --strict, tests/<id>/, pack
//   node tools/ci.mjs fish-untimed only the plugins named
//   node tools/ci.mjs --no-pack    skip packing
//
// Each plugin folder is copied into the game's plugins/ (the game's tools refuse linked folders), so the checkout's
// own plugins/ is overwritten for these ids. Packed zips land in dist/ with SHA256SUMS, ready for a release.

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, GAME_VERSION, ensureGame } from './game.mjs';
import { generate } from './gen.mjs';
import { testPlugin } from './test.mjs';

const args = process.argv.slice(2);
const pack = !args.includes('--no-pack');
const all = fs.readdirSync(path.join(ROOT, 'plugins'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, 'plugins', d.name, 'plugin.json'))).map((d) => d.name).sort();
const named = args.filter((a) => !a.startsWith('--'));
for (const id of named) if (!all.includes(id)) throw new Error(`no plugin ${id}`);
const ids = named.length ? named : all;

const game = ensureGame();
const plugin = (...a) => execFileSync(process.execPath, ['tools/plugin.mjs', ...a], { cwd: game, stdio: 'inherit' });

console.log(`# game ${GAME_VERSION} at ${game}`);
const stale = generate(game, { check: true });
if (stale.length) {
  console.error(`generated files are out of date for this game version (run node tools/gen.mjs): ${stale.join(', ')}`);
  process.exit(1);
}

for (const id of ids) {
  const dest = path.join(game, 'plugins', id);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'plugins', id), dest, { recursive: true });
}

console.log(`# check --strict: ${ids.join(' ')}`);
plugin('check', ...ids, '--strict');

for (const id of ids) {
  console.log(`# test ${id}`);
  if (await testPlugin(game, id)) process.exit(1);
}

if (pack) {
  const dist = path.join(ROOT, 'dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist);
  const sums = [];
  for (const id of ids) {
    const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins', id, 'plugin.json'), 'utf8'));
    plugin('pack', id, '--zip');
    const name = `${id}-${version}.zip`;
    const zip = path.join(game, 'plugins', '_dist', name);
    fs.copyFileSync(zip, path.join(dist, name));
    sums.push(`${crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')}  ${name}`);
  }
  fs.writeFileSync(path.join(dist, 'SHA256SUMS'), sums.join('\n') + '\n');
  console.log(`# packed into dist/:\n${sums.join('\n')}`);
}
