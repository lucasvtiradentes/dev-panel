import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import JSON5 from 'json5';
import * as vscode from 'vscode';

const execAsync = promisify(exec);
import { GLOBAL_STATE_WORKSPACE_SOURCE } from '../../common/constants/constants';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, VARIABLES_FILE_NAME } from '../../common/constants/scripts-constants';
import { getPromptOutputFilePath, getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { collectInputs, replaceInputPlaceholders } from '../../common/lib/inputs';
import { createLogger } from '../../common/lib/logger';
import { Command, isMultiRootWorkspace, registerCommand } from '../../common/lib/vscode-utils';
import { type PPConfig, type PPPrompt, type PPSettings, PromptExecutionMode } from '../../common/schemas';
import { type PromptProvider, getProvider } from '../../views/prompts/providers';
import { getCurrentBranch } from '../../views/replacements/git-utils';

const log = createLogger('execute-task');

export type ExecutePromptParams = {
  promptFilePath: string;
  folder: vscode.WorkspaceFolder | null;
  promptConfig?: PPPrompt;
};

function readPPVariablesAsEnv(workspacePath: string): Record<string, string> {
  const variablesPath = `${workspacePath}/${CONFIG_DIR_NAME}/${VARIABLES_FILE_NAME}`;
  if (!fs.existsSync(variablesPath)) return {};
  try {
    const variablesContent = fs.readFileSync(variablesPath, 'utf8');
    const variables = JSON5.parse(variablesContent) as Record<string, unknown>;
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      env[key] = stringValue;
    }
    return env;
  } catch {
    return {};
  }
}

