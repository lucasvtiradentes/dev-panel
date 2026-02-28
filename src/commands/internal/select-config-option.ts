import type { DevPanelVariable } from '../../common/schemas/config-schema';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import { type VariableTreeItem, resetVariableOption, selectVariableOption } from '../../views/variables';

type SelectConfigOptionParams = DevPanelVariable;

export function createSelectConfigOptionCommand() {
  return registerCommand(Command.SelectConfigOption, (variable: SelectConfigOptionParams) =>
    selectVariableOption(variable),
  );
}

export function createResetConfigOptionCommand() {
  return registerCommand(Command.ResetConfigOption, (item: VariableTreeItem) => resetVariableOption(item));
}
