import { DefaultTaskProvider } from './default-task-provider';
import type { TaskSyncProvider } from './interfaces';
import { loadTaskProvider } from './plugin-loader';

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
