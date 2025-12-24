import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { BASE_BRANCH, BRANCH_CONTEXT_NO_CHANGES, ChangedFilesStyle } from '../../common/constants';
import { createLogger } from '../../common/lib/logger';

const execAsync = promisify(exec);
const logger = createLogger('GitChangedFiles');

export type ChangedFilesSummary = {
  added: number;
  modified: number;
  deleted: number;
};

export type ChangedFilesResult = {
  content: string;
  summary: string;
};

export function formatChangedFilesSummary(summary: ChangedFilesSummary | null): string {
  if (!summary) return BRANCH_CONTEXT_NO_CHANGES;

  const parts: string[] = [];
  if (summary.added > 0) parts.push(`${summary.added}A`);
  if (summary.modified > 0) parts.push(`${summary.modified}M`);
  if (summary.deleted > 0) parts.push(`${summary.deleted}D`);

  return parts.length > 0 ? parts.join(', ') : BRANCH_CONTEXT_NO_CHANGES;
}

function computeSummaryFromStatusMap(statusMap: Map<string, string>): ChangedFilesSummary {
  let added = 0;
  let modified = 0;
  let deleted = 0;

  for (const status of statusMap.values()) {
    if (status === 'A') added++;
    else if (status === 'M') modified++;
    else if (status === 'D') deleted++;
    else if (status === 'R') modified++;
    else if (status === 'C') added++;
  }

  return { added, modified, deleted };
}

export async function getChangedFilesWithSummary(
  workspacePath: string,
  style: ChangedFilesStyle,
): Promise<ChangedFilesResult> {
  if (style === ChangedFilesStyle.Tree) {
    const content = await getChangedFilesTreeFormat(workspacePath);
    const summary = await getChangedFilesSummaryFromGit(workspacePath);
    return { content, summary: formatChangedFilesSummary(summary) };
  }
  return getChangedFilesListFormatWithSummary(workspacePath);
}

async function getChangedFilesSummaryFromGit(workspacePath: string): Promise<ChangedFilesSummary | null> {
  try {
    const commands = [
      `git diff ${BASE_BRANCH}...HEAD --name-status`,
      'git diff --cached --name-status',
      'git diff --name-status',
    ];

    const results = await Promise.all(
      commands.map((cmd) => execAsync(cmd, { cwd: workspacePath }).then((r) => r.stdout)),
    );

    const statusMap = new Map<string, string>();

    for (const output of results) {
      output
        .trim()
        .split('\n')
        .filter((line) => line)
        .forEach((line) => {
          const [status, ...fileParts] = line.split('\t');
          const file = fileParts.join('\t');
          if (file && !statusMap.has(file)) {
            statusMap.set(file, status.charAt(0));
          }
        });
    }

    if (statusMap.size === 0) {
      return null;
    }

    return computeSummaryFromStatusMap(statusMap);
  } catch {
    return null;
  }
}

export async function getChangedFilesTree(workspacePath: string, style: ChangedFilesStyle): Promise<string> {
  logger.info(`[getChangedFilesTree] Called with workspace: ${workspacePath}, style: ${style}`);

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
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const tree = buildFileTree(Array.from(allFiles));
    return tree;
  } catch {
    return 'Not a git repository';
  }
}

async function getChangedFilesListFormat(workspacePath: string): Promise<string> {
  logger.info(`[getChangedFilesListFormat] Starting git commands for workspace: ${workspacePath}`);

  try {
    const commands = [
      { status: `git diff ${BASE_BRANCH}...HEAD --name-status`, num: `git diff ${BASE_BRANCH}...HEAD --numstat` },
      { status: 'git diff --cached --name-status', num: 'git diff --cached --numstat' },
      { status: 'git diff --name-status', num: 'git diff --numstat' },
    ];

    logger.info(`[getChangedFilesListFormat] Executing ${commands.length} git command pairs`);

    const results = await Promise.all(
      commands.map(async ({ status, num }) => {
        const [statusRes, numRes] = await Promise.all([
          execAsync(status, { cwd: workspacePath }),
          execAsync(num, { cwd: workspacePath }),
        ]);
        return { status: statusRes.stdout, num: numRes.stdout };
      }),
    );

    logger.info('[getChangedFilesListFormat] Git commands completed successfully');

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
      logger.info('[getChangedFilesListFormat] No changes detected');
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const sortedFiles = Array.from(statusMap.keys()).sort();
    logger.info(`[getChangedFilesListFormat] Found ${sortedFiles.length} changed files`);

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
  } catch (error) {
    logger.error(`[getChangedFilesListFormat] Error executing git commands: ${error}`);
    return 'Not a git repository';
  }
}

async function getChangedFilesListFormatWithSummary(workspacePath: string): Promise<ChangedFilesResult> {
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
          if (!statusMap.has(file)) {
            statusMap.set(file, st);
          }
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
      return { content: BRANCH_CONTEXT_NO_CHANGES, summary: BRANCH_CONTEXT_NO_CHANGES };
    }

    const summary = computeSummaryFromStatusMap(statusMap);

    const sortedFiles = Array.from(statusMap.keys()).sort();
    const maxFileLength = Math.max(...sortedFiles.map((f) => f.length));

    const lines: string[] = [];
    for (const file of sortedFiles) {
      const status = statusMap.get(file);
      if (!status) continue;
      const stats = statsMap.get(file) ?? { added: '0', deleted: '0' };
      const statusSymbol = status.charAt(0);
      const padding = ' '.repeat(Math.max(0, maxFileLength - file.length + 1));
      lines.push(`${statusSymbol}  ${file}${padding}(+${stats.added} -${stats.deleted})`);
    }

    return { content: lines.join('\n'), summary: formatChangedFilesSummary(summary) };
  } catch {
    return { content: 'Not a git repository', summary: BRANCH_CONTEXT_NO_CHANGES };
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
