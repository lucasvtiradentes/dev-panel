import * as path from 'node:path';
import * as vscode from 'vscode';
import { type BPMPromptInput, type BPMSettings, PromptInputType, SelectionStyle } from '../schemas';
import { createLogger } from './logger';

const log = createLogger('prompt-inputs');

export type PromptInputValues = Record<string, string>;

export async function collectPromptInputs(
  inputs: BPMPromptInput[],
  workspaceFolder: vscode.WorkspaceFolder,
  settings?: BPMSettings,
): Promise<PromptInputValues | null> {
  const values: PromptInputValues = {};

  for (const input of inputs) {
    const value = await collectSingleInput(input, workspaceFolder, settings);
    if (value === undefined) return null;
    values[input.name] = value;
  }

  return values;
}

async function collectSingleInput(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  settings?: BPMSettings,
): Promise<string | undefined> {
  switch (input.type) {
    case PromptInputType.File:
      return collectFileInput(input, workspaceFolder, false, settings);
    case PromptInputType.Files:
      return collectFileInput(input, workspaceFolder, true, settings);
    case PromptInputType.Folder:
      return collectFolderInput(input, workspaceFolder, false, settings);
    case PromptInputType.Folders:
      return collectFolderInput(input, workspaceFolder, true, settings);
    case PromptInputType.Text:
      return collectTextInput(input);
    case PromptInputType.Number:
      return collectNumberInput(input);
    case PromptInputType.Confirm:
      return collectConfirmInput(input);
    case PromptInputType.Choice:
      return collectChoiceInput(input, false);
    case PromptInputType.Multichoice:
      return collectChoiceInput(input, true);
    default:
      return undefined;
  }
}

function getSelectionStyle(
  input: BPMPromptInput,
  settings: BPMSettings | undefined,
  inputType: 'file' | 'folder',
): SelectionStyle {
  log.debug(`getSelectionStyle called - inputType: ${inputType}`);
  log.debug(`input.selectionStyle: ${input.selectionStyle}`);
  log.debug(`settings: ${JSON.stringify(settings)}`);

  if (input.selectionStyle) {
    log.debug(`Using input.selectionStyle: ${input.selectionStyle}`);
    return input.selectionStyle;
  }
  if (inputType === 'folder' && settings?.promptFolderSelectionStyle) {
    log.debug(`Using settings.promptFolderSelectionStyle: ${settings.promptFolderSelectionStyle}`);
    return settings.promptFolderSelectionStyle;
  }
  if (inputType === 'file' && settings?.promptFileSelectionStyle) {
    log.debug(`Using settings.promptFileSelectionStyle: ${settings.promptFileSelectionStyle}`);
    return settings.promptFileSelectionStyle;
  }
  log.debug('Using default: flat');
  return SelectionStyle.Flat;
}

async function collectFileInput(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
  settings?: BPMSettings,
): Promise<string | undefined> {
  log.info(`collectFileInput called - multiple: ${multiple}`);
  log.debug(`input: ${JSON.stringify(input)}`);
  const style = getSelectionStyle(input, settings, 'file');
  log.info(`Resolved style: ${style}`);

  if (style === SelectionStyle.Interactive) {
    log.info('Using interactive file picker');
    return collectFileInteractive(input, workspaceFolder, multiple);
  }

  log.info('Using flat file picker');
  return collectFileFlat(input, workspaceFolder, multiple);
}

