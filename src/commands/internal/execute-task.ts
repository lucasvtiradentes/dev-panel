import { VariablesEnvManager } from 'src/common/core/variables-env-manager';
import { executeTaskSilently } from 'src/common/utils/functions/execute-silent';
import { DEVPANEL_TASK_TYPE } from '../../common/constants';
import { GLOBAL_STATE_WORKSPACE_SOURCE } from '../../common/constants/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { DevPanelConfig } from '../../common/schemas';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { collectInputs, replaceInputPlaceholders } from '../../common/vscode/vscode-inputs';
import {
  type ExtensionContext,
  ProcessExecutionClass,
  ShellExecutionClass,
  type Task,
  type TaskScope,
  type WorkspaceFolder,
} from '../../common/vscode/vscode-types';
import { isMultiRootWorkspace } from '../../common/vscode/vscode-workspace';

const log = createLogger('execute-task');

function createTaskWithUniqueDefinition(task: Task): Task {
  const execution = task.execution;
  if (!execution) return task;

  const uniqueDefinition = { type: DEVPANEL_TASK_TYPE, taskId: task.name };

  const newTask = VscodeHelper.createTask({
    definition: uniqueDefinition,
    scope: task.scope ?? VscodeConstants.TaskScope.Workspace,
    name: task.name,
    source: DEVPANEL_TASK_TYPE,
    execution,
    problemMatchers: task.problemMatchers,
  });
  newTask.presentationOptions = task.presentationOptions;
  return newTask;
}

function cloneWithEnv(task: Task, env: Record<string, string>): Task {
  const execution = task.execution;
  if (!execution) return task;

  let newTask: Task;

  if (execution instanceof ShellExecutionClass) {
    const mergedEnv = { ...execution.options?.env, ...env };
    const commandLine = execution.commandLine;
    const command = execution.command;

    if (commandLine) {
      const newExecution = VscodeHelper.createShellExecution(commandLine, { ...execution.options, env: mergedEnv });
      newTask = VscodeHelper.createTask({
        definition: task.definition,
        scope: task.scope ?? VscodeConstants.TaskScope.Workspace,
        name: task.name,
        source: task.source,
        execution: newExecution,
        problemMatchers: task.problemMatchers,
      });
    } else if (command) {
      const newExecution = VscodeHelper.createShellExecution(command, execution.args ?? [], {
        ...execution.options,
        env: mergedEnv,
      });
      newTask = VscodeHelper.createTask({
        definition: task.definition,
        scope: task.scope ?? VscodeConstants.TaskScope.Workspace,
        name: task.name,
        source: task.source,
        execution: newExecution,
        problemMatchers: task.problemMatchers,
      });
    } else {
      return task;
    }

    newTask.presentationOptions = task.presentationOptions;
    return newTask;
  }

  if (execution instanceof ProcessExecutionClass) {
    const mergedEnv = { ...execution.options?.env, ...env };
    const newExecution = VscodeHelper.createProcessExecution(execution.process, execution.args, {
      ...execution.options,
      env: mergedEnv,
    });

    newTask = VscodeHelper.createTask({
      definition: task.definition,
      scope: task.scope ?? VscodeConstants.TaskScope.Workspace,
      name: task.name,
      source: task.source,
      execution: newExecution,
      problemMatchers: task.problemMatchers,
    });
    newTask.presentationOptions = task.presentationOptions;
    return newTask;
  }

  return task;
}

async function handleExecuteTask(
  context: ExtensionContext,
  task: Task,
  scope: TaskScope | WorkspaceFolder | undefined,
  taskConfig?: NonNullable<DevPanelConfig['tasks']>[number],
) {
  let modifiedTask = task;
  const scopeIsWorkspaceFolder =
    !!scope && !TypeGuardsHelper.isNumber(scope) && TypeGuardsHelper.isObjectWithProperty(scope, 'uri');

  let command = '';
  let cwd = '';
  let env: Record<string, string> = {};

  const execution = task.execution;
  if (execution instanceof ShellExecutionClass) {
    command = execution.commandLine ?? String(execution.command);
    cwd = execution.options?.cwd ?? '';
    env = (execution.options?.env as Record<string, string>) ?? {};
  }

  if (taskConfig?.inputs && taskConfig.inputs.length > 0) {
    const folder = scopeIsWorkspaceFolder ? (scope as WorkspaceFolder) : null;
    const folderForSettings = folder ?? VscodeHelper.getFirstWorkspaceFolder();
    const settings = folderForSettings ? ConfigManager.readSettings(folderForSettings) : undefined;

    const inputValues = await collectInputs(taskConfig.inputs, folder, settings);
    if (inputValues === null) return;

    command = replaceInputPlaceholders(command, inputValues);

    if (execution instanceof ShellExecutionClass) {
      const newExecution = VscodeHelper.createShellExecution(command, execution.options);
      modifiedTask = VscodeHelper.createTask({
        definition: task.definition,
        scope: task.scope ?? VscodeConstants.TaskScope.Workspace,
        name: task.name,
        source: task.source,
        execution: newExecution,
        problemMatchers: task.problemMatchers,
      });
    }
  }

  if (scopeIsWorkspaceFolder) {
    const folder = scope as WorkspaceFolder;
    const variablesPath = ConfigManager.getWorkspaceVariablesPath(folder);
    const varsEnv = VariablesEnvManager.readDevPanelVariablesAsEnv(variablesPath);

    if (Object.keys(varsEnv).length > 0) {
      env = { ...env, ...varsEnv };
      modifiedTask = cloneWithEnv(modifiedTask, varsEnv);
    }
  }

  if (taskConfig?.hideTerminal) {
    log.info(`Executing task silently: ${task.name}`);
    await executeTaskSilently({ command, cwd, env, taskName: task.name });
    return;
  }

  if (isMultiRootWorkspace()) {
    if (scope != null && (scope as WorkspaceFolder).name != null) {
      await context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, (scope as WorkspaceFolder).name);
    }
  }

  const finalTask = createTaskWithUniqueDefinition(modifiedTask);

  log.info(`Executing task: ${finalTask.name}`);

  void VscodeHelper.executeTask(finalTask).then((taskExecution) => {
    log.info(`Task started successfully: ${finalTask.name}`);
    const disposable = VscodeHelper.onDidEndTask((e) => {
      if (e.execution === taskExecution) {
        log.info(`Task ended: ${finalTask.name}`);
        void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
        disposable.dispose();
      }
    });
  });
}

export function createExecuteTaskCommand(context: ExtensionContext) {
  return registerCommand(Command.ExecuteTask, (task, scope, taskConfig) =>
    handleExecuteTask(context, task, scope, taskConfig),
  );
}
