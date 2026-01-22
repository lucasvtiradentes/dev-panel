import { TaskPriority, TaskStatus } from '../../common/schemas';
import { VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { QuickPickItem } from '../../common/vscode/vscode-types';
import type { TaskNode } from '../../features/branch-context-sync';

export type TaskFilter = {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string;
  hasExternalLink?: boolean;
  overdue?: boolean;
};

export function applyFilters(nodes: TaskNode[], activeFilters: TaskFilter): TaskNode[] {
  if (Object.keys(activeFilters).length === 0) {
    return nodes;
  }

  return nodes.map((node) => filterNode(node, activeFilters)).filter((node): node is TaskNode => node !== null);
}

function filterNode(node: TaskNode, activeFilters: TaskFilter): TaskNode | null {
  if (!matchesFilter(node, activeFilters)) {
    const filteredChildren = node.children
      .map((c) => filterNode(c, activeFilters))
      .filter((c): c is TaskNode => c !== null);

    if (filteredChildren.length === 0) {
      return null;
    }

    return { ...node, children: filteredChildren };
  }

  const filteredChildren = node.children
    .map((c) => filterNode(c, activeFilters))
    .filter((c): c is TaskNode => c !== null);

  return { ...node, children: filteredChildren };
}

function matchesFilter(node: TaskNode, activeFilters: TaskFilter): boolean {
  const f = activeFilters;

  if (f.status && !f.status.includes(node.status)) {
    return false;
  }

  if (f.priority && (!node.meta.priority || !f.priority.includes(node.meta.priority))) {
    return false;
  }

  if (f.assignee && node.meta.assignee !== f.assignee) {
    return false;
  }

  if (f.hasExternalLink && !node.meta.externalUrl && !node.meta.externalId) {
    return false;
  }

  if (f.overdue) {
    if (!node.meta.dueDate) return false;
    const date = new Date(node.meta.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date >= today) return false;
  }

  return true;
}

export function filterTodoNodes(nodes: TaskNode[], showOnlyTodo: boolean): TaskNode[] {
  if (!showOnlyTodo) return nodes;

  return nodes
    .map((node) => {
      if (node.status !== TaskStatus.Done) {
        if (node.children.length > 0) {
          const filteredChildren = filterTodoNodes(node.children, showOnlyTodo);
          return { ...node, children: filteredChildren };
        }
        return node;
      }

      return null;
    })
    .filter((node): node is TaskNode => node !== null);
}

export function flattenNodes(nodes: TaskNode[]): TaskNode[] {
  const result: TaskNode[] = [];

  for (const node of nodes) {
    result.push({ ...node, children: [] });
    if (node.children.length > 0) {
      result.push(...flattenNodes(node.children));
    }
  }

  return result;
}

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
