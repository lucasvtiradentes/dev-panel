import { execAsync } from '../utils/functions/exec-async';
import { FileIOHelper, NodePathHelper } from '../utils/helpers/node-helper';

export class Git {
  static readonly INTEGRATION = {
    HEAD_FILE_PATH: '.git/HEAD',
  } as const;

  private static async execCommand(workspace: string, args: string[]): Promise<string> {
    const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd: workspace });
    return stdout.trim();
  }

  private static getExistingCwd(filePath: string): string {
    let cwd =
      FileIOHelper.fileExists(filePath) && FileIOHelper.stat(filePath).isDirectory()
        ? filePath
        : NodePathHelper.dirname(filePath);

    while (!FileIOHelper.fileExists(cwd)) {
      const parent = NodePathHelper.dirname(cwd);
      if (parent === cwd) break;
      cwd = parent;
    }

    return cwd;
  }

  private static async resolveFile(workspace: string, filePath: string): Promise<{ repo: string; path: string }> {
    const absolutePath = NodePathHelper.isAbsolute(filePath) ? filePath : NodePathHelper.resolve(workspace, filePath);
    const cwd = Git.getExistingCwd(absolutePath);

    try {
      const repo = await Git.execCommand(cwd, ['rev-parse', '--show-toplevel']);
      return { repo, path: NodePathHelper.relative(repo, absolutePath) };
    } catch {
      return { repo: workspace, path: filePath };
    }
  }

  static async getCurrentBranch(workspace: string): Promise<string> {
    return Git.execCommand(workspace, ['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  static async setSkipWorktree(workspace: string, filePath: string, skip: boolean) {
    const flag = skip ? '--skip-worktree' : '--no-skip-worktree';
    const resolved = await Git.resolveFile(workspace, filePath);
    await Git.execCommand(resolved.repo, ['update-index', flag, '--', resolved.path]);
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
    const resolved = await Git.resolveFile(workspace, filePath);
    await Git.execCommand(resolved.repo, ['checkout', '--', resolved.path]);
  }

  static async fileExistsInGit(workspace: string, filePath: string): Promise<boolean> {
    try {
      const resolved = await Git.resolveFile(workspace, filePath);
      await Git.execCommand(resolved.repo, ['ls-files', '--error-unmatch', '--', resolved.path]);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileContent(workspace: string, filePath: string): Promise<string> {
    const resolved = await Git.resolveFile(workspace, filePath);
    return Git.execCommand(resolved.repo, ['show', `HEAD:${resolved.path}`]);
  }
}
