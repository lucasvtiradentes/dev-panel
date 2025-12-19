import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { Command, isMultiRootWorkspace, registerCommand } from '../../common';
import { GLOBAL_STATE_WORKSPACE_SOURCE } from '../../common/constants';

export function createExecuteTaskCommand(context: vscode.ExtensionContext) {
  return registerCommand(
    Command.ExecuteTask,
    async (task: vscode.Task, scope: vscode.TaskScope | vscode.WorkspaceFolder | undefined) => {
      if (isMultiRootWorkspace()) {
        if (scope != null && (scope as vscode.WorkspaceFolder).name != null) {
          await context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, (scope as vscode.WorkspaceFolder).name);
        }
      }

      void vscode.tasks.executeTask(task).then((execution) => {
        vscode.tasks.onDidEndTask((e) => {
          if (e.execution === execution) {
            void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
          }
        });
      });
    },
  );
}

export function createExecuteToolCommand(context: vscode.ExtensionContext) {
  return registerCommand(
    Command.ExecuteTool,
    async (task: vscode.Task, scope: vscode.TaskScope | vscode.WorkspaceFolder | undefined) => {
      if (isMultiRootWorkspace()) {
        if (scope != null && (scope as vscode.WorkspaceFolder).name != null) {
          await context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, (scope as vscode.WorkspaceFolder).name);
        }
      }

      void vscode.tasks.executeTask(task).then((execution) => {
        vscode.tasks.onDidEndTask((e) => {
          if (e.execution === execution) {
            void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
          }
        });
      });
    },
  );
}

export function createExecutePromptCommand() {
  return registerCommand(Command.ExecutePrompt, async (promptFilePath: string) => {
    if (!fs.existsSync(promptFilePath)) {
      void vscode.window.showErrorMessage(`Prompt file not found: ${promptFilePath}`);
      return;
    }

    const promptContent = fs.readFileSync(promptFilePath, 'utf8');
    const terminal = vscode.window.createTerminal({ name: 'Claude Code' });
    terminal.show();
    terminal.sendText(`claude "${promptContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  });
}
