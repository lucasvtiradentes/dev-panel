import { DefaultTaskProvider } from './default-task-provider';
import type { TaskSyncProvider } from './interfaces';

export function createTaskProvider(config?: boolean | string): TaskSyncProvider {
  if (!config || config === true) {
    return new DefaultTaskProvider();
  }

  if (typeof config === 'string') {
    throw new Error('Custom task providers not yet implemented. Coming in Phase 6.');
  }

  throw new Error('Invalid tasks config');
}
