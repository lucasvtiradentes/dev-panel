import type * as vscode from 'vscode';
import { getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../common/utils/keybinding-utils';
import type { VariableTreeItem } from '../../views/variables';

export function createSetVariableKeybindingCommand(): vscode.Disposable {
  return registerCommand(Command.SetVariableKeybinding, async (item: VariableTreeItem) => {
    if (!item?.variable?.name) return;
    await openKeybindingsForCommand(getVariableCommandId(item.variable.name));
  });
}

export function createOpenVariablesKeybindingsCommand(): vscode.Disposable {
  return registerCommand(Command.OpenVariablesKeybindings, () => openKeybindingsWithPrefix(getVariableCommandPrefix()));
}
