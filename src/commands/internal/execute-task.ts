import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import JSON5 from 'json5';
import * as vscode from 'vscode';

const execAsync = promisify(exec);
import {
  Command,
  collectPromptInputs,
  createLogger,
  isMultiRootWorkspace,
  registerCommand,
  replaceInputPlaceholders,
} from '../../common';
import { GLOBAL_STATE_WORKSPACE_SOURCE } from '../../common/constants/constants';
import type { PPConfig, PPPrompt, PPSettings } from '../../common/schemas';
import { type PromptProvider, getProvider } from '../../views/prompts/providers';
import { getCurrentBranch } from '../../views/replacements/git-utils';

const log = createLogger('execute-task');

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

function readPPSettings(folder: vscode.WorkspaceFolder): PPSettings | undefined {
  const configPath = `${folder.uri.fsPath}/.pp/config.jsonc`;
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

export function createExecutePromptCommand() {
  return registerCommand(
    Command.ExecutePrompt,
    async (promptFilePath: string, folder: vscode.WorkspaceFolder, promptConfig?: PPPrompt) => {
      log.info('=== ExecutePrompt called ===');
      log.info(`promptFilePath: ${promptFilePath}`);
      log.info(`promptConfig (from tree): ${JSON.stringify(promptConfig)}`);

      if (!fs.existsSync(promptFilePath)) {
        void vscode.window.showErrorMessage(`Prompt file not found: ${promptFilePath}`);
        return;
      }

      let promptContent = fs.readFileSync(promptFilePath, 'utf8');
      const settings = readPPSettings(folder);
      log.info(`settings: ${JSON.stringify(settings)}`);

      if (promptConfig?.inputs && promptConfig.inputs.length > 0) {
        log.info(`inputs from promptConfig: ${JSON.stringify(promptConfig.inputs)}`);
        const inputValues = await collectPromptInputs(promptConfig.inputs, folder, settings);
        if (inputValues === null) return;
        promptContent = replaceInputPlaceholders(promptContent, inputValues);
      }

      const provider = getProvider(settings?.aiProvider);
      if (!provider) {
        void vscode.window.showErrorMessage(
          'AI provider not configured. Set "settings.aiProvider" in .pp/config.jsonc (claude, gemini, or cursor-agent)',
        );
        return;
      }

      if (promptConfig?.saveOutput) {
        await executePromptWithSave(promptContent, folder, promptConfig.name, provider);
      } else {
        const terminal = vscode.window.createTerminal({ name: provider.name });
        terminal.show();
        provider.executeInteractive(terminal, promptContent);
      }
    },
  );
}

async function executePromptWithSave(
  promptContent: string,
  folder: vscode.WorkspaceFolder,
  promptName: string,
  provider: PromptProvider,
): Promise<void> {
  const workspacePath = folder.uri.fsPath;
  const branch = await getCurrentBranch(workspacePath).catch(() => 'unknown');
  const safeBranch = branch.replace(/[/\\:*?"<>|]/g, '_');
  const datetime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safePromptName = promptName.replace(/[/\\:*?"<>|]/g, '_');

  const outputDir = path.join(workspacePath, '.ignore', safeBranch);
  const outputFile = path.join(outputDir, `${datetime}-${safePromptName}.md`);
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
