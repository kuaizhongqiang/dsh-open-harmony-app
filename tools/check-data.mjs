// Gate: decision records and requirement questions are well formed.
// - D1: every file under docs/decisions/ matches ADR-NNNN-*.md (case-sensitive).
// - D2: 01-requirements-analysis.md contains the Q1..Q6 open-questions table.
// Exit code: 0 pass / 1 fail. ASCII-only source (PowerShell 5.1 safe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ADR_DIR = 'docs/decisions';
const REQ = 'docs/design/01-requirements-analysis.md';
const ADR_RE = /^ADR-\d{4}-.+\.md$/;

let failed = false;

// Print one rule line plus a one-line fix, exactly like tools/check-docs.mjs.
function report(rule, file, expected, actual, fix) {
  console.error(`[${rule}] ${file}: ${expected} vs ${actual}`);
  console.error(`  Fix: ${fix}`);
  failed = true;
}

// D1: ADR file naming. readdirSync keeps original case on Windows.
const absDir = path.join(root, ADR_DIR);
if (!fs.existsSync(absDir)) {
  report('D1', ADR_DIR, 'directory to exist', 'missing', `Create ${ADR_DIR} and add at least one ADR.`);
} else {
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!ADR_RE.test(name)) {
      report(
        'D1',
        `${ADR_DIR}/${name}`,
        'ADR-NNNN-<slug>.md',
        name,
        `Rename to ADR-NNNN-<slug>.md (uppercase ADR, 4 digits, lowercase .md).`,
      );
    }
  }
}

// D2: Q1..Q6 rows in the requirements analysis table.
const absReq = path.join(root, REQ);
if (!fs.existsSync(absReq)) {
  report('D2', REQ, 'file to exist', 'missing', `Create ${REQ} or restore it from git.`);
} else {
  const text = fs.readFileSync(absReq, 'utf8');
  for (let i = 1; i <= 6; i += 1) {
    const rowRe = new RegExp(`^\\|\\s*Q${i}\\s*\\|`, 'm');
    if (!rowRe.test(text)) {
      report(
        'D2',
        REQ,
        `table row '| Q${i} |'`,
        'missing',
        `Add the Q${i} row to the open-questions table in ${REQ}.`,
      );
    }
  }
}

if (failed) {
  console.error('check-data: FAIL');
  process.exit(1);
}
console.log('check-data: PASS');
