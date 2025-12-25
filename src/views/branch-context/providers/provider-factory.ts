import { createLogger } from '../../../common/lib/logger';
import { DefaultTaskProvider } from './default-task-provider';
import type { TaskSyncProvider } from './interfaces';
import { loadTaskProvider } from './plugin-loader';

const logger = createLogger('TaskProviderFactory');

type ProviderConfig = boolean | { provider: string };

export function createTaskProvider(config?: ProviderConfig, workspace?: string): TaskSyncProvider {
  if (config === false) {
    logger.info('[createTaskProvider] Tasks disabled in config');
    return createNoopProvider();
  }

  if (!config || config === true) {
    logger.info('[createTaskProvider] Using DefaultTaskProvider');
    return new DefaultTaskProvider();
  }

  if (typeof config === 'object' && config.provider) {
    if (!workspace) {
      throw new Error('Workspace path is required for custom task providers');
    }
    logger.info(`[createTaskProvider] Loading custom provider: ${config.provider}`);
    return loadTaskProvider(workspace, config.provider);
  }

  throw new Error('Invalid tasks config');
}

function createNoopProvider(): TaskSyncProvider {
  return {
    fromMarkdown: () => [],
    toMarkdown: () => '',
    getTasks: () => Promise.resolve([]),
    getMilestones: () => Promise.resolve({ orphanTasks: [], milestones: [] }),
    onStatusChange: () => Promise.resolve(),
    onCreateTask: () => Promise.resolve({ text: '', status: 'todo', lineIndex: -1, children: [], meta: {} }),
    onUpdateMeta: () => Promise.resolve(),
    onEditText: () => Promise.resolve(),
    onDeleteTask: () => Promise.resolve(),
    moveTaskToMilestone: () => Promise.resolve(),
    reorderTask: () => Promise.resolve(),
    createMilestone: () => Promise.resolve(),
    onSync: () => Promise.resolve({ added: 0, updated: 0, deleted: 0 }),
    cycleStatus: () => 'todo',
  };
}
