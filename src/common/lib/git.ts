import { BASE_BRANCH, BRANCH_CONTEXT_NO_CHANGES, ChangedFilesStyle, NOT_GIT_REPO_MESSAGE } from '../constants';
import { GitFileStatus } from '../constants/enums';
import { execAsync } from '../utils/functions/exec-async';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { Event } from '../vscode/vscode-types';
import { createLogger } from './logger';

const logger = createLogger('GitHelper');

type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: Event<GitRepository>;
};

type GitChange = {
  uri: { fsPath: string };
};

type GitRef = {
  type: number;
  name?: string;
  commit?: string;
  remote?: string;
};

type GitBranchQuery = {
  remote?: boolean;
  pattern?: string;
  count?: number;
  contains?: string;
};

export type GitRepository = {
  rootUri: { fsPath: string };
  state: {
    HEAD?: { name?: string };
    workingTreeChanges: GitChange[];
    indexChanges: GitChange[];
    untrackedChanges: GitChange[];
    onDidChange: Event<void>;
  };
  onDidCheckout: Event<void>;
  getBranches: (query: GitBranchQuery) => Promise<GitRef[]>;
};

type GitExtension = {
  getAPI: (version: number) => GitAPI;
};

type ChangedFilesSummary = {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
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
  static readonly INTEGRATION = {
    EXTENSION_ID: 'vscode.git',
    API_VERSION: 1,
    HEAD_FILE_PATH: '.git/HEAD',
  } as const;

  private static async execCommand(workspace: string, args: string[]): Promise<string> {
    const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd: workspace });
    return stdout.trim();
  }

  static async getCurrentBranch(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  static async getRemoteBranches(workspace: string): Promise<string[]> {
    const api = await Git.getAPI();
    if (!api) return [];

    const repository = api.repositories.find((repo) => repo.rootUri.fsPath === workspace);
    if (!repository) return [];

    const refs = await repository.getBranches({ remote: true });
    return refs
      .map((ref) => {
        if (!ref.name) return '';
        if (ref.remote && !ref.name.startsWith(`${ref.remote}/`)) {
          return `${ref.remote}/${ref.name}`;
        }
        return ref.name;
      })
      .filter((name) => name && !name.includes('HEAD'));
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

  static async getLastCommitHash(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['rev-parse', 'HEAD']);
  }

  static async getLastCommitMessage(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['log', '-1', '--pretty=%B']);
  }

  static async fileExistsInGit(workspace: string, filePath: string): Promise<boolean> {
    try {
      await Git.execCommand(workspace, ['ls-files', '--error-unmatch', filePath]);
      return true;
    } catch {
      return false;
    }
  }

  static async diffBaseBranchNameStatus(workspace: string, baseBranch: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', `${baseBranch}...HEAD`, '--name-status']);
  }

  static async diffBaseBranchNameOnly(workspace: string, baseBranch: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', `${baseBranch}...HEAD`, '--name-only']);
  }

  static async diffBaseBranchNumstat(workspace: string, baseBranch: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', `${baseBranch}...HEAD`, '--numstat']);
  }

  static async diffCachedNameStatus(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', '--cached', '--name-status']);
  }

  static async diffCachedNameOnly(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', '--cached', '--name-only']);
  }

  static async diffCachedNumstat(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', '--cached', '--numstat']);
  }

  static async diffNameStatus(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', '--name-status']);
  }

  static async diffNameOnly(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', '--name-only']);
  }

  static async diffNumstat(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['diff', '--numstat']);
  }

  static async getUntrackedFiles(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['ls-files', '--others', '--exclude-standard']);
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
    if (summary.renamed > 0) parts.push(`${summary.renamed}R`);

    return parts.length > 0 ? parts.join(', ') : BRANCH_CONTEXT_NO_CHANGES;
  }

  private static computeSummaryFromStatusMap(statusMap: Map<string, string>): ChangedFilesSummary {
    let added = 0;
    let modified = 0;
    let deleted = 0;
    let renamed = 0;

    for (const status of statusMap.values()) {
      const statusChar = status.charAt(0);
      if (statusChar === GitFileStatus.Added || statusChar === '?') added++;
      else if (statusChar === GitFileStatus.Modified) modified++;
      else if (statusChar === GitFileStatus.Deleted) deleted++;
      else if (statusChar === GitFileStatus.Renamed) renamed++;
      else if (statusChar === GitFileStatus.Copied) added++;
    }

    return { added, modified, deleted, renamed };
  }

  static async getChangedFilesWithSummary(
    workspacePath: string,
    style: ChangedFilesStyle,
    baseBranch: string = BASE_BRANCH,
  ): Promise<ChangedFilesResult> {
    if (style === ChangedFilesStyle.Tree) {
      const content = await Git.getChangedFilesTreeFormat(workspacePath, baseBranch);
      const summary = await Git.getChangedFilesSummaryFromGit(workspacePath, baseBranch);
      const sectionMetadata = summary
        ? { filesCount: summary.added + summary.modified + summary.deleted + summary.renamed, ...summary }
        : { filesCount: 0, added: 0, modified: 0, deleted: 0, renamed: 0 };
      return {
        content,
        summary: Git.formatChangedFilesSummary(summary),
        sectionMetadata: content !== BRANCH_CONTEXT_NO_CHANGES ? sectionMetadata : undefined,
      };
    }
    return Git.getChangedFilesListFormatWithSummary(workspacePath, baseBranch);
  }

  private static async getChangedFilesSummaryFromGit(
    workspacePath: string,
    baseBranch: string = BASE_BRANCH,
  ): Promise<ChangedFilesSummary | null> {
    try {
      const [results, untrackedFiles] = await Promise.all([
        Promise.all([
          Git.diffBaseBranchNameStatus(workspacePath, baseBranch),
          Git.diffCachedNameStatus(workspacePath),
          Git.diffNameStatus(workspacePath),
        ]),
        Git.getUntrackedFiles(workspacePath),
      ]);

      const statusMap = new Map<string, string>();

      for (const output of results) {
        output
          .split('\n')
          .filter((line) => line)
          .forEach((line) => {
            const [status, ...fileParts] = line.split('\t');
            const statusChar = status.charAt(0);
            const file =
              statusChar === GitFileStatus.Renamed && fileParts.length > 1
                ? fileParts[fileParts.length - 1]
                : fileParts.join('\t');
            if (file && !statusMap.has(file)) {
              statusMap.set(file, statusChar);
            }
          });
      }

      untrackedFiles
        .split('\n')
        .filter((f) => f)
        .forEach((file) => {
          if (!statusMap.has(file)) {
            statusMap.set(file, '?');
          }
        });

      if (statusMap.size === 0) {
        return null;
      }

      return Git.computeSummaryFromStatusMap(statusMap);
    } catch {
      return null;
    }
  }

  static async getChangedFilesTree(
    workspacePath: string,
    style: ChangedFilesStyle,
    baseBranch: string = BASE_BRANCH,
  ): Promise<string> {
    logger.info(`[getChangedFilesTree] Called with workspace: ${workspacePath}, style: ${style}`);

    if (style === ChangedFilesStyle.Tree) {
      return Git.getChangedFilesTreeFormat(workspacePath, baseBranch);
    }
    return Git.getChangedFilesListFormat(workspacePath, baseBranch);
  }

  private static async getChangedFilesTreeFormat(
    workspacePath: string,
    baseBranch: string = BASE_BRANCH,
  ): Promise<string> {
    try {
      const results = await Promise.all([
        Git.diffBaseBranchNameOnly(workspacePath, baseBranch),
        Git.diffCachedNameOnly(workspacePath),
        Git.diffNameOnly(workspacePath),
        Git.getUntrackedFiles(workspacePath),
      ]);

      const allFiles = new Set<string>();

      for (const output of results) {
        output
          .split('\n')
          .filter((f) => f)
          .forEach((f) => allFiles.add(f));
      }

      if (allFiles.size === 0) {
        return BRANCH_CONTEXT_NO_CHANGES;
      }

      return Git.buildFileTree(Array.from(allFiles));
    } catch {
      return NOT_GIT_REPO_MESSAGE;
    }
  }

  private static async getChangedFilesListFormat(
    workspacePath: string,
    baseBranch: string = BASE_BRANCH,
  ): Promise<string> {
    logger.info(`[getChangedFilesListFormat] Starting git commands for workspace: ${workspacePath}`);

    try {
      const [results, untrackedFiles] = await Promise.all([
        Promise.all([
          Promise.all([
            Git.diffBaseBranchNameStatus(workspacePath, baseBranch),
            Git.diffBaseBranchNumstat(workspacePath, baseBranch),
          ]),
          Promise.all([Git.diffCachedNameStatus(workspacePath), Git.diffCachedNumstat(workspacePath)]),
          Promise.all([Git.diffNameStatus(workspacePath), Git.diffNumstat(workspacePath)]),
        ]),
        Git.getUntrackedFiles(workspacePath),
      ]);

      logger.info('[getChangedFilesListFormat] Git commands completed successfully');

      const statusMap = new Map<string, string>();
      const statsMap = new Map<string, { added: string; deleted: string }>();

      for (const [status, num] of results) {
        status
          .split('\n')
          .filter((line) => line)
          .forEach((line) => {
            const [st, ...fileParts] = line.split('\t');
            const statusChar = st.charAt(0);
            const file =
              statusChar === GitFileStatus.Renamed && fileParts.length > 1
                ? fileParts[fileParts.length - 1]
                : fileParts.join('\t');
            statusMap.set(file, st);
          });

        num
          .split('\n')
          .filter((line) => line)
          .forEach((line) => {
            const [added, deleted, ...fileParts] = line.split('\t');
            const file = fileParts.length > 1 ? fileParts[fileParts.length - 1] : fileParts.join('\t');
            statsMap.set(file, { added, deleted });
          });
      }

      untrackedFiles
        .split('\n')
        .filter((f) => f)
        .forEach((file) => {
          if (!statusMap.has(file)) {
            statusMap.set(file, '?');
          }
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
        const fileStatus = statusMap.get(file);
        if (!fileStatus) continue;
        const stats = statsMap.get(file) || { added: '0', deleted: '0' };
        const statusSymbol = fileStatus.charAt(0);
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

  private static async getChangedFilesListFormatWithSummary(
    workspacePath: string,
    baseBranch: string = BASE_BRANCH,
  ): Promise<ChangedFilesResult> {
    try {
      const [results, untrackedFiles] = await Promise.all([
        Promise.all([
          Promise.all([
            Git.diffBaseBranchNameStatus(workspacePath, baseBranch),
            Git.diffBaseBranchNumstat(workspacePath, baseBranch),
          ]),
          Promise.all([Git.diffCachedNameStatus(workspacePath), Git.diffCachedNumstat(workspacePath)]),
          Promise.all([Git.diffNameStatus(workspacePath), Git.diffNumstat(workspacePath)]),
        ]),
        Git.getUntrackedFiles(workspacePath),
      ]);

      const statusMap = new Map<string, string>();
      const statsMap = new Map<string, { added: string; deleted: string }>();

      for (const [statusOutput, numOutput] of results) {
        statusOutput
          .split('\n')
          .filter((line) => line)
          .forEach((line) => {
            const [st, ...fileParts] = line.split('\t');
            const statusChar = st.charAt(0);
            const file =
              statusChar === GitFileStatus.Renamed && fileParts.length > 1
                ? fileParts[fileParts.length - 1]
                : fileParts.join('\t');
            if (!statusMap.has(file)) {
              statusMap.set(file, st);
            }
          });

        numOutput
          .split('\n')
          .filter((line) => line)
          .forEach((line) => {
            const [added, deleted, ...fileParts] = line.split('\t');
            const file = fileParts.length > 1 ? fileParts[fileParts.length - 1] : fileParts.join('\t');
            statsMap.set(file, { added, deleted });
          });
      }

      untrackedFiles
        .split('\n')
        .filter((f) => f)
        .forEach((file) => {
          if (!statusMap.has(file)) {
            statusMap.set(file, '?');
          }
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
            renamed: 0,
            isEmpty: true,
            description: 'No changes',
          },
        };
      }

      const computedSummary = Git.computeSummaryFromStatusMap(statusMap);

      const sortedFiles = Array.from(statusMap.keys()).sort();
      const maxFileLength = Math.max(...sortedFiles.map((f) => f.length));

      const lines: string[] = [];
      for (const file of sortedFiles) {
        const fileStatus = statusMap.get(file);
        if (!fileStatus) continue;
        const stats = statsMap.get(file) ?? { added: '0', deleted: '0' };
        const statusSymbol = fileStatus.charAt(0);
        const padding = ' '.repeat(Math.max(0, maxFileLength - file.length + 1));
        lines.push(`${statusSymbol}  ${file}${padding}(+${stats.added} -${stats.deleted})`);
      }

      const formattedSummary = Git.formatChangedFilesSummary(computedSummary);
      const sectionMetadata = {
        filesCount: statusMap.size,
        added: computedSummary.added,
        modified: computedSummary.modified,
        deleted: computedSummary.deleted,
        renamed: computedSummary.renamed,
        summary: formattedSummary,
        isEmpty: statusMap.size === 0,
        description: formattedSummary,
      };

      return {
        content: lines.join('\n'),
        summary: Git.formatChangedFilesSummary(computedSummary),
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
