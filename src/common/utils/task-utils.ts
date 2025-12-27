import { TypeGuardsHelper } from '../lib/type-guards-helper';
import { VscodeConstants } from '../vscode/vscode-constants';
import { VscodeHelper } from '../vscode/vscode-helper';
import { ProcessExecutionClass, ShellExecutionClass, type Task } from '../vscode/vscode-types';

export class TaskUtils {
  static cloneWithEnv(task: Task, env: Record<string, string>): Task {
    const execution = task.execution;
    if (!execution) return task;

    let newTask: Task;

    if (execution instanceof ShellExecutionClass) {
      const mergedEnv = { ...execution.options?.env, ...env };
      const commandLine = execution.commandLine;
      const command = execution.command;

      if (commandLine) {
        const newExecution = VscodeHelper.createShellExecution(commandLine, { ...execution.options, env: mergedEnv });
        newTask = VscodeHelper.createTask(
          task.definition,
          task.scope ?? VscodeConstants.TaskScope.Workspace,
          task.name,
          task.source,
          newExecution,
          task.problemMatchers,
        );
      } else if (command) {
        const newExecution = VscodeHelper.createShellExecution(command, execution.args ?? [], {
          ...execution.options,
          env: mergedEnv,
        });
        newTask = VscodeHelper.createTask(
          task.definition,
          task.scope ?? VscodeConstants.TaskScope.Workspace,
          task.name,
          task.source,
          newExecution,
          task.problemMatchers,
        );
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

      newTask = VscodeHelper.createTask(
        task.definition,
        task.scope ?? VscodeConstants.TaskScope.Workspace,
        task.name,
        task.source,
        newExecution,
        task.problemMatchers,
      );
      newTask.presentationOptions = task.presentationOptions;
      return newTask;
    }

    return task;
  }

  static replaceVariablePlaceholders(content: string, variables: Record<string, unknown>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const stringValue = TypeGuardsHelper.isObject(value) ? JSON.stringify(value) : String(value);
      const pattern = new RegExp(`\\$${key}`, 'g');
      result = result.replace(pattern, stringValue);
    }
    return result;
  }
}
