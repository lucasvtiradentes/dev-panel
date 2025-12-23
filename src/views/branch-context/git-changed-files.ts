import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { BASE_BRANCH } from '../../common/constants';

const execAsync = promisify(exec);

export async function getChangedFilesTree(workspacePath: string): Promise<string> {
  try {
    const { stdout: changedFiles } = await execAsync(`git diff ${BASE_BRANCH}...HEAD --name-only`, {
      cwd: workspacePath,
    });

    const allFiles = new Set<string>();

    const addFiles = (output: string) => {
      output
        .trim()
        .split('\n')
        .filter((f) => f)
        .forEach((f) => allFiles.add(f));
    };

    addFiles(changedFiles);

    if (allFiles.size === 0) {
      return 'No changes';
    }

    const tree = buildFileTree(Array.from(allFiles));
    return tree;
  } catch {
    return 'Not a git repository';
  }
}

type TreeNode = {
  name: string;
  children?: Map<string, TreeNode>;
};

function buildFileTree(files: string[]): string {
  const root: TreeNode = { name: '.', children: new Map() };

  for (const file of files.sort()) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children) {
        current.children = new Map();
      }

      if (!current.children.has(part)) {
        current.children.set(part, { name: part });
      }

      const next = current.children.get(part);
      if (!next) continue;
      current = next;
    }
  }

  return renderTree(root, '', true);
}

function renderTree(node: TreeNode, prefix: string, isRoot: boolean): string {
  if (isRoot) {
    if (!node.children || node.children.size === 0) return '';

    const lines: string[] = ['.'];
    const entries = Array.from(node.children.entries());

    entries.forEach(([, child], index) => {
      const isLast = index === entries.length - 1;
      lines.push(...renderNode(child, '', isLast));
    });

    return lines.join('\n');
  }

  return renderNode(node, prefix, false).join('\n');
}

function renderNode(node: TreeNode, prefix: string, isLast: boolean): string[] {
  const lines: string[] = [];
  const connector = isLast ? '└── ' : '├── ';
  const newPrefix = prefix + (isLast ? '    ' : '│   ');

  lines.push(prefix + connector + node.name);

  if (node.children && node.children.size > 0) {
    const entries = Array.from(node.children.entries());
    entries.forEach(([, child], index) => {
      const childIsLast = index === entries.length - 1;
      lines.push(...renderNode(child, newPrefix, childIsLast));
    });
  }

  return lines;
}
