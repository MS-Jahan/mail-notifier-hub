// Builds dist/chrome and dist/firefox from src/. No dependencies.
import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = JSON.parse(readFileSync('src/manifest/base.json', 'utf8'));
// The release version is derived from commit messages (scripts/next-version.mjs) and injected here; it is not edited by hand.
const vi = process.argv.indexOf('--version');
if (vi > 0) base.version = process.argv[vi + 1];

// Host permissions come from the providers themselves, so adding a provider needs no manifest edit.
// --optional-hosts: ask for them at run time (when the user enables a provider) instead of at install.
const { PROVIDERS } = await import('./src/core/registry.js');
const hosts = [...new Set(Object.values(PROVIDERS).flatMap((p) => p.hosts))].sort();
if (process.argv.includes('--optional-hosts')) base.optional_host_permissions = hosts; else base.host_permissions = hosts;
const overlays = {
  chrome: {
    background: { service_worker: 'background/index.js', type: 'module' },
    permissions: [...base.permissions, 'offscreen']
  },
  firefox: {
    background: { scripts: ['background/index.js'], type: 'module' },
    browser_specific_settings: { gecko: { id: 'mail-notifier-hub@ms-jahan.github.io', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } } }
  }
};
rmSync('dist', { recursive: true, force: true });
for (const [name, extra] of Object.entries(overlays)) {
  const out = `dist/${name}`;
  mkdirSync(out, { recursive: true });
  cpSync('src', out, { recursive: true, filter: (p) => !p.includes('src/manifest') && !p.includes('_template') && !p.endsWith('STATUS.md') });
  writeFileSync(`${out}/manifest.json`, JSON.stringify({ ...base, ...extra }, null, 2));
}
if (process.argv.includes('--zip')) {
  // Uses Python's zipfile because the `zip` CLI is not always installed.
  const py = 'import sys,zipfile,os\nz=zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED)\nfor r,_,fs in os.walk(sys.argv[1]):\n  for f in sorted(fs):\n    p=os.path.join(r,f); z.write(p,os.path.relpath(p,sys.argv[1]))\nz.close()';
  for (const name of Object.keys(overlays)) {
    const zip = `dist/mail-notifier-hub-${name}-${base.version}.zip`;
    execFileSync('python3', ['-c', py, `dist/${name}`, zip]);
    console.log('wrote', zip);
  }
}
console.log('built dist/chrome and dist/firefox');
