import { VscodeIcon } from '../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type { QuickPickItemWithId } from '../../common/vscode/vscode-types';
import {
  ExtensionConfigKey,
  type TasksLocationValue,
  getExtensionConfig,
  getExtensionConfigSection,
} from '../../common/vscode/vscode-workspace';

type TasksLocationOption = {
  id: TasksLocationValue;
  label: string;
  icon: string;
};

const TASKS_LOCATION_OPTIONS: TasksLocationOption[] = [
  { id: 'explorer', label: 'Explorer Sidebar', icon: VscodeIcon.Files },
  { id: 'devpanel', label: 'Dev Panel Sidebar', icon: VscodeIcon.Layout },
];

export async function showTasksLocationMenu(): Promise<void> {
  const currentLocation = getExtensionConfig(ExtensionConfigKey.TasksLocation);

  const items: QuickPickItemWithId<TasksLocationValue>[] = TASKS_LOCATION_OPTIONS.map((option) => ({
    id: option.id,
    label: `$(${option.icon}) ${option.label}`,
    description: option.id === currentLocation ? '(current)' : undefined,
  }));

  const selected = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Select where to show the Tasks view',
  });

  if (!selected || selected.id === currentLocation) return;

  const config = VscodeHelper.getConfiguration(getExtensionConfigSection());
  await config.update(ExtensionConfigKey.TasksLocation, selected.id, true);

  VscodeHelper.showToastMessage(
    ToastKind.Info,
    `Tasks view moved to ${selected.id === 'explorer' ? 'Explorer' : 'Dev Panel'} sidebar.`,
  );
}
