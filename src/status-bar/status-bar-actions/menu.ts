import { EXTENSION_DISPLAY_NAME } from 'src/common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { logger } from '../../common/lib/logger';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import { VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { QuickPickItemWithId } from '../../common/vscode/vscode-types';
import { showConfigLocationMenu } from './config-location';
import { showInitMenu } from './init';

enum SettingsMenuOption {
  ManageConfigLocation = 'manage-config-location',
  Init = 'init',
}

export function createOpenSettingsMenuCommand() {
  return registerCommand(Command.OpenSettingsMenu, async () => {
    logger.info('openSettingsMenu command called');

    const workspaceFolder = VscodeHelper.getFirstWorkspaceFolder();
    let showInit = false;

    if (workspaceFolder) {
      const configDirPath = ConfigManager.getWorkspaceConfigDirPath(workspaceFolder);
      try {
        await VscodeHelper.stat(VscodeHelper.createFileUri(configDirPath));
      } catch {
        showInit = true;
      }
    }

    const mainMenuItems: QuickPickItemWithId<SettingsMenuOption>[] = [];

    if (showInit) {
      mainMenuItems.push({
        id: SettingsMenuOption.Init,
        label: `$(${VscodeIcon.FileAdd}) Init`,
        detail: `Initialize ${EXTENSION_DISPLAY_NAME} in current workspace`,
      });
    } else {
      mainMenuItems.push({
        id: SettingsMenuOption.ManageConfigLocation,
        label: `$(${VscodeIcon.Folder}) Change Config Location`,
        detail: `Select where ${EXTENSION_DISPLAY_NAME} config should be located`,
      });
    }

    const selected = await VscodeHelper.showQuickPickItems(mainMenuItems, {
      placeHolder: `${EXTENSION_DISPLAY_NAME} Settings`,
      ignoreFocusOut: false,
    });

    if (!selected) return;

    switch (selected.id) {
      case SettingsMenuOption.ManageConfigLocation:
        await showConfigLocationMenu();
        break;
      case SettingsMenuOption.Init:
        await showInitMenu();
        break;
    }
  });
}
