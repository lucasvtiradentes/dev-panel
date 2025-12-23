import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { BASE_BRANCH, ChangedFilesStyle } from '../../common/constants';

const execAsync = promisify(exec);

export async function getChangedFilesTree(workspacePath: string, style: ChangedFilesStyle): Promise<string> {
  if (style === ChangedFilesStyle.Tree) {
    return getChangedFilesTreeFormat(workspacePath);
  }
  return getChangedFilesListFormat(workspacePath);
}

async function getChangedFilesTreeFormat(workspacePath: string): Promise<string> {
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

async function getChangedFilesListFormat(workspacePath: string): Promise<string> {
  try {
    const { stdout: nameStatus } = await execAsync(`git diff ${BASE_BRANCH}...HEAD --name-status`, {
      cwd: workspacePath,
    });
    const { stdout: numStat } = await execAsync(`git diff ${BASE_BRANCH}...HEAD --numstat`, {
      cwd: workspacePath,
    });

    if (!nameStatus.trim()) {
      return 'No changes';
    }

    const statusMap = new Map<string, string>();
    nameStatus
      .trim()
      .split('\n')
      .forEach((line) => {
        const [status, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');
        statusMap.set(file, status);
      });

    const statsMap = new Map<string, { added: string; deleted: string }>();
    numStat
      .trim()
      .split('\n')
      .forEach((line) => {
        const [added, deleted, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');
        statsMap.set(file, { added, deleted });
      });

    const lines: string[] = [];
    for (const [file, status] of statusMap.entries()) {
      const stats = statsMap.get(file) || { added: '0', deleted: '0' };
      const statusSymbol = status.charAt(0);
      const padding = ' '.repeat(Math.max(0, 50 - file.length));
      lines.push(`${statusSymbol}  ${file}${padding}(+${stats.added} -${stats.deleted})`);
    }

    return lines.join('\n');
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
