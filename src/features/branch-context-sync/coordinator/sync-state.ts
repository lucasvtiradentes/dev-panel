import { StoreKey, extensionStore } from '../../../common/core/extension-store';
import { WRITING_MARKDOWN_TIMEOUT_MS } from '../constants';

export class SyncState {
  private isSyncing = false;
  private isWritingMarkdown = false;
  private lastSyncTime: Date | null = null;
  private currentBranch = '';
  private writingTimeout: NodeJS.Timeout | null = null;

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  setIsSyncing(value: boolean) {
    this.isSyncing = value;
  }

  getIsWritingMarkdown(): boolean {
    return this.isWritingMarkdown;
  }

  setIsWritingMarkdown(value: boolean) {
    this.isWritingMarkdown = value;
    extensionStore.set(StoreKey.IsWritingBranchContext, value);

    if (value && this.writingTimeout) {
      clearTimeout(this.writingTimeout);
    }

    if (value) {
      this.writingTimeout = setTimeout(() => {
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
      }, WRITING_MARKDOWN_TIMEOUT_MS);
    }
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  setLastSyncTime(value: Date) {
    this.lastSyncTime = value;
  }

  getCurrentBranch(): string {
    return this.currentBranch;
  }

  setCurrentBranch(value: string) {
    this.currentBranch = value;
  }

  isBlocked(): boolean {
    return this.isSyncing || this.isWritingMarkdown;
  }

  dispose() {
    if (this.writingTimeout) {
      clearTimeout(this.writingTimeout);
      this.writingTimeout = null;
    }
  }
}
