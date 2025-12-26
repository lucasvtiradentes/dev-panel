import type * as vscode from 'vscode';
import { getPromptCommandId, getPromptCommandPrefix } from '../../../common/constants';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/utils/keybinding-utils';
import type { TreePrompt } from '../../../views/prompts';

export function createSetPromptKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetPromptKeybinding, async (item: TreePrompt) => {
    if (!item?.promptName) return;
    await openKeybindingsForCommand(getPromptCommandId(item.promptName));
  });
}

export function createOpenPromptsKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenPromptsKeybindings, () => openKeybindingsWithPrefix(getPromptCommandPrefix()));
}
