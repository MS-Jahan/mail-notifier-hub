// Decides the next release version from Conventional Commit messages since the last `vX.Y.Z` tag.
//   feat            -> minor        fix, perf, revert -> patch        `type!:` or "BREAKING CHANGE" -> major
//   docs, chore, ci, test, refactor, style, build -> no release
// Usage: node scripts/next-version.mjs        prints the next version, or nothing when no release is due.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const RELEASE_TYPES = { feat: 'minor', fix: 'patch', perf: 'patch', revert: 'patch' };
const HEADER = /^(\w+)(\([^)]*\))?(!)?:\s/;

export function levelOf(message) {
  const [subject = '', ...rest] = message.split('\n');
  const m = HEADER.exec(subject);
  if (!m) return null;
  if (m[3] || /^BREAKING[ -]CHANGE:/m.test(rest.join('\n'))) return 'major';
  return RELEASE_TYPES[m[1]] ?? null;
}

const ORDER = ['patch', 'minor', 'major'];
export function nextVersion(last, messages) {
  let level = null;
  for (const msg of messages) {
    const l = levelOf(msg);
    if (l && (!level || ORDER.indexOf(l) > ORDER.indexOf(level))) level = l;
  }
  if (!level) return null;
  const [maj, min, pat] = (last || '0.0.0').replace(/^v/, '').split('.').map(Number);
  if (level === 'major') return maj === 0 ? `0.${min + 1}.0` : `${maj + 1}.0.0`; // 0.x: breaking changes bump the minor
  if (level === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

export function lastTag() {
  try { return git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'); } catch { return ''; }
}
export function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const raw = git('log', '--format=%B%x00', range);
  return raw.split('\0').map((s) => s.trim()).filter(Boolean);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tag = lastTag();
  const v = nextVersion(tag, commitsSince(tag));
  if (v) console.log(v);
}
