import { BASE_BRANCH, BRANCH_CONTEXT_NO_CHANGES, ChangedFilesStyle, NOT_GIT_REPO_MESSAGE } from '../constants';
import { execAsync } from '../utils/functions/exec-async';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { Event } from '../vscode/vscode-types';
import { createLogger } from './logger';

const logger = createLogger('GitHelper');

type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: Event<GitRepository>;
};

export type GitRepository = {
  state: {
    HEAD?: { name?: string };
  };
  onDidCheckout: Event<void>;
};

type GitExtension = {
  getAPI: (version: number) => GitAPI;
};

type ChangedFilesSummary = {
  added: number;
  modified: number;
  deleted: number;
};

type ChangedFilesResult = {
  content: string;
  summary: string;
  sectionMetadata?: Record<string, unknown>;
};

type TreeNode = {
  name: string;
  children?: Map<string, TreeNode>;
};

export class Git {
  static readonly COMMANDS = {
    DIFF_BASE_BRANCH_NAME_STATUS: `git diff ${BASE_BRANCH}...HEAD --name-status`,
    DIFF_BASE_BRANCH_NAME_ONLY: `git diff ${BASE_BRANCH}...HEAD --name-only`,
    DIFF_BASE_BRANCH_NUMSTAT: `git diff ${BASE_BRANCH}...HEAD --numstat`,
    DIFF_CACHED_NAME_STATUS: 'git diff --cached --name-status',
    DIFF_CACHED_NAME_ONLY: 'git diff --cached --name-only',
    DIFF_CACHED_NUMSTAT: 'git diff --cached --numstat',
    DIFF_NAME_STATUS: 'git diff --name-status',
    DIFF_NAME_ONLY: 'git diff --name-only',
    DIFF_NUMSTAT: 'git diff --numstat',
    REV_PARSE_HEAD: 'git rev-parse HEAD',
    LOG_LAST_COMMIT_MESSAGE: 'git log -1 --pretty=%B',
  } as const;

  static readonly INTEGRATION = {
    EXTENSION_ID: 'vscode.git',
    API_VERSION: 1,
    HEAD_FILE_PATH: '.git/HEAD',
  } as const;

