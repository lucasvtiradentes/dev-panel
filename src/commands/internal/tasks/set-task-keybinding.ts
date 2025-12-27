import { getTaskCommandId, getTaskCommandPrefix } from '../../../common/constants';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/utils/keybindings-sync';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreeTask } from '../../../views/tasks/items';

async function handleSetTaskKeybinding(item: TreeTask) {
  if (!item?.taskName) return;
  await openKeybindingsForCommand(getTaskCommandId(item.taskName));
}

function handleOpenTasksKeybindings() {
  return openKeybindingsWithPrefix(getTaskCommandPrefix());
}

export function createSetTaskKeybindingCommand(): Disposable {
  return registerCommand(Command.SetTaskKeybinding, handleSetTaskKeybinding);
}

export function createOpenTasksKeybindingsCommand(): Disposable {
  return registerCommand(Command.OpenTasksKeybindings, handleOpenTasksKeybindings);
}
