import { CONFIG_DIR_KEY, GLOBAL_TASK_TYPE } from '../../common/constants';
import type { DevPanelConfig } from '../../common/schemas';
import { executeTaskSilently } from '../../common/utils/functions/execute-silent';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';

type ExecuteTaskOptions = {
  task: NonNullable<DevPanelConfig['tasks']>[number];
  cwd: string;
  env: Record<string, string>;
  isGlobal?: boolean;
};

export async function executeTaskFromKeybinding(options: ExecuteTaskOptions) {
  const { task, cwd, env, isGlobal } = options;

  if (task.hideTerminal) {
    await executeTaskSilently({ command: task.command, cwd, env, taskName: task.name });
    return;
  }

  const taskType = isGlobal ? GLOBAL_TASK_TYPE : CONFIG_DIR_KEY;
  const scope = isGlobal ? VscodeConstants.TaskScope.Global : VscodeConstants.TaskScope.Workspace;

  const shellExec = VscodeHelper.createShellExecution(task.command, { env, cwd });
  const vsTask = VscodeHelper.createTask({
    definition: { type: taskType },
    scope,
    name: task.name,
    source: taskType,
    execution: shellExec,
  });

  void VscodeHelper.executeTask(vsTask);
}
