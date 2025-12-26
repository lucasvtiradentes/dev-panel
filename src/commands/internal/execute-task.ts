import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type {
  ExtensionContext,
  ShellExecution,
  Task,
  TaskScope,
  WorkspaceFolder,
} from '../../common/vscode/vscode-types';

const execAsync = promisify(exec);
import { GLOBAL_ITEM_PREFIX, GLOBAL_STATE_WORKSPACE_SOURCE } from '../../common/constants/constants';
import {
  CONFIG_DIR_KEY,
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  VARIABLES_FILE_NAME,
  getGlobalConfigDir,
} from '../../common/constants/scripts-constants';
import {
  getPromptOutputFilePath,
  getWorkspaceConfigDirPath,
  getWorkspaceConfigFilePath,
  loadGlobalConfig,
  loadWorkspaceConfig,
} from '../../common/lib/config-manager';
import { collectInputs, replaceInputPlaceholders } from '../../common/lib/inputs';
import { createLogger } from '../../common/lib/logger';
import { Command, isMultiRootWorkspace, registerCommand } from '../../common/lib/vscode-utils';
import {
  type DevPanelConfig,
  type DevPanelPrompt,
  type DevPanelSettings,
  PromptExecutionMode,
  getAIProvidersListFormatted,
} from '../../common/schemas';
import { TypeGuards } from '../../common/utils/type-utils';
import { loadVariablesFromPath } from '../../common/utils/variables-env';
import { getFirstWorkspaceFolder } from '../../common/utils/workspace-utils';
import { type PromptProvider, getProvider } from '../../views/prompts/providers';
import { getCurrentBranch } from '../../views/replacements/git-utils';
import { TreeTool } from '../../views/tools/items';

const log = createLogger('execute-task');

export type ExecutePromptParams = {
  promptFilePath: string;
  folder: WorkspaceFolder | null;
  promptConfig?: DevPanelPrompt;
};

function readDevPanelVariablesAsEnv(workspacePath: string): Record<string, string> {
  const variablesPath = `${workspacePath}/${CONFIG_DIR_NAME}/${VARIABLES_FILE_NAME}`;
  const variables = loadVariablesFromPath(variablesPath);
  if (!variables) return {};

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = TypeGuards.isObject(value) ? JSON.stringify(value) : String(value);
    env[key] = stringValue;
  }
  return env;
}

function cloneTaskWithEnv(task: Task, env: Record<string, string>): Task {
  const execution = task.execution;
  if (!execution) return task;

  let newTask: Task;

  if (execution instanceof vscode.ShellExecution) {
    const mergedEnv = { ...execution.options?.env, ...env };
    const commandLine = execution.commandLine;
    const command = execution.command;

    let newExecution: ShellExecution;
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
    newTask.presentationOptions = task.presentationOptions;
    return newTask;
  }

  if (execution instanceof vscode.ProcessExecution) {
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
    newTask.presentationOptions = task.presentationOptions;
    return newTask;
  }

  return task;
}

