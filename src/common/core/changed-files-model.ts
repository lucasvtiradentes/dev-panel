import type { GitFileStatus } from '../constants/enums';

export type FileStatus = GitFileStatus | '?';

export type ChangedFile = {
  status: FileStatus;
  path: string;
  filename: string;
  added: string;
  deleted: string;
};

export type ChangedFilesTopic = {
  name: string;
  files: ChangedFile[];
  isUserCreated: boolean;
};

export type ChangedFilesMetadata = {
  filesCount: number;
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  summary: string;
  isEmpty: boolean;
};

export type ChangedFilesModel = {
  topics: ChangedFilesTopic[];
  metadata: ChangedFilesMetadata;
};

export const EMPTY_METADATA: ChangedFilesMetadata = {
  filesCount: 0,
  added: 0,
  modified: 0,
  deleted: 0,
  renamed: 0,
  summary: '',
  isEmpty: true,
};

export const EMPTY_MODEL: ChangedFilesModel = {
  topics: [],
  metadata: EMPTY_METADATA,
};
