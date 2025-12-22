import { isAbsolute, join } from 'node:path';
import * as vscode from 'vscode';
import { CONFIG_DIR_NAME } from '../constants';
import { BRANCHES_DIR_NAME, BRANCH_CONTEXT_FILENAME, PROMPTS_DIR_NAME } from '../constants/scripts-constants';
import { StoreKey, extensionStore } from './extension-store';

export function getConfigBaseDir(workspacePath: string, configDir: string | null): string {
  if (!configDir) {
    return workspacePath;
  }

  if (isAbsolute(configDir)) {
    return configDir;
  }

  return join(workspacePath, configDir);
}

function getConfigDir(workspacePath: string, configDir: string | null): vscode.Uri {
  const baseDir = vscode.Uri.file(workspacePath);

  if (!configDir) {
    return vscode.Uri.joinPath(baseDir, CONFIG_DIR_NAME);
  }

  const customDir = isAbsolute(configDir) ? vscode.Uri.file(configDir) : vscode.Uri.joinPath(baseDir, configDir);
  return vscode.Uri.joinPath(customDir, CONFIG_DIR_NAME);
}

export function getConfigPath(workspacePath: string, configDir: string | null, fileName: string): string {
  return vscode.Uri.joinPath(getConfigDir(workspacePath, configDir), fileName).fsPath;
}

export function getConfigDirPath(workspacePath: string, configDir: string | null): string {
  return getConfigDir(workspacePath, configDir).fsPath;
}

export async function hasConfig(workspacePath: string, configDir: string | null, fileName: string): Promise<boolean> {
  const configPath = vscode.Uri.file(getConfigPath(workspacePath, configDir, fileName));
  try {
    await vscode.workspace.fs.stat(configPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectoryRecursive(source: vscode.Uri, target: vscode.Uri): Promise<void> {
  await vscode.workspace.fs.createDirectory(target);

  const entries = await vscode.workspace.fs.readDirectory(source);
  for (const [name, type] of entries) {
    const sourceEntry = vscode.Uri.joinPath(source, name);
    const targetEntry = vscode.Uri.joinPath(target, name);

    if (type === vscode.FileType.Directory) {
      await copyDirectoryRecursive(sourceEntry, targetEntry);
    } else {
      await vscode.workspace.fs.copy(sourceEntry, targetEntry, { overwrite: true });
    }
  }
}

export async function moveConfig(
  workspacePath: string,
  fromConfigDir: string | null,
  toConfigDir: string | null,
): Promise<void> {
  const sourceDir = getConfigDir(workspacePath, fromConfigDir);
  const targetDir = getConfigDir(workspacePath, toConfigDir);

  await copyDirectoryRecursive(sourceDir, targetDir);
  await vscode.workspace.fs.delete(sourceDir, { recursive: true });
}

export function getConfigDirLabel(configDir: string | null): string {
  return configDir ? `${configDir}/${CONFIG_DIR_NAME}` : CONFIG_DIR_NAME;
}

export function getCurrentConfigDir(): string | null {
  return extensionStore.get(StoreKey.ConfigDir);
}

export function setConfigDir(configDir: string | null): void {
  extensionStore.set(StoreKey.ConfigDir, configDir);
}

export function getWorkspaceConfigDirPath(folder: vscode.WorkspaceFolder): string {
  const configDir = getCurrentConfigDir();
  return getConfigDirPath(folder.uri.fsPath, configDir);
}

export function getWorkspaceConfigFilePath(folder: vscode.WorkspaceFolder, fileName: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigPath(folder.uri.fsPath, configDir, fileName);
}

export function joinConfigPath(folder: vscode.WorkspaceFolder, ...segments: string[]): string {
  const configDir = getCurrentConfigDir();
  const basePath = getConfigDirPath(folder.uri.fsPath, configDir);
  return join(basePath, ...segments);
}

export function getConfigDirPathFromWorkspacePath(workspacePath: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigDirPath(workspacePath, configDir);
}

export function getConfigFilePathFromWorkspacePath(workspacePath: string, fileName: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigPath(workspacePath, configDir, fileName);
}

export function getConfigDirPattern(): string {
  const configDir = getCurrentConfigDir();
  if (!configDir) {
    return CONFIG_DIR_NAME;
  }
  return `${configDir}/${CONFIG_DIR_NAME}`;
}

export function getBranchDirectory(workspace: string, branchName: string): string {
  const sanitized = branchName.replace(/[\/\\:*?"<>|]/g, '_');
  const configDirPath = getConfigDirPathFromWorkspacePath(workspace);
  return join(configDirPath, BRANCHES_DIR_NAME, sanitized);
}

export function getBranchContextFilePath(workspace: string, branchName: string): string {
  return join(getBranchDirectory(workspace, branchName), BRANCH_CONTEXT_FILENAME);
}

export function getBranchContextGlobPattern(): string {
  const configDirPattern = getConfigDirPattern();
  return `${configDirPattern}/${BRANCHES_DIR_NAME}/*/${BRANCH_CONTEXT_FILENAME}`;
}

export function getBranchPromptsDirectory(workspace: string, branchName: string): string {
  return join(getBranchDirectory(workspace, branchName), PROMPTS_DIR_NAME);
}

export function getPromptOutputFilePath(
  workspace: string,
  branchName: string,
  promptName: string,
  timestamped: boolean,
): string {
  const promptsDir = getBranchPromptsDirectory(workspace, branchName);
  const safePromptName = promptName.replace(/[/\\:*?"<>|]/g, '_');

  if (timestamped) {
    const datetime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return join(promptsDir, `${safePromptName}-${datetime}.md`);
  }

  return join(promptsDir, `${safePromptName}.md`);
}
