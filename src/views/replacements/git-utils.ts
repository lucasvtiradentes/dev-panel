import * as cp from 'node:child_process';

function execGitCommand(workspace: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(`git ${args.join(' ')}`, { cwd: workspace }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr ?? err.message));
      else resolve(stdout.trim());
    });
  });
}

export async function getCurrentBranch(workspace: string): Promise<string> {
  return execGitCommand(workspace, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export async function setSkipWorktree(workspace: string, filePath: string, skip: boolean): Promise<void> {
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

export async function restoreFileFromGit(workspace: string, filePath: string): Promise<void> {
  await execGitCommand(workspace, ['checkout', '--', filePath]);
}
