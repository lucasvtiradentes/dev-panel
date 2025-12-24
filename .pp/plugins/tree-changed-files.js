const { execSync } = require('node:child_process');

const context = JSON.parse(process.env.PLUGIN_CONTEXT);
const workspacePath = context.workspacePath;

try {
  const changedFiles = execSync('git diff --name-only HEAD~1 2>/dev/null || git diff --name-only', {
    encoding: 'utf-8',
    cwd: workspacePath,
  }).trim();

  if (!changedFiles) {
    console.log('No changed files');
    process.exit(0);
  }

  const files = changedFiles.split('\n').filter(Boolean);
  const dirs = [...new Set(files.map((f) => f.split('/').slice(0, -1).join('/')).filter(Boolean))];

  if (dirs.length === 0) {
    console.log(files.join('\n'));
    process.exit(0);
  }

  const treeArgs = dirs.map((d) => `"${d}"`).join(' ');
  const result = execSync(`tree -L 3 --noreport ${treeArgs} 2>/dev/null || echo "${files.join('\\n')}"`, {
    encoding: 'utf-8',
    cwd: workspacePath,
    shell: '/bin/bash',
  });

  console.log(result.trim());
} catch (error) {
  console.log(`Error: ${error.message}`);
}
