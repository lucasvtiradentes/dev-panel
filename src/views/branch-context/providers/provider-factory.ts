import { DefaultChangedFilesProvider } from './default-changed-files-provider';
import { DefaultTaskProvider } from './default-task-provider';
import type { AutoSectionProvider, TaskSyncProvider } from './interfaces';
import { loadAutoProvider, loadTaskProvider } from './plugin-loader';

type ProviderConfig = boolean | { provider: string };

export function createTaskProvider(config?: ProviderConfig, workspace?: string): TaskSyncProvider {
  if (!config || config === true) {
    return new DefaultTaskProvider();
  }

  if (typeof config === 'object' && config.provider) {
    if (!workspace) {
      throw new Error('Workspace path is required for custom task providers');
    }
    return loadTaskProvider(workspace, config.provider);
  }

  throw new Error('Invalid tasks config');
}

export function createChangedFilesProvider(config?: ProviderConfig, workspace?: string): AutoSectionProvider {
  if (config === false) {
    throw new Error('Changed files section is disabled');
  }

  if (!config || config === true) {
    return new DefaultChangedFilesProvider();
  }

  if (typeof config === 'object' && config.provider) {
    if (!workspace) {
      throw new Error('Workspace path is required for custom changed files providers');
    }
    return loadAutoProvider(workspace, config.provider);
  }

  throw new Error('Invalid changedFiles config');
}
