// WOK & WONDER: NIGHT MARKET RUSH — the hand-in program.
// Copies the playable game (game/) and its screenshots (screenshots/) into
// the output directory and writes dossier.json there with the vendored
// make.fun library, exactly as the bounty requires. The game itself is the
// static files under game/; this program only packages them, it is never
// loaded by the browser.
//
// Run it the way the grader does, with MAKEFUN_OUTPUT_DIR standing in for
// /output outside the grader:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts` (http://localhost:8124).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier caps mirror the gate's own limits (at most 4 screenshots of
// 256 KiB each, at most 993 files and 48 MiB under game/, paths at most
// 1000 bytes), so a dossier this program writes is one the gate accepts.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
