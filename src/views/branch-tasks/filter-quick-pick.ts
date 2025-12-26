import * as vscode from 'vscode';
import { TaskPriority, TaskStatus } from '../../common/schemas';
import type { QuickPickItem } from '../../common/vscode/vscode-types';
import type { TaskFilter } from './filter-operations';

export async function showFilterQuickPick(): Promise<TaskFilter | null> {
  const items: QuickPickItem[] = [
    { label: '$(circle-large-outline) Todo only', description: 'Show only todo tasks' },
    { label: '$(play-circle) Doing only', description: 'Show only in-progress tasks' },
    { label: '$(error) Blocked only', description: 'Show only blocked tasks' },
    { label: '$(warning) Overdue only', description: 'Show only overdue tasks' },
    { label: '$(account) By assignee...', description: 'Filter by assignee name' },
    { label: '$(flame) High priority+', description: 'Show urgent and high priority' },
    { label: '$(link-external) With external link', description: 'Show only linked tasks' },
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: '$(close) Clear filters', description: 'Show all tasks' },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select filter',
  });

  if (!picked) return null;

  switch (picked.label) {
    case '$(circle-large-outline) Todo only':
      return { status: [TaskStatus.Todo] };
    case '$(play-circle) Doing only':
      return { status: [TaskStatus.Doing] };
    case '$(error) Blocked only':
      return { status: [TaskStatus.Blocked] };
    case '$(warning) Overdue only':
      return { overdue: true };
    case '$(account) By assignee...': {
      const assignee = await vscode.window.showInputBox({
        prompt: 'Enter assignee name',
        placeHolder: 'e.g., lucas',
      });
      return assignee ? { assignee } : null;
    }
    case '$(flame) High priority+':
      return { priority: [TaskPriority.Urgent, TaskPriority.High] };
    case '$(link-external) With external link':
      return { hasExternalLink: true };
    case '$(close) Clear filters':
      return {};
    default:
      return null;
  }
}
