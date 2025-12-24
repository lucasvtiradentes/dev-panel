const { execSync } = require('node:child_process');

const context = JSON.parse(process.env.PLUGIN_CONTEXT);
const workspacePath = context.workspacePath;

try {
  const changedFiles = execSync('git diff --name-only HEAD~1 2>/dev/null || git diff --name-only', {
    encoding: 'utf-8',
    cwd: workspacePath,
  }).trim();

  if (!changedFiles) {
    const metadata = { filesCount: 0, dirsCount: 0, isEmpty: true, description: 'No changes' };
    console.log('No changed files\n');
    console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
    process.exit(0);
  }

  const files = changedFiles.split('\n').filter(Boolean);
  const filesCount = files.length;
  const dirs = [...new Set(files.map((f) => f.split('/').slice(0, -1).join('/')).filter(Boolean))];
  const dirsCount = dirs.length;

  const description = `${filesCount} files in ${dirsCount} dirs`;
  const metadata = { filesCount, dirsCount, isEmpty: false, description };

  if (dirs.length === 0) {
    console.log(`${files.join('\n')}\n`);
    console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
    process.exit(0);
  }

  const treeArgs = dirs.map((d) => `"${d}"`).join(' ');
  const result = execSync(`tree -L 3 --noreport ${treeArgs} 2>/dev/null || echo "${files.join('\\n')}"`, {
    encoding: 'utf-8',
    cwd: workspacePath,
    shell: '/bin/bash',
  });

  console.log(`${result.trim()}\n`);
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
} catch (error) {
  const metadata = { isEmpty: true, description: 'Error' };
  console.log(`Error: ${error.message}\n`);
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
}
