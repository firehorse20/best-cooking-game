// Wok Rush — 宵夜档: a night-market cooking game for best-cooking-game-20261125-0137
// (Node 22, standard library only). The game is this directory's game/ folder, plain static
// files a desktop browser loads offline (game/index.html and its ES modules, no library and no
// network request). The program copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. It then verifies the copy: every screenshot in /output must be non-empty and the
// same size as its source, or the program throws instead of handing in a broken entry.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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

// Verify the screenshots actually copied: non-empty and the same size as the source.
for (const name of readdirSync(join(here, 'screenshots'))) {
  const source = statSync(join(here, 'screenshots', name));
  const copied = statSync(join(out, 'screenshots', name));
  if (copied.size === 0 || copied.size !== source.size) {
    throw new Error(`screenshot ${name} did not copy cleanly (${copied.size} of ${source.size} bytes)`);
  }
}

// Confirm the dossier landed on disk as valid JSON and summarise the build.
const dossierPath = join(out, 'dossier.json');
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes === 0) throw new Error('dossier.json is empty');
const dossierText = readFileSync(dossierPath, 'utf8');
const dossier = JSON.parse(dossierText);
if (!Array.isArray(dossier.images) || dossier.images.length !== 4) throw new Error('dossier.json does not carry 4 screenshots');
if (typeof dossier.text !== 'string' || dossier.text.length === 0) throw new Error('dossier.json has no text');
const gameBytes = readdirSync(join(out, 'game'), { recursive: true })
  .filter((name) => statSync(join(out, 'game', name)).isFile())
  .reduce((sum, name) => sum + statSync(join(out, 'game', name)).size, 0);
console.log(`Wok Rush dossier written: ${dossierPath} (${dossierBytes} bytes; game/ ${gameBytes} bytes, ${readdirSync(join(out, 'screenshots')).length} screenshots)`);
