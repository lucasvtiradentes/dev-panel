import * as vscode from 'vscode';
import { DEFAULT_EXCLUDES } from '../constants';
import { createLogger } from './logger';

const log = createLogger('file-selection');

export type FileSelectionOptions = {
  label: string;
  multiSelect?: boolean;
  excludes?: string[];
};

function buildExcludeGlob(excludes: string[]): string {
  return `{${excludes.join(',')}}`;
}

export async function selectFiles(
  workspaceFolder: vscode.WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  log.info(`selectFiles - multiSelect: ${options.multiSelect ?? false}`);
  return selectFilesFlat(workspaceFolder, options.label, options.multiSelect ?? false, excludes);
}

async function selectFilesFlat(
  workspaceFolder: vscode.WorkspaceFolder,
  label: string,
  multiSelect: boolean,
  excludes: string[],
): Promise<string | undefined> {
  const excludeGlob = buildExcludeGlob(excludes);
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/*'),
    excludeGlob,
    1000,
  );

  const items: vscode.QuickPickItem[] = files.map((uri) => ({
    label: vscode.workspace.asRelativePath(uri, false),
    description: uri.fsPath,
  }));

  items.sort((a, b) => a.label.localeCompare(b.label));

  if (multiSelect) {
    const result = await vscode.window.showQuickPick(items, {
      placeHolder: label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.map((item) => item.description!).join('\n');
  }

  const result = await vscode.window.showQuickPick(items, {
    placeHolder: label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}

export async function selectFolders(
  workspaceFolder: vscode.WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  log.info(`selectFolders - multiSelect: ${options.multiSelect ?? false}`);
  return selectFoldersFlat(workspaceFolder, options.label, options.multiSelect ?? false, excludes);
}

async function selectFoldersFlat(
  workspaceFolder: vscode.WorkspaceFolder,
  label: string,
  multiSelect: boolean,
  excludes: string[],
): Promise<string | undefined> {
  const excludeGlob = buildExcludeGlob(excludes);
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/*'),
    excludeGlob,
    2000,
  );

  const folderSet = new Set<string>();
  for (const file of files) {
    const relativePath = vscode.workspace.asRelativePath(file, false);
    const parts = relativePath.split('/');
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      folderSet.add(currentPath);
    }
  }

  const folders = Array.from(folderSet).sort();
  const items: vscode.QuickPickItem[] = folders.map((folder) => ({
    label: folder,
    description: `${workspaceFolder.uri.fsPath}/${folder}`,
  }));

  items.unshift({
    label: '.',
    description: workspaceFolder.uri.fsPath,
  });

  if (multiSelect) {
    const result = await vscode.window.showQuickPick(items, {
      placeHolder: label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.map((item) => item.description!).join('\n');
  }

  const result = await vscode.window.showQuickPick(items, {
    placeHolder: label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}
