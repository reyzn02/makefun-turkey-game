// Gobble Dash — the great turkey escape. The entry program (Node 22, standard
// library only): it hands the game in by copying this repository's game/ and
// screenshots/ into the output directory and writing /output/dossier.json, the
// summary the judge reads, using the vendored make.fun dossier library.
//
// Run it locally to check the hand-in before entering:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader's container MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly before copying anything, so a broken hand-in never reaches the
// gate as a silent half-entry: the game must have its entry page, and the
// screenshots folder must hold the 3 or 4 real renders the judge reads.
const index = join(here, 'game', 'index.html');
if (!existsSync(index) || statSync(index).size === 0) throw new Error('game/index.html is missing or empty');
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((name) => !name.startsWith('.')) : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const shot of shots) {
  if (statSync(join(shotDir, shot)).size > 262144) throw new Error(`screenshot ${shot} is over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps the gate enforces, so a hand-in that breaks them fails here first:
// at most 4 screenshots of 256 KiB, at most 993 files and 48 MiB under game/,
// no path under game/ over 1000 bytes, and the dossier's own text at 160 KiB.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`Gobble Dash handed in: ${shots.length} screenshots (${shots.join(', ')}), dossier ${dossier.length} bytes -> ${out}`);
