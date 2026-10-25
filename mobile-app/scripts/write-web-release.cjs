// Public build provenance; never includes environment variables or credentials.
const { execFileSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
writeFileSync(resolve(__dirname, '../dist/release.json'), JSON.stringify({
  app: 'AI4Impact Student Portal',
  commit: git('rev-parse', 'HEAD'),
  dirty: Boolean(git('status', '--porcelain', '--untracked-files=no')),
  built_at: new Date().toISOString(),
}, null, 2) + '\n');
