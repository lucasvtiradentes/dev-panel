import * as vscode from 'vscode';
import { getReplacementCommandId, getReplacementCommandPrefix } from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPReplacement } from '../../common/schemas/config-schema';

async function handleKeybindingManagement(replacement: PPReplacement): Promise<void> {
  if (!replacement?.name) return;

  const commandId = getReplacementCommandId(replacement.name);
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

async function openReplacementsKeybindings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', getReplacementCommandPrefix());
}

export function createSetReplacementKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetReplacementKeybinding, async (replacement: PPReplacement) => {
    await handleKeybindingManagement(replacement);
  });
}

export function createOpenReplacementsKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenReplacementsKeybindings, openReplacementsKeybindings);
}
