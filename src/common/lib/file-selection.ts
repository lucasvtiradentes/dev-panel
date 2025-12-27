import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES, ROOT_FOLDER_LABEL } from '../constants';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { QuickPickItem, WorkspaceFolder } from '../vscode/vscode-types';
import { createLogger } from './logger';

const log = createLogger('file-selection');

export type FileSelectionOptions = {
  label: string;
  multiSelect?: boolean;
  includes?: string[];
  excludes?: string[];
};

type InternalSelectionOptions = {
  workspaceFolder: WorkspaceFolder;
  label: string;
  multiSelect: boolean;
  includes: string[];
  excludes: string[];
};

function buildGlob(patterns: string[]): string {
  if (patterns.length === 1) return patterns[0];
  return `{${patterns.join(',')}}`;
}

export async function selectFiles(
  workspaceFolder: WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const includes = options.includes ?? DEFAULT_INCLUDES;
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  log.info(`selectFiles - multiSelect: ${options.multiSelect ?? false}`);
  return selectFilesFlat({
    workspaceFolder,
    label: options.label,
    multiSelect: options.multiSelect ?? false,
    includes,
    excludes,
  });
}

async function selectFilesFlat(opts: InternalSelectionOptions): Promise<string | undefined> {
  const { workspaceFolder, label, multiSelect, includes, excludes } = opts;
  log.info(`selectFilesFlat - workspaceFolder.name: ${workspaceFolder.name}`);
  log.info(`selectFilesFlat - workspaceFolder.uri.fsPath: ${workspaceFolder.uri.fsPath}`);
  const includeGlob = buildGlob(includes);
  const excludeGlob = buildGlob(excludes);
  const files = await VscodeHelper.findFiles(
    VscodeHelper.createRelativePattern(workspaceFolder, includeGlob),
    excludeGlob,
  );
  log.info(`selectFilesFlat - found ${files.length} files`);

  const items: QuickPickItem[] = files.map((uri) => ({
    label: VscodeHelper.asRelativePath(uri, false),
    description: uri.fsPath,
  }));

  items.sort((a, b) => a.label.localeCompare(b.label));

  if (multiSelect) {
    const result = await VscodeHelper.showQuickPickItems(items, {
      placeHolder: label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result
      .filter((item) => item.description)
      .map((item) => item.description as string)
      .join('\n');
  }

  const result = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}

export async function selectFolders(
  workspaceFolder: WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const includes = options.includes ?? DEFAULT_INCLUDES;
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  log.info(`selectFolders - multiSelect: ${options.multiSelect ?? false}`);
  return selectFoldersFlat({
    workspaceFolder,
    label: options.label,
    multiSelect: options.multiSelect ?? false,
    includes,
    excludes,
  });
}

async function selectFoldersFlat(opts: InternalSelectionOptions): Promise<string | undefined> {
  const { workspaceFolder, label, multiSelect, includes, excludes } = opts;
  const includeGlob = buildGlob(includes);
  const excludeGlob = buildGlob(excludes);
  const files = await VscodeHelper.findFiles(
    VscodeHelper.createRelativePattern(workspaceFolder, includeGlob),
    excludeGlob,
  );

  const folderSet = new Set<string>();
  for (const file of files) {
    const relativePath = VscodeHelper.asRelativePath(file, false);
    const parts = relativePath.split('/');
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      folderSet.add(currentPath);
    }
  }

  const folders = Array.from(folderSet).sort();
  const items: QuickPickItem[] = folders.map((folder) => ({
    label: folder,
    description: `${workspaceFolder.uri.fsPath}/${folder}`,
  }));

  items.unshift({
    label: ROOT_FOLDER_LABEL,
    description: workspaceFolder.uri.fsPath,
  });

  if (multiSelect) {
    const result = await VscodeHelper.showQuickPickItems(items, {
      placeHolder: label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result
      .filter((item) => item.description)
      .map((item) => item.description as string)
      .join('\n');
  }

  const result = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}
