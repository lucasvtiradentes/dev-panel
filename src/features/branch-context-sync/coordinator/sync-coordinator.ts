import { ConfigManager } from '../../../common/core/config-manager';
import { createLogger } from '../../../common/lib/logger';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { SYNC_DEBOUNCE_MS, WRITING_MARKDOWN_TIMEOUT_MS } from '../constants';
import { type BranchChangedPayload, type FileChangedPayload, type SyncCompletedPayload, SyncEvent } from '../types';
import { SyncEventEmitter } from './sync-events';
import { SyncState } from './sync-state';

const logger = createLogger('SyncCoordinator');

type EventDataMap = {
  [SyncEvent.BranchChanged]: BranchChangedPayload;
  [SyncEvent.FileChanged]: FileChangedPayload;
  [SyncEvent.GitStatusChanged]: undefined;
  [SyncEvent.RootMarkdownChanged]: undefined;
  [SyncEvent.TemplateChanged]: undefined;
  [SyncEvent.SyncStarted]: { branch: string };
  [SyncEvent.SyncCompleted]: SyncCompletedPayload;
};

export class SyncCoordinator {
  private events = new SyncEventEmitter();
  private state = new SyncState();
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private disposables: Disposable[] = [];

  on<E extends SyncEvent>(event: E, handler: (data: EventDataMap[E]) => void): Disposable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disposable = this.events.on(event, handler as any);
    this.disposables.push(disposable);
    return disposable;
  }

  emit<E extends SyncEvent>(event: E, data: EventDataMap[E]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events.emit(event, data as any);
  }

  handleBranchChange(newBranch: string) {
    const previousBranch = this.state.getCurrentBranch();
    if (newBranch === previousBranch) return;

    logger.info(`[handleBranchChange] Branch changed: ${previousBranch} → ${newBranch}`);
    this.state.setCurrentBranch(newBranch);

    const payload: BranchChangedPayload = { branch: newBranch, previousBranch };
    this.events.emit(SyncEvent.BranchChanged, payload);
  }

  handleRootMarkdownChange() {
    if (this.state.isBlocked()) {
      logger.info('[handleRootMarkdownChange] Blocked - sync in progress');
      return;
    }

    logger.info('[handleRootMarkdownChange] Root markdown changed');
    this.debouncedAction(() => {
      this.syncRootToBranch();
      this.events.emit(SyncEvent.RootMarkdownChanged, undefined);
    });
  }

  handleBranchFileChange(filePath: string) {
    if (this.state.isBlocked()) {
      logger.info('[handleBranchFileChange] Blocked - sync in progress');
      return;
    }

    logger.info(`[handleBranchFileChange] Branch file changed: ${filePath}`);
    this.events.emit(SyncEvent.FileChanged, { filePath, isRootFile: false });
  }

  handleGitStatusChange() {
    logger.info('[handleGitStatusChange] Git status changed');
    this.events.emit(SyncEvent.GitStatusChanged, undefined);
  }

  handleTemplateChange() {
    logger.info('[handleTemplateChange] Template changed');
    this.events.emit(SyncEvent.TemplateChanged, undefined);
  }

  syncRootToBranch() {
    const currentBranch = this.state.getCurrentBranch();
    if (!currentBranch) return;

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = ConfigManager.getRootBranchContextFilePath(workspace);
    const branchPath = ConfigManager.getBranchContextFilePath(workspace, currentBranch);

    if (!FileIOHelper.fileExists(rootPath)) return;

    this.state.setIsSyncing(true);
    this.state.setIsWritingMarkdown(true);

    try {
      const content = FileIOHelper.readFile(rootPath);
      FileIOHelper.writeFile(branchPath, content);
      logger.info(`[syncRootToBranch] Synced root → branch: ${currentBranch}`);
    } finally {
      this.state.setIsSyncing(false);
      setTimeout(() => {
        this.state.setIsWritingMarkdown(false);
        logger.info('[syncRootToBranch] Writing markdown timeout cleared');
      }, WRITING_MARKDOWN_TIMEOUT_MS);
    }
  }

  markSyncStarted(branch: string) {
    this.state.setIsSyncing(true);
    this.state.setIsWritingMarkdown(true);
    this.events.emit(SyncEvent.SyncStarted, { branch });
  }

  markSyncCompleted(branch: string) {
    const timestamp = new Date().toISOString();
    this.state.setLastSyncTime(new Date());
    this.state.setIsSyncing(false);

    const payload: SyncCompletedPayload = { branch, timestamp };
    this.events.emit(SyncEvent.SyncCompleted, payload);
  }

  getCurrentBranch(): string {
    return this.state.getCurrentBranch();
  }

  isBlocked(): boolean {
    return this.state.isBlocked();
  }

  getLastSyncTime(): Date | null {
    return this.state.getLastSyncTime();
  }

  private debouncedAction(action: () => void) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      action();
      this.syncDebounceTimer = null;
    }, SYNC_DEBOUNCE_MS);
  }

  dispose() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.events.dispose();
    this.state.dispose();
  }
}

let instance: SyncCoordinator | null = null;

export function getSyncCoordinator(): SyncCoordinator {
  if (!instance) {
    instance = new SyncCoordinator();
  }
  return instance;
}

export function disposeSyncCoordinator() {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
