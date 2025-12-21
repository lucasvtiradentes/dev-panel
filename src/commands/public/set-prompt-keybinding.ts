import * as vscode from 'vscode';
import { Command, getPromptCommandId, getPromptCommandPrefix, registerCommand } from '../../common';
import type { TreePrompt } from '../../views/prompts';

async function handleKeybindingManagement(item: TreePrompt): Promise<void> {
  if (!item?.promptName) return;

  const commandId = getPromptCommandId(item.promptName);
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

async function openPromptsKeybindings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', getPromptCommandPrefix());
}

export function createSetPromptKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetPromptKeybinding, async (item: TreePrompt) => {
    await handleKeybindingManagement(item);
  });
}

export function createOpenPromptsKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenPromptsKeybindings, openPromptsKeybindings);
}
