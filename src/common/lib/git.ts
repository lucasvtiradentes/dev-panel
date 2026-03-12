import { BASE_BRANCH, NOT_GIT_REPO_MESSAGE } from '../constants';

const NO_CHANGES = 'No changes';
import { GitFileStatus } from '../constants/enums';
import { execAsync } from '../utils/functions/exec-async';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { Event } from '../vscode/vscode-types';

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

type GitRepository = {
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

  static async getFileContent(workspace: string, filePath: string): Promise<string> {
    return Git.execCommand(workspace, ['show', `HEAD:${filePath}`]);
  }

  static async diff(options: {
    workspace: string;
    type: 'base' | 'cached' | 'working';
    format: 'name-status' | 'name-only' | 'numstat';
    baseBranch?: string;
  }): Promise<string> {
    const { workspace, type, format, baseBranch } = options;
    const args = ['diff'];

    if (type === 'base' && baseBranch) {
      args.push(`${baseBranch}...HEAD`);
    } else if (type === 'cached') {
      args.push('--cached');
    }

    args.push(`--${format}`);
    return Git.execCommand(workspace, args);
  }

  static async diffBaseBranchNameStatus(workspace: string, baseBranch: string): Promise<string> {
    return Git.diff({ workspace, type: 'base', format: 'name-status', baseBranch });
  }

  static async diffBaseBranchNameOnly(workspace: string, baseBranch: string): Promise<string> {
    return Git.diff({ workspace, type: 'base', format: 'name-only', baseBranch });
  }

  static async diffBaseBranchNumstat(workspace: string, baseBranch: string): Promise<string> {
    return Git.diff({ workspace, type: 'base', format: 'numstat', baseBranch });
  }

  static async diffCachedNameStatus(workspace: string): Promise<string> {
    return Git.diff({ workspace, type: 'cached', format: 'name-status' });
  }

  static async diffCachedNameOnly(workspace: string): Promise<string> {
    return Git.diff({ workspace, type: 'cached', format: 'name-only' });
  }

  static async diffCachedNumstat(workspace: string): Promise<string> {
    return Git.diff({ workspace, type: 'cached', format: 'numstat' });
  }

  static async diffNameStatus(workspace: string): Promise<string> {
    return Git.diff({ workspace, type: 'working', format: 'name-status' });
  }

  static async diffNameOnly(workspace: string): Promise<string> {
    return Git.diff({ workspace, type: 'working', format: 'name-only' });
  }

  static async diffNumstat(workspace: string): Promise<string> {
    return Git.diff({ workspace, type: 'working', format: 'numstat' });
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
    if (!gitExtension.exports) {
      return null;
    }
    return gitExtension.exports.getAPI(Git.INTEGRATION.API_VERSION);
  }

  static formatChangedFilesSummary(summary: ChangedFilesSummary | null): string {
    if (!summary) return NO_CHANGES;

    const parts: string[] = [];
    if (summary.added > 0) parts.push(`${summary.added}A`);
    if (summary.modified > 0) parts.push(`${summary.modified}M`);
    if (summary.deleted > 0) parts.push(`${summary.deleted}D`);
    if (summary.renamed > 0) parts.push(`${summary.renamed}R`);

    return parts.length > 0 ? parts.join(', ') : NO_CHANGES;
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

  private static async getChangedFilesListFormat(
    workspacePath: string,
    baseBranch: string = BASE_BRANCH,
  ): Promise<string> {
    const result = await Git.getChangedFilesListFormatWithSummary(workspacePath, baseBranch);
    return result.content;
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
          content: NO_CHANGES,
          summary: NO_CHANGES,
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
      return { content: NOT_GIT_REPO_MESSAGE, summary: NO_CHANGES };
    }
  }
}
