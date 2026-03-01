import { CONFIG_DIR_KEY } from '../../common/constants';
import type { DevPanelConfig } from '../../common/schemas';
import { executeTaskSilently } from '../../common/utils/functions/execute-silent';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';

type ExecuteTaskOptions = {
  task: NonNullable<DevPanelConfig['tasks']>[number];
  cwd: string;
  env: Record<string, string>;
};

export async function executeTaskFromKeybinding(options: ExecuteTaskOptions) {
  const { task, cwd, env } = options;

  if (task.hideTerminal) {
    await executeTaskSilently({ command: task.command, cwd, env, taskName: task.name });
    return;
  }

  const shellExec = VscodeHelper.createShellExecution(task.command, { env, cwd });
  const vsTask = VscodeHelper.createTask({
    definition: { type: CONFIG_DIR_KEY },
    scope: VscodeConstants.TaskScope.Workspace,
    name: task.name,
    source: CONFIG_DIR_KEY,
    execution: shellExec,
  });

  void VscodeHelper.executeTask(vsTask);
}
