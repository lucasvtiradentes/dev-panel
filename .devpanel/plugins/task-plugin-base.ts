import type { SyncResult, TaskMeta, TaskNode, TaskStatus } from '../../src/views/branch-context/providers/interfaces';
import type {
  CreateTaskResponse,
  DeleteTaskResponse,
  GetTasksResponse,
  PluginAction,
  PluginRequest,
  SetStatusResponse,
  SyncResponse,
  UpdateMetaResponse,
} from '../../src/views/branch-context/providers/plugin-protocol';

export type TaskPluginHandler = {
  getTasks(): Promise<TaskNode[]>;
  setStatus(lineIndex: number, newStatus: TaskStatus): Promise<void>;
  createTask(text: string, parentIndex?: number): Promise<TaskNode>;
  updateMeta(lineIndex: number, meta: Partial<TaskMeta>): Promise<void>;
  deleteTask(lineIndex: number): Promise<void>;
  sync(): Promise<SyncResult>;
};

export function getPluginRequest(): PluginRequest {
  const contextStr = process.env.PLUGIN_CONTEXT;
  if (!contextStr) {
    throw new Error('PLUGIN_CONTEXT not set');
  }
  return JSON.parse(contextStr);
}

export function getAction(): PluginAction {
  const args = process.argv.slice(2);
  const actionArg = args.find((a) => a.startsWith('--action='));
  if (!actionArg) {
    throw new Error('--action argument required');
  }
  return actionArg.split('=')[1] as PluginAction;
}

export function outputResponse(response: unknown): void {
  console.log(JSON.stringify(response));
}

export async function runPlugin(handler: TaskPluginHandler): Promise<void> {
  const action = getAction();
  const request = getPluginRequest();

  try {
    switch (action) {
      case 'getTasks': {
        const tasks = await handler.getTasks();
        const response: GetTasksResponse = { success: true, tasks };
        outputResponse(response);
        break;
      }

      case 'setStatus': {
        const { lineIndex, newStatus } = request.payload as { lineIndex: number; newStatus: TaskStatus };
        await handler.setStatus(lineIndex, newStatus);
        const response: SetStatusResponse = { success: true };
        outputResponse(response);
        break;
      }

      case 'createTask': {
        const { text, parentIndex } = request.payload as { text: string; parentIndex?: number };
        const task = await handler.createTask(text, parentIndex);
        const response: CreateTaskResponse = { success: true, task };
        outputResponse(response);
        break;
      }

      case 'updateMeta': {
        const { lineIndex, meta } = request.payload as { lineIndex: number; meta: Partial<TaskMeta> };
        await handler.updateMeta(lineIndex, meta);
        const response: UpdateMetaResponse = { success: true };
        outputResponse(response);
        break;
      }

      case 'deleteTask': {
        const { lineIndex } = request.payload as { lineIndex: number };
        await handler.deleteTask(lineIndex);
        const response: DeleteTaskResponse = { success: true };
        outputResponse(response);
        break;
      }

      case 'sync': {
        const result = await handler.sync();
        const response: SyncResponse = { success: true, result };
        outputResponse(response);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    outputResponse(errorResponse);
    process.exit(1);
  }
}
