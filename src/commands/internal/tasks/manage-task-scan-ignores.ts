import { DEFAULT_EXCLUDED_DIRS } from '../../../common/constants';
import { tasksState } from '../../../common/state';
import { NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { selectFolders } from '../../../common/vscode/vscode-inputs';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { TaskTreeDataProvider } from '../../../views/tasks';

type ManageAction = { type: 'add' } | { type: 'remove'; path: string } | { type: 'reset' };

type ManageItem = {
  label: string;
  description?: string;
  action: ManageAction;
};

export function createManageTaskScanIgnoresCommand(provider: TaskTreeDataProvider): Disposable {
  return registerCommand(Command.ManageTaskScanIgnores, () => showManageMenu(provider));
}

async function showManageMenu(provider: TaskTreeDataProvider): Promise<void> {
  const customPaths = tasksState.getTaskScanIgnorePaths();
  const items: ManageItem[] = [
    { label: '$(add) Add folder…', action: { type: 'add' } },
    ...customPaths.map((path) => ({
      label: `$(x) ${path}`,
      description: 'Remove',
      action: { type: 'remove' as const, path },
    })),
    ...(customPaths.length > 0
      ? [{ label: '$(discard) Reset custom ignores', action: { type: 'reset' as const } }]
      : []),
  ];

  const selected = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Manage task scan ignores for the active workspace',
  });
  if (!selected) return;

  const { action } = selected;
  switch (action.type) {
    case 'add':
      await addIgnoredFolder(provider);
      return;
    case 'remove':
      tasksState.saveTaskScanIgnorePaths(customPaths.filter((path) => path !== action.path));
      provider.refresh();
      await showManageMenu(provider);
      return;
    case 'reset':
      tasksState.saveTaskScanIgnorePaths([]);
      provider.refresh();
      await showManageMenu(provider);
  }
}

async function addIgnoredFolder(provider: TaskTreeDataProvider): Promise<void> {
  const workspaceFolder = VscodeHelper.getFirstWorkspaceFolder();
  if (!workspaceFolder) return;

  const selectedPath = await selectFolders(workspaceFolder, {
    label: 'Select a folder to ignore while scanning tasks',
    multiSelect: false,
    excludes: DEFAULT_EXCLUDED_DIRS.map((path) => `**/${path}/**`),
  });
  if (!selectedPath) return;

  const relativePath = NodePathHelper.relative(workspaceFolder.uri.fsPath, selectedPath).replaceAll('\\', '/');
  if (!relativePath) {
    void VscodeHelper.showToastMessage(ToastKind.Warning, 'The workspace root cannot be ignored');
    return;
  }

  const customPaths = tasksState.getTaskScanIgnorePaths();
  if (!customPaths.includes(relativePath)) {
    tasksState.saveTaskScanIgnorePaths([...customPaths, relativePath].sort());
    provider.refresh();
  }

  await showManageMenu(provider);
}
