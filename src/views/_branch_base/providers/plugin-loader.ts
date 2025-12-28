import { createLogger } from '../../../common/lib/logger';
import { PluginAction, TaskStatus } from '../../../common/schemas';
import { ConfigManager } from '../../../common/utils/config-manager';
import { execAsync } from '../../../common/utils/functions/exec-async';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../../common/utils/helpers/type-guards-helper';
import { extractAllFieldsRaw } from '../storage/file-storage';
import type {
  AutoSectionProvider,
  NewTask,
  SyncContext,
  SyncResult,
  TaskMeta,
  TaskNode,
  TaskSyncProvider,
} from './interfaces';
import type {
  CreateTaskPayload,
  CreateTaskResponse,
  DeleteTaskPayload,
  DeleteTaskResponse,
  GetTasksResponse,
  PluginRequest,
  SetStatusPayload,
  SetStatusResponse,
  SyncResponse,
  UpdateMetaPayload,
  UpdateMetaResponse,
} from './plugin-protocol';

const logger = createLogger('PluginLoader');

const PLUGIN_TIMEOUT = 60000;

export function loadAutoProvider(workspace: string, providerCommand: string): AutoSectionProvider {
  const configDir = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);
  logger.info(`[loadAutoProvider] Provider command: ${providerCommand}`);

  return {
    async fetch(context: SyncContext): Promise<string> {
      let fields: Record<string, string> = {};
      if (context.markdownPath) {
        const markdownContent = FileIOHelper.readFileIfExists(context.markdownPath);
        if (markdownContent) {
          fields = extractAllFieldsRaw(markdownContent);
        }
      }

      const contextJson = JSON.stringify({
        branchName: context.branchName,
        workspacePath: context.workspacePath,
        markdownPath: context.markdownPath,
        fields,
        sectionOptions: context.sectionOptions,
      });

      logger.info(`[loadAutoProvider] Running: ${providerCommand}`);

      try {
        const { stdout } = await execAsync(providerCommand, {
          timeout: PLUGIN_TIMEOUT,
          cwd: configDir,
          env: {
            ...process.env,
            PLUGIN_CONTEXT: contextJson,
          },
        });

        return stdout.trim();
      } catch (error: unknown) {
        logger.error(`[loadAutoProvider] Script error: ${TypeGuardsHelper.getErrorMessage(error)}`);
        throw error;
      }
    },
  };
}

export function loadTaskProvider(workspace: string, providerCommand: string): TaskSyncProvider {
  const configDir = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);
  logger.info(`[loadTaskProvider] Loading provider: ${providerCommand}`);

  async function executePlugin<T>(action: PluginAction, context: SyncContext, payload?: unknown): Promise<T> {
    const request: PluginRequest = {
      action,
      context: {
        branchName: context.branchName,
        workspacePath: context.workspacePath,
        markdownPath: context.markdownPath,
        branchContext: context.branchContext,
        sectionOptions: context.sectionOptions,
      },
      payload,
    };

    const command = `${providerCommand} --action=${action}`;
    logger.info(`[loadTaskProvider] Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: PLUGIN_TIMEOUT,
        cwd: configDir,
        env: {
          ...process.env,
          PLUGIN_CONTEXT: JSON.stringify(request),
        },
      });

      if (stderr) {
        logger.warn(`[loadTaskProvider] stderr: ${stderr}`);
      }

      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Invalid plugin response: ${stdout}`);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid plugin response: expected object');
      }
      return parsed as T;
    } catch (error: unknown) {
      logger.error(`[loadTaskProvider] Plugin error: ${TypeGuardsHelper.getErrorMessage(error)}`);
      throw error;
    }
  }

  return {
    fromMarkdown(): TaskNode[] {
      return [];
    },

    toMarkdown(): string {
      return '';
    },

    async getTasks(context: SyncContext): Promise<TaskNode[]> {
      const response = await executePlugin<GetTasksResponse>(PluginAction.GetTasks, context);

      if (!response.success) {
        logger.error(`[loadTaskProvider] getTasks failed: ${response.error}`);
        return [];
      }

      return response.tasks;
    },

    getTaskStats(): Promise<{ completed: number; total: number }> {
      return Promise.resolve({ completed: 0, total: 0 });
    },

    async onStatusChange(lineIndex: number, newStatus: TaskStatus, context: SyncContext) {
      const payload: SetStatusPayload = { lineIndex, newStatus };
      const response = await executePlugin<SetStatusResponse>(PluginAction.SetStatus, context, payload);

      if (!response.success) {
        throw new Error(response.error ?? 'Failed to set status');
      }
    },

    async onCreateTask(task: NewTask, parentIndex: number | undefined, context: SyncContext): Promise<TaskNode> {
      const payload: CreateTaskPayload = { text: task.text, parentIndex };
      const response = await executePlugin<CreateTaskResponse>(PluginAction.CreateTask, context, payload);

      if (!response.success || !response.task) {
        throw new Error(response.error ?? 'Failed to create task');
      }

      return response.task;
    },

    async onUpdateMeta(lineIndex: number, meta: Partial<TaskMeta>, context: SyncContext) {
      const payload: UpdateMetaPayload = { lineIndex, meta };
      const response = await executePlugin<UpdateMetaResponse>(PluginAction.UpdateMeta, context, payload);

      if (!response.success) {
        throw new Error(response.error ?? 'Failed to update meta');
      }
    },

    onEditText() {
      return Promise.reject(new Error('Edit text not supported by plugin providers'));
    },

    async onDeleteTask(lineIndex: number, context: SyncContext) {
      const payload: DeleteTaskPayload = { lineIndex };
      const response = await executePlugin<DeleteTaskResponse>(PluginAction.DeleteTask, context, payload);

      if (!response.success) {
        throw new Error(response.error ?? 'Failed to delete task');
      }
    },

    getMilestones() {
      return Promise.resolve({ orphanTasks: [], milestones: [] });
    },

    moveTaskToMilestone() {
      return Promise.reject(new Error('Move task to milestone not supported by plugin providers'));
    },

    reorderTask() {
      return Promise.reject(new Error('Reorder task not supported by plugin providers'));
    },

    createMilestone() {
      return Promise.reject(new Error('Create milestone not supported by plugin providers'));
    },

    async onSync(context: SyncContext): Promise<SyncResult> {
      const response = await executePlugin<SyncResponse>(PluginAction.Sync, context);

      if (!response.success || !response.result) {
        throw new Error(response.error ?? 'Sync failed');
      }

      return response.result;
    },

    cycleStatus(currentStatus: TaskStatus): TaskStatus {
      const cycle: TaskStatus[] = [TaskStatus.Todo, TaskStatus.Doing, TaskStatus.Done];
      const idx = cycle.indexOf(currentStatus);
      if (idx === -1) return TaskStatus.Todo;
      return cycle[(idx + 1) % cycle.length];
    },
  };
}
