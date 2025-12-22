import { EXTENSION_DISPLAY_NAME } from 'src/common/constants';
import * as vscode from 'vscode';
import { logger } from '../../common/lib/logger';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { showConfigLocationMenu } from './config-location';

enum SettingsMenuOption {
  ManageConfigLocation = 'manage-config-location',
  Registry = 'registry',
  Init = 'init',
}

type QuickPickItemWithId<T> = vscode.QuickPickItem & { id: T };

export function createOpenSettingsMenuCommand() {
  return registerCommand(Command.OpenSettingsMenu, async () => {
    logger.info('openSettingsMenu command called');

    const mainMenuItems: QuickPickItemWithId<SettingsMenuOption>[] = [
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
      {
        id: SettingsMenuOption.Init,
        label: '$(file-add) Init',
        detail: `Initialize ${EXTENSION_DISPLAY_NAME} in current workspace`,
      },
    ];

    const selected = await vscode.window.showQuickPick(mainMenuItems, {
      placeHolder: `${EXTENSION_DISPLAY_NAME} Settings`,
      ignoreFocusOut: false,
    });

    if (!selected) return;

    switch (selected.id) {
      case SettingsMenuOption.ManageConfigLocation:
        await showConfigLocationMenu();
        break;
      case SettingsMenuOption.Registry:
        void vscode.window.showInformationMessage('Registry: Not implemented yet');
        break;
      case SettingsMenuOption.Init:
        void vscode.window.showInformationMessage('Init: Not implemented yet');
        break;
    }
  });
}
