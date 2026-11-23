// Gate: verify docs discipline.
// - R1: replaced ledgers (TODO/RECORD/DECISION/ROADMAP) must NOT exist.
// - R2: required docs must exist.
// Exit code: 0 pass / 1 fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FORBIDDEN = [
  'docs/TODO.md',
  'docs/RECORD.md',
  'docs/DECISION.md',
  'docs/ROADMAP.md',
];

const REQUIRED = [
  'AGENT.md',
  'CODEBUDDY.md',
  'README.md',
  'docs/README.md',
  'docs/AGENT.md',
  'app/AGENT.md',
  'plugin/AGENT.md',
  'docs/design/01-requirements-analysis.md',
  'docs/design/02-architecture.md',
  'docs/design/03-contracts.md',
  'docs/design/04-agent-collaboration.md',
  'docs/design/05-github-collaboration.md',
  'docs/plan/plan-project-init-2026-11-23.md',
  'docs/open-questions.md',
];

let failed = false;

for (const f of FORBIDDEN) {
  if (fs.existsSync(path.join(root, f))) {
    console.error(`[R1] forbidden file present (replaced by GitHub): ${f}`);
    failed = true;
  }
}

for (const f of REQUIRED) {
  if (!fs.existsSync(path.join(root, f))) {
    console.error(`[R2] required file missing: ${f}`);
    failed = true;
  }
}

if (failed) {
  console.error('check-docs: FAIL');
  process.exit(1);
}
console.log('check-docs: PASS');
