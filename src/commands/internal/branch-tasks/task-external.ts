import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/tree-item-utils';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function handleOpenTaskExternal(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = extractLineIndex(item);
  const node = provider.findNodeByLineIndex(lineIndex);
  if (!node?.meta.externalUrl) return;
  await VscodeHelper.openExternal(node.meta.externalUrl);
}

export function createTaskExternalCommands(provider: BranchTasksProvider): Disposable[] {
  return [registerCommand(Command.OpenTaskExternal, (item: ItemOrLineIndex) => handleOpenTaskExternal(provider, item))];
}
