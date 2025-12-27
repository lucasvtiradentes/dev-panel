import { getPromptCommandId, getPromptCommandPrefix } from '../../../common/constants';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/lib/keybindings-sync';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreePrompt } from '../../../views/prompts';

export function createSetPromptKeybindingCommand(): Disposable {
  return registerCommand(Command.SetPromptKeybinding, async (item: TreePrompt) => {
    if (!item?.promptName) return;
    await openKeybindingsForCommand(getPromptCommandId(item.promptName));
  });
}

export function createOpenPromptsKeybindingsCommand(): Disposable {
  return registerCommand(Command.OpenPromptsKeybindings, () => openKeybindingsWithPrefix(getPromptCommandPrefix()));
}
