// Prints Markdown release notes from Conventional Commit subjects since the last tag.
import { pathToFileURL } from 'node:url';
import { lastTag, commitsSince, levelOf } from './next-version.mjs';

const SECTIONS = [['feat', 'Features'], ['fix', 'Fixes'], ['perf', 'Performance'], ['revert', 'Reverts'], ['docs', 'Documentation'], ['refactor', 'Internal'], ['build', 'Internal'], ['ci', 'Internal'], ['test', 'Internal'], ['chore', 'Internal'], ['style', 'Internal']];
const HEADER = /^(\w+)(?:\(([^)]*)\))?(!)?:\s(.+)$/;

export function notes(messages) {
  const groups = new Map();
  for (const msg of messages) {
    const subject = msg.split('\n')[0];
    const m = HEADER.exec(subject);
    if (!m) continue;
    const title = SECTIONS.find(([t]) => t === m[1])?.[1];
    if (!title) continue;
    const line = `- ${m[2] ? `**${m[2]}:** ` : ''}${m[4]}${m[3] || levelOf(msg) === 'major' ? ' **(breaking)**' : ''}`;
    groups.set(title, [...(groups.get(title) || []), line]);
  }
  return ['Features', 'Fixes', 'Performance', 'Reverts', 'Documentation', 'Internal']
    .filter((t) => groups.has(t)).map((t) => `### ${t}\n${groups.get(t).join('\n')}`).join('\n\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(notes(commitsSince(lastTag())) || 'Maintenance release.');