export function createExecuteTaskCommand(context: ExtensionContext) {
  return registerCommand(
    Command.ExecuteTask,
    async (
      task: Task,
      scope: TaskScope | vscode.WorkspaceFolder | undefined,
      taskConfig?: NonNullable<DevPanelConfig['tasks']>[number],
    ) => {
      let modifiedTask = task;

      if (taskConfig?.inputs && taskConfig.inputs.length > 0) {
        const folder = scope && typeof scope !== 'number' && 'uri' in scope ? (scope as vscode.WorkspaceFolder) : null;
        const folderForSettings = folder ?? getFirstWorkspaceFolder();
        const settings = folderForSettings ? readDevPanelSettings(folderForSettings) : undefined;

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
        const env = readDevPanelVariablesAsEnv(folder.uri.fsPath);

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

export function createExecuteToolCommand(context: ExtensionContext) {
  return registerCommand(Command.ExecuteTool, (item: TreeTool | vscode.Task) => {
    if (item instanceof TreeTool) {
      const toolName = item.toolName;
      const isGlobal = toolName.startsWith(GLOBAL_ITEM_PREFIX);
      const actualName = isGlobal ? toolName.replace(GLOBAL_ITEM_PREFIX, '') : toolName;

      let toolConfig: { command?: string; useWorkspaceRoot?: boolean } | undefined;
      let cwd: string;
      let env: Record<string, string> = {};

      const globalConfig = loadGlobalConfig();
      const folder = getFirstWorkspaceFolder();

      if (isGlobal) {
        toolConfig = globalConfig?.tools?.find((t) => t.name === actualName);
        cwd = folder ? folder.uri.fsPath : getGlobalConfigDir();
        env = readDevPanelVariablesAsEnv(getGlobalConfigDir());
      } else {
        if (!folder) {
          void VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
          return;
        }
        const config = loadWorkspaceConfig(folder);
        toolConfig = config?.tools?.find((t) => t.name === actualName);
        const configDirPath = getWorkspaceConfigDirPath(folder);
        cwd = toolConfig?.useWorkspaceRoot ? folder.uri.fsPath : configDirPath;
        env = readDevPanelVariablesAsEnv(configDirPath);
      }

      if (!toolConfig?.command) {
        void VscodeHelper.showToastMessage(ToastKind.Error, `Tool "${actualName}" has no command configured`);
        return;
      }

      const shellExec = new vscode.ShellExecution(toolConfig.command, { env, cwd });
      const vsTask = new vscode.Task(
        { type: `${CONFIG_DIR_KEY}-tool`, task: actualName },
        folder ?? vscode.TaskScope.Global,
        actualName,
        `${CONFIG_DIR_KEY}-tool`,
        shellExec,
      );

      vsTask.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        panel: vscode.TaskPanelKind.New,
        clear: false,
        focus: false,
        showReuseMessage: false,
      };

      void vscode.tasks.executeTask(vsTask);
      return;
    }

    const task = item as vscode.Task;
    void vscode.tasks.executeTask(task).then((execution) => {
      vscode.tasks.onDidEndTask((e) => {
        if (e.execution === execution) {
          void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
        }
      });
    });
  });
}

function readDevPanelSettings(folder: WorkspaceFolder): DevPanelSettings | undefined {
  const config = loadWorkspaceConfig(folder);
  if (!config) {
    log.debug('readDevPanelSettings - config file not found or failed to parse');
    return undefined;
  }
  log.info(`readDevPanelSettings - settings: ${JSON.stringify(config.settings)}`);
  return config.settings;
}

function readDevPanelVariables(folder: WorkspaceFolder): Record<string, unknown> | null {
  const variablesPath = getWorkspaceConfigFilePath(folder, VARIABLES_FILE_NAME);
  log.debug(`readDevPanelVariables - variablesPath: ${variablesPath}`);
  const variables = loadVariablesFromPath(variablesPath);
  if (!variables) {
    log.debug('readDevPanelVariables - variables file not found or failed to parse');
    return null;
  }
  log.info(`readDevPanelVariables - loaded ${Object.keys(variables).length} variables`);
  return variables;
}

function replaceVariablePlaceholders(content: string, variables: Record<string, unknown>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = TypeGuards.isObject(value) ? JSON.stringify(value) : String(value);
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
        void VscodeHelper.showToastMessage(ToastKind.Error, `Prompt file not found: ${resolvedPromptFilePath}`);
        return;
      }

      let promptContent = fs.readFileSync(resolvedPromptFilePath, 'utf8');

      const folderForSettings = folder ?? getFirstWorkspaceFolder();
      const settings = folderForSettings ? readDevPanelSettings(folderForSettings) : undefined;
      log.info(`settings: ${JSON.stringify(settings)}`);

      const variables = folder ? readDevPanelVariables(folder) : null;
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
        void VscodeHelper.showToastMessage(
          ToastKind.Error,
          `AI provider not configured. Set "settings.aiProvider" in ${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME} (${getAIProvidersListFormatted()})`,
        );
        return;
      }

      if (promptConfig?.saveOutput) {
        const folderForOutput = folder ?? getFirstWorkspaceFolder();
        if (!folderForOutput) {
          void VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder available to save prompt output');
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

      const terminal = VscodeHelper.createTerminal({ name: provider.name });
      terminal.show();
      provider.executeInteractive(terminal, promptContent);
    },
  );
}

async function executePromptWithSave(options: {
  promptContent: string;
  folder: WorkspaceFolder;
  promptName: string;
  provider: PromptProvider;
  settings?: DevPanelSettings;
}) {
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

  await VscodeHelper.withProgress(
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
        await VscodeHelper.openDocument(vscode.Uri.file(outputFile));
      } catch (error: unknown) {
        fs.unlinkSync(tempFile);
        void VscodeHelper.showToastMessage(ToastKind.Error, `Prompt failed: ${TypeGuards.getErrorMessage(error)}`);
      }
    },
  );
}
