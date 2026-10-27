// tools/game.mjs — the game checkout the plugins are checked, tested and packed against.
//
//   node tools/game.mjs            make .game/ a checkout of GAME_VERSION's tag with its dependencies installed
//   node tools/game.mjs --path     print .game/'s absolute path
//
// SP_GAME_DIR points at an existing checkout instead (a local clone, any version): nothing is cloned or installed.
// The tag comes from the file GAME_VERSION; the repository from GAME_REPO (default: sganggs/Stronghold-Protocol).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAME_VERSION = fs.readFileSync(path.join(ROOT, 'GAME_VERSION'), 'utf8').trim();
const GAME_REPO = process.env.GAME_REPO || 'https://github.com/sganggs/Stronghold-Protocol.git';

/** The game checkout's absolute path. */
export const gameDir = () => path.resolve(process.env.SP_GAME_DIR || path.join(ROOT, '.game'));

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

/** Clone and install the game at GAME_VERSION, unless SP_GAME_DIR names one or .game/ already has that tag. */
export function ensureGame() {
  const dir = gameDir();
  if (process.env.SP_GAME_DIR) {
    if (!fs.existsSync(path.join(dir, 'tools', 'plugin.mjs'))) throw new Error(`SP_GAME_DIR ${dir} is not a game checkout`);
    return dir;
  }
  const stamp = path.join(dir, '.fish-game-version');
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === GAME_VERSION) return dir;
  fs.rmSync(dir, { recursive: true, force: true });
  run('git', ['clone', '--quiet', '--depth', '1', '--branch', GAME_VERSION, GAME_REPO, dir], ROOT);
  // --ignore-scripts: the game's postinstall fetches vendor files the plugin tools don't need
  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--silent'], dir);
  fs.writeFileSync(stamp, GAME_VERSION + '\n');
  return dir;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--path')) console.log(gameDir());
  else console.log(`game ${GAME_VERSION}: ${ensureGame()}`);
}
