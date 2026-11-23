// Gate: keep the endpoint tables in architecture and contracts in sync.
// - S1: every endpoint key/path must appear in 02-architecture.md.
// - S2: every endpoint key/path must appear in 03-contracts.md.
// Exit code: 0 pass / 1 fail. ASCII-only source (PowerShell 5.1 safe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ARCH = 'docs/design/02-architecture.md';
const CONTRACT = 'docs/design/03-contracts.md';

// Endpoint keys required by issue #3, mapped to the canonical path fragment.
const ENDPOINTS = [
  { key: 'health', path: '/mobile/health' },
  { key: 'pair', path: '/mobile/pair' },
  { key: 'token', path: '/mobile/token/refresh' },
  { key: 'refresh', path: '/mobile/token/refresh' },
  { key: 'devices', path: '/mobile/devices' },
  { key: 'whitelist', path: '/mobile/whitelist' },
  { key: 'api', path: '/mobile/api' },
  { key: 'ws', path: '/mobile/ws' },
  { key: 'version', path: '/mobile/version' },
];

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

const docs = [
  { file: ARCH, rule: 'S1', text: read(ARCH, 'S1') },
  { file: CONTRACT, rule: 'S2', text: read(CONTRACT, 'S2') },
];

for (const doc of docs) {
  for (const ep of ENDPOINTS) {
    if (!doc.text.includes(ep.path)) {
      report(
        doc.rule,
        doc.file,
        `endpoint '${ep.path}' (${ep.key})`,
        'missing',
        `Add the ${ep.key} endpoint row to the endpoint table in ${doc.file}.`,
      );
    }
  }
}

if (failed) {
  console.error('check-sync: FAIL');
  process.exit(1);
}
console.log('check-sync: PASS');
