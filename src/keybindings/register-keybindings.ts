import * as vscode from 'vscode';
import {
  CONFIG_DIR_KEY,
  TOOL_TASK_TYPE,
  getPromptCommandId,
  getReplacementCommandId,
  getTaskCommandId,
  getToolCommandId,
  getVariableCommandId,
} from '../common/constants';
import { getWorkspaceConfigDirPath } from '../common/lib/config-manager';
import { syncKeybindings } from '../common/lib/keybindings-sync';
import { Command, executeCommand } from '../common/lib/vscode-utils';
import { forEachWorkspaceConfig } from '../common/utils/config-loader';

export function registerToolKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((folder, config) => {
    const tools = config.tools ?? [];

    for (const tool of tools) {
      if (!tool.command) continue;
      const commandId = getToolCommandId(tool.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const configDirPath = getWorkspaceConfigDirPath(folder);
        const shellExec = new vscode.ShellExecution(tool.command as string, { cwd: configDirPath });
        const task = new vscode.Task({ type: TOOL_TASK_TYPE }, folder, tool.name, TOOL_TASK_TYPE, shellExec);
        void vscode.tasks.executeTask(task);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}

export function registerPromptKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((folder, config) => {
    const prompts = config.prompts ?? [];

    for (const prompt of prompts) {
      const commandId = getPromptCommandId(prompt.name);
      const configDirPath = getWorkspaceConfigDirPath(folder);
      const promptFilePath = `${configDirPath}/${prompt.file}`;
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.ExecutePrompt, { promptFilePath, folder, promptConfig: prompt });
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}

export function registerReplacementKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((_folder, config) => {
    const replacements = config.replacements ?? [];

    for (const replacement of replacements) {
      const commandId = getReplacementCommandId(replacement.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.ToggleReplacement, replacement);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}

export function registerVariableKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((_folder, config) => {
    const variables = config.variables ?? [];

    for (const variable of variables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}

export function registerTaskKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((folder, config) => {
    const tasks = config.tasks ?? [];

    for (const task of tasks) {
      const commandId = getTaskCommandId(task.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const shellExec = new vscode.ShellExecution(task.command);
        const vsTask = new vscode.Task({ type: CONFIG_DIR_KEY }, folder, task.name, CONFIG_DIR_KEY, shellExec);
        void vscode.tasks.executeTask(vsTask);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}
