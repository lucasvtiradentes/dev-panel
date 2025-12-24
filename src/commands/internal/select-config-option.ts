import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPVariable } from '../../common/schemas/config-schema';
import { type VariableTreeItem, resetVariableOption, selectVariableOption } from '../../views/variables';

export type SelectConfigOptionParams = PPVariable;

export function createSelectConfigOptionCommand() {
  return registerCommand(Command.SelectConfigOption, (variable: SelectConfigOptionParams) =>
    selectVariableOption(variable as any),
  );
}

export function createResetConfigOptionCommand() {
  return registerCommand(Command.ResetConfigOption, (item: VariableTreeItem) => resetVariableOption(item));
}
