import { DEFAULT_TASK_STATUS, INVALID_LINE_INDEX } from '../../../common/constants';
import { createLogger } from '../../../common/lib/logger';
import { DefaultTaskProvider } from './default/tasks.provider';
import type { TaskSyncProvider } from './interfaces';

const logger = createLogger('TaskProviderFactory');

export function createTaskProvider(config?: boolean): TaskSyncProvider {
  if (config === false) {
    logger.info('[createTaskProvider] Tasks disabled in config');
    return createNoopProvider();
  }

  logger.info('[createTaskProvider] Using DefaultTaskProvider');
  return new DefaultTaskProvider();
}

function createNoopProvider(): TaskSyncProvider {
  return {
    fromMarkdown: () => [],
    toMarkdown: () => '',
    getTasks: () => Promise.resolve([]),
    getTaskStats: () => Promise.resolve({ completed: 0, total: 0 }),
    getMilestones: () => Promise.resolve({ orphanTasks: [], milestones: [] }),
    onStatusChange: () => Promise.resolve(),
    onCreateTask: () =>
      Promise.resolve({
        text: '',
        status: DEFAULT_TASK_STATUS,
        lineIndex: INVALID_LINE_INDEX,
        children: [],
        meta: {},
      }),
    onUpdateMeta: () => Promise.resolve(),
    onEditText: () => Promise.resolve(),
    onDeleteTask: () => Promise.resolve(),
    moveTaskToMilestone: () => Promise.resolve(),
    reorderTask: () => Promise.resolve(),
    createMilestone: () => Promise.resolve(),
    onSync: () => Promise.resolve({ added: 0, updated: 0, deleted: 0 }),
    cycleStatus: () => DEFAULT_TASK_STATUS,
  };
}
