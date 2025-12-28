import { TaskPriority, TaskStatus } from '../../common/schemas';
import { VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { QuickPickItem } from '../../common/vscode/vscode-types';
import type { TaskFilter } from './filter-operations';

export async function showFilterQuickPick(): Promise<TaskFilter | null> {
  const items: QuickPickItem[] = [
    { label: `$(${VscodeIcon.CircleLargeOutline}) Todo only`, description: 'Show only todo tasks' },
    { label: `$(${VscodeIcon.PlayCircle}) Doing only`, description: 'Show only in-progress tasks' },
    { label: `$(${VscodeIcon.Error}) Blocked only`, description: 'Show only blocked tasks' },
    { label: `$(${VscodeIcon.Warning}) Overdue only`, description: 'Show only overdue tasks' },
    { label: `$(${VscodeIcon.Account}) By assignee...`, description: 'Filter by assignee name' },
    { label: `$(${VscodeIcon.Flame}) High priority+`, description: 'Show urgent and high priority' },
    { label: `$(${VscodeIcon.LinkExternal}) With external link`, description: 'Show only linked tasks' },
    { label: '', kind: VscodeConstants.QuickPickItemKind.Separator },
    { label: `$(${VscodeIcon.Close}) Clear filters`, description: 'Show all tasks' },
  ];

  const picked = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Select filter',
  });

  if (!picked) return null;

  switch (picked.label) {
    case `$(${VscodeIcon.CircleLargeOutline}) Todo only`:
      return { status: [TaskStatus.Todo] };
    case `$(${VscodeIcon.PlayCircle}) Doing only`:
      return { status: [TaskStatus.Doing] };
    case `$(${VscodeIcon.Error}) Blocked only`:
      return { status: [TaskStatus.Blocked] };
    case `$(${VscodeIcon.Warning}) Overdue only`:
      return { overdue: true };
    case `$(${VscodeIcon.Account}) By assignee...`: {
      const assignee = await VscodeHelper.showInputBox({
        prompt: 'Enter assignee name',
        placeHolder: 'e.g., lucas',
      });
      return assignee ? { assignee } : null;
    }
    case `$(${VscodeIcon.Flame}) High priority+`:
      return { priority: [TaskPriority.Urgent, TaskPriority.High] };
    case `$(${VscodeIcon.LinkExternal}) With external link`:
      return { hasExternalLink: true };
    case `$(${VscodeIcon.Close}) Clear filters`:
      return {};
    default:
      return null;
  }
}
