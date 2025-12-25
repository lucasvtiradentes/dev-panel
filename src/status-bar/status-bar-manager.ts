import * as vscode from 'vscode';
import { EXTENSION_DISPLAY_NAME, getCommandId } from '../common/constants';
import { Command } from '../common/lib/vscode-utils';

export class StatusBarManager {
  private readonly statusBarItem: vscode.StatusBarItem;
  private hasConfig = true;

  constructor(hasConfig = true) {
    this.hasConfig = hasConfig;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = getCommandId(Command.OpenSettingsMenu);
    this.updateDisplay();
    this.statusBarItem.show();
  }

  setHasConfig(hasConfig: boolean): void {
    this.hasConfig = hasConfig;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const icon = '$(settings-gear)';
    const text = this.hasConfig ? EXTENSION_DISPLAY_NAME : `${EXTENSION_DISPLAY_NAME} (No config)`;
    this.statusBarItem.text = `${icon} ${text}`;
  }

  private buildTooltip(): string {
    const lines = [`${EXTENSION_DISPLAY_NAME} Settings`, '', 'Click to open settings menu'];
    return lines.join('\n');
  }

  refresh(): void {
    this.updateDisplay();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