async function collectFileFlat(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
): Promise<string | undefined> {
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/*'),
    '**/node_modules/**',
    1000,
  );

  const items: vscode.QuickPickItem[] = files.map((uri) => ({
    label: vscode.workspace.asRelativePath(uri, false),
    description: uri.fsPath,
  }));

  items.sort((a, b) => a.label.localeCompare(b.label));

  if (multiple) {
    const result = await vscode.window.showQuickPick(items, {
      placeHolder: input.label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.map((item) => item.description!).join('\n');
  }

  const result = await vscode.window.showQuickPick(items, {
    placeHolder: input.label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}

async function collectFileInteractive(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
): Promise<string | undefined> {
  const selectedFiles: string[] = [];
  let currentPath = '';

  while (true) {
    const currentFullPath = currentPath
      ? path.join(workspaceFolder.uri.fsPath, currentPath)
      : workspaceFolder.uri.fsPath;

    const entries = await getDirectoryEntries(currentFullPath);
    const items: vscode.QuickPickItem[] = [];

    if (currentPath) {
      items.push({
        label: '$(arrow-left) ..',
        description: 'Go back',
        detail: 'BACK',
      });
    }

    for (const entry of entries.folders) {
      items.push({
        label: `$(folder) ${entry}`,
        description: currentPath ? `${currentPath}/${entry}` : entry,
        detail: 'FOLDER',
      });
    }

    for (const entry of entries.files) {
      const filePath = path.join(currentFullPath, entry);
      const isSelected = selectedFiles.includes(filePath);
      items.push({
        label: `$(file) ${entry}${isSelected ? ' $(check)' : ''}`,
        description: currentPath ? `${currentPath}/${entry}` : entry,
        detail: 'FILE',
      });
    }

    if (multiple && selectedFiles.length > 0) {
      items.unshift({
        label: `$(check-all) Done (${selectedFiles.length} selected)`,
        description: 'Confirm selection',
        detail: 'DONE',
      });
    }

    const placeholder = multiple
      ? `${input.label} (${selectedFiles.length} selected) - Current: ${currentPath || '.'}`
      : `${input.label} - Current: ${currentPath || '.'}`;

    const result = await vscode.window.showQuickPick(items, {
      placeHolder: placeholder,
      ignoreFocusOut: true,
    });

    if (!result) return undefined;

    if (result.detail === 'DONE') {
      return selectedFiles.join('\n');
    }

    if (result.detail === 'BACK') {
      currentPath = path.dirname(currentPath);
      if (currentPath === '.') currentPath = '';
      continue;
    }

    if (result.detail === 'FOLDER') {
      currentPath = result.description!;
      continue;
    }

    if (result.detail === 'FILE') {
      const filePath = path.join(workspaceFolder.uri.fsPath, result.description!);

      if (multiple) {
        const index = selectedFiles.indexOf(filePath);
        if (index >= 0) {
          selectedFiles.splice(index, 1);
        } else {
          selectedFiles.push(filePath);
        }
        continue;
      }

      return filePath;
    }
  }
}

async function collectFolderInput(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
  settings?: BPMSettings,
): Promise<string | undefined> {
  const style = getSelectionStyle(input, settings, 'folder');

  if (style === SelectionStyle.Interactive) {
    return collectFolderInteractive(input, workspaceFolder, multiple);
  }

  return collectFolderFlat(input, workspaceFolder, multiple);
}

async function collectFolderFlat(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
): Promise<string | undefined> {
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/*'),
    '**/node_modules/**',
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

  if (multiple) {
    const result = await vscode.window.showQuickPick(items, {
      placeHolder: input.label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.map((item) => item.description!).join('\n');
  }

  const result = await vscode.window.showQuickPick(items, {
    placeHolder: input.label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}

async function collectFolderInteractive(
  input: BPMPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
): Promise<string | undefined> {
  const selectedFolders: string[] = [];
  let currentPath = '';

  while (true) {
    const currentFullPath = currentPath
      ? path.join(workspaceFolder.uri.fsPath, currentPath)
      : workspaceFolder.uri.fsPath;

    const entries = await getDirectoryEntries(currentFullPath);
    const items: vscode.QuickPickItem[] = [];

    if (currentPath) {
      items.push({
        label: '$(arrow-left) ..',
        description: 'Go back',
        detail: 'BACK',
      });
    }

    const currentFolderPath = currentFullPath;
    const isCurrentSelected = selectedFolders.includes(currentFolderPath);

    items.push({
      label: `$(check) Select this folder${isCurrentSelected ? ' (selected)' : ''}`,
      description: currentPath || '.',
      detail: 'SELECT',
    });

    for (const entry of entries.folders) {
      const folderFullPath = path.join(currentFullPath, entry);
      const isSelected = selectedFolders.includes(folderFullPath);
      items.push({
        label: `$(folder) ${entry}${isSelected ? ' $(check)' : ''}`,
        description: currentPath ? `${currentPath}/${entry}` : entry,
        detail: 'FOLDER',
      });
    }

    if (multiple && selectedFolders.length > 0) {
      items.unshift({
        label: `$(check-all) Done (${selectedFolders.length} selected)`,
        description: 'Confirm selection',
        detail: 'DONE',
      });
    }

    const placeholder = multiple
      ? `${input.label} (${selectedFolders.length} selected) - Current: ${currentPath || '.'}`
      : `${input.label} - Current: ${currentPath || '.'}`;

    const result = await vscode.window.showQuickPick(items, {
      placeHolder: placeholder,
      ignoreFocusOut: true,
    });

    if (!result) return undefined;

    if (result.detail === 'DONE') {
      return selectedFolders.join('\n');
    }

    if (result.detail === 'BACK') {
      currentPath = path.dirname(currentPath);
      if (currentPath === '.') currentPath = '';
      continue;
    }

    if (result.detail === 'SELECT') {
      if (multiple) {
        const index = selectedFolders.indexOf(currentFolderPath);
        if (index >= 0) {
          selectedFolders.splice(index, 1);
        } else {
          selectedFolders.push(currentFolderPath);
        }
        continue;
      }
      return currentFolderPath;
    }

    if (result.detail === 'FOLDER') {
      currentPath = result.description!;
    }
  }
}

async function getDirectoryEntries(dirPath: string): Promise<{ folders: string[]; files: string[] }> {
  const folders: string[] = [];
  const files: string[] = [];

  try {
    const uri = vscode.Uri.file(dirPath);
    const entries = await vscode.workspace.fs.readDirectory(uri);

    for (const [name, type] of entries) {
      if (name.startsWith('.') || name === 'node_modules') continue;

      if (type === vscode.FileType.Directory) {
        folders.push(name);
      } else if (type === vscode.FileType.File) {
        files.push(name);
      }
    }

    folders.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));
  } catch {
    // ignore errors
  }

  return { folders, files };
}

async function collectTextInput(input: BPMPromptInput): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
  });
}

async function collectNumberInput(input: BPMPromptInput): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (value && Number.isNaN(Number(value))) {
        return 'Please enter a valid number';
      }
      return null;
    },
  });
}

async function collectConfirmInput(input: BPMPromptInput): Promise<string | undefined> {
  const result = await vscode.window.showQuickPick(['Yes', 'No'], {
    placeHolder: input.label,
    ignoreFocusOut: true,
  });
  if (!result) return undefined;
  return result === 'Yes' ? 'true' : 'false';
}

async function collectChoiceInput(input: BPMPromptInput, multiple: boolean): Promise<string | undefined> {
  if (!input.options || input.options.length === 0) return undefined;

  if (multiple) {
    const result = await vscode.window.showQuickPick(input.options, {
      placeHolder: input.label,
      canPickMany: true,
      ignoreFocusOut: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.join('\n');
  }

  return vscode.window.showQuickPick(input.options, {
    placeHolder: input.label,
    canPickMany: false,
    ignoreFocusOut: true,
  });
}

export function replaceInputPlaceholders(content: string, values: PromptInputValues): string {
  let result = content;
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
  }
  return result;
}
