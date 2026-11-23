// Gate: license and third-party notice files stay present and consistent.
// - L1: root LICENSE and THIRD-PARTY-NOTICES.md exist.
// - L2: THIRD-PARTY-NOTICES.md lists the known third-party set.
// - L3: root README has a License section linking both files.
// - L4: app/oh-package.json5, app/entry/oh-package.json5 and plugin/package.json
//       declare license "MIT".
// Exit code: 0 pass / 1 fail. ASCII-only source (PowerShell 5.1 safe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let failed = false;

function report(rule, file, expected, actual, fix) {
  console.error(`[${rule}] ${file}: ${expected} vs ${actual}`);
  console.error(`  Fix: ${fix}`);
  failed = true;
}

function read(rel, rule) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    report(rule, rel, 'file to exist', 'missing', `Create ${rel}.`);
    return null;
  }
  return fs.readFileSync(abs, 'utf8');
}

const NOTICE = 'THIRD-PARTY-NOTICES.md';
const README = 'README.md';

// L1: required license files.
const license = read('LICENSE', 'L1');
const notices = read(NOTICE, 'L1');
if (license !== null && !/MIT License/i.test(license)) {
  report('L1', 'LICENSE', 'MIT License text', 'not found', 'Use the MIT license text in root LICENSE.');
}

// L2: known third-party set must be mentioned in the notice file.
const KNOWN = [
  'deepseek-harness',
  'cordis',
  'cosmokit',
  'schemastery',
  '@ohos/hypium',
  '@ohos/hamock',
  'ws',
  'typescript',
];
if (notices !== null) {
  for (const name of KNOWN) {
    if (!notices.includes(name)) {
      report(
        'L2',
        NOTICE,
        `entry for '${name}'`,
        'missing',
        `Add '${name}' (version / license / source URL / copyright) to ${NOTICE}.`,
      );
    }
  }
}

// L3: README license section with links.
const readme = read(README, 'L3');
if (readme !== null) {
  if (!/^##\s+License/im.test(readme)) {
    report('L3', README, "section '## License'", 'missing', `Add a '## License / ...' section to ${README}.`);
  }
  for (const link of ['LICENSE', NOTICE]) {
    if (!readme.includes(link)) {
      report('L3', README, `link to ${link}`, 'missing', `Link ${link} from the License section of ${README}.`);
    }
  }
}

// L4: package manifests declare MIT.
const MANIFESTS = [
  'app/oh-package.json5',
  'app/entry/oh-package.json5',
  'plugin/package.json',
];
for (const rel of MANIFESTS) {
  const text = read(rel, 'L4');
  if (text !== null && !/"license"\s*:\s*"MIT"/.test(text)) {
    report('L4', rel, '"license": "MIT"', 'missing or different', `Set the license field to "MIT" in ${rel}.`);
  }
}

if (failed) {
  console.error('check-licenses: FAIL');
  process.exit(1);
}
console.log('check-licenses: PASS');
