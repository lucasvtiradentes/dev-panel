import { EXTENSION_DISPLAY_NAME } from 'src/common/constants';
import { ConfigManager } from '../../common/lib/config-manager';
import { logger } from '../../common/lib/logger';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { QuickPickItem } from '../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../common/vscode/vscode-utils';
import { getFirstWorkspaceFolder } from '../../common/vscode/workspace-utils';
import { showConfigLocationMenu } from './config-location';
import { showInitMenu } from './init';
import { showRegistryMenu } from './registry/index';

enum SettingsMenuOption {
  ManageConfigLocation = 'manage-config-location',
  Registry = 'registry',
  Init = 'init',
}

type QuickPickItemWithId<T> = QuickPickItem & { id: T };

export function createOpenSettingsMenuCommand() {
  return registerCommand(Command.OpenSettingsMenu, async () => {
    logger.info('openSettingsMenu command called');

    const workspaceFolder = getFirstWorkspaceFolder();
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
        label: '$(file-add) Init',
        detail: `Initialize ${EXTENSION_DISPLAY_NAME} in current workspace`,
      });
    } else {
      mainMenuItems.push(
        {
          id: SettingsMenuOption.ManageConfigLocation,
          label: '$(folder) Change Config Location',
          detail: `Select where ${EXTENSION_DISPLAY_NAME} config should be located`,
        },
        {
          id: SettingsMenuOption.Registry,
          label: '$(package) Registry',
          detail: 'Browse and install tools/prompts from registry',
        },
      );
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
      case SettingsMenuOption.Registry:
        await showRegistryMenu();
        break;
      case SettingsMenuOption.Init:
        await showInitMenu();
        break;
    }
  });
}
