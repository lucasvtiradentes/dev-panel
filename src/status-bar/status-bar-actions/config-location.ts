import { posix } from 'node:path';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  QUICK_PICK_ACTION_PARENT,
  QUICK_PICK_ACTION_SELECT,
  QUICK_PICK_ACTION_SEPARATOR,
  ROOT_FOLDER_LABEL,
} from '../../common/constants';
import {
  getConfigDirLabel,
  getCurrentConfigDir,
  hasConfig,
  moveConfig,
  setConfigDir,
} from '../../common/lib/config-manager';
import { logger } from '../../common/lib/logger';
import { requireWorkspaceFolder } from '../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type { Uri } from '../../common/vscode/vscode-types';

type QuickPickItemWithId<T> = vscode.QuickPickItem & { id: T };

function isRootPath(p: string): boolean {
  return p === ROOT_FOLDER_LABEL || p === '';
}

function joinPath(base: string, segment: string): string {
  return isRootPath(base) ? segment : posix.join(base, segment);
}

export async function showConfigLocationMenu() {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspacePath = workspaceFolder.uri.fsPath;
  const currentConfigDir = getCurrentConfigDir();
  const currentHasConfig = await hasConfig(workspacePath, currentConfigDir, CONFIG_FILE_NAME);

  const startPath = currentConfigDir ?? ROOT_FOLDER_LABEL;
  const selectedPath = await showFolderPicker(workspaceFolder.uri, startPath);

  if (!selectedPath) return;

  const newConfigDir = isRootPath(selectedPath) ? null : selectedPath;

  if (newConfigDir === currentConfigDir) {
    return;
  }

  const newHasConfig = await hasConfig(workspacePath, newConfigDir, CONFIG_FILE_NAME);

  if (currentHasConfig && !newHasConfig) {
    const shouldMove = await askToMoveConfig(currentConfigDir, newConfigDir);
    if (shouldMove) {
      await moveConfig(workspacePath, currentConfigDir, newConfigDir);
    }
  }

  setConfigDir(newConfigDir);
  logger.info(`Config dir changed to: ${getConfigDirLabel(newConfigDir)}`);
  void VscodeHelper.showToastMessage(ToastKind.Info, `Config location: ${getConfigDirLabel(newConfigDir)}`);
}

async function askToMoveConfig(fromDir: string | null, toDir: string | null): Promise<boolean> {
  const fromLabel = getConfigDirLabel(fromDir);
  const toLabel = getConfigDirLabel(toDir);

  const result = await VscodeHelper.showToastMessage(
    ToastKind.Warning,
    `Move config from "${fromLabel}" to "${toLabel}"?`,
    { modal: true },
    'Move',
    'Just point to new location',
  );

  return result === 'Move';
}

async function getSubfolders(dirUri: Uri): Promise<string[]> {
  try {
    const entries = await VscodeHelper.readDirectory(dirUri);
    return entries.filter(([_, type]) => type === vscode.FileType.Directory).map(([name]) => name);
  } catch {
    return [];
  }
}

async function showFolderPicker(workspaceRoot: Uri, currentPath: string): Promise<string | null> {
  const currentUri = isRootPath(currentPath) ? workspaceRoot : VscodeHelper.joinPath(workspaceRoot, currentPath);

  const subfolders = await getSubfolders(currentUri);
  const isRoot = isRootPath(currentPath);

  const items: QuickPickItemWithId<string>[] = [];

  items.push({
    id: QUICK_PICK_ACTION_SELECT,
    label: '$(check) Select this folder',
    detail: isRoot ? `Use: ${CONFIG_DIR_NAME} (project root)` : `Use: ${joinPath(currentPath, CONFIG_DIR_NAME)}`,
  });

  if (!isRoot) {
    items.push({
      id: QUICK_PICK_ACTION_PARENT,
      label: '$(arrow-up) ..',
      detail: 'Go to parent folder',
    });
  }

  if (subfolders.length > 0) {
    items.push({
      id: QUICK_PICK_ACTION_SEPARATOR,
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    });
  }

  for (const folder of subfolders.sort()) {
    items.push({
      id: folder,
      label: `$(folder) ${folder}`,
      detail: joinPath(currentPath, folder),
    });
  }

  const selected = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: `Select folder for ${CONFIG_DIR_NAME}`,
    ignoreFocusOut: true,
  });

  if (!selected) return null;

  if (selected.id === QUICK_PICK_ACTION_SELECT) {
    return currentPath;
  }

  if (selected.id === QUICK_PICK_ACTION_PARENT) {
    const parent = posix.dirname(currentPath);
    return showFolderPicker(workspaceRoot, isRootPath(parent) ? ROOT_FOLDER_LABEL : parent);
  }

  return showFolderPicker(workspaceRoot, joinPath(currentPath, selected.id));
}
