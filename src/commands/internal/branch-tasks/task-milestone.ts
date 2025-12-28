import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, QuickPickItem } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function handleSetTaskMilestone(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = extractLineIndex(item);
  const milestones = provider.getMilestoneNames();

  const NEW_MILESTONE = '__new__';
  type MilestoneQuickPickItem = QuickPickItem & { value: string | null };

  const items: MilestoneQuickPickItem[] = [
    { label: '$(inbox) No Milestone', value: null },
    { label: '$(add) New Milestone...', value: NEW_MILESTONE },
  ];

  if (milestones.length > 0) {
    items.push({ label: '', kind: VscodeConstants.QuickPickItemKind.Separator, value: null });
    for (const m of milestones) {
      items.push({ label: `$(milestone) ${m}`, value: m });
    }
  }

  const picked = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Move to milestone',
  });

  if (picked === undefined) return;

  if (picked.value === NEW_MILESTONE) {
    const name = await VscodeHelper.showInputBox({
      prompt: 'Enter milestone name',
      placeHolder: 'e.g., Sprint 1',
    });
    if (!name) return;
    await provider.createMilestone(name);
    await provider.moveTaskToMilestone(lineIndex, name);
    return;
  }

  await provider.moveTaskToMilestone(lineIndex, picked.value);
}

export function createTaskMilestoneCommands(provider: BranchTasksProvider): Disposable[] {
  return [registerCommand(Command.SetTaskMilestone, (item: ItemOrLineIndex) => handleSetTaskMilestone(provider, item))];
}
