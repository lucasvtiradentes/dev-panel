import { DefaultChangedFilesProvider } from './default-changed-files-provider';
import { DefaultTaskProvider } from './default-task-provider';
import type { AutoSectionProvider, TaskSyncProvider } from './interfaces';
import { loadAutoProvider, loadTaskProvider } from './plugin-loader';

export function createTaskProvider(config?: boolean | string, workspace?: string): TaskSyncProvider {
  if (!config || config === true) {
    return new DefaultTaskProvider();
  }

  if (typeof config === 'string') {
    if (!workspace) {
      throw new Error('Workspace path is required for custom task providers');
    }
    return loadTaskProvider(workspace, config);
  }

  throw new Error('Invalid tasks config');
}

export function createChangedFilesProvider(config?: boolean | string, workspace?: string): AutoSectionProvider {
  if (config === false) {
    throw new Error('Changed files section is disabled');
  }

  if (!config || config === true) {
    return new DefaultChangedFilesProvider();
  }

  if (typeof config === 'string') {
    if (!workspace) {
      throw new Error('Workspace path is required for custom changed files providers');
    }
    return loadAutoProvider(workspace, config);
  }

  throw new Error('Invalid changedFiles config');
}
