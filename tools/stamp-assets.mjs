#!/usr/bin/env node
// Stamps a content hash onto the stylesheet and script URLs in index.html.
//
// GitHub Pages serves assets with Cache-Control: max-age=600. Without a stamp
// a returning visitor can get freshly deployed HTML paired with a stylesheet
// up to ten minutes old, which renders the new markup with the old rules. The
// hash changes only when the file's bytes change, so the browser refetches
// exactly when it must and keeps caching the rest of the time.
//
// Run from the repo root before committing:
//   node tools/stamp-assets.mjs
//
// Idempotent: if no asset changed, the file is left byte-identical.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = join(root, 'index.html');
const assets = ['assets/css/modernist.css', 'assets/css/site.css', 'assets/js/site.js'];

const before = readFileSync(page, 'utf8');
let html = before;
let missing = false;

// Hash the normalised text, not the raw bytes. With core.autocrlf on, a
// checkout rewrites these files to CRLF while anything that writes them
// directly leaves LF, and hashing the bytes would flip the stamp back and forth
// for identical content. Pages serves the committed blob, which is LF.
const contentHash = (path) =>
  createHash('sha256')
    .update(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex')
    .slice(0, 8);

for (const rel of assets) {
  const hash = contentHash(join(root, rel));
  // the path, with or without a stamp already on it
  const re = new RegExp(rel.replace(/\./g, '\\.') + '(\\?v=[0-9a-f]+)?', 'g');
  let refs = 0;
  html = html.replace(re, () => { refs++; return `${rel}?v=${hash}`; });
  if (refs === 0) { console.error(`  ERROR no reference to ${rel} in index.html`); missing = true; }
  else console.log(`  ${rel}  v=${hash}  (${refs} ref${refs === 1 ? '' : 's'})`);
}

if (missing) process.exit(1);

if (html === before) {
  console.log('already current, index.html untouched');
} else {
  writeFileSync(page, html, 'utf8');
  console.log('index.html updated');
}
