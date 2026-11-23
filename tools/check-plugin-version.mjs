// Gate: plugin package name and submodule tag annotations stay consistent.
// - V1: canonical package name 'dsh-harmony' is declared in 02 and 03.
// - V2: canonical submodule tag 'dsh-v0.2.3-alpha.2' is declared in 02.
// - V3: no conflicting package/tag declaration in 02, 03 or README.
// Exit code: 0 pass / 1 fail. ASCII-only source (PowerShell 5.1 safe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ARCH = 'docs/design/02-architecture.md';
const CONTRACT = 'docs/design/03-contracts.md';
const README = 'README.md';
const TARGETS = [ARCH, CONTRACT, README];

const PKG = 'dsh-harmony';
const TAG = 'dsh-v0.2.3-alpha.2';
const LEGACY_PKGS = ['dsh-plugin-mobile', '@xxx/dsh-plugin-mobile'];

let failed = false;

// Print one rule line plus a one-line fix, exactly like tools/check-docs.mjs.
function report(rule, file, expected, actual, fix) {
  console.error(`[${rule}] ${file}: ${expected} vs ${actual}`);
  console.error(`  Fix: ${fix}`);
  failed = true;
}

function read(rel, rule) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    report(rule, rel, 'file to exist', 'missing', `Create ${rel} or restore it from git.`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

const texts = new Map(TARGETS.map((file) => [file, read(file, 'V1')]));

// V1: both design docs must carry the canonical npm package name.
for (const file of [ARCH, CONTRACT]) {
  if (!texts.get(file).includes(PKG)) {
    report(
      'V1',
      file,
      `package name '${PKG}'`,
      'missing',
      `Declare the plugin npm package name ${PKG} in ${file}.`,
    );
  }
}

// V2: the architecture doc anchors the pinned submodule tag.
if (!texts.get(ARCH).includes(TAG)) {
  report(
    'V2',
    ARCH,
    `submodule tag '${TAG}'`,
    'missing',
    `Annotate the pinned vendor/deepseek-harness tag ${TAG} in ${ARCH}.`,
  );
}

// V3: scan all three docs for stale tags, legacy package names and wrong npm declarations.
for (const file of TARGETS) {
  const text = texts.get(file);

  for (const match of text.matchAll(/dsh-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g)) {
    if (match[0] !== TAG) {
      report(
        'V3',
        file,
        TAG,
        match[0],
        `Replace the stale submodule tag with ${TAG} in ${file}.`,
      );
    }
  }

  for (const legacy of LEGACY_PKGS) {
    if (text.includes(legacy)) {
      report('V3', file, PKG, legacy, `Rename '${legacy}' to '${PKG}' in ${file}.`);
    }
  }

  // Only validate an explicit "npm package" / "npm 包名" declaration.
  // Do NOT use a loose /npm.*`x`/ pattern: it false-positives on prose like
  // "npm tarball ... `dshVersion`" (review: false red is a defect).
  for (const match of text.matchAll(/npm (?:package|包名)\s*`([^`]+)`/g)) {
    if (match[1] !== PKG) {
      report(
        'V3',
        file,
        PKG,
        match[1],
        `Use the canonical package name '${PKG}' for the npm declaration in ${file}.`,
      );
    }
  }
}

if (failed) {
  console.error('check-plugin-version: FAIL');
  process.exit(1);
}
console.log('check-plugin-version: PASS');
