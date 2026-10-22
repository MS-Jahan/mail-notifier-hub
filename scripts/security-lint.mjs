// Fails CI on patterns that are never acceptable in this extension (see docs/security.md).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PROVIDERS } from '../src/core/registry.js';

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== '_template') walk(p); }
    else if (/\.(js|mjs|html)$/.test(name)) files.push(p);
  }
})('src');

const BANNED = [
  [/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write\b/, 'DOM HTML sink: use textContent / createElement'],
  [/\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]/, 'dynamic code execution'],
  [/<script[^>]*\ssrc=["']https?:/i, 'remote script'],
  [/importScripts\s*\(\s*['"`]https?:/, 'remote script']
];
const allowedHosts = new Set(Object.values(PROVIDERS).flatMap((p) => p.hosts.map((h) => new URL(h.replace('/*', '/')).host)));
const problems = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [re, why] of BANNED) if (re.test(text)) problems.push(`${file}: ${why}`);
  // Every https:// string literal must point at a provider host.
  for (const m of text.matchAll(/['"`](https?:\/\/[^'"`\s${}]+)/g)) {
    const url = m[1];
    if (url.startsWith('http://')) { problems.push(`${file}: insecure URL ${url}`); continue; }
    let host; try { host = new URL(url).host; } catch { continue; }
    if (!allowedHosts.has(host)) problems.push(`${file}: network host ${host} is not a declared provider host (add it to the provider's \`hosts\`)`);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`security-lint: ${files.length} files OK, hosts: ${[...allowedHosts].join(', ')}`);
