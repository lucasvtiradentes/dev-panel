import { execSync } from 'node:child_process';

const CONSTANTS = {
  ENCODING: 'utf-8' as const,
  TREE_MAX_DEPTH: 3,
  SHELL: '/bin/bash' as const,
};

type PluginContext = {
  workspacePath: string;
};

type Metadata = {
  filesCount?: number;
  dirsCount?: number;
  isEmpty: boolean;
  description: string;
};

function getPluginContext(): PluginContext {
  return JSON.parse(process.env.PLUGIN_CONTEXT ?? '{}');
}

function outputWithMetadata(content: string, metadata: Metadata) {
  console.log(`${content}\n`);
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
}

function getChangedFiles(workspacePath: string): string[] {
  try {
    const result = execSync('git diff --name-only HEAD~1 2>/dev/null || git diff --name-only', {
      encoding: CONSTANTS.ENCODING,
      cwd: workspacePath,
    }).trim();

    return result ? result.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getUniqueDirectories(files: string[]): string[] {
  const dirs = files.map((file) => file.split('/').slice(0, -1).join('/')).filter(Boolean);
  return [...new Set(dirs)];
}

function generateTreeOutput(dirs: string[], files: string[], workspacePath: string): string {
  if (dirs.length === 0) {
    return files.join('\n');
  }

  const treeArgs = dirs.map((dir) => `"${dir}"`).join(' ');
  const fallback = files.join('\\n');

  try {
    const result = execSync(
      `tree -L ${CONSTANTS.TREE_MAX_DEPTH} --noreport ${treeArgs} 2>/dev/null || echo "${fallback}"`,
      {
        encoding: CONSTANTS.ENCODING,
        cwd: workspacePath,
        shell: CONSTANTS.SHELL,
      },
    );

    return result.trim();
  } catch {
    return files.join('\n');
  }
}

function main() {
  const context = getPluginContext();
  const workspacePath = context.workspacePath;

  const files = getChangedFiles(workspacePath);

  if (files.length === 0) {
    outputWithMetadata('No changed files', { filesCount: 0, dirsCount: 0, isEmpty: true, description: 'No changes' });
    process.exit(0);
  }

  const dirs = getUniqueDirectories(files);
  const filesCount = files.length;
  const dirsCount = dirs.length;
  const description = `${filesCount} files in ${dirsCount} dirs`;
  const metadata: Metadata = { filesCount, dirsCount, isEmpty: false, description };

  const treeOutput = generateTreeOutput(dirs, files, workspacePath);
  outputWithMetadata(treeOutput, metadata);
}

main();
