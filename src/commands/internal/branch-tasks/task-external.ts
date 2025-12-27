import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

export function createTaskExternalCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.OpenTaskExternal, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node?.meta.externalUrl) return;
      await VscodeHelper.openExternal(node.meta.externalUrl);
    }),
  ];
}
