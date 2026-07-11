import { getCommandId } from '../common/constants';
import { workspaceManager } from '../common/core/workspace-manager';
import { Command } from '../common/vscode/vscode-commands';
import { VscodeConstants } from '../common/vscode/vscode-constants';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, StatusBarItem } from '../common/vscode/vscode-types';

export class StatusBarManager implements Disposable {
  private readonly statusBarItem: StatusBarItem;
  private readonly workspaceSubscription: Disposable;

  constructor() {
    this.statusBarItem = VscodeHelper.createStatusBarItem(VscodeConstants.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = getCommandId(Command.SelectWorkspace);
    this.workspaceSubscription = workspaceManager.onDidChangeActiveWorkspace(() => this.updateDisplay());
    this.updateDisplay();
  }

  private updateDisplay() {
    const folders = workspaceManager.getAllFolders();
    const activeFolder = workspaceManager.getActiveFolder();
    const hasMultipleWorkspaces = folders.length > 1;

    if (!hasMultipleWorkspaces || !activeFolder) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.text = `$(folder) ${activeFolder.name}`;
    this.statusBarItem.tooltip = 'Click to select the active Dev Panel workspace';
    this.statusBarItem.show();
  }

  dispose() {
    this.workspaceSubscription.dispose();
    this.statusBarItem.dispose();
  }
}
