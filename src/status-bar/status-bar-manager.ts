import { EXTENSION_DISPLAY_NAME, getCommandId } from '../common/constants';
import { Command } from '../common/vscode/vscode-commands';
import { VscodeConstants, VscodeIcon } from '../common/vscode/vscode-constants';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { StatusBarItem } from '../common/vscode/vscode-types';

export class StatusBarManager {
  private readonly statusBarItem: StatusBarItem;
  private hasConfig = true;

  constructor(hasConfig = true) {
    this.hasConfig = hasConfig;
    this.statusBarItem = VscodeHelper.createStatusBarItem(VscodeConstants.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = getCommandId(Command.OpenSettingsMenu);
    this.updateDisplay();
    this.statusBarItem.show();
  }

  setHasConfig(hasConfig: boolean) {
    this.hasConfig = hasConfig;
    this.updateDisplay();
  }

  private updateDisplay() {
    const icon = `$(${VscodeIcon.SettingsGear})`;
    const text = this.hasConfig ? EXTENSION_DISPLAY_NAME : `${EXTENSION_DISPLAY_NAME} (No config)`;
    this.statusBarItem.text = `${icon} ${text}`;
  }

  refresh() {
    this.updateDisplay();
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