function cloneTaskWithEnv(task: vscode.Task, env: Record<string, string>): vscode.Task {
  const execution = task.execution;
  if (!execution) return task;

  let newTask: vscode.Task;

  if (execution instanceof vscode.ShellExecution) {
    const mergedEnv = { ...execution.options?.env, ...env };
    const commandLine = execution.commandLine;
    const command = execution.command;

    let newExecution: vscode.ShellExecution;
    if (commandLine) {
      newExecution = new vscode.ShellExecution(commandLine, { ...execution.options, env: mergedEnv });
    } else if (command) {
      newExecution = new vscode.ShellExecution(command, execution.args ?? [], { ...execution.options, env: mergedEnv });
    } else {
      return task;
    }

    newTask = new vscode.Task(
      task.definition,
      task.scope ?? vscode.TaskScope.Workspace,
      task.name,
      task.source,
      newExecution,
      task.problemMatchers,
    );
  } else if (execution instanceof vscode.ProcessExecution) {
    const mergedEnv = { ...execution.options?.env, ...env };
    const newExecution = new vscode.ProcessExecution(execution.process, execution.args, {
      ...execution.options,
      env: mergedEnv,
    });

    newTask = new vscode.Task(
      task.definition,
      task.scope ?? vscode.TaskScope.Workspace,
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

export function createExecuteTaskCommand(context: vscode.ExtensionContext) {
  return registerCommand(
    Command.ExecuteTask,
    async (
      task: vscode.Task,
      scope: vscode.TaskScope | vscode.WorkspaceFolder | undefined,
      taskConfig?: NonNullable<PPConfig['tasks']>[number],
    ) => {
      let modifiedTask = task;

      if (taskConfig?.inputs && taskConfig.inputs.length > 0) {
        const folder = scope && typeof scope !== 'number' && 'uri' in scope ? (scope as vscode.WorkspaceFolder) : null;
        const folderForSettings = folder ?? vscode.workspace.workspaceFolders?.[0];
        const settings = folderForSettings ? readPPSettings(folderForSettings) : undefined;

        const inputValues = await collectInputs(taskConfig.inputs, folder, settings);
        if (inputValues === null) return;

        const execution = task.execution;
        if (execution instanceof vscode.ShellExecution) {
          let commandToReplace = execution.commandLine ?? String(execution.command);
          commandToReplace = replaceInputPlaceholders(commandToReplace, inputValues);

          const newExecution = new vscode.ShellExecution(commandToReplace, execution.options);
          modifiedTask = new vscode.Task(
            task.definition,
            task.scope ?? vscode.TaskScope.Workspace,
            task.name,
            task.source,
            newExecution,
            task.problemMatchers,
          );
        }
      }

      if (scope && typeof scope !== 'number' && 'uri' in scope) {
        const folder = scope as vscode.WorkspaceFolder;
        const env = readPPVariablesAsEnv(folder.uri.fsPath);

        if (Object.keys(env).length > 0) {
          modifiedTask = cloneTaskWithEnv(modifiedTask, env);
        }
      }

      if (isMultiRootWorkspace()) {
        if (scope != null && (scope as vscode.WorkspaceFolder).name != null) {
          await context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, (scope as vscode.WorkspaceFolder).name);
        }
      }

      log.info(`Executing task: ${modifiedTask.name}`);
      log.info(`Final presentation: ${JSON.stringify(modifiedTask.presentationOptions)}`);

      void vscode.tasks.executeTask(modifiedTask).then((execution) => {
        log.info(`Task started successfully: ${modifiedTask.name}`);
        vscode.tasks.onDidEndTask((e) => {
          if (e.execution === execution) {
            log.info(`Task ended: ${modifiedTask.name}`);
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
      let modifiedTask = task;

      if (scope && typeof scope !== 'number' && 'uri' in scope) {
        const folder = scope as vscode.WorkspaceFolder;
        const env = readPPVariablesAsEnv(folder.uri.fsPath);

        if (Object.keys(env).length > 0) {
          modifiedTask = cloneTaskWithEnv(task, env);
        }
      }

      if (isMultiRootWorkspace()) {
        if (scope != null && (scope as vscode.WorkspaceFolder).name != null) {
          await context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, (scope as vscode.WorkspaceFolder).name);
        }
      }

      void vscode.tasks.executeTask(modifiedTask).then((execution) => {
        vscode.tasks.onDidEndTask((e) => {
          if (e.execution === execution) {
            void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
          }
        });
      });
    },
  );
}

function readPPSettings(folder: vscode.WorkspaceFolder): PPSettings | undefined {
  const configPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  log.debug(`readPPSettings - configPath: ${configPath}`);
  if (!fs.existsSync(configPath)) {
    log.debug('readPPSettings - config file not found');
    return undefined;
  }
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    log.debug(`readPPSettings - file read, length: ${configContent.length}`);
    const config = JSON5.parse(configContent) as PPConfig;
    log.info(`readPPSettings - settings: ${JSON.stringify(config.settings)}`);
    return config.settings;
  } catch (err) {
    log.error(`readPPSettings - error: ${err}`);
    return undefined;
  }
}

function readPPVariables(folder: vscode.WorkspaceFolder): Record<string, unknown> | null {
  const variablesPath = getWorkspaceConfigFilePath(folder, VARIABLES_FILE_NAME);
  log.debug(`readPPVariables - variablesPath: ${variablesPath}`);
  if (!fs.existsSync(variablesPath)) {
    log.debug('readPPVariables - variables file not found');
    return null;
  }
  try {
    const variablesContent = fs.readFileSync(variablesPath, 'utf8');
    const variables = JSON5.parse(variablesContent) as Record<string, unknown>;
    log.info(`readPPVariables - loaded ${Object.keys(variables).length} variables`);
    return variables;
  } catch (err) {
    log.error(`readPPVariables - error: ${err}`);
    return null;
  }
}

function replaceVariablePlaceholders(content: string, variables: Record<string, unknown>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const pattern = new RegExp(`\\$${key}`, 'g');
    result = result.replace(pattern, stringValue);
  }
  return result;
}

export function createExecutePromptCommand() {
  return registerCommand(
    Command.ExecutePrompt,
    async ({ promptFilePath, folder, promptConfig }: ExecutePromptParams) => {
      log.info('=== ExecutePrompt called ===');
      log.info(`promptFilePath: ${promptFilePath}`);
      log.info(`folder: ${folder ? folder.name : 'null (global)'}`);
      log.info(`promptConfig (from tree): ${JSON.stringify(promptConfig)}`);
      log.info(`useWorkspaceRoot: ${promptConfig?.useWorkspaceRoot}`);

      let resolvedPromptFilePath = promptFilePath;
      if (promptConfig?.useWorkspaceRoot && folder) {
        resolvedPromptFilePath = path.join(folder.uri.fsPath, promptConfig.file);
        log.info(`Resolved prompt path from workspace root: ${resolvedPromptFilePath}`);
      }

      if (!fs.existsSync(resolvedPromptFilePath)) {
        void vscode.window.showErrorMessage(`Prompt file not found: ${resolvedPromptFilePath}`);
        return;
      }

      let promptContent = fs.readFileSync(resolvedPromptFilePath, 'utf8');

      const folderForSettings = folder ?? vscode.workspace.workspaceFolders?.[0];
      const settings = folderForSettings ? readPPSettings(folderForSettings) : undefined;
      log.info(`settings: ${JSON.stringify(settings)}`);

      const variables = folder ? readPPVariables(folder) : null;
      if (variables) {
        promptContent = replaceVariablePlaceholders(promptContent, variables);
      }

      if (promptConfig?.inputs && promptConfig.inputs.length > 0) {
        log.info(`inputs from promptConfig: ${JSON.stringify(promptConfig.inputs)}`);
        const inputValues = await collectInputs(promptConfig.inputs, folder, settings);
        if (inputValues === null) return;
        promptContent = replaceInputPlaceholders(promptContent, inputValues);
      }

      const provider = getProvider(settings?.aiProvider);
      if (!provider) {
        void vscode.window.showErrorMessage(
          `AI provider not configured. Set "settings.aiProvider" in ${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME} (claude, gemini, or cursor-agent)`,
        );
        return;
      }

      if (promptConfig?.saveOutput) {
        const folderForOutput = folder ?? vscode.workspace.workspaceFolders?.[0];
        if (!folderForOutput) {
          void vscode.window.showErrorMessage('No workspace folder available to save prompt output');
          return;
        }

        await executePromptWithSave({
          promptContent,
          folder: folderForOutput,
          promptName: promptConfig.name,
          provider,
          settings,
        });
        return;
      }

      const terminal = vscode.window.createTerminal({ name: provider.name });
      terminal.show();
      provider.executeInteractive(terminal, promptContent);
    },
  );
}

async function executePromptWithSave(options: {
  promptContent: string;
  folder: vscode.WorkspaceFolder;
  promptName: string;
  provider: PromptProvider;
  settings?: PPSettings;
}): Promise<void> {
  const { promptContent, folder, promptName, provider, settings } = options;
  const workspacePath = folder.uri.fsPath;
  const branch = await getCurrentBranch(workspacePath).catch(() => 'unknown');

  const timestamped = settings?.promptExecution !== PromptExecutionMode.Overwrite;
  const outputFile = getPromptOutputFilePath(workspacePath, branch, promptName, timestamped);
  const outputDir = path.dirname(outputFile);
  const tempFile = path.join(outputDir, '.prompt-temp.txt');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(tempFile, promptContent);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Running prompt: ${promptName}`,
      cancellable: false,
    },
    async () => {
      try {
        const command = provider.getExecuteCommand(tempFile, outputFile);
        await execAsync(command, { cwd: workspacePath });
        fs.unlinkSync(tempFile);
        const doc = await vscode.workspace.openTextDocument(outputFile);
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        fs.unlinkSync(tempFile);
        const errorMessage = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Prompt failed: ${errorMessage}`);
      }
    },
  );
}
