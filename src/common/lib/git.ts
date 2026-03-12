import { execAsync } from '../utils/functions/exec-async';

export class Git {
  static readonly INTEGRATION = {
    HEAD_FILE_PATH: '.git/HEAD',
  } as const;

  private static async execCommand(workspace: string, args: string[]): Promise<string> {
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

  static async getFileContent(workspace: string, filePath: string): Promise<string> {
    return Git.execCommand(workspace, ['show', `HEAD:${filePath}`]);
  }
}
