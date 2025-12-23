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
    const commands = [
      `git diff ${BASE_BRANCH}...HEAD --name-only`,
      'git diff --cached --name-only',
      'git diff --name-only',
    ];

    const results = await Promise.all(
      commands.map((cmd) => execAsync(cmd, { cwd: workspacePath }).then((r) => r.stdout)),
    );

    const allFiles = new Set<string>();

    const addFiles = (output: string) => {
      output
        .trim()
        .split('\n')
        .filter((f) => f)
        .forEach((f) => allFiles.add(f));
    };

    results.forEach(addFiles);

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
    const commands = [
      { status: `git diff ${BASE_BRANCH}...HEAD --name-status`, num: `git diff ${BASE_BRANCH}...HEAD --numstat` },
      { status: 'git diff --cached --name-status', num: 'git diff --cached --numstat' },
      { status: 'git diff --name-status', num: 'git diff --numstat' },
    ];

    const results = await Promise.all(
      commands.map(async ({ status, num }) => {
        const [statusRes, numRes] = await Promise.all([
          execAsync(status, { cwd: workspacePath }),
          execAsync(num, { cwd: workspacePath }),
        ]);
        return { status: statusRes.stdout, num: numRes.stdout };
      }),
    );

    const statusMap = new Map<string, string>();
    const statsMap = new Map<string, { added: string; deleted: string }>();

    results.forEach(({ status, num }) => {
      status
        .trim()
        .split('\n')
        .filter((line) => line)
        .forEach((line) => {
          const [st, ...fileParts] = line.split('\t');
          const file = fileParts.join('\t');
          statusMap.set(file, st);
        });

      num
        .trim()
        .split('\n')
        .filter((line) => line)
        .forEach((line) => {
          const [added, deleted, ...fileParts] = line.split('\t');
          const file = fileParts.join('\t');
          statsMap.set(file, { added, deleted });
        });
    });

    if (statusMap.size === 0) {
      return 'No changes';
    }

    const sortedFiles = Array.from(statusMap.keys()).sort();

    const maxFileLength = Math.max(...sortedFiles.map((f) => f.length));

    const lines: string[] = [];
    for (const file of sortedFiles) {
      const status = statusMap.get(file);
      if (!status) continue;
      const stats = statsMap.get(file) || { added: '0', deleted: '0' };
      const statusSymbol = status.charAt(0);
      const padding = ' '.repeat(Math.max(0, maxFileLength - file.length + 1));
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
