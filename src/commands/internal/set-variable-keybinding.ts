import * as vscode from 'vscode';
import { getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { VariableTreeItem } from '../../views/variables';

async function handleKeybindingManagement(item: VariableTreeItem): Promise<void> {
  if (!item?.variable?.name) return;

  const commandId = getVariableCommandId(item.variable.name);
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

async function openVariablesKeybindings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', getVariableCommandPrefix());
}

export function createSetVariableKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetVariableKeybinding, async (item: VariableTreeItem) => {
    await handleKeybindingManagement(item);
  });
}

export function createOpenVariablesKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenVariablesKeybindings, openVariablesKeybindings);
}
