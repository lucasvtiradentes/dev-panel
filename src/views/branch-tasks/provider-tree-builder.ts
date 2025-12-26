import * as vscode from 'vscode';
import {
  EMPTY_TASKS_MESSAGE,
  INVALID_LINE_INDEX,
  NO_PENDING_TASKS_MESSAGE,
  getCommandId,
} from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';
import type { MilestoneNode, TaskNode } from '../branch-context/providers';
import { type TaskFilter, applyFilters, filterTodoNodes, flattenNodes } from './filter-operations';
import { BranchMilestoneItem, BranchTaskItem, type BranchTreeItem, NO_MILESTONE_NAME } from './task-tree-items';

export function buildMilestoneChildren(
  milestone: MilestoneNode,
  showOnlyTodo: boolean,
  activeFilters: TaskFilter,
  grouped: boolean,
): BranchTaskItem[] {
  let tasks = filterTodoNodes(milestone.tasks, showOnlyTodo);
  tasks = applyFilters(tasks, activeFilters);
  if (!grouped) {
    tasks = flattenNodes(tasks);
  }
  return tasks.map((node) => new BranchTaskItem(node, node.children.length > 0));
}

export function buildTaskChildren(taskNode: TaskNode): BranchTaskItem[] {
  return taskNode.children.map((child) => new BranchTaskItem(child, child.children.length > 0));
}

export function buildMilestonesTree(options: {
  orphanTasks: TaskNode[];
  milestones: MilestoneNode[];
  showOnlyTodo: boolean;
  activeFilters: TaskFilter;
  grouped: boolean;
}): BranchTreeItem[] {
  const { orphanTasks, milestones, showOnlyTodo, activeFilters, grouped } = options;
  const result: BranchTreeItem[] = [];

  let processedOrphanTasks = filterTodoNodes(orphanTasks, showOnlyTodo);
  processedOrphanTasks = applyFilters(processedOrphanTasks, activeFilters);
  if (!grouped) {
    processedOrphanTasks = flattenNodes(processedOrphanTasks);
  }

  if (processedOrphanTasks.length > 0) {
    const noMilestoneNode: MilestoneNode = {
      name: NO_MILESTONE_NAME,
      lineIndex: INVALID_LINE_INDEX,
      tasks: processedOrphanTasks,
    };
    result.push(new BranchMilestoneItem(noMilestoneNode, true));
  }

  for (const milestone of milestones) {
    let tasks = filterTodoNodes(milestone.tasks, showOnlyTodo);
    tasks = applyFilters(tasks, activeFilters);
    if (tasks.length > 0 || !showOnlyTodo) {
      result.push(new BranchMilestoneItem({ ...milestone, tasks }));
    }
  }

  return result;
}

export function buildFlatTree(
  nodes: TaskNode[],
  showOnlyTodo: boolean,
  activeFilters: TaskFilter,
  grouped: boolean,
): BranchTaskItem[] {
  let processedNodes = filterTodoNodes(nodes, showOnlyTodo);
  processedNodes = applyFilters(processedNodes, activeFilters);

  if (!grouped) {
    processedNodes = flattenNodes(processedNodes);
  }

  return processedNodes.map((node) => new BranchTaskItem(node, node.children.length > 0));
}

export function createEmptyStateItem(showOnlyTodo: boolean, hasActiveFilter: boolean): vscode.TreeItem {
  const message = showOnlyTodo || hasActiveFilter ? NO_PENDING_TASKS_MESSAGE : EMPTY_TASKS_MESSAGE;
  const openFileItem = new vscode.TreeItem(message);
  openFileItem.command = {
    command: getCommandId(Command.OpenBranchContextFile),
    title: 'Open Branch Context File',
  };
  return openFileItem;
}
