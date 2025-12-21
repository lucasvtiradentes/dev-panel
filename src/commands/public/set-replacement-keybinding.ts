import * as vscode from 'vscode';
import { Command, getReplacementCommandId, getReplacementCommandPrefix, registerCommand } from '../../common';
import type { Replacement } from '../../views/replacements/types';

async function handleKeybindingManagement(replacement: Replacement): Promise<void> {
  if (!replacement?.name) return;

  const commandId = getReplacementCommandId(replacement.name);
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

async function openReplacementsKeybindings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', getReplacementCommandPrefix());
}

export function createSetReplacementKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetReplacementKeybinding, async (replacement: Replacement) => {
    await handleKeybindingManagement(replacement);
  });
}

export function createOpenReplacementsKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenReplacementsKeybindings, openReplacementsKeybindings);
}
