import { FILE_WATCHER_DEBOUNCE_MS } from '../common/constants';
import { ConfigManager } from '../common/core/config-manager';
import { Git, type GitRepository } from '../common/lib/git';
import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable } from '../common/vscode/vscode-types';

type GitStatusChangeCallback = () => void;

const logger = createLogger('GitStatusWatcher');

function computeStateSignature(repo: GitRepository): string {
  const allFiles = new Set<string>();
  for (const c of repo.state.workingTreeChanges) allFiles.add(c.uri.fsPath);
  for (const c of repo.state.indexChanges) allFiles.add(c.uri.fsPath);
  for (const c of repo.state.untrackedChanges) allFiles.add(c.uri.fsPath);
  return JSON.stringify([...allFiles].sort());
}

const STARTUP_GRACE_PERIOD_MS = 3000;

export function createGitStatusWatcher(onGitStatusChange: GitStatusChangeCallback): Disposable {
  const disposables: Disposable[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const previousSignatures = new Map<GitRepository, string>();
  let isStartupComplete = false;

  const isEnabled = (): boolean => {
    const folder = VscodeHelper.getFirstWorkspaceFolder();
    if (!folder) return true;
    const settings = ConfigManager.readSettings(folder);
    return settings?.autoSyncGitChanges !== false;
  };

  const handleGitStatusChange = (repo: GitRepository) => {
    const allFiles = new Set<string>();
    for (const c of repo.state.workingTreeChanges) allFiles.add(c.uri.fsPath);
    for (const c of repo.state.indexChanges) allFiles.add(c.uri.fsPath);
    for (const c of repo.state.untrackedChanges) allFiles.add(c.uri.fsPath);
    const totalFiles = allFiles.size;

    logger.info(
      `[handleGitStatusChange] Event received - isStartupComplete: ${isStartupComplete}, totalFiles: ${totalFiles}`,
    );

    if (!isStartupComplete) {
      logger.info('[handleGitStatusChange] Skipping - startup grace period active');
      previousSignatures.set(repo, computeStateSignature(repo));
      return;
    }

    if (!isEnabled()) {
      logger.info('[handleGitStatusChange] Skipping - auto-sync disabled');
      return;
    }

    const newSignature = computeStateSignature(repo);
    const prevSignature = previousSignatures.get(repo);

    logger.info(`[handleGitStatusChange] Comparing signatures - changed: ${newSignature !== prevSignature}`);

    if (newSignature === prevSignature) {
      return;
    }

    previousSignatures.set(repo, newSignature);
    logger.info('[handleGitStatusChange] State changed, scheduling sync');

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      logger.info('[handleGitStatusChange] Triggering sync');
      onGitStatusChange();
      debounceTimer = null;
    }, FILE_WATCHER_DEBOUNCE_MS);
  };

  const attachRepoListeners = (repo: GitRepository) => {
    const initialSignature = computeStateSignature(repo);
    previousSignatures.set(repo, initialSignature);
    const parsed = JSON.parse(initialSignature) as string[];
    logger.info(`[attachRepoListeners] Initial signature set (${parsed.length} unique files)`);
    disposables.push(repo.state.onDidChange(() => handleGitStatusChange(repo)));
    logger.info('[attachRepoListeners] Attached state.onDidChange listener');
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
      for (const [repoEntry, prevSig] of previousSignatures.entries()) {
        const currentSig = computeStateSignature(repoEntry);
        logger.info(`[setupGitWatcher] Grace period complete - signature match: ${prevSig === currentSig}`);
        previousSignatures.set(repoEntry, currentSig);
      }
      logger.info('[setupGitWatcher] Now watching for changes');
    }, STARTUP_GRACE_PERIOD_MS);

    logger.info(`[setupGitWatcher] Initialized (${STARTUP_GRACE_PERIOD_MS}ms grace period)`);
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
