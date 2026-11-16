// main.ts — VIGIL // FOUNDRY entrypoint (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ beside this file to /output
// and writes /output/dossier.json with the vendored make.fun library, exactly
// as the kit's starter does. No network, no install step, no generated code:
// the game is plain static files the browser loads as ES modules.
// Run locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve locally: node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, from the kit: dossier text 163,840 bytes, at most 4
// screenshots of at most 256 KiB, game/ at most 993 entries / 48 MiB.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function treeSize(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) { files++; walk(p); }
      else if (entry.isFile()) { files++; bytes += statSync(p).size; }
    }
  };
  walk(dir);
  return { files, bytes };
}

mkdirSync(out, { recursive: true });

// game/ goes over whole; screenshots/ beside it when present.
const gameDir = join(here, 'game');
if (!existsSync(gameDir)) fail('game/ is missing beside main.ts');
const before = treeSize(gameDir);
if (before.files > CAPS.game_max_files) fail(`game/ holds ${before.files} entries, over the ${CAPS.game_max_files} cap`);
if (before.bytes > CAPS.game_max_bytes) fail(`game/ is ${before.bytes} bytes, over the ${CAPS.game_max_bytes} cap`);
cpSync(gameDir, join(out, 'game'), { recursive: true });

const shotsDir = join(here, 'screenshots');
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
  if (shots.length > CAPS.screenshots.max) fail(`screenshots/ holds ${shots.length} files, over the ${CAPS.screenshots.max} cap`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > CAPS.screenshots.max_bytes) fail(`screenshots/${name} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
  }
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);

// Self-check: the dossier parses, names the game, and stays under its cap.
const parsed = JSON.parse(new TextDecoder().decode(dossier));
if (parsed.schema !== 'makefun/dossier/v1') fail('dossier.json schema mismatch');
const textBytes = new TextEncoder().encode(parsed.text).length;
if (textBytes > CAPS.text_max_bytes) fail(`dossier text is ${textBytes} bytes, over the ${CAPS.text_max_bytes} cap`);
if (parsed.images.length < 3 || parsed.images.length > 4) fail(`dossier holds ${parsed.images.length} screenshots, expected 3 or 4`);
console.log(`VIGIL // FOUNDRY handed in: game/ ${before.files} entries, ${before.bytes} bytes; ` +
  `${parsed.images.length} screenshots; dossier.json ${dossier.length} bytes; text ${textBytes} bytes ` +
  `(cap ${CAPS.text_max_bytes}); cover ${parsed.images[0].name}`);
