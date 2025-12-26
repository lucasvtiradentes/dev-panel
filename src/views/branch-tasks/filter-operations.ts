import type { TaskPriority, TaskStatus } from '../../common/schemas';
import type { TaskNode } from '../_branch_context';

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

export function filterNode(node: TaskNode, activeFilters: TaskFilter): TaskNode | null {
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

export function matchesFilter(node: TaskNode, activeFilters: TaskFilter): boolean {
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
      if (node.status !== 'done') {
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
