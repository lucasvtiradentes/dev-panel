import { getPromptCommandId, getPromptCommandPrefix } from '../../../common/constants';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/utils/keybinding-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
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
