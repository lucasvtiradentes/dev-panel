import { getTaskCommandId, getTaskCommandPrefix } from '../../../common/constants';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { openKeybindingsForCommand, openKeybindingsWithPrefix } from '../../../common/utils/keybinding-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { TreeTask } from '../../../views/tasks/items';

export function createSetTaskKeybindingCommand(): Disposable {
  return registerCommand(Command.SetTaskKeybinding, async (item: TreeTask) => {
    if (!item?.taskName) return;
    await openKeybindingsForCommand(getTaskCommandId(item.taskName));
  });
}

export function createOpenTasksKeybindingsCommand(): Disposable {
  return registerCommand(Command.OpenTasksKeybindings, () => openKeybindingsWithPrefix(getTaskCommandPrefix()));
}
