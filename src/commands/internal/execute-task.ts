import { execAsync } from 'src/common/functions/exec-async';
import { GLOBAL_ITEM_PREFIX, GLOBAL_STATE_WORKSPACE_SOURCE } from '../../common/constants/constants';
import {
  CONFIG_DIR_KEY,
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  getGlobalConfigDir,
} from '../../common/constants/scripts-constants';
import { GitHelper } from '../../common/lib/git-helper';
import { createLogger } from '../../common/lib/logger';
import { FileIOHelper, NodePathHelper } from '../../common/lib/node-helper';
import { TypeGuardsHelper } from '../../common/lib/type-guards-helper';
import {
  type DevPanelConfig,
  type DevPanelPrompt,
  type DevPanelSettings,
  PromptExecutionMode,
  getAIProvidersListFormatted,
} from '../../common/schemas';
import { ConfigManager } from '../../common/utils/config-manager';
import { TaskUtils } from '../../common/utils/task-utils';
import { loadVariablesFromPath, readDevPanelVariablesAsEnv } from '../../common/utils/variables-env';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import { collectInputs, replaceInputPlaceholders } from '../../common/vscode/vscode-inputs';
import {
  type ExtensionContext,
  ShellExecutionClass,
  type Task,
  type TaskScope,
  type WorkspaceFolder,
} from '../../common/vscode/vscode-types';
import { Command, isMultiRootWorkspace, registerCommand } from '../../common/vscode/vscode-utils';
import { getFirstWorkspaceFolder } from '../../common/vscode/workspace-utils';
import { type PromptProvider, getProvider } from '../../views/prompts/providers';
import { TreeTool } from '../../views/tools/items';

const log = createLogger('execute-task');

export type ExecutePromptParams = {
  promptFilePath: string;
  folder: WorkspaceFolder | null;
  promptConfig?: DevPanelPrompt;
};

async function handleExecuteTask(
  context: ExtensionContext,
  task: Task,
  scope: TaskScope | WorkspaceFolder | undefined,
  taskConfig?: NonNullable<DevPanelConfig['tasks']>[number],
) {
  let modifiedTask = task;

  if (taskConfig?.inputs && taskConfig.inputs.length > 0) {
    const folder = scope && typeof scope !== 'number' && 'uri' in scope ? (scope as WorkspaceFolder) : null;
    const folderForSettings = folder ?? getFirstWorkspaceFolder();
    const settings = folderForSettings ? ConfigManager.readSettings(folderForSettings) : undefined;

    const inputValues = await collectInputs(taskConfig.inputs, folder, settings);
    if (inputValues === null) return;

    const execution = task.execution;
    if (execution instanceof ShellExecutionClass) {
      let commandToReplace = execution.commandLine ?? String(execution.command);
      commandToReplace = replaceInputPlaceholders(commandToReplace, inputValues);

      const newExecution = VscodeHelper.createShellExecution(commandToReplace, execution.options);
      modifiedTask = VscodeHelper.createTask(
        task.definition,
        task.scope ?? VscodeConstants.TaskScope.Workspace,
        task.name,
        task.source,
        newExecution,
        task.problemMatchers,
      );
    }
  }

  if (scope && typeof scope !== 'number' && 'uri' in scope) {
    const folder = scope as WorkspaceFolder;
    const variablesPath = ConfigManager.getWorkspaceVariablesPath(folder);
    const env = readDevPanelVariablesAsEnv(variablesPath);

    if (Object.keys(env).length > 0) {
      modifiedTask = TaskUtils.cloneWithEnv(modifiedTask, env);
    }
  }

  if (isMultiRootWorkspace()) {
    if (scope != null && (scope as WorkspaceFolder).name != null) {
      await context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, (scope as WorkspaceFolder).name);
    }
  }

  log.info(`Executing task: ${modifiedTask.name}`);
  log.info(`Final presentation: ${JSON.stringify(modifiedTask.presentationOptions)}`);

  void VscodeHelper.executeTask(modifiedTask).then((execution) => {
    log.info(`Task started successfully: ${modifiedTask.name}`);
    VscodeHelper.onDidEndTask((e) => {
      if (e.execution === execution) {
        log.info(`Task ended: ${modifiedTask.name}`);
        void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
      }
    });
  });
}

export function createExecuteTaskCommand(context: ExtensionContext) {
  return registerCommand(Command.ExecuteTask, (task, scope, taskConfig) =>
    handleExecuteTask(context, task, scope, taskConfig),
  );
}

