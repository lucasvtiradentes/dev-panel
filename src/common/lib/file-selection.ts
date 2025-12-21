import * as path from 'node:path';
import * as vscode from 'vscode';
import { DEFAULT_EXCLUDES } from '../constants';
import { SelectionStyle } from '../schemas';
import { createLogger } from './logger';

const log = createLogger('file-selection');

const ItemTag = {
  Back: Symbol('back'),
  Done: Symbol('done'),
  Folder: Symbol('folder'),
  File: Symbol('file'),
  SelectCurrent: Symbol('select-current'),
} as const;

type ItemTag = (typeof ItemTag)[keyof typeof ItemTag];

interface TaggedQuickPickItem extends vscode.QuickPickItem {
  tag?: ItemTag;
}

function createItem(label: string, description: string, tag: ItemTag): TaggedQuickPickItem {
  return { label, description, tag };
}

function hasTag(item: TaggedQuickPickItem | undefined, tag: ItemTag): boolean {
  return item?.tag === tag;
}

export interface FileSelectionOptions {
  label: string;
  multiSelect?: boolean;
  selectionStyle?: SelectionStyle;
  excludes?: string[];
}

function buildExcludeGlob(excludes: string[]): string {
  return `{${excludes.join(',')}}`;
}

function shouldExclude(name: string, excludes: string[]): boolean {
  for (const pattern of excludes) {
    const simpleName = pattern
      .replace(/\*\*\//g, '')
      .replace(/\/\*\*/g, '')
      .replace(/\*/g, '');
    if (simpleName && name === simpleName) return true;
    if (simpleName && name.startsWith('.') && pattern.includes('**/.*')) return true;
  }
  if (name.startsWith('.')) return true;
  return false;
}

async function getDirectoryEntries(
  dirPath: string,
  excludes: string[],
): Promise<{ folders: string[]; files: string[] }> {
  const folders: string[] = [];
  const files: string[] = [];

  try {
    const uri = vscode.Uri.file(dirPath);
    const entries = await vscode.workspace.fs.readDirectory(uri);

    for (const [name, type] of entries) {
      if (shouldExclude(name, excludes)) continue;

      if (type === vscode.FileType.Directory) {
        folders.push(name);
      } else if (type === vscode.FileType.File) {
        files.push(name);
      }
    }

    folders.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));
  } catch {}

  return { folders, files };
}

