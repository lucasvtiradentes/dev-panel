import { ExecHelper } from '../../common/utils/exec-utils';

async function execGitCommand(workspace: string, args: string[]): Promise<string> {
  const { stdout } = await ExecHelper.execAsync(`git ${args.join(' ')}`, { cwd: workspace });
  return stdout.trim();
}

export async function getCurrentBranch(workspace: string): Promise<string> {
  return execGitCommand(workspace, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export async function setSkipWorktree(workspace: string, filePath: string, skip: boolean) {
  const flag = skip ? '--skip-worktree' : '--no-skip-worktree';
  await execGitCommand(workspace, ['update-index', flag, filePath]);
}

export async function isGitRepository(workspace: string): Promise<boolean> {
  try {
    await execGitCommand(workspace, ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

export async function restoreFileFromGit(workspace: string, filePath: string) {
  await execGitCommand(workspace, ['checkout', '--', filePath]);
}

export async function fileExistsInGit(workspace: string, filePath: string): Promise<boolean> {
  try {
    await execGitCommand(workspace, ['ls-files', '--error-unmatch', filePath]);
    return true;
  } catch {
    return false;
  }
}
