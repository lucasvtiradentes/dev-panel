import { execSync } from 'node:child_process';

const ENCODING = 'utf-8' as const;
const BASE_BRANCH = 'origin/main';

type PluginContext = {
  workspacePath: string;
};

type Metadata = {
  filesCount: number;
  dirsCount: number;
  isEmpty: boolean;
  description: string;
};

type TreeNode = {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
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
    const commands = [
      `git diff --name-only ${BASE_BRANCH} 2>/dev/null`,
      'git diff --cached --name-only 2>/dev/null',
      'git diff --name-only 2>/dev/null',
    ];

    const allFiles = new Set<string>();

    for (const cmd of commands) {
      try {
        const result = execSync(cmd, { encoding: ENCODING, cwd: workspacePath }).trim();
        if (result) {
          result
            .split('\n')
            .filter(Boolean)
            .forEach((f) => allFiles.add(f));
        }
      } catch {
        // ignore failed commands
      }
    }

    return Array.from(allFiles).sort();
  } catch {
    return [];
  }
}

function buildTree(files: string[]): TreeNode {
  const root: TreeNode = { name: '.', children: new Map(), isFile: false };

  for (const file of files) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, { name: part, children: new Map(), isFile: isLast });
      }
      current = current.children.get(part)!;
    }
  }

  return root;
}

function renderTree(node: TreeNode, prefix = '', isLast = true, isRoot = true): string[] {
  const lines: string[] = [];

  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${node.name}`);
  }

  const children = Array.from(node.children.values());
  const dirs = children.filter((c) => !c.isFile).sort((a, b) => a.name.localeCompare(b.name));
  const files = children.filter((c) => c.isFile).sort((a, b) => a.name.localeCompare(b.name));
  const sorted = [...dirs, ...files];

  for (let i = 0; i < sorted.length; i++) {
    const child = sorted[i];
    const childIsLast = i === sorted.length - 1;
    const newPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
    lines.push(...renderTree(child, newPrefix, childIsLast, false));
  }

  return lines;
}

function getUniqueDirectories(files: string[]): string[] {
  const dirs = files.map((file) => file.split('/').slice(0, -1).join('/')).filter(Boolean);
  return [...new Set(dirs)];
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

  const tree = buildTree(files);
  const treeOutput = renderTree(tree).join('\n');

  outputWithMetadata(treeOutput, metadata);
}

main();
