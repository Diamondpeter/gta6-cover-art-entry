// Neon Coast Cover Studio — the make.fun program for gta6-cover-art-01 (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop browser loads offline
// (app/index.html and its ES modules, vendored fonts, no library and no network request).
// The program hands it in: it copies app/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader makes must write the same bytes: the copy is a plain
// recursive copy and buildDossier is deterministic over the files it reads, so
// running this program twice over the same tree writes an identical /output.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or
// one over 256 KiB; more than 993 files in app/ or 48 MiB of app files, in all, or a
// path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap,
// its screenshots/ and dossier.json).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** A small pre-flight so a broken tree fails loudly here, not in the grader. */
function checkHandIn() {
  const index = join(here, 'app', 'index.html');
  if (!existsSync(index)) throw new Error('app/index.html is missing');
  if (statSync(index).size > 1024 * 1024) throw new Error('app/index.html is over 1 MiB');
  const shots = existsSync(join(here, 'screenshots'))
    ? readdirSync(join(here, 'screenshots')).filter((n) => !n.startsWith('.'))
    : [];
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    if (statSync(join(here, 'screenshots', name)).size > 262144) {
      throw new Error(`screenshots/${name} is over 256 KiB`);
    }
  }
}

function handIn() {
  checkHandIn();
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_OPTIONS));
  // Read the dossier back so a write failure surfaces here, in this run.
  const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
  if (!dossier || typeof dossier !== 'object') throw new Error('dossier.json did not parse');
  console.log(`handed in ${readdirSync(join(out, 'app')).length} app entries and `
    + `${readdirSync(join(out, 'screenshots')).length} screenshots to ${out}`);
}

handIn();