export async function selectFiles(
  workspaceFolder: vscode.WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  const style = options.selectionStyle ?? SelectionStyle.Flat;

  log.info(`selectFiles - style: ${style}, multiSelect: ${options.multiSelect ?? false}`);

  if (style === SelectionStyle.Interactive) {
    return selectFilesInteractive(workspaceFolder, options.label, options.multiSelect ?? false, excludes);
  }

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

async function selectFilesInteractive(
  workspaceFolder: vscode.WorkspaceFolder,
  label: string,
  multiSelect: boolean,
  excludes: string[],
): Promise<string | undefined> {
  const selectedFiles: string[] = [];
  let currentPath = '';

  while (true) {
    const currentFullPath = currentPath
      ? path.join(workspaceFolder.uri.fsPath, currentPath)
      : workspaceFolder.uri.fsPath;

    const entries = await getDirectoryEntries(currentFullPath, excludes);
    const items: TaggedQuickPickItem[] = [];

    if (currentPath) {
      items.push(createItem('$(arrow-left) ..', 'Go back', ItemTag.Back));
    }

    for (const entry of entries.folders) {
      const desc = currentPath ? `${currentPath}/${entry}` : entry;
      items.push(createItem(`$(folder) ${entry}`, desc, ItemTag.Folder));
    }

    for (const entry of entries.files) {
      const filePath = path.join(currentFullPath, entry);
      const isSelected = selectedFiles.includes(filePath);
      const desc = currentPath ? `${currentPath}/${entry}` : entry;
      items.push(createItem(`$(file) ${entry}${isSelected ? ' $(check)' : ''}`, desc, ItemTag.File));
    }

    if (multiSelect && selectedFiles.length > 0) {
      items.unshift(
        createItem(`$(check-all) Done (${selectedFiles.length} selected)`, 'Confirm selection', ItemTag.Done),
      );
    }

    const placeholder = multiSelect
      ? `${label} (${selectedFiles.length} selected) - Current: ${currentPath ?? '.'}`
      : `${label} - Current: ${currentPath ?? '.'}`;

    const result = await vscode.window.showQuickPick<TaggedQuickPickItem>(items, {
      placeHolder: placeholder,
      ignoreFocusOut: true,
    });

    if (!result) return undefined;

    if (hasTag(result, ItemTag.Done)) {
      return selectedFiles.join('\n');
    }

    if (hasTag(result, ItemTag.Back)) {
      currentPath = path.dirname(currentPath);
      if (currentPath === '.') currentPath = '';
      continue;
    }

    if (hasTag(result, ItemTag.Folder) && result.description) {
      currentPath = result.description;
      continue;
    }

    if (hasTag(result, ItemTag.File) && result.description) {
      const filePath = path.join(workspaceFolder.uri.fsPath, result.description);

      if (multiSelect) {
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

export async function selectFolders(
  workspaceFolder: vscode.WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  const style = options.selectionStyle ?? SelectionStyle.Flat;

  log.info(`selectFolders - style: ${style}, multiSelect: ${options.multiSelect ?? false}`);

  if (style === SelectionStyle.Interactive) {
    return selectFoldersInteractive(workspaceFolder, options.label, options.multiSelect ?? false, excludes);
  }

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

async function selectFoldersInteractive(
  workspaceFolder: vscode.WorkspaceFolder,
  label: string,
  multiSelect: boolean,
  excludes: string[],
): Promise<string | undefined> {
  const selectedFolders: string[] = [];
  let currentPath = '';

  while (true) {
    const currentFullPath = currentPath
      ? path.join(workspaceFolder.uri.fsPath, currentPath)
      : workspaceFolder.uri.fsPath;

    const entries = await getDirectoryEntries(currentFullPath, excludes);
    const items: TaggedQuickPickItem[] = [];

    if (currentPath) {
      items.push(createItem('$(arrow-left) ..', 'Go back', ItemTag.Back));
    }

    const currentFolderPath = currentFullPath;
    const isCurrentSelected = selectedFolders.includes(currentFolderPath);

    items.push(
      createItem(
        `$(check) Select this folder${isCurrentSelected ? ' (selected)' : ''}`,
        currentPath ?? '.',
        ItemTag.SelectCurrent,
      ),
    );

    for (const entry of entries.folders) {
      const folderFullPath = path.join(currentFullPath, entry);
      const isSelected = selectedFolders.includes(folderFullPath);
      const desc = currentPath ? `${currentPath}/${entry}` : entry;
      items.push(createItem(`$(folder) ${entry}${isSelected ? ' $(check)' : ''}`, desc, ItemTag.Folder));
    }

    if (multiSelect && selectedFolders.length > 0) {
      items.unshift(
        createItem(`$(check-all) Done (${selectedFolders.length} selected)`, 'Confirm selection', ItemTag.Done),
      );
    }

    const placeholder = multiSelect
      ? `${label} (${selectedFolders.length} selected) - Current: ${currentPath ?? '.'}`
      : `${label} - Current: ${currentPath ?? '.'}`;

    const result = await vscode.window.showQuickPick<TaggedQuickPickItem>(items, {
      placeHolder: placeholder,
      ignoreFocusOut: true,
    });

    if (!result) return undefined;

    if (hasTag(result, ItemTag.Done)) {
      return selectedFolders.join('\n');
    }

    if (hasTag(result, ItemTag.Back)) {
      currentPath = path.dirname(currentPath);
      if (currentPath === '.') currentPath = '';
      continue;
    }

    if (hasTag(result, ItemTag.SelectCurrent)) {
      if (multiSelect) {
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

    if (hasTag(result, ItemTag.Folder) && result.description) {
      currentPath = result.description;
    }
  }
}
