import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../tree-view';

export function createExecCmdlineCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.ExecCmdline, async () => {
        await taskTreeDataProvider.putTaskCmd();
    });
}

export function createExitCmdlineCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.ExitCmdline, async () => {
        await taskTreeDataProvider.exitTaskCmd();
    });
}

export function createBackCmdlineCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.BackCmdline, async () => {
        await taskTreeDataProvider.backTaskCmd();
    });
}

export function createTabCmdlineCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.TabCmdline, async () => {
        await taskTreeDataProvider.tabTaskCmd();
    });
}
