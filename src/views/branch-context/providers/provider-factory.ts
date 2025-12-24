import { DefaultChangedFilesProvider } from './default-changed-files-provider';
import { DefaultTaskProvider } from './default-task-provider';
import type { AutoSectionProvider, TaskSyncProvider } from './interfaces';

export function createTaskProvider(config?: boolean | string): TaskSyncProvider {
  if (!config || config === true) {
    return new DefaultTaskProvider();
  }

  if (typeof config === 'string') {
    throw new Error('Custom task providers not yet implemented. Coming in Phase 6.');
  }

  throw new Error('Invalid tasks config');
}

export function createChangedFilesProvider(config?: boolean | string): AutoSectionProvider {
  if (config === false) {
    throw new Error('Changed files section is disabled');
  }

  if (!config || config === true) {
    return new DefaultChangedFilesProvider();
  }

  if (typeof config === 'string') {
    throw new Error('Custom changed files providers not yet implemented. Coming in Phase 6.');
  }

  throw new Error('Invalid changedFiles config');
}
