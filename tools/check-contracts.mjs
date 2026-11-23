// Gate: the field-level contract doc is complete.
// - C1: headings ## 1 through ## 7 are all present.
// - C2: error codes 400/401/403/404/409/413/429/502/504 are all present in section 5.
// - C3: the WS first-frame auth annotation is present in section 4.
// Exit code: 0 pass / 1 fail. ASCII-only source (PowerShell 5.1 safe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const CONTRACT = 'docs/design/03-contracts.md';
const CODES = ['400', '401', '403', '404', '409', '413', '429', '502', '504'];
// Chinese annotation kept as unicode escapes so the source file stays ASCII-only.
const FIRST_FRAME_AUTH = '\u9996\u5e27\u9274\u6743';

let failed = false;

// Print one rule line plus a one-line fix, exactly like tools/check-docs.mjs.
function report(rule, file, expected, actual, fix) {
  console.error(`[${rule}] ${file}: ${expected} vs ${actual}`);
  console.error(`  Fix: ${fix}`);
  failed = true;
}

// Slice the body of a top-level "## N ..." section, up to the next "## " heading.
function section(text, n) {
  const headingRe = new RegExp(`^##\\s+${n}(?:\\s|$)`, 'm');
  const match = headingRe.exec(text);
  if (!match) return null;
  const rest = text.slice(match.index + match[0].length);
  const next = /^##\s/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

const abs = path.join(root, CONTRACT);
if (!fs.existsSync(abs)) {
  report('C1', CONTRACT, 'file to exist', 'missing', `Create ${CONTRACT} or restore it from git.`);
  console.error('check-contracts: FAIL');
  process.exit(1);
}
const text = fs.readFileSync(abs, 'utf8');

// C1: all seven top-level sections.
for (let n = 1; n <= 7; n += 1) {
  const headingRe = new RegExp(`^##\\s+${n}(?:\\s|$)`, 'm');
  if (!headingRe.test(text)) {
    report(
      'C1',
      CONTRACT,
      `heading '## ${n} ...'`,
      'missing',
      `Add the section '## ${n} <title>' to ${CONTRACT}.`,
    );
  }
}

// C2: error-code table in section 5.
const errors = section(text, 5);
for (const code of CODES) {
  if (!errors || !new RegExp(`\\b${code}\\b`).test(errors)) {
    report(
      'C2',
      CONTRACT,
      `error code ${code} in section 5`,
      'missing',
      `Add the ${code} row to the error-code table in ${CONTRACT} section 5.`,
    );
  }
}

// C3: WebSocket first-frame auth annotation in section 4.
const ws = section(text, 4);
if (!ws || !ws.includes(FIRST_FRAME_AUTH)) {
  report(
    'C3',
    CONTRACT,
    'WS first-frame auth annotation in section 4',
    'missing',
    `State that the client sends the token in the first WS frame (not in the URL) in ${CONTRACT} section 4.`,
  );
}

if (failed) {
  console.error('check-contracts: FAIL');
  process.exit(1);
}
console.log('check-contracts: PASS');
