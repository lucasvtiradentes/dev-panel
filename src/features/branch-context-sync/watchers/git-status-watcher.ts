import { ConfigManager } from '../../../common/core/config-manager';
import { Git, type GitRepository } from '../../../common/lib/git';
import { createLogger } from '../../../common/lib/logger';
import { JsonHelper } from '../../../common/utils/helpers/json-helper';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { FILE_WATCHER_DEBOUNCE_MS, STARTUP_GRACE_PERIOD_MS } from '../constants';
import { getSyncCoordinator } from '../coordinator';

const logger = createLogger('GitStatusWatcher');

function computeStateSignature(repo: GitRepository): string {
  const allFiles = new Set<string>();
  for (const c of repo.state.workingTreeChanges) allFiles.add(c.uri.fsPath);
  for (const c of repo.state.indexChanges) allFiles.add(c.uri.fsPath);
  for (const c of repo.state.untrackedChanges) allFiles.add(c.uri.fsPath);
  return JsonHelper.stringify([...allFiles].sort());
}

export function createGitStatusWatcher(): Disposable {
  const disposables: Disposable[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const previousSignatures = new Map<GitRepository, string>();
  let isStartupComplete = false;
  const coordinator = getSyncCoordinator();

  const isEnabled = (): boolean => {
    const folder = VscodeHelper.getFirstWorkspaceFolder();
    if (!folder) return true;
    const settings = ConfigManager.readSettings(folder);
    return settings?.autoSyncGitChanges !== false;
  };

  const handleGitStatusChange = (repo: GitRepository) => {
    if (!isStartupComplete) {
      previousSignatures.set(repo, computeStateSignature(repo));
      return;
    }

    if (!isEnabled()) {
      return;
    }

    const newSignature = computeStateSignature(repo);
    const prevSignature = previousSignatures.get(repo);

    if (newSignature === prevSignature) {
      return;
    }

    previousSignatures.set(repo, newSignature);
    logger.info('[handleGitStatusChange] State changed, scheduling sync');

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      coordinator.handleGitStatusChange();
      debounceTimer = null;
    }, FILE_WATCHER_DEBOUNCE_MS);
  };

  const attachRepoListeners = (repo: GitRepository) => {
    const initialSignature = computeStateSignature(repo);
    previousSignatures.set(repo, initialSignature);
    disposables.push(repo.state.onDidChange(() => handleGitStatusChange(repo)));
  };

  const setupGitWatcher = async () => {
    const gitAPI = await Git.getAPI();
    if (!gitAPI) {
      logger.warn('[setupGitWatcher] Git API not available');
      return;
    }

    logger.info(`[setupGitWatcher] Found ${gitAPI.repositories.length} repositories`);

    for (const repo of gitAPI.repositories) {
      attachRepoListeners(repo);
    }

    disposables.push(
      gitAPI.onDidOpenRepository((newRepo) => {
        attachRepoListeners(newRepo);
      }),
    );

    setTimeout(() => {
      isStartupComplete = true;
      for (const [repoEntry] of previousSignatures.entries()) {
        const currentSig = computeStateSignature(repoEntry);
        previousSignatures.set(repoEntry, currentSig);
      }
      logger.info('[setupGitWatcher] Startup grace period complete');
    }, STARTUP_GRACE_PERIOD_MS);
  };

  void setupGitWatcher();

  return {
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      previousSignatures.clear();
    },
  };
}
