import { EXTENSION_DISPLAY_NAME, getCommandId } from '../common/constants';
import { Command } from '../common/vscode/vscode-commands';
import { VscodeConstants, VscodeIcon } from '../common/vscode/vscode-constants';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { StatusBarItem } from '../common/vscode/vscode-types';

export class StatusBarManager {
  private readonly statusBarItem: StatusBarItem;
  private hasConfig = true;
  private variables: Record<string, unknown> = {};

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

  setVariables(variables: Record<string, unknown>) {
    this.variables = variables;
    this.updateDisplay();
  }

  private updateDisplay() {
    const icon = this.hasConfig ? VscodeIcon.Flame : VscodeIcon.Warning;
    this.statusBarItem.text = `$(${icon}) ${EXTENSION_DISPLAY_NAME}`;
    this.statusBarItem.tooltip = this.buildTooltip();
  }

  private buildTooltip(): string {
    if (!this.hasConfig) {
      return `${EXTENSION_DISPLAY_NAME} - Not initialized. Click to setup.`;
    }
    const entries = Object.entries(this.variables);
    if (entries.length === 0) {
      return EXTENSION_DISPLAY_NAME;
    }
    const lines = entries.map(([k, v]) => `${k}: ${this.formatValue(v)}`);
    return `${EXTENSION_DISPLAY_NAME}\n\n${lines.join('\n')}`;
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ') || '(none)';
    if (typeof value === 'boolean') return value ? 'On' : 'Off';
    return String(value ?? '(not set)');
  }

  refresh() {
    this.updateDisplay();
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
