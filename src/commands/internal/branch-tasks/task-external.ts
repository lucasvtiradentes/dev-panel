import * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';
import type { BranchTaskItem } from '../../../views/branch-tasks/task-tree-items';

type ItemOrLineIndex = BranchTaskItem | number;

function extractLineIndex(itemOrLineIndex: ItemOrLineIndex): number {
  return typeof itemOrLineIndex === 'number' ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
}

export function createTaskExternalCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.OpenTaskExternal, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node?.meta.externalUrl) return;
      await vscode.env.openExternal(vscode.Uri.parse(node.meta.externalUrl));
    }),
  ];
}
