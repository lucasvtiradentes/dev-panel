import * as vscode from 'vscode';
import { Command, getToolCommandId, getToolCommandPrefix, registerCommand } from '../../common';
import type { TreeTool } from '../../views/tools';

async function handleKeybindingManagement(item: TreeTool): Promise<void> {
  if (!item?.toolName) return;

  const commandId = getToolCommandId(item.toolName);
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

async function openToolsKeybindings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', getToolCommandPrefix());
}

export function createSetToolKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetToolKeybinding, async (item: TreeTool) => {
    await handleKeybindingManagement(item);
  });
}

export function createOpenToolsKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenToolsKeybindings, openToolsKeybindings);
}
