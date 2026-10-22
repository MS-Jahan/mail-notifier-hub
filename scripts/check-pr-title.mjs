// CI check: a pull request title must be a Conventional Commit, because "Squash and merge" turns it into the commit
// on main and the release version is derived from it. Usage: node scripts/check-pr-title.mjs "<title>"
const TYPES = ['feat', 'fix', 'perf', 'revert', 'docs', 'refactor', 'build', 'ci', 'test', 'chore', 'style'];
const title = process.argv[2] ?? '';
const ok = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9._/-]+\\))?!?: .{3,}$`).test(title);
if (!ok) {
  console.error(`PR title "${title}" is not a Conventional Commit.\nUse: <type>(<scope>): <description>   e.g.  feat(outlook): add Outlook provider\nTypes: ${TYPES.join(', ')}  (see docs/PULL_REQUESTS.md)`);
  process.exit(1);
}
console.log('PR title OK');