  static async execCommand(workspace: string, args: string[]): Promise<string> {
    const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd: workspace });
    return stdout.trim();
  }

  static async getCurrentBranch(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  static async setSkipWorktree(workspace: string, filePath: string, skip: boolean) {
    const flag = skip ? '--skip-worktree' : '--no-skip-worktree';
    await Git.execCommand(workspace, ['update-index', flag, filePath]);
  }

  static async isRepository(workspace: string): Promise<boolean> {
    try {
      await Git.execCommand(workspace, ['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  static async restoreFile(workspace: string, filePath: string) {
    await Git.execCommand(workspace, ['checkout', '--', filePath]);
  }

  static async fileExistsInGit(workspace: string, filePath: string): Promise<boolean> {
    try {
      await Git.execCommand(workspace, ['ls-files', '--error-unmatch', filePath]);
      return true;
    } catch {
      return false;
    }
  }

  static async getAPI(): Promise<GitAPI | null> {
    const gitExtension = VscodeHelper.getExtension<GitExtension>(Git.INTEGRATION.EXTENSION_ID);
    if (!gitExtension) {
      return null;
    }
    if (!gitExtension.isActive) {
      await gitExtension.activate();
    }
    return gitExtension.exports.getAPI(Git.INTEGRATION.API_VERSION);
  }

  static formatChangedFilesSummary(summary: ChangedFilesSummary | null): string {
    if (!summary) return BRANCH_CONTEXT_NO_CHANGES;

    const parts: string[] = [];
    if (summary.added > 0) parts.push(`${summary.added}A`);
    if (summary.modified > 0) parts.push(`${summary.modified}M`);
    if (summary.deleted > 0) parts.push(`${summary.deleted}D`);

    return parts.length > 0 ? parts.join(', ') : BRANCH_CONTEXT_NO_CHANGES;
  }

  private static computeSummaryFromStatusMap(statusMap: Map<string, string>): ChangedFilesSummary {
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

  static async getChangedFilesWithSummary(
    workspacePath: string,
    style: ChangedFilesStyle,
  ): Promise<ChangedFilesResult> {
    if (style === ChangedFilesStyle.Tree) {
      const content = await Git.getChangedFilesTreeFormat(workspacePath);
      const summary = await Git.getChangedFilesSummaryFromGit(workspacePath);
      const sectionMetadata = summary
        ? { filesCount: summary.added + summary.modified + summary.deleted, ...summary }
        : { filesCount: 0, added: 0, modified: 0, deleted: 0 };
      return {
        content,
        summary: Git.formatChangedFilesSummary(summary),
        sectionMetadata: content !== BRANCH_CONTEXT_NO_CHANGES ? sectionMetadata : undefined,
      };
    }
    return Git.getChangedFilesListFormatWithSummary(workspacePath);
  }

  private static async getChangedFilesSummaryFromGit(workspacePath: string): Promise<ChangedFilesSummary | null> {
    try {
      const commands = [
        Git.COMMANDS.DIFF_BASE_BRANCH_NAME_STATUS,
        Git.COMMANDS.DIFF_CACHED_NAME_STATUS,
        Git.COMMANDS.DIFF_NAME_STATUS,
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

      return Git.computeSummaryFromStatusMap(statusMap);
    } catch {
      return null;
    }
  }

  static async getChangedFilesTree(workspacePath: string, style: ChangedFilesStyle): Promise<string> {
    logger.info(`[getChangedFilesTree] Called with workspace: ${workspacePath}, style: ${style}`);

    if (style === ChangedFilesStyle.Tree) {
      return Git.getChangedFilesTreeFormat(workspacePath);
    }
    return Git.getChangedFilesListFormat(workspacePath);
  }

  private static async getChangedFilesTreeFormat(workspacePath: string): Promise<string> {
    try {
      const commands = [
        Git.COMMANDS.DIFF_BASE_BRANCH_NAME_ONLY,
        Git.COMMANDS.DIFF_CACHED_NAME_ONLY,
        Git.COMMANDS.DIFF_NAME_ONLY,
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

      const tree = Git.buildFileTree(Array.from(allFiles));
      return tree;
    } catch {
      return NOT_GIT_REPO_MESSAGE;
    }
  }

  private static async getChangedFilesListFormat(workspacePath: string): Promise<string> {
    logger.info(`[getChangedFilesListFormat] Starting git commands for workspace: ${workspacePath}`);

    try {
      const commands = [
        { status: Git.COMMANDS.DIFF_BASE_BRANCH_NAME_STATUS, num: Git.COMMANDS.DIFF_BASE_BRANCH_NUMSTAT },
        { status: Git.COMMANDS.DIFF_CACHED_NAME_STATUS, num: Git.COMMANDS.DIFF_CACHED_NUMSTAT },
        { status: Git.COMMANDS.DIFF_NAME_STATUS, num: Git.COMMANDS.DIFF_NUMSTAT },
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[getChangedFilesListFormat] Error executing git commands: ${message}`);
      return NOT_GIT_REPO_MESSAGE;
    }
  }

  private static async getChangedFilesListFormatWithSummary(workspacePath: string): Promise<ChangedFilesResult> {
    try {
      const commands = [
        { status: Git.COMMANDS.DIFF_BASE_BRANCH_NAME_STATUS, num: Git.COMMANDS.DIFF_BASE_BRANCH_NUMSTAT },
        { status: Git.COMMANDS.DIFF_CACHED_NAME_STATUS, num: Git.COMMANDS.DIFF_CACHED_NUMSTAT },
        { status: Git.COMMANDS.DIFF_NAME_STATUS, num: Git.COMMANDS.DIFF_NUMSTAT },
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
        return {
          content: BRANCH_CONTEXT_NO_CHANGES,
          summary: BRANCH_CONTEXT_NO_CHANGES,
          sectionMetadata: {
            filesCount: 0,
            added: 0,
            modified: 0,
            deleted: 0,
            isEmpty: true,
            description: 'No changes',
          },
        };
      }

      const summary = Git.computeSummaryFromStatusMap(statusMap);

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

      const formattedSummary = Git.formatChangedFilesSummary(summary);
      const sectionMetadata = {
        filesCount: statusMap.size,
        added: summary.added,
        modified: summary.modified,
        deleted: summary.deleted,
        summary: formattedSummary,
        isEmpty: statusMap.size === 0,
        description: formattedSummary,
      };

      return {
        content: lines.join('\n'),
        summary: Git.formatChangedFilesSummary(summary),
        sectionMetadata,
      };
    } catch {
      return { content: NOT_GIT_REPO_MESSAGE, summary: BRANCH_CONTEXT_NO_CHANGES };
    }
  }

  private static buildFileTree(files: string[]): string {
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

    return Git.renderTree(root, '', true);
  }

  private static renderTree(node: TreeNode, prefix: string, isRoot: boolean): string {
    if (isRoot) {
      if (!node.children || node.children.size === 0) return '';

      const lines: string[] = ['.'];
      const entries = Array.from(node.children.entries());

      entries.forEach(([, child], index) => {
        const isLast = index === entries.length - 1;
        lines.push(...Git.renderNode(child, '', isLast));
      });

      return lines.join('\n');
    }

    return Git.renderNode(node, prefix, false).join('\n');
  }

  private static renderNode(node: TreeNode, prefix: string, isLast: boolean): string[] {
    const lines: string[] = [];
    const connector = isLast ? '└── ' : '├── ';
    const newPrefix = prefix + (isLast ? '    ' : '│   ');

    lines.push(prefix + connector + node.name);

    if (node.children && node.children.size > 0) {
      const entries = Array.from(node.children.entries());
      entries.forEach(([, child], index) => {
        const childIsLast = index === entries.length - 1;
        lines.push(...Git.renderNode(child, newPrefix, childIsLast));
      });
    }

    return lines;
  }
}
