import { getVariableCommandId, getVariableCommandPrefix } from '../../../common/constants';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/utils/keybinding-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
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
