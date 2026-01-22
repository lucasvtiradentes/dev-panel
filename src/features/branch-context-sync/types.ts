import type { SectionMetadata } from '../../common/schemas/types';

export enum SyncEvent {
  BranchChanged = 'branch-changed',
  FileChanged = 'file-changed',
  GitStatusChanged = 'git-status-changed',
  RootMarkdownChanged = 'root-markdown-changed',
  TemplateChanged = 'template-changed',
  SyncStarted = 'sync-started',
  SyncCompleted = 'sync-completed',
}

export type BranchChangedPayload = {
  branch: string;
  previousBranch: string;
};

export type FileChangedPayload = {
  filePath: string;
  isRootFile: boolean;
};

export type SyncCompletedPayload = {
  branch: string;
  timestamp: string;
};

export type SyncEventPayload =
  | { event: SyncEvent.BranchChanged; data: BranchChangedPayload }
  | { event: SyncEvent.FileChanged; data: FileChangedPayload }
  | { event: SyncEvent.GitStatusChanged; data: undefined }
  | { event: SyncEvent.RootMarkdownChanged; data: undefined }
  | { event: SyncEvent.TemplateChanged; data: undefined }
  | { event: SyncEvent.SyncStarted; data: { branch: string } }
  | { event: SyncEvent.SyncCompleted; data: SyncCompletedPayload };

export type CodeBlockSection = {
  content: string;
  metadata?: SectionMetadata;
};

export type SectionMetadataMap = Record<string, Record<string, unknown>>;