function handleExecuteTool(context: ExtensionContext, item: TreeTool | Task) {
  if (item instanceof TreeTool) {
    const toolName = item.toolName;
    const isGlobal = toolName.startsWith(GLOBAL_ITEM_PREFIX);
    const actualName = isGlobal ? toolName.replace(GLOBAL_ITEM_PREFIX, '') : toolName;

    let toolConfig: { command?: string; useWorkspaceRoot?: boolean } | undefined;
    let cwd: string;
    let env: Record<string, string> = {};

    const globalConfig = ConfigManager.loadGlobalConfig();
    const folder = getFirstWorkspaceFolder();

    if (isGlobal) {
      toolConfig = globalConfig?.tools?.find((t) => t.name === actualName);
      cwd = folder ? folder.uri.fsPath : getGlobalConfigDir();
      env = readDevPanelVariablesAsEnv(NodePathHelper.join(getGlobalConfigDir(), 'variables.json5'));
    } else {
      if (!folder) {
        void VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
        return;
      }
      const config = ConfigManager.loadWorkspaceConfig(folder);
      toolConfig = config?.tools?.find((t) => t.name === actualName);
      const configDirPath = ConfigManager.getWorkspaceConfigDirPath(folder);
      cwd = toolConfig?.useWorkspaceRoot ? folder.uri.fsPath : configDirPath;
      env = readDevPanelVariablesAsEnv(ConfigManager.getWorkspaceVariablesPath(folder));
    }

    if (!toolConfig?.command) {
      void VscodeHelper.showToastMessage(ToastKind.Error, `Tool "${actualName}" has no command configured`);
      return;
    }

    const shellExec = VscodeHelper.createShellExecution(toolConfig.command, { env, cwd });
    const vsTask = VscodeHelper.createTask(
      { type: `${CONFIG_DIR_KEY}-tool`, task: actualName },
      folder ?? VscodeConstants.TaskScope.Global,
      actualName,
      `${CONFIG_DIR_KEY}-tool`,
      shellExec,
    );

    vsTask.presentationOptions = {
      reveal: VscodeConstants.TaskRevealKind.Always,
      panel: VscodeConstants.TaskPanelKind.New,
      clear: false,
      focus: false,
      showReuseMessage: false,
    };

    void VscodeHelper.executeTask(vsTask);
    return;
  }

  const task = item as Task;
  void VscodeHelper.executeTask(task).then((execution) => {
    VscodeHelper.onDidEndTask((e) => {
      if (e.execution === execution) {
        void context.globalState.update(GLOBAL_STATE_WORKSPACE_SOURCE, null);
      }
    });
  });
}

export function createExecuteToolCommand(context: ExtensionContext) {
  return registerCommand(Command.ExecuteTool, (item) => handleExecuteTool(context, item));
}

async function handleExecutePrompt({ promptFilePath, folder, promptConfig }: ExecutePromptParams) {
  log.info('=== ExecutePrompt called ===');
  log.info(`promptFilePath: ${promptFilePath}`);
  log.info(`folder: ${folder ? folder.name : 'null (global)'}`);
  log.info(`promptConfig (from tree): ${JSON.stringify(promptConfig)}`);
  log.info(`useWorkspaceRoot: ${promptConfig?.useWorkspaceRoot}`);

  let resolvedPromptFilePath = promptFilePath;
  if (promptConfig?.useWorkspaceRoot && folder) {
    resolvedPromptFilePath = NodePathHelper.join(folder.uri.fsPath, promptConfig.file);
    log.info(`Resolved prompt path from workspace root: ${resolvedPromptFilePath}`);
  }

  if (!FileIOHelper.fileExists(resolvedPromptFilePath)) {
    void VscodeHelper.showToastMessage(ToastKind.Error, `Prompt file not found: ${resolvedPromptFilePath}`);
    return;
  }

  let promptContent = FileIOHelper.readFile(resolvedPromptFilePath);

  const folderForSettings = folder ?? getFirstWorkspaceFolder();
  const settings = folderForSettings ? ConfigManager.readSettings(folderForSettings) : undefined;
  log.info(`settings: ${JSON.stringify(settings)}`);

  const variables = folder ? loadVariablesFromPath(ConfigManager.getWorkspaceVariablesPath(folder)) : null;
  if (variables) {
    promptContent = TaskUtils.replaceVariablePlaceholders(promptContent, variables);
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
  const branch = await GitHelper.getCurrentBranch(workspacePath).catch(() => 'unknown');

  const timestamped = settings?.promptExecution !== PromptExecutionMode.Overwrite;
  const outputFile = ConfigManager.getPromptOutputFilePath(workspacePath, branch, promptName, timestamped);
  const outputDir = NodePathHelper.dirname(outputFile);
  const tempFile = NodePathHelper.join(outputDir, '.prompt-temp.txt');

  FileIOHelper.ensureDirectoryExists(outputDir);

  FileIOHelper.writeFile(tempFile, promptContent);

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Running prompt: ${promptName}`,
      cancellable: false,
    },
    async () => {
      try {
        const command = provider.getExecuteCommand(tempFile, outputFile);
        await execAsync(command, { cwd: workspacePath });
        FileIOHelper.deleteFile(tempFile);
        await VscodeHelper.openDocument(VscodeHelper.createFileUri(outputFile));
      } catch (error: unknown) {
        FileIOHelper.deleteFile(tempFile);
        void VscodeHelper.showToastMessage(
          ToastKind.Error,
          `Prompt failed: ${TypeGuardsHelper.getErrorMessage(error)}`,
        );
      }
    },
  );
}

export function createExecutePromptCommand() {
  return registerCommand(Command.ExecutePrompt, handleExecutePrompt);
}
