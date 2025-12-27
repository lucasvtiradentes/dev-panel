import { getVariableCommandId, getVariableCommandPrefix } from '../../../common/constants';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/utils/keybindings-sync';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { VariableTreeItem } from '../../../views/variables';

export function createSetVariableKeybindingCommand(): Disposable {
  return registerCommand(Command.SetVariableKeybinding, async (item: VariableTreeItem) => {
    if (!item?.variable?.name) return;
    await openKeybindingsForCommand(getVariableCommandId(item.variable.name));
  });
}

export function createOpenVariablesKeybindingsCommand(): Disposable {
  return registerCommand(Command.OpenVariablesKeybindings, () => openKeybindingsWithPrefix(getVariableCommandPrefix()));
}
