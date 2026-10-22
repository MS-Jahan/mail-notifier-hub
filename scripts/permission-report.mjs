// Prints the permissions requested by the built extensions as Markdown (shown in the CI job summary).
import { readFileSync } from 'node:fs';
for (const target of ['chrome', 'firefox']) {
  const m = JSON.parse(readFileSync(`dist/${target}/manifest.json`, 'utf8'));
  console.log(`### ${target}\n- version: \`${m.version}\`\n- permissions: ${m.permissions.map((p) => `\`${p}\``).join(', ')}\n- host permissions (${(m.host_permissions || []).length}): ${(m.host_permissions || []).map((h) => `\`${h}\``).join(', ') || 'none'}\n- optional host permissions: ${(m.optional_host_permissions || []).length}\n`);
}
