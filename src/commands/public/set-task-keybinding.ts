import * as vscode from 'vscode';
import { Command, getTaskCommandId, getTaskCommandPrefix, registerCommand } from '../../common';
import type { TreeTask } from '../../views/tasks/items';

async function handleKeybindingManagement(item: TreeTask): Promise<void> {
  if (!item?.taskName) return;

  const commandId = getTaskCommandId(item.taskName);
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

async function openTasksKeybindings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', getTaskCommandPrefix());
}

export function createSetTaskKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetTaskKeybinding, async (item: TreeTask) => {
    await handleKeybindingManagement(item);
  });
}

export function createOpenTasksKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenTasksKeybindings, openTasksKeybindings);
}
